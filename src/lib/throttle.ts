// In-memory per-key attempt throttle for the auth endpoints.
// Good enough for a single-process local admin; resets on restart.

const buckets = new Map<string, Map<string, { count: number; resetAt: number }>>();

export function clientIp(req: Request): string {
  return (
    req.headers.get('x-forwarded-for')?.split(',')[0].trim() ||
    req.headers.get('x-real-ip') ||
    'local'
  );
}

/** Returns true when `key` has exceeded `max` hits within `windowMs` for `bucket`. */
export function throttled(bucket: string, key: string, max: number, windowMs: number): boolean {
  let b = buckets.get(bucket);
  if (!b) buckets.set(bucket, (b = new Map()));
  const now = Date.now();
  const rec = b.get(key);
  if (!rec || rec.resetAt <= now) {
    b.set(key, { count: 1, resetAt: now + windowMs });
    return false;
  }
  rec.count++;
  return rec.count > max;
}

export function clearThrottle(bucket: string, key: string) {
  buckets.get(bucket)?.delete(key);
}
