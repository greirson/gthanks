/**
 * Sample E2E test demonstrating the use of test helpers
 * This file serves as an example and reference for writing E2E tests
 */

import { test, expect } from '@playwright/test';
import {
  createAndLoginUser,
  createWish,
  createList,
  addWishToList,
  goToWishes,
  goToLists,
  waitForToast,
  cleanupTestData,
} from './helpers';

// Setup: Clean up test data after each test
test.afterEach(async () => {
  // Note: In a real test suite, you'd want to track created user IDs
  // and clean them up individually. For now, this is a placeholder.
  // await cleanupTestData([userId]);
});

test.describe('Wish Management', () => {
  test('user can create a new wish', async ({ page }) => {
    // 1. Create and login a test user
    const user = await createAndLoginUser(page, {
      email: `test-${Date.now()}@example.com`,
      name: 'Test User',
    });

    // 2. Navigate to wishes page
    await goToWishes(page);

    // 3. Click "Create Wish" button
    await page.click('text=Create Wish');

    // 4. Fill out the wish form
    await page.fill('[name="title"]', 'Wireless Headphones');
    await page.fill('[name="url"]', 'https://example.com/headphones');
    await page.fill('[name="price"]', '199.99');

    // 5. Set wish level (priority)
    await page.click('[data-testid="wish-level-3"]');

    // 6. Submit the form
    await page.click('button[type="submit"]');

    // 7. Wait for success toast
    await waitForToast(page, 'Wish created successfully');

    // 8. Verify the wish appears in the list
    await expect(page.locator('text=Wireless Headphones')).toBeVisible();

    // Cleanup
    await cleanupTestData([user.id]);
  });

  test('user can view wish details', async ({ page }) => {
    // 1. Setup: Create user and wish
    const user = await createAndLoginUser(page, {
      email: `test-${Date.now()}@example.com`,
      name: 'Test User',
    });

    const wish = await createWish(user.id, {
      title: 'Programming Book',
      url: 'https://example.com/book',
      price: 39.99,
      wishLevel: 2,
    });

    // 2. Navigate to wishes page
    await goToWishes(page);

    // 3. Click on the wish to view details
    await page.click(`text=${wish.title}`);

    // 4. Verify wish details are displayed
    await expect(page.locator('text=Programming Book')).toBeVisible();
    await expect(page.locator('text=$39.99')).toBeVisible();

    // Cleanup
    await cleanupTestData([user.id]);
  });
});

test.describe('List Management', () => {
  test('user can create a list and add wishes', async ({ page }) => {
    // 1. Create and login user
    const user = await createAndLoginUser(page, {
      email: `test-${Date.now()}@example.com`,
      name: 'Test User',
    });

    // 2. Create some wishes first
    const wish1 = await createWish(user.id, {
      title: 'Wireless Mouse',
      price: 49.99,
      wishLevel: 2,
    });

    const wish2 = await createWish(user.id, {
      title: 'Mechanical Keyboard',
      price: 129.99,
      wishLevel: 3,
    });

    // 3. Navigate to lists page
    await goToLists(page);

    // 4. Create a new list
    await page.click('text=Create List');
    await page.fill('[name="name"]', 'Birthday Wishlist');
    await page.fill('[name="description"]', 'Things I want for my birthday');
    await page.click('button[type="submit"]');

    // 5. Wait for success toast
    await waitForToast(page, 'List created successfully');

    // 6. Verify list appears
    await expect(page.locator('text=Birthday Wishlist')).toBeVisible();

    // Cleanup
    await cleanupTestData([user.id]);
  });

  test('user can add wishes to a list', async ({ page }) => {
    // 1. Setup: Create user, wishes, and list
    const user = await createAndLoginUser(page, {
      email: `test-${Date.now()}@example.com`,
      name: 'Test User',
    });

    const wish = await createWish(user.id, {
      title: 'Coffee Maker',
      price: 89.99,
      wishLevel: 2,
    });

    const list = await createList(user.id, {
      name: 'Kitchen Essentials',
      description: 'Things for my kitchen',
    });

    // 2. Navigate to wishes page
    await goToWishes(page);

    // 3. Find the wish and click "Add to List"
    await page.click(`[data-wish-id="${wish.id}"] button:has-text("Add to List")`);

    // 4. Select the list from dropdown
    await page.click(`text=${list.name}`);

    // 5. Wait for success toast
    await waitForToast(page, 'Added to list');

    // 6. Navigate to the list and verify wish is there
    await goToLists(page);
    await page.click(`text=${list.name}`);
    await expect(page.locator('text=Coffee Maker')).toBeVisible();

    // Cleanup
    await cleanupTestData([user.id]);
  });
});

test.describe('Authentication Flow', () => {
  test('new user can sign up and complete onboarding', async ({ page }) => {
    const email = `newuser-${Date.now()}@example.com`;

    // 1. Navigate to login page
    await page.goto('/auth/login');

    // 2. Enter email for magic link
    await page.fill('[name="email"]', email);
    await page.click('button[type="submit"]');

    // 3. Wait for verification request page
    await expect(page.locator('text=Check your email')).toBeVisible();

    // Note: In a real test, you'd need to:
    // - Mock the email service
    // - Extract the magic link from the email
    // - Navigate to the magic link
    // For now, we'll create the user directly
    const user = await createAndLoginUser(page, {
      email,
      name: 'New User',
    });

    // 4. Navigate to home and verify user is logged in
    await page.goto('/');
    await expect(page.locator('text=New User')).toBeVisible();

    // Cleanup
    await cleanupTestData([user.id]);
  });
});

test.describe('Responsive Design', () => {
  test('mobile: user can navigate between pages', async ({ page }) => {
    // 1. Set mobile viewport
    await page.setViewportSize({ width: 375, height: 667 });

    // 2. Create and login user
    const user = await createAndLoginUser(page, {
      email: `mobile-${Date.now()}@example.com`,
      name: 'Mobile User',
    });

    // 3. Navigate to wishes page
    await goToWishes(page);

    // 4. Open mobile menu
    await page.click('[data-testid="mobile-menu-button"]');

    // 5. Navigate to lists via mobile menu
    await page.click('text=Lists');

    // 6. Verify we're on the lists page
    await expect(page).toHaveURL(/\/lists/);

    // Cleanup
    await cleanupTestData([user.id]);
  });
});
