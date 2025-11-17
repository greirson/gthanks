# Rate Limiting Implementation

## Overview

Global rate limiting has been implemented to protect all API routes from abuse and DoS attacks. The middleware applies a baseline rate limit of **100 requests per minute per IP address** to all API endpoints.

## Architecture

### Components

1. **Rate Limiter Service** (`src/lib/rate-limiter.ts`)
   - In-memory token bucket implementation
   - Configurable limits per category
   - Memory exhaustion protection (max 10,000 entries)
   - LRU eviction when limit exceeded

2. **Middleware** (`src/middleware.ts`)
   - Applies global rate limit to all `/api/*` routes
   - Excludes specific endpoints (NextAuth, cron, health checks)
   - Returns 429 status with Retry-After header when limit exceeded

### Rate Limit Configuration

| Category | Window | Max Requests | Notes |
|----------|--------|--------------|-------|
| **global-api** | 1 minute | 100 | Baseline protection for all API routes |
| co-manager-invite | 1 hour | 10 | Prevent invitation spam |
| co-manager-add | 1 hour | 20 | Prevent bulk additions |
| co-manager-remove | 1 hour | 50 | Higher limit for removals |
| invitation-accept | 1 minute | 5 | Prevent rapid acceptance attempts |
| public-list-access | 1 minute | 20 | Anonymous list viewing |
| public-reservation | 1 minute | 10 | Anonymous gift reservations |
| public-list-password | 5 minutes | 5 | Brute-force protection |
| email-add | 1 hour | 5 | Email addition rate limit |
| email-verify | 1 hour | 20 | Verification attempts |
| email-resend | 1 hour | 5 | Resend verification |
| username-set | 1 hour | 5 | Username updates (per user) |
| username-set-ip | 1 hour | 10 | Username updates (per IP) |
| slug-set | 1 hour | 10 | Slug updates |

## Excluded Endpoints

The following endpoints are excluded from global rate limiting:

- `/api/auth/*` - NextAuth endpoints (have their own rate limiting)
- `/api/cron/*` - Cron jobs (protected by secret)
- `/api/health` - Health check endpoint
- `/_next/static/*` - Static assets
- Image files (`.jpg`, `.png`, `.svg`, etc.)

## Response Format

### Rate Limit Headers (All Responses)

```
X-RateLimit-Limit: 100
X-RateLimit-Remaining: 42
X-RateLimit-Reset: 2025-11-14T12:35:00.000Z
```

### Rate Limit Exceeded (429 Response)

```json
{
  "error": "Too many requests. Please wait a moment and try again",
  "code": "RATE_LIMIT_EXCEEDED",
  "retryAfter": 45
}
```

**Headers:**
```
X-RateLimit-Limit: 100
X-RateLimit-Remaining: 0
X-RateLimit-Reset: 2025-11-14T12:35:00.000Z
Retry-After: 45
```

## Testing

### Manual Testing

Use the provided test script to verify rate limiting:

```bash
# Test global API rate limiting
./scripts/test-rate-limit.sh

# Test against specific endpoint
BASE_URL=http://localhost:3000 ENDPOINT=/api/metadata ./scripts/test-rate-limit.sh
```

### Expected Behavior

- Requests 1-100: Succeed with status 200
- Request 101+: Return 429 until window expires
- After window expiration: Rate limit resets

### Testing Checklist

- [ ] Global rate limit triggers at 101st request
- [ ] 429 response includes proper error message
- [ ] Rate limit headers present in all responses
- [ ] Retry-After header included in 429 responses
- [ ] Static assets are NOT rate limited
- [ ] NextAuth endpoints are NOT globally rate limited
- [ ] Rate limit resets after window expiration

## Production Considerations

### Current Implementation (MVP)

- **Storage**: In-memory (single server instance)
- **Max Entries**: 10,000 (LRU eviction when exceeded)
- **Best For**: Single-server deployments, low-to-medium traffic

### Recommended for Production (Scalable)

For production deployments with multiple serverless instances, migrate to distributed rate limiting using Redis/Upstash:

```typescript
// src/lib/rate-limiter.ts

import { Redis } from '@upstash/redis';

const redis = process.env.UPSTASH_REDIS_URL
  ? new Redis({
      url: process.env.UPSTASH_REDIS_URL,
      token: process.env.UPSTASH_REDIS_TOKEN,
    })
  : null;

export class RateLimiter {
  async check(key: string, identifier: string, options?) {
    if (redis) {
      return this.checkRedis(key, identifier, options);
    } else {
      return this.checkMemory(key, identifier, options);
    }
  }
}
```

**Environment Variables:**
```env
# Optional for development
UPSTASH_REDIS_URL=https://your-redis-url.upstash.io
UPSTASH_REDIS_TOKEN=your-token-here
```

### Monitoring

Monitor rate limiting effectiveness by watching for:

```
[RateLimiter] Security: Evicted N entries due to MAX_ENTRIES limit
```

This log indicates potential memory exhaustion attack or unusually high traffic. Consider:
- Migrating to Redis/Upstash
- Increasing MAX_ENTRIES (if legitimate traffic)
- Investigating potential DDoS attack

## Security Benefits

1. **DoS Protection**: Prevents single IP from overwhelming server
2. **Brute-Force Prevention**: Password attempts rate limited
3. **Spam Prevention**: Email and invitation spam blocked
4. **Resource Protection**: Prevents database query flooding
5. **Fair Usage**: Ensures resources available to all users

## Adjusting Limits

To adjust rate limits, edit the configuration in `src/lib/rate-limiter.ts`:

```typescript
rateLimiter.configure('global-api', {
  windowMs: 60 * 1000, // 1 minute
  maxRequests: 100,    // Increase if needed
});
```

**Guidelines:**
- Too low: Legitimate users blocked
- Too high: Ineffective against abuse
- Monitor 429 responses in production logs
- Adjust based on actual usage patterns

## Troubleshooting

### Issue: Legitimate users getting rate limited

**Solution:** Increase `maxRequests` for global-api or specific categories

### Issue: Memory usage growing

**Solution:** Check for memory exhaustion warnings in logs. Consider:
- Migrating to Redis
- Increasing cleanup frequency
- Investigating unusual traffic patterns

### Issue: Rate limiting not working

**Solution:** Verify:
- Middleware is applied to `/api/*` routes
- Request is not excluded (auth, cron, health)
- Rate limiter is configured for the category
- Build succeeded without errors

## References

- Rate Limiter Service: `src/lib/rate-limiter.ts`
- Middleware Implementation: `src/middleware.ts`
- Test Script: `scripts/test-rate-limit.sh`
- API Routes: `src/app/api/`
