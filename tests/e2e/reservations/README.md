# Reservation Privacy E2E Tests

## Overview

This directory contains E2E tests for the **HIGHEST PRIORITY** feature of the gthanks MVP: **Reservation Privacy**.

The core mission is that wish owners **CANNOT** see who reserved their wishes, preventing duplicate gifts through hidden reservation information.

## Test Files

### `privacy.spec.ts` - HIGHEST PRIORITY

Comprehensive tests for reservation privacy covering:

1. **Owner Cannot See Reserver Details** - Verifies that:
   - Wish owner sees only "Reserved" status
   - Reserver name is NOT visible to owner
   - Reserver email is NOT visible to owner
   - Owner cannot unreserve wishes
   - API responses filter out reserver details

2. **Reserver Can View and Cancel Own Reservation** - Verifies that:
   - Reserver can see their own reservations
   - Reserver can cancel their reservations
   - Wish becomes available again after cancellation
   - Owner sees updated status after cancellation

3. **Concurrent Reservation Attempt (Race Condition)** - Verifies that:
   - Only one reservation succeeds when two users try simultaneously
   - Failed request shows appropriate error message
   - Database maintains exactly 1 reservation per wish
   - Rapid sequential attempts are properly handled

4. **Additional Privacy Edge Cases** - Verifies that:
   - Group admins (not owners) cannot see reserver details
   - Reservers cannot see other users' reservations

## Running the Tests

### Prerequisites

1. Ensure the development server is running or will be auto-started by Playwright
2. Database should be in a clean state (tests handle cleanup)

### Run All Reservation Privacy Tests

```bash
# Run all tests in this file
npx playwright test tests/e2e/reservations/privacy.spec.ts

# Run with UI mode (interactive)
npx playwright test tests/e2e/reservations/privacy.spec.ts --ui

# Run in headed mode (see browser)
npx playwright test tests/e2e/reservations/privacy.spec.ts --headed

# Run specific test
npx playwright test tests/e2e/reservations/privacy.spec.ts -g "owner sees only Reserved status"
```

### Run Single Browser

```bash
# Chromium only (fastest)
npx playwright test tests/e2e/reservations/privacy.spec.ts --project=chromium

# Firefox only
npx playwright test tests/e2e/reservations/privacy.spec.ts --project=firefox

# WebKit only
npx playwright test tests/e2e/reservations/privacy.spec.ts --project=webkit
```

### Debug Mode

```bash
# Debug with inspector
npx playwright test tests/e2e/reservations/privacy.spec.ts --debug

# Generate trace for debugging
npx playwright test tests/e2e/reservations/privacy.spec.ts --trace on
```

## Test Architecture

### Database Setup

Tests use helper functions from `tests/e2e/helpers/database.helper.ts`:

- `createCompleteTestScenario()` - Creates users, groups, lists, and wishes
- `cleanupTestData()` - Removes test data after each test
- `getReservationByWishId()` - Verifies database state
- `countReservationsForWish()` - Ensures only 1 reservation per wish

### Authentication

Tests use helper functions from `tests/e2e/helpers/auth.helper.ts`:

- `loginAsUser()` - Direct session creation (faster than magic links)
- `createAndLoginUser()` - Creates user and logs in
- Session tokens are injected via cookies

### Test Data Cleanup

Each test includes cleanup in `finally` blocks to ensure:

- No test data persists between runs
- Database remains in clean state
- Tests can be run repeatedly without conflicts

## Expected Behavior

### Owner View (Critical Privacy Requirements)

When a wish is reserved, the owner should see:

- ✅ "Reserved" indicator or badge
- ❌ NO reserver name
- ❌ NO reserver email
- ❌ NO cancel/unreserve button

### Reserver View

When a wish is reserved by the current user, they should see:

- ✅ Indication that they reserved it ("You reserved", "Reserved by you", etc.)
- ✅ Cancel/Unreserve button
- ✅ Wish details (title, price, etc.)

### Other Users View

When viewing a list with reserved wishes:

- ✅ "Reserved" indicator
- ❌ NO reserver identity
- ❌ Cannot reserve already-reserved wishes

## Critical Assertions

The tests include detailed assertions marked with "CRITICAL" comments:

```typescript
// CRITICAL PRIVACY VIOLATION: Owner should NOT see reserver name
await expect(page.getByText(reserver.name, { exact: true })).not.toBeVisible();

// CRITICAL ERROR: Owner should NOT have cancel reservation button
expect(ownerCancelButtonCount).toBe(0);

// CRITICAL RACE CONDITION ERROR: Exactly one reservation should succeed
expect(success1 !== success2).toBeTruthy();
```

## Troubleshooting

### Tests Fail Due to UI Changes

If UI selectors change, update the locators in `privacy.spec.ts`:

```typescript
const reserveButton = page.locator(
  `button:has-text("Reserve"),
   button:has-text("Mark as Reserved"),
   [data-testid="reserve-btn-${targetWish.id}"]`
);
```

### Database Connection Issues

Ensure `DATABASE_URL` is set in `.env.test`:

```env
DATABASE_URL=file:./data/test.db
```

### Race Condition Tests Flaky

If concurrent reservation tests are flaky:

1. Check database transaction isolation
2. Verify unique constraint on `Reservation.wishId`
3. Ensure API properly handles concurrent requests

### Cleanup Failures

If tests fail to cleanup:

```bash
# Manual cleanup
npx prisma db push --force-reset
pnpm db:push
```

## Success Criteria

All tests should pass with:

- ✅ No privacy violations (owner never sees reserver identity)
- ✅ No duplicate reservations
- ✅ Proper error handling for concurrent attempts
- ✅ Clean database state after each test

## Related Files

- `/src/app/api/reservations/route.ts` - Reservation creation API
- `/src/app/api/reservations/[reservationId]/route.ts` - Reservation deletion API
- `/src/lib/services/reservation-service.ts` - Reservation business logic
- `/prisma/schema.prisma` - Reservation model definition

## Notes

- These tests verify the **core MVP feature** - preventing duplicate gifts
- Privacy is the #1 requirement - all tests enforce it
- Tests use real database operations (not mocked)
- Cleanup ensures tests are idempotent and can be run repeatedly
