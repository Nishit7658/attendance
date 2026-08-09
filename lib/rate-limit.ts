/**
 * In-memory token-bucket rate limiter.
 *
 * IMPORTANT — SERVERLESS LIMITATION:
 * This implementation stores state in a module-level Map. In serverless
 * environments (Vercel, AWS Lambda, etc.) each function instance has its
 * own separate Map, so limits are not enforced across concurrent instances
 * or across cold starts.
 *
 * For production multi-instance deployments, replace this with a shared
 * store such as Upstash Redis (@upstash/ratelimit) to get true global
 * rate limiting.
 */
interface RateLimitOptions {
  uniqueTokenPerInterval?: number;
  interval?: number; // in milliseconds
}

export default function rateLimit(options?: RateLimitOptions) {
  const tokenCache = new Map<string, { count: number; expiresAt: number }>();
  const uniqueTokenPerInterval = options?.uniqueTokenPerInterval || 500;
  const interval = options?.interval || 60000;

  return {
    check: (limit: number, token: string) =>
      new Promise<void>((resolve, reject) => {
        const now = Date.now();
        let record = tokenCache.get(token);

        if (record && now > record.expiresAt) {
          record = undefined;
          tokenCache.delete(token);
        }

        if (!record) {
          // Bounded Map: remove oldest if we exceed capacity
          if (tokenCache.size >= uniqueTokenPerInterval) {
            const firstKey = tokenCache.keys().next().value;
            if (firstKey !== undefined) tokenCache.delete(firstKey);
          }
          record = { count: 0, expiresAt: now + interval };
          tokenCache.set(token, record);
        }

        record.count += 1;

        if (record.count > limit) {
          return reject("Rate limit exceeded");
        }

        return resolve();
      }),
  };
}
