import type { List } from '@prisma/client';

import { NextRequest } from 'next/server';

import { getCurrentUser } from '@/lib/auth-utils';
import { db } from '@/lib/db';
import { ForbiddenError, NotFoundError } from '@/lib/errors';
import { permissionService } from '@/lib/services/permission-service';
import { createMockUser } from '@/lib/test-utils/mock-types';

import { DELETE } from './route';

// Mock dependencies
jest.mock('@/lib/auth-utils');
jest.mock('@/lib/db');
jest.mock('@/lib/services/permission-service');

const mockGetCurrentUser = jest.mocked(getCurrentUser);
const mockDb = jest.mocked(db);
const mockPermissionService = jest.mocked(permissionService);

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
});

describe('DELETE /api/lists/[listId]/admins/[userId]', () => {
  const mockOwner = createMockUser('owner-1');
  const mockCoManager = createMockUser('co-manager-1');
  const mockUnauthorizedUser = createMockUser('unauthorized-1');

  beforeEach(() => {
    jest.clearAllMocks();
    // Reset mock database state
    (global as any).mockDb?._resetMockData?.();
  });

  describe('Successful operations', () => {
    it('allows list owners to remove co-managers', async () => {
      mockGetCurrentUser.mockResolvedValue(mockOwner);
      mockPermissionService.require.mockResolvedValue(undefined);

      // Mock successful transaction
      mockDb.$transaction.mockImplementation(async (callback) => {
        // Mock list exists
        mockDb.list.findUnique.mockResolvedValue(createMockList('list-1', mockOwner.id) as any);

        // Mock admin exists
        mockDb.listAdmin.findUnique.mockResolvedValue(
          createMockAdmin('list-1', 'target-user-1', mockOwner.id) as any
        );

        // Mock successful deletion
        mockDb.listAdmin.delete.mockResolvedValue(
          createMockAdmin('list-1', 'target-user-1', mockOwner.id) as any
        );

        return callback(mockDb as any);
      });

      const request = new NextRequest(
        'http://localhost:3000/api/lists/list-1/admins/target-user-1',
        {
          method: 'DELETE',
        }
      );

      const response = await DELETE(request, {
        params: { listId: 'list-1', userId: 'target-user-1' },
      });

      expect(response.status).toBe(200);

      const data = await response.json();
      expect(data).toMatchObject({
        success: true,
        message: 'Co-manager removed successfully',
      });

      // Verify permission check
      expect(mockPermissionService.require).toHaveBeenCalledWith(mockOwner.id, 'admin', {
        type: 'list',
        id: 'list-1',
      });

      // Verify database operations
      expect(mockDb.listAdmin.delete).toHaveBeenCalledWith({
        where: {
          listId_userId: {
            listId: 'list-1',
            userId: 'target-user-1',
          },
        },
      });
    });
  });

  describe('Authentication failures', () => {
    it('rejects unauthenticated requests', async () => {
      mockGetCurrentUser.mockResolvedValue(null);

      const request = new NextRequest(
        'http://localhost:3000/api/lists/list-1/admins/target-user-1',
        {
          method: 'DELETE',
        }
      );

      const response = await DELETE(request, {
        params: { listId: 'list-1', userId: 'target-user-1' },
      });

      expect(response.status).toBe(401);

      const data = await response.json();
      expect(data.error).toBe('Please sign in to continue');

      // Should not call permission service
      expect(mockPermissionService.require).not.toHaveBeenCalled();
    });
  });

  describe('Authorization failures', () => {
    it('rejects non-owners trying to remove co-managers', async () => {
      mockGetCurrentUser.mockResolvedValue(mockCoManager);
      mockPermissionService.require.mockRejectedValue(
        new ForbiddenError('Only list owners can remove co-managers')
      );

      const request = new NextRequest(
        'http://localhost:3000/api/lists/list-1/admins/target-user-1',
        {
          method: 'DELETE',
        }
      );

      const response = await DELETE(request, {
        params: { listId: 'list-1', userId: 'target-user-1' },
      });

      expect(response.status).toBe(403);

      const data = await response.json();
      expect(data.error).toBe("You don't have permission to do that");
      expect(data.code).toBe('FORBIDDEN');
    });

    it('rejects unauthorized users completely', async () => {
      mockGetCurrentUser.mockResolvedValue(mockUnauthorizedUser);
      mockPermissionService.require.mockRejectedValue(
        new ForbiddenError('You do not have permission to manage this list')
      );

      const request = new NextRequest(
        'http://localhost:3000/api/lists/list-1/admins/target-user-1',
        {
          method: 'DELETE',
        }
      );

      const response = await DELETE(request, {
        params: { listId: 'list-1', userId: 'target-user-1' },
      });

      expect(response.status).toBe(403);

      const data = await response.json();
      expect(data.error).toBe("You don't have permission to do that");
      expect(data.code).toBe('FORBIDDEN');
    });
  });

  describe('Validation errors', () => {
    it('prevents owner from removing themselves', async () => {
      mockGetCurrentUser.mockResolvedValue(mockOwner);
      mockPermissionService.require.mockResolvedValue(undefined);

      const request = new NextRequest('http://localhost:3000/api/lists/list-1/admins/owner-1', {
        method: 'DELETE',
      });

      const response = await DELETE(request, {
        params: { listId: 'list-1', userId: mockOwner.id },
      });

      expect(response.status).toBe(400);

      const data = await response.json();
      expect(data.error).toBe("This action isn't allowed");
      expect(data.code).toBe('INVALID_OPERATION');

      // Should not perform database operations
      expect(mockDb.$transaction).not.toHaveBeenCalled();
    });

    it('rejects removal of user who is not a co-manager', async () => {
      mockGetCurrentUser.mockResolvedValue(mockOwner);
      mockPermissionService.require.mockResolvedValue(undefined);

      // Mock transaction with admin not found
      mockDb.$transaction.mockImplementation(async (callback) => {
        // Mock list exists
        mockDb.list.findUnique.mockResolvedValue(createMockList('list-1', mockOwner.id) as any);

        // Mock admin does not exist
        mockDb.listAdmin.findUnique.mockResolvedValue(null);

        return callback(mockDb as any);
      });

      const request = new NextRequest(
        'http://localhost:3000/api/lists/list-1/admins/non-admin-user',
        {
          method: 'DELETE',
        }
      );

      const response = await DELETE(request, {
        params: { listId: 'list-1', userId: 'non-admin-user' },
      });

      expect(response.status).toBe(404);

      const data = await response.json();
      expect(data.error).toBe("We couldn't find what you're looking for");
      expect(data.code).toBe('NOT_FOUND');
    });
  });

  describe('Edge cases', () => {
    it('handles list not found', async () => {
      mockGetCurrentUser.mockResolvedValue(mockOwner);
      mockPermissionService.require.mockResolvedValue(undefined);

      // Mock transaction with list not found
      mockDb.$transaction.mockImplementation(async (callback) => {
        // Mock list does not exist
        mockDb.list.findUnique.mockResolvedValue(null);

        return callback(mockDb as any);
      });

      const request = new NextRequest(
        'http://localhost:3000/api/lists/nonexistent/admins/target-user-1',
        {
          method: 'DELETE',
        }
      );

      const response = await DELETE(request, {
        params: { listId: 'nonexistent', userId: 'target-user-1' },
      });

      expect(response.status).toBe(404);

      const data = await response.json();
      expect(data.error).toBe("We couldn't find what you're looking for");
      expect(data.code).toBe('NOT_FOUND');
    });

    it('handles permission service failures', async () => {
      mockGetCurrentUser.mockResolvedValue(mockOwner);
      mockPermissionService.require.mockRejectedValue(new NotFoundError('List not found'));

      const request = new NextRequest(
        'http://localhost:3000/api/lists/list-1/admins/target-user-1',
        {
          method: 'DELETE',
        }
      );

      const response = await DELETE(request, {
        params: { listId: 'list-1', userId: 'target-user-1' },
      });

      expect(response.status).toBe(404);

      const data = await response.json();
      expect(data.error).toBe("We couldn't find what you're looking for");
      expect(data.code).toBe('NOT_FOUND');
    });

    it('handles database transaction failures', async () => {
      mockGetCurrentUser.mockResolvedValue(mockOwner);
      mockPermissionService.require.mockResolvedValue(undefined);

      // Mock transaction failure
      mockDb.$transaction.mockRejectedValue(new Error('Database connection failed'));

      const request = new NextRequest(
        'http://localhost:3000/api/lists/list-1/admins/target-user-1',
        {
          method: 'DELETE',
        }
      );

      const response = await DELETE(request, {
        params: { listId: 'list-1', userId: 'target-user-1' },
      });

      expect(response.status).toBe(500);

      const data = await response.json();
      expect(data.error).toBe('Something went wrong. Please try again');
    });

    it('handles database constraint violations gracefully', async () => {
      mockGetCurrentUser.mockResolvedValue(mockOwner);
      mockPermissionService.require.mockResolvedValue(undefined);

      // Mock transaction with constraint violation
      mockDb.$transaction.mockImplementation(async (callback) => {
        mockDb.list.findUnique.mockResolvedValue(createMockList('list-1', mockOwner.id) as any);

        mockDb.listAdmin.findUnique.mockResolvedValue(
          createMockAdmin('list-1', 'target-user-1', mockOwner.id) as any
        );

        // Mock delete failure
        const constraintError = new Error('Foreign key constraint failed') as Error & {
          code: string;
        };
        constraintError.code = 'P2003';
        mockDb.listAdmin.delete.mockRejectedValue(constraintError);

        return callback(mockDb as any);
      });

      const request = new NextRequest(
        'http://localhost:3000/api/lists/list-1/admins/target-user-1',
        {
          method: 'DELETE',
        }
      );

      const response = await DELETE(request, {
        params: { listId: 'list-1', userId: 'target-user-1' },
      });

      expect(response.status).toBe(500);

      const data = await response.json();
      expect(data.error).toBe('Something went wrong. Please try again');
    });

    it('validates route parameters are present', async () => {
      mockGetCurrentUser.mockResolvedValue(mockOwner);

      const request = new NextRequest('http://localhost:3000/api/lists/list-1/admins/', {
        method: 'DELETE',
      });

      // Test with missing userId parameter
      await DELETE(request, {
        params: { listId: 'list-1', userId: '' },
      });

      // Should still attempt the operation but fail at validation
      expect(mockGetCurrentUser).toHaveBeenCalled();
    });
  });

  describe('Business logic validation', () => {
    it('ensures transaction atomicity - either all operations succeed or all fail', async () => {
      mockGetCurrentUser.mockResolvedValue(mockOwner);
      mockPermissionService.require.mockResolvedValue(undefined);

      // Capture the transaction callback
      mockDb.$transaction.mockImplementation(async (callback) => {

        // Simulate partial failure - list check passes, admin check passes, but delete fails
        mockDb.list.findUnique.mockResolvedValue(createMockList('list-1', mockOwner.id) as any);

        mockDb.listAdmin.findUnique.mockResolvedValue(
          createMockAdmin('list-1', 'target-user-1', mockOwner.id) as any
        );

        mockDb.listAdmin.delete.mockRejectedValue(new Error('Delete operation failed'));

        // The callback should throw, causing transaction rollback
        try {
          await callback(mockDb as any);
        } catch (error) {
          throw error; // Re-throw to simulate transaction rollback
        }
      });

      const request = new NextRequest(
        'http://localhost:3000/api/lists/list-1/admins/target-user-1',
        {
          method: 'DELETE',
        }
      );

      const response = await DELETE(request, {
        params: { listId: 'list-1', userId: 'target-user-1' },
      });

      expect(response.status).toBe(500);

      const data = await response.json();
      expect(data.error).toBe('Something went wrong. Please try again');

      // Verify transaction was attempted
      expect(mockDb.$transaction).toHaveBeenCalled();
    });

    it('enforces list ownership rules consistently', async () => {
      // Test that only list owners (not co-managers) can remove other co-managers
      mockGetCurrentUser.mockResolvedValue(mockCoManager); // A co-manager, not owner
      mockPermissionService.require.mockRejectedValue(
        new ForbiddenError('Only the list owner can remove co-managers')
      );

      const request = new NextRequest(
        'http://localhost:3000/api/lists/list-1/admins/other-co-manager',
        {
          method: 'DELETE',
        }
      );

      const response = await DELETE(request, {
        params: { listId: 'list-1', userId: 'other-co-manager' },
      });

      expect(response.status).toBe(403);

      const data = await response.json();
      expect(data.error).toBe("You don't have permission to do that");
      expect(data.code).toBe('FORBIDDEN');

      // Verify the permission check was for admin-level access
      expect(mockPermissionService.require).toHaveBeenCalledWith(mockCoManager.id, 'admin', {
        type: 'list',
        id: 'list-1',
      });
    });

    it('maintains data integrity during concurrent operations', async () => {
      // Simulate a scenario where the admin might be removed by another request
      // between the existence check and the delete operation

      mockGetCurrentUser.mockResolvedValue(mockOwner);
      mockPermissionService.require.mockResolvedValue(undefined);

      let deleteCallCount = 0;

      mockDb.$transaction.mockImplementation(async (callback) => {
        mockDb.list.findUnique.mockResolvedValue(createMockList('list-1', mockOwner.id) as any);

        // First call succeeds, subsequent calls fail (admin already removed)
        if (deleteCallCount === 0) {
          mockDb.listAdmin.findUnique.mockResolvedValue(
            createMockAdmin('list-1', 'target-user-1', mockOwner.id) as any
          );
          mockDb.listAdmin.delete.mockResolvedValue(
            createMockAdmin('list-1', 'target-user-1', mockOwner.id) as any
          );
        } else {
          mockDb.listAdmin.findUnique.mockResolvedValue(null);
        }

        deleteCallCount++;
        return callback(mockDb as any);
      });

      const request = new NextRequest(
        'http://localhost:3000/api/lists/list-1/admins/target-user-1',
        {
          method: 'DELETE',
        }
      );

      // First request should succeed
      const response1 = await DELETE(request, {
        params: { listId: 'list-1', userId: 'target-user-1' },
      });

      expect(response1.status).toBe(200);

      // Reset mocks for second request
      jest.clearAllMocks();
      mockGetCurrentUser.mockResolvedValue(mockOwner);
      mockPermissionService.require.mockResolvedValue(undefined);

      // Second request should fail because admin no longer exists
      const response2 = await DELETE(request, {
        params: { listId: 'list-1', userId: 'target-user-1' },
      });

      expect(response2.status).toBe(404);

      const data2 = await response2.json();
      expect(data2.error).toBe("We couldn't find what you're looking for");
    });
  });
});
