# Monitoring & Observability

## Overview

gthanks uses Sentry for error tracking and performance monitoring in production. Development environments use console logging.

## Sentry Integration

### Setup

1. **Create Sentry Project** - Sign up at sentry.io and create a new Next.js project

2. **Environment Variables**

```env
SENTRY_DSN=https://...@sentry.io/...
SENTRY_ORG=your-org
SENTRY_PROJECT=gthanks
```

3. **Configuration Files**

```typescript
// sentry.client.config.ts
import * as Sentry from '@sentry/nextjs';

Sentry.init({
  dsn: process.env.NEXT_PUBLIC_SENTRY_DSN,
  environment: process.env.NODE_ENV,

  // Performance Monitoring
  tracesSampleRate: process.env.NODE_ENV === 'production' ? 0.1 : 1.0,

  // Session Replay
  replaysSessionSampleRate: 0.1,
  replaysOnErrorSampleRate: 1.0,

  // Filter out known errors
  beforeSend(event, hint) {
    // Don't send 404 errors
    if (event.exception?.values?.[0]?.value?.includes('404')) {
      return null;
    }
    return event;
  },
});
```

```typescript
// sentry.server.config.ts
import * as Sentry from '@sentry/nextjs';

Sentry.init({
  dsn: process.env.SENTRY_DSN,
  environment: process.env.NODE_ENV,

  // Server-side performance
  tracesSampleRate: 0.1,

  // Enable profiling
  profilesSampleRate: 0.1,
});
```

### Error Tracking

**Automatic Capture:**

- Unhandled promise rejections
- Uncaught exceptions
- API route errors
- Server component errors

**Manual Capture:**

```typescript
import * as Sentry from '@sentry/nextjs';

try {
  await wishService.createWish(data, userId);
} catch (error) {
  Sentry.captureException(error, {
    tags: {
      operation: 'createWish',
      userId,
    },
    contexts: {
      wish: { title: data.title },
    },
  });
  throw error;
}
```

### Performance Monitoring

**Automatic Instrumentation:**

- Page load times
- API route response times
- Database query performance
- External API calls

**Custom Transactions:**

```typescript
import * as Sentry from '@sentry/nextjs';

export async function processImage(imageUrl: string) {
  const transaction = Sentry.startTransaction({
    op: 'image.process',
    name: 'Process Product Image',
  });

  try {
    const span = transaction.startChild({
      op: 'image.download',
      description: 'Download remote image',
    });
    const buffer = await downloadImage(imageUrl);
    span.finish();

    const processSpan = transaction.startChild({
      op: 'image.resize',
      description: 'Resize and optimize',
    });
    const processed = await sharp(buffer).resize(800, 800).webp({ quality: 85 }).toBuffer();
    processSpan.finish();

    return processed;
  } catch (error) {
    transaction.setStatus('internal_error');
    throw error;
  } finally {
    transaction.finish();
  }
}
```

### User Context

Associate errors with users:

```typescript
// middleware.ts or API routes
import * as Sentry from '@sentry/nextjs';
import { getServerSession } from 'next-auth';

export async function middleware(req: NextRequest) {
  const session = await getServerSession();

  if (session?.user) {
    Sentry.setUser({
      id: session.user.id,
      email: session.user.email,
      username: session.user.username,
    });
  }
}
```

### Alerts

Configure Sentry alerts for:

1. **High Error Rate** - Alert when error rate > 5% of requests
2. **New Issues** - Notify on first occurrence of new error types
3. **Critical Errors** - Immediate notification for database/auth failures
4. **Performance Degradation** - Alert when p95 response time > 1s

## Logging Strategy

### Development Logging

Use structured console logging in development:

```typescript
// lib/logger.ts
export const logger = {
  info: (message: string, meta?: object) => {
    if (process.env.NODE_ENV !== 'production') {
      console.log(`[INFO] ${message}`, meta);
    }
  },

  error: (message: string, error?: Error, meta?: object) => {
    console.error(`[ERROR] ${message}`, { error, ...meta });
  },

  warn: (message: string, meta?: object) => {
    console.warn(`[WARN] ${message}`, meta);
  },

  debug: (message: string, meta?: object) => {
    if (process.env.NODE_ENV !== 'production') {
      console.debug(`[DEBUG] ${message}`, meta);
    }
  },
};
```

### Production Logging

Send logs to Sentry as breadcrumbs:

```typescript
import * as Sentry from '@sentry/nextjs';

export const logger = {
  info: (message: string, meta?: object) => {
    Sentry.addBreadcrumb({
      category: 'log',
      message,
      level: 'info',
      data: meta,
    });
  },

  error: (message: string, error?: Error, meta?: object) => {
    Sentry.captureException(error || new Error(message), {
      level: 'error',
      contexts: { log: meta },
    });
  },
};
```

### Logging Best Practices

**DO log:**

- Authentication attempts (success/failure)
- Permission checks (denied access)
- External API failures
- Database connection issues
- Rate limit violations
- Image processing errors

**DON'T log:**

- Passwords or tokens
- Personal information (unless necessary)
- Successful routine operations
- Verbose debug output in production

**Example: Secure Logging**

```typescript
// ✅ Good - No sensitive data
logger.info('User login successful', {
  userId: user.id,
  provider: 'google',
});

// ❌ Bad - Logs sensitive data
logger.info('User login', {
  email: user.email,
  password: user.password, // NEVER log passwords
  accessToken: session.accessToken, // NEVER log tokens
});
```

## Rate Limiting Monitoring

### Track Rate Limit Hits

```typescript
// lib/rate-limit.ts
import * as Sentry from '@sentry/nextjs';
import { RateLimiterMemory } from 'rate-limiter-flexible';

export async function checkRateLimit(key: string, points: number = 1) {
  try {
    await rateLimiter.consume(key, points);
    return { allowed: true };
  } catch (error) {
    // Log rate limit violations
    Sentry.captureMessage('Rate limit exceeded', {
      level: 'warning',
      tags: {
        rateLimitKey: key,
        points,
      },
    });

    logger.warn('Rate limit exceeded', {
      key,
      points,
      remainingPoints: error.remainingPoints,
    });

    return { allowed: false, retryAfter: error.msBeforeNext };
  }
}
```

### Rate Limit Dashboard

Monitor rate limit metrics in Sentry:

- Requests per endpoint
- Top rate-limited IPs
- Rate limit hit rate
- Average retry-after time

## Health Checks

### Health Check Endpoint

```typescript
// app/api/health/route.ts
import { NextResponse } from 'next/server';
import { db } from '@/lib/db';

export async function GET() {
  const checks = {
    database: false,
    timestamp: new Date().toISOString(),
  };

  try {
    // Check database connectivity
    await db.$queryRaw`SELECT 1`;
    checks.database = true;
  } catch (error) {
    console.error('Health check failed:', error);
  }

  const status = checks.database ? 200 : 503;

  return NextResponse.json(checks, { status });
}
```

### Uptime Monitoring

Use external services to monitor health endpoint:

- **UptimeRobot** - Free tier, 5-minute intervals
- **Better Uptime** - Status page + monitoring
- **Pingdom** - Advanced monitoring

Configure alerts for:

- Health check failures
- Response time > 5s
- 5xx error rate > 1%

## Performance Metrics

### Key Metrics to Track

1. **Response Time**
   - p50 (median): < 200ms
   - p95: < 500ms
   - p99: < 1s

2. **Error Rate**
   - Target: < 0.1%
   - Alert: > 1%

3. **Throughput**
   - Requests per minute
   - Peak vs average

4. **Database Performance**
   - Query time (p95 < 100ms)
   - Connection pool usage
   - Slow query log

### Performance Budgets

Set performance budgets in Sentry:

```typescript
// sentry.config.js
{
  tracesSampleRate: 0.1,

  // Set performance budgets
  beforeSendTransaction(event) {
    // Alert if API routes take > 1s
    if (event.transaction?.startsWith('/api/') && event.duration > 1000) {
      console.warn('Slow API route:', {
        route: event.transaction,
        duration: event.duration,
      });
    }
    return event;
  },
}
```

## Error Budget

### Define Error Budget

- **Monthly uptime target**: 99.5% (3.6 hours downtime allowed)
- **Daily error budget**: 0.16% of requests (432 errors/300k requests)
- **Response time SLA**: 95% of requests < 500ms

### Track Error Budget

```typescript
// lib/error-budget.ts
export function trackErrorBudget(success: boolean, responseTime: number) {
  const metrics = {
    timestamp: Date.now(),
    success,
    responseTime,
    withinSLA: responseTime < 500,
  };

  // Send to metrics aggregator (e.g., Sentry, CloudWatch)
  Sentry.captureMessage('Request completed', {
    level: 'info',
    tags: {
      success: success.toString(),
      withinSLA: metrics.withinSLA.toString(),
    },
    extra: metrics,
  });
}
```

## Alerting Rules

### Critical Alerts (Immediate)

- Database connection failure
- Authentication service down
- Error rate > 5%
- Health check failures
- Disk space < 10%

### Warning Alerts (15 minutes)

- Error rate > 1%
- p95 response time > 1s
- Rate limit violations > 100/hour
- Memory usage > 80%

### Info Alerts (Daily digest)

- New error types
- Slow queries
- Unusual traffic patterns

## Metrics Dashboard

### Key Dashboard Panels

1. **Request Volume**
   - Total requests/minute
   - Breakdown by endpoint
   - Success vs error rates

2. **Performance**
   - Response time percentiles (p50, p95, p99)
   - Database query times
   - External API call times

3. **Errors**
   - Error count by type
   - Error rate trend
   - Top error endpoints

4. **Users**
   - Active users (DAU, MAU)
   - User sessions
   - Geographic distribution

5. **Infrastructure**
   - CPU usage
   - Memory usage
   - Disk I/O

## Debugging Production Issues

### Access Logs

```bash
# Docker logs
docker logs gthanks-app --tail=100 --follow

# Filter for errors
docker logs gthanks-app 2>&1 | grep ERROR
```

### Sentry Issue Investigation

1. **Check Issue Details** - Error message, stack trace, breadcrumbs
2. **Review User Context** - User ID, session data, device info
3. **Check Related Issues** - Similar errors, patterns
4. **Replay Session** - Watch user's session leading to error (if enabled)
5. **Check Performance** - Related slow queries or API calls

### Common Issues

**High Error Rate:**

- Check recent deployments
- Review database connection pool
- Check external API status
- Verify environment variables

**Slow Response Times:**

- Identify slow queries in Sentry
- Check database indexes
- Review n+1 queries
- Check external API latency

**Memory Leaks:**

- Monitor memory usage trends
- Check for unclosed connections
- Review event listener cleanup
- Profile memory usage

## Monitoring Checklist

- [ ] Sentry configured with DSN
- [ ] Error tracking enabled
- [ ] Performance monitoring enabled
- [ ] User context attached to errors
- [ ] Health check endpoint created
- [ ] Uptime monitoring configured
- [ ] Alert rules defined
- [ ] Dashboard created
- [ ] Log retention policy set
- [ ] Incident response plan documented
