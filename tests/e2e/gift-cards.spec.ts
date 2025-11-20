import { test, expect } from '@playwright/test';
import { createAndLoginUser } from './helpers/auth.helper';
import { createList } from './helpers/list.helper';
import { cleanupTestDb } from './helpers/db';

test.describe('Gift Cards', () => {
  test.beforeEach(async () => {
    await cleanupTestDb();
  });

  test('should add, edit, and remove gift cards', async ({ page }) => {
    // Login and create a list
    await createAndLoginUser(page, { email: 'test@example.com', name: 'Test User' });
    const listId = await createList(page, 'Test List', 'Test description');

    // Navigate to list detail
    await page.goto(`/lists/${listId}`);
    
    // Check gift cards section is visible
    await expect(page.getByText('Gift Cards')).toBeVisible();

    // Add a gift card
    await page.getByRole('button', { name: /add/i }).first().click();
    await page.getByLabel('Name *').fill('Amazon Gift Card');
    await page.getByLabel('URL *').fill('https://www.amazon.com/gift-cards');
    await page.getByLabel('Amount (optional)').fill('25');
    await page.getByRole('button', { name: /add gift card/i }).last().click();

    // Verify gift card appears
    await expect(page.getByText('Amazon Gift Card')).toBeVisible();
    await expect(page.getByText('$25')).toBeVisible();

    // Edit gift card (hover and click edit)
    const giftCard = page.locator('div:has-text("Amazon Gift Card")').first();
    await giftCard.hover();
    await giftCard.getByRole('button').first().click(); // Edit button
    
    // Update amount
    await page.getByLabel('Amount (optional)').fill('50');
    await page.getByRole('button', { name: /add gift card/i }).last().click();

    // Verify update
    await expect(page.getByText('$50')).toBeVisible();

    // Remove gift card (hover and click remove)
    await giftCard.hover();
    await giftCard.getByRole('button').last().click(); // Remove button
    await page.getByRole('button', { name: /remove/i }).last().click(); // Confirm

    // Verify gift card is removed
    await expect(page.getByText('Amazon Gift Card')).not.toBeVisible();
    await expect(page.getByText('No gift cards added yet')).toBeVisible();
  });

  test('should enforce maximum 10 gift cards limit', async ({ page }) => {
    await createAndLoginUser(page, { email: 'test@example.com', name: 'Test User' });
    const listId = await createList(page, 'Test List', 'Test description');
    await page.goto(`/lists/${listId}`);

    // Add 10 gift cards
    for (let i = 1; i <= 10; i++) {
      await page.getByRole('button', { name: /add/i }).first().click();
      await page.getByLabel('Name *').fill(`Gift Card ${i}`);
      await page.getByLabel('URL *').fill(`https://example.com/gift${i}`);
      await page.getByRole('button', { name: /add gift card/i }).last().click();
      await page.waitForTimeout(200); // Small delay to ensure save
    }

    // Verify all 10 cards are visible
    for (let i = 1; i <= 10; i++) {
      await expect(page.getByText(`Gift Card ${i}`)).toBeVisible();
    }

    // Verify Add button is disabled
    await expect(page.getByRole('button', { name: /add/i }).first()).toBeDisabled();
  });

  test('should display gift cards on mobile viewport', async ({ page }) => {
    // Set mobile viewport (iPhone SE)
    await page.setViewportSize({ width: 375, height: 667 });

    await createAndLoginUser(page, { email: 'test@example.com', name: 'Test User' });
    const listId = await createList(page, 'Test List', 'Test description');
    await page.goto(`/lists/${listId}`);

    // Add a gift card on mobile
    await page.getByRole('button', { name: /add/i }).first().click();
    await page.getByLabel('Name *').fill('Mobile Gift Card');
    await page.getByLabel('URL *').fill('https://example.com/mobile');
    await page.getByLabel('Amount (optional)').fill('15');
    await page.getByRole('button', { name: /add gift card/i }).last().click();

    // Verify gift card is visible on mobile
    await expect(page.getByText('Mobile Gift Card')).toBeVisible();
    await expect(page.getByText('$15')).toBeVisible();

    // Verify layout doesn't overflow
    const giftCardSection = page.locator('div:has(> h3:has-text("Gift Cards"))');
    const box = await giftCardSection.boundingBox();
    expect(box?.width).toBeLessThanOrEqual(375);
  });

  test('authenticated owner sees edit mode on their own list', async ({ page }) => {
    // Create user and login
    await createAndLoginUser(page, { email: 'owner@example.com', name: 'List Owner' });
    const listId = await createList(page, 'My Gift Card List', 'Test description');

    // Navigate to list detail
    await page.goto(`/lists/${listId}`);

    // Add a gift card
    await page.getByRole('button', { name: /add/i }).first().click();
    await page.getByLabel('Name *').fill('Amazon Gift Card');
    await page.getByLabel('URL *').fill('https://www.amazon.com/gift-cards');
    await page.getByLabel('Amount (optional)').fill('50');
    await page.getByRole('button', { name: /add gift card/i }).last().click();

    // Verify gift card is visible
    await expect(page.getByText('Amazon Gift Card')).toBeVisible();
    await expect(page.getByText('$50')).toBeVisible();

    // Verify owner can see Add button (edit mode)
    await expect(page.getByRole('button', { name: /add/i }).first()).toBeVisible();
    await expect(page.getByRole('button', { name: /add/i }).first()).toBeEnabled();

    // Verify owner can see edit/delete buttons on hover
    const giftCard = page.locator('div:has-text("Amazon Gift Card")').first();
    await giftCard.hover();

    // Should see action buttons in edit mode
    const editButton = giftCard.getByRole('button').first();
    const deleteButton = giftCard.getByRole('button').last();
    await expect(editButton).toBeVisible();
    await expect(deleteButton).toBeVisible();
  });

  test('other authenticated users see read-only mode', async ({ page, context }) => {
    // Create User A and login
    const userA = await createAndLoginUser(page, { email: 'owner@example.com', name: 'List Owner' });
    const listId = await createList(page, 'Public Gift Card List', 'Shared list');

    // Add a gift card as owner
    await page.goto(`/lists/${listId}`);
    await page.getByRole('button', { name: /add/i }).first().click();
    await page.getByLabel('Name *').fill('Target Gift Card');
    await page.getByLabel('URL *').fill('https://www.target.com/gift-cards');
    await page.getByLabel('Amount (optional)').fill('25');
    await page.getByRole('button', { name: /add gift card/i }).last().click();

    // Verify gift card was added
    await expect(page.getByText('Target Gift Card')).toBeVisible();

    // Make the list public by updating visibility directly in the database
    // (simpler than clicking through UI)
    const { db } = await import('@/lib/db');
    await db.list.update({
      where: { id: listId },
      data: { visibility: 'public' }
    });

    // Create User B in a new context
    await context.clearCookies();
    const userB = await createAndLoginUser(page, { email: 'viewer@example.com', name: 'Viewer User' });

    // Navigate to User A's list as User B
    await page.goto(`/lists/${listId}`);

    // Verify User B can see the gift card (read-only mode)
    await expect(page.getByText('Target Gift Card')).toBeVisible();
    await expect(page.getByText('$25')).toBeVisible();

    // Verify User B does NOT see the Add button (read-only mode)
    const addButton = page.getByRole('button', { name: /add/i }).first();
    await expect(addButton).not.toBeVisible();

    // Verify User B does NOT see edit/delete buttons on hover
    const giftCard = page.locator('div:has-text("Target Gift Card")').first();
    await giftCard.hover();

    // In read-only mode, there should be no action buttons
    const buttons = giftCard.getByRole('button');
    await expect(buttons).toHaveCount(0);
  });
});
