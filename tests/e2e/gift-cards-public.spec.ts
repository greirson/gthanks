/**
 * E2E tests for Gift Cards on Public List Views
 * Tests both share token and vanity URL access patterns
 */

import { test, expect } from '@playwright/test';
import { createAndLoginUser } from './helpers/auth.helper';
import { createList as createListHelper } from './helpers/list.helper';
import { cleanupTestDb } from './helpers/db';
import { db } from '@/lib/db';
import { createId } from '@paralleldrive/cuid2';

test.describe('Gift Cards - Public List Views', () => {
  test.beforeEach(async () => {
    await cleanupTestDb();
  });

  test('share token page displays gift cards with personalized heading', async ({ page }) => {
    // Create user and list with gift cards
    const uniqueEmail = `owner-${createId()}@test.com`;
    await createAndLoginUser(page, { email: uniqueEmail, name: 'Alice Smith' });
    const listId = await createListHelper(page, 'Birthday Wishlist', 'My birthday wishes');

    // Navigate to list detail and add 3 gift cards
    await page.goto(`/lists/${listId}`);

    const giftCards = [
      { name: 'Amazon', url: 'https://www.amazon.com/gift-cards', amount: '25' },
      { name: 'Target', url: 'https://www.target.com/gift-cards', amount: '50' },
      { name: 'Best Buy', url: 'https://www.bestbuy.com/gift-cards', amount: '100' },
    ];

    // Add gift cards using the Manage Gift Cards dialog
    for (const card of giftCards) {
      await page.getByRole('button', { name: /manage gift cards/i }).first().click();
      await page.getByLabel('Name *').fill(card.name);
      await page.getByLabel('URL *').fill(card.url);
      if (card.amount) {
        await page.getByLabel('Amount (optional)').fill(card.amount);
      }
      await page.getByRole('button', { name: /add gift card/i }).click();
    }

    // Click Done/Close button to close the dialog
    await page.getByRole('button', { name: /done|close/i }).click();

    // Get the share token
    const list = await db.list.findUnique({
      where: { id: listId },
      select: { shareToken: true },
    });

    expect(list?.shareToken).toBeTruthy();

    // Logout and visit the public share page
    await page.context().clearCookies();
    await page.goto(`/share/${list!.shareToken}`);

    // Verify gift cards section appears with personalized heading
    await expect(page.getByText(/Alice Smith's Favorite Stores/i)).toBeVisible();

    // Verify info tooltip exists
    await expect(page.locator('button[aria-label*="About"]')).toBeVisible();

    // Verify all 3 gift cards are displayed
    for (const card of giftCards) {
      await expect(page.getByText(card.name)).toBeVisible();
    }

    // Verify gift cards section appears ABOVE wish list
    const giftCardSection = page.locator('text=Favorite Stores').first();
    const wishSection = page.locator('h2, h3').filter({ hasText: /wish|filter/i }).first();

    const giftCardBox = await giftCardSection.boundingBox();
    const wishBox = await wishSection.boundingBox();

    if (giftCardBox && wishBox) {
      expect(giftCardBox.y).toBeLessThan(wishBox.y);
    }
  });

  test('vanity URL page displays gift cards', async ({ page }) => {
    // Create user with username
    const timestamp = Date.now();
    const userId = createId();

    await db.user.create({
      data: {
        id: userId,
        email: `user-${timestamp}@test.com`,
        name: 'Bob Johnson',
        username: `bobtest${timestamp}`,
        emailVerified: new Date(),
        isOnboardingComplete: true,
      },
    });

    await db.userEmail.create({
      data: {
        userId,
        email: `user-${timestamp}@test.com`,
        isPrimary: true,
        isVerified: true,
        verifiedAt: new Date(),
      },
    });

    // Create list with slug and gift cards
    const listId = createId();
    const slug = `birthday-list-${timestamp}`;

    const giftCards = [
      { name: 'Walmart', url: 'https://www.walmart.com/gift-cards' },
      { name: 'Starbucks', url: 'https://www.starbucks.com/gift' },
      { name: 'iTunes', url: 'https://www.apple.com/gift-card' },
      { name: 'GameStop', url: 'https://www.gamestop.com/gift-cards' },
    ];

    await db.list.create({
      data: {
        id: listId,
        name: 'Birthday Wishlist',
        description: 'My birthday wishes',
        slug,
        visibility: 'public',
        ownerId: userId,
        giftCardPreferences: JSON.stringify(giftCards),
      },
    });

    // Visit vanity URL as anonymous user
    await page.goto(`/bobtest${timestamp}/${slug}`);

    // Verify gift cards section appears
    await expect(page.getByText(/Bob Johnson's Favorite Stores/i)).toBeVisible();

    // Verify all 4 gift cards are displayed
    for (const card of giftCards) {
      await expect(page.getByText(card.name)).toBeVisible();
    }

    // Verify info tooltip exists
    await expect(page.locator('button[aria-label*="About"]')).toBeVisible();
  });

  test('collapsible section starts expanded and can be toggled', async ({ page }) => {
    // Create user and list
    const uniqueEmail = `owner-${createId()}@test.com`;
    await createAndLoginUser(page, { email: uniqueEmail, name: 'Charlie Brown' });
    const listId = await createListHelper(page, 'Test List', 'Test description');

    // Navigate and add one gift card
    await page.goto(`/lists/${listId}`);
    await page.getByRole('button', { name: /manage gift cards/i }).first().click();
    await page.getByLabel('Name *').fill('Amazon');
    await page.getByLabel('URL *').fill('https://www.amazon.com/gift-cards');
    await page.getByRole('button', { name: /add gift card/i }).click();
    await page.getByRole('button', { name: /done|close/i }).click();

    // Get share token and visit public page
    const list = await db.list.findUnique({
      where: { id: listId },
      select: { shareToken: true },
    });

    await page.context().clearCookies();
    await page.goto(`/share/${list!.shareToken}`);

    // Section should start expanded (defaultOpen={true})
    const giftCardContent = page.locator('text=Amazon').first();
    await expect(giftCardContent).toBeVisible();

    // Click header to collapse
    const header = page.getByText(/Charlie Brown's Favorite Stores/i);
    await header.click();

    // Content should be hidden
    await expect(giftCardContent).not.toBeVisible();

    // Click to expand again
    await header.click();

    // Content should be visible again
    await expect(giftCardContent).toBeVisible();
  });

  test('public users cannot edit gift cards', async ({ page }) => {
    // Create user and list with gift cards
    const uniqueEmail = `owner-${createId()}@test.com`;
    await createAndLoginUser(page, { email: uniqueEmail, name: 'Diana Prince' });
    const listId = await createListHelper(page, 'Gift List', 'Test list');

    await page.goto(`/lists/${listId}`);
    await page.getByRole('button', { name: /manage gift cards/i }).first().click();
    await page.getByLabel('Name *').fill('Target');
    await page.getByLabel('URL *').fill('https://www.target.com/gift-cards');
    await page.getByRole('button', { name: /add gift card/i }).click();
    await page.getByRole('button', { name: /done|close/i }).click();

    // Get share token and visit as anonymous user
    const list = await db.list.findUnique({
      where: { id: listId },
      select: { shareToken: true },
    });

    await page.context().clearCookies();
    await page.goto(`/share/${list!.shareToken}`);

    // Verify "Manage Gift Cards" button is NOT visible
    await expect(page.getByRole('button', { name: /manage gift cards/i })).not.toBeVisible();

    // Click on gift card - should open URL in new tab (not edit)
    const giftCard = page.getByText('Target').first();
    await expect(giftCard).toBeVisible();

    // Verify clicking goes to external URL (component uses <a> tag with target="_blank")
    const targetLink = page.locator('a[href*="target.com"]').first();
    await expect(targetLink).toHaveAttribute('target', '_blank');
    await expect(targetLink).toHaveAttribute('rel', /noopener/);
  });

  test('displays correctly on mobile viewport (iPhone SE 375px)', async ({ page }) => {
    // Set mobile viewport BEFORE creating user/list
    await page.setViewportSize({ width: 375, height: 667 });

    // Create user and list
    const uniqueEmail = `owner-${createId()}@test.com`;
    await createAndLoginUser(page, { email: uniqueEmail, name: 'Eve Martinez' });
    const listId = await createListHelper(page, 'Mobile Test List', 'Mobile test');

    await page.goto(`/lists/${listId}`);
    await page.getByRole('button', { name: /manage gift cards/i }).first().click();

    const mobileCards = [
      { name: 'Amazon', url: 'https://www.amazon.com/gift-cards' },
      { name: 'Walmart', url: 'https://www.walmart.com/gift-cards' },
    ];

    for (const card of mobileCards) {
      await page.getByLabel('Name *').fill(card.name);
      await page.getByLabel('URL *').fill(card.url);
      await page.getByRole('button', { name: /add gift card/i }).click();
    }

    await page.getByRole('button', { name: /done|close/i }).click();

    // Get share token and visit
    const list = await db.list.findUnique({
      where: { id: listId },
      select: { shareToken: true },
    });

    await page.context().clearCookies();
    await page.goto(`/share/${list!.shareToken}`);

    // Verify no horizontal overflow
    const giftCardSection = page.locator('text=Favorite Stores').locator('..').locator('..');
    const box = await giftCardSection.boundingBox();
    expect(box?.width).toBeLessThanOrEqual(375);

    // Verify entire header is tappable (minimum 44x44px touch target)
    const header = page.getByText(/Eve Martinez's Favorite Stores/i);
    const headerBox = await header.boundingBox();
    expect(headerBox?.height).toBeGreaterThanOrEqual(44);

    // Verify info tooltip works on tap
    const infoButton = page.locator('button[aria-label*="About"]');
    await infoButton.tap();

    // Tooltip should appear (text content check)
    await expect(page.getByText(/gift cards the list owner would appreciate/i)).toBeVisible();

    // Verify cards display in grid
    await expect(page.getByText('Amazon')).toBeVisible();
    await expect(page.getByText('Walmart')).toBeVisible();
  });

  test('does not render gift card section when list has no gift cards', async ({ page }) => {
    // Create user and list WITHOUT gift cards
    const uniqueEmail = `owner-${createId()}@test.com`;
    await createAndLoginUser(page, { email: uniqueEmail, name: 'Frank Castle' });
    const listId = await createListHelper(page, 'No Gift Cards List', 'Test list');

    // Add a wish to verify list displays normally
    await page.goto(`/lists/${listId}`);
    await page.getByRole('button', { name: /create wish/i }).click();
    await page.getByLabel(/what do you want/i).fill('Test Wish');
    await page.getByRole('button', { name: /create|save/i }).click();

    // Get share token and visit
    const list = await db.list.findUnique({
      where: { id: listId },
      select: { shareToken: true },
    });

    await page.context().clearCookies();
    await page.goto(`/share/${list!.shareToken}`);

    // Gift card section should NOT render
    await expect(page.getByText(/Favorite Stores/i)).not.toBeVisible();
    await expect(page.getByText(/Gift Cards/i)).not.toBeVisible();

    // Wish list should display normally
    await expect(page.getByText('Test Wish')).toBeVisible();
  });

  test('handles long owner name gracefully on mobile', async ({ page }) => {
    // Set mobile viewport
    await page.setViewportSize({ width: 375, height: 667 });

    // Create user with very long name
    const timestamp = Date.now();
    const userId = createId();
    const longName = 'Alexander Maximilian Christopher Montgomery-Wellington III';

    await db.user.create({
      data: {
        id: userId,
        email: `longname-${timestamp}@test.com`,
        name: longName,
        emailVerified: new Date(),
        isOnboardingComplete: true,
      },
    });

    await db.userEmail.create({
      data: {
        userId,
        email: `longname-${timestamp}@test.com`,
        isPrimary: true,
        isVerified: true,
        verifiedAt: new Date(),
      },
    });

    // Create list with gift cards
    const listId = createId();
    const giftCards = [
      { name: 'Amazon', url: 'https://www.amazon.com/gift-cards' },
    ];

    await db.list.create({
      data: {
        id: listId,
        name: 'Test List',
        visibility: 'public',
        ownerId: userId,
        giftCardPreferences: JSON.stringify(giftCards),
      },
    });

    // Generate share token
    const shareToken = createId();
    await db.list.update({
      where: { id: listId },
      data: { shareToken },
    });

    // Visit public page
    await page.goto(`/share/${shareToken}`);

    // Verify heading displays (with potential wrapping or truncation)
    const heading = page.getByText(new RegExp(`${longName.substring(0, 20)}`));
    await expect(heading).toBeVisible();

    // Verify no horizontal overflow
    const headerSection = heading.locator('..').locator('..');
    const box = await headerSection.boundingBox();
    expect(box?.width).toBeLessThanOrEqual(375);

    // Verify section is still functional
    await heading.click();

    // Content should collapse
    await expect(page.getByText('Amazon')).not.toBeVisible();
  });

  test('collapsible section expands and collapses smoothly', async ({ page }) => {
    // Create user and list with gift cards
    const uniqueEmail = `owner-${createId()}@test.com`;
    await createAndLoginUser(page, { email: uniqueEmail, name: 'Grace Hopper' });
    const listId = await createListHelper(page, 'Animation Test', 'Testing animations');

    await page.goto(`/lists/${listId}`);
    await page.getByRole('button', { name: /manage gift cards/i }).first().click();
    await page.getByLabel('Name *').fill('Amazon');
    await page.getByLabel('URL *').fill('https://www.amazon.com/gift-cards');
    await page.getByRole('button', { name: /add gift card/i }).click();
    await page.getByRole('button', { name: /done|close/i }).click();

    // Get share token
    const list = await db.list.findUnique({
      where: { id: listId },
      select: { shareToken: true },
    });

    await page.context().clearCookies();
    await page.goto(`/share/${list!.shareToken}`);

    // Verify chevron icon rotates on collapse/expand
    const chevronIcon = page.locator('svg').filter({ has: page.locator('path') }).first();

    // Should start without rotation (expanded state)
    const initialTransform = await chevronIcon.evaluate((el) =>
      window.getComputedStyle(el).transform
    );

    // Click to collapse
    await page.getByText(/Grace Hopper's Favorite Stores/i).click();

    // Wait for animation to complete by checking content visibility
    await expect(page.getByText('Amazon')).not.toBeVisible();

    // Chevron should have rotated (180deg transform)
    const collapsedTransform = await chevronIcon.evaluate((el) =>
      window.getComputedStyle(el).transform
    );

    // Transforms should be different (rotation applied)
    expect(collapsedTransform).not.toBe(initialTransform);
  });

  test('info tooltip displays helpful text', async ({ page }) => {
    // Create user and list
    const uniqueEmail = `owner-${createId()}@test.com`;
    await createAndLoginUser(page, { email: uniqueEmail, name: 'Helen Hunt' });
    const listId = await createListHelper(page, 'Tooltip Test', 'Testing tooltips');

    await page.goto(`/lists/${listId}`);
    await page.getByRole('button', { name: /manage gift cards/i }).first().click();
    await page.getByLabel('Name *').fill('Target');
    await page.getByLabel('URL *').fill('https://www.target.com/gift-cards');
    await page.getByRole('button', { name: /add gift card/i }).click();
    await page.getByRole('button', { name: /done|close/i }).click();

    // Get share token
    const list = await db.list.findUnique({
      where: { id: listId },
      select: { shareToken: true },
    });

    await page.context().clearCookies();
    await page.goto(`/share/${list!.shareToken}`);

    // Hover over info icon
    const infoButton = page.locator('button[aria-label*="About"]');
    await infoButton.hover();

    // Tooltip should appear with expected text
    await expect(
      page.getByText(/gift cards the list owner would appreciate/i)
    ).toBeVisible();
    await expect(
      page.getByText(/click any card to visit the store/i)
    ).toBeVisible();
  });
});
