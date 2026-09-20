import { NextRequest, NextResponse } from 'next/server';
import { consumeResetToken, peekResetToken } from '@/lib/admin-user';
import { SESSION_COOKIE, createSessionToken, isHttps, sessionCookieOptions } from '@/lib/auth';
import { passwordProblem } from '@/lib/password';
import { clientIp, throttled } from '@/lib/throttle';

export const dynamic = 'force-dynamic';

/** Check a reset token (the reset page calls this before showing the form). */
export async function GET(req: NextRequest) {
  const token = req.nextUrl.searchParams.get('token') ?? '';
  const info = token ? await peekResetToken(token) : null;
  return NextResponse.json({ valid: !!info, username: info?.username ?? null });
}

/** Set a new password with a reset token, then sign in. */
export async function POST(req: NextRequest) {
  try {
    if (throttled('reset', clientIp(req), 10, 15 * 60 * 1000)) {
      return NextResponse.json({ error: 'Too many attempts. Try again later.' }, { status: 429 });
    }
    const body = (await req.json().catch(() => ({}))) as { token?: unknown; password?: unknown };
    if (typeof body.token !== 'string' || typeof body.password !== 'string') {
      return NextResponse.json({ error: 'token and password are required' }, { status: 400 });
    }
    const problem = passwordProblem(body.password);
    if (problem) return NextResponse.json({ error: problem }, { status: 400 });

    const user = await consumeResetToken(body.token, body.password);
    const res = NextResponse.json({ ok: true, user });
    res.cookies.set(SESSION_COOKIE, await createSessionToken(), sessionCookieOptions(isHttps(req)));
    return res;
  } catch (e: any) {
    const known = /invalid or has expired/i.test(e?.message ?? '');
    if (!known) console.error('POST /api/auth/reset error', e);
    return NextResponse.json({ error: e?.message ?? 'Server error' }, { status: known ? 400 : 500 });
  }
}
