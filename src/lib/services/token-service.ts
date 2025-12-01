/**
 * Personal Access Token Service
 *
 * Manages the lifecycle of Personal Access Tokens (PATs) for API authentication:
 * - Token creation with secure hashing
 * - Token validation with O(1) prefix lookup + Argon2 verification
 * - Token refresh mechanism
 * - Token management (list, revoke, cleanup)
 *
 * Security:
 * - Never stores raw tokens (only Argon2id hashes)
 * - Checks user suspension status on validation
 * - Soft deletes via revokedAt for audit trail
 * - Prefix-based lookup prevents timing attacks on token enumeration
 *
 * Performance:
 * - O(1) database lookup via indexed tokenPrefix
 * - Non-blocking lastUsedAt updates
 * - Early expiration/revocation checks before hash verification
 */

import { db } from '@/lib/db';
import {
  extractTokenPrefix,
  generateAccessToken,
  generateRefreshToken,
  getTokenType,
  verifyToken,
} from '@/lib/crypto/token-generator';
import { ForbiddenError, NotFoundError } from '@/lib/errors';

import { logger } from './logger';

// Token lifetime constants
const ACCESS_TOKEN_LIFETIME_MS = 24 * 60 * 60 * 1000; // 24 hours
const REFRESH_TOKEN_LIFETIME_MS = 30 * 24 * 60 * 60 * 1000; // 30 days

// Cleanup thresholds
const EXPIRED_TOKEN_RETENTION_DAYS = 7; // Keep expired tokens for 7 days
const REVOKED_TOKEN_RETENTION_DAYS = 30; // Keep revoked tokens for 30 days

/**
 * Token pair returned on creation (raw tokens shown once)
 */
export interface TokenPair {
  /** Raw access token (shown once to user) */
  accessToken: string;
  /** Raw refresh token (shown once to user) */
  refreshToken: string;
  /** Access token expiration */
  expiresAt: Date;
  /** Refresh token expiration */
  refreshExpiresAt: Date;
  /** Token record ID */
  tokenId: string;
}

/**
 * Options for creating a new token
 */
export interface CreateTokenOptions {
  /** User ID who owns this token */
  userId: string;
  /** Human-readable name (e.g., "Safari Extension - MacBook Pro") */
  name: string;
  /** Device type (e.g., "safari_extension", "ios_app") */
  deviceType?: string;
  /** IP address for audit trail */
  createdIp?: string;
}

/**
 * Result of successful token validation
 */
export interface ValidatedToken {
  /** User ID associated with the token */
  userId: string;
  /** Token record ID */
  tokenId: string;
  /** Authentication method identifier */
  authMethod: 'token';
}

/**
 * Result of access token refresh
 */
export interface RefreshedToken {
  /** New access token */
  accessToken: string;
  /** New expiration time */
  expiresAt: Date;
}

/**
 * Token information for UI display
 */
export interface TokenInfo {
  /** Token record ID */
  id: string;
  /** Human-readable name */
  name: string;
  /** Device type */
  deviceType: string | null;
  /** Token prefix for display (e.g., "gth_abc1...") */
  tokenPrefix: string;
  /** Last used timestamp */
  lastUsedAt: Date | null;
  /** Creation timestamp */
  createdAt: Date;
  /** Access token expiration */
  expiresAt: Date;
  /** True if this is the currently authenticating token */
  current?: boolean;
}

/**
 * Personal Access Token Service
 *
 * Handles all token operations with security-first design.
 */
export class TokenService {
  /**
   * Create a new personal access token
   *
   * Generates both access and refresh tokens with:
   * - Cryptographically secure random bytes
   * - Argon2id hashing for storage
   * - Prefix extraction for efficient lookup
   *
   * @param options - Token creation options
   * @returns Token pair with raw tokens (shown once)
   *
   * @example
   * const { accessToken, refreshToken } = await tokenService.createToken({
   *   userId: 'user123',
   *   name: 'Safari Extension - MacBook Pro',
   *   deviceType: 'safari_extension',
   *   createdIp: '192.168.1.1'
   * });
   */
  async createToken(options: CreateTokenOptions): Promise<TokenPair> {
    const { userId, name, deviceType, createdIp } = options;

    // Verify user exists and is not suspended
    const user = await db.user.findUnique({
      where: { id: userId },
      select: { id: true, suspendedAt: true },
    });

    if (!user) {
      throw new NotFoundError('User not found');
    }

    if (user.suspendedAt) {
      throw new ForbiddenError('Account is suspended');
    }

    // Generate tokens
    const accessTokenData = await generateAccessToken();
    const refreshTokenData = await generateRefreshToken();

    // Calculate expiration times
    const now = new Date();
    const expiresAt = new Date(now.getTime() + ACCESS_TOKEN_LIFETIME_MS);
    const refreshExpiresAt = new Date(now.getTime() + REFRESH_TOKEN_LIFETIME_MS);

    // Create token record in database
    const tokenRecord = await db.personalAccessToken.create({
      data: {
        userId,
        name,
        deviceType: deviceType || null,
        accessTokenHash: accessTokenData.hash,
        refreshTokenHash: refreshTokenData.hash,
        tokenPrefix: accessTokenData.prefix,
        expiresAt,
        refreshExpiresAt,
        createdIp: createdIp || null,
      },
    });

    logger.info({ userId, tokenId: tokenRecord.id, deviceType }, 'Personal access token created');

    return {
      accessToken: accessTokenData.token,
      refreshToken: refreshTokenData.token,
      expiresAt,
      refreshExpiresAt,
      tokenId: tokenRecord.id,
    };
  }

  /**
   * Validate an access token
   *
   * Performance-optimized validation:
   * 1. Extract prefix from token (O(1))
   * 2. Database lookup by indexed prefix (O(1))
   * 3. Check expiration and revocation BEFORE hash comparison
   * 4. Single Argon2 verification (only if token found and valid)
   * 5. Update lastUsedAt asynchronously (non-blocking)
   * 6. Check user suspension status
   *
   * @param token - Raw access token to validate
   * @param clientIp - Optional IP for audit trail
   * @returns Validated token info or null if invalid
   *
   * @example
   * const validated = await tokenService.validateAccessToken(token, '192.168.1.1');
   * if (!validated) {
   *   throw new UnauthorizedError('Invalid token');
   * }
   */
  async validateAccessToken(token: string, clientIp?: string): Promise<ValidatedToken | null> {
    // Verify token format
    const tokenType = getTokenType(token);
    if (tokenType !== 'access') {
      return null;
    }

    // Extract prefix for database lookup
    const prefix = extractTokenPrefix(token);
    if (!prefix) {
      return null;
    }

    // Look up token by prefix (indexed, O(1))
    const tokenRecord = await db.personalAccessToken.findUnique({
      where: { tokenPrefix: prefix },
      include: {
        user: {
          select: {
            id: true,
            suspendedAt: true,
          },
        },
      },
    });

    // Token not found
    if (!tokenRecord) {
      return null;
    }

    // Check if token is revoked (early exit before expensive hash check)
    if (tokenRecord.revokedAt) {
      return null;
    }

    // Check if token is expired (early exit before expensive hash check)
    if (tokenRecord.expiresAt < new Date()) {
      return null;
    }

    // Verify the token hash (single Argon2 operation)
    const isValid = await verifyToken(token, tokenRecord.accessTokenHash);
    if (!isValid) {
      return null;
    }

    // Check user suspension status
    if (tokenRecord.user.suspendedAt) {
      return null;
    }

    // Update lastUsedAt asynchronously (non-blocking)
    this.updateLastUsed(tokenRecord.id, clientIp).catch((err: unknown) => {
      logger.warn({ error: err, tokenId: tokenRecord.id }, 'Failed to update token lastUsedAt');
    });

    return {
      userId: tokenRecord.userId,
      tokenId: tokenRecord.id,
      authMethod: 'token',
    };
  }

  /**
   * Refresh an access token using a refresh token
   *
   * @param refreshToken - Raw refresh token
   * @returns New access token or null if invalid
   *
   * @example
   * const refreshed = await tokenService.refreshAccessToken(refreshToken);
   * if (!refreshed) {
   *   // User needs to re-authenticate
   * }
   */
  async refreshAccessToken(refreshToken: string): Promise<RefreshedToken | null> {
    // Verify token format
    const tokenType = getTokenType(refreshToken);
    if (tokenType !== 'refresh') {
      return null;
    }

    // Extract prefix - refresh tokens have different prefix but same extraction logic
    const prefix = extractTokenPrefix(refreshToken);
    if (!prefix) {
      return null;
    }

    // Find tokens with refresh token hash (need to search all tokens)
    // Note: We can't use prefix lookup for refresh tokens since the stored prefix
    // is from the access token. We need to iterate through valid tokens.
    const validTokens = await db.personalAccessToken.findMany({
      where: {
        revokedAt: null,
        refreshExpiresAt: {
          gt: new Date(),
        },
        refreshTokenHash: {
          not: null,
        },
      },
      include: {
        user: {
          select: {
            id: true,
            suspendedAt: true,
          },
        },
      },
    });

    // Find the matching token by verifying refresh token hash
    let matchedToken = null;
    for (const token of validTokens) {
      if (token.refreshTokenHash) {
        const isValid = await verifyToken(refreshToken, token.refreshTokenHash);
        if (isValid) {
          matchedToken = token;
          break;
        }
      }
    }

    if (!matchedToken) {
      return null;
    }

    // Check user suspension
    if (matchedToken.user.suspendedAt) {
      return null;
    }

    // Generate new access token
    const newAccessToken = await generateAccessToken();
    const newExpiresAt = new Date(Date.now() + ACCESS_TOKEN_LIFETIME_MS);

    // Update the token record with new access token
    await db.personalAccessToken.update({
      where: { id: matchedToken.id },
      data: {
        accessTokenHash: newAccessToken.hash,
        tokenPrefix: newAccessToken.prefix,
        expiresAt: newExpiresAt,
      },
    });

    logger.info(
      { userId: matchedToken.userId, tokenId: matchedToken.id },
      'Access token refreshed'
    );

    return {
      accessToken: newAccessToken.token,
      expiresAt: newExpiresAt,
    };
  }

  /**
   * List all tokens for a user
   *
   * @param userId - User ID to list tokens for
   * @param currentTokenId - Optional ID of the current authenticating token
   * @returns Array of token info objects
   *
   * @example
   * const tokens = await tokenService.listUserTokens(userId, currentTokenId);
   */
  async listUserTokens(userId: string, currentTokenId?: string): Promise<TokenInfo[]> {
    const tokens = await db.personalAccessToken.findMany({
      where: {
        userId,
        revokedAt: null, // Only show active tokens
      },
      orderBy: {
        createdAt: 'desc',
      },
      select: {
        id: true,
        name: true,
        deviceType: true,
        tokenPrefix: true,
        lastUsedAt: true,
        createdAt: true,
        expiresAt: true,
      },
    });

    return tokens.map((token) => ({
      id: token.id,
      name: token.name,
      deviceType: token.deviceType,
      tokenPrefix: `${token.tokenPrefix}...`,
      lastUsedAt: token.lastUsedAt,
      createdAt: token.createdAt,
      expiresAt: token.expiresAt,
      current: token.id === currentTokenId,
    }));
  }

  /**
   * Revoke a specific token
   *
   * Soft deletes the token by setting revokedAt (preserves audit trail)
   *
   * @param tokenId - Token ID to revoke
   * @param userId - User ID (for ownership verification)
   *
   * @example
   * await tokenService.revokeToken(tokenId, userId);
   */
  async revokeToken(tokenId: string, userId: string): Promise<void> {
    // Find and verify ownership
    const token = await db.personalAccessToken.findUnique({
      where: { id: tokenId },
      select: { id: true, userId: true, revokedAt: true },
    });

    if (!token) {
      throw new NotFoundError('Token not found');
    }

    if (token.userId !== userId) {
      throw new ForbiddenError('Cannot revoke token belonging to another user');
    }

    // Already revoked
    if (token.revokedAt) {
      return;
    }

    // Soft delete
    await db.personalAccessToken.update({
      where: { id: tokenId },
      data: { revokedAt: new Date() },
    });

    logger.info({ userId, tokenId }, 'Personal access token revoked');
  }

  /**
   * Revoke all tokens for a user
   *
   * Useful for security events (password change, account compromise)
   *
   * @param userId - User ID to revoke all tokens for
   * @returns Number of tokens revoked
   *
   * @example
   * const count = await tokenService.revokeAllTokens(userId);
   */
  async revokeAllTokens(userId: string): Promise<number> {
    const result = await db.personalAccessToken.updateMany({
      where: {
        userId,
        revokedAt: null,
      },
      data: {
        revokedAt: new Date(),
      },
    });

    if (result.count > 0) {
      logger.info({ userId, count: result.count }, 'All personal access tokens revoked');
    }

    return result.count;
  }

  /**
   * Clean up expired tokens (for cron job)
   *
   * Deletes:
   * - Access tokens expired more than 7 days ago
   * - Revoked tokens more than 30 days ago
   *
   * @returns Number of tokens deleted
   *
   * @example
   * // Run daily via cron
   * const { deletedCount } = await tokenService.cleanupExpiredTokens();
   */
  async cleanupExpiredTokens(): Promise<{ deletedCount: number }> {
    const now = new Date();

    // Calculate thresholds
    const expiredThreshold = new Date(
      now.getTime() - EXPIRED_TOKEN_RETENTION_DAYS * 24 * 60 * 60 * 1000
    );
    const revokedThreshold = new Date(
      now.getTime() - REVOKED_TOKEN_RETENTION_DAYS * 24 * 60 * 60 * 1000
    );

    // Delete in a single operation
    const result = await db.personalAccessToken.deleteMany({
      where: {
        OR: [
          // Expired tokens past retention
          {
            expiresAt: {
              lt: expiredThreshold,
            },
          },
          // Revoked tokens past retention
          {
            revokedAt: {
              lt: revokedThreshold,
            },
          },
        ],
      },
    });

    if (result.count > 0) {
      logger.info({ deletedCount: result.count }, 'Cleaned up expired personal access tokens');
    }

    return { deletedCount: result.count };
  }

  /**
   * Update lastUsedAt and lastUsedIp for a token
   * Called asynchronously to avoid blocking validation
   */
  private async updateLastUsed(tokenId: string, clientIp?: string): Promise<void> {
    await db.personalAccessToken.update({
      where: { id: tokenId },
      data: {
        lastUsedAt: new Date(),
        lastUsedIp: clientIp || null,
      },
    });
  }
}

// Export singleton instance
export const tokenService = new TokenService();
