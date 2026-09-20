import { NextRequest, NextResponse } from 'next/server';
import { createResetToken } from '@/lib/admin-user';
import { isHttps } from '@/lib/auth';
import { mailConfigured, passwordResetMail, sendMail } from '@/lib/mailer';
import { clientIp, throttled } from '@/lib/throttle';
import { getSite } from '@/lib/site';

export const dynamic = 'force-dynamic';

const MAX_ATTEMPTS = 5;
const WINDOW_MS = 15 * 60 * 1000;

/** Request a password reset link. Always answers 200 so accounts can't be enumerated. */
export async function POST(req: NextRequest) {
  try {
    const ip = clientIp(req);
    if (throttled('forgot', ip, MAX_ATTEMPTS, WINDOW_MS)) {
      return NextResponse.json({ error: 'Too many requests. Try again in 15 minutes.' }, { status: 429 });
    }
    const body = (await req.json().catch(() => ({}))) as { login?: unknown };
    if (typeof body.login !== 'string' || !body.login.trim()) {
      return NextResponse.json({ error: 'Enter your email or username' }, { status: 400 });
    }

    const configured = mailConfigured();
    const reset = await createResetToken(body.login);
    if (reset) {
      // Build the link from the request so it matches how the admin is being reached
      const host = req.headers.get('x-forwarded-host') ?? req.headers.get('host') ?? 'localhost:3000';
      const link = `${isHttps(req) ? 'https' : 'http'}://${host}/admin/reset?token=${reset.token}`;
      const mail = passwordResetMail(reset.username, link, (await getSite()).name);
      await sendMail({ to: reset.email, ...mail });
    }
    // Same response whether or not the account exists
    return NextResponse.json({ ok: true, mailConfigured: configured });
  } catch (e: any) {
    console.error('POST /api/auth/forgot error', e);
    return NextResponse.json({ error: e?.message ?? 'Server error' }, { status: 500 });
  }
}
