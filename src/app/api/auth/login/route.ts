import { NextRequest, NextResponse } from 'next/server';
import { SESSION_COOKIE, createSessionToken, isHttps, sessionCookieOptions } from '@/lib/auth';
import { hasAdminUser, verifyLogin } from '@/lib/admin-user';
import { clearThrottle, clientIp, throttled } from '@/lib/throttle';

export const dynamic = 'force-dynamic';

const MAX_ATTEMPTS = 10;
const WINDOW_MS = 15 * 60 * 1000;

export async function POST(req: NextRequest) {
  try {
    const ip = clientIp(req);
    if (throttled('login', ip, MAX_ATTEMPTS, WINDOW_MS)) {
      return NextResponse.json({ error: 'Too many attempts. Try again in 15 minutes.' }, { status: 429 });
    }

    const body = await req.json().catch(() => ({}));
    const { username, password } = body as { username?: unknown; password?: unknown };
    if (typeof username !== 'string' || typeof password !== 'string') {
      return NextResponse.json({ error: 'username and password are required' }, { status: 400 });
    }

    if (!(await hasAdminUser())) {
      return NextResponse.json({ error: 'No admin account yet', setup: true }, { status: 409 });
    }

    const user = await verifyLogin(username, password);
    if (!user) {
      return NextResponse.json({ error: 'Invalid username or password' }, { status: 401 });
    }

    clearThrottle('login', ip);
    const res = NextResponse.json({ ok: true, user });
    res.cookies.set(SESSION_COOKIE, await createSessionToken(), sessionCookieOptions(isHttps(req)));
    return res;
  } catch (e: any) {
    console.error('POST /api/auth/login error', e);
    return NextResponse.json({ error: e?.message ?? 'Server error' }, { status: 500 });
  }
}
