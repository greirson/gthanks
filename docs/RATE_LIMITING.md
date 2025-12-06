# Rate Limiting

## Overview

Global rate limiting protects all API routes: **100 requests per minute per IP**. Implemented via in-memory token bucket in middleware (`src/middleware.ts`).

## Rate Limits

| Category             | Window    | Max Requests | Notes                            |
| -------------------- | --------- | ------------ | -------------------------------- |
| **global-api**       | 1 minute  | 100          | Baseline for all API routes      |
| co-manager-invite    | 1 hour    | 10           | Prevent invitation spam          |
| co-manager-add       | 1 hour    | 20           | Prevent bulk additions           |
| invitation-accept    | 1 minute  | 5            | Prevent rapid acceptance         |
| public-list-access   | 1 minute  | 20           | Anonymous list viewing           |
| public-reservation   | 1 minute  | 10           | Anonymous gift reservations      |
| public-list-password | 5 minutes | 5            | Brute-force protection           |
| email-add            | 1 hour    | 5            | Email addition                   |
| email-verify         | 1 hour    | 20           | Verification attempts            |
| username-set         | 1 hour    | 5            | Username updates (per user)      |
| metadata-extract     | 1 minute  | 5            | Web scraping (expensive)         |
| image-upload         | 1 hour    | 10           | Image processing (CPU-intensive) |

## Excluded Endpoints

- `/api/auth/*` - NextAuth (has own rate limiting)
- `/api/cron/*` - Cron jobs (protected by secret)
- `/api/health` - Health check
- Static assets

## Response Headers

All responses include:

```
X-RateLimit-Limit: 100
X-RateLimit-Remaining: 42
X-RateLimit-Reset: 2025-11-14T12:35:00.000Z
```

**429 Response:**

```json
{
  "error": "Too many requests. Please wait a moment and try again",
  "code": "RATE_LIMIT_EXCEEDED",
  "retryAfter": 45
}
```

## Configuration

Edit limits in `src/lib/rate-limiter.ts`. Current implementation uses in-memory storage (single server). For multi-instance deployments, migrate to Redis/Upstash.
