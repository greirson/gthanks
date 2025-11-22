import { z } from 'zod';

/**
 * @swagger
 * components:
 *   schemas:
 *     ListCreate:
 *       type: object
 *       properties:
 *         name:
 *           type: string
 *           minLength: 1
 *           maxLength: 100
 *           description: The name of the list
 *         description:
 *           type: string
 *           maxLength: 500
 *           nullable: true
 *           description: Description of the list
 *         visibility:
 *           type: string
 *           enum: [private, public, password]
 *           default: private
 *           description: Visibility level of the list
 *         password:
 *           type: string
 *           minLength: 4
 *           maxLength: 50
 *           nullable: true
 *           description: Password for password-protected lists
 *       required:
 *         - name
 *     ListUpdate:
 *       type: object
 *       properties:
 *         name:
 *           type: string
 *           minLength: 1
 *           maxLength: 100
 *           description: The name of the list
 *         description:
 *           type: string
 *           maxLength: 500
 *           nullable: true
 *           description: Description of the list
 *         visibility:
 *           type: string
 *           enum: [private, public, password]
 *           description: Visibility level of the list
 *         password:
 *           type: string
 *           minLength: 4
 *           maxLength: 50
 *           nullable: true
 *           description: Password for password-protected lists
 *     AddWishToList:
 *       type: object
 *       properties:
 *         wishId:
 *           type: string
 *           minLength: 1
 *           description: ID of the wish to add to the list
 *       required:
 *         - wishId
 *     RemoveWishFromList:
 *       type: object
 *       properties:
 *         wishId:
 *           type: string
 *           minLength: 1
 *           description: ID of the wish to remove from the list
 *       required:
 *         - wishId
 */

// List creation schema
export const ListCreateSchema = z.object({
  name: z
    .string()
    .min(1, 'List name is required')
    .max(100, 'List name must be less than 100 characters')
    .trim(),
  description: z
    .string()
    .max(500, 'Description must be less than 500 characters')
    .optional()
    .nullable(),
  visibility: z.enum(['private', 'public', 'password']).default('private'),
  password: z
    .string()
    .min(4, 'Password must be at least 4 characters')
    .max(50, 'Password must be less than 50 characters')
    .optional()
    .nullable(),
  hideFromProfile: z.boolean().default(false),
});

// Gift card schema
export const GiftCardSchema = z.object({
  name: z.string().min(1).max(14, 'Gift card name must be 14 characters or less'),
  url: z.string().url('Invalid URL format'),
});

// List update schema with gift cards
export const ListUpdateSchema = ListCreateSchema.partial().extend({
  giftCardPreferences: z.array(GiftCardSchema).max(10).optional(),
});

// Add wish to list schema
export const AddWishToListSchema = z.object({
  wishId: z.string().min(1, 'Wish ID is required'),
});

// Remove wish from list schema
export const RemoveWishFromListSchema = z.object({
  wishId: z.string().min(1, 'Wish ID is required'),
});

// List access schema (for password-protected lists)
export const ListAccessSchema = z.object({
  password: z.string().min(1, 'Password is required'),
});

// Pagination schema for lists
export const ListPaginationSchema = z.object({
  cursor: z.string().optional(),
  limit: z.number().int().positive().max(100).optional(),
  search: z.string().optional(),
});

// Type exports
export type ListCreateInput = z.infer<typeof ListCreateSchema>;
export type ListUpdateInput = z.infer<typeof ListUpdateSchema>;
export type AddWishToListInput = z.infer<typeof AddWishToListSchema>;
export type RemoveWishFromListInput = z.infer<typeof RemoveWishFromListSchema>;
export type ListAccessInput = z.infer<typeof ListAccessSchema>;
export type ListPaginationOptions = z.infer<typeof ListPaginationSchema>;
