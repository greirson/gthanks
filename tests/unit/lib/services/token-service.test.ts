import { TokenService, tokenService } from '@/lib/services/token-service';
import { db } from '@/lib/db';
import { ForbiddenError, NotFoundError } from '@/lib/errors';
import {
  extractTokenPrefix,
  generateAccessToken,
  generateRefreshToken,
  getTokenType,
  verifyToken,
} from '@/lib/crypto/token-generator';

// Mock dependencies
jest.mock('@/lib/db', () => ({
  db: {
    user: { findUnique: jest.fn() },
    personalAccessToken: {
      create: jest.fn(),
      findUnique: jest.fn(),
      findMany: jest.fn(),
      update: jest.fn(),
      updateMany: jest.fn(),
      deleteMany: jest.fn(),
    },
  },
}));

jest.mock('@/lib/crypto/token-generator', () => ({
  extractTokenPrefix: jest.fn(),
  generateAccessToken: jest.fn(),
  generateRefreshToken: jest.fn(),
  getTokenType: jest.fn(),
  verifyToken: jest.fn(),
}));

jest.mock('@/lib/services/logger', () => ({
  logger: {
    info: jest.fn(),
    warn: jest.fn(),
    error: jest.fn(),
  },
}));

describe('TokenService', () => {
  // Test fixtures
  const mockUser = { id: 'user-123', suspendedAt: null };
  const mockSuspendedUser = { id: 'user-456', suspendedAt: new Date() };

  const mockAccessTokenData = {
    token: 'gth_abc123xyz456abcdefghijklmnopqrstuvwxyz12345',
    hash: '$argon2id$v=19$m=65536,t=3,p=4$accesshash',
    prefix: 'gth_abc1',
  };

  const mockRefreshTokenData = {
    token: 'gth_ref_xyz789abcdefghijklmnopqrstuvwxyz123456',
    hash: '$argon2id$v=19$m=65536,t=3,p=4$refreshhash',
    prefix: 'gth_ref_',
  };

  const mockTokenRecord = {
    id: 'token-789',
    userId: 'user-123',
    name: 'Test Token',
    deviceType: 'safari_extension',
    accessTokenHash: '$argon2id$v=19$m=65536,t=3,p=4$accesshash',
    refreshTokenHash: '$argon2id$v=19$m=65536,t=3,p=4$refreshhash',
    tokenPrefix: 'gth_abc1',
    expiresAt: new Date(Date.now() + 86400000), // 24 hours from now
    refreshExpiresAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), // 30 days from now
    revokedAt: null,
    lastUsedAt: null,
    lastUsedIp: null,
    createdAt: new Date(),
    createdIp: '192.168.1.1',
    user: mockUser,
  };

  const mockRevokedTokenRecord = {
    ...mockTokenRecord,
    id: 'token-revoked',
    revokedAt: new Date(Date.now() - 1000),
  };

  const mockExpiredTokenRecord = {
    ...mockTokenRecord,
    id: 'token-expired',
    expiresAt: new Date(Date.now() - 1000), // Expired 1 second ago
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('createToken', () => {
    it('creates token pair for valid user', async () => {
      (db.user.findUnique as jest.Mock).mockResolvedValue(mockUser);
      (generateAccessToken as jest.Mock).mockResolvedValue(mockAccessTokenData);
      (generateRefreshToken as jest.Mock).mockResolvedValue(mockRefreshTokenData);
      (db.personalAccessToken.create as jest.Mock).mockResolvedValue({
        id: 'new-token-id',
      });

      const result = await tokenService.createToken({
        userId: 'user-123',
        name: 'Safari Extension - MacBook Pro',
        deviceType: 'safari_extension',
        createdIp: '192.168.1.1',
      });

      expect(result).toEqual({
        accessToken: mockAccessTokenData.token,
        refreshToken: mockRefreshTokenData.token,
        expiresAt: expect.any(Date),
        refreshExpiresAt: expect.any(Date),
        tokenId: 'new-token-id',
      });

      // Verify expiration times are correct (approximately)
      const now = Date.now();
      expect(result.expiresAt.getTime()).toBeGreaterThan(now + 23 * 60 * 60 * 1000);
      expect(result.expiresAt.getTime()).toBeLessThan(now + 25 * 60 * 60 * 1000);
      expect(result.refreshExpiresAt.getTime()).toBeGreaterThan(now + 29 * 24 * 60 * 60 * 1000);
      expect(result.refreshExpiresAt.getTime()).toBeLessThan(now + 31 * 24 * 60 * 60 * 1000);
    });

    it('throws NotFoundError when user does not exist - SECURITY CRITICAL', async () => {
      (db.user.findUnique as jest.Mock).mockResolvedValue(null);

      await expect(
        tokenService.createToken({
          userId: 'nonexistent-user',
          name: 'Test Token',
        })
      ).rejects.toThrow(NotFoundError);

      await expect(
        tokenService.createToken({
          userId: 'nonexistent-user',
          name: 'Test Token',
        })
      ).rejects.toThrow('User not found');

      // Token generation should NOT be called
      expect(generateAccessToken).not.toHaveBeenCalled();
      expect(generateRefreshToken).not.toHaveBeenCalled();
    });

    it('throws ForbiddenError when user is suspended - SECURITY CRITICAL', async () => {
      (db.user.findUnique as jest.Mock).mockResolvedValue(mockSuspendedUser);

      await expect(
        tokenService.createToken({
          userId: 'user-456',
          name: 'Test Token',
        })
      ).rejects.toThrow(ForbiddenError);

      await expect(
        tokenService.createToken({
          userId: 'user-456',
          name: 'Test Token',
        })
      ).rejects.toThrow('Account is suspended');

      // Token generation should NOT be called
      expect(generateAccessToken).not.toHaveBeenCalled();
      expect(generateRefreshToken).not.toHaveBeenCalled();
    });

    it('stores Argon2 hashes (not raw tokens) - SECURITY CRITICAL', async () => {
      (db.user.findUnique as jest.Mock).mockResolvedValue(mockUser);
      (generateAccessToken as jest.Mock).mockResolvedValue(mockAccessTokenData);
      (generateRefreshToken as jest.Mock).mockResolvedValue(mockRefreshTokenData);
      (db.personalAccessToken.create as jest.Mock).mockResolvedValue({
        id: 'new-token-id',
      });

      await tokenService.createToken({
        userId: 'user-123',
        name: 'Test Token',
      });

      expect(db.personalAccessToken.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          accessTokenHash: mockAccessTokenData.hash,
          refreshTokenHash: mockRefreshTokenData.hash,
          tokenPrefix: mockAccessTokenData.prefix,
        }),
      });

      // Verify raw tokens are NOT stored
      const createCall = (db.personalAccessToken.create as jest.Mock).mock.calls[0][0];
      expect(createCall.data.accessToken).toBeUndefined();
      expect(createCall.data.refreshToken).toBeUndefined();
    });

    it('sets correct expiration times (24h access, 30d refresh)', async () => {
      (db.user.findUnique as jest.Mock).mockResolvedValue(mockUser);
      (generateAccessToken as jest.Mock).mockResolvedValue(mockAccessTokenData);
      (generateRefreshToken as jest.Mock).mockResolvedValue(mockRefreshTokenData);
      (db.personalAccessToken.create as jest.Mock).mockResolvedValue({
        id: 'new-token-id',
      });

      const beforeCall = Date.now();
      await tokenService.createToken({
        userId: 'user-123',
        name: 'Test Token',
      });
      const afterCall = Date.now();

      const createCall = (db.personalAccessToken.create as jest.Mock).mock.calls[0][0];
      const expiresAt = createCall.data.expiresAt as Date;
      const refreshExpiresAt = createCall.data.refreshExpiresAt as Date;

      // Access token: 24 hours
      const expectedAccessExpiry = beforeCall + 24 * 60 * 60 * 1000;
      expect(expiresAt.getTime()).toBeGreaterThanOrEqual(expectedAccessExpiry);
      expect(expiresAt.getTime()).toBeLessThanOrEqual(afterCall + 24 * 60 * 60 * 1000);

      // Refresh token: 30 days
      const expectedRefreshExpiry = beforeCall + 30 * 24 * 60 * 60 * 1000;
      expect(refreshExpiresAt.getTime()).toBeGreaterThanOrEqual(expectedRefreshExpiry);
      expect(refreshExpiresAt.getTime()).toBeLessThanOrEqual(afterCall + 30 * 24 * 60 * 60 * 1000);
    });

    it('stores optional fields correctly', async () => {
      (db.user.findUnique as jest.Mock).mockResolvedValue(mockUser);
      (generateAccessToken as jest.Mock).mockResolvedValue(mockAccessTokenData);
      (generateRefreshToken as jest.Mock).mockResolvedValue(mockRefreshTokenData);
      (db.personalAccessToken.create as jest.Mock).mockResolvedValue({
        id: 'new-token-id',
      });

      await tokenService.createToken({
        userId: 'user-123',
        name: 'Safari Extension',
        deviceType: 'safari_extension',
        createdIp: '192.168.1.1',
      });

      expect(db.personalAccessToken.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          userId: 'user-123',
          name: 'Safari Extension',
          deviceType: 'safari_extension',
          createdIp: '192.168.1.1',
        }),
      });
    });

    it('handles missing optional fields gracefully', async () => {
      (db.user.findUnique as jest.Mock).mockResolvedValue(mockUser);
      (generateAccessToken as jest.Mock).mockResolvedValue(mockAccessTokenData);
      (generateRefreshToken as jest.Mock).mockResolvedValue(mockRefreshTokenData);
      (db.personalAccessToken.create as jest.Mock).mockResolvedValue({
        id: 'new-token-id',
      });

      await tokenService.createToken({
        userId: 'user-123',
        name: 'Minimal Token',
      });

      expect(db.personalAccessToken.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          userId: 'user-123',
          name: 'Minimal Token',
          deviceType: null,
          createdIp: null,
        }),
      });
    });
  });

  describe('validateAccessToken', () => {
    const validAccessToken = 'gth_validaccesstoken1234567890abcdefghijklmno';

    it('returns ValidatedToken for valid, unexpired token - SECURITY CRITICAL', async () => {
      (getTokenType as jest.Mock).mockReturnValue('access');
      (extractTokenPrefix as jest.Mock).mockReturnValue('gth_vali');
      (db.personalAccessToken.findUnique as jest.Mock).mockResolvedValue(mockTokenRecord);
      (verifyToken as jest.Mock).mockResolvedValue(true);
      (db.personalAccessToken.update as jest.Mock).mockResolvedValue({});

      const result = await tokenService.validateAccessToken(validAccessToken, '192.168.1.1');

      expect(result).toEqual({
        userId: 'user-123',
        tokenId: 'token-789',
        authMethod: 'token',
      });
    });

    it('returns null for refresh token (wrong type) - SECURITY CRITICAL', async () => {
      (getTokenType as jest.Mock).mockReturnValue('refresh');

      const result = await tokenService.validateAccessToken(
        'gth_ref_refreshtoken123456789abcdefghijklm'
      );

      expect(result).toBeNull();
      // Should not attempt database lookup
      expect(db.personalAccessToken.findUnique).not.toHaveBeenCalled();
    });

    it('returns null for invalid format - SECURITY CRITICAL', async () => {
      (getTokenType as jest.Mock).mockReturnValue(null);

      const result = await tokenService.validateAccessToken('invalid_token_format');

      expect(result).toBeNull();
      expect(db.personalAccessToken.findUnique).not.toHaveBeenCalled();
    });

    it('returns null when token not found - SECURITY CRITICAL', async () => {
      (getTokenType as jest.Mock).mockReturnValue('access');
      (extractTokenPrefix as jest.Mock).mockReturnValue('gth_unkn');
      (db.personalAccessToken.findUnique as jest.Mock).mockResolvedValue(null);

      const result = await tokenService.validateAccessToken(validAccessToken);

      expect(result).toBeNull();
      // Hash verification should NOT be attempted
      expect(verifyToken).not.toHaveBeenCalled();
    });

    it('returns null when token is revoked - SECURITY CRITICAL', async () => {
      (getTokenType as jest.Mock).mockReturnValue('access');
      (extractTokenPrefix as jest.Mock).mockReturnValue('gth_vali');
      (db.personalAccessToken.findUnique as jest.Mock).mockResolvedValue(mockRevokedTokenRecord);

      const result = await tokenService.validateAccessToken(validAccessToken);

      expect(result).toBeNull();
      // Hash verification should NOT be attempted (performance optimization)
      expect(verifyToken).not.toHaveBeenCalled();
    });

    it('returns null when token is expired - SECURITY CRITICAL', async () => {
      (getTokenType as jest.Mock).mockReturnValue('access');
      (extractTokenPrefix as jest.Mock).mockReturnValue('gth_vali');
      (db.personalAccessToken.findUnique as jest.Mock).mockResolvedValue(mockExpiredTokenRecord);

      const result = await tokenService.validateAccessToken(validAccessToken);

      expect(result).toBeNull();
      // Hash verification should NOT be attempted (performance optimization)
      expect(verifyToken).not.toHaveBeenCalled();
    });

    it('returns null when hash verification fails - SECURITY CRITICAL', async () => {
      (getTokenType as jest.Mock).mockReturnValue('access');
      (extractTokenPrefix as jest.Mock).mockReturnValue('gth_vali');
      (db.personalAccessToken.findUnique as jest.Mock).mockResolvedValue(mockTokenRecord);
      (verifyToken as jest.Mock).mockResolvedValue(false);

      const result = await tokenService.validateAccessToken(validAccessToken);

      expect(result).toBeNull();
    });

    it('returns null when user is suspended - SECURITY CRITICAL', async () => {
      const tokenWithSuspendedUser = {
        ...mockTokenRecord,
        user: mockSuspendedUser,
      };

      (getTokenType as jest.Mock).mockReturnValue('access');
      (extractTokenPrefix as jest.Mock).mockReturnValue('gth_vali');
      (db.personalAccessToken.findUnique as jest.Mock).mockResolvedValue(tokenWithSuspendedUser);
      (verifyToken as jest.Mock).mockResolvedValue(true);

      const result = await tokenService.validateAccessToken(validAccessToken);

      expect(result).toBeNull();
    });

    it('checks revocation BEFORE hash verification (performance)', async () => {
      const callOrder: string[] = [];

      (getTokenType as jest.Mock).mockReturnValue('access');
      (extractTokenPrefix as jest.Mock).mockReturnValue('gth_vali');
      (db.personalAccessToken.findUnique as jest.Mock).mockImplementation(async () => {
        callOrder.push('findUnique');
        return mockRevokedTokenRecord;
      });
      (verifyToken as jest.Mock).mockImplementation(async () => {
        callOrder.push('verifyToken');
        return true;
      });

      await tokenService.validateAccessToken(validAccessToken);

      // Database lookup should happen, but NOT hash verification
      expect(callOrder).toContain('findUnique');
      expect(callOrder).not.toContain('verifyToken');
    });

    it('returns null when prefix extraction fails', async () => {
      (getTokenType as jest.Mock).mockReturnValue('access');
      (extractTokenPrefix as jest.Mock).mockReturnValue(null);

      const result = await tokenService.validateAccessToken(validAccessToken);

      expect(result).toBeNull();
      expect(db.personalAccessToken.findUnique).not.toHaveBeenCalled();
    });
  });

  describe('refreshAccessToken', () => {
    const validRefreshToken = 'gth_ref_validrefreshtoken123456789abcdefghij';

    it('returns new access token for valid refresh token - SECURITY CRITICAL', async () => {
      (getTokenType as jest.Mock).mockReturnValue('refresh');
      (extractTokenPrefix as jest.Mock).mockReturnValue('gth_ref_');
      (db.personalAccessToken.findMany as jest.Mock).mockResolvedValue([mockTokenRecord]);
      (verifyToken as jest.Mock).mockResolvedValue(true);
      (generateAccessToken as jest.Mock).mockResolvedValue({
        token: 'gth_newaccesstoken123456789abcdefghijklmnopqr',
        hash: '$argon2id$v=19$m=65536,t=3,p=4$newhash',
        prefix: 'gth_newa',
      });
      (db.personalAccessToken.update as jest.Mock).mockResolvedValue({});

      const result = await tokenService.refreshAccessToken(validRefreshToken);

      expect(result).toEqual({
        accessToken: 'gth_newaccesstoken123456789abcdefghijklmnopqr',
        expiresAt: expect.any(Date),
      });

      // Verify new expiration is approximately 24 hours from now
      const now = Date.now();
      expect(result!.expiresAt.getTime()).toBeGreaterThan(now + 23 * 60 * 60 * 1000);
      expect(result!.expiresAt.getTime()).toBeLessThan(now + 25 * 60 * 60 * 1000);
    });

    it('returns null for access token (wrong type) - SECURITY CRITICAL', async () => {
      (getTokenType as jest.Mock).mockReturnValue('access');

      const result = await tokenService.refreshAccessToken(
        'gth_accesstoken12345678901234567890abcdefgh'
      );

      expect(result).toBeNull();
      expect(db.personalAccessToken.findMany).not.toHaveBeenCalled();
    });

    it('returns null for expired refresh token - SECURITY CRITICAL', async () => {
      const expiredRefreshTokenRecord = {
        ...mockTokenRecord,
        refreshExpiresAt: new Date(Date.now() - 1000), // Expired
      };

      (getTokenType as jest.Mock).mockReturnValue('refresh');
      (extractTokenPrefix as jest.Mock).mockReturnValue('gth_ref_');
      // findMany filters by refreshExpiresAt > now, so expired tokens won't be returned
      (db.personalAccessToken.findMany as jest.Mock).mockResolvedValue([]);

      const result = await tokenService.refreshAccessToken(validRefreshToken);

      expect(result).toBeNull();
    });

    it('returns null for revoked refresh token - SECURITY CRITICAL', async () => {
      (getTokenType as jest.Mock).mockReturnValue('refresh');
      (extractTokenPrefix as jest.Mock).mockReturnValue('gth_ref_');
      // findMany filters by revokedAt: null, so revoked tokens won't be returned
      (db.personalAccessToken.findMany as jest.Mock).mockResolvedValue([]);

      const result = await tokenService.refreshAccessToken(validRefreshToken);

      expect(result).toBeNull();
    });

    it('returns null when user is suspended - SECURITY CRITICAL', async () => {
      const tokenWithSuspendedUser = {
        ...mockTokenRecord,
        user: mockSuspendedUser,
      };

      (getTokenType as jest.Mock).mockReturnValue('refresh');
      (extractTokenPrefix as jest.Mock).mockReturnValue('gth_ref_');
      (db.personalAccessToken.findMany as jest.Mock).mockResolvedValue([tokenWithSuspendedUser]);
      (verifyToken as jest.Mock).mockResolvedValue(true);

      const result = await tokenService.refreshAccessToken(validRefreshToken);

      expect(result).toBeNull();
      // Should NOT generate new access token
      expect(generateAccessToken).not.toHaveBeenCalled();
    });

    it('updates database with new access token hash - SECURITY CRITICAL', async () => {
      const newTokenData = {
        token: 'gth_newaccesstoken123456789abcdefghijklmnopqr',
        hash: '$argon2id$v=19$m=65536,t=3,p=4$newhash',
        prefix: 'gth_newa',
      };

      (getTokenType as jest.Mock).mockReturnValue('refresh');
      (extractTokenPrefix as jest.Mock).mockReturnValue('gth_ref_');
      (db.personalAccessToken.findMany as jest.Mock).mockResolvedValue([mockTokenRecord]);
      (verifyToken as jest.Mock).mockResolvedValue(true);
      (generateAccessToken as jest.Mock).mockResolvedValue(newTokenData);
      (db.personalAccessToken.update as jest.Mock).mockResolvedValue({});

      await tokenService.refreshAccessToken(validRefreshToken);

      expect(db.personalAccessToken.update).toHaveBeenCalledWith({
        where: { id: mockTokenRecord.id },
        data: {
          accessTokenHash: newTokenData.hash,
          tokenPrefix: newTokenData.prefix,
          expiresAt: expect.any(Date),
        },
      });
    });

    it('returns null when no matching token found', async () => {
      (getTokenType as jest.Mock).mockReturnValue('refresh');
      (extractTokenPrefix as jest.Mock).mockReturnValue('gth_ref_');
      (db.personalAccessToken.findMany as jest.Mock).mockResolvedValue([mockTokenRecord]);
      (verifyToken as jest.Mock).mockResolvedValue(false); // No hash match

      const result = await tokenService.refreshAccessToken(validRefreshToken);

      expect(result).toBeNull();
    });

    it('returns null when prefix extraction fails', async () => {
      (getTokenType as jest.Mock).mockReturnValue('refresh');
      (extractTokenPrefix as jest.Mock).mockReturnValue(null);

      const result = await tokenService.refreshAccessToken(validRefreshToken);

      expect(result).toBeNull();
    });
  });

  describe('revokeToken', () => {
    it('sets revokedAt timestamp', async () => {
      (db.personalAccessToken.findUnique as jest.Mock).mockResolvedValue({
        id: 'token-789',
        userId: 'user-123',
        revokedAt: null,
      });
      (db.personalAccessToken.update as jest.Mock).mockResolvedValue({});

      await tokenService.revokeToken('token-789', 'user-123');

      expect(db.personalAccessToken.update).toHaveBeenCalledWith({
        where: { id: 'token-789' },
        data: { revokedAt: expect.any(Date) },
      });
    });

    it("throws NotFoundError when token doesn't exist", async () => {
      (db.personalAccessToken.findUnique as jest.Mock).mockResolvedValue(null);

      await expect(tokenService.revokeToken('nonexistent-token', 'user-123')).rejects.toThrow(
        NotFoundError
      );

      await expect(tokenService.revokeToken('nonexistent-token', 'user-123')).rejects.toThrow(
        'Token not found'
      );
    });

    it("throws ForbiddenError when userId doesn't match - SECURITY CRITICAL", async () => {
      (db.personalAccessToken.findUnique as jest.Mock).mockResolvedValue({
        id: 'token-789',
        userId: 'user-123',
        revokedAt: null,
      });

      await expect(tokenService.revokeToken('token-789', 'other-user-456')).rejects.toThrow(
        ForbiddenError
      );

      await expect(tokenService.revokeToken('token-789', 'other-user-456')).rejects.toThrow(
        'Cannot revoke token belonging to another user'
      );

      // Should NOT update the token
      expect(db.personalAccessToken.update).not.toHaveBeenCalled();
    });

    it('is idempotent (no error if already revoked)', async () => {
      (db.personalAccessToken.findUnique as jest.Mock).mockResolvedValue({
        id: 'token-789',
        userId: 'user-123',
        revokedAt: new Date(), // Already revoked
      });

      await expect(tokenService.revokeToken('token-789', 'user-123')).resolves.not.toThrow();

      // Should NOT update again
      expect(db.personalAccessToken.update).not.toHaveBeenCalled();
    });
  });

  describe('revokeAllTokens', () => {
    it('revokes all active tokens for user', async () => {
      (db.personalAccessToken.updateMany as jest.Mock).mockResolvedValue({ count: 3 });

      const result = await tokenService.revokeAllTokens('user-123');

      expect(result).toBe(3);
      expect(db.personalAccessToken.updateMany).toHaveBeenCalledWith({
        where: {
          userId: 'user-123',
          revokedAt: null,
        },
        data: {
          revokedAt: expect.any(Date),
        },
      });
    });

    it('returns 0 when no tokens to revoke', async () => {
      (db.personalAccessToken.updateMany as jest.Mock).mockResolvedValue({ count: 0 });

      const result = await tokenService.revokeAllTokens('user-123');

      expect(result).toBe(0);
    });
  });

  describe('listUserTokens', () => {
    const mockTokenList = [
      {
        id: 'token-1',
        name: 'Safari Extension',
        deviceType: 'safari_extension',
        tokenPrefix: 'gth_abc1',
        lastUsedAt: new Date(),
        createdAt: new Date(),
        expiresAt: new Date(Date.now() + 86400000),
      },
      {
        id: 'token-2',
        name: 'iOS App',
        deviceType: 'ios_app',
        tokenPrefix: 'gth_xyz9',
        lastUsedAt: null,
        createdAt: new Date(),
        expiresAt: new Date(Date.now() + 86400000),
      },
    ];

    it('returns all active tokens for user', async () => {
      (db.personalAccessToken.findMany as jest.Mock).mockResolvedValue(mockTokenList);

      const result = await tokenService.listUserTokens('user-123');

      expect(result).toHaveLength(2);
      expect(result[0]).toEqual({
        id: 'token-1',
        name: 'Safari Extension',
        deviceType: 'safari_extension',
        tokenPrefix: 'gth_abc1...',
        lastUsedAt: expect.any(Date),
        createdAt: expect.any(Date),
        expiresAt: expect.any(Date),
        current: false,
      });
    });

    it('excludes revoked tokens - SECURITY CRITICAL', async () => {
      (db.personalAccessToken.findMany as jest.Mock).mockResolvedValue(mockTokenList);

      await tokenService.listUserTokens('user-123');

      expect(db.personalAccessToken.findMany).toHaveBeenCalledWith({
        where: {
          userId: 'user-123',
          revokedAt: null, // Only active tokens
        },
        orderBy: {
          createdAt: 'desc',
        },
        select: expect.any(Object),
      });
    });

    it('marks current token when currentTokenId provided', async () => {
      (db.personalAccessToken.findMany as jest.Mock).mockResolvedValue(mockTokenList);

      const result = await tokenService.listUserTokens('user-123', 'token-1');

      expect(result[0].current).toBe(true);
      expect(result[1].current).toBe(false);
    });

    it('returns empty array when no tokens exist', async () => {
      (db.personalAccessToken.findMany as jest.Mock).mockResolvedValue([]);

      const result = await tokenService.listUserTokens('user-123');

      expect(result).toEqual([]);
    });

    it('appends ellipsis to token prefix for display', async () => {
      (db.personalAccessToken.findMany as jest.Mock).mockResolvedValue(mockTokenList);

      const result = await tokenService.listUserTokens('user-123');

      expect(result[0].tokenPrefix).toBe('gth_abc1...');
      expect(result[1].tokenPrefix).toBe('gth_xyz9...');
    });
  });

  describe('cleanupExpiredTokens', () => {
    it('deletes tokens expired > 7 days ago', async () => {
      (db.personalAccessToken.deleteMany as jest.Mock).mockResolvedValue({ count: 5 });

      const result = await tokenService.cleanupExpiredTokens();

      expect(result).toEqual({ deletedCount: 5 });

      const deleteCall = (db.personalAccessToken.deleteMany as jest.Mock).mock.calls[0][0];
      const orConditions = deleteCall.where.OR;

      // Find the expiration condition
      const expirationCondition = orConditions.find(
        (c: Record<string, unknown>) => c.expiresAt !== undefined
      );
      expect(expirationCondition).toBeDefined();

      // Verify it's checking for tokens expired > 7 days ago
      const threshold = expirationCondition.expiresAt.lt as Date;
      const now = Date.now();
      const sevenDaysAgo = now - 7 * 24 * 60 * 60 * 1000;
      expect(threshold.getTime()).toBeGreaterThan(sevenDaysAgo - 1000);
      expect(threshold.getTime()).toBeLessThan(sevenDaysAgo + 1000);
    });

    it('deletes revoked tokens > 30 days ago', async () => {
      (db.personalAccessToken.deleteMany as jest.Mock).mockResolvedValue({ count: 10 });

      await tokenService.cleanupExpiredTokens();

      const deleteCall = (db.personalAccessToken.deleteMany as jest.Mock).mock.calls[0][0];
      const orConditions = deleteCall.where.OR;

      // Find the revocation condition
      const revocationCondition = orConditions.find(
        (c: Record<string, unknown>) => c.revokedAt !== undefined
      );
      expect(revocationCondition).toBeDefined();

      // Verify it's checking for tokens revoked > 30 days ago
      const threshold = revocationCondition.revokedAt.lt as Date;
      const now = Date.now();
      const thirtyDaysAgo = now - 30 * 24 * 60 * 60 * 1000;
      expect(threshold.getTime()).toBeGreaterThan(thirtyDaysAgo - 1000);
      expect(threshold.getTime()).toBeLessThan(thirtyDaysAgo + 1000);
    });

    it('does not delete recent tokens', async () => {
      (db.personalAccessToken.deleteMany as jest.Mock).mockResolvedValue({ count: 0 });

      const result = await tokenService.cleanupExpiredTokens();

      expect(result).toEqual({ deletedCount: 0 });
    });

    it('uses OR condition to delete both expired and revoked tokens', async () => {
      (db.personalAccessToken.deleteMany as jest.Mock).mockResolvedValue({ count: 15 });

      await tokenService.cleanupExpiredTokens();

      expect(db.personalAccessToken.deleteMany).toHaveBeenCalledWith({
        where: {
          OR: [{ expiresAt: { lt: expect.any(Date) } }, { revokedAt: { lt: expect.any(Date) } }],
        },
      });
    });
  });

  describe('updateLastUsed', () => {
    it('updates lastUsedAt when token is validated', async () => {
      (getTokenType as jest.Mock).mockReturnValue('access');
      (extractTokenPrefix as jest.Mock).mockReturnValue('gth_vali');
      (db.personalAccessToken.findUnique as jest.Mock).mockResolvedValue(mockTokenRecord);
      (verifyToken as jest.Mock).mockResolvedValue(true);
      (db.personalAccessToken.update as jest.Mock).mockResolvedValue({});

      await tokenService.validateAccessToken(
        'gth_validaccesstoken1234567890abcdefghijklmno',
        '192.168.1.1'
      );

      // Wait a tick for the async update
      await new Promise((resolve) => setTimeout(resolve, 10));

      expect(db.personalAccessToken.update).toHaveBeenCalledWith({
        where: { id: 'token-789' },
        data: {
          lastUsedAt: expect.any(Date),
          lastUsedIp: '192.168.1.1',
        },
      });
    });

    it('does not throw if update fails (non-blocking)', async () => {
      (getTokenType as jest.Mock).mockReturnValue('access');
      (extractTokenPrefix as jest.Mock).mockReturnValue('gth_vali');
      (db.personalAccessToken.findUnique as jest.Mock).mockResolvedValue(mockTokenRecord);
      (verifyToken as jest.Mock).mockResolvedValue(true);
      (db.personalAccessToken.update as jest.Mock).mockRejectedValue(new Error('Database error'));

      // Should not throw, even though update fails
      const result = await tokenService.validateAccessToken(
        'gth_validaccesstoken1234567890abcdefghijklmno'
      );

      expect(result).toEqual({
        userId: 'user-123',
        tokenId: 'token-789',
        authMethod: 'token',
      });

      // Wait for async update to complete (and fail silently)
      await new Promise((resolve) => setTimeout(resolve, 10));
    });

    it('handles null clientIp', async () => {
      (getTokenType as jest.Mock).mockReturnValue('access');
      (extractTokenPrefix as jest.Mock).mockReturnValue('gth_vali');
      (db.personalAccessToken.findUnique as jest.Mock).mockResolvedValue(mockTokenRecord);
      (verifyToken as jest.Mock).mockResolvedValue(true);
      (db.personalAccessToken.update as jest.Mock).mockResolvedValue({});

      await tokenService.validateAccessToken('gth_validaccesstoken1234567890abcdefghijklmno');

      // Wait a tick for the async update
      await new Promise((resolve) => setTimeout(resolve, 10));

      expect(db.personalAccessToken.update).toHaveBeenCalledWith({
        where: { id: 'token-789' },
        data: {
          lastUsedAt: expect.any(Date),
          lastUsedIp: null,
        },
      });
    });
  });

  describe('edge cases', () => {
    it('raw token never stored or returned after creation - SECURITY CRITICAL', async () => {
      (db.user.findUnique as jest.Mock).mockResolvedValue(mockUser);
      (generateAccessToken as jest.Mock).mockResolvedValue(mockAccessTokenData);
      (generateRefreshToken as jest.Mock).mockResolvedValue(mockRefreshTokenData);

      const createdRecord = {
        id: 'new-token-id',
        userId: 'user-123',
        name: 'Test Token',
        accessTokenHash: mockAccessTokenData.hash,
        refreshTokenHash: mockRefreshTokenData.hash,
        tokenPrefix: mockAccessTokenData.prefix,
        // Note: NO accessToken or refreshToken fields
      };
      (db.personalAccessToken.create as jest.Mock).mockResolvedValue(createdRecord);

      const result = await tokenService.createToken({
        userId: 'user-123',
        name: 'Test Token',
      });

      // Verify the stored data contains hashes, not raw tokens
      const createCall = (db.personalAccessToken.create as jest.Mock).mock.calls[0][0];
      expect(createCall.data.accessTokenHash).toBe(mockAccessTokenData.hash);
      expect(createCall.data.refreshTokenHash).toBe(mockRefreshTokenData.hash);
      expect(createCall.data.accessToken).toBeUndefined();
      expect(createCall.data.refreshToken).toBeUndefined();

      // Verify returned tokens come from the generator, not the database
      expect(result.accessToken).toBe(mockAccessTokenData.token);
      expect(result.refreshToken).toBe(mockRefreshTokenData.token);
    });

    it('handles database errors during token creation', async () => {
      (db.user.findUnique as jest.Mock).mockResolvedValue(mockUser);
      (generateAccessToken as jest.Mock).mockResolvedValue(mockAccessTokenData);
      (generateRefreshToken as jest.Mock).mockResolvedValue(mockRefreshTokenData);
      (db.personalAccessToken.create as jest.Mock).mockRejectedValue(
        new Error('Database connection failed')
      );

      await expect(
        tokenService.createToken({
          userId: 'user-123',
          name: 'Test Token',
        })
      ).rejects.toThrow('Database connection failed');
    });

    it('validates correct token type during access token validation', async () => {
      (getTokenType as jest.Mock).mockReturnValue('access');
      (extractTokenPrefix as jest.Mock).mockReturnValue('gth_vali');
      (db.personalAccessToken.findUnique as jest.Mock).mockResolvedValue(mockTokenRecord);
      (verifyToken as jest.Mock).mockResolvedValue(true);
      (db.personalAccessToken.update as jest.Mock).mockResolvedValue({});

      await tokenService.validateAccessToken('gth_validaccesstoken1234567890abcdefghijklmno');

      expect(getTokenType).toHaveBeenCalledWith('gth_validaccesstoken1234567890abcdefghijklmno');
    });

    it('handles multiple tokens during refresh token validation', async () => {
      const multipleTokens = [
        { ...mockTokenRecord, id: 'token-1', refreshTokenHash: 'hash1' },
        { ...mockTokenRecord, id: 'token-2', refreshTokenHash: 'hash2' },
        { ...mockTokenRecord, id: 'token-3', refreshTokenHash: 'hash3' },
      ];

      (getTokenType as jest.Mock).mockReturnValue('refresh');
      (extractTokenPrefix as jest.Mock).mockReturnValue('gth_ref_');
      (db.personalAccessToken.findMany as jest.Mock).mockResolvedValue(multipleTokens);
      // Match the second token
      (verifyToken as jest.Mock)
        .mockResolvedValueOnce(false)
        .mockResolvedValueOnce(true)
        .mockResolvedValueOnce(false);
      (generateAccessToken as jest.Mock).mockResolvedValue({
        token: 'gth_newtoken',
        hash: 'newhash',
        prefix: 'gth_newt',
      });
      (db.personalAccessToken.update as jest.Mock).mockResolvedValue({});

      const result = await tokenService.refreshAccessToken(
        'gth_ref_validrefreshtoken123456789abcdefghij'
      );

      expect(result).not.toBeNull();
      // Should have called verifyToken twice before finding match
      expect(verifyToken).toHaveBeenCalledTimes(2);
      // Should update the correct token
      expect(db.personalAccessToken.update).toHaveBeenCalledWith({
        where: { id: 'token-2' },
        data: expect.any(Object),
      });
    });
  });

  describe('singleton instance', () => {
    it('exports a singleton tokenService instance', () => {
      expect(tokenService).toBeInstanceOf(TokenService);
    });
  });
});
