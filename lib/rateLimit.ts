/**
 * Minimal in-memory rate limiter suitable for a single-process self-hosted
 * deployment. For a multi-instance deployment behind a load balancer, swap
 * this for a shared store (e.g. Redis) — the call sites in the API routes
 * would not need to change.
 */
interface Bucket {
  count: number;
  windowStart: number;
}

const buckets = new Map<string, Bucket>();

export interface RateLimitResult {
  allowed: boolean;
  remaining: number;
  retryAfterSeconds?: number;
}

export function rateLimit(key: string, limit: number, windowMs: number): RateLimitResult {
  const now = Date.now();
  const bucket = buckets.get(key);

  if (!bucket || now - bucket.windowStart > windowMs) {
    buckets.set(key, { count: 1, windowStart: now });
    return { allowed: true, remaining: limit - 1 };
  }

  if (bucket.count >= limit) {
    const retryAfterSeconds = Math.ceil((bucket.windowStart + windowMs - now) / 1000);
    return { allowed: false, remaining: 0, retryAfterSeconds };
  }

  bucket.count += 1;
  return { allowed: true, remaining: limit - bucket.count };
}

/** Best-effort client identifier from a Next.js request, for rate limiting only. */
export function getClientKey(req: Request): string {
  const forwardedFor = req.headers.get("x-forwarded-for");
  if (forwardedFor) return forwardedFor.split(",")[0].trim();
  return "unknown";
}
