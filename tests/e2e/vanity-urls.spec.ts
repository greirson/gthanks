import { test, expect } from '@playwright/test';
import { db } from '@/lib/db';

test.describe('Vanity URLs E2E Tests', () => {
  let testUser: any;
  let testList: any;

  test.beforeEach(async () => {
    // Create test user with vanity URL access
    testUser = await db.user.create({
      data: {
        email: 'vanity-test@example.com',
        name: 'Vanity Test User',
        canUseVanityUrls: true,
      },
    });
  });

  test.afterEach(async () => {
    // Cleanup
    if (testList) {
      await db.list.delete({ where: { id: testList.id } }).catch(() => {});
    }
    if (testUser) {
      await db.user.delete({ where: { id: testUser.id } }).catch(() => {});
    }
  });

  test.describe('Username Setup', () => {
    test('should allow user to set username from settings page', async ({ page }) => {
      // TODO: Implement login flow and navigate to settings
      // This is a placeholder for the E2E test structure
      test.skip();
    });

    test('should show username as read-only after it is set', async ({ page }) => {
      // TODO: Implement
      test.skip();
    });

    test('should show "Username is permanent" warning', async ({ page }) => {
      // TODO: Implement
      test.skip();
    });

    test('should validate username format in real-time', async ({ page }) => {
      // TODO: Implement
      test.skip();
    });
  });

  test.describe('Public Profile Page', () => {
    test('should display public profile at /username URL', async ({ page }) => {
      // Set up user with username and public profile
      await db.user.update({
        where: { id: testUser.id },
        data: {
          username: 'vanityuser',
          usernameSetAt: new Date(),
          showPublicProfile: true,
        },
      });

      // Create public list
      testList = await db.list.create({
        data: {
          name: 'Public List',
          ownerId: testUser.id,
          visibility: 'public',
          slug: 'public-list',
        },
      });

      await page.goto('/vanityuser');
      await expect(page.locator('h1')).toContainText('Vanity Test User');
      await expect(page.locator('text=Public List')).toBeVisible();
    });

    test('should show 404 for non-existent username', async ({ page }) => {
      await page.goto('/nonexistentuser');
      await expect(page.locator('text=not found')).toBeVisible();
    });

    test('should show 404 if profile is not public', async ({ page }) => {
      await db.user.update({
        where: { id: testUser.id },
        data: {
          username: 'privateuser',
          usernameSetAt: new Date(),
          showPublicProfile: false,
        },
      });

      await page.goto('/privateuser');
      await expect(page.locator('text=not found')).toBeVisible();
    });

    test('should not show private lists on profile', async ({ page }) => {
      await db.user.update({
        where: { id: testUser.id },
        data: {
          username: 'vanityuser',
          usernameSetAt: new Date(),
          showPublicProfile: true,
        },
      });

      const publicList = await db.list.create({
        data: {
          name: 'Public List',
          ownerId: testUser.id,
          visibility: 'public',
          slug: 'public-list',
        },
      });

      const privateList = await db.list.create({
        data: {
          name: 'Private List',
          ownerId: testUser.id,
          visibility: 'private',
          slug: 'private-list',
        },
      });

      await page.goto('/vanityuser');
      await expect(page.locator('text=Public List')).toBeVisible();
      await expect(page.locator('text=Private List')).not.toBeVisible();

      await db.list.delete({ where: { id: publicList.id } });
      await db.list.delete({ where: { id: privateList.id } });
    });
  });

  test.describe('Vanity List URLs', () => {
    test('should access list via /username/slug URL', async ({ page }) => {
      await db.user.update({
        where: { id: testUser.id },
        data: {
          username: 'vanityuser',
          usernameSetAt: new Date(),
        },
      });

      testList = await db.list.create({
        data: {
          name: 'Test List',
          ownerId: testUser.id,
          visibility: 'public',
          slug: 'test-list',
        },
      });

      await page.goto('/vanityuser/test-list');
      await expect(page.locator('h1')).toContainText('Test List');
    });

    test('should show password prompt for password-protected lists', async ({ page }) => {
      await db.user.update({
        where: { id: testUser.id },
        data: {
          username: 'vanityuser',
          usernameSetAt: new Date(),
        },
      });

      testList = await db.list.create({
        data: {
          name: 'Protected List',
          ownerId: testUser.id,
          visibility: 'password',
          password: 'hashedpassword',
          slug: 'protected-list',
        },
      });

      await page.goto('/vanityuser/protected-list');
      await expect(page.locator('input[type="password"]')).toBeVisible();
    });

    test('should show 404 for hidden lists', async ({ page }) => {
      await db.user.update({
        where: { id: testUser.id },
        data: {
          username: 'vanityuser',
          usernameSetAt: new Date(),
        },
      });

      testList = await db.list.create({
        data: {
          name: 'Hidden List',
          ownerId: testUser.id,
          visibility: 'public',
          slug: 'hidden-list',
          hideFromProfile: true,
        },
      });

      await page.goto('/vanityuser/hidden-list');
      await expect(page.locator('text=not found')).toBeVisible();
    });
  });

  test.describe('List Slug Management', () => {
    test('should allow setting slug when creating list', async ({ page }) => {
      // TODO: Implement login and list creation flow
      test.skip();
    });

    test('should auto-slugify list name', async ({ page }) => {
      // TODO: Implement
      test.skip();
    });

    test('should show vanity URL preview', async ({ page }) => {
      // TODO: Implement
      test.skip();
    });
  });

  test.describe('Share Dialog', () => {
    test('should show both token and vanity URLs', async ({ page }) => {
      // TODO: Implement
      test.skip();
    });

    test('should allow copying both URL types', async ({ page }) => {
      // TODO: Implement
      test.skip();
    });
  });

  test.describe('Admin Controls', () => {
    test('should allow admin to toggle vanity URL access', async ({ page }) => {
      // TODO: Implement admin login and user management flow
      test.skip();
    });

    test('should allow admin to override username', async ({ page }) => {
      // TODO: Implement
      test.skip();
    });
  });
});
