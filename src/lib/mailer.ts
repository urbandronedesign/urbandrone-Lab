// Outgoing mail via SMTP (nodemailer). Any provider works: Gmail with an app
// password, OVH mail, Brevo, Resend's SMTP endpoint… When SMTP is not
// configured we log the message to the server console instead — the admin
// runs locally, so the person at the terminal is the account owner.

import nodemailer from 'nodemailer';

export function mailConfigured(): boolean {
  return !!(process.env.SMTP_HOST && process.env.SMTP_USER && process.env.SMTP_PASS);
}

function transport() {
  const port = Number(process.env.SMTP_PORT ?? 587);
  return nodemailer.createTransport({
    host: process.env.SMTP_HOST,
    port,
    secure: process.env.SMTP_SECURE ? process.env.SMTP_SECURE === 'true' : port === 465,
    auth: { user: process.env.SMTP_USER, pass: process.env.SMTP_PASS },
  });
}

export type MailResult = { delivered: boolean; error?: string };

export async function sendMail(opts: { to: string; subject: string; text: string; html?: string }): Promise<MailResult> {
  if (!mailConfigured()) {
    console.log(`\n[mail] SMTP not configured — message NOT sent.\n[mail] To: ${opts.to}\n[mail] Subject: ${opts.subject}\n${opts.text}\n`);
    return { delivered: false, error: 'SMTP not configured' };
  }
  try {
    await transport().sendMail({
      from: process.env.MAIL_FROM || process.env.SMTP_USER,
      to: opts.to,
      subject: opts.subject,
      text: opts.text,
      html: opts.html,
    });
    return { delivered: true };
  } catch (e: any) {
    console.error('[mail] send failed:', e?.message ?? e);
    return { delivered: false, error: e?.message ?? 'send failed' };
  }
}

export function passwordResetMail(username: string, link: string, siteName = 'Atelier') {
  const text = `Hello ${username},

Someone (hopefully you) asked to reset the ${siteName} admin password.
Open this link within 30 minutes to choose a new one:

${link}

If you did not request this, ignore this message — the link will expire.`;
  const html = `<p>Hello ${username},</p>
<p>Someone (hopefully you) asked to reset the ${siteName} admin password.<br>
Open this link within 30 minutes to choose a new one:</p>
<p><a href="${link}">${link}</a></p>
<p style="color:#666">If you did not request this, ignore this message — the link will expire.</p>`;
  return { subject: `${siteName} admin — reset your password`, text, html };
}
