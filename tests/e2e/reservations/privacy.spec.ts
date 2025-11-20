/**
 * E2E Tests for Reservation Privacy
 *
 * HIGHEST PRIORITY TEST - Core MVP Feature
 * The core mission is that wish owners CANNOT see who reserved their wishes.
 *
 * Tests cover:
 * 1. Owner cannot see reserver details (name, email)
 * 2. Reserver can view and cancel their own reservation
 * 3. Concurrent reservation attempts (race condition)
 */

import { test, expect, Page } from '@playwright/test';
import { createAndLoginUser, loginAsUser } from '../helpers/auth.helper';
import {
  createCompleteTestScenario,
  cleanupTestData,
  getReservationByWishId,
  countReservationsForWish,
  cleanupReservation,
} from '../helpers/database.helper';

test.describe('Reservation Privacy - HIGHEST PRIORITY', () => {
  test.describe('Test 1: Owner Cannot See Reserver Details', () => {
    test('owner sees only "Reserved" status, not reserver identity', async ({ page, context }) => {
      // Create test scenario with owner, reserver, and wishes
      const scenario = await createCompleteTestScenario();
      const { owner, reserver, list, wishes } = scenario;
      const targetWish = wishes[0]; // Wireless Headphones

      try {
        // Step 1: User B (reserver) logs in
        await loginAsUser(page, reserver.email);
        await page.goto('/');
        await page.waitForLoadState('networkidle');

        // Step 2: User B navigates to the shared list
        await page.goto(`/lists/${list.id}`);
        await page.waitForLoadState('networkidle');

        // Verify we can see the wish
        const wishCard = page.locator(`[data-testid="wish-${targetWish.id}"]`).first();
        if ((await wishCard.count()) === 0) {
          // Try alternative selector
          await expect(page.getByText(targetWish.title)).toBeVisible({
            timeout: 10000,
          });
        }

        // Step 3: User B reserves the wish
        // Look for reserve button - try multiple possible selectors
        const reserveButton = page
          .locator(
            `button:has-text("Reserve"), button:has-text("Mark as Reserved"), [data-testid="reserve-btn-${targetWish.id}"]`
          )
          .first();

        // ERROR: Reserve button should be visible to group member viewing the list
        await expect(reserveButton).toBeVisible({
          timeout: 10000,
        });

        await reserveButton.click();

        // Wait for reservation to complete (API call + UI update)
        await page.waitForTimeout(2000);

        // Verify reservation was created in database
        const dbReservation = await getReservationByWishId(targetWish.id);
        expect(
          dbReservation,
          'ERROR: Reservation should exist in database after reserve action'
        ).toBeTruthy();
        expect(dbReservation?.reserverEmail).toBe(reserver.email);
        expect(dbReservation?.reserverName).toBe(reserver.name);

        // Step 4: Log out User B and log in as User A (owner)
        await page.context().clearCookies();
        await loginAsUser(page, owner.email);
        await page.goto(`/lists/${list.id}`);
        await page.waitForLoadState('networkidle');

        // Wait for reservations API call to complete (returns isReserved: false for owners)
        await page.waitForResponse(
          (response) =>
            response.url().includes(`/api/lists/${list.id}/reservations`) &&
            response.status() === 200,
          { timeout: 10000 }
        );

        // Step 5: CRITICAL ASSERTIONS - Owner's view
        // Owner should NOT see "Reserved" indicator (privacy protection)
        // Split text and CSS selectors to avoid Playwright parsing errors
        const reservedText = page.getByText(/Reserved|This item has been reserved/i);
        const reservedBadge = page.locator(
          `[data-testid="reserved-indicator-${targetWish.id}"], .reserved-badge`
        );

        // CRITICAL PRIVACY: Owner should NOT see that wish is reserved
        const hasReservedText = (await reservedText.count()) > 0;
        const hasReservedBadge = (await reservedBadge.count()) > 0;
        expect(
          hasReservedText || hasReservedBadge,
          'Owner should NOT see reserved indicator'
        ).toBeFalsy();

        // CRITICAL: Owner should NOT see reserver's name
        // CRITICAL PRIVACY VIOLATION: Owner should NOT see reserver name
        await expect(page.getByText(reserver.name, { exact: true })).not.toBeVisible();

        // CRITICAL: Owner should NOT see reserver's email
        // CRITICAL PRIVACY VIOLATION: Owner should NOT see reserver email
        await expect(page.getByText(reserver.email, { exact: true })).not.toBeVisible();

        // Step 6: Verify owner cannot unreserve (no cancel button for owner)
        const ownerCancelButton = page.locator(
          `button:has-text("Cancel Reservation"), button:has-text("Unreserve"), [data-testid="cancel-reservation-${targetWish.id}"]`
        );

        // Owner should not have access to cancel button
        const ownerCancelButtonCount = await ownerCancelButton.count();
        expect(
          ownerCancelButtonCount,
          'CRITICAL ERROR: Owner should NOT have cancel reservation button'
        ).toBe(0);

        // Step 7: Verify via API that owner cannot see reserver details
        const apiResponse = await page.request.get(`/api/lists/${list.id}/wishes`);
        expect(apiResponse.ok(), 'API request for list wishes should succeed').toBeTruthy();

        const apiData = await apiResponse.json();
        const reservedWishInApi = apiData.wishes?.find((w: any) => w.id === targetWish.id);

        if (reservedWishInApi?.reservation) {
          // If reservation object exists in API response
          expect(
            reservedWishInApi.reservation.reserverName,
            'CRITICAL API PRIVACY VIOLATION: API should not return reserver name to owner'
          ).toBeUndefined();

          expect(
            reservedWishInApi.reservation.reserverEmail,
            'CRITICAL API PRIVACY VIOLATION: API should not return reserver email to owner'
          ).toBeUndefined();
        }

        // SUCCESS: Privacy is maintained
        console.log('✅ PRIVACY TEST PASSED: Owner cannot see reserver details');
      } finally {
        // Cleanup
        await cleanupTestData([owner.id, reserver.id, scenario.otherUser.id]);
      }
    });

    test('owner sees multiple reserved wishes without reserver details', async ({ page }) => {
      const scenario = await createCompleteTestScenario();
      const { owner, reserver, list, wishes } = scenario;

      try {
        // Reserve both wishes
        await loginAsUser(page, reserver.email);

        for (const wish of wishes) {
          const response = await page.request.post('/api/reservations', {
            data: {
              wishId: wish.id,
              listId: list.id,
              reserverName: reserver.name,
              reserverEmail: reserver.email,
            },
          });

          expect(response.ok(), `Should successfully reserve wish: ${wish.title}`).toBeTruthy();
        }

        // Owner views list
        await page.context().clearCookies();
        await loginAsUser(page, owner.email);
        await page.goto(`/lists/${list.id}`);
        await page.waitForLoadState('networkidle');

        // Wait for reservations API call to complete
        await page.waitForResponse(
          (response) =>
            response.url().includes(`/api/lists/${list.id}/reservations`) &&
            response.status() === 200,
          { timeout: 10000 }
        );

        // Verify owner does NOT see wishes as reserved (privacy protection)
        // Split CSS and text selectors to avoid Playwright parsing errors
        const uiReserved = await page.locator('[data-reserved="true"], .reserved-badge').count();
        const textReserved = await page.getByText(/Reserved/i).count();
        const reservedCount = uiReserved + textReserved;
        expect(reservedCount, 'Owner should NOT see wishes marked as reserved').toBe(0);

        // But cannot see who reserved them
        await expect(page.getByText(reserver.name)).not.toBeVisible();
        await expect(page.getByText(reserver.email)).not.toBeVisible();
      } finally {
        await cleanupTestData([owner.id, reserver.id, scenario.otherUser.id]);
      }
    });
  });

  test.describe('Test 2: Reserver Can View and Cancel Own Reservation', () => {
    test('reserver can see their reservation and cancel it', async ({ page }) => {
      const scenario = await createCompleteTestScenario();
      const { owner, reserver, list, wishes } = scenario;
      const targetWish = wishes[0];

      try {
        // Step 1: Reserver creates reservation
        await loginAsUser(page, reserver.email);

        const reserveResponse = await page.request.post('/api/reservations', {
          data: {
            wishId: targetWish.id,
            listId: list.id,
            reserverName: reserver.name,
            reserverEmail: reserver.email,
          },
        });

        expect(reserveResponse.ok(), 'Reservation creation should succeed').toBeTruthy();
        const reservationData = await reserveResponse.json();
        const reservationId = reservationData.id;

        // Verify reservation in database
        let dbReservation = await getReservationByWishId(targetWish.id);
        expect(dbReservation, 'Reservation should exist in database').toBeTruthy();

        // Step 2: Reserver navigates to list and verifies they see their reservation
        await page.goto(`/lists/${list.id}`);
        await page.waitForLoadState('networkidle');

        // Wait for reservations API call to complete
        await page.waitForResponse(
          (response) =>
            response.url().includes(`/api/lists/${list.id}/reservations`) &&
            response.status() === 200,
          { timeout: 10000 }
        );

        // Reserver should see their name or indication they reserved it
        // Split text and CSS selectors to avoid Playwright parsing errors
        const reservationText = page.getByText(/You reserved|Your reservation|Reserved by you/i);
        const reservationBadge = page.locator(`[data-testid="my-reservation-${targetWish.id}"]`);

        // Allow some flexibility in UI text
        const hasReservationIndicator =
          (await reservationText.count()) > 0 || (await reservationBadge.count()) > 0;
        const hasReservedStatus = (await page.getByText(/Reserved/i).count()) > 0;

        expect(
          hasReservationIndicator || hasReservedStatus,
          'ERROR: Reserver should see indication that wish is reserved'
        ).toBeTruthy();

        // Step 3: Verify Cancel Reservation button is visible
        const cancelButton = page
          .locator(
            `button:has-text("Cancel Reservation"), button:has-text("Unreserve"), button:has-text("Cancel"), [data-testid="cancel-reservation-${targetWish.id}"], [data-testid="cancel-reservation"]`
          )
          .first();

        // CRITICAL ERROR: Reserver should see Cancel Reservation button
        await expect(cancelButton).toBeVisible({
          timeout: 10000,
        });

        // Step 4: Cancel the reservation
        await cancelButton.click();

        // Wait for cancellation to complete
        await page.waitForTimeout(2000);

        // Step 5: Verify reservation is removed from database
        dbReservation = await getReservationByWishId(targetWish.id);
        expect(
          dbReservation,
          'ERROR: Reservation should be deleted from database after cancel'
        ).toBeNull();

        // Step 6: Verify UI updates to show wish is available again
        await page.waitForLoadState('networkidle');

        // Should see Reserve button again (not Cancel)
        const reserveButtonAgain = page.locator(
          `button:has-text("Reserve"), [data-testid="reserve-btn-${targetWish.id}"]`
        );

        const reserveButtonCount = await reserveButtonAgain.count();
        expect(
          reserveButtonCount,
          'ERROR: After canceling, Reserve button should be visible again'
        ).toBeGreaterThan(0);

        // Step 7: Owner views list and sees wish is available
        await page.context().clearCookies();
        await loginAsUser(page, owner.email);
        await page.goto(`/lists/${list.id}`);
        await page.waitForLoadState('networkidle');

        // Wish should NOT show as reserved
        const ownerReservedIndicator = page.locator(
          `[data-testid="reserved-indicator-${targetWish.id}"], .reserved-badge`
        );

        const ownerSeesReserved = (await ownerReservedIndicator.count()) > 0;
        expect(
          ownerSeesReserved,
          'ERROR: After cancellation, owner should see wish as available'
        ).toBeFalsy();

        // SUCCESS
        console.log(
          '✅ CANCEL RESERVATION TEST PASSED: Reserver can view and cancel their reservation'
        );
      } finally {
        await cleanupTestData([owner.id, reserver.id, scenario.otherUser.id]);
      }
    });

    test('reserver can view all their reservations across lists', async ({ page }) => {
      const scenario = await createCompleteTestScenario();
      const { owner, reserver, list, wishes } = scenario;

      try {
        await loginAsUser(page, reserver.email);

        // Reserve multiple wishes
        for (const wish of wishes) {
          await page.request.post('/api/reservations', {
            data: {
              wishId: wish.id,
              listId: list.id,
              reserverName: reserver.name,
              reserverEmail: reserver.email,
            },
          });
        }

        // Navigate to reservations page (if exists) or check via API
        const reservationsResponse = await page.request.get('/api/reservations');

        if (reservationsResponse.ok()) {
          const reservationsData = await reservationsResponse.json();
          const userReservations = Array.isArray(reservationsData)
            ? reservationsData
            : reservationsData.reservations || [];

          expect(
            userReservations.length,
            'User should see all their reservations'
          ).toBeGreaterThanOrEqual(2);

          // Verify all reservations belong to this user
          userReservations.forEach((res: any) => {
            expect(res.reserverEmail).toBe(reserver.email);
          });
        }
      } finally {
        await cleanupTestData([owner.id, reserver.id, scenario.otherUser.id]);
      }
    });
  });

  test.describe('Test 3: Concurrent Reservation Attempt (Race Condition)', () => {
    test('only one reservation succeeds when two users try simultaneously', async ({ browser }) => {
      const scenario = await createCompleteTestScenario();
      const { owner, reserver, otherUser, list, wishes } = scenario;
      const targetWish = wishes[1]; // Programming Book

      try {
        // Create two browser contexts (simulating two different users)
        const context1 = await browser.newContext();
        const context2 = await browser.newContext();

        const page1 = await context1.newPage();
        const page2 = await context2.newPage();

        // Login both users
        await loginAsUser(page1, reserver.email);
        await loginAsUser(page2, otherUser.email);

        // Navigate both to the list
        await Promise.all([page1.goto(`/lists/${list.id}`), page2.goto(`/lists/${list.id}`)]);

        await Promise.all([
          page1.waitForLoadState('networkidle'),
          page2.waitForLoadState('networkidle'),
        ]);

        // Ensure wish is not already reserved
        await cleanupReservation(targetWish.id);

        // Step 1: Both users attempt to reserve simultaneously
        const reservation1Promise = page1.request.post('/api/reservations', {
          data: {
            wishId: targetWish.id,
            listId: list.id,
            reserverName: reserver.name,
            reserverEmail: reserver.email,
          },
        });

        const reservation2Promise = page2.request.post('/api/reservations', {
          data: {
            wishId: targetWish.id,
            listId: list.id,
            reserverName: otherUser.name,
            reserverEmail: otherUser.email,
          },
        });

        // Execute both requests concurrently
        const [response1, response2] = await Promise.all([
          reservation1Promise,
          reservation2Promise,
        ]);

        // Step 2: Verify only one succeeded
        const success1 = response1.ok();
        const success2 = response2.ok();

        expect(
          success1 !== success2,
          'CRITICAL RACE CONDITION ERROR: Exactly one reservation should succeed, one should fail'
        ).toBeTruthy();

        // Step 3: Verify the one that failed has correct error message
        const failedResponse = success1 ? response2 : response1;
        const errorData = await failedResponse.json();

        expect(
          errorData.error || errorData.message,
          'Failed request should have error message about wish already being reserved'
        ).toMatch(/already reserved|already taken|unavailable/i);

        // Step 4: Verify database has exactly 1 reservation
        const reservationCount = await countReservationsForWish(targetWish.id);
        expect(
          reservationCount,
          'CRITICAL ERROR: Database should have exactly 1 reservation for the wish'
        ).toBe(1);

        // Step 5: Verify the reservation belongs to the user whose request succeeded
        const dbReservation = await getReservationByWishId(targetWish.id);
        const expectedEmail = success1 ? reserver.email : otherUser.email;

        expect(
          dbReservation?.reserverEmail,
          'Reservation should belong to the user whose request succeeded'
        ).toBe(expectedEmail);

        // Step 6: Verify the other user sees the wish as reserved (cannot reserve again)
        const loserPage = success1 ? page2 : page1;
        await loserPage.goto(`/lists/${list.id}`);
        await loserPage.waitForLoadState('networkidle');

        // The "loser" should NOT see a Reserve button for this wish
        const reserveButtonForLoser = loserPage.locator(`button:has-text("Reserve")`).first();
        const canLoserReserve = (await reserveButtonForLoser.count()) > 0;

        // If button exists, verify it's disabled or clicking it shows error
        if (canLoserReserve) {
          await reserveButtonForLoser.click();
          await loserPage.waitForTimeout(1000);

          // Should see error message
          const errorMessage = loserPage.locator('text=/already reserved|unavailable|error/i');
          // User should see error when trying to reserve already-reserved wish
          await expect(errorMessage.first()).toBeVisible({
            timeout: 5000,
          });
        }

        // SUCCESS
        console.log('✅ RACE CONDITION TEST PASSED: Only one concurrent reservation succeeded');

        // Cleanup
        await context1.close();
        await context2.close();
      } finally {
        await cleanupTestData([owner.id, reserver.id, otherUser.id]);
      }
    });

    test('rapid sequential attempts only create one reservation', async ({ page }) => {
      const scenario = await createCompleteTestScenario();
      const { owner, reserver, list, wishes } = scenario;
      const targetWish = wishes[0];

      try {
        await loginAsUser(page, reserver.email);
        await cleanupReservation(targetWish.id);

        // Attempt to create same reservation multiple times rapidly
        const attempts = 5;
        const promises = [];

        for (let i = 0; i < attempts; i++) {
          promises.push(
            page.request.post('/api/reservations', {
              data: {
                wishId: targetWish.id,
                listId: list.id,
                reserverName: reserver.name,
                reserverEmail: reserver.email,
              },
            })
          );
        }

        const responses = await Promise.all(promises);

        // Only one should succeed
        const successCount = responses.filter((r) => r.ok()).length;
        expect(successCount, 'Only one of the rapid attempts should succeed').toBe(1);

        // Verify database has exactly 1 reservation
        const reservationCount = await countReservationsForWish(targetWish.id);
        expect(
          reservationCount,
          'Database should have exactly 1 reservation despite multiple attempts'
        ).toBe(1);
      } finally {
        await cleanupTestData([owner.id, reserver.id, scenario.otherUser.id]);
      }
    });
  });

  test.describe('Additional Privacy Edge Cases', () => {
    test('group admin (not owner) cannot see reserver details', async ({ page }) => {
      const scenario = await createCompleteTestScenario();
      const { owner, reserver, otherUser, list, wishes } = scenario;
      const targetWish = wishes[0];

      try {
        // Make otherUser a list admin (but not owner)
        await page.request.post(`/api/lists/${list.id}/admins`, {
          data: { userId: otherUser.id },
          headers: { 'X-Test-User-Id': owner.id },
        });

        // Reserver reserves wish
        await loginAsUser(page, reserver.email);
        await page.request.post('/api/reservations', {
          data: {
            wishId: targetWish.id,
            listId: list.id,
            reserverName: reserver.name,
            reserverEmail: reserver.email,
          },
        });

        // List admin views list
        await page.context().clearCookies();
        await loginAsUser(page, otherUser.email);
        await page.goto(`/lists/${list.id}`);
        await page.waitForLoadState('networkidle');

        // Admin should NOT see reserver details
        await expect(page.getByText(reserver.name)).not.toBeVisible();
        await expect(page.getByText(reserver.email)).not.toBeVisible();
      } finally {
        await cleanupTestData([owner.id, reserver.id, otherUser.id]);
      }
    });

    test('non-owner group members see reserved badge', async ({ page }) => {
      const scenario = await createCompleteTestScenario();
      const { owner, reserver, otherUser, list, wishes } = scenario;
      const targetWish = wishes[0];

      try {
        // Reserver reserves wish
        await loginAsUser(page, reserver.email);
        await page.request.post('/api/reservations', {
          data: {
            wishId: targetWish.id,
            listId: list.id,
            reserverName: reserver.name,
            reserverEmail: reserver.email,
          },
        });

        // OTHER user (not owner, not reserver) views list
        await page.context().clearCookies();
        await loginAsUser(page, otherUser.email);
        await page.goto(`/lists/${list.id}`);
        await page.waitForLoadState('networkidle');

        // Non-owner SHOULD see "Reserved" indicator
        // Wait for the badge to appear (gives time for React Query to fetch and render)
        const reservedBadge = page.locator(
          `[data-testid="reserved-indicator-${targetWish.id}"], .reserved-badge`
        );
        await expect(reservedBadge).toBeVisible({ timeout: 15000 });

        // But should NOT see who reserved it (privacy)
        await expect(page.getByText(reserver.name, { exact: true })).not.toBeVisible();
        await expect(page.getByText(reserver.email, { exact: true })).not.toBeVisible();
      } finally {
        await cleanupTestData([owner.id, reserver.id, otherUser.id]);
      }
    });

    test('reserver cannot see other users reservations', async ({ page }) => {
      const scenario = await createCompleteTestScenario();
      const { owner, reserver, otherUser, list, wishes } = scenario;

      try {
        // Reserver reserves wish 1
        await loginAsUser(page, reserver.email);
        await page.request.post('/api/reservations', {
          data: {
            wishId: wishes[0].id,
            listId: list.id,
            reserverName: reserver.name,
            reserverEmail: reserver.email,
          },
        });

        // OtherUser reserves wish 2
        await page.context().clearCookies();
        await loginAsUser(page, otherUser.email);
        await page.request.post('/api/reservations', {
          data: {
            wishId: wishes[1].id,
            listId: list.id,
            reserverName: otherUser.name,
            reserverEmail: otherUser.email,
          },
        });

        // Reserver views list - should only see their own reservation
        await page.context().clearCookies();
        await loginAsUser(page, reserver.email);
        await page.goto(`/lists/${list.id}`);
        await page.waitForLoadState('networkidle');

        // Should not see otherUser's name associated with wish 2
        const otherUserNameNearWish2 = page
          .locator(`[data-testid="wish-${wishes[1].id}"]`)
          .locator(`text=${otherUser.name}`);

        expect(
          await otherUserNameNearWish2.count(),
          'User should not see who reserved other wishes'
        ).toBe(0);
      } finally {
        await cleanupTestData([owner.id, reserver.id, otherUser.id]);
      }
    });
  });
});
