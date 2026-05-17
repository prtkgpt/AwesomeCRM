import { withAuth } from 'next-auth/middleware';
import { NextResponse } from 'next/server';

function isPublicRoute(path: string): boolean {
  if (path === '/') return true;

  const prefixes = [
    '/login',
    '/admin/login',
    '/signup',
    '/invite',
    '/compare',
    '/estimate/',
    '/feedback/',
    '/blog',
    '/api/public/',
    '/api/auth/',
    '/api/platform/setup',
    '/api/feedback/',
    '/api/team/invite/',
    '/api/team/accept-invite',
  ];

  for (const prefix of prefixes) {
    if (path.startsWith(prefix)) return true;
  }

  // Public booking pages: only match /[slug]/book (must have exactly one path segment before /book)
  if (path.endsWith('/book') && path.split('/').length === 3) return true;

  return false;
}

export default withAuth(
  function middleware(req) {
    const token = req.nextauth.token;
    const path = req.nextUrl.pathname;

    if (isPublicRoute(path)) {
      return NextResponse.next();
    }

    if (!token) {
      if (path.startsWith('/platform')) {
        return NextResponse.redirect(new URL('/admin/login', req.url));
      }
      return NextResponse.redirect(new URL('/login', req.url));
    }

    const userRole = token.role as string;
    const isPlatformAdmin = token.isPlatformAdmin as boolean;

    if (path.startsWith('/platform')) {
      if (!isPlatformAdmin) {
        return NextResponse.redirect(new URL('/dashboard', req.url));
      }
    }

    if (path.startsWith('/team') || path.startsWith('/settings')) {
      if (userRole !== 'OWNER' && userRole !== 'ADMIN') {
        return NextResponse.redirect(new URL('/dashboard', req.url));
      }
    }

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
        path.startsWith('/settings') ||
        path.startsWith('/marketing') ||
        path.startsWith('/referrals')
      ) {
        return NextResponse.redirect(new URL('/cleaner/dashboard', req.url));
      }
    }

    if (userRole === 'CUSTOMER' && !path.startsWith('/customer')) {
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
        path.startsWith('/settings') ||
        path.startsWith('/marketing') ||
        path.startsWith('/referrals')
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
        if (isPublicRoute(path)) return true;
        return !!token;
      },
    },
  }
);

export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico|sitemap.xml|robots.txt|manifest.json|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico|xml|txt)$).*)',
  ],
};
