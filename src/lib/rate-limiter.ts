/**
 * Simple in-memory rate limiter for MVP with memory exhaustion protection
 * For production, use Redis-based distributed rate limiting
 * 
 * Security enhancement: Added MAX_ENTRIES limit with LRU eviction to prevent
 * memory exhaustion attacks where attackers create unlimited entries.
 */

interface RateLimitEntry {
  count: number;
  resetTime: number;
}

interface RateLimitConfig {
  windowMs: number;
  maxRequests: number;
}

class SimpleRateLimiter {
  private storage = new Map<string, RateLimitEntry>();
  private configs = new Map<string, RateLimitConfig>();
  
  /**
   * Maximum number of entries to store in memory.
   * Prevents memory exhaustion attacks by limiting storage size.
   * 10,000 entries can handle typical traffic patterns:
   * - Assuming 100 unique IPs per minute
   * - With 1-hour windows, that's 6,000 entries
   * - Leaves buffer for burst traffic and multiple rate limit categories
   * 
   * For production with higher traffic, use Redis-based rate limiting.
   */
  private readonly MAX_ENTRIES = 10000;
  
  /**
   * Counter to track cleanup frequency.
   * Cleanup runs every 100 checks to balance performance and memory usage.
   */
  private checkCounter = 0;
  private readonly CLEANUP_INTERVAL = 100;

  configure(category: string, config: RateLimitConfig) {
    this.configs.set(category, config);
  }

  check(
    category: string,
    identifier: string
  ): {
    allowed: boolean;
    limit: number;
    remaining: number;
    resetTime: number;
    retryAfter?: number;
  } {
    const config = this.configs.get(category);
    if (!config) {
      throw new Error(`Rate limit configuration not found for category: ${category}`);
    }

    const key = `${category}:${identifier}`;
    const now = Date.now();
    const resetTime = now + config.windowMs;

    const entry = this.storage.get(key);

    // Clean expired entries periodically (not on every request for performance)
    this.checkCounter++;
    if (this.checkCounter >= this.CLEANUP_INTERVAL) {
      this.checkCounter = 0;
      this.cleanup();
    }

    if (!entry || entry.resetTime <= now) {
      // First request or window expired
      this.storage.set(key, {
        count: 1,
        resetTime,
      });

      return {
        allowed: true,
        limit: config.maxRequests,
        remaining: config.maxRequests - 1,
        resetTime,
      };
    }

    if (entry.count >= config.maxRequests) {
      // Rate limit exceeded
      return {
        allowed: false,
        limit: config.maxRequests,
        remaining: 0,
        resetTime: entry.resetTime,
        retryAfter: Math.ceil((entry.resetTime - now) / 1000),
      };
    }

    // Increment counter
    entry.count++;
    this.storage.set(key, entry);

    return {
      allowed: true,
      limit: config.maxRequests,
      remaining: config.maxRequests - entry.count,
      resetTime: entry.resetTime,
    };
  }

  /**
   * Cleanup expired entries and perform LRU eviction if needed.
   * This method serves two purposes:
   * 1. Remove expired entries to free memory (original functionality)
   * 2. Perform LRU eviction when storage exceeds MAX_ENTRIES (security enhancement)
   */
  private cleanup() {
    const now = Date.now();
    let expiredCount = 0;
    
    // Phase 1: Remove expired entries
    for (const [key, entry] of this.storage.entries()) {
      if (entry.resetTime <= now) {
        this.storage.delete(key);
        expiredCount++;
      }
    }

    // Phase 2: LRU eviction if storage still exceeds limit
    if (this.storage.size > this.MAX_ENTRIES) {
      // Sort entries by resetTime (oldest first) for LRU eviction
      // This ensures we remove the least recently used entries
      const sortedEntries = Array.from(this.storage.entries())
        .sort(([, a], [, b]) => a.resetTime - b.resetTime);
      
      // Calculate how many entries to remove
      const entriesToRemove = this.storage.size - this.MAX_ENTRIES;
      const toDelete = sortedEntries.slice(0, entriesToRemove);
      
      // Remove the oldest entries
      for (const [key] of toDelete) {
        this.storage.delete(key);
      }
      
      // Log eviction event for monitoring (helps detect potential attacks)
      if (toDelete.length > 0) {
        console.warn(
          `[RateLimiter] Security: Evicted ${toDelete.length} entries due to MAX_ENTRIES limit (${this.MAX_ENTRIES}). ` +
          `This may indicate a memory exhaustion attack or unusually high traffic. ` +
          `Expired: ${expiredCount}, Total evicted: ${toDelete.length}, Current size: ${this.storage.size}`
        );
      }
    }
  }

  /**
   * Force immediate cleanup - useful for testing or manual intervention
   */
  forceCleanup() {
    this.cleanup();
  }

  /**
   * Get current storage size - useful for monitoring
   */
  getStorageSize(): number {
    return this.storage.size;
  }

  // For testing
  clear() {
    this.storage.clear();
    this.checkCounter = 0;
  }
}

// Create singleton instance
export const rateLimiter = new SimpleRateLimiter();

// Configure global API rate limit (baseline protection for all endpoints)
rateLimiter.configure('global-api', {
  windowMs: 60 * 1000, // 1 minute
  maxRequests: 100, // 100 requests per minute per IP
});

// Configure rate limits for co-manager endpoints
rateLimiter.configure('co-manager-invite', {
  windowMs: 60 * 60 * 1000, // 1 hour
  maxRequests: 10, // 10 invitations per hour per IP
});

rateLimiter.configure('co-manager-add', {
  windowMs: 60 * 60 * 1000, // 1 hour
  maxRequests: 20, // 20 additions per hour per IP
});

rateLimiter.configure('co-manager-remove', {
  windowMs: 60 * 60 * 1000, // 1 hour
  maxRequests: 50, // 50 removals per hour per IP
});

rateLimiter.configure('invitation-accept', {
  windowMs: 60 * 1000, // 1 minute
  maxRequests: 5, // 5 attempts per minute per IP
});

// Configure rate limit for public list access (anonymous sharing)
rateLimiter.configure('public-list-access', {
  windowMs: 60 * 1000, // 1 minute
  maxRequests: 20, // 20 requests per minute per IP
});

// Configure rate limit for public list reservations (anonymous reservations)
rateLimiter.configure('public-reservation', {
  windowMs: 60 * 1000, // 1 minute
  maxRequests: 10, // 10 reservations per minute per IP (stricter than viewing)
});

// Configure rate limit for password-protected list access (prevent brute-force)
rateLimiter.configure('public-list-password', {
  windowMs: 5 * 60 * 1000, // 5 minutes
  maxRequests: 5, // Only 5 password attempts per 5 minutes per IP
});

// Email management rate limits
rateLimiter.configure('email-add', {
  windowMs: 60 * 60 * 1000, // 1 hour
  maxRequests: 5, // 5 email additions per hour
});

rateLimiter.configure('email-verify', {
  windowMs: 60 * 60 * 1000, // 1 hour
  maxRequests: 20, // 20 verification attempts per hour
});

rateLimiter.configure('email-resend', {
  windowMs: 60 * 60 * 1000, // 1 hour
  maxRequests: 5, // 5 resend requests per hour
});

// Vanity URL rate limits
rateLimiter.configure('username-set', {
  windowMs: 60 * 60 * 1000, // 1 hour
  maxRequests: 5, // 5 attempts per hour per user
});

rateLimiter.configure('username-set-ip', {
  windowMs: 60 * 60 * 1000, // 1 hour
  maxRequests: 10, // 10 attempts per hour per IP
});

rateLimiter.configure('slug-set', {
  windowMs: 60 * 60 * 1000, // 1 hour
  maxRequests: 10, // 10 slug updates per hour per user
});

export function getRateLimitHeaders(result: ReturnType<typeof rateLimiter.check>) {
  return {
    'X-RateLimit-Limit': result.limit.toString(),
    'X-RateLimit-Remaining': result.remaining.toString(),
    'X-RateLimit-Reset': new Date(result.resetTime).toISOString(),
    ...(result.retryAfter && { 'Retry-After': result.retryAfter.toString() }),
  };
}

export function getClientIdentifier(request: Request): string {
  // Use X-Forwarded-For for production deployments behind proxies
  const forwarded = request.headers.get('x-forwarded-for');
  if (forwarded) {
    return forwarded.split(',')[0].trim();
  }

  // Fallback to other headers
  return (
    request.headers.get('x-real-ip') ||
    request.headers.get('cf-connecting-ip') || // Cloudflare
    'unknown'
  );
}
