import { z } from 'zod';

import { UnifiedPaginatedResponseSchema, UnifiedPaginationSchema } from './pagination';

// Base response schemas
export const ErrorResponseSchema = z.object({
  error: z.string(),
  code: z.string().optional(),
});

export const SuccessResponseSchema = z.object({
  success: z.boolean(),
  message: z.string().optional(),
});

// Create backward compatible aliases
export const PaginationMetaSchema = UnifiedPaginationSchema; // For backward compatibility

// Legacy pagination meta schema (kept for reference/migration)
export const LegacyPaginationMetaSchema = z.object({
  currentPage: z.number(),
  totalPages: z.number(),
  totalItems: z.number(),
  itemsPerPage: z.number(),
  hasNextPage: z.boolean(),
  hasPreviousPage: z.boolean(),
});

// User/Profile schemas
export const UserSchema = z.object({
  id: z.string(),
  email: z.string().email(),
  name: z.string().nullable(),
  image: z.string().nullable(),
  avatarUrl: z.string().nullable(),
  role: z.enum(['user', 'admin']),
  isAdmin: z.boolean(),
  createdAt: z.string().or(z.date()),
  lastLoginAt: z.string().or(z.date()).nullable(),
  authMethod: z.enum(['session', 'link']),
});

export const ProfileDataSchema = z.object({
  id: z.string(),
  email: z.string().email(),
  name: z.string().nullable(),
  image: z.string().nullable(),
  avatarUrl: z.string().nullable(),
  isAdmin: z.boolean(),
  preferences: z
    .object({
      emailNotifications: z.boolean(),
      wishlistPrivacy: z.enum(['public', 'private', 'friends']),
    })
    .optional(),
  stats: z
    .object({
      totalWishes: z.number(),
      totalLists: z.number(),
      totalGroups: z.number(),
      wishesGranted: z.number(),
    })
    .optional(),
});

// Group response schemas
export const GroupResponseSchema = z.object({
  id: z.string(),
  name: z.string(),
  description: z.string().nullable(),
  avatarUrl: z.string().nullable(),
  visibility: z.enum(['public', 'private']),
  ownerId: z.string(),
  memberCount: z.number(),
  createdAt: z.string().or(z.date()),
  updatedAt: z.string().or(z.date()),
  userRole: z.enum(['member', 'admin', 'owner']).optional(),
});

export const GroupListResponseSchema = UnifiedPaginatedResponseSchema(GroupResponseSchema);

export const GroupMemberSchema = z.object({
  id: z.string(),
  userId: z.string(),
  groupId: z.string(),
  role: z.enum(['member', 'admin']),
  joinedAt: z.string().or(z.date()),
  user: z.object({
    id: z.string(),
    name: z.string().nullable(),
    email: z.string().email(),
    avatarUrl: z.string().nullable(),
  }),
});

export const GroupMembersResponseSchema = z.array(GroupMemberSchema);

// List response schemas
export const ListResponseSchema = z.object({
  id: z.string(),
  name: z.string(),
  description: z.string().nullable(),
  visibility: z.enum(['private', 'public', 'password']),
  ownerId: z.string(),
  isOwner: z.boolean().optional(),
  itemCount: z.number(),
  createdAt: z.string().or(z.date()),
  updatedAt: z.string().or(z.date()),
  user: z
    .object({
      id: z.string(),
      name: z.string().nullable(),
      avatarUrl: z.string().nullable(),
    })
    .optional(),
});

export const ListsResponseSchema = UnifiedPaginatedResponseSchema(ListResponseSchema);

// Wish response schemas
export const WishResponseSchema = z.object({
  id: z.string(),
  title: z.string(),
  description: z.string().nullable(),
  url: z.string().nullable(),
  imageUrl: z.string().nullable(),
  price: z.number().nullable(),
  currency: z.string().nullable(),
  wishLevel: z.number().min(1).max(5).nullable(),
  notes: z.string().nullable(),
  isReserved: z.boolean(),
  ownerId: z.string(),
  createdAt: z.string().or(z.date()),
  updatedAt: z.string().or(z.date()),
  lists: z
    .array(
      z.object({
        id: z.string(),
        name: z.string(),
      })
    )
    .optional(),
});

export const WishesResponseSchema = UnifiedPaginatedResponseSchema(WishResponseSchema);

// Legacy response schemas for gradual migration
export const LegacyWishesResponseSchema = z.object({
  items: z.array(WishResponseSchema),
  total: z.number(),
  hasMore: z.boolean(),
});

// Bulk operation response schemas
export const BulkOperationResponseSchema = z.object({
  success: z.number(),
  failed: z.number(),
  errors: z
    .array(
      z.object({
        id: z.string(),
        error: z.string(),
      })
    )
    .optional(),
});

// Type guard functions
export function isErrorResponse(data: unknown): data is z.infer<typeof ErrorResponseSchema> {
  return ErrorResponseSchema.safeParse(data).success;
}

export function isSuccessResponse(data: unknown): data is z.infer<typeof SuccessResponseSchema> {
  return SuccessResponseSchema.safeParse(data).success;
}

export function validateApiResponse<T>(
  schema: z.ZodSchema<T>,
  data: unknown,
  _errorMessage: string = 'Invalid API response'
): T {
  const result = schema.safeParse(data);
  if (!result.success) {
    console.error('API response validation failed:', result.error);
    throw result.error; // Throw the ZodError directly so it can be caught and handled
  }
  return result.data;
}

// Response type exports
export type ErrorResponse = z.infer<typeof ErrorResponseSchema>;
export type SuccessResponse = z.infer<typeof SuccessResponseSchema>;
export type PaginationMeta = z.infer<typeof PaginationMetaSchema>;
export type UserResponse = z.infer<typeof UserSchema>;
export type ProfileDataResponse = z.infer<typeof ProfileDataSchema>;
export type GroupResponse = z.infer<typeof GroupResponseSchema>;
export type GroupListResponse = z.infer<typeof GroupListResponseSchema>;
export type GroupMemberResponse = z.infer<typeof GroupMemberSchema>;
export type ListResponse = z.infer<typeof ListResponseSchema>;
export type ListsResponse = z.infer<typeof ListsResponseSchema>;
export type WishResponse = z.infer<typeof WishResponseSchema>;
export type WishesResponse = z.infer<typeof WishesResponseSchema>;
export type BulkOperationResponse = z.infer<typeof BulkOperationResponseSchema>;
