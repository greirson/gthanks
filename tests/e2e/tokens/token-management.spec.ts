/**
 * E2E Tests for Token Manager UI and PAT Lifecycle
 *
 * Tests comprehensive personal access token management features including:
 * - Token Manager UI (empty state, create flow with expiration, list display, revoke flow)
 * - Bearer token API authentication
 * - Full token lifecycle (create -> use -> revoke)
 * - Security edge cases (token escalation prevention, suspended users)
 */

import { test, expect } from '@playwright/test';
import { createId } from '@paralleldrive/cuid2';
import { db } from '@/lib/db';
import { createAndLoginUser, loginAsUser, type TestUser } from '../helpers/auth.helper';
import { cleanupTestData } from '../helpers/database.helper';
import { goToSettings, waitForPageLoad, waitForToast } from '../helpers/navigation.helper';
import { generateUniqueEmail } from '../helpers/email.helper';

test.describe('Token Manager UI', () => {
  test.afterEach(async () => {
    await cleanupTestData();
  });

  test.describe('Empty State', () => {
    test('shows "No access tokens yet" and Create button when user has no tokens', async ({
      page,
    }) => {
      // Create user with no tokens
      const user = await createAndLoginUser(page, {
        email: generateUniqueEmail('token-empty'),
        name: 'Token Test User',
      });

      // Navigate to settings
      await goToSettings(page);

      // Find the Access Tokens section
      const tokenSection = page.locator('text=Access Tokens').first();
      await expect(tokenSection).toBeVisible();

      // Verify empty state message
      await expect(page.getByText('No access tokens yet')).toBeVisible({ timeout: 10000 });
      await expect(page.getByText(/connect apps and extensions/i)).toBeVisible();

      // Verify Create Token button is visible
      const createButton = page.getByRole('button', { name: /create token/i });
      await expect(createButton).toBeVisible();
    });
  });

  test.describe('Create Token Flow', () => {
    test('creates token with name, expiration, and shows show-once dialog', async ({ page }) => {
      const user = await createAndLoginUser(page, {
        email: generateUniqueEmail('token-create'),
        name: 'Token Creator',
      });

      await goToSettings(page);

      // Click Create Token button
      const createButton = page.getByRole('button', { name: /create token/i });
      await createButton.click();

      // Verify dialog opens
      await expect(page.getByRole('dialog')).toBeVisible();
      await expect(page.getByText('Create Access Token')).toBeVisible();

      // Fill token name
      const nameInput = page.locator('#token-name');
      await nameInput.fill('My Safari Extension');

      // Select device type (optional)
      const deviceTypeSelect = page.locator('#device-type');
      await deviceTypeSelect.click();
      await page.getByText('Safari Extension').click();

      // Select expiration (verify default is 90 days)
      const expirationSelect = page.locator('#expiration');
      await expect(expirationSelect).toContainText('90 days');

      // Change to 1 year
      await expirationSelect.click();
      await page.getByText('1 year').click();

      // Submit the form
      const submitButton = page.getByRole('button', { name: 'Create Token' });
      await submitButton.click();

      // Wait for show-once dialog
      await expect(page.getByText('Token Created')).toBeVisible({ timeout: 10000 });
      await expect(page.getByText(/copy your token now/i)).toBeVisible();

      // Verify token input is visible and has value starting with 'gth_'
      const tokenContainer = page.locator('label:has-text("Your Token")').locator('..');
      const tokenInput = tokenContainer.locator('input');
      await expect(tokenInput).toBeVisible();
      const tokenValue = await tokenInput.inputValue();
      expect(tokenValue).toMatch(/^gth_/);

      // Verify expiration info is shown
      await expect(page.getByText(/Expires:/)).toBeVisible();

      // Close the dialog
      const doneButton = page.getByRole('button', { name: 'Done' });
      await doneButton.click();

      // Verify token appears in list
      await expect(page.getByText('My Safari Extension')).toBeVisible({ timeout: 5000 });
    });

    test('creates token that never expires', async ({ page }) => {
      const user = await createAndLoginUser(page, {
        email: generateUniqueEmail('token-never'),
        name: 'Never Expire User',
      });

      await goToSettings(page);

      // Open create dialog
      await page.getByRole('button', { name: /create token/i }).click();
      await page.locator('#token-name').fill('Eternal Token');

      // Select "No expiration"
      await page.locator('#expiration').click();
      await page.getByText('No expiration').click();

      // Create the token
      await page.getByRole('button', { name: 'Create Token' }).click();

      // Verify show-once dialog shows "Never" for expiration
      await expect(page.getByText('Token Created')).toBeVisible({ timeout: 10000 });
      await expect(page.getByText('Expires:')).toBeVisible();
      await expect(page.getByText('Never')).toBeVisible();

      // Close and verify list shows "Never expires"
      await page.getByRole('button', { name: 'Done' }).click();
      await expect(page.getByText('Never expires')).toBeVisible({ timeout: 5000 });
    });

    test('validates token name is required', async ({ page }) => {
      const user = await createAndLoginUser(page, {
        email: generateUniqueEmail('token-validation'),
        name: 'Validation User',
      });

      await goToSettings(page);

      // Open create dialog
      await page.getByRole('button', { name: /create token/i }).click();
      await expect(page.getByRole('dialog')).toBeVisible();

      // Try to submit without name (button should be disabled)
      const submitButton = page.getByRole('button', { name: 'Create Token' });
      await expect(submitButton).toBeDisabled();

      // Fill name and verify button is enabled
      await page.locator('#token-name').fill('Valid Name');
      await expect(submitButton).toBeEnabled();
    });
  });

  test.describe('Token List Display', () => {
    test('displays token with expiration badge and metadata', async ({ page }) => {
      const user = await createAndLoginUser(page, {
        email: generateUniqueEmail('token-list'),
        name: 'List User',
      });

      // Create a token via API first (faster than UI)
      const response = await page.request.post('/api/auth/tokens', {
        data: {
          name: 'iOS App Token',
          deviceType: 'ios_app',
          expiresIn: '90d',
        },
      });
      expect(response.ok()).toBeTruthy();

      // Navigate to settings
      await goToSettings(page);

      // Wait for token to appear in list
      await expect(page.getByText('iOS App Token')).toBeVisible({ timeout: 10000 });

      // Verify "Never used" is displayed
      await expect(page.getByText('Never used')).toBeVisible();

      // Verify created date is displayed
      await expect(page.getByText(/Created:/)).toBeVisible();

      // Verify expiration badge is displayed (should show "Expires in X months")
      await expect(page.getByText(/Expires in/)).toBeVisible();
    });

    test('handles multiple tokens (5+) correctly', async ({ page }) => {
      const user = await createAndLoginUser(page, {
        email: generateUniqueEmail('token-multi'),
        name: 'Multi Token User',
      });

      // Create 5 tokens via API
      const tokenNames = [
        'Safari Extension',
        'Chrome Extension',
        'iOS App',
        'Android App',
        'API Client',
      ];

      for (const name of tokenNames) {
        const response = await page.request.post('/api/auth/tokens', {
          data: { name },
        });
        expect(response.ok()).toBeTruthy();
      }

      // Navigate to settings
      await goToSettings(page);

      // Wait for all tokens to be visible
      for (const name of tokenNames) {
        await expect(page.getByText(name)).toBeVisible({ timeout: 10000 });
      }

      // Verify all 5 revoke buttons are present
      const revokeButtons = page.locator('button').filter({ hasText: /revoke/i });
      // On mobile, revoke text is visible; on desktop, just trash icon
      const trashButtons = page.locator('button svg.lucide-trash-2').locator('..');
      const buttonCount = (await revokeButtons.count()) + (await trashButtons.count());
      expect(buttonCount).toBeGreaterThanOrEqual(5);
    });
  });

  test.describe('Revoke Token Flow', () => {
    test('shows confirmation dialog, revokes token, and removes from list', async ({ page }) => {
      const user = await createAndLoginUser(page, {
        email: generateUniqueEmail('token-revoke'),
        name: 'Revoke User',
      });

      // Create a token via API
      const createResponse = await page.request.post('/api/auth/tokens', {
        data: { name: 'Token To Revoke' },
      });
      expect(createResponse.ok()).toBeTruthy();

      // Navigate to settings
      await goToSettings(page);

      // Wait for token to appear
      await expect(page.getByText('Token To Revoke')).toBeVisible({ timeout: 10000 });

      // Click revoke button (trash icon or Revoke text)
      const tokenCard = page.locator('text=Token To Revoke').locator('..').locator('..');
      const revokeButton = tokenCard
        .locator('button')
        .filter({ has: page.locator('.lucide-trash-2') });
      await revokeButton.click();

      // Verify confirmation dialog appears
      await expect(page.getByText('Revoke Access Token')).toBeVisible({ timeout: 5000 });
      await expect(page.getByText(/Are you sure you want to revoke/i)).toBeVisible();

      // Confirm revocation
      const confirmButton = page.getByRole('button', { name: 'Revoke' }).last();
      await confirmButton.click();

      // Verify success message
      await expect(page.getByText(/Token revoked successfully/i)).toBeVisible({ timeout: 5000 });

      // Verify token is removed from list
      await expect(page.getByText('Token To Revoke')).not.toBeVisible({ timeout: 5000 });
    });
  });

  test.describe('Show-Once Security', () => {
    test('token cannot be retrieved after dialog closes', async ({ page }) => {
      const user = await createAndLoginUser(page, {
        email: generateUniqueEmail('token-showonce'),
        name: 'Show Once User',
      });

      await goToSettings(page);

      // Create token
      await page.getByRole('button', { name: /create token/i }).click();
      await page.locator('#token-name').fill('Secret Token');
      await page.getByRole('button', { name: 'Create Token' }).click();

      // Wait for show-once dialog and get the token value
      await expect(page.getByText('Token Created')).toBeVisible({ timeout: 10000 });
      const tokenContainer = page.locator('label:has-text("Your Token")').locator('..');
      const tokenInput = tokenContainer.locator('input');
      const tokenValue = await tokenInput.inputValue();
      expect(tokenValue).toMatch(/^gth_/);

      // Close the dialog
      await page.getByRole('button', { name: 'Done' }).click();

      // Verify token appears in list but only shows prefix
      await expect(page.getByText('Secret Token')).toBeVisible({ timeout: 5000 });

      // Verify the full token is NOT visible anywhere on the page
      // Only the prefix (gth_xxx...) should be visible
      const pageContent = await page.content();
      expect(pageContent).not.toContain(tokenValue);

      // Verify the list shows prefix with ellipsis
      const tokenCard = page.locator('text=Secret Token').locator('..').locator('..');
      await expect(tokenCard.getByText(/gth_\w+\.\.\./)).toBeVisible();
    });
  });
});

test.describe('API Authentication with Bearer Token', () => {
  test.afterEach(async () => {
    await cleanupTestData();
  });

  test('Bearer token authenticates API requests (GET /api/wishes)', async ({ page, request }) => {
    // Create user and login to get session
    const user = await createAndLoginUser(page, {
      email: generateUniqueEmail('token-api-auth'),
      name: 'API Auth User',
    });

    // Create a token via API (requires session)
    const tokenResponse = await page.request.post('/api/auth/tokens', {
      data: { name: 'API Test Token' },
    });
    expect(tokenResponse.ok()).toBeTruthy();

    const tokenData = await tokenResponse.json();
    const token = tokenData.token;

    // Create a wish for this user
    await db.wish.create({
      data: {
        id: createId(),
        title: 'Test Wish for API',
        ownerId: user.id,
        wishLevel: 2,
      },
    });

    // Make API request with Bearer token (using standalone request context)
    const wishesResponse = await request.get('/api/wishes', {
      headers: {
        Authorization: 'Bearer ' + token,
      },
    });

    expect(wishesResponse.ok()).toBeTruthy();
    const wishesData = await wishesResponse.json();
    expect(wishesData.wishes).toBeDefined();
    expect(wishesData.wishes.length).toBeGreaterThanOrEqual(1);
    expect(
      wishesData.wishes.some((w: { title: string }) => w.title === 'Test Wish for API')
    ).toBeTruthy();
  });

  test('invalid tokens are rejected with 401', async ({ request }) => {
    // Try to access API with invalid token
    const response = await request.get('/api/wishes', {
      headers: {
        Authorization: 'Bearer gth_invalid_token_that_does_not_exist',
      },
    });

    expect(response.status()).toBe(401);
    const data = await response.json();
    expect(data.error).toBeDefined();
  });

  test('revoked tokens are rejected immediately', async ({ page, request }) => {
    const user = await createAndLoginUser(page, {
      email: generateUniqueEmail('token-revoked-auth'),
      name: 'Revoked Token User',
    });

    // Create a token
    const tokenResponse = await page.request.post('/api/auth/tokens', {
      data: { name: 'Token To Be Revoked' },
    });
    expect(tokenResponse.ok()).toBeTruthy();
    const tokenData = await tokenResponse.json();
    const token = tokenData.token;

    // Verify token works initially
    const initialResponse = await request.get('/api/wishes', {
      headers: { Authorization: 'Bearer ' + token },
    });
    expect(initialResponse.ok()).toBeTruthy();

    // Get token ID from database
    const tokenRecord = await db.personalAccessToken.findFirst({
      where: { userId: user.id },
    });
    expect(tokenRecord).toBeDefined();

    // Revoke the token via API
    const revokeResponse = await page.request.delete('/api/auth/tokens/' + tokenRecord!.id);
    expect(revokeResponse.ok()).toBeTruthy();

    // Verify revoked token is rejected
    const rejectedResponse = await request.get('/api/wishes', {
      headers: { Authorization: 'Bearer ' + token },
    });
    expect(rejectedResponse.status()).toBe(401);
  });
});

test.describe('Full Token Lifecycle', () => {
  test.afterEach(async () => {
    await cleanupTestData();
  });

  test('complete lifecycle: Create -> Use -> Revoke', async ({ page, request }) => {
    const user = await createAndLoginUser(page, {
      email: generateUniqueEmail('token-lifecycle'),
      name: 'Lifecycle User',
    });

    // Step 1: CREATE token
    const createResponse = await page.request.post('/api/auth/tokens', {
      data: {
        name: 'Lifecycle Test Token',
        deviceType: 'api_client',
        expiresIn: '90d',
      },
    });
    expect(createResponse.ok()).toBeTruthy();
    const tokenData = await createResponse.json();
    const token = tokenData.token;
    expect(token).toMatch(/^gth_/);
    expect(tokenData.expiresAt).not.toBeNull();

    console.log('STEP 1: Token created successfully');

    // Step 2: USE token - make API call
    const useResponse = await request.get('/api/wishes', {
      headers: { Authorization: 'Bearer ' + token },
    });
    expect(useResponse.ok()).toBeTruthy();

    console.log('STEP 2: Token used for API authentication');

    // Step 3: Verify lastUsed is updated
    await page.waitForTimeout(500); // Wait for async lastUsedAt update

    const tokenRecord = await db.personalAccessToken.findFirst({
      where: { userId: user.id },
    });
    expect(tokenRecord).toBeDefined();
    expect(tokenRecord!.lastUsedAt).not.toBeNull();

    console.log('STEP 3: lastUsedAt updated after API call');

    // Step 4: REVOKE token
    const revokeResponse = await page.request.delete('/api/auth/tokens/' + tokenRecord!.id);
    expect(revokeResponse.ok()).toBeTruthy();

    console.log('STEP 4: Token revoked');

    // Step 5: Verify revoked token is rejected
    const revokedTokenResponse = await request.get('/api/wishes', {
      headers: { Authorization: 'Bearer ' + token },
    });
    expect(revokedTokenResponse.status()).toBe(401);

    console.log('STEP 5: Revoked token rejected - LIFECYCLE COMPLETE');
  });
});

test.describe('Security Edge Cases', () => {
  test.afterEach(async () => {
    await cleanupTestData();
  });

  test('cannot create token with only Bearer auth (prevents token escalation)', async ({
    page,
    request,
  }) => {
    const user = await createAndLoginUser(page, {
      email: generateUniqueEmail('token-escalation'),
      name: 'Escalation Test User',
    });

    // Create a valid token via session
    const tokenResponse = await page.request.post('/api/auth/tokens', {
      data: { name: 'Initial Token' },
    });
    expect(tokenResponse.ok()).toBeTruthy();
    const tokenData = await tokenResponse.json();
    const token = tokenData.token;

    // Clear session cookies to simulate token-only auth
    await page.context().clearCookies();

    // Try to create a new token using only Bearer auth
    const escalationResponse = await request.post('/api/auth/tokens', {
      headers: {
        Authorization: 'Bearer ' + token,
        'Content-Type': 'application/json',
      },
      data: {
        name: 'Escalated Token',
      },
    });

    // Should be rejected - token creation requires session auth
    expect(escalationResponse.status()).toBe(401);
    const errorData = await escalationResponse.json();
    expect(errorData.error).toBe('unauthorized');
  });

  test('suspended user tokens are rejected', async ({ page, request }) => {
    const user = await createAndLoginUser(page, {
      email: generateUniqueEmail('token-suspended'),
      name: 'Suspended User',
    });

    // Create a token while user is active
    const tokenResponse = await page.request.post('/api/auth/tokens', {
      data: { name: 'Suspended User Token' },
    });
    expect(tokenResponse.ok()).toBeTruthy();
    const tokenData = await tokenResponse.json();
    const token = tokenData.token;

    // Verify token works initially
    const initialResponse = await request.get('/api/wishes', {
      headers: { Authorization: 'Bearer ' + token },
    });
    expect(initialResponse.ok()).toBeTruthy();

    // Suspend the user
    await db.user.update({
      where: { id: user.id },
      data: { suspendedAt: new Date() },
    });

    // Verify suspended user's token is rejected
    const suspendedResponse = await request.get('/api/wishes', {
      headers: { Authorization: 'Bearer ' + token },
    });
    expect(suspendedResponse.status()).toBe(401);

    // Unsuspend and verify token works again
    await db.user.update({
      where: { id: user.id },
      data: { suspendedAt: null },
    });

    const unsuspendedResponse = await request.get('/api/wishes', {
      headers: { Authorization: 'Bearer ' + token },
    });
    expect(unsuspendedResponse.ok()).toBeTruthy();
  });

  test('expired access tokens are rejected', async ({ page, request }) => {
    const user = await createAndLoginUser(page, {
      email: generateUniqueEmail('token-expired'),
      name: 'Expired Token User',
    });

    // Create a token
    const tokenResponse = await page.request.post('/api/auth/tokens', {
      data: { name: 'Expiring Token' },
    });
    expect(tokenResponse.ok()).toBeTruthy();
    const tokenData = await tokenResponse.json();
    const token = tokenData.token;

    // Manually expire the token in database
    await db.personalAccessToken.updateMany({
      where: { userId: user.id },
      data: { expiresAt: new Date(Date.now() - 1000) }, // 1 second ago
    });

    // Verify expired token is rejected
    const expiredResponse = await request.get('/api/wishes', {
      headers: { Authorization: 'Bearer ' + token },
    });
    expect(expiredResponse.status()).toBe(401);
  });

  test('never-expiring tokens remain valid indefinitely', async ({ page, request }) => {
    const user = await createAndLoginUser(page, {
      email: generateUniqueEmail('token-neverexp'),
      name: 'Never Expire User',
    });

    // Create a never-expiring token
    const tokenResponse = await page.request.post('/api/auth/tokens', {
      data: {
        name: 'Eternal Token',
        expiresIn: 'never',
      },
    });
    expect(tokenResponse.ok()).toBeTruthy();
    const tokenData = await tokenResponse.json();
    const token = tokenData.token;
    expect(tokenData.expiresAt).toBeNull();

    // Verify token works
    const response = await request.get('/api/wishes', {
      headers: { Authorization: 'Bearer ' + token },
    });
    expect(response.ok()).toBeTruthy();

    // Verify database has null expiresAt
    const tokenRecord = await db.personalAccessToken.findFirst({
      where: { userId: user.id },
    });
    expect(tokenRecord?.expiresAt).toBeNull();
  });
});
