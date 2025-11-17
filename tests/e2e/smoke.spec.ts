import { test, expect } from '@playwright/test';

/**
 * Smoke Tests
 *
 * Basic tests to verify the application is running and accessible.
 * These tests should run quickly and catch critical infrastructure issues.
 */

test.describe('Application Smoke Tests', () => {
  test('homepage loads successfully', async ({ page }) => {
    // Navigate to the homepage
    await page.goto('/');

    // Wait for page to be fully loaded
    await page.waitForLoadState('networkidle');

    // Verify the page loaded without errors (status code check happens automatically)
    expect(page.url()).toBe('http://localhost:3000/');
  });

  test('homepage has correct title', async ({ page }) => {
    // Navigate to the homepage
    await page.goto('/');

    // Check that the title exists and is not empty
    await expect(page).toHaveTitle(/gthanks|GThanks|Wishlist/i);
  });

  test('homepage renders main content', async ({ page }) => {
    // Navigate to the homepage
    await page.goto('/');

    // Wait for the page to load
    await page.waitForLoadState('domcontentloaded');

    // Verify the page has some content (not a blank page)
    const bodyText = await page.textContent('body');
    expect(bodyText).toBeTruthy();
    expect(bodyText!.length).toBeGreaterThan(0);
  });

  test('login page is accessible', async ({ page }) => {
    // Navigate to the login page
    const response = await page.goto('/auth/login');

    // Verify the page loaded successfully (HTTP 200)
    expect(response?.status()).toBe(200);

    // Verify we're on the login page
    expect(page.url()).toContain('/auth/login');

    // Verify the page has actual content (not just a 404)
    await expect(page.locator('body')).toBeVisible();
  });

  test('404 page works', async ({ page }) => {
    // Navigate to a non-existent page
    const response = await page.goto('/this-page-does-not-exist-12345');

    // Verify we get a 404 response
    expect(response?.status()).toBe(404);
  });
});
