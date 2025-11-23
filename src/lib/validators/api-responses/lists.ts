import { z } from 'zod';

import { UnifiedPaginatedResponseSchema } from '@/lib/validators/pagination';
import { flexibleDateSchema } from '@/lib/validators/helpers/date-schema';

// List schema for API responses
// List schema for API responses
export const ListSchema = z.object({
  id: z.string(),
  name: z.string(),
  description: z.string().nullable(),
  visibility: z.enum(['public', 'private', 'password']),
  password: z.string().nullable().optional(), // Only included for owners
  shareToken: z.string().nullable(),
  slug: z.string().nullable(),
  hideFromProfile: z.boolean(),
  giftCardPreferences: z.string().nullable().optional(), // JSON string of gift cards
  ownerId: z.string(),
  createdAt: flexibleDateSchema(),
  updatedAt: flexibleDateSchema(),
});

// List with user details
export const ListWithOwnerSchema = ListSchema.extend({
  user: z.object({
    id: z.string(),
    name: z.string().nullable(),
    email: z.string(),
    avatarUrl: z.string().nullable(),
  }),
  _count: z.object({
    listWishes: z.number(),
    listAdmins: z.number(),
  }),
  listAdmins: z
    .array(
      z.object({
        user: z.object({
          id: z.string(),
          name: z.string().nullable(),
          email: z.string(),
          avatarUrl: z.string().nullable(),
        }),
        addedAt: flexibleDateSchema(),
      })
    )
    .optional(),
  isOwner: z.boolean().optional(),
  canEdit: z.boolean().optional(),
  hasAccess: z.boolean().optional(),
});

// List with full details including wishes
export const ListWithDetailsSchema = ListWithOwnerSchema.extend({
  listWishes: z
    .array(
      z
        .object({
          wish: z.object({
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
          }),
          addedAt: flexibleDateSchema(),
          wishLevel: z.number().nullable(),
        })
        .passthrough() // Allow additional fields like listId and wishId from join table
    )
    .optional(),
});

// Paginated lists response using unified pagination
export const PaginatedListsResponseSchema = UnifiedPaginatedResponseSchema(ListWithOwnerSchema);

// List access verification response
export const ListAccessResponseSchema = z.object({
  success: z.boolean(),
  message: z.string().optional(),
});

// List share token generation response
export const ListShareTokenResponseSchema = z.object({
  shareToken: z.string(),
  shareUrl: z.string(),
});

// Wish-to-list operation result
export const WishListOperationResultSchema = z.object({
  success: z.boolean(),
  message: z.string().optional(),
  wishId: z.string().optional(),
  listId: z.string().optional(),
});

// Export types
export type List = z.infer<typeof ListSchema>;
export type ListWithOwner = z.infer<typeof ListWithOwnerSchema>;
export type ListWithDetails = z.infer<typeof ListWithDetailsSchema>;
export type PaginatedListsResponse = z.infer<typeof PaginatedListsResponseSchema>;
export type ListAccessResponse = z.infer<typeof ListAccessResponseSchema>;
export type ListShareTokenResponse = z.infer<typeof ListShareTokenResponseSchema>;
export type WishListOperationResult = z.infer<typeof WishListOperationResultSchema>;
