/**
 * Audit Event Creation E2E Tests
 *
 * Verifies that audit events are created when users perform actions in gthanks.
 * These tests check the end-to-end integration of the audit logging system.
 *
 * Tests:
 * 1. Login creates auth.login_success audit log
 * 2. Creating wish creates content.wish_created audit log
 * 3. Deleting wish creates content.wish_deleted audit log
 * 4. Admin suspending user creates admin.user_suspended audit log
 * 5. Changing audit settings creates admin.settings_changed audit log
 */

import { test, expect } from '@playwright/test';
import {
  createAndLoginUser,
  cleanupTestData,
  createWish,
  goToWishes,
  waitForPageLoad,
  type TestUser,
} from '../helpers';
import {
  clearAuditLogs,
  waitForAuditLog,
  resetAuditLogSettings,
} from '../../helpers/audit-log.helper';
import { AuditActions } from '@/lib/schemas/audit-log';
import { db } from '@/lib/db';

test.describe('Audit Event Creation', () => {
  // Run tests serially within each browser project to avoid race conditions
  // Note: Tests across different browser projects (Chromium, Firefox, WebKit)
  // still run in parallel and share the same database, so we use actorId filtering
  // in waitForAuditLog() for test isolation
  test.describe.configure({ mode: 'serial' });

  // Reset audit log settings before each test
  // Note: We don't clear audit logs because:
  // 1. Tests filter by actorId for isolation
  // 2. Clearing could affect parallel browser tests
  test.beforeEach(async () => {
    await resetAuditLogSettings();
  });

  /**
   * Test 1: Login creates auth.login_success audit log
   *
   * SKIPPED: This test cannot be implemented as an E2E test because:
   * 1. The LOGIN_SUCCESS audit log is created in NextAuth's events.signIn callback
   * 2. This callback is only triggered by actual OAuth or magic link sign-in
   * 3. The createAndLoginUser helper bypasses NextAuth and sets session cookies directly
   * 4. Testing actual auth flows would require email delivery (magic links) or OAuth mocking
   *
   * The login audit functionality IS covered by:
   * - Unit tests in src/lib/auth.ts that verify events.signIn creates audit logs
   * - Manual testing during development
   *
   * When a user logs in, an audit log entry should be created with:
   * - action: login_success
   * - category: auth
   * - actorId: the user's ID
   */
  test.skip('login creates auth.login_success audit log', async ({ page }) => {
    // This test is skipped because createAndLoginUser bypasses the NextAuth
    // sign-in flow which triggers the LOGIN_SUCCESS audit log creation.
    // See the test description above for full explanation.
    //
    // The audit log creation IS implemented in src/lib/auth.ts events.signIn callback.
    // To verify it works, either:
    // 1. Run unit/integration tests that mock the auth callback
    // 2. Manually test with real OAuth/magic link sign-in
    let testUser: TestUser | undefined;

    try {
      testUser = await createAndLoginUser(page, {
        email: `audit-login-${Date.now()}@test.com`,
        name: 'Audit Login Test User',
      });

      await page.goto('/wishes');
      await waitForPageLoad(page);

      const auditLog = await waitForAuditLog(AuditActions.LOGIN_SUCCESS, 5000);
      expect(auditLog, 'Login success audit log should be created').toBeTruthy();
    } finally {
      if (testUser) {
        await cleanupTestData([testUser.id]);
      }
    }
  });

  /**
   * Test 2: Creating wish creates content.wish_created audit log
   *
   * When a user creates a wish via the API, an audit log entry should be created with:
   * - action: wish_created
   * - category: content
   * - resourceType: wish
   * - resourceId: the wish's ID
   */
  test('creating wish creates content.wish_created audit log', async ({ page }) => {
    let testUser: TestUser | undefined;
    let wishId: string | undefined;

    try {
      // Create and login a test user
      testUser = await createAndLoginUser(page, {
        email: `audit-wish-create-${Date.now()}@test.com`,
        name: 'Audit Wish Create Test User',
      });

      // Navigate to wishes page
      await goToWishes(page);
      await waitForPageLoad(page);

      // Create a wish via API (simulating form submission)
      const response = await page.request.post('/api/wishes', {
        data: {
          title: 'Audit Test Wish',
          price: 99.99,
          wishLevel: 2,
          notes: 'Created for audit logging test',
        },
      });

      expect(response.ok()).toBeTruthy();
      const wishData = await response.json();
      wishId = wishData.id;

      // Wait for the audit log to be created (fire-and-forget pattern)
      // Pass actorId for test isolation when running in parallel with other browsers
      const auditLog = await waitForAuditLog(AuditActions.WISH_CREATED, 5000, testUser.id);

      // Verify the audit log was created
      expect(auditLog, 'Wish created audit log should be created').toBeTruthy();
      if (auditLog) {
        expect(auditLog.category).toBe('content');
        expect(auditLog.action).toBe(AuditActions.WISH_CREATED);
        expect(auditLog.resourceType).toBe('wish');
        expect(auditLog.resourceId).toBe(wishId);
        expect(auditLog.actorId).toBe(testUser.id);
      }

      console.log('Audit log created for wish creation:', auditLog?.action);
    } finally {
      // Clean up the wish and user
      if (wishId) {
        await db.wish.deleteMany({ where: { id: wishId } });
      }
      if (testUser) {
        await cleanupTestData([testUser.id]);
      }
    }
  });

  /**
   * Test 3: Deleting wish creates content.wish_deleted audit log
   *
   * When a user deletes a wish via the API, an audit log entry should be created with:
   * - action: wish_deleted
   * - category: content
   * - resourceType: wish
   * - resourceId: the wish's ID
   */
  test('deleting wish creates content.wish_deleted audit log', async ({ page }) => {
    let testUser: TestUser | undefined;
    let wishId: string | undefined;

    try {
      // Create and login a test user
      testUser = await createAndLoginUser(page, {
        email: `audit-wish-delete-${Date.now()}@test.com`,
        name: 'Audit Wish Delete Test User',
      });

      // Create a wish to delete (using database helper for setup)
      const wish = await createWish(testUser.id, {
        title: 'Wish to be deleted',
        price: 50.0,
        wishLevel: 1,
      });
      wishId = wish.id;

      // Note: Don't call clearAuditLogs() here - it interferes with parallel browser tests
      // We use actorId filtering in waitForAuditLog() for test isolation instead

      // Navigate to wishes page
      await goToWishes(page);
      await waitForPageLoad(page);

      // Delete the wish via API
      const response = await page.request.delete(`/api/wishes/${wishId}`);
      expect(response.ok()).toBeTruthy();

      // Wait for the audit log to be created (fire-and-forget pattern)
      // Pass actorId for test isolation when running in parallel with other browsers
      // Use longer timeout as fire-and-forget can take a moment
      const auditLog = await waitForAuditLog(AuditActions.WISH_DELETED, 10000, testUser.id);

      // Verify the audit log was created
      expect(auditLog, 'Wish deleted audit log should be created').toBeTruthy();
      if (auditLog) {
        expect(auditLog.category).toBe('content');
        expect(auditLog.action).toBe(AuditActions.WISH_DELETED);
        expect(auditLog.resourceType).toBe('wish');
        expect(auditLog.resourceId).toBe(wishId);
        expect(auditLog.actorId).toBe(testUser.id);
      }

      console.log('Audit log created for wish deletion:', auditLog?.action);

      // Mark as deleted so cleanup doesn't try to delete again
      wishId = undefined;
    } finally {
      // Clean up
      if (wishId) {
        await db.wish.deleteMany({ where: { id: wishId } });
      }
      if (testUser) {
        await cleanupTestData([testUser.id]);
      }
    }
  });

  /**
   * Test 4: Admin suspending user creates admin.user_suspended audit log
   *
   * When an admin suspends a user via the API, an audit log entry should be created with:
   * - action: user_suspended
   * - category: admin
   * - resourceType: user
   * - resourceId: the suspended user's ID
   */
  test('admin suspending user creates admin.user_suspended audit log', async ({ page }) => {
    let adminUser: TestUser | undefined;
    let targetUser: TestUser | undefined;

    try {
      // Create an admin user
      // IMPORTANT: Both isAdmin AND role must be set - AdminService.isAdmin() checks both
      adminUser = await createAndLoginUser(page, {
        email: `audit-admin-${Date.now()}@test.com`,
        name: 'Audit Admin User',
        isAdmin: true,
        role: 'admin',
      });

      // Create a target user to suspend (don't login, just create in DB)
      const timestamp = Date.now();
      const targetUserRecord = await db.user.create({
        data: {
          email: `audit-target-${timestamp}@test.com`,
          name: 'Target User to Suspend',
          emailVerified: new Date(),
          isOnboardingComplete: true,
          isAdmin: false,
        },
      });

      // Create UserEmail record for target user
      await db.userEmail.create({
        data: {
          userId: targetUserRecord.id,
          email: targetUserRecord.email,
          isPrimary: true,
          isVerified: true,
          verifiedAt: new Date(),
        },
      });

      targetUser = {
        id: targetUserRecord.id,
        email: targetUserRecord.email,
        name: targetUserRecord.name || '',
        isAdmin: false,
      };

      // Navigate to admin page to ensure session is valid
      await page.goto('/admin/users');
      await waitForPageLoad(page);

      // Suspend the user via API
      const response = await page.request.post(`/api/admin/users/${targetUser.id}/suspend`, {
        data: {
          reason: 'E2E test suspension',
        },
      });

      expect(response.ok()).toBeTruthy();

      // Wait for the audit log to be created (fire-and-forget pattern)
      // Pass actorId for test isolation when running in parallel with other browsers
      const auditLog = await waitForAuditLog(AuditActions.USER_SUSPENDED, 5000, adminUser.id);

      // Verify the audit log was created
      expect(auditLog, 'User suspended audit log should be created').toBeTruthy();
      if (auditLog) {
        expect(auditLog.category).toBe('admin');
        expect(auditLog.action).toBe(AuditActions.USER_SUSPENDED);
        expect(auditLog.resourceType).toBe('user');
        expect(auditLog.resourceId).toBe(targetUser.id);
        expect(auditLog.actorId).toBe(adminUser.id);
      }

      console.log('Audit log created for user suspension:', auditLog?.action);
    } finally {
      // Clean up
      const userIds: string[] = [];
      if (adminUser) userIds.push(adminUser.id);
      if (targetUser) userIds.push(targetUser.id);
      if (userIds.length > 0) {
        await cleanupTestData(userIds);
      }
    }
  });

  /**
   * Test 5: Changing audit settings creates admin.settings_changed audit log
   *
   * When an admin changes audit log settings via the API, an audit log entry should be created with:
   * - action: settings_changed
   * - category: admin
   */
  test('changing audit settings creates admin.settings_changed audit log', async ({ page }) => {
    let adminUser: TestUser | undefined;

    try {
      // Create an admin user
      // IMPORTANT: Both isAdmin AND role must be set - AdminService.isAdmin() checks both
      adminUser = await createAndLoginUser(page, {
        email: `audit-settings-${Date.now()}@test.com`,
        name: 'Audit Settings Admin User',
        isAdmin: true,
        role: 'admin',
      });

      // Navigate to admin audit logs page
      await page.goto('/admin/audit-logs');
      await waitForPageLoad(page);

      // Change audit settings via API
      const response = await page.request.patch('/api/admin/audit-logs/settings', {
        data: {
          contentEnabled: false, // Toggle content logging off
        },
      });

      expect(response.ok()).toBeTruthy();

      // Wait for the audit log to be created (fire-and-forget pattern)
      // Pass actorId for test isolation when running in parallel with other browsers
      const auditLog = await waitForAuditLog(AuditActions.SETTINGS_CHANGED, 5000, adminUser.id);

      // Verify the audit log was created
      expect(auditLog, 'Settings changed audit log should be created').toBeTruthy();
      if (auditLog) {
        expect(auditLog.category).toBe('admin');
        expect(auditLog.action).toBe(AuditActions.SETTINGS_CHANGED);
        expect(auditLog.actorId).toBe(adminUser.id);
        // Check details contain the changed settings
        if (auditLog.details) {
          const details = JSON.parse(auditLog.details);
          expect(details).toHaveProperty('changes');
        }
      }

      console.log('Audit log created for settings change:', auditLog?.action);

      // Reset settings back to defaults
      await resetAuditLogSettings();
    } finally {
      if (adminUser) {
        await cleanupTestData([adminUser.id]);
      }
    }
  });
});
