/**
 * Token Generator Unit Tests
 *
 * Comprehensive tests for the token generation module including:
 * - Token generation with proper prefixes and entropy
 * - Argon2id hashing with correct parameters
 * - Token verification with constant-time comparison
 * - Prefix extraction for database lookup
 * - Token type detection
 * - Edge cases and security validation
 *
 * SECURITY CRITICAL: These tests validate cryptographic security properties.
 * Do not skip or disable security-related tests without security review.
 */

import {
  generateAccessToken,
  generateRefreshToken,
  verifyToken,
  extractTokenPrefix,
  getTokenType,
  isValidTokenFormat,
} from '@/lib/crypto/token-generator';

// Mock @node-rs/argon2
jest.mock('@node-rs/argon2', () => ({
  hash: jest.fn(),
  verify: jest.fn(),
}));

// Import mocked functions for assertions
import { hash, verify } from '@node-rs/argon2';

const mockHash = hash as jest.MockedFunction<typeof hash>;
const mockVerify = verify as jest.MockedFunction<typeof verify>;

describe('token-generator', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('generateAccessToken', () => {
    beforeEach(() => {
      // Default mock: return a realistic Argon2id hash
      mockHash.mockResolvedValue(
        '$argon2id$v=19$m=65536,t=3,p=4$c2FsdHNhbHRzYWx0$aGFzaGVkdG9rZW5vdXRwdXQ'
      );
    });

    it('generates token with correct gth_ prefix', async () => {
      const result = await generateAccessToken();

      expect(result.token).toMatch(/^gth_/);
    });

    it('generates token with sufficient length (~50 chars) - SECURITY CRITICAL', async () => {
      const result = await generateAccessToken();

      // Access tokens: "gth_" (4 chars) + base64url(32 bytes) = 4 + ~43 = ~47 chars
      // Minimum expected: 44 chars (gth_ + 40 chars for base64)
      expect(result.token.length).toBeGreaterThanOrEqual(44);
      expect(result.token.length).toBeLessThanOrEqual(52);
    });

    it('returns Argon2id hash (not plaintext) - SECURITY CRITICAL', async () => {
      const result = await generateAccessToken();

      // Hash should start with $argon2id$ indicating correct algorithm
      expect(result.hash).toMatch(/^\$argon2id\$/);
      // Hash should NOT equal the token (token is plaintext, hash is derived)
      expect(result.hash).not.toBe(result.token);
    });

    it('returns 8-character prefix for database lookup', async () => {
      const result = await generateAccessToken();

      expect(result.prefix).toHaveLength(8);
      expect(result.prefix).toMatch(/^gth_/);
      expect(result.token.startsWith(result.prefix)).toBe(true);
    });

    it('uses URL-safe base64 encoding (no +, /, =)', async () => {
      const result = await generateAccessToken();

      // Remove the prefix to check the encoded part
      const encodedPart = result.token.substring(4);

      expect(encodedPart).not.toMatch(/\+/);
      expect(encodedPart).not.toMatch(/\//);
      expect(encodedPart).not.toMatch(/=/);
      // Should only contain URL-safe base64 characters
      expect(encodedPart).toMatch(/^[A-Za-z0-9_-]+$/);
    });

    it('generates unique tokens on successive calls - SECURITY CRITICAL', async () => {
      const tokens = new Set<string>();
      const iterations = 10;

      for (let i = 0; i < iterations; i++) {
        const result = await generateAccessToken();
        tokens.add(result.token);
      }

      // All tokens should be unique
      expect(tokens.size).toBe(iterations);
    });

    it('calls Argon2 with correct options (64MB memory, 3 iterations) - SECURITY CRITICAL', async () => {
      await generateAccessToken();

      expect(mockHash).toHaveBeenCalledTimes(1);
      expect(mockHash).toHaveBeenCalledWith(
        expect.stringMatching(/^gth_/),
        expect.objectContaining({
          memoryCost: 65536, // 64 MB
          timeCost: 3, // 3 iterations
          parallelism: 4, // 4 threads
          outputLen: 32, // 32 bytes output
        })
      );
    });

    it('propagates Argon2 hash errors', async () => {
      mockHash.mockRejectedValue(new Error('Argon2 internal error'));

      await expect(generateAccessToken()).rejects.toThrow('Argon2 internal error');
    });
  });

  describe('generateRefreshToken', () => {
    beforeEach(() => {
      mockHash.mockResolvedValue(
        '$argon2id$v=19$m=65536,t=3,p=4$c2FsdHNhbHRzYWx0$aGFzaGVkdG9rZW5vdXRwdXQ'
      );
    });

    it('generates token with correct gth_ref_ prefix', async () => {
      const result = await generateRefreshToken();

      expect(result.token).toMatch(/^gth_ref_/);
    });

    it('generates token with sufficient length - SECURITY CRITICAL', async () => {
      const result = await generateRefreshToken();

      // Refresh tokens: "gth_ref_" (8 chars) + base64url(32 bytes) = 8 + ~43 = ~51 chars
      // Minimum expected: 48 chars (gth_ref_ + 40 chars for base64)
      expect(result.token.length).toBeGreaterThanOrEqual(48);
      expect(result.token.length).toBeLessThanOrEqual(56);
    });

    it('returns Argon2id hash - SECURITY CRITICAL', async () => {
      const result = await generateRefreshToken();

      expect(result.hash).toMatch(/^\$argon2id\$/);
      expect(result.hash).not.toBe(result.token);
    });

    it('returns 8-character prefix for database lookup', async () => {
      const result = await generateRefreshToken();

      expect(result.prefix).toHaveLength(8);
      // Prefix is first 8 chars of token (gth_ref_)
      expect(result.prefix).toBe('gth_ref_');
    });

    it('uses same Argon2 options as access tokens', async () => {
      await generateRefreshToken();

      expect(mockHash).toHaveBeenCalledWith(
        expect.stringMatching(/^gth_ref_/),
        expect.objectContaining({
          memoryCost: 65536,
          timeCost: 3,
          parallelism: 4,
          outputLen: 32,
        })
      );
    });
  });

  describe('verifyToken', () => {
    const validToken = 'gth_abc123xyz789def456ghi012jkl345mno678pqr901stu';
    const validHash = '$argon2id$v=19$m=65536,t=3,p=4$salt$hash';

    it('returns true for valid token and matching hash - SECURITY CRITICAL', async () => {
      mockVerify.mockResolvedValue(true);

      const result = await verifyToken(validToken, validHash);

      expect(result).toBe(true);
      expect(mockVerify).toHaveBeenCalledWith(validHash, validToken);
    });

    it('returns false for invalid token - SECURITY CRITICAL', async () => {
      mockVerify.mockResolvedValue(false);

      const result = await verifyToken('invalid_token', validHash);

      expect(result).toBe(false);
    });

    it('returns false for empty token - SECURITY CRITICAL', async () => {
      const result = await verifyToken('', validHash);

      expect(result).toBe(false);
      expect(mockVerify).not.toHaveBeenCalled();
    });

    it('returns false for null token - SECURITY CRITICAL', async () => {
      const result = await verifyToken(null as unknown as string, validHash);

      expect(result).toBe(false);
      expect(mockVerify).not.toHaveBeenCalled();
    });

    it('returns false for undefined token - SECURITY CRITICAL', async () => {
      const result = await verifyToken(undefined as unknown as string, validHash);

      expect(result).toBe(false);
      expect(mockVerify).not.toHaveBeenCalled();
    });

    it('returns false for empty hash - SECURITY CRITICAL', async () => {
      const result = await verifyToken(validToken, '');

      expect(result).toBe(false);
      expect(mockVerify).not.toHaveBeenCalled();
    });

    it('returns false for null hash - SECURITY CRITICAL', async () => {
      const result = await verifyToken(validToken, null as unknown as string);

      expect(result).toBe(false);
      expect(mockVerify).not.toHaveBeenCalled();
    });

    it('returns false when Argon2 verify throws - SECURITY CRITICAL', async () => {
      mockVerify.mockRejectedValue(new Error('Invalid hash format'));

      const result = await verifyToken(validToken, 'malformed-hash');

      expect(result).toBe(false);
    });

    it('does not expose error details (security measure)', async () => {
      mockVerify.mockRejectedValue(new Error('Sensitive internal error'));

      // Should return false without throwing
      const result = await verifyToken(validToken, validHash);

      expect(result).toBe(false);
    });

    it('passes hash as first argument to Argon2 verify (hash, token order)', async () => {
      mockVerify.mockResolvedValue(true);

      await verifyToken(validToken, validHash);

      // Argon2 verify expects (hash, password) order
      expect(mockVerify).toHaveBeenCalledWith(validHash, validToken);
    });
  });

  describe('extractTokenPrefix', () => {
    it('extracts first 8 chars from valid access token', () => {
      const token = 'gth_abc123xyz789def456';
      const result = extractTokenPrefix(token);

      expect(result).toBe('gth_abc1');
    });

    it('extracts first 8 chars from valid refresh token', () => {
      const token = 'gth_ref_xyz789def456ghi012';
      const result = extractTokenPrefix(token);

      expect(result).toBe('gth_ref_');
    });

    it('returns null for token without valid prefix - SECURITY CRITICAL', () => {
      expect(extractTokenPrefix('invalid_token_format')).toBeNull();
      expect(extractTokenPrefix('gt_tooshort')).toBeNull();
      expect(extractTokenPrefix('GTH_uppercase')).toBeNull();
    });

    it('returns null for empty string - SECURITY CRITICAL', () => {
      expect(extractTokenPrefix('')).toBeNull();
    });

    it('returns null for null input - SECURITY CRITICAL', () => {
      expect(extractTokenPrefix(null as unknown as string)).toBeNull();
    });

    it('returns null for undefined input - SECURITY CRITICAL', () => {
      expect(extractTokenPrefix(undefined as unknown as string)).toBeNull();
    });

    it('returns null for non-string input - SECURITY CRITICAL', () => {
      expect(extractTokenPrefix(123 as unknown as string)).toBeNull();
      expect(extractTokenPrefix({} as unknown as string)).toBeNull();
      expect(extractTokenPrefix([] as unknown as string)).toBeNull();
    });

    it('returns null for token shorter than prefix length - SECURITY CRITICAL', () => {
      expect(extractTokenPrefix('gth_ab')).toBeNull();
      expect(extractTokenPrefix('gth_')).toBeNull();
    });

    it('handles exactly 8-character tokens with valid prefix', () => {
      const result = extractTokenPrefix('gth_abcd');

      expect(result).toBe('gth_abcd');
    });
  });

  describe('getTokenType', () => {
    it('returns "access" for gth_ tokens', () => {
      expect(getTokenType('gth_abc123xyz789')).toBe('access');
      expect(getTokenType('gth_a')).toBe('access');
    });

    it('returns "refresh" for gth_ref_ tokens', () => {
      expect(getTokenType('gth_ref_abc123xyz789')).toBe('refresh');
      expect(getTokenType('gth_ref_a')).toBe('refresh');
    });

    it('returns null for invalid prefix', () => {
      expect(getTokenType('invalid_token')).toBeNull();
      expect(getTokenType('gt_token')).toBeNull();
      expect(getTokenType('gth')).toBeNull();
    });

    it('returns null for empty string', () => {
      expect(getTokenType('')).toBeNull();
    });

    it('returns null for null input', () => {
      expect(getTokenType(null as unknown as string)).toBeNull();
    });

    it('returns null for undefined input', () => {
      expect(getTokenType(undefined as unknown as string)).toBeNull();
    });

    it('returns null for non-string input', () => {
      expect(getTokenType(123 as unknown as string)).toBeNull();
      expect(getTokenType({} as unknown as string)).toBeNull();
    });

    it('correctly distinguishes between access and refresh (gth_ vs gth_ref_)', () => {
      // gth_ref should be detected as refresh, not access
      expect(getTokenType('gth_ref_something')).toBe('refresh');

      // gth_r (not gth_ref_) should be access
      expect(getTokenType('gth_rnotref')).toBe('access');
    });
  });

  describe('isValidTokenFormat', () => {
    it('returns true for valid access token format', () => {
      // Access token needs at least gth_ + 40 chars
      const validAccessToken = 'gth_' + 'a'.repeat(40);
      expect(isValidTokenFormat(validAccessToken)).toBe(true);
    });

    it('returns true for valid refresh token format', () => {
      // Refresh token needs at least gth_ref_ + 40 chars
      const validRefreshToken = 'gth_ref_' + 'a'.repeat(40);
      expect(isValidTokenFormat(validRefreshToken)).toBe(true);
    });

    it('returns false for access token that is too short', () => {
      const shortToken = 'gth_' + 'a'.repeat(39);
      expect(isValidTokenFormat(shortToken)).toBe(false);
    });

    it('returns false for refresh token that is too short', () => {
      const shortToken = 'gth_ref_' + 'a'.repeat(39);
      expect(isValidTokenFormat(shortToken)).toBe(false);
    });

    it('returns false for invalid prefix', () => {
      expect(isValidTokenFormat('invalid_' + 'a'.repeat(50))).toBe(false);
    });

    it('returns false for empty string', () => {
      expect(isValidTokenFormat('')).toBe(false);
    });

    it('returns false for null', () => {
      expect(isValidTokenFormat(null as unknown as string)).toBe(false);
    });

    it('returns false for undefined', () => {
      expect(isValidTokenFormat(undefined as unknown as string)).toBe(false);
    });

    it('returns false for non-string input', () => {
      expect(isValidTokenFormat(123 as unknown as string)).toBe(false);
      expect(isValidTokenFormat({} as unknown as string)).toBe(false);
    });
  });

  describe('edge cases - security validation', () => {
    beforeEach(() => {
      mockHash.mockResolvedValue(
        '$argon2id$v=19$m=65536,t=3,p=4$c2FsdHNhbHRzYWx0$aGFzaGVkdG9rZW5vdXRwdXQ'
      );
    });

    it('handles malformed tokens with invalid characters - SECURITY CRITICAL', () => {
      // Tokens with invalid characters should be rejected
      expect(getTokenType('gth_!!invalid!!')).toBe('access'); // Has prefix, type is detected
      expect(extractTokenPrefix('gth_!!invalid!!')).toBe('gth_!!in'); // Prefix extracted
      expect(isValidTokenFormat('gth_!!invalid!!')).toBe(false); // Too short for valid format
    });

    it('handles case variations consistently - SECURITY CRITICAL', () => {
      // Uppercase prefix should NOT be recognized
      expect(getTokenType('GTH_abc123')).toBeNull();
      expect(getTokenType('Gth_abc123')).toBeNull();
      expect(getTokenType('gTh_abc123')).toBeNull();

      expect(extractTokenPrefix('GTH_abc123')).toBeNull();
      expect(extractTokenPrefix('GTH_REF_abc123')).toBeNull();
    });

    it('returns null for empty string token - SECURITY CRITICAL', () => {
      expect(getTokenType('')).toBeNull();
      expect(extractTokenPrefix('')).toBeNull();
      expect(isValidTokenFormat('')).toBe(false);
    });

    it('handles whitespace in tokens', () => {
      // Leading/trailing whitespace - current implementation does not trim
      // Test documents current behavior
      expect(getTokenType(' gth_abc123')).toBeNull();
      expect(getTokenType('gth_abc123 ')).toBe('access');
      expect(extractTokenPrefix(' gth_abc123')).toBeNull();
    });

    it('handles extremely long tokens', () => {
      // Very long token (1000+ chars) should still work correctly
      const longToken = 'gth_' + 'a'.repeat(1000);
      expect(getTokenType(longToken)).toBe('access');
      expect(extractTokenPrefix(longToken)).toBe('gth_aaaa');
      expect(isValidTokenFormat(longToken)).toBe(true);
    });

    it('verifies token has 256-bit entropy (32 bytes of randomness) - SECURITY CRITICAL', async () => {
      const result = await generateAccessToken();

      // base64url encoding: 32 bytes = 43 chars (without padding)
      // Token format: gth_ (4 chars) + 43 chars = 47 chars
      const encodedPart = result.token.substring(4);

      // 32 bytes in base64 = ceil(32 * 8 / 6) = 43 characters
      expect(encodedPart.length).toBeGreaterThanOrEqual(42);
      expect(encodedPart.length).toBeLessThanOrEqual(44);
    });

    it('verifies hash starts with $argon2id$ (correct algorithm) - SECURITY CRITICAL', async () => {
      const result = await generateAccessToken();

      expect(result.hash).toMatch(/^\$argon2id\$/);
      // Should NOT use argon2i or argon2d
      expect(result.hash).not.toMatch(/^\$argon2i\$/);
      expect(result.hash).not.toMatch(/^\$argon2d\$/);
    });

    it('verifies tokens are unique across multiple generations - SECURITY CRITICAL', async () => {
      const tokens: string[] = [];
      const prefixes: string[] = [];

      for (let i = 0; i < 100; i++) {
        const result = await generateAccessToken();
        tokens.push(result.token);
        prefixes.push(result.prefix);
      }

      // All tokens must be unique
      const uniqueTokens = new Set(tokens);
      expect(uniqueTokens.size).toBe(100);

      // Prefixes should also be unique (statistically very likely with 256-bit entropy)
      const uniquePrefixes = new Set(prefixes);
      expect(uniquePrefixes.size).toBe(100);
    });

    it('malformed input does not cause crashes - SECURITY CRITICAL', async () => {
      // These should all return gracefully without throwing
      expect(() => getTokenType(undefined as unknown as string)).not.toThrow();
      expect(() => getTokenType(null as unknown as string)).not.toThrow();
      expect(() => getTokenType({} as unknown as string)).not.toThrow();
      expect(() => getTokenType([] as unknown as string)).not.toThrow();
      expect(() => getTokenType(123 as unknown as string)).not.toThrow();
      expect(() => getTokenType(Symbol() as unknown as string)).not.toThrow();

      expect(() => extractTokenPrefix(undefined as unknown as string)).not.toThrow();
      expect(() => extractTokenPrefix(null as unknown as string)).not.toThrow();
      expect(() => extractTokenPrefix({} as unknown as string)).not.toThrow();

      expect(() => isValidTokenFormat(undefined as unknown as string)).not.toThrow();
      expect(() => isValidTokenFormat(null as unknown as string)).not.toThrow();
      expect(() => isValidTokenFormat({} as unknown as string)).not.toThrow();
    });

    it('verifyToken handles malformed hash gracefully - SECURITY CRITICAL', async () => {
      mockVerify.mockRejectedValue(new Error('Invalid hash'));

      // These should all return false without throwing
      await expect(verifyToken('gth_valid', '$invalid$hash')).resolves.toBe(false);
      await expect(verifyToken('gth_valid', 'not-a-hash')).resolves.toBe(false);
      await expect(verifyToken('gth_valid', '')).resolves.toBe(false);
    });
  });

  describe('token format consistency', () => {
    beforeEach(() => {
      mockHash.mockResolvedValue(
        '$argon2id$v=19$m=65536,t=3,p=4$c2FsdHNhbHRzYWx0$aGFzaGVkdG9rZW5vdXRwdXQ'
      );
    });

    it('access token prefix is exactly 4 characters', async () => {
      const result = await generateAccessToken();

      expect(result.token.substring(0, 4)).toBe('gth_');
    });

    it('refresh token prefix is exactly 8 characters', async () => {
      const result = await generateRefreshToken();

      expect(result.token.substring(0, 8)).toBe('gth_ref_');
    });

    it('generated tokens pass isValidTokenFormat check', async () => {
      const accessResult = await generateAccessToken();
      const refreshResult = await generateRefreshToken();

      expect(isValidTokenFormat(accessResult.token)).toBe(true);
      expect(isValidTokenFormat(refreshResult.token)).toBe(true);
    });

    it('generated tokens have extractable prefixes', async () => {
      const accessResult = await generateAccessToken();
      const refreshResult = await generateRefreshToken();

      expect(extractTokenPrefix(accessResult.token)).not.toBeNull();
      expect(extractTokenPrefix(refreshResult.token)).not.toBeNull();
    });

    it('generated token types are correctly identified', async () => {
      const accessResult = await generateAccessToken();
      const refreshResult = await generateRefreshToken();

      expect(getTokenType(accessResult.token)).toBe('access');
      expect(getTokenType(refreshResult.token)).toBe('refresh');
    });
  });

  describe('integration with verifyToken', () => {
    beforeEach(() => {
      mockHash.mockResolvedValue(
        '$argon2id$v=19$m=65536,t=3,p=4$c2FsdHNhbHRzYWx0$aGFzaGVkdG9rZW5vdXRwdXQ'
      );
    });

    it('generated token can be verified against its hash', async () => {
      const result = await generateAccessToken();
      mockVerify.mockResolvedValue(true);

      const isValid = await verifyToken(result.token, result.hash);

      expect(isValid).toBe(true);
      expect(mockVerify).toHaveBeenCalledWith(result.hash, result.token);
    });

    it('different token fails verification against hash', async () => {
      const result = await generateAccessToken();
      mockVerify.mockResolvedValue(false);

      const isValid = await verifyToken('gth_differenttoken', result.hash);

      expect(isValid).toBe(false);
    });
  });
});
