type RateLimitResult = {
  allowed: boolean;
  remaining: number;
  retryAfterMs: number;
};

const rateLimitStore = new Map<string, { count: number; resetAt: number }>();

export function checkRateLimit(
  key: string,
  limit: number,
  windowMs: number
): RateLimitResult {
  const now = Date.now();
  const entry = rateLimitStore.get(key);

  if (!entry || entry.resetAt <= now) {
    rateLimitStore.set(key, {
      count: 1,
      resetAt: now + windowMs,
    });

    return {
      allowed: true,
      remaining: Math.max(limit - 1, 0),
      retryAfterMs: windowMs,
    };
  }

  if (entry.count >= limit) {
    return {
      allowed: false,
      remaining: 0,
      retryAfterMs: Math.max(entry.resetAt - now, 0),
    };
  }

  entry.count += 1;
  rateLimitStore.set(key, entry);

  return {
    allowed: true,
    remaining: Math.max(limit - entry.count, 0),
    retryAfterMs: Math.max(entry.resetAt - now, 0),
  };
}

