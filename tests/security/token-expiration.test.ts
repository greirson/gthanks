import { describe, it, expect, beforeEach, afterEach } from '@jest/globals';
import { db } from '@/lib/db';
import { cleanupExpiredTokens } from '@/lib/cron/cleanup-expired-tokens';

describe('Token Cleanup Security', () => {
  beforeEach(async () => {
    // Clean up test data
    await db.magicLink.deleteMany({ where: { email: { startsWith: 'test-' } } });
    await db.verificationToken.deleteMany({
      where: { identifier: { startsWith: 'test-' } },
    });
  });

  afterEach(async () => {
    // Clean up test data
    await db.magicLink.deleteMany({ where: { email: { startsWith: 'test-' } } });
    await db.verificationToken.deleteMany({
      where: { identifier: { startsWith: 'test-' } },
    });
  });

  describe('Expired MagicLink Cleanup', () => {
    it('should delete expired magic links', async () => {
      // Create expired token
      const expiredToken = await db.magicLink.create({
        data: {
          email: 'test-expired@example.com',
          token: 'expired-token-' + Date.now(),
          expiresAt: new Date(Date.now() - 86400000), // 1 day ago
          createdAt: new Date(),
        },
      });

      // Run cleanup
      const result = await cleanupExpiredTokens();

      // Verify deletion
      const token = await db.magicLink.findUnique({
        where: { token: expiredToken.token },
      });

      expect(token).toBeNull();
      expect(result.deletedMagicLinks).toBeGreaterThan(0);
    });

    it('should preserve valid (non-expired) magic links', async () => {
      // Create valid token
      const validToken = await db.magicLink.create({
        data: {
          email: 'test-valid@example.com',
          token: 'valid-token-' + Date.now(),
          expiresAt: new Date(Date.now() + 86400000), // 1 day from now
          createdAt: new Date(),
        },
      });

      // Run cleanup
      await cleanupExpiredTokens();

      // Verify token still exists
      const token = await db.magicLink.findUnique({
        where: { token: validToken.token },
      });

      expect(token).not.toBeNull();
      expect(token?.token).toBe(validToken.token);
    });

    it('should handle cleanup when no expired tokens exist', async () => {
      // Create only valid tokens
      await db.magicLink.create({
        data: {
          email: 'test-valid1@example.com',
          token: 'valid-token-1-' + Date.now(),
          expiresAt: new Date(Date.now() + 86400000),
          createdAt: new Date(),
        },
      });

      // Run cleanup
      const result = await cleanupExpiredTokens();

      // Should succeed with zero deletions
      expect(result.success).toBe(true);
      expect(result.deletedMagicLinks).toBe(0);
    });

    it('should delete multiple expired magic links at once', async () => {
      // Create multiple expired tokens
      const tokens = await Promise.all([
        db.magicLink.create({
          data: {
            email: 'test-expired1@example.com',
            token: 'expired-token-1-' + Date.now(),
            expiresAt: new Date(Date.now() - 86400000),
            createdAt: new Date(),
          },
        }),
        db.magicLink.create({
          data: {
            email: 'test-expired2@example.com',
            token: 'expired-token-2-' + Date.now(),
            expiresAt: new Date(Date.now() - 172800000), // 2 days ago
            createdAt: new Date(),
          },
        }),
        db.magicLink.create({
          data: {
            email: 'test-expired3@example.com',
            token: 'expired-token-3-' + Date.now(),
            expiresAt: new Date(Date.now() - 259200000), // 3 days ago
            createdAt: new Date(),
          },
        }),
      ]);

      // Run cleanup
      const result = await cleanupExpiredTokens();

      // Verify all deleted
      expect(result.deletedMagicLinks).toBeGreaterThanOrEqual(3);

      // Verify none exist
      for (const token of tokens) {
        const found = await db.magicLink.findUnique({
          where: { token: token.token },
        });
        expect(found).toBeNull();
      }
    });
  });

  describe('Expired VerificationToken Cleanup', () => {
    it('should delete expired verification tokens', async () => {
      // Create expired token
      const expiredToken = await db.verificationToken.create({
        data: {
          identifier: 'test-expired-identifier',
          token: 'expired-verification-' + Date.now(),
          expires: new Date(Date.now() - 86400000), // 1 day ago
        },
      });

      // Run cleanup
      const result = await cleanupExpiredTokens();

      // Verify deletion
      const token = await db.verificationToken.findUnique({
        where: {
          identifier_token: {
            identifier: expiredToken.identifier,
            token: expiredToken.token,
          },
        },
      });

      expect(token).toBeNull();
      expect(result.deletedVerificationTokens).toBeGreaterThan(0);
    });

    it('should preserve valid verification tokens', async () => {
      // Create valid token
      const validToken = await db.verificationToken.create({
        data: {
          identifier: 'test-valid-identifier',
          token: 'valid-verification-' + Date.now(),
          expires: new Date(Date.now() + 86400000), // 1 day from now
        },
      });

      // Run cleanup
      await cleanupExpiredTokens();

      // Verify token still exists
      const token = await db.verificationToken.findUnique({
        where: {
          identifier_token: {
            identifier: validToken.identifier,
            token: validToken.token,
          },
        },
      });

      expect(token).not.toBeNull();
    });

    it('should delete multiple expired verification tokens', async () => {
      // Create multiple expired tokens
      const tokens = await Promise.all([
        db.verificationToken.create({
          data: {
            identifier: 'test-expired-1',
            token: 'expired-ver-1-' + Date.now(),
            expires: new Date(Date.now() - 86400000),
          },
        }),
        db.verificationToken.create({
          data: {
            identifier: 'test-expired-2',
            token: 'expired-ver-2-' + Date.now(),
            expires: new Date(Date.now() - 172800000),
          },
        }),
      ]);

      // Run cleanup
      const result = await cleanupExpiredTokens();

      // Verify deletions
      expect(result.deletedVerificationTokens).toBeGreaterThanOrEqual(2);

      // Verify none exist
      for (const token of tokens) {
        const found = await db.verificationToken.findUnique({
          where: {
            identifier_token: {
              identifier: token.identifier,
              token: token.token,
            },
          },
        });
        expect(found).toBeNull();
      }
    });
  });

  describe('Mixed Token Type Cleanup', () => {
    it('should clean up both token types in a single run', async () => {
      // Create both expired and valid tokens of both types
      await Promise.all([
        // Expired MagicLink
        db.magicLink.create({
          data: {
            email: 'test-exp-magic@example.com',
            token: 'exp-magic-' + Date.now(),
            expiresAt: new Date(Date.now() - 86400000),
            createdAt: new Date(),
          },
        }),
        // Valid MagicLink
        db.magicLink.create({
          data: {
            email: 'test-valid-magic@example.com',
            token: 'valid-magic-' + Date.now(),
            expiresAt: new Date(Date.now() + 86400000),
            createdAt: new Date(),
          },
        }),
        // Expired VerificationToken
        db.verificationToken.create({
          data: {
            identifier: 'test-exp-ver',
            token: 'exp-ver-' + Date.now(),
            expires: new Date(Date.now() - 86400000),
          },
        }),
        // Valid VerificationToken
        db.verificationToken.create({
          data: {
            identifier: 'test-valid-ver',
            token: 'valid-ver-' + Date.now(),
            expires: new Date(Date.now() + 86400000),
          },
        }),
      ]);

      // Run cleanup
      const result = await cleanupExpiredTokens();

      // Verify cleanup results
      expect(result.success).toBe(true);
      expect(result.deletedMagicLinks).toBeGreaterThan(0);
      expect(result.deletedVerificationTokens).toBeGreaterThan(0);

      // Verify counts match expectations
      const remainingMagicLinks = await db.magicLink.count({
        where: { email: { startsWith: 'test-' } },
      });
      const remainingVerificationTokens = await db.verificationToken.count({
        where: { identifier: { startsWith: 'test-' } },
      });

      expect(remainingMagicLinks).toBe(1); // Only valid one remains
      expect(remainingVerificationTokens).toBe(1); // Only valid one remains
    });
  });

  describe('Edge Cases', () => {
    it('should handle tokens expiring exactly now', async () => {
      const now = new Date();

      // Create token expiring at exact current time
      await db.magicLink.create({
        data: {
          email: 'test-edge@example.com',
          token: 'edge-token-' + Date.now(),
          expiresAt: now,
          createdAt: new Date(),
        },
      });

      // Wait 1ms to ensure time has passed
      await new Promise((resolve) => setTimeout(resolve, 1));

      // Run cleanup
      const result = await cleanupExpiredTokens();

      // Token should be deleted (lt comparison)
      expect(result.deletedMagicLinks).toBeGreaterThan(0);
    });

    it('should handle very old expired tokens', async () => {
      // Create token expired 1 year ago
      await db.magicLink.create({
        data: {
          email: 'test-ancient@example.com',
          token: 'ancient-token-' + Date.now(),
          expiresAt: new Date(Date.now() - 31536000000), // 1 year ago
          createdAt: new Date(Date.now() - 31536000000),
        },
      });

      // Run cleanup
      const result = await cleanupExpiredTokens();

      // Should successfully delete old token
      expect(result.success).toBe(true);
      expect(result.deletedMagicLinks).toBeGreaterThan(0);
    });
  });

  describe('Return Value Structure', () => {
    it('should return proper result structure', async () => {
      const result = await cleanupExpiredTokens();

      expect(result).toHaveProperty('success');
      expect(result).toHaveProperty('deletedMagicLinks');
      expect(result).toHaveProperty('deletedVerificationTokens');

      expect(typeof result.success).toBe('boolean');
      expect(typeof result.deletedMagicLinks).toBe('number');
      expect(typeof result.deletedVerificationTokens).toBe('number');

      expect(result.success).toBe(true);
      expect(result.deletedMagicLinks).toBeGreaterThanOrEqual(0);
      expect(result.deletedVerificationTokens).toBeGreaterThanOrEqual(0);
    });
  });
});
