// ─── In-memory rate limiter ───────────────────────────────────────────────────
// NOTE: In serverless environments (Vercel) each cold start gets a fresh Map,
// so limits are per-instance, not global. For cross-instance enforcement,
// replace with @upstash/ratelimit + Redis. This is sufficient for low-volume
// single-owner CRM use.

type RateRecord = { count: number; resetAt: number };
const store = new Map<string, RateRecord>();

/**
 * Returns true if the request is allowed, false if it should be rejected (429).
 * @param key      Unique identifier — e.g. `backup:${ip}` or `webhook:${ip}`
 * @param limit    Max requests allowed within the window
 * @param windowMs Time window in milliseconds
 */
export function rateLimit(key: string, limit: number, windowMs: number): boolean {
  const now = Date.now();
  const rec = store.get(key);

  if (!rec || now >= rec.resetAt) {
    store.set(key, { count: 1, resetAt: now + windowMs });
    return true;
  }

  if (rec.count >= limit) return false;

  rec.count++;
  return true;
}

/** Extract the most-specific client IP from request headers. */
export function getClientIp(request: Request): string {
  return (
    request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ??
    request.headers.get('x-real-ip') ??
    'unknown'
  );
}
