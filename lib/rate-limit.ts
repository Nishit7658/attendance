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
  const tokenCache = new Map<string, number[]>();
  const uniqueTokenPerInterval = options?.uniqueTokenPerInterval || 500;
  const interval = options?.interval || 60000;

  return {
    check: (limit: number, token: string) =>
      new Promise<void>((resolve, reject) => {
        const tokenCount = tokenCache.get(token) || [0];
        if (tokenCount[0] === 0) {
          // Bounded Map: remove oldest if we exceed capacity
          if (tokenCache.size >= uniqueTokenPerInterval) {
            const firstKey = tokenCache.keys().next().value;
            if (firstKey !== undefined) tokenCache.delete(firstKey);
          }
          tokenCache.set(token, tokenCount);
        }
        tokenCount[0] += 1;

        const currentUsage = tokenCount[0];
        const isRateLimited = currentUsage > limit;

        // Cleanup
        setTimeout(() => {
          tokenCount[0] -= 1;
          if (tokenCount[0] === 0) {
            tokenCache.delete(token);
          }
        }, interval);

        if (isRateLimited) {
          return reject("Rate limit exceeded");
        }

        return resolve();
      }),
  };
}
