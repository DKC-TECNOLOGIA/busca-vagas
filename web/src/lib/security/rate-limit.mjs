const buckets = new Map();

/**
 * Simple in-memory fixed-window rate limiter for API routes.
 * @param {string} key
 * @param {{ limit?: number; windowMs?: number }} [opts]
 */
export function checkRateLimit(key, opts = {}) {
  const limit = opts.limit ?? 20;
  const windowMs = opts.windowMs ?? 60_000;
  const now = Date.now();
  const entry = buckets.get(key);

  if (!entry || now >= entry.resetAt) {
    buckets.set(key, { count: 1, resetAt: now + windowMs });
    return { allowed: true, remaining: limit - 1, retryAfterSec: 0 };
  }

  if (entry.count >= limit) {
    const retryAfterSec = Math.max(1, Math.ceil((entry.resetAt - now) / 1000));
    return { allowed: false, remaining: 0, retryAfterSec };
  }

  entry.count += 1;
  return { allowed: true, remaining: limit - entry.count, retryAfterSec: 0 };
}

export function clientIpFromRequest(req) {
  const forwarded = req.headers.get("x-forwarded-for");
  if (forwarded) return forwarded.split(",")[0].trim();
  return req.headers.get("x-real-ip") || "127.0.0.1";
}
