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
      path.startsWith('/admin/login') ||
      path.startsWith('/signup') ||
      path.startsWith('/invite') ||
      path.startsWith('/compare') || // Public comparison page
      path.startsWith('/estimate/') || // Public estimate acceptance pages
      path.startsWith('/feedback/') || // Public feedback pages
      path.startsWith('/blog') || // Public blog pages
      path.endsWith('/book') || // Public booking pages (e.g., /awesome-maids/book)
      path.startsWith('/api/public/') || // Public API routes
      path.startsWith('/api/auth/') || // NextAuth API routes
      path.startsWith('/api/platform/setup') || // Platform admin first-run setup
      path.startsWith('/api/feedback/') || // Public feedback API routes
      path.startsWith('/api/team/invite/') || // Team invitation API routes
      path.startsWith('/api/team/accept-invite') || // Accept invitation API route
      path.startsWith('/api/debug/') // Debug API routes (authenticated users only)
    ) {
      return NextResponse.next();
    }

    // Check if user is authenticated
    if (!token) {
      // Redirect unauthenticated users trying to access /platform to /admin/login
      if (path.startsWith('/platform')) {
        return NextResponse.redirect(new URL('/admin/login', req.url));
      }
      return NextResponse.redirect(new URL('/login', req.url));
    }

    const userRole = token.role as string;
    const isPlatformAdmin = token.isPlatformAdmin as boolean;

    // Platform admin routes - require isPlatformAdmin flag
    if (path.startsWith('/platform')) {
      if (!isPlatformAdmin) {
        return NextResponse.redirect(new URL('/dashboard', req.url));
      }
    }

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
        path.startsWith('/invoices') ||
        path.startsWith('/calendar') ||
        path.startsWith('/jobs') ||
        path.startsWith('/estimates') ||
        path.startsWith('/reports') ||
        path.startsWith('/feed') ||
        path.startsWith('/settings')
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
          path.startsWith('/admin/login') ||
          path.startsWith('/signup') ||
          path.startsWith('/invite') ||
          path.startsWith('/compare') || // Public comparison page
          path.startsWith('/estimate/') ||
          path.startsWith('/feedback/') ||
          path.startsWith('/blog') || // Public blog pages
          path.endsWith('/book') || // Public booking pages (e.g., /awesome-maids/book)
          path.startsWith('/api/public/') ||
          path.startsWith('/api/auth/') ||
          path.startsWith('/api/platform/setup') || // Platform admin first-run setup
          path.startsWith('/api/feedback/') ||
          path.startsWith('/api/team/invite/') || // Team invitation API routes
          path.startsWith('/api/team/accept-invite') || // Accept invitation API route
          path.startsWith('/api/debug/') // Debug API routes (authenticated users only)
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
