/**
 * E2E Tests for My Reservations Page
 *
 * Tests comprehensive reservation management features including:
 * - Grouping by owner
 * - Mark as purchased (item moves to bottom)
 * - Bulk cancel (removes multiple)
 * - Filter by owner, date, purchase status
 * - Search by title
 * - Grid/list view toggle persistence
 * - Virtual scrolling with 100+ items
 * - Empty state educational message
 * - Purchased items don't show checkbox
 * - localStorage fallback when disabled
 */

import { test, expect } from '@playwright/test';
import { createId } from '@paralleldrive/cuid2';
import { db } from '@/lib/db';
import { loginWithMagicLink, seedReservation } from './helpers/reservation.helper';
import { cleanupTestData } from './helpers/database.helper';
import { generateUniqueEmail } from './helpers/email.helper';

test.describe('My Reservations Page', () => {
  // Cleanup after each test
  test.afterEach(async () => {
    await cleanupTestData();
  });

  test.describe('Grouping and Organization', () => {
    test('groups reservations by owner', async ({ page }) => {
      const userEmail = generateUniqueEmail('reserver');

      // Create reservations from two different owners
      const owner1Email = `owner1-${Date.now()}@test.com`;
      const owner2Email = `owner2-${Date.now()}@test.com`;

      // Create owner 1 with wish
      const owner1Id = createId();
      await db.user.create({
        data: {
          id: owner1Id,
          email: owner1Email,
          name: 'Alice Owner',
          emailVerified: new Date(),
          isOnboardingComplete: true,
        },
      });

      await db.userEmail.create({
        data: {
          userId: owner1Id,
          email: owner1Email,
          isPrimary: true,
          isVerified: true,
          verifiedAt: new Date(),
        },
      });

      // Create owner 2 with wish
      const owner2Id = createId();
      await db.user.create({
        data: {
          id: owner2Id,
          email: owner2Email,
          name: 'Bob Owner',
          emailVerified: new Date(),
          isOnboardingComplete: true,
        },
      });

      await db.userEmail.create({
        data: {
          userId: owner2Id,
          email: owner2Email,
          isPrimary: true,
          isVerified: true,
          verifiedAt: new Date(),
        },
      });

      // Create wishes for each owner
      const wish1 = await db.wish.create({
        data: {
          id: createId(),
          title: 'Alice\'s Item',
          ownerId: owner1Id,
          wishLevel: 2,
        },
      });

      const wish2 = await db.wish.create({
        data: {
          id: createId(),
          title: 'Bob\'s Item',
          ownerId: owner2Id,
          wishLevel: 2,
        },
      });

      // Create reserver
      const reserverId = createId();
      await db.user.create({
        data: {
          id: reserverId,
          email: userEmail,
          name: 'Reserver',
          emailVerified: new Date(),
          isOnboardingComplete: true,
        },
      });

      await db.userEmail.create({
        data: {
          userId: reserverId,
          email: userEmail,
          isPrimary: true,
          isVerified: true,
          verifiedAt: new Date(),
        },
      });

      // Create reservations
      await db.reservation.create({
        data: {
          id: createId(),
          wishId: wish1.id,
          userId: reserverId,
        },
      });

      await db.reservation.create({
        data: {
          id: createId(),
          wishId: wish2.id,
          userId: reserverId,
        },
      });

      // Login and navigate
      await loginWithMagicLink(page, userEmail);
      await page.goto('/reservations');
      await page.waitForLoadState('networkidle');

      // Verify both owners' items are visible
      await expect(page.getByText('Alice\'s Item')).toBeVisible({ timeout: 10000 });
      await expect(page.getByText('Bob\'s Item')).toBeVisible({ timeout: 10000 });

      // Verify owner names appear as breadcrumbs
      await expect(page.getByText('Alice Owner')).toBeVisible();
      await expect(page.getByText('Bob Owner')).toBeVisible();
    });

    test('purchased items move to bottom of owner group', async ({ page }) => {
      const userEmail = generateUniqueEmail('reserver');
      const ownerId = createId();
      const reserverId = createId();

      // Create owner
      await db.user.create({
        data: {
          id: ownerId,
          email: `owner-${Date.now()}@test.com`,
          name: 'List Owner',
          emailVerified: new Date(),
          isOnboardingComplete: true,
        },
      });

      await db.userEmail.create({
        data: {
          userId: ownerId,
          email: `owner-${Date.now()}@test.com`,
          isPrimary: true,
          isVerified: true,
          verifiedAt: new Date(),
        },
      });

      // Create reserver
      await db.user.create({
        data: {
          id: reserverId,
          email: userEmail,
          name: 'Reserver',
          emailVerified: new Date(),
          isOnboardingComplete: true,
        },
      });

      await db.userEmail.create({
        data: {
          userId: reserverId,
          email: userEmail,
          isPrimary: true,
          isVerified: true,
          verifiedAt: new Date(),
        },
      });

      // Create 3 wishes
      const wish1 = await db.wish.create({
        data: {
          id: createId(),
          title: 'Active Item 1',
          ownerId,
          wishLevel: 2,
        },
      });

      const wish2 = await db.wish.create({
        data: {
          id: createId(),
          title: 'To Be Purchased',
          ownerId,
          wishLevel: 2,
        },
      });

      const wish3 = await db.wish.create({
        data: {
          id: createId(),
          title: 'Active Item 2',
          ownerId,
          wishLevel: 2,
        },
      });

      // Create reservations (wish2 will be marked as purchased)
      await db.reservation.create({
        data: {
          id: createId(),
          wishId: wish1.id,
          userId: reserverId,
        },
      });

      const reservation2 = await db.reservation.create({
        data: {
          id: createId(),
          wishId: wish2.id,
          userId: reserverId,
          purchasedAt: new Date(), // Already purchased
        },
      });

      await db.reservation.create({
        data: {
          id: createId(),
          wishId: wish3.id,
          userId: reserverId,
        },
      });

      // Login and navigate
      await loginWithMagicLink(page, userEmail);
      await page.goto('/reservations');
      await page.waitForLoadState('networkidle');

      // Get all item titles in order
      const itemTitles = await page.locator('h3.font-semibold').allTextContents();

      // Purchased item should be at the bottom
      const purchasedIndex = itemTitles.indexOf('To Be Purchased');
      const active1Index = itemTitles.indexOf('Active Item 1');
      const active2Index = itemTitles.indexOf('Active Item 2');

      expect(purchasedIndex).toBeGreaterThan(active1Index);
      expect(purchasedIndex).toBeGreaterThan(active2Index);

      // Verify purchased item has "Purchased" badge
      const purchasedCard = page.locator('text=To Be Purchased').locator('..').locator('..');
      await expect(purchasedCard.getByText('Purchased')).toBeVisible();

      // Verify purchased item has reduced opacity
      const cardElement = page.locator('text=To Be Purchased').locator('..').locator('..');
      await expect(cardElement).toHaveClass(/opacity-/);
    });
  });

  test.describe('Bulk Actions', () => {
    test('bulk cancel removes multiple reservations', async ({ page }) => {
      const userEmail = generateUniqueEmail('reserver');

      // Seed multiple reservations
      await seedReservation(userEmail, 'Item 1');
      await seedReservation(userEmail, 'Item 2');
      await seedReservation(userEmail, 'Item 3');

      // Login and navigate
      await loginWithMagicLink(page, userEmail);
      await page.goto('/reservations');
      await page.waitForLoadState('networkidle');

      // Enter selection mode (mobile or desktop)
      const selectionButton = page.getByRole('button', { name: /select/i }).first();
      await selectionButton.click();

      // Select first two items
      const checkboxes = page.locator('input[type="checkbox"]');
      await checkboxes.nth(0).check();
      await checkboxes.nth(1).check();

      // Verify bulk actions bar appears
      await expect(page.getByText(/2.*selected/i)).toBeVisible({ timeout: 5000 });

      // Click bulk cancel
      const bulkCancelButton = page.getByRole('button', { name: /cancel/i }).first();
      await bulkCancelButton.click();

      // Confirm in dialog
      await page.waitForTimeout(500);
      const confirmButton = page.getByRole('button', { name: /cancel.*reservation/i }).last();
      await confirmButton.click();

      // Wait for success toast
      await expect(page.getByText(/cancelled.*2/i)).toBeVisible({ timeout: 5000 });

      // Verify items are removed
      await page.waitForTimeout(1000);
      const itemCount = await page.locator('h3.font-semibold').count();
      expect(itemCount).toBe(1); // Only 1 item remaining
    });

    test('bulk mark as purchased moves items to purchased section', async ({ page }) => {
      const userEmail = generateUniqueEmail('reserver');

      // Seed multiple reservations
      await seedReservation(userEmail, 'Gift 1');
      await seedReservation(userEmail, 'Gift 2');

      // Login and navigate
      await loginWithMagicLink(page, userEmail);
      await page.goto('/reservations');
      await page.waitForLoadState('networkidle');

      // Enter selection mode
      const selectionButton = page.getByRole('button', { name: /select/i }).first();
      await selectionButton.click();

      // Select all items
      const checkboxes = page.locator('input[type="checkbox"]');
      const checkboxCount = await checkboxes.count();
      for (let i = 0; i < checkboxCount; i++) {
        await checkboxes.nth(i).check();
      }

      // Click bulk mark as purchased
      const bulkPurchaseButton = page.locator('button:has-text("Mark Purchased"), button:has-text("Purchased")').first();
      await bulkPurchaseButton.click();

      // Confirm in dialog
      await page.waitForTimeout(500);
      const confirmButton = page.getByRole('button', { name: /mark.*purchased/i }).last();
      await confirmButton.click();

      // Wait for success toast
      await expect(page.getByText(/marked.*2.*purchased/i)).toBeVisible({ timeout: 5000 });

      // Verify both items now have "Purchased" badge
      await page.waitForTimeout(1000);
      const purchasedBadges = page.getByText('Purchased');
      await expect(purchasedBadges.first()).toBeVisible();
      expect(await purchasedBadges.count()).toBeGreaterThanOrEqual(2);
    });
  });

  test.describe('Filtering', () => {
    test('filter by owner shows only that owner\'s items', async ({ page }) => {
      const userEmail = generateUniqueEmail('reserver');
      const reserverId = createId();

      // Create reserver
      await db.user.create({
        data: {
          id: reserverId,
          email: userEmail,
          name: 'Reserver',
          emailVerified: new Date(),
          isOnboardingComplete: true,
        },
      });

      await db.userEmail.create({
        data: {
          userId: reserverId,
          email: userEmail,
          isPrimary: true,
          isVerified: true,
          verifiedAt: new Date(),
        },
      });

      // Create two owners
      const owner1Id = createId();
      const owner1Email = `alice-${Date.now()}@test.com`;
      await db.user.create({
        data: {
          id: owner1Id,
          email: owner1Email,
          name: 'Alice',
          emailVerified: new Date(),
          isOnboardingComplete: true,
        },
      });

      await db.userEmail.create({
        data: {
          userId: owner1Id,
          email: owner1Email,
          isPrimary: true,
          isVerified: true,
          verifiedAt: new Date(),
        },
      });

      const owner2Id = createId();
      const owner2Email = `bob-${Date.now()}@test.com`;
      await db.user.create({
        data: {
          id: owner2Id,
          email: owner2Email,
          name: 'Bob',
          emailVerified: new Date(),
          isOnboardingComplete: true,
        },
      });

      await db.userEmail.create({
        data: {
          userId: owner2Id,
          email: owner2Email,
          isPrimary: true,
          isVerified: true,
          verifiedAt: new Date(),
        },
      });

      // Create wishes and reservations
      const wish1 = await db.wish.create({
        data: {
          id: createId(),
          title: 'Alice Item',
          ownerId: owner1Id,
          wishLevel: 2,
        },
      });

      const wish2 = await db.wish.create({
        data: {
          id: createId(),
          title: 'Bob Item',
          ownerId: owner2Id,
          wishLevel: 2,
        },
      });

      await db.reservation.create({
        data: {
          id: createId(),
          wishId: wish1.id,
          userId: reserverId,
        },
      });

      await db.reservation.create({
        data: {
          id: createId(),
          wishId: wish2.id,
          userId: reserverId,
        },
      });

      // Login and navigate
      await loginWithMagicLink(page, userEmail);
      await page.goto('/reservations');
      await page.waitForLoadState('networkidle');

      // Open filters (mobile or desktop)
      const filterButton = page.getByRole('button', { name: /filter/i }).first();
      await filterButton.click();

      // Wait for filter panel
      await page.waitForTimeout(500);

      // Select Alice as owner filter
      const aliceOption = page.getByText('Alice').first();
      await aliceOption.click();

      // Close filter panel
      const closeButton = page.getByRole('button', { name: /close/i }).first();
      if (await closeButton.isVisible()) {
        await closeButton.click();
      }

      // Verify only Alice's item is visible
      await page.waitForTimeout(1000);
      await expect(page.getByText('Alice Item')).toBeVisible();
      await expect(page.getByText('Bob Item')).not.toBeVisible();
    });

    test('search filters by wish title', async ({ page }) => {
      const userEmail = generateUniqueEmail('reserver');

      // Seed reservations with different titles
      await seedReservation(userEmail, 'Red Bicycle');
      await seedReservation(userEmail, 'Blue Headphones');

      // Login and navigate
      await loginWithMagicLink(page, userEmail);
      await page.goto('/reservations');
      await page.waitForLoadState('networkidle');

      // Open filters
      const filterButton = page.getByRole('button', { name: /filter/i }).first();
      await filterButton.click();

      // Wait for filter panel
      await page.waitForTimeout(500);

      // Enter search query
      const searchInput = page.locator('input[type="search"], input[placeholder*="Search"]').first();
      await searchInput.fill('bicycle');

      // Close filter panel if needed
      const closeButton = page.locator('button:has-text("Close"), button:has(svg)').first();
      if (await closeButton.isVisible()) {
        await closeButton.click();
      }

      // Verify only matching item is visible
      await page.waitForTimeout(1000);
      await expect(page.getByText('Red Bicycle')).toBeVisible();
      await expect(page.getByText('Blue Headphones')).not.toBeVisible();
    });

    test('filter by purchase status shows only purchased items', async ({ page }) => {
      const userEmail = generateUniqueEmail('reserver');
      const reserverId = createId();

      // Create reserver
      await db.user.create({
        data: {
          id: reserverId,
          email: userEmail,
          name: 'Reserver',
          emailVerified: new Date(),
          isOnboardingComplete: true,
        },
      });

      await db.userEmail.create({
        data: {
          userId: reserverId,
          email: userEmail,
          isPrimary: true,
          isVerified: true,
          verifiedAt: new Date(),
        },
      });

      // Create owner
      const ownerId = createId();
      await db.user.create({
        data: {
          id: ownerId,
          email: `owner-${Date.now()}@test.com`,
          name: 'Owner',
          emailVerified: new Date(),
          isOnboardingComplete: true,
        },
      });

      // Create wishes
      const wish1 = await db.wish.create({
        data: {
          id: createId(),
          title: 'Active Item',
          ownerId,
          wishLevel: 2,
        },
      });

      const wish2 = await db.wish.create({
        data: {
          id: createId(),
          title: 'Purchased Item',
          ownerId,
          wishLevel: 2,
        },
      });

      // Create reservations
      await db.reservation.create({
        data: {
          id: createId(),
          wishId: wish1.id,
          userId: reserverId,
        },
      });

      await db.reservation.create({
        data: {
          id: createId(),
          wishId: wish2.id,
          userId: reserverId,
          purchasedAt: new Date(),
        },
      });

      // Login and navigate
      await loginWithMagicLink(page, userEmail);
      await page.goto('/reservations');
      await page.waitForLoadState('networkidle');

      // Open filters
      const filterButton = page.getByRole('button', { name: /filter/i }).first();
      await filterButton.click();

      // Select "Purchased" filter
      await page.waitForTimeout(500);
      const purchasedFilter = page.getByText('Purchased only').or(page.getByText('Purchased')).first();
      await purchasedFilter.click();

      // Close filter panel
      const closeButton = page.locator('button:has-text("Close")').first();
      if (await closeButton.isVisible()) {
        await closeButton.click();
      }

      // Verify only purchased item is visible
      await page.waitForTimeout(1000);
      await expect(page.getByText('Purchased Item')).toBeVisible();
      await expect(page.getByText('Active Item')).not.toBeVisible();
    });
  });

  test.describe('View Modes', () => {
    test('toggle between grid and list view', async ({ page }) => {
      const userEmail = generateUniqueEmail('reserver');

      // Seed a reservation
      await seedReservation(userEmail, 'Test Item');

      // Login and navigate
      await loginWithMagicLink(page, userEmail);
      await page.goto('/reservations');
      await page.waitForLoadState('networkidle');

      // Find view toggle buttons
      const gridButton = page.getByRole('button', { name: /grid/i }).or(page.locator('[aria-label*="grid" i]')).first();
      const listButton = page.getByRole('button', { name: /list/i }).or(page.locator('[aria-label*="list" i]')).first();

      // Default should be grid view
      const cardContainer = page.locator('.grid, [class*="grid-cols"]').first();
      await expect(cardContainer).toBeVisible();

      // Switch to list view
      await listButton.click();
      await page.waitForTimeout(500);

      // Verify list view is active (different layout)
      const listContainer = page.locator('[class*="flex-col"]').first();
      await expect(listContainer).toBeVisible();

      // Switch back to grid
      await gridButton.click();
      await page.waitForTimeout(500);

      // Verify grid view is restored
      await expect(cardContainer).toBeVisible();
    });

    test('view preference persists across sessions', async ({ page, context }) => {
      const userEmail = generateUniqueEmail('reserver');

      // Seed a reservation
      await seedReservation(userEmail, 'Test Item');

      // Login and navigate
      await loginWithMagicLink(page, userEmail);
      await page.goto('/reservations');
      await page.waitForLoadState('networkidle');

      // Switch to list view
      const listButton = page.getByRole('button', { name: /list/i }).or(page.locator('[aria-label*="list" i]')).first();
      await listButton.click();
      await page.waitForTimeout(500);

      // Refresh the page
      await page.reload();
      await page.waitForLoadState('networkidle');

      // Verify list view is still active
      const listContainer = page.locator('[class*="flex-col"]').first();
      await expect(listContainer).toBeVisible();
    });
  });

  test.describe('Virtual Scrolling', () => {
    test('virtual scrolling activates with 100+ items', async ({ page }) => {
      const userEmail = generateUniqueEmail('reserver');
      const reserverId = createId();

      // Create reserver
      await db.user.create({
        data: {
          id: reserverId,
          email: userEmail,
          name: 'Reserver',
          emailVerified: new Date(),
          isOnboardingComplete: true,
        },
      });

      await db.userEmail.create({
        data: {
          userId: reserverId,
          email: userEmail,
          isPrimary: true,
          isVerified: true,
          verifiedAt: new Date(),
        },
      });

      // Create owner
      const ownerId = createId();
      await db.user.create({
        data: {
          id: ownerId,
          email: `owner-${Date.now()}@test.com`,
          name: 'List Owner',
          emailVerified: new Date(),
          isOnboardingComplete: true,
        },
      });

      // Create 100 wishes and reservations
      const wishes = [];
      for (let i = 1; i <= 100; i++) {
        const wish = await db.wish.create({
          data: {
            id: createId(),
            title: `Item ${i}`,
            ownerId,
            wishLevel: 2,
          },
        });
        wishes.push(wish);
      }

      // Create reservations
      for (const wish of wishes) {
        await db.reservation.create({
          data: {
            id: createId(),
            wishId: wish.id,
            userId: reserverId,
          },
        });
      }

      // Login and navigate
      await loginWithMagicLink(page, userEmail);
      await page.goto('/reservations');
      await page.waitForLoadState('networkidle');

      // Wait for items to load
      await page.waitForTimeout(2000);

      // Verify virtual scroll container exists
      const virtualContainer = page.locator('[style*="position: relative"]').first();
      await expect(virtualContainer).toBeVisible();

      // Scroll down to trigger virtual scrolling
      await page.mouse.wheel(0, 1000);
      await page.waitForTimeout(1000);

      // Verify not all items are rendered in DOM (only visible ones)
      const renderedCards = page.locator('h3.font-semibold');
      const renderedCount = await renderedCards.count();

      // With virtual scrolling, rendered count should be less than total
      expect(renderedCount).toBeLessThan(100);
      expect(renderedCount).toBeGreaterThan(0);

      // Verify we can scroll and see different items
      await page.mouse.wheel(0, 2000);
      await page.waitForTimeout(1000);

      // Check that later items are visible
      await expect(page.getByText(/Item (5[0-9]|6[0-9]|7[0-9]|8[0-9]|9[0-9]|100)/)).toBeVisible();
    });
  });

  test.describe('Empty States', () => {
    test('shows educational empty state when no reservations', async ({ page }) => {
      const userEmail = generateUniqueEmail('newuser');

      // Create user with no reservations
      const userId = createId();
      await db.user.create({
        data: {
          id: userId,
          email: userEmail,
          name: 'New User',
          emailVerified: new Date(),
          isOnboardingComplete: true,
        },
      });

      await db.userEmail.create({
        data: {
          userId,
          email: userEmail,
          isPrimary: true,
          isVerified: true,
          verifiedAt: new Date(),
        },
      });

      // Login and navigate
      await loginWithMagicLink(page, userEmail);
      await page.goto('/reservations');
      await page.waitForLoadState('networkidle');

      // Verify empty state message
      await expect(page.getByText(/no reservations/i)).toBeVisible({ timeout: 10000 });
      await expect(page.getByText(/browse.*list/i)).toBeVisible();
    });
  });

  test.describe('Purchased Items UI', () => {
    test('purchased items don\'t show checkbox', async ({ page }) => {
      const userEmail = generateUniqueEmail('reserver');
      const reserverId = createId();

      // Create reserver
      await db.user.create({
        data: {
          id: reserverId,
          email: userEmail,
          name: 'Reserver',
          emailVerified: new Date(),
          isOnboardingComplete: true,
        },
      });

      await db.userEmail.create({
        data: {
          userId: reserverId,
          email: userEmail,
          isPrimary: true,
          isVerified: true,
          verifiedAt: new Date(),
        },
      });

      // Create owner
      const ownerId = createId();
      await db.user.create({
        data: {
          id: ownerId,
          email: `owner-${Date.now()}@test.com`,
          name: 'Owner',
          emailVerified: new Date(),
          isOnboardingComplete: true,
        },
      });

      // Create wishes
      const activeWish = await db.wish.create({
        data: {
          id: createId(),
          title: 'Active Item',
          ownerId,
          wishLevel: 2,
        },
      });

      const purchasedWish = await db.wish.create({
        data: {
          id: createId(),
          title: 'Purchased Item',
          ownerId,
          wishLevel: 2,
        },
      });

      // Create reservations
      await db.reservation.create({
        data: {
          id: createId(),
          wishId: activeWish.id,
          userId: reserverId,
        },
      });

      await db.reservation.create({
        data: {
          id: createId(),
          wishId: purchasedWish.id,
          userId: reserverId,
          purchasedAt: new Date(),
        },
      });

      // Login and navigate
      await loginWithMagicLink(page, userEmail);
      await page.goto('/reservations');
      await page.waitForLoadState('networkidle');

      // Enter selection mode
      const selectionButton = page.getByRole('button', { name: /select/i }).first();
      await selectionButton.click();

      // Count checkboxes - should only show for active items
      const checkboxes = page.locator('input[type="checkbox"]');
      const checkboxCount = await checkboxes.count();

      // Should be 1 checkbox (only for active item)
      expect(checkboxCount).toBe(1);

      // Verify the active item card has a checkbox
      const activeCard = page.locator('text=Active Item').locator('..').locator('..');
      await expect(activeCard.locator('input[type="checkbox"]')).toBeVisible();

      // Verify the purchased item card does NOT have a checkbox
      const purchasedCard = page.locator('text=Purchased Item').locator('..').locator('..');
      await expect(purchasedCard.locator('input[type="checkbox"]')).not.toBeVisible();
    });

    test('purchased items show mark-purchased button is hidden', async ({ page }) => {
      const userEmail = generateUniqueEmail('reserver');
      const reserverId = createId();

      // Create reserver
      await db.user.create({
        data: {
          id: reserverId,
          email: userEmail,
          name: 'Reserver',
          emailVerified: new Date(),
          isOnboardingComplete: true,
        },
      });

      await db.userEmail.create({
        data: {
          userId: reserverId,
          email: userEmail,
          isPrimary: true,
          isVerified: true,
          verifiedAt: new Date(),
        },
      });

      // Create owner
      const ownerId = createId();
      await db.user.create({
        data: {
          id: ownerId,
          email: `owner-${Date.now()}@test.com`,
          name: 'Owner',
          emailVerified: new Date(),
          isOnboardingComplete: true,
        },
      });

      // Create purchased wish
      const purchasedWish = await db.wish.create({
        data: {
          id: createId(),
          title: 'Already Purchased',
          ownerId,
          wishLevel: 2,
        },
      });

      // Create purchased reservation
      await db.reservation.create({
        data: {
          id: createId(),
          wishId: purchasedWish.id,
          userId: reserverId,
          purchasedAt: new Date(),
        },
      });

      // Login and navigate
      await loginWithMagicLink(page, userEmail);
      await page.goto('/reservations');
      await page.waitForLoadState('networkidle');

      // Find the purchased item card
      const purchasedCard = page.locator('text=Already Purchased').locator('..').locator('..');

      // Verify "Purchased" badge is visible
      await expect(purchasedCard.getByText('Purchased')).toBeVisible();

      // Verify mark-as-purchased button is NOT visible
      const markPurchasedButton = purchasedCard.getByRole('button', { name: /mark.*purchased/i });
      await expect(markPurchasedButton).not.toBeVisible();

      // Verify cancel button IS still visible
      const cancelButton = purchasedCard.getByRole('button', { name: /cancel/i });
      await expect(cancelButton).toBeVisible();
    });
  });

  test.describe('LocalStorage Fallback', () => {
    test('view preference works when localStorage is disabled', async ({ page, context }) => {
      const userEmail = generateUniqueEmail('reserver');

      // Seed a reservation
      await seedReservation(userEmail, 'Test Item');

      // Block localStorage access
      await context.addInitScript(() => {
        Object.defineProperty(window, 'localStorage', {
          value: {
            getItem: () => {
              throw new Error('localStorage disabled');
            },
            setItem: () => {
              throw new Error('localStorage disabled');
            },
            removeItem: () => {
              throw new Error('localStorage disabled');
            },
            clear: () => {
              throw new Error('localStorage disabled');
            },
          },
          writable: false,
        });
      });

      // Login and navigate
      await loginWithMagicLink(page, userEmail);
      await page.goto('/reservations');
      await page.waitForLoadState('networkidle');

      // Should still render with default view (grid)
      await expect(page.getByText('Test Item')).toBeVisible({ timeout: 10000 });

      // View toggle should still work (in-memory state)
      const listButton = page.getByRole('button', { name: /list/i }).or(page.locator('[aria-label*="list" i]')).first();
      await listButton.click();
      await page.waitForTimeout(500);

      // Should switch to list view
      const listContainer = page.locator('[class*="flex-col"]').first();
      await expect(listContainer).toBeVisible();
    });
  });
});
