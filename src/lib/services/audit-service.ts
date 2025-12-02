import { db } from '@/lib/db';
import type { Prisma, AuditLogSettings } from '@prisma/client';
import type { AuditLogEntry, AuditCategory, AuditLogQueryParams } from '@/lib/schemas/audit-log';

/**
 * Audit Service
 *
 * Provides fire-and-forget audit logging for security and compliance.
 * Designed for serverless environments (no SSE, no EventEmitter).
 *
 * Key Features:
 * - Fire-and-forget: log() returns immediately, never blocks requests
 * - Category toggles: configurable via AuditLogSettings
 * - Settings caching: 1-minute TTL to reduce database queries
 * - Safe failures: errors are logged but never thrown
 *
 * Usage:
 *   // Fire and forget - do NOT await
 *   auditService.log({
 *     actorId: user.id,
 *     actorName: user.name,
 *     actorType: 'user',
 *     category: 'auth',
 *     action: 'login_success',
 *     ipAddress: req.headers.get('x-forwarded-for')?.split(',')[0],
 *     userAgent: req.headers.get('user-agent'),
 *   });
 */
class AuditService {
  private settingsCache: AuditLogSettings | null = null;
  private settingsCacheTime: number = 0;
  private readonly CACHE_TTL = 60000; // 1 minute

  /**
   * Log an audit event (fire-and-forget)
   *
   * CRITICAL: Do NOT await this method. It's designed to run in the background.
   * Errors are logged to console but never thrown to the caller.
   *
   * @param entry - The audit log entry to create
   */
  log(entry: AuditLogEntry): void {
    // Fire and forget - don't await, don't block
    this.logAsync(entry).catch((err) => {
      console.error('[AuditService] Failed to log entry:', err);
    });
  }

  /**
   * Internal async logging implementation
   */
  private async logAsync(entry: AuditLogEntry): Promise<void> {
    // Check master toggle from environment
    if (process.env.AUDIT_LOG_ENABLED === 'false') {
      return;
    }

    // Check category settings (with caching)
    const settings = await this.getCategorySettings();
    if (!this.isCategoryEnabled(entry.category, settings)) {
      return;
    }

    // Auto-resolve actor name if missing but actorId is provided
    let actorName = entry.actorName ?? null;
    if (!actorName && entry.actorId && entry.actorType === 'user') {
      actorName = await this.resolveActorName(entry.actorId);
    }

    // Create log entry
    await db.auditLog.create({
      data: {
        actorId: entry.actorId ?? null,
        actorName,
        actorType: entry.actorType,
        category: entry.category,
        action: entry.action,
        resourceType: entry.resourceType ?? null,
        resourceId: entry.resourceId ?? null,
        resourceName: entry.resourceName ?? null,
        details: entry.details ? JSON.stringify(entry.details) : null,
        ipAddress: entry.ipAddress ?? null,
        userAgent: entry.userAgent ?? null,
      },
    });
  }

  /**
   * Resolve actor name from user ID
   * Returns name, email, or null if not found
   */
  private async resolveActorName(userId: string): Promise<string | null> {
    try {
      const user = await db.user.findUnique({
        where: { id: userId },
        select: { name: true, email: true },
      });
      return user?.name || user?.email || null;
    } catch {
      // Don't let name resolution failure break audit logging
      return null;
    }
  }

  /**
   * Get category settings with caching
   */
  private async getCategorySettings(): Promise<AuditLogSettings> {
    const now = Date.now();

    // Return cached settings if still valid
    if (this.settingsCache && now - this.settingsCacheTime < this.CACHE_TTL) {
      return this.settingsCache;
    }

    // Fetch from database
    const settings = await db.auditLogSettings.findFirst({
      where: { id: 'default' },
    });

    if (!settings) {
      // Create default settings if not exists
      const defaultSettings = await db.auditLogSettings.create({
        data: { id: 'default' },
      });
      this.settingsCache = defaultSettings;
    } else {
      this.settingsCache = settings;
    }

    this.settingsCacheTime = now;
    return this.settingsCache;
  }

  /**
   * Check if a category is enabled
   */
  private isCategoryEnabled(category: AuditCategory, settings: AuditLogSettings): boolean {
    switch (category) {
      case 'auth':
        return settings.authEnabled;
      case 'user':
        return settings.userManagementEnabled;
      case 'content':
        return settings.contentEnabled;
      case 'admin':
        return settings.adminEnabled;
      default:
        return true;
    }
  }

  /**
   * Query audit logs with filters and pagination
   *
   * Used by GET /api/admin/audit-logs
   */
  async query(params: AuditLogQueryParams) {
    const {
      page = 1,
      pageSize = 50,
      category,
      actorId,
      startDate,
      endDate,
      search,
      since,
    } = params;

    const where: Prisma.AuditLogWhereInput = {};

    // Apply filters
    if (category) {
      where.category = category;
    }

    if (actorId) {
      where.actorId = actorId;
    }

    // Date range filters
    if (startDate || endDate || since) {
      where.timestamp = {};
      if (startDate) {
        where.timestamp.gte = new Date(startDate);
      }
      if (endDate) {
        where.timestamp.lte = new Date(endDate);
      }
      if (since) {
        where.timestamp.gt = new Date(since);
      }
    }

    // Search filter (action, resourceName, actorName)
    if (search) {
      where.OR = [
        { action: { contains: search } },
        { resourceName: { contains: search } },
        { actorName: { contains: search } },
      ];
    }

    // Execute query with pagination
    const effectivePageSize = Math.min(pageSize, 100); // Max 100 per page

    const [data, total] = await Promise.all([
      db.auditLog.findMany({
        where,
        orderBy: { timestamp: 'desc' },
        skip: (page - 1) * effectivePageSize,
        take: effectivePageSize,
      }),
      db.auditLog.count({ where }),
    ]);

    return {
      data: data.map((log) => ({
        ...log,
        timestamp: log.timestamp.toISOString(),
      })),
      pagination: {
        page,
        pageSize: effectivePageSize,
        total,
        totalPages: Math.ceil(total / effectivePageSize),
      },
    };
  }

  /**
   * Get current audit log settings
   */
  async getSettings(): Promise<AuditLogSettings> {
    return this.getCategorySettings();
  }

  /**
   * Update audit log settings
   *
   * Invalidates the settings cache immediately.
   */
  async updateSettings(
    settings: Partial<Omit<AuditLogSettings, 'id' | 'updatedAt'>>
  ): Promise<AuditLogSettings> {
    const updated = await db.auditLogSettings.upsert({
      where: { id: 'default' },
      update: settings,
      create: { id: 'default', ...settings },
    });

    // Invalidate cache immediately
    this.settingsCache = null;
    this.settingsCacheTime = 0;

    return updated;
  }

  /**
   * Export audit logs (with row limit)
   *
   * Used by GET /api/admin/audit-logs/export
   */
  async export(params: AuditLogQueryParams & { limit?: number }) {
    const { limit = 1000, ...queryParams } = params;

    // Override pageSize with limit for export
    const result = await this.query({
      ...queryParams,
      page: 1,
      pageSize: Math.min(limit, 1000), // Hard limit of 1000 rows
    });

    return result.data;
  }

  /**
   * Cleanup old audit log entries
   *
   * Called by /api/cron/cleanup-audit-logs
   * Respects AUDIT_LOG_MAX_ENTRIES and AUDIT_LOG_RETENTION_DAYS
   */
  async cleanup(): Promise<{ deleted: number }> {
    // Guard against invalid environment variable values
    const maxEntries = Math.max(1000, parseInt(process.env.AUDIT_LOG_MAX_ENTRIES || '50000'));
    const retentionDays = Math.max(1, parseInt(process.env.AUDIT_LOG_RETENTION_DAYS || '30'));

    let totalDeleted = 0;

    // Delete entries older than retention period
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - retentionDays);

    const deletedByAge = await db.auditLog.deleteMany({
      where: {
        timestamp: { lt: cutoffDate },
      },
    });
    totalDeleted += deletedByAge.count;

    // Delete oldest entries if count exceeds max
    const currentCount = await db.auditLog.count();
    if (currentCount > maxEntries) {
      const toDelete = currentCount - maxEntries;

      // Find IDs of oldest entries to delete
      const oldestEntries = await db.auditLog.findMany({
        orderBy: { timestamp: 'asc' },
        take: toDelete,
        select: { id: true },
      });

      const deletedByCount = await db.auditLog.deleteMany({
        where: {
          id: { in: oldestEntries.map((e) => e.id) },
        },
      });
      totalDeleted += deletedByCount.count;
    }

    console.log(`[AuditService] Cleanup complete: ${totalDeleted} entries deleted`);

    return { deleted: totalDeleted };
  }

  /**
   * Invalidate settings cache (for testing or manual refresh)
   */
  invalidateCache(): void {
    this.settingsCache = null;
    this.settingsCacheTime = 0;
  }
}

// Export singleton instance
export const auditService = new AuditService();
