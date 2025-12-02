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

import { NextRequest, NextResponse } from 'next/server';

import { auditService } from '@/lib/services/audit-service';
import { logger } from '@/lib/services/logger';

export async function GET(request: NextRequest) {
  // Verify cron secret to prevent unauthorized access
  const authHeader = request.headers.get('authorization');
  const expectedAuth = `Bearer ${process.env.CRON_SECRET}`;

  if (!process.env.CRON_SECRET) {
    logger.error('CRON_SECRET environment variable not set');
    return NextResponse.json({ error: 'Server configuration error' }, { status: 500 });
  }

  if (authHeader !== expectedAuth) {
    logger.warn('Unauthorized cron request attempt:', {
      hasAuth: !!authHeader,
      ip: request.headers.get('x-forwarded-for') || 'unknown',
    });
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
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
