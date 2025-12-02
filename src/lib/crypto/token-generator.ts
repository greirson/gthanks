/**
 * Personal Access Token Generation Utilities
 *
 * Generates secure, prefixed tokens for API authentication with:
 * - Cryptographically secure random bytes (256-bit entropy)
 * - URL-safe base64 encoding
 * - Argon2id hashing for storage
 * - Prefix extraction for O(1) database lookup
 *
 * Token Formats:
 *   Access Token:  gth_<base64url(32 bytes)>  (~50 chars total)
 *   Refresh Token: gth_ref_<base64url(32 bytes)>  (~54 chars total)
 *
 * Security:
 *   - Never log raw tokens
 *   - Store only Argon2id hashes in database
 *   - Use prefix for O(1) lookup, then verify hash
 *   - Constant-time hash comparison via Argon2
 *
 * Usage:
 *   const { token, hash, prefix } = await generateAccessToken();
 *   // Store: hash, prefix in database
 *   // Return: token to user (one-time display)
 *
 *   const isValid = await verifyToken(userProvidedToken, storedHash);
 */

import crypto from 'crypto';

import { hash, verify } from '@node-rs/argon2';

// Token prefixes for identification
const ACCESS_TOKEN_PREFIX = 'gth_';
const REFRESH_TOKEN_PREFIX = 'gth_ref_';

// Token entropy: 32 bytes = 256 bits
const TOKEN_BYTES = 32;

// Prefix length for database lookup (first 8 chars including prefix)
const PREFIX_LENGTH = 8;

/**
 * Argon2id configuration for token hashing
 *
 * These settings balance security and performance:
 * - memoryCost: 65536 KB (64 MB) - protects against GPU attacks
 * - timeCost: 3 iterations - increases computational cost
 * - parallelism: 4 threads - utilizes multi-core CPUs
 * - outputLen: 32 bytes - standard hash output
 *
 * Note: Slightly higher than list password settings for API tokens
 * since these protect programmatic access to the API.
 */
const ARGON2_OPTIONS = {
  memoryCost: 65536, // 64 MB
  timeCost: 3,
  parallelism: 4,
  outputLen: 32,
};

/**
 * Result of token generation
 */
export interface GeneratedToken {
  /** Full token to display to user (one-time): "gth_abc123..." */
  token: string;
  /** Argon2id hash for database storage */
  hash: string;
  /** First 8 chars for O(1) database lookup: "gth_abc1" */
  prefix: string;
}

/**
 * Generate URL-safe base64 encoding (RFC 4648)
 * Replaces + with -, / with _, and removes = padding
 */
function base64UrlEncode(buffer: Buffer): string {
  return buffer.toString('base64').replace(/\+/g, '-').replace(/\//g, '_').replace(/=/g, '');
}

/**
 * Generate cryptographically secure random token
 *
 * @param prefix - Token prefix (e.g., "gth_" or "gth_ref_")
 * @returns Full token string with prefix
 */
function generateSecureToken(prefix: string): string {
  const randomBytes = crypto.randomBytes(TOKEN_BYTES);
  const encoded = base64UrlEncode(randomBytes);
  return `${prefix}${encoded}`;
}

/**
 * Generate a new access token with Argon2id hash
 *
 * @returns Promise resolving to token, hash, and prefix
 *
 * @example
 * const { token, hash, prefix } = await generateAccessToken();
 * // Store hash and prefix in database
 * // Display token to user once (never store raw token)
 */
export async function generateAccessToken(): Promise<GeneratedToken> {
  const token = generateSecureToken(ACCESS_TOKEN_PREFIX);
  const tokenHash = await hash(token, ARGON2_OPTIONS);
  const prefix = token.substring(0, PREFIX_LENGTH);

  return {
    token,
    hash: tokenHash,
    prefix,
  };
}

/**
 * Generate a new refresh token with Argon2id hash
 *
 * @returns Promise resolving to token, hash, and prefix
 *
 * @example
 * const { token, hash, prefix } = await generateRefreshToken();
 * // Store hash and prefix in database
 * // Display token to user once (never store raw token)
 */
export async function generateRefreshToken(): Promise<GeneratedToken> {
  const token = generateSecureToken(REFRESH_TOKEN_PREFIX);
  const tokenHash = await hash(token, ARGON2_OPTIONS);
  const prefix = token.substring(0, PREFIX_LENGTH);

  return {
    token,
    hash: tokenHash,
    prefix,
  };
}

/**
 * Verify a token against its stored Argon2id hash
 *
 * Uses Argon2's built-in constant-time comparison to prevent timing attacks.
 *
 * @param token - User-provided token to verify
 * @param storedHash - Argon2id hash from database
 * @returns Promise resolving to true if token matches hash
 *
 * @example
 * const isValid = await verifyToken(requestToken, storedHash);
 * if (!isValid) {
 *   throw new UnauthorizedError('Invalid token');
 * }
 */
export async function verifyToken(token: string, storedHash: string): Promise<boolean> {
  if (!token || !storedHash) {
    return false;
  }

  try {
    // Argon2 verify uses constant-time comparison internally
    return await verify(storedHash, token);
  } catch {
    // Invalid hash format or verification error
    // Don't log token content for security
    return false;
  }
}

/**
 * Extract the prefix from a token for database lookup
 *
 * The prefix (first 8 characters) allows O(1) database lookup
 * before performing the more expensive hash verification.
 *
 * @param token - Full token string
 * @returns Prefix string if valid token format, null otherwise
 *
 * @example
 * const prefix = extractTokenPrefix(requestToken);
 * if (!prefix) {
 *   throw new UnauthorizedError('Invalid token format');
 * }
 * const tokenRecord = await db.token.findUnique({ where: { prefix } });
 */
export function extractTokenPrefix(token: string): string | null {
  if (!token || typeof token !== 'string') {
    return null;
  }

  // Validate token has expected prefix format
  if (!token.startsWith(ACCESS_TOKEN_PREFIX) && !token.startsWith(REFRESH_TOKEN_PREFIX)) {
    return null;
  }

  // Ensure token is long enough to extract prefix
  if (token.length < PREFIX_LENGTH) {
    return null;
  }

  return token.substring(0, PREFIX_LENGTH);
}

/**
 * Check if a string looks like a valid gthanks token
 *
 * @param token - String to check
 * @returns true if token has valid prefix format
 */
export function isValidTokenFormat(token: string): boolean {
  if (!token || typeof token !== 'string') {
    return false;
  }

  // Check for valid prefix
  if (!token.startsWith(ACCESS_TOKEN_PREFIX) && !token.startsWith(REFRESH_TOKEN_PREFIX)) {
    return false;
  }

  // Access tokens: gth_ + 43 chars (base64url of 32 bytes)
  // Refresh tokens: gth_ref_ + 43 chars
  const minAccessLength = ACCESS_TOKEN_PREFIX.length + 40;
  const minRefreshLength = REFRESH_TOKEN_PREFIX.length + 40;

  if (token.startsWith(REFRESH_TOKEN_PREFIX)) {
    return token.length >= minRefreshLength;
  }

  return token.length >= minAccessLength;
}

/**
 * Determine the type of token from its prefix
 *
 * @param token - Token string to check
 * @returns 'access' | 'refresh' | null
 */
export function getTokenType(token: string): 'access' | 'refresh' | null {
  if (!token || typeof token !== 'string') {
    return null;
  }

  if (token.startsWith(REFRESH_TOKEN_PREFIX)) {
    return 'refresh';
  }

  if (token.startsWith(ACCESS_TOKEN_PREFIX)) {
    return 'access';
  }

  return null;
}
