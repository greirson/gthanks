import { Page } from '@playwright/test';

/**
 * Create a new list
 * @param page - Playwright page object
 * @param name - List name
 * @param description - List description (optional)
 * @returns The created list ID
 */
export async function createList(
  page: Page,
  name: string,
  description?: string
): Promise<string> {
  // Navigate to lists page
  await page.goto('/lists');
  
  // Click create button
  await page.getByRole('button', { name: /create list/i }).click();
  
  // Fill form
  await page.getByLabel(/name/i).fill(name);
  if (description) {
    await page.getByLabel(/description/i).fill(description);
  }
  
  // Submit form
  await page.getByRole('button', { name: /create/i }).click();
  
  // Wait for navigation to list detail page
  await page.waitForURL(/\/lists\/.+/);
  
  // Extract list ID from URL
  const url = page.url();
  const listId = url.split('/lists/')[1].split('?')[0];
  
  return listId;
}

/**
 * Navigate to a list
 * @param page - Playwright page object  
 * @param listId - List ID
 */
export async function navigateToList(page: Page, listId: string) {
  await page.goto(`/lists/${listId}`);
}

/**
 * Share a list publicly
 * @param page - Playwright page object
 */
export async function shareListPublicly(page: Page) {
  await page.getByRole('button', { name: /share/i }).click();
  await page.getByLabel('Public').check();
  await page.getByRole('button', { name: /save/i }).click();
  await page.waitForTimeout(500);
}
