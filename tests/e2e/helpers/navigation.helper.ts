/**
 * Navigation helpers for Playwright E2E tests
 * Provides utilities for page navigation and waiting for elements
 */

import { Page, Locator } from '@playwright/test';

/**
 * Base URL for the application
 * Can be overridden by PLAYWRIGHT_BASE_URL environment variable
 */
const BASE_URL = process.env.PLAYWRIGHT_BASE_URL || 'http://localhost:3000';

/**
 * Navigate to the wishes page
 *
 * @param page - Playwright page instance
 * @param waitForLoad - Wait for page to fully load (default: true)
 */
export async function goToWishes(page: Page, waitForLoad: boolean = true): Promise<void> {
  await page.goto(`${BASE_URL}/wishes`);

  if (waitForLoad) {
    await waitForPageLoad(page);
  }
}

/**
 * Navigate to the lists page
 *
 * @param page - Playwright page instance
 * @param waitForLoad - Wait for page to fully load (default: true)
 */
export async function goToLists(page: Page, waitForLoad: boolean = true): Promise<void> {
  await page.goto(`${BASE_URL}/lists`);

  if (waitForLoad) {
    await waitForPageLoad(page);
  }
}

/**
 * Navigate to a specific list detail page
 *
 * @param page - Playwright page instance
 * @param listId - ID of the list
 * @param waitForLoad - Wait for page to fully load (default: true)
 */
export async function goToListDetail(
  page: Page,
  listId: string,
  waitForLoad: boolean = true
): Promise<void> {
  await page.goto(`${BASE_URL}/lists/${listId}`);

  if (waitForLoad) {
    await waitForPageLoad(page);
  }
}

/**
 * Navigate to the groups page
 *
 * @param page - Playwright page instance
 * @param waitForLoad - Wait for page to fully load (default: true)
 */
export async function goToGroups(page: Page, waitForLoad: boolean = true): Promise<void> {
  await page.goto(`${BASE_URL}/groups`);

  if (waitForLoad) {
    await waitForPageLoad(page);
  }
}

/**
 * Navigate to a specific group detail page
 *
 * @param page - Playwright page instance
 * @param groupId - ID of the group
 * @param waitForLoad - Wait for page to fully load (default: true)
 */
export async function goToGroupDetail(
  page: Page,
  groupId: string,
  waitForLoad: boolean = true
): Promise<void> {
  await page.goto(`${BASE_URL}/groups/${groupId}`);

  if (waitForLoad) {
    await waitForPageLoad(page);
  }
}

/**
 * Navigate to the profile page
 *
 * @param page - Playwright page instance
 * @param waitForLoad - Wait for page to fully load (default: true)
 */
export async function goToProfile(page: Page, waitForLoad: boolean = true): Promise<void> {
  await page.goto(`${BASE_URL}/profile`);

  if (waitForLoad) {
    await waitForPageLoad(page);
  }
}

/**
 * Navigate to the settings page
 *
 * @param page - Playwright page instance
 * @param waitForLoad - Wait for page to fully load (default: true)
 */
export async function goToSettings(page: Page, waitForLoad: boolean = true): Promise<void> {
  await page.goto(`${BASE_URL}/settings`);

  if (waitForLoad) {
    await waitForPageLoad(page);
  }
}

/**
 * Navigate to the admin page
 *
 * @param page - Playwright page instance
 * @param waitForLoad - Wait for page to fully load (default: true)
 */
export async function goToAdmin(page: Page, waitForLoad: boolean = true): Promise<void> {
  await page.goto(`${BASE_URL}/admin`);

  if (waitForLoad) {
    await waitForPageLoad(page);
  }
}

/**
 * Navigate to the home/landing page
 *
 * @param page - Playwright page instance
 * @param waitForLoad - Wait for page to fully load (default: true)
 */
export async function goToHome(page: Page, waitForLoad: boolean = true): Promise<void> {
  await page.goto(`${BASE_URL}/`);

  if (waitForLoad) {
    await waitForPageLoad(page);
  }
}

/**
 * Navigate to the login page
 *
 * @param page - Playwright page instance
 * @param waitForLoad - Wait for page to fully load (default: true)
 */
export async function goToLogin(page: Page, waitForLoad: boolean = true): Promise<void> {
  await page.goto(`${BASE_URL}/auth/login`);

  if (waitForLoad) {
    await waitForPageLoad(page);
  }
}

/**
 * Navigate to a shared list via share token
 *
 * @param page - Playwright page instance
 * @param shareToken - Share token for the list
 * @param waitForLoad - Wait for page to fully load (default: true)
 */
export async function goToSharedList(
  page: Page,
  shareToken: string,
  waitForLoad: boolean = true
): Promise<void> {
  await page.goto(`${BASE_URL}/share/${shareToken}`);

  if (waitForLoad) {
    await waitForPageLoad(page);
  }
}

/**
 * Wait for page to fully load
 * Waits for network idle and DOM content loaded
 *
 * @param page - Playwright page instance
 * @param timeoutMs - Timeout in milliseconds (default: 30000)
 */
export async function waitForPageLoad(page: Page, timeoutMs: number = 30000): Promise<void> {
  try {
    // Wait for network to be idle (no more than 2 network connections for at least 500ms)
    await page.waitForLoadState('networkidle', { timeout: timeoutMs });
  } catch (error) {
    // If networkidle times out, at least wait for DOM content loaded
    await page.waitForLoadState('domcontentloaded', { timeout: timeoutMs });
  }
}

/**
 * Wait for a toast notification to appear
 * Useful for verifying success/error messages
 *
 * @param page - Playwright page instance
 * @param message - Optional specific message to wait for
 * @param timeoutMs - Timeout in milliseconds (default: 5000)
 * @returns The toast element
 */
export async function waitForToast(
  page: Page,
  message?: string,
  timeoutMs: number = 5000
): Promise<Locator> {
  // Wait for the toast container to appear
  // Adjust selector based on your toast library (sonner, react-hot-toast, etc.)
  const toastSelector = message
    ? `[data-sonner-toast]:has-text("${message}")`
    : '[data-sonner-toast]';

  const toast = page.locator(toastSelector).first();
  await toast.waitFor({ state: 'visible', timeout: timeoutMs });

  return toast;
}

/**
 * Wait for a specific element to appear
 *
 * @param page - Playwright page instance
 * @param selector - CSS selector or test ID
 * @param timeoutMs - Timeout in milliseconds (default: 5000)
 * @returns The located element
 */
export async function waitForElement(
  page: Page,
  selector: string,
  timeoutMs: number = 5000
): Promise<Locator> {
  const element = page.locator(selector);
  await element.waitFor({ state: 'visible', timeout: timeoutMs });
  return element;
}

/**
 * Wait for an element to disappear
 *
 * @param page - Playwright page instance
 * @param selector - CSS selector or test ID
 * @param timeoutMs - Timeout in milliseconds (default: 5000)
 */
export async function waitForElementToDisappear(
  page: Page,
  selector: string,
  timeoutMs: number = 5000
): Promise<void> {
  const element = page.locator(selector);
  await element.waitFor({ state: 'hidden', timeout: timeoutMs });
}

/**
 * Wait for a loading spinner to disappear
 * Useful for waiting for async operations to complete
 *
 * @param page - Playwright page instance
 * @param timeoutMs - Timeout in milliseconds (default: 10000)
 */
export async function waitForLoadingComplete(page: Page, timeoutMs: number = 10000): Promise<void> {
  // Common loading spinner selectors
  const spinnerSelectors = [
    '[data-loading="true"]',
    '[aria-busy="true"]',
    '.loading',
    '.spinner',
    '[role="progressbar"]',
  ];

  for (const selector of spinnerSelectors) {
    const spinner = page.locator(selector);
    const count = await spinner.count();

    if (count > 0) {
      await spinner.first().waitFor({ state: 'hidden', timeout: timeoutMs });
    }
  }
}

/**
 * Click and wait for navigation
 * Useful for links that navigate to new pages
 *
 * @param page - Playwright page instance
 * @param selector - CSS selector or test ID of the element to click
 * @param waitForLoad - Wait for page to fully load after navigation (default: true)
 */
export async function clickAndNavigate(
  page: Page,
  selector: string,
  waitForLoad: boolean = true
): Promise<void> {
  await Promise.all([
    page.waitForNavigation({ waitUntil: 'domcontentloaded' }),
    page.click(selector),
  ]);

  if (waitForLoad) {
    await waitForPageLoad(page);
  }
}

/**
 * Fill form field and wait for validation
 *
 * @param page - Playwright page instance
 * @param selector - CSS selector of the input field
 * @param value - Value to fill
 * @param waitMs - Time to wait after filling (default: 300ms for debounced validation)
 */
export async function fillAndWait(
  page: Page,
  selector: string,
  value: string,
  waitMs: number = 300
): Promise<void> {
  await page.fill(selector, value);
  await page.waitForTimeout(waitMs);
}

/**
 * Scroll to an element
 *
 * @param page - Playwright page instance
 * @param selector - CSS selector of the element
 */
export async function scrollToElement(page: Page, selector: string): Promise<void> {
  const element = page.locator(selector);
  await element.scrollIntoViewIfNeeded();
}

/**
 * Get current URL path
 *
 * @param page - Playwright page instance
 * @returns The current URL path (without domain)
 */
export async function getCurrentPath(page: Page): Promise<string> {
  const url = new URL(page.url());
  return url.pathname;
}

/**
 * Check if on a specific page
 *
 * @param page - Playwright page instance
 * @param expectedPath - Expected URL path
 * @returns True if current path matches expected path
 */
export async function isOnPage(page: Page, expectedPath: string): Promise<boolean> {
  const currentPath = await getCurrentPath(page);
  return currentPath === expectedPath;
}

/**
 * Wait for API response
 * Useful for verifying backend calls
 *
 * @param page - Playwright page instance
 * @param urlPattern - URL pattern to match (string or RegExp)
 * @param timeoutMs - Timeout in milliseconds (default: 10000)
 * @returns The response object
 */
export async function waitForApiResponse(
  page: Page,
  urlPattern: string | RegExp,
  timeoutMs: number = 10000
) {
  return await page.waitForResponse(urlPattern, { timeout: timeoutMs });
}

/**
 * Take a screenshot for debugging
 *
 * @param page - Playwright page instance
 * @param name - Screenshot name (without extension)
 */
export async function takeScreenshot(page: Page, name: string): Promise<void> {
  await page.screenshot({
    path: `./test-results/screenshots/${name}-${Date.now()}.png`,
    fullPage: true,
  });
}

/**
 * Reload the page and wait for load
 *
 * @param page - Playwright page instance
 * @param waitForLoad - Wait for page to fully load (default: true)
 */
export async function reloadPage(page: Page, waitForLoad: boolean = true): Promise<void> {
  await page.reload();

  if (waitForLoad) {
    await waitForPageLoad(page);
  }
}

/**
 * Go back in browser history
 *
 * @param page - Playwright page instance
 * @param waitForLoad - Wait for page to fully load (default: true)
 */
export async function goBack(page: Page, waitForLoad: boolean = true): Promise<void> {
  await page.goBack();

  if (waitForLoad) {
    await waitForPageLoad(page);
  }
}

/**
 * Check if element is visible
 *
 * @param page - Playwright page instance
 * @param selector - CSS selector
 * @returns True if element is visible
 */
export async function isVisible(page: Page, selector: string): Promise<boolean> {
  const element = page.locator(selector);
  return await element.isVisible();
}

/**
 * Wait for text to appear on the page
 *
 * @param page - Playwright page instance
 * @param text - Text to wait for
 * @param timeoutMs - Timeout in milliseconds (default: 5000)
 */
export async function waitForText(
  page: Page,
  text: string,
  timeoutMs: number = 5000
): Promise<void> {
  await page.waitForSelector(`text="${text}"`, { timeout: timeoutMs });
}
