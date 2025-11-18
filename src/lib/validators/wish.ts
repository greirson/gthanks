import { z } from 'zod';
import { simplifyProductUrl } from '@/lib/utils/url-simplification';

/**
 * @swagger
 * components:
 *   schemas:
 *     Wish:
 *       type: object
 *       properties:
 *         id:
 *           type: string
 *           description: The unique identifier for the wish
 *         title:
 *           type: string
 *           description: The title of the wish
 *         notes:
 *           type: string
 *           nullable: true
 *           description: Additional notes about the wish
 *         url:
 *           type: string
 *           format: uri
 *           nullable: true
 *           description: URL of the product or item
 *         price:
 *           type: number
 *           format: float
 *           nullable: true
 *           description: Price of the item
 *         imageUrl:
 *           type: string
 *           format: uri
 *           nullable: true
 *           description: URL of the product image
 *         quantity:
 *           type: integer
 *           minimum: 1
 *           description: Quantity desired
 *         size:
 *           type: string
 *           nullable: true
 *           description: Size information
 *         color:
 *           type: string
 *           nullable: true
 *           description: Color information
 *         createdAt:
 *           type: string
 *           format: date-time
 *           description: When the wish was created
 *         updatedAt:
 *           type: string
 *           format: date-time
 *           description: When the wish was last updated
 *         userId:
 *           type: string
 *           description: ID of the user who created the wish
 *         user:
 *           $ref: '#/components/schemas/User'
 *         lists:
 *           type: array
 *           items:
 *             $ref: '#/components/schemas/List'
 *         reservations:
 *           type: array
 *           items:
 *             $ref: '#/components/schemas/Reservation'
 *       required:
 *         - id
 *         - title
 *         - quantity
 *         - createdAt
 *         - updatedAt
 *         - userId
 *     WishCreate:
 *       type: object
 *       properties:
 *         title:
 *           type: string
 *           minLength: 1
 *           maxLength: 200
 *           description: The title of the wish
 *         notes:
 *           type: string
 *           maxLength: 2000
 *           nullable: true
 *           description: Additional notes about the wish
 *         url:
 *           type: string
 *           format: uri
 *           nullable: true
 *           description: URL of the product (must start with http:// or https://)
 *         price:
 *           type: number
 *           format: float
 *           minimum: 0
 *           maximum: 999999.99
 *           nullable: true
 *           description: Price of the item
 *         imageUrl:
 *           type: string
 *           nullable: true
 *           description: URL of the product image or uploaded image path
 *         quantity:
 *           type: integer
 *           minimum: 1
 *           maximum: 100
 *           default: 1
 *           description: Quantity desired
 *         size:
 *           type: string
 *           maxLength: 50
 *           nullable: true
 *           description: Size information
 *         color:
 *           type: string
 *           maxLength: 50
 *           nullable: true
 *           description: Color information
 *       required:
 *         - title
 *     WishUpdate:
 *       type: object
 *       properties:
 *         title:
 *           type: string
 *           minLength: 1
 *           maxLength: 200
 *           description: The title of the wish
 *         notes:
 *           type: string
 *           maxLength: 2000
 *           nullable: true
 *           description: Additional notes about the wish
 *         url:
 *           type: string
 *           format: uri
 *           nullable: true
 *           description: URL of the product (must start with http:// or https://)
 *         price:
 *           type: number
 *           format: float
 *           minimum: 0
 *           maximum: 999999.99
 *           nullable: true
 *           description: Price of the item
 *         imageUrl:
 *           type: string
 *           nullable: true
 *           description: URL of the product image or uploaded image path
 *         quantity:
 *           type: integer
 *           minimum: 1
 *           maximum: 100
 *           description: Quantity desired
 *         size:
 *           type: string
 *           maxLength: 50
 *           nullable: true
 *           description: Size information
 *         color:
 *           type: string
 *           maxLength: 50
 *           nullable: true
 *           description: Color information
 */

// Safe URL validator to prevent XSS attacks via malicious protocols
const safeUrlValidator = z
  .string()
  .url('Please enter a valid URL')
  .refine(
    (url) => {
      try {
        const parsed = new URL(url);
        return ['http:', 'https:'].includes(parsed.protocol);
      } catch {
        return false;
      }
    },
    { message: 'Only http and https URLs are allowed' }
  );

// Input validation for creating a wish
export const WishCreateSchema = z.object({
  title: z
    .string()
    .min(1, 'Title is required')
    .max(200, 'Title must be less than 200 characters')
    .trim(),
  notes: z.string().max(2000, 'Notes must be less than 2000 characters').optional().nullable(),
  url: z
    .preprocess((val) => {
      // Convert null/undefined to undefined for proper optional handling
      if (val === null || val === undefined || val === '') {
        return undefined;
      }
      return val;
    }, safeUrlValidator.optional())
    .transform((url) => {
      // Simplify product URLs to remove tracking parameters and keep URLs under character limits
      if (!url) {
        return null;
      }
      return simplifyProductUrl(url);
    })
    .refine(
      (url) => {
        // Ensure simplified URL is still within length limits
        return !url || url.length <= 2048;
      },
      { message: 'URL must be less than 2048 characters' }
    ),
  price: z
    .number()
    .positive('Price must be positive')
    .max(999999.99, 'Price too high')
    .optional()
    .nullable(),
  imageUrl: z
    .string()
    .optional()
    .nullable()
    .refine((url) => {
      if (!url || url.trim() === '') {
        return true;
      }

      // Allow internal image paths (uploaded images)
      if (
        url.startsWith('/api/images/') &&
        url.match(/^\/api\/images\/[a-f0-9-]{36}\.(webp|jpg|jpeg|png|gif)$/i)
      ) {
        return true;
      }

      // Allow external URLs
      try {
        new URL(url);
        return true;
      } catch {
        return false;
      }
    }, 'Must be a valid image URL or uploaded image path'),
  quantity: z
    .number()
    .int('Quantity must be whole number')
    .positive('Quantity must be positive')
    .max(100, 'Quantity too high')
    .default(1),
  size: z.string().max(50, 'Size must be less than 50 characters').optional().nullable(),
  color: z.string().max(50, 'Color must be less than 50 characters').optional().nullable(),
  wishLevel: z
    .number()
    .int('Wish level must be a whole number')
    .min(1, 'Wish level must be at least 1')
    .max(3, 'Wish level must be at most 3')
    .default(1)
    .optional(),
});

// Input validation for updating a wish
export const WishUpdateSchema = WishCreateSchema.partial();

// Type exports
export type WishCreateInput = z.infer<typeof WishCreateSchema>;
export type WishUpdateInput = z.infer<typeof WishUpdateSchema>;

// Wish type matching Prisma model (for tests and components)
export type Wish = {
  id: string;
  title: string;
  notes: string | null;
  url: string | null;
  price: number | null;
  currency: string | null;
  imageUrl: string | null;
  sourceImageUrl: string | null;
  localImagePath: string | null;
  imageStatus: string;
  quantity: number;
  size: string | null;
  color: string | null;
  wishLevel: number | null;
  ownerId: string;
  createdAt: Date;
  updatedAt: Date;
};

// Pagination schema
export const PaginationSchema = z.object({
  cursor: z.string().optional(),
  limit: z.number().int().positive().max(100).default(20),
});

// Enhanced query parameters schema for wishes API
export const WishQuerySchema = z.object({
  cursor: z.string().optional(),
  limit: z.number().int().positive().max(100).default(20),
  sortBy: z.enum(['createdAt', 'price', 'wishLevel', 'title']).default('wishLevel'),
  sortOrder: z.enum(['asc', 'desc']).default('desc'),
  priceMin: z.number().min(0).max(999999.99).optional(),
  priceMax: z.number().min(0).max(999999.99).optional(),
  wishLevelMin: z.number().int().min(1).max(3).optional(),
  wishLevelMax: z.number().int().min(1).max(3).optional(),
  hasPrice: z.boolean().optional(),
  hasWishLevel: z.boolean().optional(),
});

// Refined schema with cross-field validation
export const WishQueryValidatedSchema = WishQuerySchema.refine(
  (data) => {
    // Ensure priceMin <= priceMax if both provided
    if (data.priceMin !== undefined && data.priceMax !== undefined) {
      return data.priceMin <= data.priceMax;
    }
    return true;
  },
  {
    message: 'priceMin must be less than or equal to priceMax',
    path: ['priceMin'],
  }
).refine(
  (data) => {
    // Ensure wishLevelMin <= wishLevelMax if both provided
    if (data.wishLevelMin !== undefined && data.wishLevelMax !== undefined) {
      return data.wishLevelMin <= data.wishLevelMax;
    }
    return true;
  },
  {
    message: 'wishLevelMin must be less than or equal to wishLevelMax',
    path: ['wishLevelMin'],
  }
);

export type PaginationOptions = z.infer<typeof PaginationSchema>;
export type WishQueryOptions = z.infer<typeof WishQuerySchema>;
export type WishQueryParams = z.infer<typeof WishQuerySchema>;
export type WishQueryValidatedParams = z.infer<typeof WishQueryValidatedSchema>;

// Bulk operation schemas
export const BulkDeleteWishesSchema = z.object({
  wishIds: z.array(z.string().uuid('Invalid wish ID format')).min(1, 'At least one wish ID is required'),
});

export const BulkAddToListSchema = z.object({
  wishIds: z.array(z.string().uuid('Invalid wish ID format')).min(1, 'At least one wish ID is required'),
  listId: z.string().uuid('Invalid list ID format'),
});

export const BulkRemoveFromListsSchema = z.object({
  wishIds: z.array(z.string().uuid('Invalid wish ID format')).min(1, 'At least one wish ID is required'),
});

export type BulkDeleteWishesInput = z.infer<typeof BulkDeleteWishesSchema>;
export type BulkAddToListInput = z.infer<typeof BulkAddToListSchema>;
export type BulkRemoveFromListsInput = z.infer<typeof BulkRemoveFromListsSchema>;
