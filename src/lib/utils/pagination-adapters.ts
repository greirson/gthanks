/**
 * Minimal pagination adapters for MVP
 * These are simple helpers to maintain compatibility with existing API routes
 */

/**
 * Convert legacy cursor format to standard pagination
 * For MVP, we'll just pass through the cursor as-is
 */
export function fromLegacyCursorFormat(cursor: string | null | undefined) {
  return cursor || undefined;
}

/**
 * Create unified pagination response format
 * Simple helper for consistent pagination structure
 */
export function createUnifiedPagination<T>(items: T[], page: number, limit: number, total: number) {
  const totalPages = Math.ceil(total / limit);
  const hasMore = page < totalPages;

  return {
    items,
    pagination: {
      page,
      limit,
      total,
      totalPages,
      hasMore,
      nextPage: hasMore ? page + 1 : null,
    },
  };
}
