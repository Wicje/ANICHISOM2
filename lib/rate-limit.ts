/**
 * Simple in-memory rate limiter for API routes.
 *
 * For Vercel serverless, each instance has its own Map — acceptable for 70 beta users.
 * For production, swap to Redis-backed limiter (Upstash or similar).
 */

const buckets = new Map<string, { count: number; resetAt: number }>();

// Periodic cleanup to prevent memory leaks
setInterval(() => {
  const now = Date.now();
  for (const [key, val] of buckets) {
    if (val.resetAt <= now) buckets.delete(key);
  }
}, 60_000);

/**
 * Check rate limit. Returns null if allowed, or retry-after seconds if denied.
 */
export function checkRateLimit(
  key: string,
  maxRequests: number = 10,
  windowMs: number = 60_000
): { allowed: true; remaining: number } | { allowed: false; retryAfter: number } {
  const now = Date.now();
  const bucket = buckets.get(key);

  if (!bucket || bucket.resetAt <= now) {
    buckets.set(key, { count: 1, resetAt: now + windowMs });
    return { allowed: true, remaining: maxRequests - 1 };
  }

  bucket.count++;
  const remaining = maxRequests - bucket.count;

  if (remaining < 0) {
    const retryAfter = Math.ceil((bucket.resetAt - now) / 1000);
    return { allowed: false, retryAfter };
  }

  return { allowed: true, remaining };
}

/**
 * Get client IP from request headers (Vercel/Cloudflare/Express).
 */
export function getClientIp(request: Request): string {
  const forwarded = request.headers.get('x-forwarded-for');
  if (forwarded) return forwarded.split(',')[0]?.trim() || 'unknown';
  const realIp = request.headers.get('x-real-ip');
  if (realIp) return realIp;
  return 'unknown';
}
