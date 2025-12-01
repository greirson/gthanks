import { z } from 'zod';

/**
 * @swagger
 * components:
 *   schemas:
 *     DeviceType:
 *       type: string
 *       enum:
 *         - safari_extension
 *         - chrome_extension
 *         - firefox_extension
 *         - ios_app
 *         - android_app
 *         - api_client
 *         - other
 *       description: Type of device or client using the token
 *     ExpirationOption:
 *       type: string
 *       enum:
 *         - 30d
 *         - 90d
 *         - 6m
 *         - 1y
 *         - never
 *       description: Token expiration option
 *     TokenCreate:
 *       type: object
 *       properties:
 *         name:
 *           type: string
 *           minLength: 1
 *           maxLength: 100
 *           description: Human-readable name for the token
 *         deviceType:
 *           $ref: '#/components/schemas/DeviceType'
 *         expiresIn:
 *           $ref: '#/components/schemas/ExpirationOption'
 *       required:
 *         - name
 *     TokenUser:
 *       type: object
 *       properties:
 *         id:
 *           type: string
 *           description: User ID
 *         name:
 *           type: string
 *           nullable: true
 *           description: User display name
 *         email:
 *           type: string
 *           format: email
 *           nullable: true
 *           description: User email address
 *       required:
 *         - id
 *     TokenCreationResponse:
 *       type: object
 *       properties:
 *         token:
 *           type: string
 *           description: Personal access token for API authentication
 *         expiresAt:
 *           type: integer
 *           format: int64
 *           nullable: true
 *           description: Unix timestamp in milliseconds when token expires (null = never)
 *         user:
 *           $ref: '#/components/schemas/TokenUser'
 *       required:
 *         - token
 *         - user
 *     TokenInfo:
 *       type: object
 *       properties:
 *         id:
 *           type: string
 *           description: Token ID
 *         name:
 *           type: string
 *           description: Human-readable token name
 *         deviceType:
 *           type: string
 *           nullable: true
 *           description: Type of device using the token
 *         tokenPrefix:
 *           type: string
 *           description: First 8 characters of token for identification (e.g., "gth_abc1")
 *         lastUsedAt:
 *           type: string
 *           format: date-time
 *           nullable: true
 *           description: When the token was last used
 *         createdAt:
 *           type: string
 *           format: date-time
 *           description: When the token was created
 *         expiresAt:
 *           type: string
 *           format: date-time
 *           nullable: true
 *           description: When the token expires (null = never)
 *         current:
 *           type: boolean
 *           description: Whether this is the token used for the current request
 *       required:
 *         - id
 *         - name
 *         - tokenPrefix
 *         - createdAt
 *     TokenListResponse:
 *       type: object
 *       properties:
 *         tokens:
 *           type: array
 *           items:
 *             $ref: '#/components/schemas/TokenInfo'
 *       required:
 *         - tokens
 *     TokenError:
 *       type: object
 *       properties:
 *         error:
 *           type: string
 *           enum:
 *             - unauthorized
 *             - invalid_token
 *             - token_expired
 *             - token_revoked
 *             - not_found
 *             - rate_limited
 *             - validation_error
 *           description: Error code
 *         message:
 *           type: string
 *           description: Human-readable error message
 *       required:
 *         - error
 *         - message
 */

// Device types enum
export const DEVICE_TYPES = [
  'safari_extension',
  'chrome_extension',
  'firefox_extension',
  'ios_app',
  'android_app',
  'api_client',
  'other',
] as const;

export type DeviceType = (typeof DEVICE_TYPES)[number];

// Expiration options (GitHub PAT style)
export const EXPIRATION_OPTIONS = ['30d', '90d', '6m', '1y', 'never'] as const;

export type ExpirationOption = (typeof EXPIRATION_OPTIONS)[number];

// Default expiration (90 days like GitHub)
export const DEFAULT_EXPIRATION: ExpirationOption = '90d';

// Expiration labels for UI display
export const EXPIRATION_LABELS: Record<ExpirationOption, string> = {
  '30d': '30 days',
  '90d': '90 days',
  '6m': '6 months',
  '1y': '1 year',
  never: 'No expiration',
};

// Zod schema for device type
const deviceTypeSchema = z.enum(DEVICE_TYPES);

// Zod schema for expiration option
const expirationOptionSchema = z.enum(EXPIRATION_OPTIONS);

// =============================================================================
// Request Schemas
// =============================================================================

/**
 * Schema for creating a new personal access token
 * POST /api/auth/tokens
 */
export const createTokenSchema = z.object({
  name: z
    .string()
    .trim() // Trim BEFORE validation to reject whitespace-only names
    .min(1, 'Name is required')
    .max(100, 'Name must be less than 100 characters'),
  deviceType: deviceTypeSchema.optional(),
  expiresIn: expirationOptionSchema.optional().default(DEFAULT_EXPIRATION),
});

// =============================================================================
// Response Schemas
// =============================================================================

/**
 * User info included in token creation response
 */
export const tokenUserSchema = z.object({
  id: z.string(),
  name: z.string().nullable(),
  email: z.string().email().nullable(),
});

/**
 * Token creation response schema
 * Returned when a new token is created (simplified - no refresh token)
 */
export const tokenCreationResponseSchema = z.object({
  token: z.string(),
  expiresAt: z.number().nullable(), // Unix timestamp in milliseconds, null = never
  user: tokenUserSchema,
});

/**
 * Individual token info for listing
 * Used in GET /api/auth/tokens response
 */
export const tokenInfoSchema = z.object({
  id: z.string(),
  name: z.string(),
  deviceType: z.string().nullable(),
  tokenPrefix: z.string(), // "gth_abc1" for display
  lastUsedAt: z.string().datetime().nullable(),
  createdAt: z.string().datetime(),
  expiresAt: z.string().datetime().nullable(), // null = never expires
  current: z.boolean().optional(),
});

/**
 * Token list response schema
 * GET /api/auth/tokens
 */
export const tokenListResponseSchema = z.object({
  tokens: z.array(tokenInfoSchema),
});

// =============================================================================
// Error Response Schema
// =============================================================================

/**
 * Error codes for token-related operations
 */
export const TOKEN_ERROR_CODES = [
  'unauthorized',
  'invalid_token',
  'token_expired',
  'token_revoked',
  'not_found',
  'rate_limited',
  'validation_error',
] as const;

export type TokenErrorCode = (typeof TOKEN_ERROR_CODES)[number];

/**
 * Token error response schema
 */
export const tokenErrorSchema = z.object({
  error: z.enum(TOKEN_ERROR_CODES),
  message: z.string(),
});

// =============================================================================
// Type Exports
// =============================================================================

export type CreateTokenInput = z.infer<typeof createTokenSchema>;
export type TokenUser = z.infer<typeof tokenUserSchema>;
export type TokenCreationResponse = z.infer<typeof tokenCreationResponseSchema>;
export type TokenInfo = z.infer<typeof tokenInfoSchema>;
export type TokenListResponse = z.infer<typeof tokenListResponseSchema>;
export type TokenError = z.infer<typeof tokenErrorSchema>;
