/**
 * Rate Limiting Utility for CleanDayCRM
 *
 * In-memory rate limiter using sliding window algorithm.
 * For production scaling with multiple instances, upgrade to Redis.
 *
 * Usage:
 *   const limiter = rateLimit({ limit: 5, windowMs: 60000 });
 *   const result = await limiter.check(request, 'auth');
 *   if (!result.success) return rateLimitResponse(result);
 */

import { NextRequest, NextResponse } from 'next/server';

// Rate limit configuration presets
export const RATE_LIMIT_PRESETS = {
  // Auth routes - strict limits to prevent brute force
  auth: { limit: 5, windowMs: 60 * 1000 }, // 5 requests per minute
  signup: { limit: 3, windowMs: 60 * 1000 }, // 3 signups per minute per IP
  forgotPassword: { limit: 3, windowMs: 15 * 60 * 1000 }, // 3 per 15 minutes
  resetPassword: { limit: 5, windowMs: 15 * 60 * 1000 }, // 5 per 15 minutes

  // Public routes - moderate limits
  publicBooking: { limit: 10, windowMs: 60 * 1000 }, // 10 per minute
  publicEstimate: { limit: 20, windowMs: 60 * 1000 }, // 20 per minute
  publicCompanyInfo: { limit: 60, windowMs: 60 * 1000 }, // 60 per minute (read-only)
  prospect: { limit: 5, windowMs: 60 * 1000 }, // 5 prospect submissions per minute per IP

  // Protected API routes - higher limits for authenticated users
  api: { limit: 100, windowMs: 60 * 1000 }, // 100 per minute
  apiWrite: { limit: 30, windowMs: 60 * 1000 }, // 30 writes per minute

  // Sensitive operations
  payments: { limit: 10, windowMs: 60 * 1000 }, // 10 per minute
  messages: { limit: 20, windowMs: 60 * 1000 }, // 20 SMS/emails per minute
  bulkOperations: { limit: 5, windowMs: 60 * 1000 }, // 5 bulk ops per minute

  // Cron routes - very strict (should only be called by scheduler)
  cron: { limit: 2, windowMs: 60 * 1000 }, // 2 per minute

  // Webhooks - higher limit for external services
  webhook: { limit: 100, windowMs: 60 * 1000 }, // 100 per minute
} as const;

export type RateLimitPreset = keyof typeof RATE_LIMIT_PRESETS;

interface RateLimitConfig {
  limit: number;
  windowMs: number;
  keyGenerator?: (request: NextRequest) => string;
}

interface RateLimitEntry {
  count: number;
  resetTime: number;
}

interface RateLimitResult {
  success: boolean;
  limit: number;
  remaining: number;
  resetTime: number;
  retryAfter?: number;
}

// In-memory store for rate limiting
// Note: This resets on server restart and doesn't share across instances
// For production with multiple instances, use Redis
const rateLimitStore = new Map<string, RateLimitEntry>();

// Cleanup old entries every 5 minutes to prevent memory leaks
const CLEANUP_INTERVAL = 5 * 60 * 1000;
let lastCleanup = Date.now();

function cleanup() {
  const now = Date.now();
  if (now - lastCleanup < CLEANUP_INTERVAL) return;

  lastCleanup = now;
  const keysToDelete: string[] = [];
  rateLimitStore.forEach((entry, key) => {
    if (entry.resetTime < now) {
      keysToDelete.push(key);
    }
  });
  keysToDelete.forEach((key) => rateLimitStore.delete(key));
}

/**
 * Extract client IP from request
 * Handles various proxy headers
 */
export function getClientIp(request: NextRequest): string {
  // Check various headers in order of preference
  const forwardedFor = request.headers.get('x-forwarded-for');
  if (forwardedFor) {
    // x-forwarded-for can contain multiple IPs, take the first (client)
    return forwardedFor.split(',')[0].trim();
  }

  const realIp = request.headers.get('x-real-ip');
  if (realIp) {
    return realIp.trim();
  }

  const cfConnectingIp = request.headers.get('cf-connecting-ip');
  if (cfConnectingIp) {
    return cfConnectingIp.trim();
  }

  // Fallback - this may not work in all environments
  return 'unknown';
}

/**
 * Default key generator - uses IP address
 */
function defaultKeyGenerator(request: NextRequest): string {
  return getClientIp(request);
}

/**
 * Create a rate limiter instance
 */
export function rateLimit(config: RateLimitConfig) {
  const { limit, windowMs, keyGenerator = defaultKeyGenerator } = config;

  return {
    /**
     * Check if request should be allowed
     * @param request - The incoming request
     * @param prefix - Optional prefix for the rate limit key (e.g., 'auth', 'api')
     */
    check(request: NextRequest, prefix: string = 'default'): RateLimitResult {
      cleanup();

      const key = `${prefix}:${keyGenerator(request)}`;
      const now = Date.now();
      const entry = rateLimitStore.get(key);

      // If no entry or window expired, create new entry
      if (!entry || entry.resetTime < now) {
        rateLimitStore.set(key, {
          count: 1,
          resetTime: now + windowMs,
        });

        return {
          success: true,
          limit,
          remaining: limit - 1,
          resetTime: now + windowMs,
        };
      }

      // Increment count
      entry.count++;

      // Check if over limit
      if (entry.count > limit) {
        const retryAfter = Math.ceil((entry.resetTime - now) / 1000);
        return {
          success: false,
          limit,
          remaining: 0,
          resetTime: entry.resetTime,
          retryAfter,
        };
      }

      return {
        success: true,
        limit,
        remaining: limit - entry.count,
        resetTime: entry.resetTime,
      };
    },
  };
}

/**
 * Create a rate limiter from a preset
 */
export function rateLimitFromPreset(preset: RateLimitPreset) {
  return rateLimit(RATE_LIMIT_PRESETS[preset]);
}

/**
 * Generate a standard rate limit exceeded response
 */
export function rateLimitResponse(result: RateLimitResult): NextResponse {
  return NextResponse.json(
    {
      error: 'Too many requests',
      message: 'Rate limit exceeded. Please try again later.',
      retryAfter: result.retryAfter,
    },
    {
      status: 429,
      headers: {
        'X-RateLimit-Limit': result.limit.toString(),
        'X-RateLimit-Remaining': '0',
        'X-RateLimit-Reset': result.resetTime.toString(),
        'Retry-After': result.retryAfter?.toString() || '60',
      },
    }
  );
}

/**
 * Add rate limit headers to a successful response
 */
export function addRateLimitHeaders(
  response: NextResponse,
  result: RateLimitResult
): NextResponse {
  response.headers.set('X-RateLimit-Limit', result.limit.toString());
  response.headers.set('X-RateLimit-Remaining', result.remaining.toString());
  response.headers.set('X-RateLimit-Reset', result.resetTime.toString());
  return response;
}

/**
 * Higher-order function to wrap an API route with rate limiting
 *
 * Usage:
 *   export const POST = withRateLimit(
 *     async (request) => { ... },
 *     'auth'
 *   );
 */
export function withRateLimit<T extends NextRequest>(
  handler: (request: T, context?: any) => Promise<NextResponse>,
  preset: RateLimitPreset,
  options?: {
    keyGenerator?: (request: T) => string;
    prefix?: string;
  }
) {
  const limiter = rateLimit({
    ...RATE_LIMIT_PRESETS[preset],
    keyGenerator: options?.keyGenerator as any,
  });

  return async (request: T, context?: any): Promise<NextResponse> => {
    const prefix = options?.prefix || preset;
    const result = limiter.check(request as NextRequest, prefix);

    if (!result.success) {
      console.warn(`Rate limit exceeded for ${prefix}:`, {
        ip: getClientIp(request as NextRequest),
        path: request.url,
        retryAfter: result.retryAfter,
      });
      return rateLimitResponse(result);
    }

    const response = await handler(request, context);
    return addRateLimitHeaders(response, result);
  };
}

/**
 * Compound rate limiter that checks multiple limits
 * Useful for applying both IP-based and user-based limits
 *
 * Usage:
 *   const result = await checkCompoundRateLimit(request, [
 *     { preset: 'auth', prefix: 'auth-ip' },
 *     { preset: 'auth', prefix: 'auth-email', key: email },
 *   ]);
 */
export function checkCompoundRateLimit(
  request: NextRequest,
  checks: Array<{
    preset: RateLimitPreset;
    prefix: string;
    key?: string;
  }>
): RateLimitResult {
  for (const check of checks) {
    const limiter = rateLimitFromPreset(check.preset);
    const prefix = check.key ? `${check.prefix}:${check.key}` : check.prefix;
    const result = limiter.check(request, prefix);

    if (!result.success) {
      return result;
    }
  }

  // All checks passed, return the last result
  const lastCheck = checks[checks.length - 1];
  const limiter = rateLimitFromPreset(lastCheck.preset);
  const prefix = lastCheck.key ? `${lastCheck.prefix}:${lastCheck.key}` : lastCheck.prefix;
  return limiter.check(request, prefix);
}

/**
 * Simple helper for quick rate limit check in API routes
 * Returns null if allowed, or a Response if rate limited
 *
 * Usage:
 *   const limited = checkRateLimit(request, 'auth');
 *   if (limited) return limited;
 */
export function checkRateLimit(
  request: NextRequest,
  preset: RateLimitPreset,
  prefix?: string
): NextResponse | null {
  const limiter = rateLimitFromPreset(preset);
  const result = limiter.check(request, prefix || preset);

  if (!result.success) {
    console.warn(`Rate limit exceeded for ${prefix || preset}:`, {
      ip: getClientIp(request),
      path: request.url,
      retryAfter: result.retryAfter,
    });
    return rateLimitResponse(result);
  }

  return null;
}

// Export types
export type { RateLimitConfig, RateLimitResult, RateLimitEntry };
