/**
 * Integration tests for GET /api/users/me endpoint
 *
 * Tests the current user endpoint that supports both session and PAT authentication.
 */

import { NextRequest } from 'next/server';

import { GET } from '@/app/api/users/me/route';

// Mock dependencies
jest.mock('@/lib/auth-utils', () => ({
  getCurrentUserOrToken: jest.fn(),
}));

jest.mock('@/lib/services/user-profile', () => ({
  UserProfileService: {
    getProfile: jest.fn(),
  },
}));

jest.mock('@/lib/services/logger', () => ({
  logger: {
    error: jest.fn(),
    info: jest.fn(),
    warn: jest.fn(),
    debug: jest.fn(),
  },
}));

import { getCurrentUserOrToken } from '@/lib/auth-utils';
import { UserProfileService } from '@/lib/services/user-profile';

const mockGetCurrentUserOrToken = getCurrentUserOrToken as jest.MockedFunction<
  typeof getCurrentUserOrToken
>;
const mockGetProfile = UserProfileService.getProfile as jest.MockedFunction<
  typeof UserProfileService.getProfile
>;

function createMockRequest(options: { headers?: Record<string, string> } = {}): NextRequest {
  const headers = new Headers(options.headers || {});
  return new NextRequest('http://localhost:3000/api/users/me', {
    method: 'GET',
    headers,
  });
}

describe('GET /api/users/me', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('Authentication', () => {
    it('returns 401 when no authentication provided', async () => {
      mockGetCurrentUserOrToken.mockResolvedValue(null);

      const request = createMockRequest();
      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(401);
      expect(data.code).toBe('UNAUTHORIZED');
    });

    it('returns 401 when token is invalid', async () => {
      mockGetCurrentUserOrToken.mockResolvedValue(null);

      const request = createMockRequest({
        headers: { Authorization: 'Bearer gth_invalid_token' },
      });
      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(401);
      expect(data.code).toBe('UNAUTHORIZED');
    });

    it('authenticates with valid session', async () => {
      const userId = 'user-123';
      mockGetCurrentUserOrToken.mockResolvedValue({
        userId,
        authMethod: 'session',
        name: 'Test User',
        email: 'test@example.com',
      });

      mockGetProfile.mockResolvedValue({
        id: userId,
        name: 'Test User',
        email: 'test@example.com',
        username: 'testuser',
        avatarUrl: 'https://example.com/avatar.jpg',
      } as never);

      const request = createMockRequest();
      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.id).toBe(userId);
      expect(data.name).toBe('Test User');
      expect(data.email).toBe('test@example.com');
      expect(data.username).toBe('testuser');
    });

    it('authenticates with valid PAT token', async () => {
      const userId = 'user-456';
      const tokenId = 'token-789';
      mockGetCurrentUserOrToken.mockResolvedValue({
        userId,
        authMethod: 'token',
        tokenId,
        name: 'Token User',
        email: 'token@example.com',
      });

      mockGetProfile.mockResolvedValue({
        id: userId,
        name: 'Token User',
        email: 'token@example.com',
        username: 'tokenuser',
        avatarUrl: null,
      } as never);

      const request = createMockRequest({
        headers: { Authorization: 'Bearer gth_valid_token_here' },
      });
      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.id).toBe(userId);
      expect(data.name).toBe('Token User');
      expect(data.username).toBe('tokenuser');
    });
  });

  describe('Response Format', () => {
    beforeEach(() => {
      mockGetCurrentUserOrToken.mockResolvedValue({
        userId: 'user-123',
        authMethod: 'session',
        name: 'Test User',
        email: 'test@example.com',
      });
    });

    it('returns all expected user fields', async () => {
      mockGetProfile.mockResolvedValue({
        id: 'user-123',
        name: 'Full Name',
        email: 'full@example.com',
        username: 'fulluser',
        avatarUrl: 'https://example.com/avatar.png',
      } as never);

      const request = createMockRequest();
      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data).toEqual({
        id: 'user-123',
        name: 'Full Name',
        email: 'full@example.com',
        username: 'fulluser',
        avatarUrl: 'https://example.com/avatar.png',
      });
    });

    it('returns null for optional fields when not set', async () => {
      mockGetProfile.mockResolvedValue({
        id: 'user-123',
        name: null,
        email: 'minimal@example.com',
        username: null,
        avatarUrl: null,
      } as never);

      const request = createMockRequest();
      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.id).toBe('user-123');
      expect(data.name).toBeNull();
      expect(data.username).toBeNull();
      expect(data.avatarUrl).toBeNull();
    });

    it('does not include sensitive fields', async () => {
      mockGetProfile.mockResolvedValue({
        id: 'user-123',
        name: 'Test',
        email: 'test@example.com',
        username: 'testuser',
        avatarUrl: null,
        // Service may return more fields, but route should filter
        isAdmin: true,
        role: 'admin',
        suspendedAt: null,
        createdAt: new Date(),
      } as never);

      const request = createMockRequest();
      const response = await GET(request);
      const data = await response.json();

      // Should NOT include these fields
      expect(data).not.toHaveProperty('password');
      expect(data).not.toHaveProperty('isAdmin');
      expect(data).not.toHaveProperty('role');
      expect(data).not.toHaveProperty('suspendedAt');
      expect(data).not.toHaveProperty('createdAt');
    });
  });

  describe('Edge Cases', () => {
    it('returns 404 when user was deleted after token issued', async () => {
      mockGetCurrentUserOrToken.mockResolvedValue({
        userId: 'deleted-user',
        authMethod: 'token',
        tokenId: 'token-123',
        name: 'Deleted User',
        email: 'deleted@example.com',
      });

      mockGetProfile.mockResolvedValue(null);

      const request = createMockRequest({
        headers: { Authorization: 'Bearer gth_orphaned_token' },
      });
      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(404);
      expect(data.code).toBe('USER_NOT_FOUND');
    });

    it('handles service errors gracefully', async () => {
      mockGetCurrentUserOrToken.mockResolvedValue({
        userId: 'user-123',
        authMethod: 'session',
        name: 'Test',
        email: 'test@example.com',
      });

      mockGetProfile.mockRejectedValue(new Error('Database connection failed'));

      const request = createMockRequest();
      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(500);
      expect(data.code).toBe('INTERNAL_ERROR');
    });

    it('handles auth check errors gracefully', async () => {
      mockGetCurrentUserOrToken.mockRejectedValue(new Error('Auth service unavailable'));

      const request = createMockRequest();
      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(500);
      expect(data.code).toBe('INTERNAL_ERROR');
    });
  });

  describe('Service Layer', () => {
    it('calls UserProfileService.getProfile with correct userId', async () => {
      mockGetCurrentUserOrToken.mockResolvedValue({
        userId: 'user-123',
        authMethod: 'session',
        name: 'Test',
        email: 'test@example.com',
      });

      mockGetProfile.mockResolvedValue({
        id: 'user-123',
        name: 'Test',
        email: 'test@example.com',
        username: 'testuser',
        avatarUrl: null,
      } as never);

      const request = createMockRequest();
      await GET(request);

      expect(mockGetProfile).toHaveBeenCalledWith('user-123');
      expect(mockGetProfile).toHaveBeenCalledTimes(1);
    });

    it('does not call service when auth fails', async () => {
      mockGetCurrentUserOrToken.mockResolvedValue(null);

      const request = createMockRequest();
      await GET(request);

      expect(mockGetProfile).not.toHaveBeenCalled();
    });
  });
});
