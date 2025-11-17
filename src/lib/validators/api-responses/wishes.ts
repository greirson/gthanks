import { z } from 'zod';

import { UnifiedPaginatedResponseSchema } from '@/lib/validators/pagination';
import { flexibleDateSchema } from '@/lib/validators/helpers/date-schema';

// Wish schema for API responses - uses wishLevel consistently
export const WishSchema = z.object({
  id: z.string(),
  title: z.string(),
  notes: z.string().nullable(),
  url: z.string().nullable(),
  imageUrl: z.string().nullable(),
  sourceImageUrl: z.string().nullable(),
  localImagePath: z.string().nullable(),
  imageStatus: z.string(),
  price: z.number().nullable(),
  currency: z.string().nullable(),
  quantity: z.number(),
  size: z.string().nullable(),
  color: z.string().nullable(),
  wishLevel: z.number().nullable(),
  ownerId: z.string(),
  createdAt: flexibleDateSchema(),
  updatedAt: flexibleDateSchema(),
});

// Paginated wishes response using unified pagination
export const PaginatedWishesResponseSchema = UnifiedPaginatedResponseSchema(WishSchema);

// Wish metadata extraction response (legacy - for backward compatibility)
export const WishMetadataSchema = z.object({
  title: z.string().optional(),
  description: z.string().optional(),
  imageUrl: z.string().optional(),
  price: z.number().optional(),
  currency: z.string().optional(),
});

// Enhanced metadata extraction response with error handling
export const MetadataExtractionResponseSchema = z.union([
  // Success response
  z.object({
    success: z.literal(true),
    data: WishMetadataSchema,
    warning: z.string().optional(), // Optional warning when data extracted despite challenges (e.g., CAPTCHA)
  }),
  // Error response with partial data
  z.object({
    success: z.literal(false),
    error: z.object({
      type: z.enum(['captcha_detected', 'network_error', 'invalid_url', 'parse_error', 'timeout']),
      message: z.string(),
      url: z.string().optional(),
      partial: z
        .object({
          domain: z.string().optional(),
          siteName: z.string().optional(),
          suggestedTitle: z.string().optional(),
        })
        .optional(),
    }),
  }),
]);

// Bulk wish operation result
export const BulkWishOperationResultSchema = z.object({
  added: z.number().optional(),
  removed: z.number().optional(),
  deleted: z.number().optional(),
  skipped: z.number().optional(),
  message: z.string().optional(),
  errors: z
    .array(
      z.object({
        wishId: z.string(),
        error: z.string(),
      })
    )
    .optional(),
});

// Wish with reservation details
export const WishWithReservationSchema = WishSchema.extend({
  reservations: z.array(
    z.object({
      id: z.string(),
      reserverName: z.string().nullable(),
      reserverEmail: z.string().nullable(),
      reservedAt: flexibleDateSchema(),
    })
  ),
  availableQuantity: z.number(),
});

// Export types
export type Wish = z.infer<typeof WishSchema>;
export type PaginatedWishesResponse = z.infer<typeof PaginatedWishesResponseSchema>;
export type WishMetadata = z.infer<typeof WishMetadataSchema>;
export type MetadataExtractionResponse = z.infer<typeof MetadataExtractionResponseSchema>;
export type BulkWishOperationResult = z.infer<typeof BulkWishOperationResultSchema>;
export type WishWithReservation = z.infer<typeof WishWithReservationSchema>;
