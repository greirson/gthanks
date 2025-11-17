import { z } from 'zod';

// Unified pagination response that supports both cursor and offset patterns
export const UnifiedPaginationSchema = z.object({
  // Cursor-based fields (for infinite scroll)
  nextCursor: z.string().nullable().optional(),
  prevCursor: z.string().nullable().optional(),

  // Offset-based fields (for traditional pagination)
  hasMore: z.boolean(),
  hasPrevious: z.boolean().optional(),
  total: z.number().optional(),
  offset: z.number().optional(),
  limit: z.number(),

  // Page-based fields (computed from offset/limit)
  currentPage: z.number().optional(),
  totalPages: z.number().optional(),
});

// Unified paginated response wrapper
export const UnifiedPaginatedResponseSchema = <T>(itemSchema: z.ZodSchema<T>) =>
  z.object({
    items: z.array(itemSchema),
    pagination: UnifiedPaginationSchema,
  });

// Legacy pagination schemas for backward compatibility
export const LegacyPaginationMetaSchema = z.object({
  currentPage: z.number(),
  totalPages: z.number(),
  totalItems: z.number(),
  itemsPerPage: z.number(),
  hasNextPage: z.boolean(),
  hasPreviousPage: z.boolean(),
});

export const LegacyCursorPaginationSchema = z.object({
  nextCursor: z.string().nullable(),
});

// Type exports
export type UnifiedPagination = z.infer<typeof UnifiedPaginationSchema>;
export type UnifiedPaginatedResponse<T> = {
  items: T[];
  pagination: UnifiedPagination;
};
export type LegacyPaginationMeta = z.infer<typeof LegacyPaginationMetaSchema>;
export type LegacyCursorPagination = z.infer<typeof LegacyCursorPaginationSchema>;
