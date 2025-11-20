# E2E Test Helpers Documentation

Comprehensive helper utilities for writing Playwright E2E tests in the gthanks application.

## Quick Start

```typescript
import { test, expect } from '@playwright/test';
import {
  createAndLoginUser,
  createWish,
  createList,
  goToWishes,
  waitForToast,
  cleanupTestData,
} from './helpers';

test('complete user flow', async ({ page }) => {
  // 1. Create and login user
  const user = await createAndLoginUser(page, {
    email: `test-${Date.now()}@example.com`,
    name: 'Test User',
  });

  // 2. Create test data
  const wish = await createWish(user.id, {
    title: 'Wireless Headphones',
    price: 199.99,
    wishLevel: 3,
  });

  // 3. Navigate to page
  await goToWishes(page);

  // 4. Verify functionality
  await expect(page.locator('text=Wireless Headphones')).toBeVisible();

  // 5. Cleanup
  await cleanupTestData([user.id]);
});
```

---

## Helper Modules

### 1. Authentication Helpers (`auth.helper.ts`)

#### `createAndLoginUser(page, userData)`

Create a new test user and automatically log them in (bypasses magic link).

**Parameters:**

- `page`: Playwright page instance
- `userData`: Object with `email`, `name`, optional `isAdmin` and `role`

**Returns:** `TestUser` object with `id`, `email`, `name`, `isAdmin`, `role`

```typescript
const user = await createAndLoginUser(page, {
  email: 'newuser@example.com',
  name: 'Test User',
  isAdmin: false, // optional
  role: 'user', // optional
});
```

#### `loginAsUser(page, email)`

Login an existing user by email.

```typescript
const user = await loginAsUser(page, 'existing@example.com');
```

#### `createTestUsers()`

Create multiple test users with different roles (owner, member, admin, giver).

```typescript
const { owner, member, admin, giver } = await createTestUsers();
```

#### `logout(page)`

Logout the current user.

```typescript
await logout(page);
```

#### `isLoggedIn(page)`

Check if a user is currently logged in.

```typescript
const loggedIn = await isLoggedIn(page); // returns boolean
```

#### `getSessionToken(page)`

Get the current session token from cookies.

```typescript
const token = await getSessionToken(page); // returns string | null
```

#### `waitForAuth(page, timeoutMs?)`

Wait for authentication to complete after login actions.

```typescript
await waitForAuth(page, 5000);
```

---

### 2. Database Helpers (`database.helper.ts`)

#### `createWish(userId, wishData)`

Create a test wish for a user.

**Parameters:**

- `userId`: User ID who owns the wish
- `wishData`: Object with wish properties

```typescript
const wish = await createWish(user.id, {
  title: 'Wireless Headphones',
  notes: 'Noise-cancelling',
  url: 'https://example.com/headphones',
  price: 199.99,
  currency: 'USD', // optional, defaults to 'USD'
  wishLevel: 3, // 1-3, optional, defaults to 1
  quantity: 1, // optional, defaults to 1
  size: 'Medium', // optional
  color: 'Black', // optional
});
```

#### `createList(userId, listData)`

Create a test list for a user.

```typescript
const list = await createList(user.id, {
  name: 'Birthday Wishlist',
  description: 'My birthday wishes', // optional
  visibility: 'private', // optional: 'private', 'public', 'group'
});
```

#### `createGroup(userId, groupData)`

Create a test group with the user as admin.

```typescript
const group = await createGroup(user.id, {
  name: 'Family Group',
  description: 'Our family wishlist group', // optional
  avatarUrl: 'https://example.com/avatar.jpg', // optional
});
```

#### `addWishToList(wishId, listId, wishLevel?)`

Add a wish to a list.

```typescript
await addWishToList(wish.id, list.id, 2); // wishLevel optional
```

#### `addUserToGroup(userId, groupId, role?)`

Add a user to a group.

```typescript
await addUserToGroup(user.id, group.id, 'member'); // role: 'member' | 'admin'
```

#### `shareListWithGroup(listId, groupId, sharedBy)`

Share a list with a group.

```typescript
await shareListWithGroup(list.id, group.id, owner.id);
```

#### `createReservation(wishId, reserverEmail?, reserverName?)`

Create a gift reservation.

```typescript
await createReservation(wish.id, 'giver@example.com', 'John Doe');
```

#### `seedTestData()`

Create a complete test scenario with users, wishes, lists, and groups.

```typescript
const { users, wishes, list, group } = await seedTestData();
// users: { owner, member1, member2 }
// wishes: array of 3 wishes
// list: created list
// group: created group
```

#### `cleanupTestData(userIds?)`

Clean up test data. Pass user IDs to clean specific users, or omit to clean ALL data.

**⚠️ WARNING:** Calling without arguments will delete ALL data in the database!

```typescript
// Clean specific users (recommended)
await cleanupTestData([user1.id, user2.id]);

// Clean ALL data (use with extreme caution!)
await cleanupTestData();
```

#### `resetDatabase(seedAfter?)`

Full database reset, optionally seed fresh data after cleanup.

```typescript
// Just reset
await resetDatabase();

// Reset and seed fresh data
const data = await resetDatabase(true);
```

#### Query Helpers

```typescript
// Get user data
const wishes = await getUserWishes(userId);
const lists = await getUserLists(userId);
const groups = await getUserGroups(userId);

// Get reservation data
const reservation = await getReservationByWishId(wishId);
const count = await countReservationsForWish(wishId);

// Get counts for debugging
const counts = await getDatabaseCounts();
console.log(counts); // { users: 5, wishes: 10, lists: 3, groups: 2, reservations: 1, sessions: 3 }

// Get group/list details
const group = await getGroup(groupId); // includes members and lists
const list = await getList(listId); // includes wishes and reservations

// Check group membership
const isMember = await isGroupMember(userId, groupId);

// Get pending invitations
const invitations = await getPendingInvitations('user@example.com');
```

---

### 3. Navigation Helpers (`navigation.helper.ts`)

#### Page Navigation

```typescript
// Main pages
await goToWishes(page);
await goToLists(page);
await goToGroups(page);
await goToProfile(page);
await goToSettings(page);
await goToAdmin(page);
await goToHome(page);
await goToLogin(page);

// Detail pages
await goToListDetail(page, listId);
await goToGroupDetail(page, groupId);

// Shared list
await goToSharedList(page, shareToken);
```

All navigation functions accept an optional `waitForLoad` parameter (default: `true`):

```typescript
await goToWishes(page, false); // Don't wait for page load
```

#### Waiting Utilities

```typescript
// Wait for page to fully load
await waitForPageLoad(page, 30000); // timeoutMs optional

// Wait for toast notification
await waitForToast(page, 'Success message', 5000); // message and timeout optional

// Wait for element to appear
const button = await waitForElement(page, '[data-testid="submit-btn"]', 5000);

// Wait for element to disappear
await waitForElementToDisappear(page, '.loading-spinner', 5000);

// Wait for loading spinner to disappear
await waitForLoadingComplete(page, 10000);

// Wait for specific text
await waitForText(page, 'Welcome back!', 5000);
```

#### Interaction Helpers

```typescript
// Click and wait for navigation
await clickAndNavigate(page, 'a[href="/wishes"]', true); // waitForLoad optional

// Fill form field with validation wait
await fillAndWait(page, '[name="email"]', 'user@example.com', 300); // wait ms optional

// Scroll to element
await scrollToElement(page, '#bottom-section');
```

#### Utility Functions

```typescript
// Get current URL path
const path = await getCurrentPath(page); // returns '/wishes'

// Check if on specific page
const onWishesPage = await isOnPage(page, '/wishes'); // returns boolean

// Check element visibility
const visible = await isVisible(page, '#my-element'); // returns boolean

// Wait for API response
const response = await waitForApiResponse(page, '/api/wishes', 10000);

// Take screenshot for debugging
await takeScreenshot(page, 'error-state');

// Page actions
await reloadPage(page, true); // waitForLoad optional
await goBack(page, true); // waitForLoad optional
```

---

## Complete Examples

### Example 1: User Creates Wish and Adds to List

```typescript
import { test, expect } from '@playwright/test';
import {
  createAndLoginUser,
  goToWishes,
  goToLists,
  waitForToast,
  cleanupTestData,
} from './helpers';

test('user creates wish and adds to list', async ({ page }) => {
  // Setup
  const user = await createAndLoginUser(page, {
    email: `test-${Date.now()}@example.com`,
    name: 'Test User',
  });

  // Navigate to wishes
  await goToWishes(page);

  // Create wish
  await page.click('text=Create Wish');
  await page.fill('[name="title"]', 'Mechanical Keyboard');
  await page.fill('[name="price"]', '149.99');
  await page.click('[data-testid="wish-level-3"]');
  await page.click('button[type="submit"]');
  await waitForToast(page, 'Wish created');

  // Create list
  await goToLists(page);
  await page.click('text=Create List');
  await page.fill('[name="name"]', 'Tech Essentials');
  await page.click('button[type="submit"]');
  await waitForToast(page, 'List created');

  // Add wish to list
  await goToWishes(page);
  await page.click('[data-wish="Mechanical Keyboard"] button:has-text("Add to List")');
  await page.click('text=Tech Essentials');
  await waitForToast(page, 'Added to list');

  // Verify
  await goToLists(page);
  await page.click('text=Tech Essentials');
  await expect(page.locator('text=Mechanical Keyboard')).toBeVisible();

  // Cleanup
  await cleanupTestData([user.id]);
});
```

### Example 2: Group Sharing and Reservation

```typescript
import { test, expect } from '@playwright/test';
import {
  createTestUsers,
  createWish,
  createList,
  createGroup,
  addWishToList,
  addUserToGroup,
  shareListWithGroup,
  loginAsUser,
  goToGroups,
  waitForToast,
  cleanupTestData,
} from './helpers';

test('group member can reserve gift', async ({ page, context }) => {
  // Setup users
  const { owner, giver } = await createTestUsers();

  // Create wish and list as owner
  const wish = await createWish(owner.id, {
    title: 'Gaming Console',
    price: 499.99,
    wishLevel: 3,
  });

  const list = await createList(owner.id, {
    name: 'Holiday Wishlist',
  });

  await addWishToList(wish.id, list.id);

  // Create group and add members
  const group = await createGroup(owner.id, {
    name: 'Family',
  });

  await addUserToGroup(giver.id, group.id, 'member');

  // Share list with group
  await shareListWithGroup(list.id, group.id, owner.id);

  // Login as giver and reserve
  await loginAsUser(page, giver.email);
  await goToGroups(page);
  await page.click(`text=${group.name}`);
  await page.click('text=Holiday Wishlist');
  await page.click(`[data-wish-id="${wish.id}"] button:has-text("Reserve")`);
  await waitForToast(page, 'Gift reserved');

  // Verify reservation hidden from owner
  const ownerPage = await context.newPage();
  await loginAsUser(ownerPage, owner.email);
  await goToGroups(ownerPage);
  await ownerPage.click(`text=${group.name}`);
  await ownerPage.click('text=Holiday Wishlist');

  // Owner should not see "Reserved" badge
  await expect(ownerPage.locator(`[data-wish-id="${wish.id}"] text=Reserved`)).not.toBeVisible();

  // Cleanup
  await cleanupTestData([owner.id, giver.id]);
});
```

### Example 3: Database Setup with UI Verification

```typescript
import { test, expect } from '@playwright/test';
import {
  createAndLoginUser,
  createWish,
  createList,
  addWishToList,
  goToLists,
  cleanupTestData,
} from './helpers';

test('verify list displays wishes with correct prices', async ({ page }) => {
  // Setup: Create all data in database (fast)
  const user = await createAndLoginUser(page, {
    email: `test-${Date.now()}@example.com`,
    name: 'Test User',
  });

  const wish1 = await createWish(user.id, {
    title: 'Book',
    price: 29.99,
    wishLevel: 1,
  });

  const wish2 = await createWish(user.id, {
    title: 'Headphones',
    price: 149.99,
    wishLevel: 3,
  });

  const list = await createList(user.id, {
    name: 'My Wishlist',
  });

  await addWishToList(wish1.id, list.id);
  await addWishToList(wish2.id, list.id);

  // Test: Verify UI displays data correctly
  await goToLists(page);
  await page.click('text=My Wishlist');

  await expect(page.locator('text=Book')).toBeVisible();
  await expect(page.locator('text=$29.99')).toBeVisible();
  await expect(page.locator('text=Headphones')).toBeVisible();
  await expect(page.locator('text=$149.99')).toBeVisible();

  // Cleanup
  await cleanupTestData([user.id]);
});
```

---

## Best Practices

### 1. Always Clean Up Test Data

```typescript
test.afterEach(async () => {
  await cleanupTestData([userId]);
});
```

### 2. Use Unique Identifiers

```typescript
const user = await createAndLoginUser(page, {
  email: `test-${Date.now()}@example.com`, // Unique email
  name: 'Test User',
});
```

### 3. Setup Data in Database, Test UI

```typescript
// Good: Fast setup, focused testing
const wish = await createWish(user.id, { title: 'Test' });
await goToWishes(page);
await expect(page.locator('text=Test')).toBeVisible();

// Bad: Slow, tests multiple things at once
await goToWishes(page);
await page.click('Create Wish');
await page.fill('[name="title"]', 'Test');
await page.click('Submit');
await expect(page.locator('text=Test')).toBeVisible();
```

### 4. Use Navigation Helpers

```typescript
// Good: Consistent navigation with auto-waiting
await goToWishes(page);

// Bad: Manual navigation, may need explicit waits
await page.goto('/wishes');
await page.waitForLoadState('networkidle');
```

### 5. Wait for Operations to Complete

```typescript
await page.click('button[type="submit"]');
await waitForToast(page, 'Success'); // Verify operation completed
await page.fill('input', 'value');
```

---

## Debugging Tips

### 1. Use UI Mode (Recommended)

```bash
npx playwright test --ui
```

### 2. Use Debug Mode

```bash
npx playwright test --debug
```

### 3. Take Screenshots

```typescript
import { takeScreenshot } from './helpers';

await takeScreenshot(page, 'before-error');
```

### 4. Check Database State

```typescript
import { getDatabaseCounts } from './helpers';

const counts = await getDatabaseCounts();
console.log('Database state:', counts);
```

### 5. Run Single Test

```bash
npx playwright test sample.spec.ts:23
```

---

## Environment Variables

Configure base URL:

```bash
PLAYWRIGHT_BASE_URL=http://localhost:3000
```

---

## Common Patterns

### Pattern 1: Test with Multiple Users

```typescript
const { owner, member } = await createTestUsers();
await loginAsUser(page, owner.email);
// ... test as owner
await logout(page);
await loginAsUser(page, member.email);
// ... test as member
```

### Pattern 2: Test Form Validation

```typescript
await goToWishes(page);
await page.click('text=Create Wish');
await page.click('button[type="submit"]'); // Submit empty form
await expect(page.locator('text=Title is required')).toBeVisible();
```

### Pattern 3: Test Permissions

```typescript
const { owner, member } = await createTestUsers();
const list = await createList(owner.id, { name: 'Private List' });

await loginAsUser(page, member.email);
await page.goto(`/lists/${list.id}`);
await expect(page.locator('text=Access denied')).toBeVisible();
```

---

## Additional Resources

- [Playwright Documentation](https://playwright.dev)
- [Playwright Best Practices](https://playwright.dev/docs/best-practices)
- [Test Selectors](https://playwright.dev/docs/selectors)
- [Debugging Tests](https://playwright.dev/docs/debug)
