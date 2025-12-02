import { TokenService, tokenService, calculateExpirationDate } from '@/lib/services/token-service';
import { db } from '@/lib/db';
import { ForbiddenError, NotFoundError } from '@/lib/errors';
import {
  extractTokenPrefix,
  generateAccessToken,
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

  const mockTokenRecord = {
    id: 'token-789',
    userId: 'user-123',
    name: 'Test Token',
    deviceType: 'safari_extension',
    accessTokenHash: '$argon2id$v=19$m=65536,t=3,p=4$accesshash',
    tokenPrefix: 'gth_abc1',
    expiresAt: new Date(Date.now() + 90 * 24 * 60 * 60 * 1000), // 90 days from now
    revokedAt: null,
    lastUsedAt: null,
    lastUsedIp: null,
    createdAt: new Date(),
    createdIp: '192.168.1.1',
    user: mockUser,
  };

  const mockNeverExpiringTokenRecord = {
    ...mockTokenRecord,
    id: 'token-never',
    expiresAt: null, // Never expires
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

  describe('calculateExpirationDate', () => {
    it('returns null for "never" option', () => {
      const result = calculateExpirationDate('never');
      expect(result).toBeNull();
    });

    it('returns date 30 days from now for "30d" option', () => {
      const before = Date.now();
      const result = calculateExpirationDate('30d');
      const after = Date.now();

      expect(result).not.toBeNull();
      const expectedMin = before + 30 * 24 * 60 * 60 * 1000;
      const expectedMax = after + 30 * 24 * 60 * 60 * 1000;
      expect(result!.getTime()).toBeGreaterThanOrEqual(expectedMin);
      expect(result!.getTime()).toBeLessThanOrEqual(expectedMax);
    });

    it('returns date 90 days from now for "90d" option', () => {
      const before = Date.now();
      const result = calculateExpirationDate('90d');
      const after = Date.now();

      expect(result).not.toBeNull();
      const expectedMin = before + 90 * 24 * 60 * 60 * 1000;
      const expectedMax = after + 90 * 24 * 60 * 60 * 1000;
      expect(result!.getTime()).toBeGreaterThanOrEqual(expectedMin);
      expect(result!.getTime()).toBeLessThanOrEqual(expectedMax);
    });

    it('returns date 6 months from now for "6m" option', () => {
      const now = new Date();
      const result = calculateExpirationDate('6m');

      expect(result).not.toBeNull();
      const expected = new Date(now);
      expected.setMonth(expected.getMonth() + 6);

      // Allow 1 day tolerance for month edge cases
      const diffDays = Math.abs(result!.getTime() - expected.getTime()) / (24 * 60 * 60 * 1000);
      expect(diffDays).toBeLessThan(1);
    });

    it('returns date 1 year from now for "1y" option', () => {
      const now = new Date();
      const result = calculateExpirationDate('1y');

      expect(result).not.toBeNull();
      const expected = new Date(now);
      expected.setFullYear(expected.getFullYear() + 1);

      // Allow 1 day tolerance
      const diffDays = Math.abs(result!.getTime() - expected.getTime()) / (24 * 60 * 60 * 1000);
      expect(diffDays).toBeLessThan(1);
    });
  });

  describe('createToken', () => {
    it('creates token for valid user with default 90d expiration', async () => {
      (db.user.findUnique as jest.Mock).mockResolvedValue(mockUser);
      (generateAccessToken as jest.Mock).mockResolvedValue(mockAccessTokenData);
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
        token: mockAccessTokenData.token,
        expiresAt: expect.any(Date),
        tokenId: 'new-token-id',
      });

      // Verify expiration is approximately 90 days from now
      const now = Date.now();
      expect(result.expiresAt!.getTime()).toBeGreaterThan(now + 89 * 24 * 60 * 60 * 1000);
      expect(result.expiresAt!.getTime()).toBeLessThan(now + 91 * 24 * 60 * 60 * 1000);
    });

    it('creates never-expiring token when expiresIn is "never"', async () => {
      (db.user.findUnique as jest.Mock).mockResolvedValue(mockUser);
      (generateAccessToken as jest.Mock).mockResolvedValue(mockAccessTokenData);
      (db.personalAccessToken.create as jest.Mock).mockResolvedValue({
        id: 'new-token-id',
      });

      const result = await tokenService.createToken({
        userId: 'user-123',
        name: 'Eternal Token',
        expiresIn: 'never',
      });

      expect(result).toEqual({
        token: mockAccessTokenData.token,
        expiresAt: null,
        tokenId: 'new-token-id',
      });

      // Verify null was stored in database
      const createCall = (db.personalAccessToken.create as jest.Mock).mock.calls[0][0];
      expect(createCall.data.expiresAt).toBeNull();
    });

    it('creates token with custom expiration (30d)', async () => {
      (db.user.findUnique as jest.Mock).mockResolvedValue(mockUser);
      (generateAccessToken as jest.Mock).mockResolvedValue(mockAccessTokenData);
      (db.personalAccessToken.create as jest.Mock).mockResolvedValue({
        id: 'new-token-id',
      });

      const result = await tokenService.createToken({
        userId: 'user-123',
        name: 'Short Token',
        expiresIn: '30d',
      });

      expect(result.expiresAt).not.toBeNull();
      const now = Date.now();
      expect(result.expiresAt!.getTime()).toBeGreaterThan(now + 29 * 24 * 60 * 60 * 1000);
      expect(result.expiresAt!.getTime()).toBeLessThan(now + 31 * 24 * 60 * 60 * 1000);
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
    });

    it('stores Argon2 hash (not raw token) - SECURITY CRITICAL', async () => {
      (db.user.findUnique as jest.Mock).mockResolvedValue(mockUser);
      (generateAccessToken as jest.Mock).mockResolvedValue(mockAccessTokenData);
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
          tokenPrefix: mockAccessTokenData.prefix,
        }),
      });

      // Verify raw token is NOT stored
      const createCall = (db.personalAccessToken.create as jest.Mock).mock.calls[0][0];
      expect(createCall.data.accessToken).toBeUndefined();
      expect(createCall.data.token).toBeUndefined();
    });

    it('stores optional fields correctly', async () => {
      (db.user.findUnique as jest.Mock).mockResolvedValue(mockUser);
      (generateAccessToken as jest.Mock).mockResolvedValue(mockAccessTokenData);
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

    it('returns ValidatedToken for never-expiring token - SECURITY CRITICAL', async () => {
      (getTokenType as jest.Mock).mockReturnValue('access');
      (extractTokenPrefix as jest.Mock).mockReturnValue('gth_vali');
      (db.personalAccessToken.findUnique as jest.Mock).mockResolvedValue(
        mockNeverExpiringTokenRecord
      );
      (verifyToken as jest.Mock).mockResolvedValue(true);
      (db.personalAccessToken.update as jest.Mock).mockResolvedValue({});

      const result = await tokenService.validateAccessToken(validAccessToken);

      expect(result).toEqual({
        userId: 'user-123',
        tokenId: 'token-never',
        authMethod: 'token',
      });
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
        expiresAt: null, // Never expires
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
      expect(result[1].expiresAt).toBeNull(); // Never expires
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
    it('deletes tokens expired > 7 days ago (skips never-expiring)', async () => {
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

      // Verify it excludes null expiresAt (never-expiring tokens)
      expect(expirationCondition.expiresAt.not).toBeNull();

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

      const createdRecord = {
        id: 'new-token-id',
        userId: 'user-123',
        name: 'Test Token',
        accessTokenHash: mockAccessTokenData.hash,
        tokenPrefix: mockAccessTokenData.prefix,
        // Note: NO accessToken field
      };
      (db.personalAccessToken.create as jest.Mock).mockResolvedValue(createdRecord);

      const result = await tokenService.createToken({
        userId: 'user-123',
        name: 'Test Token',
      });

      // Verify the stored data contains hash, not raw token
      const createCall = (db.personalAccessToken.create as jest.Mock).mock.calls[0][0];
      expect(createCall.data.accessTokenHash).toBe(mockAccessTokenData.hash);
      expect(createCall.data.accessToken).toBeUndefined();
      expect(createCall.data.token).toBeUndefined();

      // Verify returned token comes from the generator, not the database
      expect(result.token).toBe(mockAccessTokenData.token);
    });

    it('handles database errors during token creation', async () => {
      (db.user.findUnique as jest.Mock).mockResolvedValue(mockUser);
      (generateAccessToken as jest.Mock).mockResolvedValue(mockAccessTokenData);
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
  });

  describe('singleton instance', () => {
    it('exports a singleton tokenService instance', () => {
      expect(tokenService).toBeInstanceOf(TokenService);
    });
  });
});
