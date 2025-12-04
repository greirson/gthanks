/**
 * Integration tests for audit logs API endpoints
 *
 * Tests the admin audit log endpoints:
 * - GET /api/admin/audit-logs - Query with pagination and filtering
 * - GET /api/admin/audit-logs/export - Export as CSV/JSON
 * - GET/PATCH /api/admin/audit-logs/settings - Settings management
 */

import { NextRequest } from 'next/server';

import { GET as getAuditLogs } from '@/app/api/admin/audit-logs/route';
import { GET as exportAuditLogs } from '@/app/api/admin/audit-logs/export/route';
import {
  GET as getSettings,
  PATCH as updateSettings,
} from '@/app/api/admin/audit-logs/settings/route';

// Mock dependencies
jest.mock('@/lib/auth-admin', () => ({
  getCurrentAdmin: jest.fn(),
}));

jest.mock('@/lib/rate-limiter', () => ({
  rateLimiter: {
    check: jest.fn().mockResolvedValue({
      allowed: true,
      remaining: 59,
      limit: 60,
      resetAt: new Date(Date.now() + 60000),
    }),
  },
  getRateLimitHeaders: jest.fn().mockReturnValue({
    'X-RateLimit-Limit': '60',
    'X-RateLimit-Remaining': '59',
    'X-RateLimit-Reset': new Date(Date.now() + 60000).toISOString(),
  }),
}));

jest.mock('@/lib/services/audit-service', () => ({
  auditService: {
    query: jest.fn(),
    export: jest.fn(),
    getSettings: jest.fn(),
    updateSettings: jest.fn(),
    log: jest.fn(),
  },
}));

import { getCurrentAdmin } from '@/lib/auth-admin';
import { auditService } from '@/lib/services/audit-service';

const mockGetCurrentAdmin = getCurrentAdmin as jest.MockedFunction<typeof getCurrentAdmin>;
const mockAuditService = auditService as jest.Mocked<typeof auditService>;

// Helper to create mock request
function createMockRequest(
  url: string,
  options: {
    method?: string;
    headers?: Record<string, string>;
    body?: unknown;
    searchParams?: Record<string, string>;
  } = {}
): NextRequest {
  const fullUrl = new URL(url, 'http://localhost:3000');

  if (options.searchParams) {
    Object.entries(options.searchParams).forEach(([key, value]) => {
      fullUrl.searchParams.append(key, value);
    });
  }

  const headers = new Headers();
  if (options.headers) {
    Object.entries(options.headers).forEach(([key, value]) => {
      headers.set(key, value);
    });
  }

  if (options.body && !headers.has('content-type')) {
    headers.set('content-type', 'application/json');
  }

  return new NextRequest(fullUrl.toString(), {
    method: options.method || 'GET',
    headers,
    body: options.body ? JSON.stringify(options.body) : undefined,
  });
}

// Mock audit log entry factory
function createMockAuditLog(overrides: Partial<Record<string, unknown>> = {}) {
  const now = new Date();
  return {
    id: `log-${Math.random().toString(36).substring(7)}`,
    timestamp: now.toISOString(),
    actorId: 'user-123',
    actorName: 'Test User',
    actorType: 'user',
    category: 'content',
    action: 'wish_created',
    resourceType: 'wish',
    resourceId: 'wish-123',
    resourceName: 'Test Wish',
    details: null,
    ipAddress: '127.0.0.1',
    userAgent: 'Test User Agent',
    ...overrides,
  };
}

describe('Audit Logs API', () => {
  const adminUser = {
    id: 'admin-user-123',
    email: 'admin@test.com',
    name: 'Test Admin',
  };

  beforeEach(() => {
    jest.clearAllMocks();
    // Set up admin authentication by default
    mockGetCurrentAdmin.mockResolvedValue(adminUser);
  });

  // ===========================================================================
  // GET /api/admin/audit-logs
  // ===========================================================================

  describe('GET /api/admin/audit-logs', () => {
    test('returns paginated audit logs for admin user', async () => {
      // Create mock logs
      const mockLogs = Array.from({ length: 10 }, (_, i) => createMockAuditLog({ id: `log-${i}` }));

      mockAuditService.query.mockResolvedValue({
        data: mockLogs,
        pagination: {
          page: 1,
          pageSize: 10,
          total: 15,
          totalPages: 2,
        },
      });

      const request = createMockRequest('/api/admin/audit-logs', {
        searchParams: { page: '1', pageSize: '10' },
      });

      const response = await getAuditLogs(request);
      const data = await response.json();

      expect(response.status).toBe(200);

      // Check response structure
      expect(data).toHaveProperty('data');
      expect(data).toHaveProperty('pagination');
      expect(Array.isArray(data.data)).toBe(true);
      expect(data.data.length).toBe(10);

      // Check pagination structure
      expect(data.pagination).toEqual({
        page: 1,
        pageSize: 10,
        total: 15,
        totalPages: 2,
      });

      // Verify audit log entry structure
      const firstLog = data.data[0];
      expect(firstLog).toHaveProperty('id');
      expect(firstLog).toHaveProperty('timestamp');
      expect(firstLog).toHaveProperty('actorId');
      expect(firstLog).toHaveProperty('actorName');
      expect(firstLog).toHaveProperty('actorType');
      expect(firstLog).toHaveProperty('category');
      expect(firstLog).toHaveProperty('action');
      expect(firstLog).toHaveProperty('resourceType');
      expect(firstLog).toHaveProperty('resourceId');
      expect(firstLog).toHaveProperty('resourceName');

      // Verify service was called with correct params
      expect(mockAuditService.query).toHaveBeenCalledWith({
        page: 1,
        pageSize: 10,
      });
    });

    test('applies category filter correctly', async () => {
      const mockAuthLogs = Array.from({ length: 5 }, (_, i) =>
        createMockAuditLog({ id: `log-${i}`, category: 'auth', action: 'login_success' })
      );

      mockAuditService.query.mockResolvedValue({
        data: mockAuthLogs,
        pagination: {
          page: 1,
          pageSize: 50,
          total: 5,
          totalPages: 1,
        },
      });

      const request = createMockRequest('/api/admin/audit-logs', {
        searchParams: { category: 'auth' },
      });

      const response = await getAuditLogs(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.data.length).toBe(5);
      expect(data.pagination.total).toBe(5);

      // Verify all returned logs are auth category
      data.data.forEach((log: { category: string }) => {
        expect(log.category).toBe('auth');
      });

      // Verify service was called with category filter
      expect(mockAuditService.query).toHaveBeenCalledWith(
        expect.objectContaining({
          category: 'auth',
        })
      );
    });

    test('applies date range filter correctly', async () => {
      const now = Date.now();
      const startDate = new Date(now - 90 * 60 * 1000).toISOString();
      const endDate = new Date(now).toISOString();

      const mockRecentLogs = [
        createMockAuditLog({ timestamp: new Date(now - 30 * 60 * 1000).toISOString() }),
        createMockAuditLog({ timestamp: new Date(now - 60 * 60 * 1000).toISOString() }),
      ];

      mockAuditService.query.mockResolvedValue({
        data: mockRecentLogs,
        pagination: {
          page: 1,
          pageSize: 50,
          total: 2,
          totalPages: 1,
        },
      });

      const request = createMockRequest('/api/admin/audit-logs', {
        searchParams: { startDate, endDate },
      });

      const response = await getAuditLogs(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.data.length).toBe(2);

      // Verify service was called with date filters
      expect(mockAuditService.query).toHaveBeenCalledWith(
        expect.objectContaining({
          startDate,
          endDate,
        })
      );
    });

    test('applies search filter correctly', async () => {
      const mockSearchResults = [
        createMockAuditLog({ actorName: 'John Doe', action: 'login_success' }),
      ];

      mockAuditService.query.mockResolvedValue({
        data: mockSearchResults,
        pagination: {
          page: 1,
          pageSize: 50,
          total: 1,
          totalPages: 1,
        },
      });

      const request = createMockRequest('/api/admin/audit-logs', {
        searchParams: { search: 'John' },
      });

      const response = await getAuditLogs(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.pagination.total).toBe(1);
      expect(data.data[0].actorName).toBe('John Doe');

      // Verify service was called with search filter
      expect(mockAuditService.query).toHaveBeenCalledWith(
        expect.objectContaining({
          search: 'John',
        })
      );
    });
  });

  // ===========================================================================
  // GET /api/admin/audit-logs/export
  // ===========================================================================

  describe('GET /api/admin/audit-logs/export', () => {
    test('returns CSV format with correct headers', async () => {
      const mockExportLogs = [
        createMockAuditLog({ category: 'auth', action: 'login_success' }),
        createMockAuditLog({ category: 'content', action: 'wish_created' }),
        createMockAuditLog({ category: 'admin', action: 'user_suspended' }),
      ];

      mockAuditService.export.mockResolvedValue(mockExportLogs);

      const request = createMockRequest('/api/admin/audit-logs/export', {
        searchParams: { format: 'csv' },
      });

      const response = await exportAuditLogs(request);

      expect(response.status).toBe(200);
      expect(response.headers.get('content-type')).toContain('text/csv');
      expect(response.headers.get('content-disposition')).toContain('attachment');
      expect(response.headers.get('content-disposition')).toContain('audit-logs-');
      expect(response.headers.get('content-disposition')).toContain('.csv');

      // Read the body using arrayBuffer and decode
      const arrayBuffer = await response.arrayBuffer();
      const csvContent = new TextDecoder().decode(arrayBuffer);

      // Check CSV structure
      const lines = csvContent.split('\n');
      const headerLine = lines[0];

      // Verify expected CSV headers
      expect(headerLine).toContain('Timestamp');
      expect(headerLine).toContain('Actor');
      expect(headerLine).toContain('Actor Type');
      expect(headerLine).toContain('Category');
      expect(headerLine).toContain('Action');
      expect(headerLine).toContain('Resource Type');
      expect(headerLine).toContain('Resource ID');
      expect(headerLine).toContain('Resource Name');
      expect(headerLine).toContain('IP Address');

      // Verify data rows exist (header + 3 data rows)
      expect(lines.length).toBeGreaterThanOrEqual(4);
    });

    test('returns JSON format with correct structure', async () => {
      const mockExportLogs = [
        createMockAuditLog({ category: 'auth', action: 'login_success' }),
        createMockAuditLog({ category: 'content', action: 'wish_created' }),
        createMockAuditLog({ category: 'admin', action: 'user_suspended' }),
      ];

      mockAuditService.export.mockResolvedValue(mockExportLogs);

      const request = createMockRequest('/api/admin/audit-logs/export', {
        searchParams: { format: 'json' },
      });

      const response = await exportAuditLogs(request);

      expect(response.status).toBe(200);
      expect(response.headers.get('content-type')).toContain('application/json');
      expect(response.headers.get('content-disposition')).toContain('attachment');
      expect(response.headers.get('content-disposition')).toContain('audit-logs-');
      expect(response.headers.get('content-disposition')).toContain('.json');

      // Read the body using arrayBuffer and decode
      const arrayBuffer = await response.arrayBuffer();
      const jsonContent = new TextDecoder().decode(arrayBuffer);
      const data = JSON.parse(jsonContent);

      // Verify JSON structure
      expect(Array.isArray(data)).toBe(true);
      expect(data.length).toBe(3);

      // Verify each entry has expected fields
      data.forEach(
        (entry: {
          timestamp: string;
          actorName: string | null;
          actorType: string;
          category: string;
          action: string;
          resourceType: string | null;
          resourceId: string | null;
          resourceName: string | null;
          ipAddress: string | null;
        }) => {
          expect(entry).toHaveProperty('timestamp');
          expect(entry).toHaveProperty('actorName');
          expect(entry).toHaveProperty('actorType');
          expect(entry).toHaveProperty('category');
          expect(entry).toHaveProperty('action');
          expect(entry).toHaveProperty('resourceType');
          expect(entry).toHaveProperty('resourceId');
          expect(entry).toHaveProperty('resourceName');
          expect(entry).toHaveProperty('ipAddress');
        }
      );
    });
  });

  // ===========================================================================
  // GET/PATCH /api/admin/audit-logs/settings
  // ===========================================================================

  describe('GET/PATCH /api/admin/audit-logs/settings', () => {
    test('GET returns current settings', async () => {
      const mockSettings = {
        id: 'default',
        authEnabled: true,
        userManagementEnabled: true,
        contentEnabled: true,
        adminEnabled: true,
        updatedAt: new Date(),
      };

      mockAuditService.getSettings.mockResolvedValue(mockSettings);

      const request = createMockRequest('/api/admin/audit-logs/settings');

      const response = await getSettings(request);
      const data = await response.json();

      expect(response.status).toBe(200);

      // Verify settings structure
      expect(data).toHaveProperty('id');
      expect(data).toHaveProperty('authEnabled');
      expect(data).toHaveProperty('userManagementEnabled');
      expect(data).toHaveProperty('contentEnabled');
      expect(data).toHaveProperty('adminEnabled');
      expect(data).toHaveProperty('updatedAt');

      // Default settings should all be enabled
      expect(data.authEnabled).toBe(true);
      expect(data.userManagementEnabled).toBe(true);
      expect(data.contentEnabled).toBe(true);
      expect(data.adminEnabled).toBe(true);

      // Verify service was called
      expect(mockAuditService.getSettings).toHaveBeenCalled();
    });

    test('PATCH updates settings and returns updated values', async () => {
      const previousSettings = {
        id: 'default',
        authEnabled: true,
        userManagementEnabled: true,
        contentEnabled: true,
        adminEnabled: true,
        updatedAt: new Date(),
      };

      const updatedSettings = {
        id: 'default',
        authEnabled: false,
        userManagementEnabled: true,
        contentEnabled: false,
        adminEnabled: true,
        updatedAt: new Date(),
      };

      mockAuditService.getSettings.mockResolvedValue(previousSettings);
      mockAuditService.updateSettings.mockResolvedValue(updatedSettings);

      const patchRequest = createMockRequest('/api/admin/audit-logs/settings', {
        method: 'PATCH',
        body: {
          authEnabled: false,
          contentEnabled: false,
        },
      });

      const patchResponse = await updateSettings(patchRequest);
      const patchData = await patchResponse.json();

      expect(patchResponse.status).toBe(200);

      // Verify updated values
      expect(patchData.authEnabled).toBe(false);
      expect(patchData.contentEnabled).toBe(false);
      // Non-updated fields should retain defaults
      expect(patchData.userManagementEnabled).toBe(true);
      expect(patchData.adminEnabled).toBe(true);
      expect(patchData).toHaveProperty('updatedAt');

      // Verify service was called with correct updates
      expect(mockAuditService.updateSettings).toHaveBeenCalledWith({
        authEnabled: false,
        contentEnabled: false,
      });

      // Verify audit log was created for the settings change
      expect(mockAuditService.log).toHaveBeenCalledWith(
        expect.objectContaining({
          actorId: adminUser.id,
          category: 'admin',
          action: 'settings_changed',
          resourceType: 'audit_log_settings',
        })
      );
    });
  });

  // ===========================================================================
  // Authentication Tests
  // ===========================================================================

  describe('Authentication', () => {
    test('returns 401 when not authenticated', async () => {
      mockGetCurrentAdmin.mockResolvedValue(null);

      const request = createMockRequest('/api/admin/audit-logs');
      const response = await getAuditLogs(request);
      const data = await response.json();

      expect(response.status).toBe(401);
      expect(data.code).toBe('UNAUTHORIZED');
    });

    test('returns 401 for export when not authenticated', async () => {
      mockGetCurrentAdmin.mockResolvedValue(null);

      const request = createMockRequest('/api/admin/audit-logs/export');
      const response = await exportAuditLogs(request);
      const data = await response.json();

      expect(response.status).toBe(401);
      expect(data.code).toBe('UNAUTHORIZED');
    });

    test('returns 401 for settings when not authenticated', async () => {
      mockGetCurrentAdmin.mockResolvedValue(null);

      const request = createMockRequest('/api/admin/audit-logs/settings');
      const response = await getSettings(request);
      const data = await response.json();

      expect(response.status).toBe(401);
      expect(data.code).toBe('UNAUTHORIZED');
    });
  });

  // ===========================================================================
  // Validation Tests
  // ===========================================================================

  describe('Validation', () => {
    test('returns 400 for invalid category filter', async () => {
      const request = createMockRequest('/api/admin/audit-logs', {
        searchParams: { category: 'invalid_category' },
      });

      const response = await getAuditLogs(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.code).toBe('VALIDATION_ERROR');
    });

    test('returns 400 for invalid pageSize', async () => {
      const request = createMockRequest('/api/admin/audit-logs', {
        searchParams: { pageSize: '500' }, // Max is 100
      });

      const response = await getAuditLogs(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.code).toBe('VALIDATION_ERROR');
    });

    test('returns 400 for empty settings update', async () => {
      const request = createMockRequest('/api/admin/audit-logs/settings', {
        method: 'PATCH',
        body: {},
      });

      const response = await updateSettings(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.code).toBe('VALIDATION_ERROR');
    });
  });
});
