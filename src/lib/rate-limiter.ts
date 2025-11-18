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
   * Lock map to prevent race conditions with concurrent requests.
   * Ensures atomic increment operations when multiple requests arrive simultaneously.
   */
  private locks = new Map<string, Promise<void>>();

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

  async check(
    category: string,
    identifier: string
  ): Promise<{
    allowed: boolean;
    limit: number;
    remaining: number;
    resetTime: number;
    retryAfter?: number;
  }> {
    const key = `${category}:${identifier}`;

    // Wait for any existing operation on this key to complete
    if (this.locks.has(key)) {
      await this.locks.get(key);
    }

    // Create lock for this operation
    let resolveLock: () => void;
    const lockPromise = new Promise<void>((resolve) => {
      resolveLock = resolve;
    });
    this.locks.set(key, lockPromise);

    try {
      const result = await this._performCheck(category, identifier, key);
      return result;
    } finally {
      // Remove lock when done
      this.locks.delete(key);
      resolveLock!();
    }
  }

  private async _performCheck(
    category: string,
    identifier: string,
    key: string
  ): Promise<{
    allowed: boolean;
    limit: number;
    remaining: number;
    resetTime: number;
    retryAfter?: number;
  }> {
    const config = this.configs.get(category);
    if (!config) {
      throw new Error(`Rate limit configuration not found for category: ${category}`);
    }

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

    // Atomic increment (now protected by lock)
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

export function getRateLimitHeaders(result: Awaited<ReturnType<typeof rateLimiter.check>>) {
  return {
    'X-RateLimit-Limit': result.limit.toString(),
    'X-RateLimit-Remaining': result.remaining.toString(),
    'X-RateLimit-Reset': new Date(result.resetTime).toISOString(),
    ...(result.retryAfter && { 'Retry-After': result.retryAfter.toString() }),
  };
}

/**
 * Extracts client IP address from request headers for rate limiting.
 *
 * SECURITY: Uses trusted headers in priority order to prevent IP spoofing:
 * 1. CF-Connecting-IP (Cloudflare - most trusted)
 * 2. X-Real-IP (Nginx/most proxies - set by proxy, not client)
 * 3. X-Forwarded-For LAST IP (rightmost = closest to server)
 *
 * IMPORTANT: Ensure your reverse proxy/CDN is configured to:
 * - Set CF-Connecting-IP (Cloudflare) or X-Real-IP (Nginx)
 * - Properly forward client IPs in X-Forwarded-For
 *
 * Attack Prevention: Using the first IP in X-Forwarded-For is vulnerable to spoofing
 * because clients can set arbitrary values. The last IP is set by the proxy closest
 * to our server and cannot be manipulated by the client.
 *
 * @see https://developer.mozilla.org/en-US/docs/Web/HTTP/Headers/X-Forwarded-For
 * @see https://adam-p.ca/blog/2022/03/x-forwarded-for/
 */
export function getClientIdentifier(request: Request): string {
  // Priority 1: Cloudflare-specific header (most trusted)
  const cfConnecting = request.headers.get('cf-connecting-ip');
  if (cfConnecting) {
    return cfConnecting.trim();
  }

  // Priority 2: X-Real-IP (set by proxy, cannot be spoofed by client)
  const realIp = request.headers.get('x-real-ip');
  if (realIp) {
    return realIp.trim();
  }

  // Priority 3: X-Forwarded-For - use LAST IP (closest to server)
  const forwarded = request.headers.get('x-forwarded-for');
  if (forwarded) {
    const ips = forwarded.split(',').map(ip => ip.trim());
    // Use the LAST IP in the chain (rightmost = closest to our server)
    // Example: "client-ip, proxy1-ip, proxy2-ip" -> use "proxy2-ip"
    return ips[ips.length - 1];
  }

  // Fallback: Log warning and return unknown
  console.warn('[RateLimiter] Could not determine client IP address');
  return 'unknown';
}
