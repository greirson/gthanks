/**
 * E2E Tests for Magic Link Reservation Flow
 *
 * Tests the complete reservation flow for both authenticated and unauthenticated users:
 * 1. New user: reserve → magic link → dashboard
 * 2. Logged in user: instant reservation
 * 3. Cancel reservation with undo functionality
 */

import { test, expect } from '@playwright/test';
import { cleanupTestData } from '../helpers/database.helper';
import {
  loginWithMagicLink,
  seedReservation,
  createPublicListWithWishes,
  getMagicLink,
} from '../helpers/reservation.helper';
import { logout } from '../helpers/auth.helper';
import { generateUniqueEmail } from '../helpers/email.helper';

test.describe('Magic Link Reservation Flow', () => {
  // Cleanup after each test
  test.afterEach(async () => {
    await cleanupTestData();
  });

  test('new user: reserve → magic link → dashboard', async ({ page }) => {
    // Setup: Create a public list with wishes
    const { list, wishes } = await createPublicListWithWishes(generateUniqueEmail('owner'), [
      'Red Bike',
    ]);
    const targetWish = wishes[0];

    // 1. Visit public list (not logged in)
    await page.goto(`/lists/${list.id}`);
    await page.waitForLoadState('networkidle');

    // Verify we can see the wish
    await expect(page.getByText(targetWish.title)).toBeVisible({
      timeout: 10000,
    });

    // 2. Click reserve button
    const reserveButton = page
      .locator(`[data-testid="reserve-${targetWish.id}"], button:has-text("Reserve")`)
      .first();

    await expect(reserveButton).toBeVisible({
      timeout: 10000,
    });

    await reserveButton.click();

    // 3. Should show auth dialog (not redirect)
    await expect(page.locator('[role="dialog"]')).toBeVisible({
      timeout: 5000,
    });

    // Look for sign-in related text
    const authDialog = page.locator('[role="dialog"]');
    await expect(authDialog.getByText(/sign in|log in|email/i).first()).toBeVisible();

    // 4. Enter email for magic link
    const testEmail = generateUniqueEmail('test');
    const emailInput = page.locator('[type="email"]').first();
    await emailInput.fill(testEmail);

    // Click the send/submit button
    const sendButton = page
      .locator('button:has-text("Send"), button:has-text("Continue"), button[type="submit"]')
      .first();
    await sendButton.click();

    // 5. Should show "Check your email" confirmation
    // This might be in a toast, dialog, or page content
    await expect(
      page.getByText(/check your email|sent.*link|login link sent/i).first()
    ).toBeVisible({
      timeout: 10000,
    });

    // 6. Simulate magic link click
    const magicLink = await getMagicLink(testEmail);
    await page.goto(magicLink);
    await page.waitForLoadState('networkidle');

    // 7. Should be logged in and redirected to /reservations
    await expect(page).toHaveURL(/\/reservations/, {
      timeout: 10000,
    });

    // 8. Should see the reserved item
    await expect(page.getByText(targetWish.title)).toBeVisible({
      timeout: 10000,
    });
  });

  test('logged in user: instant reservation', async ({ page }) => {
    // Setup: Create a public list with wishes
    const { list, wishes } = await createPublicListWithWishes(generateUniqueEmail('owner2'), [
      'Red Bike',
    ]);
    const targetWish = wishes[0];

    // Login first
    await loginWithMagicLink(page, generateUniqueEmail('user'));

    // Visit list
    await page.goto(`/lists/${list.id}`);
    await page.waitForLoadState('networkidle');

    // Verify wish is visible
    await expect(page.getByText(targetWish.title)).toBeVisible({
      timeout: 10000,
    });

    // Click reserve button
    const reserveButton = page
      .locator(`[data-testid="reserve-${targetWish.id}"], button:has-text("Reserve")`)
      .first();

    await expect(reserveButton).toBeVisible({
      timeout: 10000,
    });

    await reserveButton.click();

    // Should see success feedback immediately (toast or message)
    // The exact UI element may vary, but there should be some confirmation
    await expect(page.getByText(/reserved|success|added to.*reservation/i).first()).toBeVisible({
      timeout: 5000,
    });

    // Navigate to My Reservations
    // Try multiple possible navigation methods
    const myReservationsLink = page
      .locator('a:has-text("My Reservations"), a[href="/reservations"], a:has-text("Reservations")')
      .first();

    if ((await myReservationsLink.count()) > 0) {
      await myReservationsLink.click();
    } else {
      // Fallback: navigate directly
      await page.goto('/reservations');
    }

    await page.waitForLoadState('networkidle');

    // Should see the reserved item
    await expect(page.getByText(targetWish.title)).toBeVisible({
      timeout: 10000,
    });
  });

  test('cancel reservation with undo', async ({ page }) => {
    // Setup: Seed a reservation for a user
    const userEmail = generateUniqueEmail('reserver');
    const wishTitle = 'Red Bike';
    const { wishId } = await seedReservation(userEmail, wishTitle);

    // Login as the reserver
    await loginWithMagicLink(page, userEmail);

    // Go to My Reservations page
    await page.goto('/reservations');
    await page.waitForLoadState('networkidle');

    // Verify reservation is visible
    await expect(page.getByText(wishTitle)).toBeVisible({
      timeout: 10000,
    });

    // Click cancel button
    const cancelButton = page
      .locator(
        `[data-testid="cancel-${wishId}"], button:has-text("Cancel"), button:has-text("Remove")`
      )
      .first();

    await expect(cancelButton).toBeVisible({
      timeout: 10000,
    });

    await cancelButton.click();

    // Should see cancellation confirmation message
    await expect(page.getByText(/cancelled|removed|unreserved/i).first()).toBeVisible({
      timeout: 5000,
    });

    // Undo button should appear (typically in a toast)
    const undoButton = page.locator('button:has-text("Undo")').first();

    await expect(undoButton).toBeVisible({
      timeout: 5000,
    });

    // Click undo
    await undoButton.click();

    // Wait a moment for the undo to process
    await page.waitForTimeout(1000);

    // Reservation should be back - verify the wish is visible again
    await expect(page.getByText(wishTitle)).toBeVisible({
      timeout: 10000,
    });
  });

  test('unauthenticated user sees auth prompt on reserve', async ({ page }) => {
    // Setup: Create a public list with wishes
    const { list, wishes } = await createPublicListWithWishes(generateUniqueEmail('owner3'), [
      'Blue Headphones',
    ]);
    const targetWish = wishes[0];

    // Ensure we're logged out
    await logout(page);

    // Visit public list
    await page.goto(`/lists/${list.id}`);
    await page.waitForLoadState('networkidle');

    // Click reserve
    const reserveButton = page
      .locator(`[data-testid="reserve-${targetWish.id}"], button:has-text("Reserve")`)
      .first();

    await reserveButton.click();

    // Should show authentication dialog/modal
    await expect(page.locator('[role="dialog"]')).toBeVisible({
      timeout: 5000,
    });

    // Should see authentication-related content
    const authDialog = page.locator('[role="dialog"]');
    await expect(authDialog.getByText(/sign in|log in|email|continue/i).first()).toBeVisible({
      timeout: 5000,
    });
  });

  test('reservation persists across sessions', async ({ page, context }) => {
    // Setup: Create a public list with wishes
    const { list, wishes } = await createPublicListWithWishes(generateUniqueEmail('owner4'), [
      'Gaming Mouse',
    ]);
    const targetWish = wishes[0];
    const userEmail = generateUniqueEmail('persistent');

    // Login and make reservation
    await loginWithMagicLink(page, userEmail);
    await page.goto(`/lists/${list.id}`);
    await page.waitForLoadState('networkidle');

    const reserveButton = page
      .locator(`[data-testid="reserve-${targetWish.id}"], button:has-text("Reserve")`)
      .first();
    await reserveButton.click();

    // Wait for reservation to complete
    await page.waitForTimeout(2000);

    // Clear cookies (logout)
    await context.clearCookies();

    // Login again
    await loginWithMagicLink(page, userEmail);

    // Navigate to reservations
    await page.goto('/reservations');
    await page.waitForLoadState('networkidle');

    // Reservation should still be there
    await expect(page.getByText(targetWish.title)).toBeVisible({
      timeout: 10000,
    });
  });
});
