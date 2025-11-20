# E2E Tests - Comprehensive Agent-Friendly Guide

End-to-end testing documentation optimized for AI coding agents and developers working with gthanks MVP.

## Quick Start Commands

```bash
# Install Playwright browsers (first time only)
pnpm exec playwright install

# Run all E2E tests
pnpm exec playwright test

# Run specific test file
pnpm exec playwright test smoke.spec.ts
pnpm exec playwright test core/auth.spec.ts

# Run tests in headed mode (see browser)
pnpm exec playwright test --headed

# Run tests in UI mode (interactive debugging - RECOMMENDED)
pnpm exec playwright test --ui

# Run tests for specific browser
pnpm exec playwright test --project=chromium
pnpm exec playwright test --project=firefox
pnpm exec playwright test --project=webkit

# Run tests with debug mode (pause and inspect)
pnpm exec playwright test --debug

# Generate and view test report
pnpm exec playwright show-report

# Run only failed tests from last run
pnpm exec playwright test --last-failed
```

## Test Structure

```
tests/e2e/
├── README.md                     # This file - comprehensive guide
├── smoke.spec.ts                 # Basic smoke tests (homepage, 404)
├── core/                         # Core functionality tests
│   ├── auth.spec.ts              # Authentication flows
│   ├── wishes.spec.ts            # Wish CRUD operations
│   └── lists.spec.ts             # List management
├── groups/                       # Group management tests
│   ├── group-creation.spec.ts    # Create/edit groups
│   └── group-sharing.spec.ts     # Share lists with groups
├── reservations/                 # Gift reservation tests
│   ├── reserve-wish.spec.ts      # Reserve/unreserve wishes
│   └── visibility.spec.ts        # Hide reservations from owners
├── edge-cases/                   # Edge cases and error scenarios
│   └── error-handling.spec.ts    # Error states
├── helpers/                      # Reusable test utilities
│   ├── auth.helper.ts            # Authentication helpers (PRIMARY)
│   ├── auth.ts                   # Auth utilities (legacy)
│   ├── database.helper.ts        # Database helpers (PRIMARY)
│   ├── database.ts               # DB utilities (legacy)
│   └── db.ts                     # DB connection
└── fixtures/                     # Test data fixtures
    └── test-data.ts              # Shared test data
```

## Database Setup

### Test Database Configuration

E2E tests use a **real test database** (SQLite in dev, PostgreSQL in prod).

**Environment Setup:**

1. **Environment Variables** (`.env.test` or `.env.local`):

```bash
# Test database (isolated from dev)
DATABASE_URL="file:./data/test.db"

# Test auth
NEXTAUTH_URL="http://localhost:3000"
NEXTAUTH_SECRET="test-secret-min-32-chars-long-for-testing"

# Email (optional for tests)
SMTP_HOST="smtp.example.com"
EMAIL_FROM="test@gthanks.app"
```

2. **Database Helpers** (already implemented):

The project includes `helpers/database.helper.ts` and `helpers/database.ts` with:

- `cleanDatabase()` - Clear all test data
- `createTestUser()` - Create test users
- `createTestWish()` - Create test wishes
- `createTestList()` - Create test wishlists
- `createTestGroup()` - Create test groups
- `createTestReservation()` - Create reservations

**Usage Example:**

```typescript
import { cleanDatabase, createTestUser, createTestWish } from './helpers/database.helper';

test.beforeEach(async () => {
  // Clean database before each test
  await cleanDatabase();
});

test('create wish', async ({ page }) => {
  const user = await createTestUser('test@example.com');
  const wish = await createTestWish(user.id, 'Test Item');
  // Continue test...
});
```

### Database Cleanup Strategy

**Option 1: Clean Before Each Test (Recommended)**

```typescript
test.beforeEach(async () => {
  await cleanDatabase();
});
```

**Option 2: Clean After Each Test**

```typescript
test.afterEach(async () => {
  await cleanDatabase();
});
```

**Option 3: Manual Cleanup**

```typescript
test('specific test', async () => {
  await cleanDatabase();
  // Test logic...
});
```

## Authentication

### Auth Helpers (Already Implemented)

The project includes comprehensive auth helpers in `helpers/auth.helper.ts`:

**Available Functions:**

- `createAuthenticatedSession(email: string)` - Create user and session
- `loginAsUser(page, email: string)` - Login via session cookie
- `logout(page)` - Clear session
- `isAuthenticated(page)` - Check auth status

**Usage Example:**

```typescript
import { loginAsUser, logout } from './helpers/auth.helper';

test('authenticated user can create wishlist', async ({ page }) => {
  // Login user
  await loginAsUser(page, 'test@example.com');

  // Navigate to protected page
  await page.goto('/wishlists');

  // Verify authenticated state
  await expect(page.locator('text=My Wishlists')).toBeVisible();
});

test('logout clears session', async ({ page }) => {
  await loginAsUser(page, 'test@example.com');
  await logout(page);

  // Verify logged out
  await page.goto('/dashboard');
  await expect(page).toHaveURL(/\/login/);
});
```

### Magic Link Authentication (Alternative)

For testing the full magic link flow:

```typescript
// Note: Requires email interception or mock
test('magic link authentication', async ({ page }) => {
  await page.goto('/login');

  // Enter email
  await page.fill('input[name="email"]', 'test@example.com');
  await page.click('button[type="submit"]');

  // In production tests, intercept email and extract link
  // For MVP, use session-based auth (faster and more reliable)
});
```

### OAuth Authentication

```typescript
test.skip('OAuth login - requires provider config', async ({ page }) => {
  // Skip OAuth tests in CI/local environments without credentials
  // OAuth requires GOOGLE_CLIENT_ID, FACEBOOK_CLIENT_ID, etc.
});
```

## Test Patterns

### Standard Test Structure

```typescript
import { test, expect } from '@playwright/test';
import { cleanDatabase, createTestUser } from './helpers/database.helper';
import { loginAsUser } from './helpers/auth.helper';

test.describe('Feature Name', () => {
  // Setup before each test
  test.beforeEach(async () => {
    await cleanDatabase();
  });

  test('should perform expected action', async ({ page }) => {
    // 1. Setup: Create test data
    const user = await createTestUser('test@example.com');
    await loginAsUser(page, user.email);

    // 2. Navigate to page
    await page.goto('/path');

    // 3. Action: Perform user action
    await page.click('[data-testid="submit-button"]');

    // 4. Assert: Verify expected outcome
    await expect(page.locator('.success-message')).toBeVisible();
    await expect(page.locator('.success-message')).toHaveText('Success!');
  });

  test('should handle error case', async ({ page }) => {
    await page.goto('/path');

    // Trigger error condition
    await page.fill('input[name="field"]', '');
    await page.click('[data-testid="submit-button"]');

    // Verify error is shown
    await expect(page.locator('[data-testid="error-message"]')).toBeVisible();
  });
});
```

### Page Object Pattern (Recommended for Complex Pages)

```typescript
// helpers/page-objects/wishlist-page.ts
import { Page, expect } from '@playwright/test';

export class WishlistPage {
  constructor(private page: Page) {}

  async goto() {
    await this.page.goto('/wishlists');
  }

  async createWish(title: string, price?: number, wishLevel?: number) {
    await this.page.click('[data-testid="add-wish"]');
    await this.page.fill('input[name="title"]', title);

    if (price) {
      await this.page.fill('input[name="price"]', price.toString());
    }

    if (wishLevel) {
      await this.page.selectOption('select[name="wishLevel"]', wishLevel.toString());
    }

    await this.page.click('button[type="submit"]');
  }

  async getWishCount() {
    return await this.page.locator('[data-testid="wish-item"]').count();
  }

  async getWishByTitle(title: string) {
    return this.page.locator(`[data-testid="wish-item"]:has-text("${title}")`);
  }

  async deleteWish(title: string) {
    const wish = await this.getWishByTitle(title);
    await wish.locator('[data-testid="delete-button"]').click();
    await this.page.click('[data-testid="confirm-delete"]');
  }
}

// In test file
import { WishlistPage } from './helpers/page-objects/wishlist-page';

test('create wish using page object', async ({ page }) => {
  const wishlist = new WishlistPage(page);

  await wishlist.goto();
  await wishlist.createWish('Test Item', 29.99, 3);

  expect(await wishlist.getWishCount()).toBe(1);
});
```

### Using Test Fixtures

```typescript
// fixtures/test-data.ts
export const testUsers = {
  user1: { email: 'user1@example.com', name: 'User One' },
  user2: { email: 'user2@example.com', name: 'User Two' },
};

export const testWishes = {
  wish1: { title: 'Book: Clean Code', price: 39.99, wishLevel: 3 },
  wish2: { title: 'Wireless Mouse', price: 25.0, wishLevel: 2 },
};

// In test file
import { testWishes } from './fixtures/test-data';

test('create wish from fixture', async ({ page }) => {
  const wish = testWishes.wish1;

  await page.fill('[name="title"]', wish.title);
  await page.fill('[name="price"]', wish.price.toString());
  // ...
});
```

## Troubleshooting

### Common Issues and Solutions

**Issue: Tests timing out**

```bash
# Problem: Default timeout too short
# Solution: Increase timeout in playwright.config.ts
timeout: 60 * 1000, // 60 seconds

# Or increase per-test
test('slow test', async ({ page }) => {
  test.setTimeout(90000); // 90 seconds
  // ...
});
```

**Issue: Element not found**

```typescript
// ❌ Problem: Element not rendered yet
await page.click('.my-button'); // Fails if not ready

// ✅ Solution: Use built-in waiting
await page.locator('.my-button').click(); // Waits automatically

// ✅ Solution: Explicit wait
await page.waitForSelector('.my-button', { state: 'visible' });
await page.click('.my-button');

// ✅ Solution: Use data-testid
await page.click('[data-testid="my-button"]');
```

**Issue: Database locked (SQLite)**

```bash
# Problem: Multiple processes accessing same DB
# Solution 1: Stop dev server before E2E tests
pkill -f "next dev"
pnpm exec playwright test

# Solution 2: Use different test database
DATABASE_URL="file:./data/test-e2e.db" pnpm exec playwright test
```

**Issue: Session cookie not working**

```typescript
// ❌ Problem: Wrong cookie configuration
await context.addCookies([
  {
    name: 'wrong-name', // Wrong
    domain: '127.0.0.1', // Wrong
  },
]);

// ✅ Solution: Use correct Next-Auth cookie
await context.addCookies([
  {
    name: 'next-auth.session-token',
    domain: 'localhost',
    path: '/',
    httpOnly: true,
    sameSite: 'Lax',
    expires: Date.now() / 1000 + 30 * 24 * 60 * 60,
  },
]);

// ✅ Better: Use auth helper (handles this automatically)
import { loginAsUser } from './helpers/auth.helper';
await loginAsUser(page, 'test@example.com');
```

**Issue: Test flakiness (random failures)**

```typescript
// ❌ Problem: Race conditions
await page.click('.button');
await page.click('.next-button'); // Might click too early

// ✅ Solution: Add proper waits
await page.click('.button');
await page.waitForLoadState('networkidle');
await page.click('.next-button');

// ✅ Solution: Use assertions that auto-retry
await page.click('.button');
await expect(page.locator('.success')).toBeVisible(); // Retries
await page.click('.next-button');

// ✅ Solution: Wait for specific element
await page.click('.button');
await page.waitForSelector('.success', { state: 'visible' });
await page.click('.next-button');
```

**Issue: Playwright browsers not installed**

```bash
# Error: browserType.launch: Executable doesn't exist
# Solution: Install browsers
pnpm exec playwright install

# Install specific browser
pnpm exec playwright install chromium

# Install with system dependencies (Linux)
pnpm exec playwright install --with-deps chromium
```

### Debugging Commands

```bash
# Run single test with visible browser
pnpm exec playwright test smoke.spec.ts --headed

# Run with debug mode (pause on failures)
pnpm exec playwright test --debug

# Run with inspector UI (step through tests)
pnpm exec playwright test --ui

# Run specific test by name pattern
pnpm exec playwright test -g "should login"

# Run only failed tests from last run
pnpm exec playwright test --last-failed

# Run with verbose logging
DEBUG=pw:api pnpm exec playwright test

# Run specific project (browser)
pnpm exec playwright test --project=chromium

# Run with trace (for post-mortem debugging)
pnpm exec playwright test --trace on
pnpm exec playwright show-trace trace.zip
```

### Debugging in Test Code

```typescript
test('debug example', async ({ page }) => {
  // Pause execution and open inspector
  await page.pause();

  // Take screenshot
  await page.screenshot({ path: 'debug-screenshot.png', fullPage: true });

  // Log page content
  console.log(await page.content());

  // Log specific element
  const text = await page.locator('.element').textContent();
  console.log('Element text:', text);

  // Log all console messages
  page.on('console', (msg) => console.log('PAGE LOG:', msg.text()));

  // Log all page errors
  page.on('pageerror', (err) => console.log('PAGE ERROR:', err.message));

  // Wait for manual inspection
  await page.waitForTimeout(5000); // 5 seconds (use sparingly)
});
```

## Debugging

### Interactive Debugging

**Playwright Inspector (Best for Single Test):**

```bash
pnpm exec playwright test auth.spec.ts --debug

# Features:
# - Step through test line by line
# - Inspect page state at each step
# - Modify selectors and re-run
# - View console logs and network requests
# - Pick elements from page
```

**Playwright UI Mode (Best for Development):**

```bash
pnpm exec playwright test --ui

# Features:
# - Visual test runner with file tree
# - Watch mode (auto-rerun on file changes)
# - Time travel debugging (click timeline)
# - View DOM snapshots at each step
# - Network and console inspection
# - Filter tests by status
# - Run multiple tests in parallel
```

**Headed Mode (Best for Quick Visual Check):**

```bash
pnpm exec playwright test --headed

# Shows browser window during test execution
# Good for seeing what's happening in real-time
```

### Trace Viewer

```bash
# Record trace on failure (configured in playwright.config.ts)
# trace: 'on-first-retry'

# After test fails, view trace
pnpm exec playwright show-trace test-results/path-to-trace.zip

# Or record trace for all tests
pnpm exec playwright test --trace on
pnpm exec playwright show-trace trace.zip

# Trace includes:
# - Screenshots at each step
# - DOM snapshots
# - Network requests
# - Console logs
# - Source code location
```

### Debug Logs

```typescript
test('with debug logging', async ({ page }) => {
  // Enable console log capture
  page.on('console', (msg) => console.log('PAGE LOG:', msg.text()));
  page.on('pageerror', (err) => console.log('PAGE ERROR:', err.message));

  // Add custom logging
  console.log('Step 1: Navigate to page');
  await page.goto('/path');

  console.log('Step 2: Fill form');
  await page.fill('input[name="email"]', 'test@example.com');

  // Take screenshot at specific point
  await page.screenshot({
    path: `debug-${Date.now()}.png`,
    fullPage: true,
  });

  // Log network requests
  page.on('request', (request) => {
    console.log('REQUEST:', request.method(), request.url());
  });

  page.on('response', (response) => {
    console.log('RESPONSE:', response.status(), response.url());
  });
});
```

## CI/CD Integration

### GitHub Actions Example

```yaml
# .github/workflows/e2e-tests.yml
name: E2E Tests

on:
  push:
    branches: [main, develop]
  pull_request:
    branches: [main]

jobs:
  e2e-tests:
    runs-on: ubuntu-latest
    timeout-minutes: 10

    steps:
      - uses: actions/checkout@v3

      - uses: actions/setup-node@v3
        with:
          node-version: '20'
          cache: 'pnpm'

      - name: Install pnpm
        run: npm install -g pnpm

      - name: Install dependencies
        run: pnpm install --frozen-lockfile

      - name: Install Playwright browsers
        run: pnpm exec playwright install --with-deps chromium

      - name: Setup test database
        run: |
          pnpm db:push
        env:
          DATABASE_URL: file:./data/test-e2e.db

      - name: Run E2E tests
        run: pnpm exec playwright test --project=chromium
        env:
          CI: true
          DATABASE_URL: file:./data/test-e2e.db
          NEXTAUTH_URL: http://localhost:3000
          NEXTAUTH_SECRET: ${{ secrets.TEST_NEXTAUTH_SECRET }}

      - name: Upload test results
        if: failure()
        uses: actions/upload-artifact@v3
        with:
          name: playwright-report
          path: playwright-report/
          retention-days: 7

      - name: Upload screenshots
        if: failure()
        uses: actions/upload-artifact@v3
        with:
          name: test-screenshots
          path: test-results/
          retention-days: 7

      - name: Upload traces
        if: failure()
        uses: actions/upload-artifact@v3
        with:
          name: playwright-traces
          path: test-results/**/*.zip
          retention-days: 7
```

### Local CI Simulation

```bash
# Run tests as CI would (single worker, retries, headless)
CI=true pnpm exec playwright test

# This enables:
# - Headless mode
# - Retries on failure (2 attempts)
# - Single worker (no parallelism)
# - Fails if test.only found
# - Full reporting
```

### Pre-deployment Checklist

```bash
# Run full test suite before deploying
pnpm exec playwright test

# Expected output:
# ✅ Smoke tests pass
# ✅ Core functionality tests pass
# ✅ Group management tests pass
# ✅ Reservation tests pass

# Critical paths covered:
# ✅ User can sign up/login
# ✅ User can create wishlist
# ✅ User can add wishes with priority
# ✅ User can share list with group
# ✅ Gift giver can reserve wish
# ✅ Reservation hidden from wish owner
# ✅ User can unreserve wish
```

## Agent Instructions

### For AI Agents Running Tests

**Before Running Tests:**

1. **Check Playwright installation:**

```bash
pnpm exec playwright --version
```

2. **Install browsers if needed:**

```bash
pnpm exec playwright install chromium
```

3. **Verify test database config:**

```bash
cat .env.test || cat .env.local | grep DATABASE_URL
```

4. **Stop dev server (to avoid DB lock):**

```bash
pkill -f "next dev" || true
```

**Running Tests:**

1. **Run all tests:**

```bash
pnpm exec playwright test
```

2. **If tests fail, examine output:**

```bash
# Check terminal output for error messages
# Look for failed test names and error details
```

3. **View test report:**

```bash
pnpm exec playwright show-report
```

4. **Check screenshots (on failure):**

```bash
ls -la test-results/
```

**Writing New Tests:**

1. **Choose appropriate directory:**
   - Core functionality → `/Users/greir/projects/gthanks-dev/tests/e2e/core/`
   - Group features → `/Users/greir/projects/gthanks-dev/tests/e2e/groups/`
   - Reservations → `/Users/greir/projects/gthanks-dev/tests/e2e/reservations/`
   - Edge cases → `/Users/greir/projects/gthanks-dev/tests/e2e/edge-cases/`

2. **Use naming convention:**
   - `feature-name.spec.ts`

3. **Import helpers:**

```typescript
import { cleanDatabase, createTestUser } from '../helpers/database.helper';
import { loginAsUser } from '../helpers/auth.helper';
```

4. **Follow standard structure:**
   - `test.beforeEach()` for setup
   - Clean database
   - Use helpers for auth and data creation
   - Use `data-testid` for selectors
   - Add clear assertions

5. **Test locally before committing:**

```bash
pnpm exec playwright test new-feature.spec.ts --headed
```

**Debugging Failed Tests:**

1. **Run single test with UI:**

```bash
pnpm exec playwright test failing-test.spec.ts --ui
```

2. **Check screenshot:**

```bash
ls test-results/
open test-results/failing-test-*/test-failed-1.png
```

3. **View trace (if available):**

```bash
pnpm exec playwright show-trace test-results/*/trace.zip
```

4. **Add `page.pause()` for manual inspection:**

```typescript
test('debug this', async ({ page }) => {
  await page.goto('/path');
  await page.pause(); // Opens inspector
  // Continue test...
});
```

5. **Check helper implementations:**
   - Auth helper: `/Users/greir/projects/gthanks-dev/tests/e2e/helpers/auth.helper.ts`
   - DB helper: `/Users/greir/projects/gthanks-dev/tests/e2e/helpers/database.helper.ts`

### Test Selector Priority (for AI Agents)

When writing tests, use selectors in this order:

1. **BEST: data-testid attributes**

```typescript
await page.click('[data-testid="submit-button"]');
await page.locator('[data-testid="wish-item"]').count();
```

2. **GOOD: Accessible roles and labels**

```typescript
await page.getByRole('button', { name: 'Submit' }).click();
await page.getByLabel('Email').fill('test@example.com');
await page.getByPlaceholder('Enter your name').fill('Test User');
```

3. **OK: Text content**

```typescript
await page.getByText('Sign In').click();
await page.locator('button:has-text("Submit")').click();
```

4. **AVOID: CSS classes or IDs (brittle)**

```typescript
// ❌ Avoid - classes may change
await page.click('.btn-primary');
await page.click('#submit-btn');

// ✅ Use data-testid instead
await page.click('[data-testid="submit-button"]');
```

### Code Examples for Common Tasks

**Complete Wishlist Flow:**

```typescript
import { test, expect } from '@playwright/test';
import { cleanDatabase, createTestUser, createTestGroup } from '../helpers/database.helper';
import { loginAsUser } from '../helpers/auth.helper';

test('complete wishlist flow', async ({ page, context }) => {
  // 1. Clean and setup
  await cleanDatabase();
  const user = await createTestUser('user@example.com');
  const giver = await createTestUser('giver@example.com');

  // 2. Login as wish owner
  await loginAsUser(page, user.email);

  // 3. Create wishlist
  await page.goto('/wishlists');
  await page.click('[data-testid="create-list"]');
  await page.fill('input[name="name"]', 'Birthday Wishlist');
  await page.fill('textarea[name="description"]', 'My birthday wishes');
  await page.click('button[type="submit"]');
  await expect(page.locator('text=Birthday Wishlist')).toBeVisible();

  // 4. Add wish
  await page.click('[data-testid="add-wish"]');
  await page.fill('input[name="title"]', 'Clean Code Book');
  await page.fill('input[name="price"]', '39.99');
  await page.selectOption('select[name="wishLevel"]', '3'); // High priority
  await page.click('button[type="submit"]');
  await expect(page.locator('text=Clean Code Book')).toBeVisible();

  // 5. Create group and share
  const group = await createTestGroup(user.id, 'Family');
  await page.goto(`/groups/${group.id}`);
  await page.click('[data-testid="share-list"]');
  // ... share logic

  // 6. Login as gift giver
  await loginAsUser(page, giver.email);

  // 7. Reserve wish
  await page.goto(`/groups/${group.id}`);
  await page.click('[data-testid="wish-item"]');
  await page.click('[data-testid="reserve-button"]');
  await expect(page.locator('text=Reserved')).toBeVisible();

  // 8. Verify reservation hidden from owner
  await loginAsUser(page, user.email);
  await page.goto('/wishlists');
  await expect(page.locator('text=Clean Code Book')).toBeVisible();
  await expect(page.locator('[data-testid="reserved-by"]')).not.toBeVisible();
});
```

**Test Error Handling:**

```typescript
test('shows validation errors', async ({ page }) => {
  await page.goto('/wishlists/new');

  // Submit without required field
  await page.click('button[type="submit"]');

  // Verify error message
  await expect(page.locator('[data-testid="error-name"]')).toBeVisible();
  await expect(page.locator('[data-testid="error-name"]')).toHaveText('Name is required');

  // Verify form not submitted
  await expect(page).toHaveURL('/wishlists/new');
});
```

**Test with Multiple Users:**

```typescript
test('multiple users interact', async ({ browser }) => {
  // Create two separate contexts (sessions)
  const ownerContext = await browser.newContext();
  const giverContext = await browser.newContext();

  const ownerPage = await ownerContext.newPage();
  const giverPage = await giverContext.newPage();

  try {
    // Owner creates wish
    await loginAsUser(ownerPage, 'owner@example.com');
    await ownerPage.goto('/wishes/new');
    // ... create wish

    // Giver reserves wish
    await loginAsUser(giverPage, 'giver@example.com');
    await giverPage.goto('/wishes');
    // ... reserve wish

    // Owner cannot see reservation details
    await ownerPage.reload();
    await expect(ownerPage.locator('[data-testid="reserved-by"]')).not.toBeVisible();
  } finally {
    await ownerContext.close();
    await giverContext.close();
  }
});
```

## Best Practices

### DO:

- ✅ Use `data-testid` attributes for reliable selectors
- ✅ Clean database before each test (`test.beforeEach`)
- ✅ Use Playwright's built-in auto-waiting (`.click()`, `expect()`)
- ✅ Write isolated, independent tests
- ✅ Test critical user paths (MVP focus)
- ✅ Use auth/database helpers from `helpers/` directory
- ✅ Use Page Objects for complex flows
- ✅ Add meaningful assertions (`expect()`)
- ✅ Handle async/await properly
- ✅ Use meaningful test names (`should...` or `user can...`)
- ✅ Group related tests in `describe` blocks

### DON'T:

- ❌ Use brittle CSS class selectors (`.btn-primary`)
- ❌ Share state between tests
- ❌ Use `waitForTimeout` (use `waitForSelector` instead)
- ❌ Test implementation details (test user behavior)
- ❌ Write tests that depend on execution order
- ❌ Hardcode delays (use waitForLoadState, waitForSelector)
- ❌ Test all edge cases in E2E (use integration tests)
- ❌ Leave `test.only` in committed code
- ❌ Skip database cleanup
- ❌ Test non-critical features during MVP

## MVP Testing Philosophy

Following gthanks MVP principles:

**Ship Fast, Test Critical:**

- Run tests in parallel (default)
- Focus on chromium browser (default)
- Retry flaky tests automatically (configured)
- Quick feedback loop (UI mode recommended)

**Critical Paths Only (MVP Priority):**

**High Priority** (Must Test):

1. User signup/login (magic link)
2. Create wishlist
3. Add/edit/delete wishes
4. Set wish priority (1-3 stars / wish level)
5. Share list with group
6. Reserve wish (as gift giver)
7. Verify reservation hidden from wish owner
8. Unreserve wish

**Low Priority** (Post-MVP):

- Performance testing
- Load testing
- Accessibility testing
- Cross-browser testing (all browsers)
- Mobile responsiveness details
- Email content validation
- Social features
- Advanced filtering/sorting

### Test Coverage Goals (MVP)

```bash
# Current test organization:
tests/e2e/
├── smoke.spec.ts          # ✅ Basic health checks
├── core/                   # ✅ Auth, wishes, lists (critical)
├── groups/                 # ✅ Group management (critical)
├── reservations/           # ✅ Gift reservations (critical)
└── edge-cases/             # 🔶 Nice to have (secondary)

# MVP: Focus on smoke + core + groups + reservations
# Post-MVP: Add edge cases, accessibility, performance
```

## Configuration Reference

### Playwright Config (`playwright.config.ts`)

Key settings:

```typescript
{
  testDir: './tests/e2e',
  timeout: 30 * 1000,           // 30s per test
  fullyParallel: true,          // Run tests in parallel
  retries: 2,                   // Retry failed tests 2x
  workers: process.env.CI ? 1 : undefined,
  baseURL: 'http://localhost:3000',
  trace: 'on-first-retry',      // Trace on first retry
  screenshot: 'only-on-failure',
  video: 'retain-on-failure',
}
```

### Available Projects (Browsers)

```bash
# Chromium (Chrome) - DEFAULT
pnpm exec playwright test --project=chromium

# Firefox
pnpm exec playwright test --project=firefox

# WebKit (Safari)
pnpm exec playwright test --project=webkit
```

## File Paths Reference (Absolute Paths)

**Important Absolute Paths:**

- **Test directory**: `/Users/greir/projects/gthanks-dev/tests/e2e/`
- **Config file**: `/Users/greir/projects/gthanks-dev/playwright.config.ts`
- **Auth helper**: `/Users/greir/projects/gthanks-dev/tests/e2e/helpers/auth.helper.ts`
- **DB helper**: `/Users/greir/projects/gthanks-dev/tests/e2e/helpers/database.helper.ts`
- **Database client**: `/Users/greir/projects/gthanks-dev/src/lib/db.ts`
- **Auth config**: `/Users/greir/projects/gthanks-dev/src/lib/auth.ts`
- **Test results**: `/Users/greir/projects/gthanks-dev/test-results/`
- **HTML report**: `/Users/greir/projects/gthanks-dev/playwright-report/`
- **Fixtures**: `/Users/greir/projects/gthanks-dev/tests/e2e/fixtures/`

## Next Steps

**Getting Started:**

1. **Verify installation:**

```bash
pnpm exec playwright --version
```

2. **Install browsers (if needed):**

```bash
pnpm exec playwright install chromium
```

3. **Run smoke tests:**

```bash
pnpm exec playwright test smoke.spec.ts --headed
```

4. **Open UI mode:**

```bash
pnpm exec playwright test --ui
```

5. **Explore existing tests:**

```bash
ls /Users/greir/projects/gthanks-dev/tests/e2e/core/
cat /Users/greir/projects/gthanks-dev/tests/e2e/smoke.spec.ts
```

6. **Create new test:**

```bash
# Choose appropriate directory:
touch /Users/greir/projects/gthanks-dev/tests/e2e/core/my-feature.spec.ts
```

7. **Run your test:**

```bash
pnpm exec playwright test my-feature.spec.ts --ui
```

## Additional Resources

**Documentation:**

- Playwright Official: https://playwright.dev/
- Integration Tests: `/Users/greir/projects/gthanks-dev/tests/README.md`
- Project Guidelines: `/Users/greir/projects/gthanks-dev/CLAUDE.md`
- Database Schema: `/Users/greir/projects/gthanks-dev/prisma/schema.prisma`

**Common Questions:**

**Q: E2E vs Integration tests?**
A: E2E uses real browser + real DB. Integration tests use mocks. E2E is slower but tests full user experience.

**Q: Which should I write first?**
A: Start with smoke tests, then critical path (auth → wishlist → reserve).

**Q: How to speed up tests?**
A: Use chromium only (default), run in parallel (default), use auth helpers (skip login UI).

**Q: How to handle flaky tests?**
A: Use proper waits (no `waitForTimeout`), retries are configured (2x), check for race conditions.

**Q: Can I run tests without stopping dev server?**
A: Yes, but use different database file to avoid locks: `DATABASE_URL=file:./data/test-e2e.db`

**Q: How to test with multiple users?**
A: Use separate browser contexts (see example above in "Test with Multiple Users").

**Q: How to test email flows?**
A: For MVP, use direct session creation (auth helper). Post-MVP, add email interception.

**Q: How to test file uploads?**
A: Use `page.setInputFiles()` - see Playwright docs for examples.

---

**This guide is optimized for AI coding agents. All examples use absolute paths and include complete working code.**
