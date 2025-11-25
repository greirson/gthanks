/**
 * Client-side fractional indexing utilities for optimistic UI updates.
 *
 * These functions provide lightweight position calculation for drag-and-drop
 * operations. The client calculates tentative positions, then the server
 * confirms the final sortOrder values.
 */

/**
 * Calculate new sortOrder when moving a wish between two positions (client-side).
 * Used for optimistic UI updates before server confirmation.
 *
 * @param prevOrder - sortOrder of wish before target position (null if first)
 * @param nextOrder - sortOrder of wish after target position (null if last)
 * @returns New sortOrder for the moved wish
 *
 * @example
 * // Move wish to first position
 * calculateNewSortOrder(null, 1.0) // Returns 0.0
 *
 * @example
 * // Move wish between two items
 * calculateNewSortOrder(1.0, 3.0) // Returns 2.0
 *
 * @example
 * // Move wish to last position
 * calculateNewSortOrder(5.0, null) // Returns 6.0
 */
export function calculateNewSortOrder(prevOrder: number | null, nextOrder: number | null): number {
  // First position (before all items)
  if (prevOrder === null && nextOrder === null) {
    return 1.0;
  }

  // Before first item
  if (prevOrder === null) {
    return nextOrder! - 1.0;
  }

  // After last item
  if (nextOrder === null) {
    return prevOrder + 1.0;
  }

  // Between two items (fractional indexing)
  return (prevOrder + nextOrder) / 2.0;
}

/**
 * Check if gap between sortOrder values is too small (client-side check).
 * Used to warn user that list may need renumbering.
 *
 * @param prevOrder - Previous sortOrder
 * @param nextOrder - Next sortOrder
 * @returns True if gap is too small
 *
 * @example
 * // Normal gap - no warning needed
 * shouldWarnRenumber(1.0, 2.0) // Returns false
 *
 * @example
 * // Tiny gap - warn about precision limits
 * shouldWarnRenumber(1.0000001, 1.0000002) // Returns true
 */
export function shouldWarnRenumber(prevOrder: number, nextOrder: number): boolean {
  const gap = Math.abs(nextOrder - prevOrder);
  return gap < 0.000001;
}
