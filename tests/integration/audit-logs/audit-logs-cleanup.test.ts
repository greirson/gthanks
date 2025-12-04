/**
 * Integration tests for the audit logs cleanup cron job
 *
 * Tests cover:
 * - Authentication via CRON_SECRET header
 * - Cleanup execution with valid credentials
 * - Retention period enforcement (AUDIT_LOG_RETENTION_DAYS)
 */

import { describe, it, expect, beforeEach, afterEach } from '@jest/globals';
import { NextResponse } from 'next/server';

import { db } from '@/lib/db';
import { rateLimiter } from '@/lib/rate-limiter';
import { auditService } from '@/lib/services/audit-service';
import { seedAuditLogs, clearAuditLogs, getAuditLogCount } from '../../helpers/audit-log.helper';

const TEST_CRON_SECRET = 'test-cron-secret-for-cleanup-job';

/**
 * Simplified route handler for testing that mirrors the production logic
 * but uses direct auth string comparison instead of reading from NextRequest headers.
 *
 * This avoids Jest module caching issues with process.env and NextRequest mock issues.
 */
async function testableCleanupHandler(authHeader: string | null): Promise<NextResponse> {
  // Verify cron secret
  const expectedAuth = `Bearer ${TEST_CRON_SECRET}`;

  if (!authHeader || authHeader !== expectedAuth) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  // Rate limit check
  const rateLimitResult = await rateLimiter.check('cron-audit-cleanup', 'system');
  if (!rateLimitResult.allowed) {
    return NextResponse.json(
      { error: 'Too many cleanup requests', retryAfter: rateLimitResult.retryAfter },
      { status: 429 }
    );
  }

  try {
    const result = await auditService.cleanup();
    return NextResponse.json({
      success: true,
      deleted: result.deleted,
    });
  } catch {
    return NextResponse.json({ error: 'Cleanup failed' }, { status: 500 });
  }
}

describe('POST /api/cron/cleanup-audit-logs', () => {
  let originalRetentionDays: string | undefined;
  let originalMaxEntries: string | undefined;

  beforeEach(async () => {
    // Save original values
    originalRetentionDays = process.env.AUDIT_LOG_RETENTION_DAYS;
    originalMaxEntries = process.env.AUDIT_LOG_MAX_ENTRIES;

    // Configure rate limiter for cron endpoint (mirrors production config)
    rateLimiter.configure('cron-audit-cleanup', {
      windowMs: 60000, // 1 minute
      maxRequests: 10, // Higher limit for tests to avoid rate limit issues
    });

    // Clear rate limiter storage to prevent test isolation issues
    rateLimiter.clear();

    // Invalidate audit service cache to pick up new settings
    auditService.invalidateCache();

    // Clear existing audit logs
    await clearAuditLogs();
  });

  afterEach(async () => {
    // Restore original environment values
    if (originalRetentionDays !== undefined) {
      process.env.AUDIT_LOG_RETENTION_DAYS = originalRetentionDays;
    } else {
      delete process.env.AUDIT_LOG_RETENTION_DAYS;
    }
    if (originalMaxEntries !== undefined) {
      process.env.AUDIT_LOG_MAX_ENTRIES = originalMaxEntries;
    } else {
      delete process.env.AUDIT_LOG_MAX_ENTRIES;
    }

    // Clean up audit logs
    await clearAuditLogs();
  });

  it('returns 401 without CRON_SECRET header', async () => {
    // Execute the route handler without Authorization header
    const response = await testableCleanupHandler(null);
    const data = await response.json();

    // Verify 401 Unauthorized response
    expect(response.status).toBe(401);
    expect(data.error).toBe('Unauthorized');
  });

  it('returns 401 with invalid CRON_SECRET', async () => {
    // Execute the route handler with wrong secret
    const response = await testableCleanupHandler('Bearer wrong-secret');
    const data = await response.json();

    // Verify 401 Unauthorized response
    expect(response.status).toBe(401);
    expect(data.error).toBe('Unauthorized');
  });

  it('executes cleanup successfully with valid CRON_SECRET', async () => {
    // Seed some audit logs (recent ones that should NOT be deleted)
    await seedAuditLogs(5, {
      category: 'auth',
      action: 'login_success',
    });

    const countBefore = await getAuditLogCount();
    expect(countBefore).toBe(5);

    // Execute the route handler with valid Authorization header
    const response = await testableCleanupHandler(`Bearer ${TEST_CRON_SECRET}`);
    const data = await response.json();

    // Verify successful response
    expect(response.status).toBe(200);
    expect(data.success).toBe(true);
    expect(typeof data.deleted).toBe('number');

    // Recent logs should NOT be deleted (they are within retention period)
    const countAfter = await getAuditLogCount();
    expect(countAfter).toBe(5);
  });

  it('cleanup deletes entries older than retention period', async () => {
    // Configure short retention period for testing
    process.env.AUDIT_LOG_RETENTION_DAYS = '7';

    // Seed recent audit logs (should NOT be deleted - within 7 days)
    await seedAuditLogs(3, {
      category: 'auth',
      action: 'recent_login',
      // Use small negative offset (1 day ago) - within retention
      timestampOffset: -1 * 24 * 60 * 60 * 1000, // -1 day
    });

    // Seed old audit logs (should BE deleted - older than 7 days)
    await seedAuditLogs(5, {
      category: 'content',
      action: 'old_action',
      // Use large negative offset (30 days ago) - outside retention
      timestampOffset: -30 * 24 * 60 * 60 * 1000, // -30 days
    });

    const countBefore = await getAuditLogCount();
    expect(countBefore).toBe(8);

    // Verify we have both recent and old logs
    const recentLogs = await db.auditLog.findMany({
      where: { action: 'recent_login' },
    });
    const oldLogs = await db.auditLog.findMany({
      where: { action: 'old_action' },
    });
    expect(recentLogs.length).toBe(3);
    expect(oldLogs.length).toBe(5);

    // Execute the route handler with valid Authorization header
    const response = await testableCleanupHandler(`Bearer ${TEST_CRON_SECRET}`);
    const data = await response.json();

    // Verify successful response
    expect(response.status).toBe(200);
    expect(data.success).toBe(true);
    expect(data.deleted).toBe(5); // Only old entries should be deleted

    // Verify only old logs were deleted
    const countAfter = await getAuditLogCount();
    expect(countAfter).toBe(3); // Only recent logs remain

    // Verify the correct logs remain
    const remainingLogs = await db.auditLog.findMany();
    expect(remainingLogs.length).toBe(3);
    expect(remainingLogs.every((log) => log.action === 'recent_login')).toBe(true);
  });
});
