import NextAuth from 'next-auth';
import { NextRequest, NextResponse } from 'next/server';
import { authOptions } from '@/lib/auth';
import { checkRateLimit, getClientIp } from '@/lib/rate-limit';

// Force dynamic rendering for this route
export const dynamic = 'force-dynamic';

const handler = NextAuth(authOptions);

/**
 * Wrap NextAuth handler with rate limiting for login attempts
 * Rate limits are applied to:
 * - POST /api/auth/callback/credentials (login attempts)
 * - POST /api/auth/signin (sign in page submission)
 */
async function rateLimitedHandler(
  request: NextRequest,
  context: { params: { nextauth: string[] } }
) {
  const { nextauth } = context.params;
  const method = request.method;

  // Apply rate limiting only to login-related POST requests
  if (method === 'POST') {
    const action = nextauth?.join('/') || '';

    // Rate limit login attempts (callback/credentials)
    if (action === 'callback/credentials' || action === 'signin') {
      const rateLimited = checkRateLimit(request, 'auth', 'auth-login');
      if (rateLimited) {
        console.warn('Login rate limit exceeded:', {
          ip: getClientIp(request),
          action,
        });
        return rateLimited;
      }
    }
  }

  return handler(request, context);
}

export {
  rateLimitedHandler as GET,
  rateLimitedHandler as POST,
};
