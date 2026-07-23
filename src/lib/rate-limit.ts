interface Bucket {
  count: number;
  resetAt: number;
}

// Module-level map — survives across requests in the same serverless instance.
// Not shared across Vercel replicas, which is fine: brute-force attacks are
// rate-limited per-instance, providing good-enough protection without Redis.
const store = new Map<string, Bucket>();

/**
 * Returns true if the caller should be blocked.
 * @param key     Unique identifier (e.g. "login:user@example.com" or "forgot:1.2.3.4")
 * @param limit   Max requests allowed in the window
 * @param windowMs Time window in milliseconds
 */
export function isRateLimited(key: string, limit: number, windowMs: number): boolean {
  const now = Date.now();
  let bucket = store.get(key);

  if (!bucket || now > bucket.resetAt) {
    bucket = { count: 1, resetAt: now + windowMs };
    store.set(key, bucket);
    return false;
  }

  bucket.count += 1;
  if (bucket.count > limit) return true;
  return false;
}

// Prune expired entries periodically to avoid unbounded memory growth.
setInterval(() => {
  const now = Date.now();
  store.forEach((v, k) => { if (now > v.resetAt) store.delete(k); });
}, 60_000);
