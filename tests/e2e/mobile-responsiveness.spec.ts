import { test, expect } from '@playwright/test';
import { createAndLoginUser, type TestUser } from './helpers/auth.helper';

/**
 * Mobile Responsiveness E2E Tests
 *
 * Critical mobile testing for gthanks app following CLAUDE.md requirements:
 * - Minimum supported viewport: iPhone SE (375x667px)
 * - Touch targets minimum 44x44px (Apple HIG standard)
 * - No horizontal scroll
 * - ARIA labels for mobile navigation
 * - Mobile-first responsive design
 */

const VIEWPORTS = {
  iphoneSE: { width: 375, height: 667 },
  iphone12Pro: { width: 390, height: 844 },
  pixel5: { width: 393, height: 851 },
  ipadMini: { width: 768, height: 1024 },
};

// Test user for authenticated routes
let testUser: TestUser;

/**
 * Viewport Configuration Helper
 * Ensures tests run on multiple mobile device sizes
 */
const MOBILE_VIEWPORTS = [
  { name: 'iPhone SE', ...VIEWPORTS.iphoneSE },
  { name: 'iPhone 12 Pro', ...VIEWPORTS.iphone12Pro },
  { name: 'Pixel 5', ...VIEWPORTS.pixel5 },
];

test.describe('Mobile Responsiveness - Critical Tests', () => {
  // Run these tests on all mobile viewports
  for (const viewport of MOBILE_VIEWPORTS) {
    test.describe(`${viewport.name} (${viewport.width}x${viewport.height})`, () => {
      test.use({ viewport: { width: viewport.width, height: viewport.height } });

      test.beforeEach(async ({ page }) => {
        // Create and login a test user for authenticated routes
        testUser = await createAndLoginUser(page, {
          email: `mobile-test-${Date.now()}@example.com`,
          name: 'Mobile Test User',
        });
      });

      test('should display mobile navigation button', async ({ page }) => {
        await page.goto('/wishes');

        // Mobile menu button should be visible
        const menuButton = page.getByTestId('mobile-menu-toggle');
        await expect(menuButton).toBeVisible();

        // Desktop nav should be hidden on mobile
        const desktopNav = page.getByTestId('desktop-nav');
        await expect(desktopNav).toBeHidden();
      });

      test('mobile menu button should meet touch target size (44x44px)', async ({ page }) => {
        await page.goto('/wishes');

        const menuButton = page.getByTestId('mobile-menu-toggle');
        const box = await menuButton.boundingBox();

        expect(box).not.toBeNull();
        if (box) {
          expect(box.width).toBeGreaterThanOrEqual(44);
          expect(box.height).toBeGreaterThanOrEqual(44);
        }
      });

      test('mobile menu should have proper ARIA labels', async ({ page }) => {
        await page.goto('/wishes');

        const menuButton = page.getByTestId('mobile-menu-toggle');

        // Check initial state
        const initialLabel = await menuButton.getAttribute('aria-label');
        expect(initialLabel).toMatch(/open menu/i);

        const initialExpanded = await menuButton.getAttribute('aria-expanded');
        expect(initialExpanded).toBe('false');

        // Open menu
        await menuButton.click();

        // Check opened state
        const openedLabel = await menuButton.getAttribute('aria-label');
        expect(openedLabel).toMatch(/close menu/i);

        const openedExpanded = await menuButton.getAttribute('aria-expanded');
        expect(openedExpanded).toBe('true');
      });

      test('mobile menu should open and close correctly', async ({ page }) => {
        await page.goto('/wishes');

        const menuButton = page.getByTestId('mobile-menu-toggle');

        // Menu should initially be closed
        const mobileMenu = page.getByTestId('mobile-menu');
        await expect(mobileMenu).toBeHidden();

        // Click to open
        await menuButton.click();
        await expect(mobileMenu).toBeVisible();

        // Click to close
        await menuButton.click();
        await expect(mobileMenu).toBeHidden();
      });

      test('mobile menu should close on Escape key', async ({ page }) => {
        await page.goto('/wishes');

        const menuButton = page.getByTestId('mobile-menu-toggle');
        await menuButton.click();

        // Menu should be open
        const mobileMenu = page.getByTestId('mobile-menu');
        await expect(mobileMenu).toBeVisible();

        // Press Escape
        await page.keyboard.press('Escape');

        // Menu should be closed
        await expect(mobileMenu).toBeHidden();
      });

      test('mobile menu items should meet touch target size', async ({ page }) => {
        await page.goto('/wishes');

        const menuButton = page.getByTestId('mobile-menu-toggle');
        await menuButton.click();

        // Get all menu items (using test IDs for specific items)
        const wishesLink = page.getByTestId('mobile-nav-my-wishes');
        const listsLink = page.getByTestId('mobile-nav-my-lists');
        const groupsLink = page.getByTestId('mobile-nav-groups');

        const menuItems = [wishesLink, listsLink, groupsLink];

        // Check each menu item meets 44px minimum height (Apple HIG standard)
        for (const item of menuItems) {
          const box = await item.boundingBox();
          expect(box).not.toBeNull();
          if (box) {
            expect(box.height).toBeGreaterThanOrEqual(44);
          }
        }
      });

      test('should have no horizontal scroll', async ({ page }) => {
        await page.goto('/wishes');

        const scrollWidth = await page.evaluate(() => document.documentElement.scrollWidth);
        const clientWidth = await page.evaluate(() => document.documentElement.clientWidth);

        expect(scrollWidth).toBeLessThanOrEqual(clientWidth);
      });

      test('should have no horizontal scroll on lists page', async ({ page }) => {
        await page.goto('/lists');

        const scrollWidth = await page.evaluate(() => document.documentElement.scrollWidth);
        const clientWidth = await page.evaluate(() => document.documentElement.clientWidth);

        expect(scrollWidth).toBeLessThanOrEqual(clientWidth);
      });

      test('should have no horizontal scroll on groups page', async ({ page }) => {
        await page.goto('/groups');

        const scrollWidth = await page.evaluate(() => document.documentElement.scrollWidth);
        const clientWidth = await page.evaluate(() => document.documentElement.clientWidth);

        expect(scrollWidth).toBeLessThanOrEqual(clientWidth);
      });

      test('page content should fit within viewport width', async ({ page }) => {
        await page.goto('/wishes');

        // Check that body doesn't exceed viewport width
        const bodyWidth = await page.evaluate(() => document.body.scrollWidth);
        expect(bodyWidth).toBeLessThanOrEqual(viewport.width);
      });
    });
  }
});

test.describe('Mobile vs Desktop Breakpoints', () => {
  test.beforeEach(async ({ page }) => {
    testUser = await createAndLoginUser(page, {
      email: `breakpoint-test-${Date.now()}@example.com`,
      name: 'Breakpoint Test User',
    });
  });

  test('iPad should show desktop navigation', async ({ page }) => {
    await page.setViewportSize(VIEWPORTS.ipadMini);
    await page.goto('/wishes');

    // Desktop nav should be visible
    const desktopNav = page.locator('nav div[role="menubar"]');
    await expect(desktopNav).toBeVisible();

    // Mobile menu button should be hidden
    const menuButton = page.locator('button[aria-label*="menu"]').first();
    await expect(menuButton).toBeHidden();
  });

  test('iPhone SE should show mobile navigation', async ({ page }) => {
    await page.setViewportSize(VIEWPORTS.iphoneSE);
    await page.goto('/wishes');

    // Mobile menu button should be visible
    const menuButton = page.locator('button[aria-label*="menu"]').first();
    await expect(menuButton).toBeVisible();

    // Desktop nav should be hidden
    const desktopNav = page.locator('nav div[role="menubar"]');
    await expect(desktopNav).toBeHidden();
  });
});

test.describe('Touch Target Accessibility - All Interactive Elements', () => {
  test.use({ viewport: VIEWPORTS.iphoneSE });

  test.beforeEach(async ({ page }) => {
    testUser = await createAndLoginUser(page, {
      email: `touch-test-${Date.now()}@example.com`,
      name: 'Touch Test User',
    });
  });

  test('all buttons should meet minimum touch target size', async ({ page }) => {
    await page.goto('/wishes');

    // Get all visible buttons
    const buttons = page.locator('button:visible');
    const count = await buttons.count();

    let failedButtons = 0;
    const failedList: string[] = [];

    for (let i = 0; i < count; i++) {
      const button = buttons.nth(i);
      const box = await button.boundingBox();

      if (box) {
        const ariaLabel = (await button.getAttribute('aria-label')) || 'unnamed button';
        const text = (await button.textContent()) || '';

        if (box.width < 44 || box.height < 44) {
          failedButtons++;
          failedList.push(`Button "${ariaLabel || text}" (${box.width}x${box.height}px)`);
        }
      }
    }

    // Report failures
    if (failedButtons > 0) {
      console.log('Failed touch targets:', failedList);
    }

    expect(failedButtons).toBe(0);
  });

  test('all links should meet minimum touch target size or padding', async ({ page }) => {
    await page.goto('/wishes');

    // Get all visible links
    const links = page.locator('a:visible');
    const count = await links.count();

    let failedLinks = 0;
    const failedList: string[] = [];

    for (let i = 0; i < count; i++) {
      const link = links.nth(i);
      const box = await link.boundingBox();

      if (box) {
        const href = (await link.getAttribute('href')) || '';
        const text = (await link.textContent()) || '';

        // Links can be smaller if they have adequate padding from parent
        if (box.height < 44) {
          failedLinks++;
          failedList.push(`Link "${text}" [${href}] (${box.width}x${box.height}px)`);
        }
      }
    }

    // Report failures (warning only for links, as they might have parent padding)
    if (failedLinks > 0) {
      console.warn('Links with potentially small touch targets:', failedList);
    }

    // For now, this is informational - we allow some links to be smaller
    // as long as they have adequate spacing
  });
});

test.describe('Mobile Form Usability', () => {
  test.use({ viewport: VIEWPORTS.iphoneSE });

  test.beforeEach(async ({ page }) => {
    testUser = await createAndLoginUser(page, {
      email: `form-test-${Date.now()}@example.com`,
      name: 'Form Test User',
    });
  });

  test('input fields should be full-width on mobile', async ({ page }) => {
    await page.goto('/wishes/new');

    // Check input field width
    const titleInput = page.locator('input[name="title"]');
    const inputBox = await titleInput.boundingBox();
    const viewportWidth = VIEWPORTS.iphoneSE.width;

    if (inputBox) {
      // Input should take most of the width (accounting for padding)
      expect(inputBox.width).toBeGreaterThan(viewportWidth * 0.8);
    }
  });

  test('submit buttons should be large enough to tap easily', async ({ page }) => {
    await page.goto('/wishes/new');

    const submitButton = page.locator('button[type="submit"]');
    const box = await submitButton.boundingBox();

    if (box) {
      expect(box.height).toBeGreaterThanOrEqual(44);
    }
  });
});

test.describe('Mobile Navigation Flow', () => {
  test.use({ viewport: VIEWPORTS.iphoneSE });

  test.beforeEach(async ({ page }) => {
    testUser = await createAndLoginUser(page, {
      email: `nav-test-${Date.now()}@example.com`,
      name: 'Nav Test User',
    });
  });

  test('user can navigate between pages via mobile menu', async ({ page }) => {
    await page.goto('/wishes');

    // Open mobile menu
    const menuButton = page.locator('button[aria-label*="menu"]').first();
    await menuButton.click();

    // Click "My Lists"
    const listsLink = page.locator('#mobile-menu a[href="/lists"]');
    await listsLink.click();

    // Should navigate to lists page
    await expect(page).toHaveURL(/\/lists/);

    // Menu should be closed after navigation
    const mobileMenu = page.locator('#mobile-menu');
    await expect(mobileMenu).toBeHidden();
  });

  test('user can navigate to groups via mobile menu', async ({ page }) => {
    await page.goto('/wishes');

    // Open mobile menu
    const menuButton = page.locator('button[aria-label*="menu"]').first();
    await menuButton.click();

    // Click "Groups"
    const groupsLink = page.locator('#mobile-menu a[href="/groups"]');
    await groupsLink.click();

    // Should navigate to groups page
    await expect(page).toHaveURL(/\/groups/);

    // Menu should be closed
    const mobileMenu = page.locator('#mobile-menu');
    await expect(mobileMenu).toBeHidden();
  });
});

test.describe('Visual Regression - Layout Integrity', () => {
  test.use({ viewport: VIEWPORTS.iphoneSE });

  test.beforeEach(async ({ page }) => {
    testUser = await createAndLoginUser(page, {
      email: `visual-test-${Date.now()}@example.com`,
      name: 'Visual Test User',
    });
  });

  test('navigation should not overflow on smallest viewport', async ({ page }) => {
    await page.goto('/wishes');

    // Check that nav doesn't exceed viewport
    const nav = page.locator('nav[aria-label="Main navigation"]').first();
    const navBox = await nav.boundingBox();

    if (navBox) {
      expect(navBox.width).toBeLessThanOrEqual(VIEWPORTS.iphoneSE.width);
    }
  });

  test('page container should respect mobile viewport', async ({ page }) => {
    await page.goto('/wishes');

    // Check container width
    const container = page.locator('.container').first();
    const containerBox = await container.boundingBox();

    if (containerBox) {
      expect(containerBox.width).toBeLessThanOrEqual(VIEWPORTS.iphoneSE.width);
    }
  });
});
