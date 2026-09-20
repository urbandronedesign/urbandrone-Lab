// Admin account management (server only): setup, sign-in, account changes,
// password reset tokens. Sessions themselves are signed cookies (see auth.ts).

import { createHash, randomBytes } from 'crypto';
import { db } from './db';
import { hashPassword, verifyPassword } from './password';

const RESET_TTL_MS = 30 * 60 * 1000;

export const USERNAME_RE = /^[a-zA-Z0-9._-]{3,32}$/;
export const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export type PublicAdmin = { id: string; username: string; email: string; createdAt: string };

function pub(u: { id: string; username: string; email: string; createdAt: Date }): PublicAdmin {
  return { id: u.id, username: u.username, email: u.email, createdAt: u.createdAt.toISOString() };
}

export async function hasAdminUser(): Promise<boolean> {
  return (await db.adminUser.count()) > 0;
}

/** First-run: only allowed while no account exists. */
export async function createFirstAdmin(username: string, email: string, password: string): Promise<PublicAdmin> {
  if (await hasAdminUser()) throw new Error('An admin account already exists');
  const u = await db.adminUser.create({
    data: { username: username.trim(), email: email.trim().toLowerCase(), passwordHash: await hashPassword(password) },
  });
  return pub(u);
}

/** Username (or email) + password → account, or null. */
export async function verifyLogin(login: string, password: string): Promise<PublicAdmin | null> {
  const key = login.trim();
  const u = await db.adminUser.findFirst({ where: { OR: [{ username: key }, { email: key.toLowerCase() }] } });
  // Verify against a dummy hash when the user is unknown so timing is similar.
  const ok = await verifyPassword(password, u?.passwordHash ?? DUMMY_HASH);
  return u && ok ? pub(u) : null;
}
const DUMMY_HASH = 'scrypt$16384$8$1$AAAAAAAAAAAAAAAAAAAAAA==$AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA=';

export async function getAdmin(): Promise<PublicAdmin | null> {
  const u = await db.adminUser.findFirst({ orderBy: { createdAt: 'asc' } });
  return u ? pub(u) : null;
}

/** Change username / email / password. The current password is always required. */
export async function updateAccount(
  id: string,
  currentPassword: string,
  changes: { username?: string; email?: string; newPassword?: string }
): Promise<PublicAdmin> {
  const u = await db.adminUser.findUniqueOrThrow({ where: { id } });
  if (!(await verifyPassword(currentPassword, u.passwordHash))) throw new Error('Current password is incorrect');
  const updated = await db.adminUser.update({
    where: { id },
    data: {
      ...(changes.username ? { username: changes.username.trim() } : {}),
      ...(changes.email ? { email: changes.email.trim().toLowerCase() } : {}),
      ...(changes.newPassword ? { passwordHash: await hashPassword(changes.newPassword) } : {}),
    },
  });
  return pub(updated);
}

function hashToken(token: string): string {
  return createHash('sha256').update(token).digest('hex');
}

/**
 * Create a reset token for the account matching `login` (email or username).
 * Returns null when nothing matches — callers must NOT reveal that to the client.
 */
export async function createResetToken(login: string): Promise<{ token: string; email: string; username: string } | null> {
  const key = login.trim();
  const u = await db.adminUser.findFirst({ where: { OR: [{ email: key.toLowerCase() }, { username: key }] } });
  if (!u) return null;
  const token = randomBytes(32).toString('base64url');
  await db.passwordReset.create({
    data: { tokenHash: hashToken(token), userId: u.id, expiresAt: new Date(Date.now() + RESET_TTL_MS) },
  });
  return { token, email: u.email, username: u.username };
}

/** Validate a token without consuming it (for the reset page). */
export async function peekResetToken(token: string): Promise<{ username: string } | null> {
  const r = await db.passwordReset.findUnique({ where: { tokenHash: hashToken(token) }, include: { user: true } });
  if (!r || r.usedAt || r.expiresAt < new Date()) return null;
  return { username: r.user.username };
}

/** Consume a token and set the new password. Also voids the user's other outstanding tokens. */
export async function consumeResetToken(token: string, newPassword: string): Promise<PublicAdmin> {
  const r = await db.passwordReset.findUnique({ where: { tokenHash: hashToken(token) }, include: { user: true } });
  if (!r || r.usedAt || r.expiresAt < new Date()) throw new Error('This reset link is invalid or has expired');
  const now = new Date();
  const [, u] = await db.$transaction([
    db.passwordReset.updateMany({ where: { userId: r.userId, usedAt: null }, data: { usedAt: now } }),
    db.adminUser.update({ where: { id: r.userId }, data: { passwordHash: await hashPassword(newPassword) } }),
  ]);
  return pub(u);
}
