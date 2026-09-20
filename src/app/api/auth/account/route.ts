import { NextRequest, NextResponse } from 'next/server';
import { SESSION_COOKIE, verifySessionToken } from '@/lib/auth';
import { EMAIL_RE, USERNAME_RE, getAdmin, updateAccount } from '@/lib/admin-user';
import { passwordProblem } from '@/lib/password';
import { mailConfigured } from '@/lib/mailer';

export const dynamic = 'force-dynamic';

// /api/auth/* is exempt from the proxy so the sign-in flow works; this route
// therefore checks the session itself.
async function requireSession(req: NextRequest): Promise<boolean> {
  return verifySessionToken(req.cookies.get(SESSION_COOKIE)?.value);
}

/** The signed-in admin's public profile. */
export async function GET(req: NextRequest) {
  if (!(await requireSession(req))) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  const user = await getAdmin();
  if (!user) return NextResponse.json({ error: 'No account' }, { status: 404 });
  return NextResponse.json({ user, mailConfigured: mailConfigured() });
}

/** Change username / email / password. Body: { currentPassword, username?, email?, newPassword? } */
export async function PUT(req: NextRequest) {
  if (!(await requireSession(req))) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  try {
    const user = await getAdmin();
    if (!user) return NextResponse.json({ error: 'No account' }, { status: 404 });

    const body = (await req.json().catch(() => ({}))) as {
      currentPassword?: unknown;
      username?: unknown;
      email?: unknown;
      newPassword?: unknown;
    };
    if (typeof body.currentPassword !== 'string' || !body.currentPassword) {
      return NextResponse.json({ error: 'Current password is required' }, { status: 400 });
    }
    const changes: { username?: string; email?: string; newPassword?: string } = {};
    if (body.username !== undefined && body.username !== '') {
      if (typeof body.username !== 'string' || !USERNAME_RE.test(body.username)) {
        return NextResponse.json({ error: 'Username: 3–32 letters, digits, . _ -' }, { status: 400 });
      }
      changes.username = body.username;
    }
    if (body.email !== undefined && body.email !== '') {
      if (typeof body.email !== 'string' || !EMAIL_RE.test(body.email)) {
        return NextResponse.json({ error: 'Invalid email' }, { status: 400 });
      }
      changes.email = body.email;
    }
    if (body.newPassword !== undefined && body.newPassword !== '') {
      if (typeof body.newPassword !== 'string') return NextResponse.json({ error: 'Invalid password' }, { status: 400 });
      const problem = passwordProblem(body.newPassword);
      if (problem) return NextResponse.json({ error: problem }, { status: 400 });
      changes.newPassword = body.newPassword;
    }
    if (Object.keys(changes).length === 0) {
      return NextResponse.json({ error: 'Nothing to change' }, { status: 400 });
    }

    const updated = await updateAccount(user.id, body.currentPassword, changes);
    return NextResponse.json({ ok: true, user: updated });
  } catch (e: any) {
    const status = /incorrect/i.test(e?.message ?? '') ? 403 : /Unique constraint/i.test(e?.message ?? '') ? 409 : 500;
    if (status === 500) console.error('PUT /api/auth/account error', e);
    const msg = status === 409 ? 'That username or email is already taken' : e?.message ?? 'Server error';
    return NextResponse.json({ error: msg }, { status });
  }
}
