/**
 * Integration tests for duplicate reservation cleanup script
 *
 * Tests the detection and cleanup of duplicate reservations that would
 * violate the @@unique([wishId, userId]) constraint.
 *
 * Note: The current script (check-duplicate-reservations.ts) only DETECTS
 * duplicates but does not clean them up. These tests verify detection works
 * correctly and prepare for future cleanup functionality.
 */

import { describe, it, expect, beforeEach, afterEach } from '@jest/globals';
import { db } from '@/lib/db';

/**
 * Simulates the duplicate detection logic from scripts/check-duplicate-reservations.ts
 * This matches the SQL query structure used in the actual script
 */
async function checkDuplicateReservations() {
  // Query for duplicates using GROUP BY wishId, userId
  // This matches the logic in the actual script
  const allReservations = await db.reservation.findMany({
    select: {
      id: true,
      wishId: true,
      userId: true,
      reservedAt: true,
    },
  });

  // Group by wishId + userId to find duplicates
  const groupedByWishUser = new Map<string, typeof allReservations>();
  for (const res of allReservations) {
    const key = `${res.wishId}_${res.userId}`;
    if (!groupedByWishUser.has(key)) {
      groupedByWishUser.set(key, []);
    }
    groupedByWishUser.get(key)!.push(res);
  }

  // Filter to only groups with more than 1 reservation
  const duplicates = Array.from(groupedByWishUser.entries())
    .filter(([_, reservations]) => reservations.length > 1)
    .map(([key, reservations]) => {
      const [wishId, userId] = key.split('_');
      return {
        wishId,
        userId,
        duplicate_count: reservations.length,
        reservation_ids: reservations.map((r) => r.id).join(', '),
        reservations,
      };
    });

  return {
    duplicates,
    totalReservations: allReservations.length,
  };
}

/**
 * Cleanup function that keeps the most recent reservation when duplicates exist
 * This implements the intended cleanup behavior (not yet in the script)
 *
 * @param dryRun - If true, only reports what would be deleted without actually deleting
 */
async function cleanupDuplicateReservations(dryRun = false) {
  const { duplicates } = await checkDuplicateReservations();

  const deleteResults = {
    dryRun,
    duplicatesFound: duplicates.length,
    reservationsToDelete: 0,
    deletedReservations: 0,
    errors: [] as string[],
  };

  for (const duplicate of duplicates) {
    // Sort reservations by reservedAt DESC (most recent first)
    const sorted = duplicate.reservations.sort(
      (a, b) => b.reservedAt.getTime() - a.reservedAt.getTime()
    );

    // Keep the first (most recent), delete the rest
    const toKeep = sorted[0];
    const toDelete = sorted.slice(1);

    deleteResults.reservationsToDelete += toDelete.length;

    if (!dryRun) {
      try {
        // Delete older duplicates
        const deleteIds = toDelete.map((r) => r.id);
        const result = await db.reservation.deleteMany({
          where: {
            id: { in: deleteIds },
          },
        });

        deleteResults.deletedReservations += result.count;
      } catch (error) {
        const errorMsg = `Failed to delete duplicates for wish ${duplicate.wishId}, user ${duplicate.userId}: ${error}`;
        deleteResults.errors.push(errorMsg);
      }
    }
  }

  return deleteResults;
}

describe('Duplicate Reservation Cleanup Script', () => {
  let testUser1: any;
  let testUser2: any;
  let testWish1: any;
  let testWish2: any;

  beforeEach(async () => {
    // Reset database state
    if (global.mockDb && typeof global.mockDb._resetMockData === 'function') {
      global.mockDb._resetMockData();
    }

    // Create test users
    testUser1 = await db.user.create({
      data: {
        id: 'user-1',
        email: 'user1@example.com',
        name: 'Test User 1',
      },
    });

    testUser2 = await db.user.create({
      data: {
        id: 'user-2',
        email: 'user2@example.com',
        name: 'Test User 2',
      },
    });

    // Create test wishes
    testWish1 = await db.wish.create({
      data: {
        id: 'wish-1',
        title: 'Test Gift 1',
        ownerId: testUser1.id,
      },
    });

    testWish2 = await db.wish.create({
      data: {
        id: 'wish-2',
        title: 'Test Gift 2',
        ownerId: testUser1.id,
      },
    });
  });

  afterEach(async () => {
    // Clean up test data
    await db.reservation.deleteMany({});
    await db.wish.deleteMany({});
    await db.user.deleteMany({});
  });

  describe('Duplicate Detection', () => {
    it('should detect no duplicates when database is clean', async () => {
      const result = await checkDuplicateReservations();

      expect(result.duplicates).toHaveLength(0);
      expect(result.totalReservations).toBe(0);
    });

    it('should detect no duplicates when each user has one reservation per wish', async () => {
      // User 1 reserves wish 1
      await db.reservation.create({
        data: {
          wishId: testWish1.id,
          userId: testUser1.id,
          reserverName: 'User 1',
          reserverEmail: testUser1.email,
        },
      });

      // User 2 reserves wish 2
      await db.reservation.create({
        data: {
          wishId: testWish2.id,
          userId: testUser2.id,
          reserverName: 'User 2',
          reserverEmail: testUser2.email,
        },
      });

      const result = await checkDuplicateReservations();

      expect(result.duplicates).toHaveLength(0);
      expect(result.totalReservations).toBe(2);
    });

    it('should detect duplicate when same user reserves same wish twice', async () => {
      // Create duplicate reservations
      const firstReservation = await db.reservation.create({
        data: {
          id: 'res-1',
          wishId: testWish1.id,
          userId: testUser1.id,
          reserverName: 'User 1',
          reserverEmail: testUser1.email,
        },
      });

      // Wait a moment to ensure different timestamps
      await new Promise((resolve) => setTimeout(resolve, 10));

      const secondReservation = await db.reservation.create({
        data: {
          id: 'res-2',
          wishId: testWish1.id,
          userId: testUser1.id,
          reserverName: 'User 1',
          reserverEmail: testUser1.email,
        },
      });

      const result = await checkDuplicateReservations();

      expect(result.duplicates).toHaveLength(1);
      expect(result.duplicates[0]).toMatchObject({
        wishId: testWish1.id,
        userId: testUser1.id,
        duplicate_count: 2,
      });

      // Verify both reservation IDs are reported
      const reportedIds = result.duplicates[0].reservation_ids.split(', ');
      expect(reportedIds).toContain(firstReservation.id);
      expect(reportedIds).toContain(secondReservation.id);
    });

    it('should detect multiple sets of duplicates', async () => {
      // User 1 has 2 reservations for wish 1
      await db.reservation.create({
        data: {
          wishId: testWish1.id,
          userId: testUser1.id,
          reserverName: 'User 1',
          reserverEmail: testUser1.email,
        },
      });

      await db.reservation.create({
        data: {
          wishId: testWish1.id,
          userId: testUser1.id,
          reserverName: 'User 1',
          reserverEmail: testUser1.email,
        },
      });

      // User 2 has 3 reservations for wish 2
      await db.reservation.create({
        data: {
          wishId: testWish2.id,
          userId: testUser2.id,
          reserverName: 'User 2',
          reserverEmail: testUser2.email,
        },
      });

      await db.reservation.create({
        data: {
          wishId: testWish2.id,
          userId: testUser2.id,
          reserverName: 'User 2',
          reserverEmail: testUser2.email,
        },
      });

      await db.reservation.create({
        data: {
          wishId: testWish2.id,
          userId: testUser2.id,
          reserverName: 'User 2',
          reserverEmail: testUser2.email,
        },
      });

      const result = await checkDuplicateReservations();

      expect(result.duplicates).toHaveLength(2);
      expect(result.totalReservations).toBe(5);

      // Find the duplicate for wish 1 (2 reservations)
      const wish1Duplicate = result.duplicates.find((d) => d.wishId === testWish1.id);
      expect(wish1Duplicate).toBeDefined();
      expect(wish1Duplicate!.duplicate_count).toBe(2);

      // Find the duplicate for wish 2 (3 reservations)
      const wish2Duplicate = result.duplicates.find((d) => d.wishId === testWish2.id);
      expect(wish2Duplicate).toBeDefined();
      expect(wish2Duplicate!.duplicate_count).toBe(3);
    });

    it('should detect duplicates with null userId (anonymous reservations)', async () => {
      // Create duplicate anonymous reservations for same wish
      await db.reservation.create({
        data: {
          wishId: testWish1.id,
          userId: null,
          reserverName: 'Anonymous',
          reserverEmail: 'anon@example.com',
        },
      });

      await db.reservation.create({
        data: {
          wishId: testWish1.id,
          userId: null,
          reserverName: 'Anonymous',
          reserverEmail: 'anon@example.com',
        },
      });

      const result = await checkDuplicateReservations();

      expect(result.duplicates).toHaveLength(1);
      expect(result.duplicates[0].userId).toBeNull();
      expect(result.duplicates[0].duplicate_count).toBe(2);
    });
  });

  describe('Cleanup Functionality (Dry Run)', () => {
    it('should report what would be deleted without actually deleting in dry-run mode', async () => {
      // Create 3 duplicate reservations
      await db.reservation.create({
        data: {
          id: 'res-1',
          wishId: testWish1.id,
          userId: testUser1.id,
          reserverName: 'User 1',
          reserverEmail: testUser1.email,
        },
      });

      await new Promise((resolve) => setTimeout(resolve, 10));

      await db.reservation.create({
        data: {
          id: 'res-2',
          wishId: testWish1.id,
          userId: testUser1.id,
          reserverName: 'User 1',
          reserverEmail: testUser1.email,
        },
      });

      await new Promise((resolve) => setTimeout(resolve, 10));

      await db.reservation.create({
        data: {
          id: 'res-3',
          wishId: testWish1.id,
          userId: testUser1.id,
          reserverName: 'User 1',
          reserverEmail: testUser1.email,
        },
      });

      // Run cleanup in dry-run mode
      const result = await cleanupDuplicateReservations(true);

      expect(result.dryRun).toBe(true);
      expect(result.duplicatesFound).toBe(1);
      expect(result.reservationsToDelete).toBe(2); // Keep 1, delete 2
      expect(result.deletedReservations).toBe(0); // Nothing actually deleted

      // Verify all reservations still exist
      const remainingReservations = await db.reservation.findMany({
        where: { wishId: testWish1.id },
      });
      expect(remainingReservations).toHaveLength(3);
    });

    it('should identify correct number of reservations to delete for multiple duplicate sets', async () => {
      // Wish 1: 2 duplicates (delete 1, keep 1)
      await db.reservation.create({
        data: {
          wishId: testWish1.id,
          userId: testUser1.id,
          reserverName: 'User 1',
          reserverEmail: testUser1.email,
        },
      });

      await db.reservation.create({
        data: {
          wishId: testWish1.id,
          userId: testUser1.id,
          reserverName: 'User 1',
          reserverEmail: testUser1.email,
        },
      });

      // Wish 2: 4 duplicates (delete 3, keep 1)
      await db.reservation.create({
        data: {
          wishId: testWish2.id,
          userId: testUser2.id,
          reserverName: 'User 2',
          reserverEmail: testUser2.email,
        },
      });

      await db.reservation.create({
        data: {
          wishId: testWish2.id,
          userId: testUser2.id,
          reserverName: 'User 2',
          reserverEmail: testUser2.email,
        },
      });

      await db.reservation.create({
        data: {
          wishId: testWish2.id,
          userId: testUser2.id,
          reserverName: 'User 2',
          reserverEmail: testUser2.email,
        },
      });

      await db.reservation.create({
        data: {
          wishId: testWish2.id,
          userId: testUser2.id,
          reserverName: 'User 2',
          reserverEmail: testUser2.email,
        },
      });

      const result = await cleanupDuplicateReservations(true);

      expect(result.duplicatesFound).toBe(2);
      expect(result.reservationsToDelete).toBe(4); // 1 + 3
      expect(result.deletedReservations).toBe(0); // Dry run
    });
  });

  describe('Cleanup Functionality (Actual Deletion)', () => {
    it('should keep the most recent reservation when duplicates exist', async () => {
      // Create reservations with known timestamps
      const oldReservation = await db.reservation.create({
        data: {
          id: 'res-old',
          wishId: testWish1.id,
          userId: testUser1.id,
          reserverName: 'User 1',
          reserverEmail: testUser1.email,
        },
      });

      await new Promise((resolve) => setTimeout(resolve, 10));

      const middleReservation = await db.reservation.create({
        data: {
          id: 'res-middle',
          wishId: testWish1.id,
          userId: testUser1.id,
          reserverName: 'User 1',
          reserverEmail: testUser1.email,
        },
      });

      await new Promise((resolve) => setTimeout(resolve, 10));

      const newestReservation = await db.reservation.create({
        data: {
          id: 'res-newest',
          wishId: testWish1.id,
          userId: testUser1.id,
          reserverName: 'User 1',
          reserverEmail: testUser1.email,
        },
      });

      // Run cleanup without dry-run
      const result = await cleanupDuplicateReservations(false);

      expect(result.dryRun).toBe(false);
      expect(result.duplicatesFound).toBe(1);
      expect(result.reservationsToDelete).toBe(2);
      expect(result.deletedReservations).toBe(2);
      expect(result.errors).toHaveLength(0);

      // Verify only the newest reservation remains
      const remainingReservations = await db.reservation.findMany({
        where: { wishId: testWish1.id },
      });

      expect(remainingReservations).toHaveLength(1);
      expect(remainingReservations[0].id).toBe(newestReservation.id);

      // Verify old and middle reservations are deleted
      const oldDeleted = await db.reservation.findUnique({
        where: { id: oldReservation.id },
      });
      expect(oldDeleted).toBeNull();

      const middleDeleted = await db.reservation.findUnique({
        where: { id: middleReservation.id },
      });
      expect(middleDeleted).toBeNull();
    });

    it('should clean up multiple duplicate sets correctly', async () => {
      // Wish 1: Create 2 reservations (older and newer)
      const wish1Old = await db.reservation.create({
        data: {
          id: 'wish1-old',
          wishId: testWish1.id,
          userId: testUser1.id,
          reserverName: 'User 1',
          reserverEmail: testUser1.email,
        },
      });

      await new Promise((resolve) => setTimeout(resolve, 10));

      const wish1New = await db.reservation.create({
        data: {
          id: 'wish1-new',
          wishId: testWish1.id,
          userId: testUser1.id,
          reserverName: 'User 1',
          reserverEmail: testUser1.email,
        },
      });

      // Wish 2: Create 3 reservations (oldest, middle, newest)
      const wish2Oldest = await db.reservation.create({
        data: {
          id: 'wish2-oldest',
          wishId: testWish2.id,
          userId: testUser2.id,
          reserverName: 'User 2',
          reserverEmail: testUser2.email,
        },
      });

      await new Promise((resolve) => setTimeout(resolve, 10));

      const wish2Middle = await db.reservation.create({
        data: {
          id: 'wish2-middle',
          wishId: testWish2.id,
          userId: testUser2.id,
          reserverName: 'User 2',
          reserverEmail: testUser2.email,
        },
      });

      await new Promise((resolve) => setTimeout(resolve, 10));

      const wish2Newest = await db.reservation.create({
        data: {
          id: 'wish2-newest',
          wishId: testWish2.id,
          userId: testUser2.id,
          reserverName: 'User 2',
          reserverEmail: testUser2.email,
        },
      });

      // Run cleanup
      const result = await cleanupDuplicateReservations(false);

      expect(result.duplicatesFound).toBe(2);
      expect(result.deletedReservations).toBe(3); // 1 from wish1, 2 from wish2

      // Verify only newest reservations remain
      const wish1Remaining = await db.reservation.findMany({
        where: { wishId: testWish1.id },
      });
      expect(wish1Remaining).toHaveLength(1);
      expect(wish1Remaining[0].id).toBe(wish1New.id);

      const wish2Remaining = await db.reservation.findMany({
        where: { wishId: testWish2.id },
      });
      expect(wish2Remaining).toHaveLength(1);
      expect(wish2Remaining[0].id).toBe(wish2Newest.id);
    });

    it('should not delete any reservations when no duplicates exist', async () => {
      // Create unique reservations
      await db.reservation.create({
        data: {
          wishId: testWish1.id,
          userId: testUser1.id,
          reserverName: 'User 1',
          reserverEmail: testUser1.email,
        },
      });

      await db.reservation.create({
        data: {
          wishId: testWish2.id,
          userId: testUser2.id,
          reserverName: 'User 2',
          reserverEmail: testUser2.email,
        },
      });

      const result = await cleanupDuplicateReservations(false);

      expect(result.duplicatesFound).toBe(0);
      expect(result.reservationsToDelete).toBe(0);
      expect(result.deletedReservations).toBe(0);

      // Verify both reservations still exist
      const allReservations = await db.reservation.findMany();
      expect(allReservations).toHaveLength(2);
    });
  });

  describe('Edge Cases', () => {
    it('should handle reservations created at the exact same millisecond', async () => {
      // Create reservations with same timestamp
      const now = new Date();

      const res1 = await db.reservation.create({
        data: {
          id: 'res-1',
          wishId: testWish1.id,
          userId: testUser1.id,
          reserverName: 'User 1',
          reserverEmail: testUser1.email,
        },
      });

      // Update to same timestamp (simulating exact same time)
      await db.reservation.update({
        where: { id: res1.id },
        data: { reservedAt: now },
      });

      const res2 = await db.reservation.create({
        data: {
          id: 'res-2',
          wishId: testWish1.id,
          userId: testUser1.id,
          reserverName: 'User 1',
          reserverEmail: testUser1.email,
        },
      });

      await db.reservation.update({
        where: { id: res2.id },
        data: { reservedAt: now },
      });

      const result = await cleanupDuplicateReservations(false);

      expect(result.duplicatesFound).toBe(1);
      expect(result.deletedReservations).toBe(1);

      // Verify exactly one reservation remains
      const remaining = await db.reservation.findMany({
        where: { wishId: testWish1.id },
      });
      expect(remaining).toHaveLength(1);
    });

    it('should handle large number of duplicates (100+ reservations)', async () => {
      // Create 100 duplicate reservations
      const reservationPromises = [];
      for (let i = 0; i < 100; i++) {
        reservationPromises.push(
          db.reservation.create({
            data: {
              id: `res-${i}`,
              wishId: testWish1.id,
              userId: testUser1.id,
              reserverName: 'User 1',
              reserverEmail: testUser1.email,
            },
          })
        );
      }

      await Promise.all(reservationPromises);

      const result = await cleanupDuplicateReservations(false);

      expect(result.duplicatesFound).toBe(1);
      expect(result.reservationsToDelete).toBe(99); // Keep 1, delete 99
      expect(result.deletedReservations).toBe(99);

      // Verify only 1 reservation remains
      const remaining = await db.reservation.findMany({
        where: { wishId: testWish1.id },
      });
      expect(remaining).toHaveLength(1);
    });

    it('should handle empty database gracefully', async () => {
      const result = await cleanupDuplicateReservations(false);

      expect(result.duplicatesFound).toBe(0);
      expect(result.reservationsToDelete).toBe(0);
      expect(result.deletedReservations).toBe(0);
      expect(result.errors).toHaveLength(0);
    });
  });
});
