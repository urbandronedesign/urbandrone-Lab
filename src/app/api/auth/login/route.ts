import { NextRequest, NextResponse } from 'next/server';
import {
  SESSION_COOKIE,
  checkCredentials,
  createSessionToken,
  isHttps,
  sessionCookieOptions,
} from '@/lib/auth';

export const dynamic = 'force-dynamic';

// Simple per-IP throttle against password guessing.
const MAX_ATTEMPTS = 10;
const WINDOW_MS = 15 * 60 * 1000;
const attempts = new Map<string, { count: number; resetAt: number }>();

function clientIp(req: NextRequest): string {
  return (
    req.headers.get('x-forwarded-for')?.split(',')[0].trim() ||
    req.headers.get('x-real-ip') ||
    'local'
  );
}

function throttled(ip: string): boolean {
  const now = Date.now();
  const rec = attempts.get(ip);
  if (!rec || rec.resetAt <= now) {
    attempts.set(ip, { count: 1, resetAt: now + WINDOW_MS });
    return false;
  }
  rec.count++;
  return rec.count > MAX_ATTEMPTS;
}

export async function POST(req: NextRequest) {
  try {
    const ip = clientIp(req);
    if (throttled(ip)) {
      return NextResponse.json(
        { error: 'Too many attempts. Try again in 15 minutes.' },
        { status: 429 }
      );
    }

    const body = await req.json().catch(() => ({}));
    const { username, password } = body as { username?: unknown; password?: unknown };
    if (typeof username !== 'string' || typeof password !== 'string') {
      return NextResponse.json({ error: 'username and password are required' }, { status: 400 });
    }

    if (!(await checkCredentials(username, password))) {
      return NextResponse.json({ error: 'Invalid username or password' }, { status: 401 });
    }

    attempts.delete(ip);
    const res = NextResponse.json({ ok: true });
    res.cookies.set(SESSION_COOKIE, await createSessionToken(), sessionCookieOptions(isHttps(req)));
    return res;
  } catch (e: any) {
    console.error('POST /api/auth/login error', e);
    return NextResponse.json({ error: e?.message ?? 'Server error' }, { status: 500 });
  }
}
