import type { List, User } from '@prisma/client';

import { NextRequest } from 'next/server';

import { getCurrentUser } from '@/lib/auth-utils';
import { db } from '@/lib/db';
import { ForbiddenError, NotFoundError, ValidationError } from '@/lib/errors';
import { permissionService } from '@/lib/services/permission-service';
import { ListInvitationService } from '@/lib/services/list-invitation.service';
import { createMockUser } from '@/lib/test-utils/mock-types';

import { GET, POST } from './route';

// Mock dependencies
jest.mock('@/lib/auth-utils');
jest.mock('@/lib/db');
jest.mock('@/lib/services/permission-service');
jest.mock('@/lib/services/list-invitation.service');

const mockGetCurrentUser = jest.mocked(getCurrentUser);
const mockDb = jest.mocked(db);
const mockPermissionService = jest.mocked(permissionService);
const mockListInvitationService = jest.mocked(ListInvitationService);

// Helper functions to create mock data
const createMockList = (id: string, ownerId: string): List => ({
  id,
  name: 'Test List',
  description: null,
  ownerId,
  visibility: 'private',
  password: null,
  shareToken: null,
  slug: null,
  hideFromProfile: false,
  giftCardPreferences: '[]',
  createdAt: new Date('2024-01-01'),
  updatedAt: new Date('2024-01-01'),
});

const createMockAdmin = (listId: string, userId: string, addedBy: string) => ({
  listId,
  userId,
  addedBy,
  addedAt: new Date('2024-01-01'),
  user: {
    id: userId,
    name: `User ${userId}`,
    email: `user${userId}@example.com`,
    image: null,
  },
});

describe('GET /api/lists/[listId]/admins', () => {
  const mockOwner = createMockUser('owner-1');
  const mockCoManager = createMockUser('co-manager-1');
  const mockUnauthorizedUser = createMockUser('unauthorized-1');

  beforeEach(() => {
    jest.clearAllMocks();
    // Reset mock database state
    (global as any).mockDb?._resetMockData?.();
  });

  describe('Successful operations', () => {
    it('allows list owners to retrieve all co-managers with user details and metadata', async () => {
      mockGetCurrentUser.mockResolvedValue(mockOwner);
      mockPermissionService.require.mockResolvedValue(undefined);

      // Mock list admins
      const mockAdmins = [
        createMockAdmin('list-1', 'co-manager-1', 'owner-1'),
        createMockAdmin('list-1', 'co-manager-2', 'owner-1'),
      ];

      mockDb.listAdmin.findMany.mockResolvedValue(mockAdmins as any);

      // Mock addedBy users lookup
      const mockAddedByUsers = [{ id: 'owner-1', name: 'List Owner' }];
      mockDb.user.findMany.mockResolvedValue(mockAddedByUsers as any);

      const request = new NextRequest('http://localhost:3000/api/lists/list-1/admins');
      const response = await GET(request, { params: { listId: 'list-1' } });

      expect(response.status).toBe(200);

      const data = await response.json();
      expect(data).toHaveProperty('admins');
      expect(data.admins).toHaveLength(2);
      expect(data.admins[0]).toMatchObject({
        userId: 'co-manager-1',
        user: {
          id: 'co-manager-1',
          name: 'User co-manager-1',
          email: 'userco-manager-1@example.com',
        },
        addedBy: { id: 'owner-1', name: 'List Owner' },
      });

      // Verify permission check was called
      expect(mockPermissionService.require).toHaveBeenCalledWith(mockOwner.id, 'view', {
        type: 'list',
        id: 'list-1',
      });

      // Verify database queries
      expect(mockDb.listAdmin.findMany).toHaveBeenCalledWith({
        where: { listId: 'list-1' },
        include: {
          user: {
            select: {
              id: true,
              name: true,
              email: true,
              image: true,
            },
          },
        },
        orderBy: { addedAt: 'asc' },
      });
    });

    it('allows co-managers to view list admins', async () => {
      mockGetCurrentUser.mockResolvedValue(mockCoManager);
      mockPermissionService.require.mockResolvedValue(undefined);

      mockDb.listAdmin.findMany.mockResolvedValue([]);
      mockDb.user.findMany.mockResolvedValue([]);

      const request = new NextRequest('http://localhost:3000/api/lists/list-1/admins');
      const response = await GET(request, { params: { listId: 'list-1' } });

      expect(response.status).toBe(200);

      // Verify permission check was called
      expect(mockPermissionService.require).toHaveBeenCalledWith(mockCoManager.id, 'view', {
        type: 'list',
        id: 'list-1',
      });
    });

    it('returns empty array when list has no co-managers', async () => {
      mockGetCurrentUser.mockResolvedValue(mockOwner);
      mockPermissionService.require.mockResolvedValue(undefined);

      mockDb.listAdmin.findMany.mockResolvedValue([]);
      mockDb.user.findMany.mockResolvedValue([]);

      const request = new NextRequest('http://localhost:3000/api/lists/list-1/admins');
      const response = await GET(request, { params: { listId: 'list-1' } });

      expect(response.status).toBe(200);

      const data = await response.json();
      expect(data.admins).toEqual([]);
    });

    it('handles missing addedBy user gracefully', async () => {
      mockGetCurrentUser.mockResolvedValue(mockOwner);
      mockPermissionService.require.mockResolvedValue(undefined);

      const mockAdmins = [createMockAdmin('list-1', 'co-manager-1', 'deleted-user-1')];

      mockDb.listAdmin.findMany.mockResolvedValue(mockAdmins as any);
      mockDb.user.findMany.mockResolvedValue([]); // No addedBy users found

      const request = new NextRequest('http://localhost:3000/api/lists/list-1/admins');
      const response = await GET(request, { params: { listId: 'list-1' } });

      expect(response.status).toBe(200);

      const data = await response.json();
      expect(data.admins[0].addedBy).toEqual({
        id: 'deleted-user-1',
        name: null,
      });
    });
  });

  describe('Authentication failures', () => {
    it('rejects unauthenticated requests', async () => {
      mockGetCurrentUser.mockResolvedValue(null);

      const request = new NextRequest('http://localhost:3000/api/lists/list-1/admins');
      const response = await GET(request, { params: { listId: 'list-1' } });

      expect(response.status).toBe(401);

      const data = await response.json();
      expect(data.error).toBe('Please sign in to continue');
      expect(data.code).toBe('UNAUTHORIZED');

      // Should not call permission service
      expect(mockPermissionService.require).not.toHaveBeenCalled();
    });
  });

  describe('Authorization failures', () => {
    it('rejects users without list view permissions', async () => {
      mockGetCurrentUser.mockResolvedValue(mockUnauthorizedUser);
      mockPermissionService.require.mockRejectedValue(
        new ForbiddenError('You do not have permission to view this list')
      );

      const request = new NextRequest('http://localhost:3000/api/lists/list-1/admins');
      const response = await GET(request, { params: { listId: 'list-1' } });

      expect(response.status).toBe(403);

      const data = await response.json();
      expect(data.error).toBe("You don't have permission to do that");
      expect(data.code).toBe('FORBIDDEN');
    });
  });

  describe('Edge cases', () => {
    it('handles list not found through permission service', async () => {
      mockGetCurrentUser.mockResolvedValue(mockOwner);
      mockPermissionService.require.mockRejectedValue(new NotFoundError('List not found'));

      const request = new NextRequest('http://localhost:3000/api/lists/list-1/admins');
      const response = await GET(request, { params: { listId: 'list-1' } });

      expect(response.status).toBe(404);

      const data = await response.json();
      expect(data.error).toBe("We couldn't find what you're looking for");
      expect(data.code).toBe('NOT_FOUND');
    });

    it('handles database errors gracefully', async () => {
      mockGetCurrentUser.mockResolvedValue(mockOwner);
      mockPermissionService.require.mockResolvedValue(undefined);
      mockDb.listAdmin.findMany.mockRejectedValue(new Error('Database connection failed'));

      const request = new NextRequest('http://localhost:3000/api/lists/list-1/admins');
      const response = await GET(request, { params: { listId: 'list-1' } });

      expect(response.status).toBe(500);

      const data = await response.json();
      expect(data.error).toBe('Something went wrong. Please try again');
      expect(data.code).toBe('INTERNAL_ERROR');
    });
  });
});

describe('POST /api/lists/[listId]/admins', () => {
  const mockOwner = createMockUser('owner-1');
  const mockTargetUser = createMockUser('target-user-1');
  const mockCoManager = createMockUser('co-manager-1');

  beforeEach(() => {
    jest.clearAllMocks();
    // Reset mock database state
    (global as any).mockDb?._resetMockData?.();
  });

  describe('Successful operations', () => {
    it('allows list owners to add co-managers by email', async () => {
      mockGetCurrentUser.mockResolvedValue(mockOwner);

      // Mock ListInvitationService to return directlyAdded
      mockListInvitationService.prototype.createInvitation.mockResolvedValue({
        directlyAdded: true,
      });

      const request = new NextRequest('http://localhost:3000/api/lists/list-1/admins', {
        method: 'POST',
      });
      request.json = jest.fn().mockResolvedValue({
        email: 'target@example.com',
      });

      const response = await POST(request, { params: { listId: 'list-1' } });

      expect(response.status).toBe(201);

      const data = await response.json();
      expect(data).toMatchObject({
        success: true,
        message: 'Co-manager added successfully',
        directlyAdded: true,
      });

      // Verify service was called (permission check is internal to service)
      expect(mockListInvitationService.prototype.createInvitation).toHaveBeenCalledWith(
        'list-1',
        'target@example.com',
        mockOwner.id
      );
    });
  });

  describe('Authentication failures', () => {
    it('rejects unauthenticated requests', async () => {
      mockGetCurrentUser.mockResolvedValue(null);

      const request = new NextRequest('http://localhost:3000/api/lists/list-1/admins', {
        method: 'POST',
      });
      request.json = jest.fn().mockResolvedValue({
        email: 'target@example.com',
      });

      const response = await POST(request, { params: { listId: 'list-1' } });

      expect(response.status).toBe(401);

      const data = await response.json();
      expect(data.error).toBe('Please sign in to continue');
      expect(data.code).toBe('UNAUTHORIZED');
    });
  });

  describe('Authorization failures', () => {
    it('rejects non-owners trying to add co-managers', async () => {
      mockGetCurrentUser.mockResolvedValue(mockCoManager);

      // Mock service to throw ForbiddenError (service handles permission check internally)
      mockListInvitationService.prototype.createInvitation.mockRejectedValue(
        new ForbiddenError('Only list owners can add co-managers')
      );

      const request = new NextRequest('http://localhost:3000/api/lists/list-1/admins', {
        method: 'POST',
      });
      request.json = jest.fn().mockResolvedValue({
        email: 'target@example.com',
      });

      const response = await POST(request, { params: { listId: 'list-1' } });

      expect(response.status).toBe(403);

      const data = await response.json();
      expect(data.error).toBe("You don't have permission to do that");
      expect(data.code).toBe('FORBIDDEN');
    });
  });

  describe('Validation errors', () => {
    it('rejects invalid email format', async () => {
      mockGetCurrentUser.mockResolvedValue(mockOwner);
      mockPermissionService.require.mockResolvedValue(undefined);

      const request = new NextRequest('http://localhost:3000/api/lists/list-1/admins', {
        method: 'POST',
      });
      request.json = jest.fn().mockResolvedValue({
        email: 'invalid-email',
      });

      const response = await POST(request, { params: { listId: 'list-1' } });

      expect(response.status).toBe(400);

      const data = await response.json();
      expect(data.error).toBe('Please check your information and try again');
      expect(data.code).toBe('VALIDATION_ERROR');
    });

    it('rejects missing email field', async () => {
      mockGetCurrentUser.mockResolvedValue(mockOwner);
      mockPermissionService.require.mockResolvedValue(undefined);

      const request = new NextRequest('http://localhost:3000/api/lists/list-1/admins', {
        method: 'POST',
      });
      request.json = jest.fn().mockResolvedValue({});

      const response = await POST(request, { params: { listId: 'list-1' } });

      expect(response.status).toBe(400);

      const data = await response.json();
      expect(data.code).toBe('VALIDATION_ERROR');
    });

    it('prevents adding self as co-manager', async () => {
      mockGetCurrentUser.mockResolvedValue(mockOwner);

      // Route handles this check before calling service
      const request = new NextRequest('http://localhost:3000/api/lists/list-1/admins', {
        method: 'POST',
      });
      request.json = jest.fn().mockResolvedValue({
        email: mockOwner.email,
      });

      const response = await POST(request, { params: { listId: 'list-1' } });

      expect(response.status).toBe(400);

      const data = await response.json();
      expect(data.error).toBe("This action isn't allowed");
      expect(data.code).toBe('INVALID_OPERATION');
    });

    it('prevents adding existing co-manager', async () => {
      mockGetCurrentUser.mockResolvedValue(mockOwner);

      // Mock service to throw ValidationError for existing co-manager
      mockListInvitationService.prototype.createInvitation.mockRejectedValue(
        new ValidationError('User is already a co-manager of this list')
      );

      const request = new NextRequest('http://localhost:3000/api/lists/list-1/admins', {
        method: 'POST',
      });
      request.json = jest.fn().mockResolvedValue({
        email: 'target@example.com',
      });

      const response = await POST(request, { params: { listId: 'list-1' } });

      expect(response.status).toBe(400);

      const data = await response.json();
      expect(data.error).toBe('Please check your information and try again');
      expect(data.code).toBe('VALIDATION_ERROR');
    });

    it('sends invitation for non-existent user', async () => {
      mockGetCurrentUser.mockResolvedValue(mockOwner);

      // Mock service to return invitation sent (directlyAdded: false)
      mockListInvitationService.prototype.createInvitation.mockResolvedValue({
        directlyAdded: false,
      });

      const request = new NextRequest('http://localhost:3000/api/lists/list-1/admins', {
        method: 'POST',
      });
      request.json = jest.fn().mockResolvedValue({
        email: 'nonexistent@example.com',
      });

      const response = await POST(request, { params: { listId: 'list-1' } });

      expect(response.status).toBe(201);

      const data = await response.json();
      expect(data).toMatchObject({
        success: true,
        message: 'Invitation sent successfully',
        directlyAdded: false,
      });
    });
  });

  describe('Edge cases', () => {
    it('handles list not found', async () => {
      mockGetCurrentUser.mockResolvedValue(mockOwner);

      // Mock service to throw NotFoundError for list not found
      mockListInvitationService.prototype.createInvitation.mockRejectedValue(
        new NotFoundError('List not found')
      );

      const request = new NextRequest('http://localhost:3000/api/lists/list-1/admins', {
        method: 'POST',
      });
      request.json = jest.fn().mockResolvedValue({
        email: 'target@example.com',
      });

      const response = await POST(request, { params: { listId: 'list-1' } });

      expect(response.status).toBe(404);

      const data = await response.json();
      expect(data.error).toBe("We couldn't find what you're looking for");
      expect(data.code).toBe('NOT_FOUND');
    });

    it('handles database errors during transaction', async () => {
      mockGetCurrentUser.mockResolvedValue(mockOwner);

      // Mock service to throw generic error
      mockListInvitationService.prototype.createInvitation.mockRejectedValue(
        new Error('Database connection failed')
      );

      const request = new NextRequest('http://localhost:3000/api/lists/list-1/admins', {
        method: 'POST',
      });
      request.json = jest.fn().mockResolvedValue({
        email: 'target@example.com',
      });

      const response = await POST(request, { params: { listId: 'list-1' } });

      expect(response.status).toBe(500);

      const data = await response.json();
      expect(data.error).toBe('Something went wrong. Please try again');
      expect(data.code).toBe('INTERNAL_ERROR');
    });

    it('handles malformed JSON in request body', async () => {
      mockGetCurrentUser.mockResolvedValue(mockOwner);
      mockPermissionService.require.mockResolvedValue(undefined);

      const request = new NextRequest('http://localhost:3000/api/lists/list-1/admins', {
        method: 'POST',
      });
      request.json = jest.fn().mockRejectedValue(new Error('Invalid JSON'));

      const response = await POST(request, { params: { listId: 'list-1' } });

      expect(response.status).toBe(500);

      const data = await response.json();
      expect(data.error).toBe('Something went wrong. Please try again');
      expect(data.code).toBe('INTERNAL_ERROR');
    });
  });
});
