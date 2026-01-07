import { withAuth } from 'next-auth/middleware';
import { NextResponse } from 'next/server';

export default withAuth(
  function middleware(req) {
    const token = req.nextauth.token;
    const path = req.nextUrl.pathname;

    // Allow access to public routes
    if (
      path === '/' || // Homepage
      path.startsWith('/login') ||
      path.startsWith('/signup') ||
      path.startsWith('/invite') ||
      path.startsWith('/compare') || // Public comparison page
      path.startsWith('/estimate/') || // Public estimate acceptance pages
      path.startsWith('/feedback/') || // Public feedback pages
      path.startsWith('/api/public/') || // Public API routes
      path.startsWith('/api/auth/') || // NextAuth API routes
      path.startsWith('/api/feedback/') || // Public feedback API routes
      path.startsWith('/api/team/invite/') || // Team invitation API routes
      path.startsWith('/api/team/accept-invite') // Accept invitation API route
    ) {
      return NextResponse.next();
    }

    // Check if user is authenticated
    if (!token) {
      return NextResponse.redirect(new URL('/login', req.url));
    }

    const userRole = token.role as string;

    // Role-based route protection
    // Only OWNER and ADMIN can access team management
    if (path.startsWith('/team')) {
      if (userRole !== 'OWNER' && userRole !== 'ADMIN') {
        return NextResponse.redirect(new URL('/dashboard', req.url));
      }
    }

    // Only OWNER and ADMIN can access settings
    if (path.startsWith('/settings')) {
      if (userRole !== 'OWNER' && userRole !== 'ADMIN') {
        return NextResponse.redirect(new URL('/dashboard', req.url));
      }
    }

    // CLEANER should be redirected to their portal
    if (userRole === 'CLEANER' && !path.startsWith('/cleaner')) {
      if (
        path === '/dashboard' ||
        path.startsWith('/team') ||
        path.startsWith('/clients') ||
        path.startsWith('/invoices')
      ) {
        return NextResponse.redirect(new URL('/cleaner/dashboard', req.url));
      }
    }

    // CUSTOMER should be redirected to their portal
    if (userRole === 'CUSTOMER' && !path.startsWith('/customer')) {
      if (
        path === '/dashboard' ||
        path.startsWith('/team') ||
        path.startsWith('/clients') ||
        path.startsWith('/invoices') ||
        path.startsWith('/jobs')
      ) {
        return NextResponse.redirect(new URL('/customer/dashboard', req.url));
      }
    }

    return NextResponse.next();
  },
  {
    callbacks: {
      authorized: ({ req, token }) => {
        const path = req.nextUrl.pathname;

        // Allow public routes without authentication
        if (
          path === '/' || // Homepage
          path.startsWith('/login') ||
          path.startsWith('/signup') ||
          path.startsWith('/invite') ||
          path.startsWith('/compare') || // Public comparison page
          path.startsWith('/estimate/') ||
          path.startsWith('/feedback/') ||
          path.startsWith('/api/public/') ||
          path.startsWith('/api/auth/') ||
          path.startsWith('/api/feedback/') ||
          path.startsWith('/api/team/invite/') || // Team invitation API routes
          path.startsWith('/api/team/accept-invite') // Accept invitation API route
        ) {
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
     * - public files (public folder)
     * - api routes (handled separately)
     */
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
};
