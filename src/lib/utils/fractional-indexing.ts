import { PrismaClient } from '@prisma/client';

/**
 * Calculate new sortOrder value for a wish being moved between two positions.
 *
 * Uses fractional indexing to avoid renumbering the entire list on every move.
 * When the gap between adjacent values becomes too small, use shouldRenumberList()
 * to detect when a full renumbering is needed.
 *
 * @param prevOrder - sortOrder of the wish before the new position (null if moving to first position)
 * @param nextOrder - sortOrder of the wish after the new position (null if moving to last position)
 * @returns New sortOrder value to place the wish between prev and next
 *
 * @example
 * // Moving to first position
 * calculateNewSortOrder(null, 10) // Returns 9.0
 *
 * @example
 * // Moving to last position
 * calculateNewSortOrder(20, null) // Returns 21.0
 *
 * @example
 * // Moving between two wishes
 * calculateNewSortOrder(10, 20) // Returns 15.0
 *
 * @example
 * // Moving to beginning (no wishes yet)
 * calculateNewSortOrder(null, null) // Returns 1.0
 */
export function calculateNewSortOrder(
  prevOrder: number | null,
  nextOrder: number | null
): number {
  // First item in empty list
  if (prevOrder === null && nextOrder === null) {
    return 1.0;
  }

  // Moving before first item
  if (prevOrder === null && nextOrder !== null) {
    return nextOrder - 1.0;
  }

  // Moving after last item
  if (prevOrder !== null && nextOrder === null) {
    return prevOrder + 1.0;
  }

  // Moving between two items - fractional indexing
  if (prevOrder !== null && nextOrder !== null) {
    return (prevOrder + nextOrder) / 2.0;
  }

  // Should never reach here, but TypeScript needs this
  return 1.0;
}

/**
 * Check if the gap between two sortOrder values is too small for fractional indexing.
 *
 * When moving wishes repeatedly between the same two positions, the gap shrinks
 * exponentially. Once it reaches the precision threshold (0.000001), we risk
 * floating-point precision issues and should renumber the entire list.
 *
 * @param prevOrder - sortOrder of the wish before
 * @param nextOrder - sortOrder of the wish after
 * @returns true if renumbering is needed, false otherwise
 *
 * @example
 * shouldRenumberList(10.0, 10.0000005) // Returns true
 * shouldRenumberList(10.0, 15.0) // Returns false
 */
export function shouldRenumberList(prevOrder: number, nextOrder: number): boolean {
  const gap = Math.abs(nextOrder - prevOrder);
  const PRECISION_THRESHOLD = 0.000001;
  return gap < PRECISION_THRESHOLD;
}

/**
 * Renumber all wishes in a list to restore wide gaps between sortOrder values.
 *
 * Assigns sortOrder values with gaps of 10.0:
 * - First wish: 0
 * - Second wish: 10
 * - Third wish: 20
 * - etc.
 *
 * This should be called when shouldRenumberList() returns true, or proactively
 * before gaps become too small (e.g., after 100 moves).
 *
 * Uses a transaction to ensure atomicity - either all wishes are renumbered or none.
 *
 * @param listId - ID of the list to renumber
 * @param db - Prisma client instance
 * @returns Number of wishes renumbered
 *
 * @example
 * const count = await renumberListWishes('list-123', db);
 * console.log(`Renumbered ${count} wishes`);
 *
 * @throws {Error} If database transaction fails
 */
export async function renumberListWishes(
  listId: string,
  db: PrismaClient
): Promise<number> {
  // Fetch all wishes in the list, ordered by current sortOrder
  const listWishes = await db.listWish.findMany({
    where: { listId },
    orderBy: { sortOrder: 'asc' },
  });

  // No wishes to renumber
  if (listWishes.length === 0) {
    return 0;
  }

  // Renumber with gaps of 10.0 (0, 10, 20, 30...)
  await db.$transaction(
    listWishes.map((listWish, index) =>
      db.listWish.update({
        where: {
          listId_wishId: {
            listId: listWish.listId,
            wishId: listWish.wishId,
          },
        },
        data: { sortOrder: index * 10 },
      })
    )
  );

  return listWishes.length;
}
