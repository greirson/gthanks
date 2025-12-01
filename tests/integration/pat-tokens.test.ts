/**
 * Integration tests for Personal Access Token (PAT) API endpoints
 *
 * Tests cover:
 * - POST /api/auth/tokens - Create token (with configurable expiration)
 * - GET /api/auth/tokens - List tokens
 * - DELETE /api/auth/tokens/[id] - Revoke token
 *
 * Security tests:
 * - Token creation requires session auth (prevents token escalation)
 * - User isolation (cannot see/revoke other users' tokens)
 * - Information leakage prevention (identical 401 responses)
 */

import { describe, it, expect, beforeEach, afterEach, jest } from '@jest/globals';

import { createMockRequest, mockAuthenticatedUser, clearAuth } from './test-helpers';
import { POST as createToken, GET as listTokens } from '@/app/api/auth/tokens/route';
import { DELETE as revokeToken } from '@/app/api/auth/tokens/[id]/route';
import { db } from '@/lib/db';
import { tokenService } from '@/lib/services/token-service';
import { rateLimiter } from '@/lib/rate-limiter';

// Mock auth-utils module
jest.mock('@/lib/auth-utils', () => ({
  getCurrentUser: jest.fn(),
  getSession: jest.fn(),
  getCurrentUserOrToken: jest.fn(),
}));

// Mock logger to reduce noise
jest.mock('@/lib/services/logger', () => ({
  logger: {
    info: jest.fn(),
    warn: jest.fn(),
    error: jest.fn(),
  },
}));

describe('PAT API Endpoints', () => {
  const testUser = {
    id: 'user-test-123',
    email: 'test@example.com',
    name: 'Test User',
  };

  const otherUser = {
    id: 'user-other-456',
    email: 'other@example.com',
    name: 'Other User',
  };

  beforeEach(async () => {
    jest.clearAllMocks();

    // Clear rate limiter storage before each test to prevent test isolation issues
    rateLimiter.clear();

    // Reset mock database if available
    const globalWithMock = global as { mockDb?: { _resetMockData?: () => void } };
    if (globalWithMock.mockDb && typeof globalWithMock.mockDb._resetMockData === 'function') {
      globalWithMock.mockDb._resetMockData();
    }

    // Create test users in database
    await db.user.create({
      data: {
        id: testUser.id,
        email: testUser.email,
        name: testUser.name,
      },
    });

    await db.user.create({
      data: {
        id: otherUser.id,
        email: otherUser.email,
        name: otherUser.name,
      },
    });

    clearAuth();
  });

  afterEach(async () => {
    // Clean up tokens
    await db.personalAccessToken.deleteMany({});
    await db.user.deleteMany({});
    clearAuth();
  });

  // =============================================================================
  // POST /api/auth/tokens - Create Token
  // =============================================================================

  describe('POST /api/auth/tokens - Create Token', () => {
    describe('Success Cases', () => {
      it('creates token with valid session and required fields (201)', async () => {
        mockAuthenticatedUser(testUser);

        const request = createMockRequest('/api/auth/tokens', {
          method: 'POST',
          body: {
            name: 'Safari Extension - MacBook Pro',
            deviceType: 'safari_extension',
          },
        });

        const response = await createToken(request);
        const data = await response.json();

        expect(response.status).toBe(201);
        expect(data).toHaveProperty('token');
        expect(data).toHaveProperty('expiresAt');
        expect(data).toHaveProperty('user');
        expect(data.user.id).toBe(testUser.id);
        expect(data.user.email).toBe(testUser.email);
      });

      it('token starts with gth_', async () => {
        mockAuthenticatedUser(testUser);

        const request = createMockRequest('/api/auth/tokens', {
          method: 'POST',
          body: {
            name: 'Test Token',
            deviceType: 'api_client',
          },
        });

        const response = await createToken(request);
        const data = await response.json();

        expect(response.status).toBe(201);
        expect(data.token).toMatch(/^gth_/);
      });

      it('creates token with only name (no deviceType) (201)', async () => {
        mockAuthenticatedUser(testUser);

        const request = createMockRequest('/api/auth/tokens', {
          method: 'POST',
          body: {
            name: 'API Client',
          },
        });

        const response = await createToken(request);
        const data = await response.json();

        expect(response.status).toBe(201);
        expect(data).toHaveProperty('token');
        expect(data.expiresAt).not.toBeNull(); // Default 90d expiration
      });

      it('creates token with custom expiration (30d)', async () => {
        mockAuthenticatedUser(testUser);

        const request = createMockRequest('/api/auth/tokens', {
          method: 'POST',
          body: {
            name: 'Short-lived Token',
            expiresIn: '30d',
          },
        });

        const response = await createToken(request);
        const data = await response.json();

        expect(response.status).toBe(201);
        expect(data.expiresAt).not.toBeNull();

        // Verify approximately 30 days from now
        const expectedExpiry = Date.now() + 30 * 24 * 60 * 60 * 1000;
        expect(data.expiresAt).toBeGreaterThan(expectedExpiry - 60000); // Allow 1 min tolerance
        expect(data.expiresAt).toBeLessThan(expectedExpiry + 60000);
      });

      it('creates token that never expires (never)', async () => {
        mockAuthenticatedUser(testUser);

        const request = createMockRequest('/api/auth/tokens', {
          method: 'POST',
          body: {
            name: 'Never Expiring Token',
            expiresIn: 'never',
          },
        });

        const response = await createToken(request);
        const data = await response.json();

        expect(response.status).toBe(201);
        expect(data.expiresAt).toBeNull();
      });
    });

    describe('Authentication Errors (401)', () => {
      it('returns 401 when not authenticated', async () => {
        clearAuth();

        const request = createMockRequest('/api/auth/tokens', {
          method: 'POST',
          body: {
            name: 'Test Token',
          },
        });

        const response = await createToken(request);
        const data = await response.json();

        expect(response.status).toBe(401);
        expect(data.error).toBe('unauthorized');
      });

      it('returns 401 when using Bearer token only (CRITICAL - prevents token escalation)', async () => {
        // This test verifies that token creation REQUIRES session auth
        // Even with a valid Bearer token, we should reject the request
        // because getCurrentUser (session-only) won't return a user

        clearAuth(); // Ensure no session auth

        const request = createMockRequest('/api/auth/tokens', {
          method: 'POST',
          headers: {
            Authorization: 'Bearer gth_some_valid_token',
          },
          body: {
            name: 'Escalated Token',
          },
        });

        const response = await createToken(request);
        const data = await response.json();

        // The endpoint uses getCurrentUser (session only), not getCurrentUserOrToken
        // So Bearer auth should be ignored and return 401
        expect(response.status).toBe(401);
        expect(data.error).toBe('unauthorized');
      });
    });

    describe('Validation Errors (400)', () => {
      it('returns 400 when name is missing', async () => {
        mockAuthenticatedUser(testUser);

        const request = createMockRequest('/api/auth/tokens', {
          method: 'POST',
          body: {},
        });

        const response = await createToken(request);
        const data = await response.json();

        expect(response.status).toBe(400);
        expect(data.error).toBe('validation_error');
      });

      it('returns 400 when name is empty', async () => {
        mockAuthenticatedUser(testUser);

        const request = createMockRequest('/api/auth/tokens', {
          method: 'POST',
          body: {
            name: '',
          },
        });

        const response = await createToken(request);
        const data = await response.json();

        expect(response.status).toBe(400);
        expect(data.error).toBe('validation_error');
      });

      it('returns 400 for invalid deviceType', async () => {
        mockAuthenticatedUser(testUser);

        const request = createMockRequest('/api/auth/tokens', {
          method: 'POST',
          body: {
            name: 'Test Token',
            deviceType: 'invalid_device_type',
          },
        });

        const response = await createToken(request);
        const data = await response.json();

        expect(response.status).toBe(400);
        expect(data.error).toBe('validation_error');
      });

      it('returns 400 for name > 100 characters', async () => {
        mockAuthenticatedUser(testUser);

        const longName = 'a'.repeat(101);
        const request = createMockRequest('/api/auth/tokens', {
          method: 'POST',
          body: {
            name: longName,
          },
        });

        const response = await createToken(request);
        const data = await response.json();

        expect(response.status).toBe(400);
        expect(data.error).toBe('validation_error');
      });

      it('sanitizes name input (trims whitespace)', async () => {
        mockAuthenticatedUser(testUser);

        const request = createMockRequest('/api/auth/tokens', {
          method: 'POST',
          body: {
            name: '  Trimmed Name  ',
          },
        });

        const response = await createToken(request);
        const data = await response.json();

        expect(response.status).toBe(201);

        // Verify the token was created with trimmed name
        const tokens = await db.personalAccessToken.findMany({
          where: { userId: testUser.id },
        });
        expect(tokens[0].name).toBe('Trimmed Name');
      });
    });
  });

  // =============================================================================
  // GET /api/auth/tokens - List Tokens
  // =============================================================================

  describe('GET /api/auth/tokens - List Tokens', () => {
    describe('Success Cases', () => {
      it('returns empty array when user has no tokens (200)', async () => {
        mockAuthenticatedUser(testUser);

        const request = createMockRequest('/api/auth/tokens', {
          method: 'GET',
        });

        const response = await listTokens(request);
        const data = await response.json();

        expect(response.status).toBe(200);
        expect(data).toHaveProperty('tokens');
        expect(data.tokens).toEqual([]);
      });

      it('returns all active tokens for user (200)', async () => {
        mockAuthenticatedUser(testUser);

        // Create tokens using the service
        await tokenService.createToken({
          userId: testUser.id,
          name: 'Token 1',
          deviceType: 'safari_extension',
        });

        await tokenService.createToken({
          userId: testUser.id,
          name: 'Token 2',
          deviceType: 'chrome_extension',
        });

        const request = createMockRequest('/api/auth/tokens', {
          method: 'GET',
        });

        const response = await listTokens(request);
        const data = await response.json();

        expect(response.status).toBe(200);
        expect(data.tokens).toHaveLength(2);
        expect(data.tokens.map((t: { name: string }) => t.name)).toContain('Token 1');
        expect(data.tokens.map((t: { name: string }) => t.name)).toContain('Token 2');
      });

      it('excludes revoked tokens', async () => {
        mockAuthenticatedUser(testUser);

        // Create tokens
        const token1 = await tokenService.createToken({
          userId: testUser.id,
          name: 'Active Token',
        });

        const token2 = await tokenService.createToken({
          userId: testUser.id,
          name: 'Revoked Token',
        });

        // Revoke one token
        await tokenService.revokeToken(token2.tokenId, testUser.id);

        const request = createMockRequest('/api/auth/tokens', {
          method: 'GET',
        });

        const response = await listTokens(request);
        const data = await response.json();

        expect(response.status).toBe(200);
        expect(data.tokens).toHaveLength(1);
        expect(data.tokens[0].name).toBe('Active Token');
      });

      it('only returns tokens for authenticated user (user isolation)', async () => {
        // Create tokens for both users
        await tokenService.createToken({
          userId: testUser.id,
          name: 'Test User Token',
        });

        await tokenService.createToken({
          userId: otherUser.id,
          name: 'Other User Token',
        });

        // Authenticate as testUser
        mockAuthenticatedUser(testUser);

        const request = createMockRequest('/api/auth/tokens', {
          method: 'GET',
        });

        const response = await listTokens(request);
        const data = await response.json();

        expect(response.status).toBe(200);
        expect(data.tokens).toHaveLength(1);
        expect(data.tokens[0].name).toBe('Test User Token');
      });

      it('returns expiresAt as null for never-expiring tokens', async () => {
        mockAuthenticatedUser(testUser);

        // Create a never-expiring token
        await tokenService.createToken({
          userId: testUser.id,
          name: 'Never Expires',
          expiresIn: 'never',
        });

        const request = createMockRequest('/api/auth/tokens', {
          method: 'GET',
        });

        const response = await listTokens(request);
        const data = await response.json();

        expect(response.status).toBe(200);
        expect(data.tokens).toHaveLength(1);
        expect(data.tokens[0].expiresAt).toBeNull();
      });
    });

    describe('Authentication Errors (401)', () => {
      it('returns 401 when not authenticated', async () => {
        clearAuth();

        const request = createMockRequest('/api/auth/tokens', {
          method: 'GET',
        });

        const response = await listTokens(request);
        const data = await response.json();

        expect(response.status).toBe(401);
        expect(data.error).toBe('unauthorized');
      });
    });
  });

  // =============================================================================
  // DELETE /api/auth/tokens/[id] - Revoke Token
  // =============================================================================

  describe('DELETE /api/auth/tokens/[id] - Revoke Token', () => {
    describe('Success Cases', () => {
      it('revokes token successfully (200)', async () => {
        mockAuthenticatedUser(testUser);

        const tokenPair = await tokenService.createToken({
          userId: testUser.id,
          name: 'Token to Revoke',
        });

        const request = createMockRequest('/api/auth/tokens/' + tokenPair.tokenId, {
          method: 'DELETE',
        });

        const response = await revokeToken(request, { params: { id: tokenPair.tokenId } });
        const data = await response.json();

        expect(response.status).toBe(200);
        expect(data.success).toBe(true);
        expect(data.message).toBe('Token revoked successfully');

        // Verify token is revoked in database
        const dbToken = await db.personalAccessToken.findUnique({
          where: { id: tokenPair.tokenId },
        });
        expect(dbToken?.revokedAt).not.toBeNull();
      });

      it('is idempotent (already revoked succeeds) (200)', async () => {
        mockAuthenticatedUser(testUser);

        const tokenPair = await tokenService.createToken({
          userId: testUser.id,
          name: 'Already Revoked Token',
        });

        // Revoke once
        await tokenService.revokeToken(tokenPair.tokenId, testUser.id);

        // Try to revoke again
        const request = createMockRequest('/api/auth/tokens/' + tokenPair.tokenId, {
          method: 'DELETE',
        });

        const response = await revokeToken(request, { params: { id: tokenPair.tokenId } });
        const data = await response.json();

        expect(response.status).toBe(200);
        expect(data.success).toBe(true);
      });
    });

    describe('Authentication Errors (401)', () => {
      it('returns 401 when not authenticated', async () => {
        clearAuth();

        const request = createMockRequest('/api/auth/tokens/some-token-id', {
          method: 'DELETE',
        });

        const response = await revokeToken(request, { params: { id: 'some-token-id' } });
        const data = await response.json();

        expect(response.status).toBe(401);
        expect(data.error).toBe('unauthorized');
      });
    });

    describe('Not Found (404)', () => {
      it('returns 404 for non-existent token ID', async () => {
        mockAuthenticatedUser(testUser);

        const request = createMockRequest('/api/auth/tokens/non-existent-id', {
          method: 'DELETE',
        });

        const response = await revokeToken(request, { params: { id: 'non-existent-id' } });
        const data = await response.json();

        expect(response.status).toBe(404);
        expect(data.error).toBe('not_found');
      });
    });

    describe('Forbidden (403)', () => {
      it("returns 403 when revoking another user's token - SECURITY CRITICAL", async () => {
        // Create token for other user
        const otherUserToken = await tokenService.createToken({
          userId: otherUser.id,
          name: 'Other User Token',
        });

        // Authenticate as testUser
        mockAuthenticatedUser(testUser);

        const request = createMockRequest('/api/auth/tokens/' + otherUserToken.tokenId, {
          method: 'DELETE',
        });

        const response = await revokeToken(request, { params: { id: otherUserToken.tokenId } });
        const data = await response.json();

        expect(response.status).toBe(403);
        expect(data.error).toBe('forbidden');

        // Verify token was NOT revoked
        const dbToken = await db.personalAccessToken.findUnique({
          where: { id: otherUserToken.tokenId },
        });
        expect(dbToken?.revokedAt).toBeNull();
      });
    });
  });

  // =============================================================================
  // Security Edge Cases
  // =============================================================================

  describe('Security Edge Cases', () => {
    describe('Bearer Header Case Insensitivity', () => {
      it('rejects "bearer" (lowercase) header for token creation', async () => {
        clearAuth();

        const request = createMockRequest('/api/auth/tokens', {
          method: 'POST',
          headers: {
            Authorization: 'bearer gth_some_valid_token',
          },
          body: {
            name: 'Lowercase Bearer Token',
          },
        });

        const response = await createToken(request);
        const data = await response.json();

        // Token creation requires session auth, not Bearer
        expect(response.status).toBe(401);
        expect(data.error).toBe('unauthorized');
      });

      it('rejects "BEARER" (uppercase) header for token creation', async () => {
        clearAuth();

        const request = createMockRequest('/api/auth/tokens', {
          method: 'POST',
          headers: {
            Authorization: 'BEARER gth_some_valid_token',
          },
          body: {
            name: 'Uppercase Bearer Token',
          },
        });

        const response = await createToken(request);
        const data = await response.json();

        // Token creation requires session auth, not Bearer
        expect(response.status).toBe(401);
        expect(data.error).toBe('unauthorized');
      });
    });

    describe('Response Schema Validation', () => {
      it('token creation response matches expected schema', async () => {
        mockAuthenticatedUser(testUser);

        const request = createMockRequest('/api/auth/tokens', {
          method: 'POST',
          body: {
            name: 'Schema Test Token',
            deviceType: 'safari_extension',
          },
        });

        const response = await createToken(request);
        const data = await response.json();

        expect(response.status).toBe(201);

        // Validate all required fields are present and correct types
        expect(typeof data.token).toBe('string');
        expect(typeof data.expiresAt).toBe('number'); // Default 90d
        expect(typeof data.user).toBe('object');
        expect(typeof data.user.id).toBe('string');

        // Validate token prefix
        expect(data.token.startsWith('gth_')).toBe(true);

        // Validate expiresAt is a future timestamp
        expect(data.expiresAt).toBeGreaterThan(Date.now());
      });

      it('token list response matches expected shape { tokens: [...] }', async () => {
        mockAuthenticatedUser(testUser);

        // Create a token first
        await tokenService.createToken({
          userId: testUser.id,
          name: 'List Test Token',
          deviceType: 'api_client',
        });

        const request = createMockRequest('/api/auth/tokens', {
          method: 'GET',
        });

        const response = await listTokens(request);
        const data = await response.json();

        expect(response.status).toBe(200);
        expect(data).toHaveProperty('tokens');
        expect(Array.isArray(data.tokens)).toBe(true);
        expect(data.tokens.length).toBeGreaterThan(0);

        // Validate token info structure
        const tokenInfo = data.tokens[0];
        expect(tokenInfo).toHaveProperty('id');
        expect(tokenInfo).toHaveProperty('name');
        expect(tokenInfo).toHaveProperty('deviceType');
        expect(tokenInfo).toHaveProperty('tokenPrefix');
        expect(tokenInfo).toHaveProperty('createdAt');
        expect(tokenInfo).toHaveProperty('expiresAt');
        expect(tokenInfo).toHaveProperty('current');

        // Validate types
        expect(typeof tokenInfo.id).toBe('string');
        expect(typeof tokenInfo.name).toBe('string');
        expect(typeof tokenInfo.tokenPrefix).toBe('string');
        expect(typeof tokenInfo.createdAt).toBe('string');
        expect(typeof tokenInfo.current).toBe('boolean');
      });
    });

    describe('Token Isolation', () => {
      it('user cannot list tokens belonging to other users', async () => {
        // Create tokens for both users
        await tokenService.createToken({
          userId: testUser.id,
          name: 'Test User Token A',
        });

        await tokenService.createToken({
          userId: testUser.id,
          name: 'Test User Token B',
        });

        await tokenService.createToken({
          userId: otherUser.id,
          name: 'Other User Token',
        });

        // Authenticate as testUser
        mockAuthenticatedUser(testUser);

        const request = createMockRequest('/api/auth/tokens', {
          method: 'GET',
        });

        const response = await listTokens(request);
        const data = await response.json();

        expect(response.status).toBe(200);
        // Should only see testUser's 2 tokens, not otherUser's token
        expect(data.tokens).toHaveLength(2);

        // Verify no token names from other user
        const tokenNames = data.tokens.map((t: { name: string }) => t.name);
        expect(tokenNames).not.toContain('Other User Token');
        expect(tokenNames).toContain('Test User Token A');
        expect(tokenNames).toContain('Test User Token B');
      });
    });

    describe('Suspended User Handling', () => {
      it('suspended user cannot create new tokens', async () => {
        // Create a fresh user to avoid rate limiting from previous tests
        const suspendedUser = await db.user.create({
          data: {
            id: 'suspended-user-' + Date.now(),
            email: 'suspended-' + Date.now() + '@test.com',
            suspendedAt: new Date(),
          },
        });

        mockAuthenticatedUser(suspendedUser);

        const request = createMockRequest('/api/auth/tokens', {
          method: 'POST',
          body: {
            name: 'Suspended User Token',
          },
        });

        const response = await createToken(request);

        // Service throws ForbiddenError for suspended users
        expect(response.status).toBeGreaterThanOrEqual(400);

        // Cleanup
        await db.user.delete({ where: { id: suspendedUser.id } });
      });
    });

    describe('Token Prefix Display', () => {
      it('token prefix in list is truncated with ellipsis', async () => {
        mockAuthenticatedUser(testUser);

        await tokenService.createToken({
          userId: testUser.id,
          name: 'Prefix Test Token',
        });

        const request = createMockRequest('/api/auth/tokens', {
          method: 'GET',
        });

        const response = await listTokens(request);
        const data = await response.json();

        expect(response.status).toBe(200);
        expect(data.tokens).toHaveLength(1);

        // Token prefix should end with "..."
        expect(data.tokens[0].tokenPrefix).toMatch(/\.\.\.$/);
        // Token prefix should start with "gth_"
        expect(data.tokens[0].tokenPrefix).toMatch(/^gth_/);
      });
    });
  });
});
