/**
 * Audit Log Cleanup Cron Endpoint
 *
 * Protected endpoint called by Vercel Cron Jobs to clean up old audit log entries.
 * Requires CRON_SECRET environment variable for authorization.
 *
 * Cleanup respects:
 * - AUDIT_LOG_RETENTION_DAYS (default: 30) - Entries older than this are deleted
 * - AUDIT_LOG_MAX_ENTRIES (default: 50000) - Oldest entries deleted if count exceeds this
 */

import { timingSafeEqual } from 'crypto';

import { NextRequest, NextResponse } from 'next/server';

import { rateLimiter } from '@/lib/rate-limiter';
import { auditService } from '@/lib/services/audit-service';
import { logger } from '@/lib/services/logger';

// Configure rate limit for cron endpoint (NICE-16)
// Allow max 1 request per minute to prevent abuse
rateLimiter.configure('cron-audit-cleanup', {
  windowMs: 60000, // 1 minute
  maxRequests: 1,
});

/**
 * Performs constant-time string comparison to prevent timing attacks.
 * Returns false for different length strings without leaking length info.
 */
function secureCompare(a: string, b: string): boolean {
  // Handle different lengths safely (timingSafeEqual requires same length)
  if (a.length !== b.length) {
    // Still do a comparison to avoid timing leak on length check
    timingSafeEqual(Buffer.from(a), Buffer.from(a));
    return false;
  }
  return timingSafeEqual(Buffer.from(a), Buffer.from(b));
}

export async function GET(request: NextRequest) {
  // Verify cron secret to prevent unauthorized access
  const authHeader = request.headers.get('authorization');
  const expectedAuth = `Bearer ${process.env.CRON_SECRET}`;

  if (!process.env.CRON_SECRET) {
    logger.error('CRON_SECRET environment variable not set');
    return NextResponse.json({ error: 'Server configuration error' }, { status: 500 });
  }

  if (!authHeader || !secureCompare(authHeader, expectedAuth)) {
    logger.warn('Unauthorized cron request attempt:', {
      hasAuth: !!authHeader,
      ip: request.headers.get('x-forwarded-for') || 'unknown',
    });
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  // Rate limit to prevent abuse (NICE-16)
  // Even authenticated cron requests are limited to 1 per minute
  const rateLimitResult = await rateLimiter.check('cron-audit-cleanup', 'system');

  if (!rateLimitResult.allowed) {
    logger.warn('Audit cleanup cron rate limited', {
      retryAfter: rateLimitResult.retryAfter,
    });
    return NextResponse.json(
      { error: 'Too many cleanup requests', retryAfter: rateLimitResult.retryAfter },
      { status: 429 }
    );
  }

  try {
    const result = await auditService.cleanup();

    logger.info('Audit log cleanup completed', {
      deleted: result.deleted,
      retentionDays: process.env.AUDIT_LOG_RETENTION_DAYS || '30',
      maxEntries: process.env.AUDIT_LOG_MAX_ENTRIES || '50000',
    });

    return NextResponse.json({
      success: true,
      deleted: result.deleted,
    });
  } catch (error) {
    logger.error('Audit log cleanup cron job failed:', error);
    // Don't expose internal error details to prevent information leakage
    return NextResponse.json({ error: 'Cleanup failed' }, { status: 500 });
  }
}
