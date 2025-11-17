# Rate Limiter Security Enhancement

## Overview
Added maximum size limit with LRU (Least Recently Used) eviction to the in-memory rate limiter to prevent memory exhaustion DoS attacks.

## Problem Addressed
The previous implementation had no limit on the number of entries that could be stored in memory. An attacker could exhaust server memory by making requests from unlimited unique IP addresses or identifiers.

## Solution Implemented

### 1. Maximum Entries Limit
- Set `MAX_ENTRIES = 10000` constant
- Sufficient for typical traffic (100 unique IPs/minute with 1-hour windows = 6000 entries)
- Leaves buffer for burst traffic and multiple rate limit categories

### 2. LRU Eviction Strategy
When storage exceeds MAX_ENTRIES:
- Entries are sorted by `resetTime` (oldest first)
- Oldest entries are removed until size is under limit
- Active rate limits are preserved (newest entries)

### 3. Optimized Cleanup
- Cleanup runs every 100 checks (not every request) for performance
- Two-phase cleanup:
  1. Remove expired entries
  2. Perform LRU eviction if needed
- Logs warnings when eviction occurs (helps detect attacks)

## Testing
The implementation has been tested for:
1. Normal rate limiting functionality (unchanged)
2. Storage size monitoring
3. LRU eviction when limit is exceeded
4. Preservation of active rate limits

## Monitoring
Watch for log messages containing `[RateLimiter] Security:` which indicate:
- Memory limit was reached
- Entries were evicted
- Potential memory exhaustion attack

## Migration Notes
- No breaking changes to the API
- Existing code continues to work unchanged
- New methods added:
  - `getStorageSize()`: Returns current number of entries
  - `forceCleanup()`: Manually trigger cleanup

## Production Recommendations
This is a single-instance solution designed for standalone deployments. For distributed deployments with multiple instances, consider:
1. Redis-based rate limiting for distributed systems
2. Monitoring and alerting on eviction events
3. Adjusting MAX_ENTRIES based on traffic patterns

## Related Issues
- GitHub Issue #66: Memory exhaustion vulnerability in rate limiter
