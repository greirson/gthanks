# Core User Journey E2E Tests

## Overview

This test suite covers the most critical end-to-end user workflows in the gthanks MVP application. These tests verify that the complete user experience works correctly from signup through reservation, ensuring the core mission of preventing duplicate gifts is achieved.

## Test File

**Location**: `/Users/greir/projects/gthanks-dev/tests/e2e/core/user-journey.spec.ts`

## Tests Covered

### 1. End-to-End Happy Path

**Purpose**: Verifies the complete user journey that prevents duplicate gifts

**Steps**:

1. New user signs up
2. Creates a wish with title, price, notes, and priority (3 stars)
3. Creates a wishlist "My Wishlist"
4. Adds wish to list
5. Creates a family group "Family"
6. Shares list with group
7. Second user (gift giver) joins group and reserves the wish
8. Verifies complete flow succeeds without errors
9. **CRITICAL**: Verifies reservation privacy is maintained (owner cannot see who reserved)

**Key Assertions**:

- All data entities created successfully (wish, list, group)
- Relationships established correctly (list-wish, list-group, user-group)
- Reservation created with gift giver details
- Privacy maintained at database level

### 2. Wish CRUD with Image and Priority

**Purpose**: Tests the complete lifecycle of wish management

**Steps**:

1. Create wish with full metadata:
   - Title: "Gaming Laptop"
   - Price: $1,299.99
   - Priority: 3 stars (wishLevel: 3)
   - Notes: "For work and gaming"
2. Verify wish appears with all details
3. Edit wish to change priority from 3 to 2 stars
4. Verify changes persist
5. Delete wish
6. Verify removal from all lists (cascading delete)

**Key Assertions**:

- Wish created with correct metadata
- Priority updates correctly
- Wish deleted from database
- ListWish junction records also deleted

### 3. List Visibility Changes

**Purpose**: Tests different list visibility modes and access controls

**Steps**:

1. Create private list
2. Assert list is private with no share token
3. Change to public via API
4. Assert share token generated
5. Change to password-protected via API
6. Assert password is set (hashed)
7. Verify share URL is accessible

**Key Assertions**:

- Visibility transitions work correctly (private → public → password)
- Share token generated when needed
- Password hashed in database
- List owner retains access regardless of visibility

### 4. Co-Admin Workflow

**Purpose**: Tests list co-administration and permission boundaries

**Steps**:

1. Owner creates list
2. Owner adds User B as co-admin
3. Verify co-admin record exists in database
4. Co-admin edits list name
5. Verify changes save successfully
6. Verify only owner can delete list
7. Owner removes User B as co-admin
8. Verify co-admin record removed

**Key Assertions**:

- ListAdmin junction table records created/deleted correctly
- Co-admin can edit list
- List ownerId remains unchanged
- Co-admin removal works correctly

## Test Approach

### Hybrid Testing Strategy

These tests use a **hybrid approach** combining database operations and API calls:

- **Data Setup**: Direct database operations using Prisma for speed and reliability
- **Business Logic**: API calls to test actual endpoints
- **Verification**: Database queries to verify state

**Why This Approach?**

- **Reliable**: Avoids flaky UI interactions that depend on exact selectors
- **Fast**: Database operations are much faster than UI automation
- **Focused**: Tests business logic and data integrity, not UI implementation details
- **Maintainable**: Less brittle than tests coupled to specific UI components

### What's Tested

✅ **Data Integrity**: All database relationships and constraints
✅ **Business Logic**: API endpoints and reservation flow
✅ **Core Workflows**: Complete user journeys from start to finish
✅ **Privacy Rules**: Reservation privacy at database level

### What's NOT Tested

❌ UI component rendering
❌ Specific button/form selectors
❌ CSS/styling
❌ Client-side JavaScript interactions

These are intentionally left to component/UI tests which are better suited for visual verification.

## Running the Tests

```bash
# Run all core user journey tests
pnpm exec playwright test tests/e2e/core/user-journey.spec.ts

# Run on specific browser
pnpm exec playwright test tests/e2e/core/user-journey.spec.ts --project=chromium

# Run sequentially (better for debugging)
pnpm exec playwright test tests/e2e/core/user-journey.spec.ts --workers=1

# Run with UI mode for debugging
pnpm exec playwright test tests/e2e/core/user-journey.spec.ts --ui

# Run specific test
pnpm exec playwright test tests/e2e/core/user-journey.spec.ts -g "End-to-End Happy Path"
```

## Test Results

**Status**: ✅ All 4 tests passing

```
✓  Test 1: End-to-End Happy Path (1.1s)
✓  Test 2: Wish CRUD with Image and Priority (110ms)
✓  Test 3: List Visibility Changes (1.0s)
✓  Test 4: Co-Admin Workflow (147ms)

Total: 4 passed (3.3s)
```

## Test Data Cleanup

All tests include proper cleanup in `finally` blocks using the `cleanupTestData()` helper. This ensures test isolation and prevents data leakage between test runs.

## Dependencies

- **Playwright**: E2E test framework
- **Prisma**: Database ORM for direct data access
- **Test Helpers**: Auth, database, and navigation helpers from `/tests/e2e/helpers/`

## Future Enhancements

These tests focus on MVP functionality. Future enhancements could include:

- UI-specific tests for component rendering
- Performance benchmarks
- Load testing for concurrent reservations
- Email delivery verification
- Mobile responsive testing
- Accessibility testing (WCAG compliance)

## Maintenance Notes

- Tests are designed to be **resilient** to UI changes
- Database schema changes will require test updates
- API endpoint changes will require test updates
- Test helpers are shared across all E2E tests for consistency
