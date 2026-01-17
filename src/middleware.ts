// ============================================
// CleanDayCRM - Middleware (Route Protection)
// ============================================

import { withAuth } from 'next-auth/middleware';
import { NextResponse } from 'next/server';

// Public routes that don't require authentication
const publicRoutes = [
  '/',
  '/login',
  '/signup',
  '/forgot-password',
  '/reset-password',
  '/invite',
  '/compare',
  '/pricing',
  '/features',
  '/faq',
  '/contact',
  '/terms',
  '/privacy',
];

// Public route patterns
const publicPatterns = [
  /^\/estimate\/[^/]+$/,      // /estimate/[token]
  /^\/feedback\/[^/]+$/,      // /feedback/[token]
  /^\/pay-copay\/[^/]+$/,     // /pay-copay/[token]
  /^\/[^/]+\/book$/,          // /[slug]/book - public booking page
  /^\/[^/]+\/portal$/,        // /[slug]/portal - client portal login
  /^\/api\/public\//,         // /api/public/*
  /^\/api\/auth\//,           // /api/auth/*
  /^\/api\/feedback\//,       // /api/feedback/*
  /^\/api\/webhooks\//,       // /api/webhooks/*
  /^\/api\/cron\//,           // /api/cron/*
  /^\/api\/team\/invite\//,   // /api/team/invite/*
  /^\/api\/team\/accept-invite/, // /api/team/accept-invite
];

// Admin-only routes (OWNER or ADMIN)
const adminRoutes = [
  '/team',
  '/settings',
  '/reports',
  '/invoices',
  '/inventory',
  '/quality',
];

// Owner-only routes
const ownerRoutes = [
  '/settings/billing',
  '/settings/subscription',
  '/settings/api',
];

function isPublicRoute(path: string): boolean {
  // Check exact matches
  if (publicRoutes.includes(path)) {
    return true;
  }

  // Check patterns
  return publicPatterns.some(pattern => pattern.test(path));
}

function isAdminRoute(path: string): boolean {
  return adminRoutes.some(route => path.startsWith(route));
}

function isOwnerRoute(path: string): boolean {
  return ownerRoutes.some(route => path.startsWith(route));
}

export default withAuth(
  function middleware(req) {
    const token = req.nextauth.token;
    const path = req.nextUrl.pathname;

    // Allow public routes
    if (isPublicRoute(path)) {
      return NextResponse.next();
    }

    // If not authenticated, redirect to login
    if (!token) {
      const loginUrl = new URL('/login', req.url);
      loginUrl.searchParams.set('callbackUrl', path);
      return NextResponse.redirect(loginUrl);
    }

    const userRole = token.role as string;

    // Owner-only routes
    if (isOwnerRoute(path)) {
      if (userRole !== 'OWNER') {
        return NextResponse.redirect(new URL('/dashboard', req.url));
      }
    }

    // Admin routes (OWNER and ADMIN only)
    if (isAdminRoute(path)) {
      if (userRole !== 'OWNER' && userRole !== 'ADMIN') {
        if (userRole === 'CLEANER') {
          return NextResponse.redirect(new URL('/cleaner/dashboard', req.url));
        }
        if (userRole === 'CLIENT') {
          return NextResponse.redirect(new URL('/client/dashboard', req.url));
        }
        return NextResponse.redirect(new URL('/dashboard', req.url));
      }
    }

    // Cleaner routes - redirect non-cleaners
    if (path.startsWith('/cleaner')) {
      if (userRole !== 'CLEANER') {
        if (userRole === 'OWNER' || userRole === 'ADMIN') {
          return NextResponse.redirect(new URL('/dashboard', req.url));
        }
        if (userRole === 'CLIENT') {
          return NextResponse.redirect(new URL('/client/dashboard', req.url));
        }
      }
    }

    // Client routes - redirect non-clients
    if (path.startsWith('/client')) {
      if (userRole !== 'CLIENT') {
        if (userRole === 'OWNER' || userRole === 'ADMIN') {
          return NextResponse.redirect(new URL('/dashboard', req.url));
        }
        if (userRole === 'CLEANER') {
          return NextResponse.redirect(new URL('/cleaner/dashboard', req.url));
        }
      }
    }

    // Redirect CLEANER from admin pages to their portal
    if (userRole === 'CLEANER') {
      if (
        path === '/dashboard' ||
        path.startsWith('/clients') ||
        path.startsWith('/calendar') ||
        path.startsWith('/jobs') ||
        path.startsWith('/estimates') ||
        path.startsWith('/feed')
      ) {
        return NextResponse.redirect(new URL('/cleaner/dashboard', req.url));
      }
    }

    // Redirect CLIENT from admin pages to their portal
    if (userRole === 'CLIENT') {
      if (
        path === '/dashboard' ||
        path.startsWith('/clients') ||
        path.startsWith('/calendar') ||
        path.startsWith('/jobs') ||
        path.startsWith('/estimates') ||
        path.startsWith('/feed')
      ) {
        return NextResponse.redirect(new URL('/client/dashboard', req.url));
      }
    }

    // API route authorization
    if (path.startsWith('/api/')) {
      // Admin-only API routes
      const adminApiRoutes = [
        '/api/team',
        '/api/company',
        '/api/reports',
        '/api/admin',
        '/api/inventory',
        '/api/quality',
      ];

      if (adminApiRoutes.some(route => path.startsWith(route))) {
        if (userRole !== 'OWNER' && userRole !== 'ADMIN') {
          return NextResponse.json(
            { error: 'Unauthorized', message: 'Admin access required' },
            { status: 403 }
          );
        }
      }

      // Owner-only API routes
      const ownerApiRoutes = [
        '/api/company/billing',
        '/api/company/subscription',
        '/api/admin/api-keys',
      ];

      if (ownerApiRoutes.some(route => path.startsWith(route))) {
        if (userRole !== 'OWNER') {
          return NextResponse.json(
            { error: 'Unauthorized', message: 'Owner access required' },
            { status: 403 }
          );
        }
      }

      // Cleaner-only API routes
      if (path.startsWith('/api/cleaner/')) {
        if (userRole !== 'CLEANER') {
          return NextResponse.json(
            { error: 'Unauthorized', message: 'Cleaner access required' },
            { status: 403 }
          );
        }
      }

      // Client-only API routes
      if (path.startsWith('/api/client/')) {
        if (userRole !== 'CLIENT') {
          return NextResponse.json(
            { error: 'Unauthorized', message: 'Client access required' },
            { status: 403 }
          );
        }
      }
    }

    return NextResponse.next();
  },
  {
    callbacks: {
      authorized: ({ req, token }) => {
        const path = req.nextUrl.pathname;

        // Allow public routes without authentication
        if (isPublicRoute(path)) {
          return true;
        }

        // Require authentication for all other routes
        return !!token;
      },
    },
  }
);

export const config = {
  matcher: [
    /*
     * Match all request paths except:
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     * - public files
     */
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico)$).*)',
  ],
};
