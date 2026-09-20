// Admin authentication helpers.
// Shared by proxy.ts (runs in front of every request) and the /api/auth routes,
// so only Web Crypto is used — no Node-only modules.

export const SESSION_COOKIE = 'atelier_admin';
const SESSION_TTL_S = 60 * 60 * 24 * 7; // 7 days
const MIN_SECRET_LENGTH = 32;

const enc = new TextEncoder();

function env(name: string): string | undefined {
  const v = process.env[name]?.trim();
  return v ? v : undefined;
}

/** True when ADMIN_USER, ADMIN_PASSWORD and a sufficiently long AUTH_SECRET are all set. */
export function authConfigured(): boolean {
  return !!(
    env('ADMIN_USER') &&
    env('ADMIN_PASSWORD') &&
    (env('AUTH_SECRET')?.length ?? 0) >= MIN_SECRET_LENGTH
  );
}

function b64url(buf: ArrayBuffer): string {
  return btoa(String.fromCharCode(...new Uint8Array(buf)))
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=+$/, '');
}

async function sign(payload: string): Promise<string> {
  const key = await crypto.subtle.importKey(
    'raw',
    enc.encode(env('AUTH_SECRET')!),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign']
  );
  return b64url(await crypto.subtle.sign('HMAC', key, enc.encode(payload)));
}

// Compare digests rather than raw strings so the comparison is constant-time
// regardless of input length.
async function safeEqual(a: string, b: string): Promise<boolean> {
  const [ha, hb] = await Promise.all([
    crypto.subtle.digest('SHA-256', enc.encode(a)),
    crypto.subtle.digest('SHA-256', enc.encode(b)),
  ]);
  const x = new Uint8Array(ha);
  const y = new Uint8Array(hb);
  let diff = 0;
  for (let i = 0; i < x.length; i++) diff |= x[i] ^ y[i];
  return diff === 0;
}

export async function checkCredentials(username: string, password: string): Promise<boolean> {
  if (!authConfigured()) return false;
  const [u, p] = await Promise.all([
    safeEqual(username, env('ADMIN_USER')!),
    safeEqual(password, env('ADMIN_PASSWORD')!),
  ]);
  return u && p;
}

/** Token format: `<expiry unix seconds>.<hmac>` */
export async function createSessionToken(): Promise<string> {
  const exp = String(Math.floor(Date.now() / 1000) + SESSION_TTL_S);
  return `${exp}.${await sign(exp)}`;
}

export async function verifySessionToken(token: string | undefined): Promise<boolean> {
  if (!token || !authConfigured()) return false;
  const [exp, sig] = token.split('.');
  if (!exp || !sig || !/^\d+$/.test(exp)) return false;
  if (Number(exp) <= Math.floor(Date.now() / 1000)) return false;
  return safeEqual(sig, await sign(exp));
}

export function sessionCookieOptions(secure: boolean) {
  return {
    httpOnly: true,
    sameSite: 'lax' as const,
    secure,
    path: '/',
    maxAge: SESSION_TTL_S,
  };
}

/** Whether the original client connection was HTTPS (directly or via a reverse proxy). */
export function isHttps(req: Request & { nextUrl?: URL }): boolean {
  return req.headers.get('x-forwarded-proto') === 'https' || req.nextUrl?.protocol === 'https:';
}
