/**
 * Integration tests for Audit Logs Authorization
 *
 * Tests cover:
 * - Admin user access to audit logs endpoint
 * - Non-admin user access denial
 * - Unauthenticated request handling
 * - Admin-only settings endpoint access
 *
 * These tests verify that only authenticated admin users can access audit log endpoints.
 */

import { describe, it, expect, beforeEach, afterEach, jest } from '@jest/globals';
import { NextRequest } from 'next/server';

// Mock rate limiter to avoid rate limit issues in tests
jest.mock('@/lib/rate-limiter', () => ({
  rateLimiter: {
    check: jest.fn().mockResolvedValue({
      allowed: true,
      remaining: 100,
      limit: 100,
      resetTime: new Date(Date.now() + 60000),
    }),
  },
  getRateLimitHeaders: jest.fn().mockReturnValue({}),
}));

// Mock auditService
jest.mock('@/lib/services/audit-service', () => ({
  auditService: {
    query: jest.fn().mockResolvedValue({
      data: [],
      pagination: {
        page: 1,
        pageSize: 50,
        total: 0,
        totalPages: 0,
      },
    }),
    getSettings: jest.fn().mockResolvedValue({
      id: 'default',
      authEnabled: true,
      userManagementEnabled: true,
      contentEnabled: true,
      adminEnabled: true,
      updatedAt: new Date(),
    }),
    updateSettings: jest.fn().mockImplementation((updates: Record<string, boolean>) =>
      Promise.resolve({
        id: 'default',
        authEnabled: updates.authEnabled ?? true,
        userManagementEnabled: updates.userManagementEnabled ?? true,
        contentEnabled: updates.contentEnabled ?? true,
        adminEnabled: updates.adminEnabled ?? true,
        updatedAt: new Date(),
      })
    ),
    log: jest.fn(), // Fire-and-forget, no need to mock return value
  },
}));

// Import modules
import * as authUtils from '@/lib/auth-utils';
import * as adminService from '@/lib/services/admin-service';
import { GET as getAuditLogs } from '@/app/api/admin/audit-logs/route';
import { PATCH as patchSettings } from '@/app/api/admin/audit-logs/settings/route';

describe('Audit Logs Authorization', () => {
  const mockAdminUser = {
    id: 'admin-123',
    email: 'admin@test.com',
    name: 'Test Admin',
    avatarUrl: null,
    role: 'admin',
    isAdmin: true,
    createdAt: new Date(),
    lastLoginAt: new Date(),
    image: null,
    username: 'testadmin',
    canUseVanityUrls: true,
    showPublicProfile: true,
    usernameSetAt: new Date(),
    authMethod: 'session' as const,
  };

  const mockRegularUser = {
    id: 'user-456',
    email: 'user@test.com',
    name: 'Test User',
    avatarUrl: null,
    role: 'user',
    isAdmin: false,
    createdAt: new Date(),
    lastLoginAt: new Date(),
    image: null,
    username: 'testuser',
    canUseVanityUrls: true,
    showPublicProfile: true,
    usernameSetAt: new Date(),
    authMethod: 'session' as const,
  };

  let getCurrentUserSpy: jest.SpiedFunction<typeof authUtils.getCurrentUser>;
  let isAdminSpy: jest.SpiedFunction<typeof adminService.AdminService.isAdmin>;

  beforeEach(() => {
    jest.clearAllMocks();
    // Set up spies
    getCurrentUserSpy = jest.spyOn(authUtils, 'getCurrentUser');
    isAdminSpy = jest.spyOn(adminService.AdminService, 'isAdmin');
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  /**
   * Helper to create a mock NextRequest with the given URL
   */
  function createMockRequest(url: string, options?: RequestInit): NextRequest {
    return new NextRequest(new URL(url, 'http://localhost:3000'), options);
  }

  /**
   * Mock an authenticated admin session
   */
  function mockAdminSession() {
    getCurrentUserSpy.mockResolvedValue(mockAdminUser);
    isAdminSpy.mockResolvedValue(true);
  }

  /**
   * Mock an authenticated regular (non-admin) session
   */
  function mockRegularUserSession() {
    getCurrentUserSpy.mockResolvedValue(mockRegularUser);
    isAdminSpy.mockResolvedValue(false);
  }

  /**
   * Mock an unauthenticated session (no session)
   */
  function mockNoSession() {
    getCurrentUserSpy.mockResolvedValue(null);
    isAdminSpy.mockResolvedValue(false);
  }

  describe('GET /api/admin/audit-logs', () => {
    it('admin user can access GET /api/admin/audit-logs', async () => {
      // Arrange: Mock admin session
      mockAdminSession();

      const request = createMockRequest('/api/admin/audit-logs');

      // Act: Call the endpoint
      const response = await getAuditLogs(request);

      // Assert: Should return 200 OK with audit logs data
      expect(response.status).toBe(200);

      const data = await response.json();
      expect(data).toHaveProperty('data');
      expect(data).toHaveProperty('pagination');
      expect(Array.isArray(data.data)).toBe(true);

      // Verify getCurrentUser was called (auth flow)
      expect(getCurrentUserSpy).toHaveBeenCalled();
      // Verify admin check was performed
      expect(isAdminSpy).toHaveBeenCalledWith(mockAdminUser.id);
    });

    it('non-admin user gets 401 Unauthorized on audit-logs endpoint', async () => {
      // Arrange: Mock regular user session (not admin)
      mockRegularUserSession();

      const request = createMockRequest('/api/admin/audit-logs');

      // Act: Call the endpoint
      const response = await getAuditLogs(request);

      // Assert: Should return 401 Unauthorized
      // Note: Current implementation returns 401 for both unauthenticated and non-admin users.
      // The getCurrentAdmin function returns null for non-admin users, so the route
      // cannot distinguish between unauthenticated and authenticated-but-not-admin.
      expect(response.status).toBe(401);

      const data = await response.json();
      expect(data).toHaveProperty('error');
      expect(data).toHaveProperty('code', 'UNAUTHORIZED');

      // Verify auth flow was attempted
      expect(getCurrentUserSpy).toHaveBeenCalled();
    });

    it('unauthenticated request gets 401 Unauthorized', async () => {
      // Arrange: Mock no session
      mockNoSession();

      const request = createMockRequest('/api/admin/audit-logs');

      // Act: Call the endpoint
      const response = await getAuditLogs(request);

      // Assert: Should return 401 Unauthorized
      expect(response.status).toBe(401);

      const data = await response.json();
      expect(data).toHaveProperty('error');
      expect(data).toHaveProperty('code', 'UNAUTHORIZED');

      // Verify auth flow was attempted
      expect(getCurrentUserSpy).toHaveBeenCalled();
    });
  });

  describe('PATCH /api/admin/audit-logs/settings', () => {
    it('admin user can PATCH /api/admin/audit-logs/settings', async () => {
      // Arrange: Mock admin session
      mockAdminSession();

      const request = createMockRequest('/api/admin/audit-logs/settings', {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          authEnabled: false,
        }),
      });

      // Act: Call the endpoint
      const response = await patchSettings(request);

      // Assert: Should return 200 OK with updated settings
      expect(response.status).toBe(200);

      const data = await response.json();
      expect(data).toHaveProperty('id');
      expect(data).toHaveProperty('authEnabled', false);
      expect(data).toHaveProperty('userManagementEnabled');
      expect(data).toHaveProperty('contentEnabled');
      expect(data).toHaveProperty('adminEnabled');
      expect(data).toHaveProperty('updatedAt');

      // Verify getCurrentUser was called (auth flow)
      expect(getCurrentUserSpy).toHaveBeenCalled();
      // Verify admin check was performed
      expect(isAdminSpy).toHaveBeenCalledWith(mockAdminUser.id);
    });

    it('non-admin user cannot PATCH settings (401)', async () => {
      // Arrange: Mock regular user session (not admin)
      mockRegularUserSession();

      const request = createMockRequest('/api/admin/audit-logs/settings', {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          authEnabled: false,
        }),
      });

      // Act: Call the endpoint
      const response = await patchSettings(request);

      // Assert: Should return 401 Unauthorized
      // Note: Current implementation returns 401 for both unauthenticated and non-admin users.
      expect(response.status).toBe(401);

      const data = await response.json();
      expect(data).toHaveProperty('error');
      expect(data).toHaveProperty('code', 'UNAUTHORIZED');

      // Verify auth flow was attempted
      expect(getCurrentUserSpy).toHaveBeenCalled();
    });
  });
});
