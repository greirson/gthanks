/**
 * Audit Log Test Helpers
 *
 * Shared utilities for integration and E2E tests of the audit logging feature.
 * Used by both Jest (integration) and Playwright (E2E) tests.
 */

import { db } from '@/lib/db';
import { createId } from '@paralleldrive/cuid2';
import type { AuditCategory, AuditActorType } from '@/lib/schemas/audit-log';
import type { Page } from '@playwright/test';

// =============================================================================
// Types
// =============================================================================

export interface SeedAuditLogOptions {
  category?: AuditCategory;
  action?: string;
  actorId?: string;
  actorName?: string;
  actorType?: AuditActorType;
  resourceType?: string;
  resourceId?: string;
  resourceName?: string;
  details?: Record<string, unknown>;
  ipAddress?: string;
  userAgent?: string;
  /** Offset in milliseconds from now (negative for past) */
  timestampOffset?: number;
}

export interface MockAuditLogEntry {
  id: string;
  timestamp: Date;
  actorId: string | null;
  actorName: string | null;
  actorType: string;
  category: string;
  action: string;
  resourceType: string | null;
  resourceId: string | null;
  resourceName: string | null;
  details: string | null;
  ipAddress: string | null;
  userAgent: string | null;
}

// =============================================================================
// Database Helpers (for Integration Tests)
// =============================================================================

/**
 * Seed audit logs with test data
 *
 * @param count - Number of audit logs to create
 * @param options - Options for customizing the seeded logs
 * @returns Array of created audit log IDs
 */
export async function seedAuditLogs(
  count: number,
  options: SeedAuditLogOptions = {}
): Promise<string[]> {
  const ids: string[] = [];
  const categories: AuditCategory[] = ['auth', 'user', 'content', 'admin'];
  const actions = {
    auth: ['login_success', 'login_failure', 'logout', 'magic_link_sent'],
    user: ['profile_update', 'email_added', 'username_changed'],
    content: ['wish_created', 'wish_updated', 'wish_deleted', 'list_created'],
    admin: ['user_suspended', 'admin_granted', 'settings_changed'],
  };

  for (let i = 0; i < count; i++) {
    const category = options.category || categories[i % categories.length];
    const categoryActions = actions[category];
    const action = options.action || categoryActions[i % categoryActions.length];

    const timestamp = new Date();
    if (options.timestampOffset) {
      timestamp.setTime(timestamp.getTime() + options.timestampOffset);
    } else {
      // Spread entries over the last hour by default
      timestamp.setTime(timestamp.getTime() - i * 60000);
    }

    const log = await db.auditLog.create({
      data: {
        id: createId(),
        timestamp,
        actorId: options.actorId ?? `test-actor-${i}`,
        actorName: options.actorName ?? `Test Actor ${i}`,
        actorType: options.actorType ?? 'user',
        category,
        action,
        resourceType: options.resourceType ?? 'test',
        resourceId: options.resourceId ?? `resource-${i}`,
        resourceName: options.resourceName ?? `Test Resource ${i}`,
        details: options.details ? JSON.stringify(options.details) : null,
        ipAddress: options.ipAddress ?? '127.0.0.1',
        userAgent: options.userAgent ?? 'Test User Agent',
      },
    });

    ids.push(log.id);
  }

  return ids;
}

/**
 * Clear all audit logs from the database
 */
export async function clearAuditLogs(): Promise<void> {
  await db.auditLog.deleteMany({});
}

/**
 * Get audit log count
 */
export async function getAuditLogCount(): Promise<number> {
  return db.auditLog.count();
}

/**
 * Find audit log by action
 *
 * @param action - The action to search for
 * @returns The most recent audit log with that action, or null
 */
export async function getAuditLogByAction(action: string) {
  return db.auditLog.findFirst({
    where: { action },
    orderBy: { timestamp: 'desc' },
  });
}

/**
 * Find audit logs by category
 *
 * @param category - The category to filter by
 * @param limit - Maximum number of logs to return
 * @returns Array of audit logs
 */
export async function getAuditLogsByCategory(category: AuditCategory, limit = 10) {
  return db.auditLog.findMany({
    where: { category },
    orderBy: { timestamp: 'desc' },
    take: limit,
  });
}

/**
 * Find audit logs by actor
 *
 * @param actorId - The actor ID to filter by
 * @param limit - Maximum number of logs to return
 * @returns Array of audit logs
 */
export async function getAuditLogsByActor(actorId: string, limit = 10) {
  return db.auditLog.findMany({
    where: { actorId },
    orderBy: { timestamp: 'desc' },
    take: limit,
  });
}

/**
 * Wait for a specific audit log to be created
 * Useful for testing fire-and-forget logging
 *
 * @param action - The action to wait for
 * @param timeout - Maximum time to wait in milliseconds
 * @param actorId - Optional actor ID to filter by (for test isolation in parallel runs)
 * @returns The audit log entry if found
 */
export async function waitForAuditLog(
  action: string,
  timeout = 5000,
  actorId?: string
): Promise<MockAuditLogEntry | null> {
  const startTime = Date.now();

  while (Date.now() - startTime < timeout) {
    const where: { action: string; actorId?: string } = { action };
    if (actorId) {
      where.actorId = actorId;
    }

    const log = await db.auditLog.findFirst({
      where,
      orderBy: { timestamp: 'desc' },
    });

    if (log) {
      return log;
    }
    // Wait 100ms before checking again
    await new Promise((resolve) => setTimeout(resolve, 100));
  }

  return null;
}

// =============================================================================
// Mock Data Helpers
// =============================================================================

/**
 * Create a mock audit log entry for testing
 * Does NOT save to database - use for unit tests or request payloads
 *
 * @param overrides - Fields to override in the mock entry
 * @returns A mock audit log entry object
 */
export function createMockAuditLogEntry(
  overrides: Partial<MockAuditLogEntry> = {}
): MockAuditLogEntry {
  return {
    id: createId(),
    timestamp: new Date(),
    actorId: 'mock-actor-id',
    actorName: 'Mock Actor',
    actorType: 'user',
    category: 'content',
    action: 'wish_created',
    resourceType: 'wish',
    resourceId: 'mock-resource-id',
    resourceName: 'Mock Resource',
    details: null,
    ipAddress: '127.0.0.1',
    userAgent: 'Mock User Agent',
    ...overrides,
  };
}

// =============================================================================
// Settings Helpers
// =============================================================================

/**
 * Reset audit log settings to defaults
 */
export async function resetAuditLogSettings(): Promise<void> {
  await db.auditLogSettings.upsert({
    where: { id: 'default' },
    update: {
      authEnabled: true,
      userManagementEnabled: true,
      contentEnabled: true,
      adminEnabled: true,
    },
    create: {
      id: 'default',
      authEnabled: true,
      userManagementEnabled: true,
      contentEnabled: true,
      adminEnabled: true,
    },
  });
}

/**
 * Disable a specific audit log category
 */
export async function disableAuditCategory(
  category: 'auth' | 'user' | 'content' | 'admin'
): Promise<void> {
  const fieldMap = {
    auth: 'authEnabled',
    user: 'userManagementEnabled',
    content: 'contentEnabled',
    admin: 'adminEnabled',
  };

  await db.auditLogSettings.upsert({
    where: { id: 'default' },
    update: { [fieldMap[category]]: false },
    create: { id: 'default', [fieldMap[category]]: false },
  });
}

/**
 * Enable a specific audit log category
 */
export async function enableAuditCategory(
  category: 'auth' | 'user' | 'content' | 'admin'
): Promise<void> {
  const fieldMap = {
    auth: 'authEnabled',
    user: 'userManagementEnabled',
    content: 'contentEnabled',
    admin: 'adminEnabled',
  };

  await db.auditLogSettings.upsert({
    where: { id: 'default' },
    update: { [fieldMap[category]]: true },
    create: { id: 'default', [fieldMap[category]]: true },
  });
}

// =============================================================================
// User Helpers
// =============================================================================

/**
 * Create a test admin user
 */
export async function createTestAdminUser(emailSuffix?: string) {
  const timestamp = Date.now();
  const suffix = emailSuffix ?? `${timestamp}-${Math.random().toString(36).substring(7)}`;

  const user = await db.user.create({
    data: {
      id: createId(),
      email: `admin-${suffix}@test.com`,
      name: 'Test Admin',
      emailVerified: new Date(),
      isOnboardingComplete: true,
      isAdmin: true,
      role: 'admin', // Required: AdminService.isAdmin() checks both isAdmin AND role
    },
  });

  // Create UserEmail record
  await db.userEmail.create({
    data: {
      userId: user.id,
      email: user.email,
      isPrimary: true,
      isVerified: true,
      verifiedAt: new Date(),
    },
  });

  return user;
}

/**
 * Create a test regular (non-admin) user
 */
export async function createTestRegularUser(emailSuffix?: string) {
  const timestamp = Date.now();
  const suffix = emailSuffix ?? `${timestamp}-${Math.random().toString(36).substring(7)}`;

  const user = await db.user.create({
    data: {
      id: createId(),
      email: `user-${suffix}@test.com`,
      name: 'Test User',
      emailVerified: new Date(),
      isOnboardingComplete: true,
      isAdmin: false,
    },
  });

  // Create UserEmail record
  await db.userEmail.create({
    data: {
      userId: user.id,
      email: user.email,
      isPrimary: true,
      isVerified: true,
      verifiedAt: new Date(),
    },
  });

  return user;
}

// =============================================================================
// E2E Test Helpers (Playwright)
// =============================================================================

/**
 * Wait for an audit log entry to appear in the UI table
 * Used in E2E tests to verify audit events are logged and displayed
 *
 * @param page - Playwright page object
 * @param action - The action string to look for in the table
 * @param timeout - Maximum time to wait in milliseconds
 */
export async function waitForAuditLogInUI(
  page: Page,
  action: string,
  timeout = 10000
): Promise<void> {
  // Wait for the table to contain the action text
  await page.waitForSelector(`[data-testid="audit-log-table"] >> text=${action}`, {
    timeout,
  });
}

/**
 * Get the count of visible audit log rows in the UI
 *
 * @param page - Playwright page object
 * @returns Number of visible rows
 */
export async function getVisibleAuditLogCount(page: Page): Promise<number> {
  const rows = await page.locator('[data-testid="audit-log-row"]').count();
  return rows;
}

/**
 * Click on an audit log row to open details
 *
 * @param page - Playwright page object
 * @param index - Row index (0-based)
 */
export async function clickAuditLogRow(page: Page, index = 0): Promise<void> {
  await page.locator('[data-testid="audit-log-row"]').nth(index).click();
}

/**
 * Filter audit logs by category in the UI
 *
 * @param page - Playwright page object
 * @param category - Category to filter by
 */
export async function filterByCategory(page: Page, category: AuditCategory): Promise<void> {
  await page.locator('[data-testid="category-filter"]').click();
  await page.locator(`[data-testid="category-option-${category}"]`).click();
}

/**
 * Search audit logs in the UI
 *
 * @param page - Playwright page object
 * @param searchTerm - Text to search for
 */
export async function searchAuditLogs(page: Page, searchTerm: string): Promise<void> {
  const searchInput = page.locator('[data-testid="audit-log-search"]');
  await searchInput.fill(searchTerm);
  // Debounce wait
  await page.waitForTimeout(500);
}

/**
 * Clear all filters in the UI
 *
 * @param page - Playwright page object
 */
export async function clearFilters(page: Page): Promise<void> {
  const clearButton = page.locator('[data-testid="clear-filters"]');
  if (await clearButton.isVisible()) {
    await clearButton.click();
  }
}

/**
 * Export audit logs from the UI
 *
 * @param page - Playwright page object
 * @param format - Export format ('csv' or 'json')
 * @returns Promise that resolves when download starts
 */
export async function exportAuditLogs(
  page: Page,
  format: 'csv' | 'json'
): Promise<ReturnType<Page['waitForEvent']>> {
  const downloadPromise = page.waitForEvent('download');
  await page.locator(`[data-testid="export-${format}"]`).click();
  return downloadPromise;
}
