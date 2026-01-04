import { withAuth } from 'next-auth/middleware';
import { NextResponse } from 'next/server';

export default withAuth(
  function middleware(req) {
    const token = req.nextauth.token;
    const path = req.nextUrl.pathname;

    // Allow access to public routes
    if (
      path.startsWith('/login') ||
      path.startsWith('/signup') ||
      path.startsWith('/invite')
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
      authorized: ({ token }) => !!token,
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
