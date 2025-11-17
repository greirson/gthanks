import { RateLimiterMemory } from 'rate-limiter-flexible';

export interface RateLimitResult {
  allowed: boolean;
  retryAfter?: number;
}

export interface RateLimiterOptions {
  points: number; // Number of requests allowed
  duration: number; // Time window in seconds
}

/**
 * Creates a rate limiter function for API endpoints
 *
 * @param points - Number of requests allowed in the time window
 * @param duration - Time window in seconds
 * @returns Rate limiter function that checks if a user has exceeded their limit
 *
 * @example
 * // Create a rate limiter for 10 requests per hour
 * const invitationRateLimiter = createRateLimiter(10, 3600);
 *
 * // Check rate limit in API route
 * const result = await invitationRateLimiter(userId);
 * if (!result.allowed) {
 *   return NextResponse.json(
 *     { error: 'Rate limit exceeded', retryAfter: result.retryAfter },
 *     { status: 429 }
 *   );
 * }
 */
export function createRateLimiter(points: number, duration: number) {
  const limiter = new RateLimiterMemory({
    points,
    duration,
    blockDuration: 0, // Don't block, just reject
  });

  return async function rateLimitMiddleware(userId: string): Promise<RateLimitResult> {
    try {
      await limiter.consume(userId);
      return { allowed: true };
    } catch (error) {
      // RateLimiterRes error contains msBeforeNext property
      const retryAfter =
        error &&
        typeof error === 'object' &&
        'msBeforeNext' in error &&
        typeof error.msBeforeNext === 'number'
          ? Math.round(error.msBeforeNext / 1000)
          : duration;
      return {
        allowed: false,
        retryAfter,
      };
    }
  };
}

/**
 * Pre-configured rate limiter for group invitations
 * Limits to 10 invitation batches per hour per user
 */
export const invitationRateLimiter = createRateLimiter(10, 3600); // 10 requests per hour
