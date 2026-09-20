import { NextResponse, type NextRequest } from 'next/server';
import { SESSION_COOKIE, authConfigured, verifySessionToken } from '@/lib/auth';

const MUTATING = new Set(['POST', 'PUT', 'PATCH', 'DELETE']);

export async function proxy(req: NextRequest) {
  const { pathname, searchParams } = req.nextUrl;

  // Legacy deep link from the old single-page routing
  if (pathname === '/' && searchParams.get('v') === 'admin') {
    return NextResponse.redirect(new URL('/admin', req.url));
  }

  if (pathname.startsWith('/api/auth/')) return NextResponse.next();

  const isAdminPage = pathname === '/admin' || pathname.startsWith('/admin/');
  const isLoginPage = pathname === '/admin/login';
  // Reads stay public (the gallery needs them); anything that changes data,
  // the unpublished listing and the admin-only token/sync endpoints require a session.
  const isProtectedApi =
    pathname.startsWith('/api/') &&
    (MUTATING.has(req.method) ||
      (pathname === '/api/projects' && searchParams.get('all') === 'true') ||
      pathname.startsWith('/api/tokens') ||
      pathname.startsWith('/api/tezos'));

  if (!isAdminPage && !isProtectedApi) return NextResponse.next();

  if (!authConfigured()) {
    const msg =
      'Admin is not configured. Set ADMIN_USER, ADMIN_PASSWORD and AUTH_SECRET (32+ chars) in .env.';
    return isAdminPage
      ? new NextResponse(msg, { status: 503 })
      : NextResponse.json({ error: msg }, { status: 503 });
  }

  const authed = await verifySessionToken(req.cookies.get(SESSION_COOKIE)?.value);

  if (isLoginPage) {
    return authed ? NextResponse.redirect(new URL('/admin', req.url)) : NextResponse.next();
  }
  if (authed) return NextResponse.next();

  if (isAdminPage) {
    const login = new URL('/admin/login', req.url);
    if (pathname !== '/admin') login.searchParams.set('next', pathname);
    return NextResponse.redirect(login);
  }
  return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
}

export const config = {
  matcher: ['/', '/admin/:path*', '/api/:path*'],
};
