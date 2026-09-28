// Admin account management (server only): setup, sign-in, account changes,
// password reset tokens. Sessions themselves are signed cookies (see auth.ts).
//
// Credentials deliberately live OUTSIDE the Prisma database: `db/custom.db` is
// committed to a public repository, so the account file must never be. The store
// is a small JSON file (one account, a few short-lived reset tokens) kept at
// `db/auth.json` and gitignored — see docs/HANDBOOK.md.

import { createHash, randomBytes, randomUUID } from 'crypto';
import { mkdir, readFile, rename, writeFile } from 'fs/promises';
import { dirname, isAbsolute, join } from 'path';
import { hashPassword, verifyPassword } from './password';

const RESET_TTL_MS = 30 * 60 * 1000;

export const USERNAME_RE = /^[a-zA-Z0-9._-]{3,32}$/;
export const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export type PublicAdmin = { id: string; username: string; email: string; createdAt: string };

type StoredUser = { id: string; username: string; email: string; passwordHash: string; createdAt: string; updatedAt: string };
type StoredReset = { tokenHash: string; userId: string; expiresAt: string; usedAt: string | null; createdAt: string };
type Store = { version: 1; users: StoredUser[]; resets: StoredReset[] };

const EMPTY: Store = { version: 1, users: [], resets: [] };

/** Where the account file lives. `AUTH_STORE` overrides it (tests, custom setups). */
export function storePath(): string {
  const p = process.env.AUTH_STORE?.trim();
  if (p) return isAbsolute(p) ? p : join(process.cwd(), p);
  return join(process.cwd(), 'db', 'auth.json');
}

async function read(): Promise<Store> {
  try {
    const raw = JSON.parse(await readFile(storePath(), 'utf8')) as Partial<Store>;
    return { version: 1, users: raw.users ?? [], resets: raw.resets ?? [] };
  } catch (e) {
    if ((e as NodeJS.ErrnoException).code === 'ENOENT') return { ...EMPTY };
    throw e;
  }
}

/** Write through a temporary file so an interrupted write cannot truncate the account. */
async function write(s: Store): Promise<void> {
  const path = storePath();
  await mkdir(dirname(path), { recursive: true });
  const tmp = `${path}.${process.pid}.tmp`;
  await writeFile(tmp, `${JSON.stringify(s, null, 2)}\n`, { encoding: 'utf8', mode: 0o600 });
  await rename(tmp, path);
}

// Serialise read-modify-write cycles so two requests cannot clobber each other.
let queue: Promise<unknown> = Promise.resolve();
function transaction<T>(fn: (s: Store) => Promise<T> | T): Promise<T> {
  const run = async () => {
    const s = await read();
    const out = await fn(s);
    await write(s);
    return out;
  };
  const next = queue.then(run, run);
  queue = next.catch(() => {});
  return next;
}

function pub(u: StoredUser): PublicAdmin {
  return { id: u.id, username: u.username, email: u.email, createdAt: u.createdAt };
}

function match(u: StoredUser, key: string): boolean {
  return u.username === key || u.email === key.toLowerCase();
}

export async function hasAdminUser(): Promise<boolean> {
  return (await read()).users.length > 0;
}

/** First-run: only allowed while no account exists. */
export async function createFirstAdmin(username: string, email: string, password: string): Promise<PublicAdmin> {
  const passwordHash = await hashPassword(password);
  return transaction((s) => {
    if (s.users.length) throw new Error('An admin account already exists');
    const now = new Date().toISOString();
    const u: StoredUser = { id: randomUUID(), username: username.trim(), email: email.trim().toLowerCase(), passwordHash, createdAt: now, updatedAt: now };
    s.users.push(u);
    return pub(u);
  });
}

/** Username (or email) + password → account, or null. */
export async function verifyLogin(login: string, password: string): Promise<PublicAdmin | null> {
  const key = login.trim();
  const u = (await read()).users.find((x) => match(x, key));
  // Verify against a dummy hash when the user is unknown so timing is similar.
  const ok = await verifyPassword(password, u?.passwordHash ?? DUMMY_HASH);
  return u && ok ? pub(u) : null;
}
const DUMMY_HASH = 'scrypt$16384$8$1$AAAAAAAAAAAAAAAAAAAAAA==$AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA=';

export async function getAdmin(): Promise<PublicAdmin | null> {
  const users = (await read()).users;
  const first = [...users].sort((a, b) => a.createdAt.localeCompare(b.createdAt))[0];
  return first ? pub(first) : null;
}

/** Change username / email / password. The current password is always required. */
export async function updateAccount(
  id: string,
  currentPassword: string,
  changes: { username?: string; email?: string; newPassword?: string }
): Promise<PublicAdmin> {
  const current = (await read()).users.find((u) => u.id === id);
  if (!current) throw new Error('Account not found');
  if (!(await verifyPassword(currentPassword, current.passwordHash))) throw new Error('Current password is incorrect');
  const passwordHash = changes.newPassword ? await hashPassword(changes.newPassword) : undefined;
  return transaction((s) => {
    const u = s.users.find((x) => x.id === id);
    if (!u) throw new Error('Account not found');
    if (changes.username) u.username = changes.username.trim();
    if (changes.email) u.email = changes.email.trim().toLowerCase();
    if (passwordHash) u.passwordHash = passwordHash;
    u.updatedAt = new Date().toISOString();
    return pub(u);
  });
}

function hashToken(token: string): string {
  return createHash('sha256').update(token).digest('hex');
}

function live(r: StoredReset): boolean {
  return !r.usedAt && new Date(r.expiresAt) > new Date();
}

/**
 * Create a reset token for the account matching `login` (email or username).
 * Returns null when nothing matches — callers must NOT reveal that to the client.
 */
export async function createResetToken(login: string): Promise<{ token: string; email: string; username: string } | null> {
  const key = login.trim();
  const token = randomBytes(32).toString('base64url');
  return transaction((s) => {
    const u = s.users.find((x) => match(x, key));
    if (!u) return null;
    // Drop tokens that can no longer be used, so the file stays small.
    s.resets = s.resets.filter(live);
    s.resets.push({ tokenHash: hashToken(token), userId: u.id, expiresAt: new Date(Date.now() + RESET_TTL_MS).toISOString(), usedAt: null, createdAt: new Date().toISOString() });
    return { token, email: u.email, username: u.username };
  });
}

/** Validate a token without consuming it (for the reset page). */
export async function peekResetToken(token: string): Promise<{ username: string } | null> {
  const s = await read();
  const r = s.resets.find((x) => x.tokenHash === hashToken(token));
  if (!r || !live(r)) return null;
  const u = s.users.find((x) => x.id === r.userId);
  return u ? { username: u.username } : null;
}

/** Consume a token and set the new password. Also voids the user's other outstanding tokens. */
export async function consumeResetToken(token: string, newPassword: string): Promise<PublicAdmin> {
  const passwordHash = await hashPassword(newPassword);
  return transaction((s) => {
    const r = s.resets.find((x) => x.tokenHash === hashToken(token));
    if (!r || !live(r)) throw new Error('This reset link is invalid or has expired');
    const u = s.users.find((x) => x.id === r.userId);
    if (!u) throw new Error('This reset link is invalid or has expired');
    const now = new Date().toISOString();
    for (const other of s.resets) if (other.userId === u.id && !other.usedAt) other.usedAt = now;
    u.passwordHash = passwordHash;
    u.updatedAt = now;
    return pub(u);
  });
}
