import { NextRequest, NextResponse } from 'next/server';
import { SESSION_COOKIE, createSessionToken, isHttps, sessionCookieOptions } from '@/lib/auth';
import { EMAIL_RE, USERNAME_RE, createFirstAdmin, hasAdminUser } from '@/lib/admin-user';
import { passwordProblem } from '@/lib/password';

export const dynamic = 'force-dynamic';

/** Whether first-run setup is still needed. */
export async function GET() {
  return NextResponse.json({ needsSetup: !(await hasAdminUser()) });
}

/** First-run: create the admin account and sign in. Refused once one exists. */
export async function POST(req: NextRequest) {
  try {
    if (await hasAdminUser()) {
      return NextResponse.json({ error: 'An admin account already exists' }, { status: 409 });
    }
    const body = (await req.json().catch(() => ({}))) as { username?: unknown; email?: unknown; password?: unknown };
    const { username, email, password } = body;
    if (typeof username !== 'string' || !USERNAME_RE.test(username)) {
      return NextResponse.json({ error: 'Username: 3–32 letters, digits, . _ -' }, { status: 400 });
    }
    if (typeof email !== 'string' || !EMAIL_RE.test(email)) {
      return NextResponse.json({ error: 'A valid email is required (used for password resets)' }, { status: 400 });
    }
    if (typeof password !== 'string') return NextResponse.json({ error: 'Password is required' }, { status: 400 });
    const problem = passwordProblem(password);
    if (problem) return NextResponse.json({ error: problem }, { status: 400 });

    const user = await createFirstAdmin(username, email, password);
    const res = NextResponse.json({ ok: true, user }, { status: 201 });
    res.cookies.set(SESSION_COOKIE, await createSessionToken(), sessionCookieOptions(isHttps(req)));
    return res;
  } catch (e: any) {
    console.error('POST /api/auth/setup error', e);
    return NextResponse.json({ error: e?.message ?? 'Server error' }, { status: 500 });
  }
}
