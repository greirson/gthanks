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
 *       required:
 *         - name
 *     TokenRefresh:
 *       type: object
 *       properties:
 *         refreshToken:
 *           type: string
 *           description: The refresh token to exchange for a new access token
 *       required:
 *         - refreshToken
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
 *         accessToken:
 *           type: string
 *           description: JWT access token for API authentication
 *         refreshToken:
 *           type: string
 *           description: Token to obtain new access tokens
 *         expiresAt:
 *           type: integer
 *           format: int64
 *           description: Unix timestamp in milliseconds when access token expires
 *         user:
 *           $ref: '#/components/schemas/TokenUser'
 *       required:
 *         - accessToken
 *         - refreshToken
 *         - expiresAt
 *         - user
 *     TokenRefreshResponse:
 *       type: object
 *       properties:
 *         accessToken:
 *           type: string
 *           description: New JWT access token
 *         expiresAt:
 *           type: integer
 *           format: int64
 *           description: Unix timestamp in milliseconds when new access token expires
 *       required:
 *         - accessToken
 *         - expiresAt
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
 *           description: When the token expires
 *         current:
 *           type: boolean
 *           description: Whether this is the token used for the current request
 *       required:
 *         - id
 *         - name
 *         - tokenPrefix
 *         - createdAt
 *         - expiresAt
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
 *             - invalid_refresh_token
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

// Zod schema for device type
const deviceTypeSchema = z.enum(DEVICE_TYPES);

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
    .min(1, 'Name is required')
    .max(100, 'Name must be less than 100 characters')
    .trim(),
  deviceType: deviceTypeSchema.optional(),
});

/**
 * Schema for refreshing an access token
 * POST /api/auth/tokens/refresh
 */
export const refreshTokenSchema = z.object({
  refreshToken: z.string().min(1, 'Refresh token is required'),
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
 * Returned when a new token is created
 */
export const tokenCreationResponseSchema = z.object({
  accessToken: z.string(),
  refreshToken: z.string(),
  expiresAt: z.number(), // Unix timestamp in milliseconds
  user: tokenUserSchema,
});

/**
 * Token refresh response schema
 * Returned when an access token is refreshed
 */
export const tokenRefreshResponseSchema = z.object({
  accessToken: z.string(),
  expiresAt: z.number(), // Unix timestamp in milliseconds
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
  expiresAt: z.string().datetime(),
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
  'invalid_refresh_token',
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
export type RefreshTokenInput = z.infer<typeof refreshTokenSchema>;
export type TokenUser = z.infer<typeof tokenUserSchema>;
export type TokenCreationResponse = z.infer<typeof tokenCreationResponseSchema>;
export type TokenRefreshResponse = z.infer<typeof tokenRefreshResponseSchema>;
export type TokenInfo = z.infer<typeof tokenInfoSchema>;
export type TokenListResponse = z.infer<typeof tokenListResponseSchema>;
export type TokenError = z.infer<typeof tokenErrorSchema>;
