/**
 * OAuth Token Encryption Tests
 */

import { encryptToken, decryptToken, safeRetrieveToken, isTokenEncrypted } from '../oauth-encryption';

describe('OAuth Token Encryption', () => {
  const testToken = 'test-access-token-1234567890';

  beforeAll(() => {
    // Set encryption key for testing (must be exactly 32 bytes)
    const testKey = Buffer.alloc(32);
    testKey.write('test-key-for-encryption-tests');
    process.env.OAUTH_ENCRYPTION_KEY = testKey.toString('base64');
  });

  describe('encryptToken', () => {
    it('should encrypt a token and return encrypted data with IV', () => {
      const result = encryptToken(testToken);

      expect(result.encrypted).toBeDefined();
      expect(result.iv).toBeDefined();
      expect(result.encrypted).not.toBe(testToken);
      expect(result.iv).toHaveLength(24); // base64 encoded 16-byte IV
    });

    it('should throw error for empty token', () => {
      expect(() => encryptToken('')).toThrow('Cannot encrypt empty token');
    });

    it('should produce different ciphertext for same plaintext (different IVs)', () => {
      const result1 = encryptToken(testToken);
      const result2 = encryptToken(testToken);

      expect(result1.encrypted).not.toBe(result2.encrypted);
      expect(result1.iv).not.toBe(result2.iv);
    });
  });

  describe('decryptToken', () => {
    it('should decrypt encrypted token back to original', () => {
      const encrypted = encryptToken(testToken);
      const decrypted = decryptToken(encrypted.encrypted, encrypted.iv);

      expect(decrypted).toBe(testToken);
    });

    it('should throw error for invalid ciphertext', () => {
      const encrypted = encryptToken(testToken);
      expect(() => decryptToken('invalid-ciphertext', encrypted.iv)).toThrow('Token decryption failed');
    });

    it('should throw error for invalid IV', () => {
      const encrypted = encryptToken(testToken);
      expect(() => decryptToken(encrypted.encrypted, 'invalid-iv')).toThrow('Token decryption failed');
    });

    it('should throw error for missing encrypted data', () => {
      expect(() => decryptToken('', 'some-iv')).toThrow('Cannot decrypt: missing encrypted data or IV');
    });

    it('should throw error for missing IV', () => {
      expect(() => decryptToken('some-encrypted-data', '')).toThrow('Cannot decrypt: missing encrypted data or IV');
    });
  });

  describe('isTokenEncrypted', () => {
    it('should return true for encrypted tokens', () => {
      const encrypted = encryptToken(testToken);
      expect(isTokenEncrypted(encrypted.encrypted)).toBe(true);
    });

    it('should return false for null tokens', () => {
      expect(isTokenEncrypted(null)).toBe(false);
    });

    it('should return false for short tokens', () => {
      expect(isTokenEncrypted('short')).toBe(false);
    });

    it('should return false for non-base64 tokens', () => {
      expect(isTokenEncrypted('this-is-not-base64!!!')).toBe(false);
    });
  });

  describe('safeRetrieveToken', () => {
    it('should decrypt encrypted token when encrypted fields exist', () => {
      const encrypted = encryptToken(testToken);
      const result = safeRetrieveToken(
        encrypted.encrypted,
        encrypted.iv,
        null,
        'access'
      );

      expect(result).toBe(testToken);
    });

    it('should fall back to plaintext when encrypted fields are missing', () => {
      const plaintextToken = 'plaintext-token';
      const result = safeRetrieveToken(
        null,
        null,
        plaintextToken,
        'access'
      );

      expect(result).toBe(plaintextToken);
    });

    it('should fall back to plaintext on decryption failure', () => {
      const plaintextToken = 'fallback-token';
      const result = safeRetrieveToken(
        'invalid-encrypted',
        'invalid-iv',
        plaintextToken,
        'access'
      );

      expect(result).toBe(plaintextToken);
    });

    it('should return null when no tokens are available', () => {
      const result = safeRetrieveToken(null, null, null, 'access');
      expect(result).toBeNull();
    });
  });

  describe('encryption key handling', () => {
    it('should use fallback key when OAUTH_ENCRYPTION_KEY is not set', () => {
      const originalKey = process.env.OAUTH_ENCRYPTION_KEY;
      const originalSecret = process.env.NEXTAUTH_SECRET;

      delete process.env.OAUTH_ENCRYPTION_KEY;
      process.env.NEXTAUTH_SECRET = 'test-secret-for-fallback';

      // Force module reload by requiring encryption again
      jest.resetModules();
      const { encryptToken: encryptWithFallback, decryptToken: decryptWithFallback } = require('../oauth-encryption');

      const encrypted = encryptWithFallback(testToken);
      const decrypted = decryptWithFallback(encrypted.encrypted, encrypted.iv);

      expect(decrypted).toBe(testToken);

      // Restore original env
      if (originalKey) process.env.OAUTH_ENCRYPTION_KEY = originalKey;
      if (originalSecret) process.env.NEXTAUTH_SECRET = originalSecret;
      jest.resetModules();
    });
  });

  describe('round-trip encryption', () => {
    it('should handle long tokens', () => {
      const longToken = 'a'.repeat(1000);
      const encrypted = encryptToken(longToken);
      const decrypted = decryptToken(encrypted.encrypted, encrypted.iv);

      expect(decrypted).toBe(longToken);
    });

    it('should handle tokens with special characters', () => {
      const specialToken = 'token-with-special!@#$%^&*()_+={}[]|:;"<>,.?/~`';
      const encrypted = encryptToken(specialToken);
      const decrypted = decryptToken(encrypted.encrypted, encrypted.iv);

      expect(decrypted).toBe(specialToken);
    });

    it('should handle unicode tokens', () => {
      const unicodeToken = 'token-with-unicode-你好-мир-🎉';
      const encrypted = encryptToken(unicodeToken);
      const decrypted = decryptToken(encrypted.encrypted, encrypted.iv);

      expect(decrypted).toBe(unicodeToken);
    });
  });
});
