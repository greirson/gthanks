import { beforeEach, describe, expect, it, jest } from '@jest/globals';

// Import db first to get the mocked version from jest.setup.js
import { db } from '@/lib/db';
import { ForbiddenError, NotFoundError } from '@/lib/errors';

// Mock the list service dependency
jest.mock('@/lib/services/list-service', () => ({
  listService: {
    verifyPassword: jest.fn(),
  },
}));

// Use requireActual to get the real permission service implementation
// This bypasses the global mock in jest.setup.js which is needed for other tests
const { permissionService } = jest.requireActual(
  '@/lib/services/permission-service'
) as typeof import('../permission-service');

// Add missing mock methods
if (!db.userGroup.findFirst) {
  (db.userGroup as any).findFirst = jest.fn();
}

// Ensure listWish.findFirst exists (it's added in jest.setup.js but may not include findFirst)
if (!db.listWish) {
  (db as any).listWish = {
    findFirst: jest.fn(),
  };
} else if (!db.listWish.findFirst) {
  (db.listWish as any).findFirst = jest.fn();
}

// Create typed references to the mocked functions
const mockListFindUnique = db.list.findUnique as jest.MockedFunction<typeof db.list.findUnique>;
const mockUserGroupFindFirst = db.userGroup.findFirst as jest.MockedFunction<
  typeof db.userGroup.findFirst
>;
const mockListWishFindFirst = db.listWish.findFirst as jest.MockedFunction<
  typeof db.listWish.findFirst
>;
const mockWishFindUnique = db.wish.findUnique as jest.MockedFunction<typeof db.wish.findUnique>;
const mockUserFindUnique = db.user.findUnique as jest.MockedFunction<typeof db.user.findUnique>;
const mockReservationFindUnique = db.reservation.findUnique as jest.MockedFunction<
  typeof db.reservation.findUnique
>;

describe('PermissionService Co-Manager Tests', () => {
  const ownerUserId = 'owner-123';
  const coManagerUserId = 'co-manager-456';
  const regularUserId = 'regular-789';
  const otherUserId = 'other-999';
  const listId = 'list-123';
  const wishId = 'wish-456';

  // Helper function to mock non-admin user
  const mockNonAdminUser = (userId: string) => {
    mockUserFindUnique.mockResolvedValueOnce({
      id: userId,
      isAdmin: false,
      role: 'user',
      suspendedAt: null,
    } as any);
  };

  beforeEach(() => {
    jest.clearAllMocks();
    jest.resetAllMocks();

    // Default: mock users as non-admin by default
    // Tests can override this with mockUserFindUnique.mockResolvedValueOnce()
    mockUserFindUnique.mockResolvedValue({
      id: 'default-user',
      isAdmin: false,
      role: 'user',
      suspendedAt: null,
    } as any);
  });

  describe('Co-Manager Permission Tests', () => {
    it('should allow co-manager to view list', async () => {
      mockListFindUnique.mockResolvedValueOnce({
        ownerId: ownerUserId,
        visibility: 'private',
        password: null,
        admins: [{ userId: coManagerUserId }],
      } as any);

      const result = await permissionService.can(coManagerUserId, 'view', {
        type: 'list',
        id: listId,
      });

      expect(result.allowed).toBe(true);
      expect(result.reason).toBeUndefined();
    });

    it('should allow co-manager to edit list', async () => {
      mockListFindUnique.mockResolvedValueOnce({
        ownerId: ownerUserId,
        visibility: 'private',
        password: null,
        admins: [{ userId: coManagerUserId }],
      } as any);

      const result = await permissionService.can(coManagerUserId, 'edit', {
        type: 'list',
        id: listId,
      });

      expect(result.allowed).toBe(true);
      expect(result.reason).toBeUndefined();
    });

    it('should allow co-manager to share list', async () => {
      mockListFindUnique.mockResolvedValueOnce({
        ownerId: ownerUserId,
        visibility: 'private',
        password: null,
        admins: [{ userId: coManagerUserId }],
      } as any);

      const result = await permissionService.can(coManagerUserId, 'share', {
        type: 'list',
        id: listId,
      });

      expect(result.allowed).toBe(true);
      expect(result.reason).toBeUndefined();
    });

    it('should deny co-manager from deleting list', async () => {
      mockListFindUnique.mockResolvedValueOnce({
        ownerId: ownerUserId,
        visibility: 'private',
        password: null,
        admins: [{ userId: coManagerUserId }],
      } as any);

      const result = await permissionService.can(coManagerUserId, 'delete', {
        type: 'list',
        id: listId,
      });

      // FIXED: The real permission service correctly denies delete for co-managers
      expect(result.allowed).toBe(false);
      expect(result.reason).toBe('Only list owners can delete lists');
    });

    it('should deny co-manager from administrating list', async () => {
      mockListFindUnique.mockResolvedValueOnce({
        ownerId: ownerUserId,
        visibility: 'private',
        password: null,
        admins: [{ userId: coManagerUserId }],
      } as any);

      const result = await permissionService.can(coManagerUserId, 'admin', {
        type: 'list',
        id: listId,
      });

      // FIXED: The real permission service correctly denies admin for co-managers
      expect(result.allowed).toBe(false);
      expect(result.reason).toBe('Only list owners can add/remove co-managers');
    });

    it('should deny co-manager from unknown actions', async () => {
      mockListFindUnique.mockResolvedValueOnce({
        ownerId: ownerUserId,
        visibility: 'private',
        password: null,
        admins: [{ userId: coManagerUserId }],
      } as any);

      const result = await permissionService.can(coManagerUserId, 'invite', {
        type: 'list',
        id: listId,
      });

      // FIXED: The real permission service correctly denies unknown actions for co-managers
      expect(result.allowed).toBe(false);
      expect(result.reason).toBe('Action not allowed for co-managers');
    });
  });

  describe('Edge Cases', () => {
    it('should handle user who is both owner and co-manager (owner permissions should win)', async () => {
      // Mock list where owner is also in admins list (edge case)
      mockListFindUnique.mockResolvedValueOnce({
        ownerId: ownerUserId,
        visibility: 'private',
        password: null,
        admins: [{ userId: ownerUserId }], // Owner is also in admins
      } as any);

      // Owner should still be able to delete (owner permissions win)
      const result = await permissionService.can(ownerUserId, 'delete', {
        type: 'list',
        id: listId,
      });

      expect(result.allowed).toBe(true);
      expect(result.reason).toBeUndefined();
    });

    it('should handle user who was co-manager but was removed', async () => {
      // Mock list where user is no longer in admins
      mockListFindUnique.mockResolvedValueOnce({
        ownerId: ownerUserId,
        visibility: 'private',
        password: null,
        admins: [], // No admins, user was removed
      } as any);

      mockUserGroupFindFirst.mockResolvedValueOnce(null); // Not a group member either

      const result = await permissionService.can(coManagerUserId, 'view', {
        type: 'list',
        id: listId,
      });

      expect(result.allowed).toBe(false);
      // Private lists return "List not found" to prevent enumeration
      expect(result.reason).toBe('List not found');
    });

    it('should handle list with no owner (edge case)', async () => {
      mockListFindUnique.mockResolvedValueOnce({
        ownerId: null, // Edge case: orphaned list
        visibility: 'private',
        password: null,
        admins: [{ userId: coManagerUserId }],
      } as any);

      // Co-manager should still have permissions even with no owner
      const result = await permissionService.can(coManagerUserId, 'view', {
        type: 'list',
        id: listId,
      });

      expect(result.allowed).toBe(true);
      expect(result.reason).toBeUndefined();
    });

    it('should handle user who is co-manager of one list but not another', async () => {
      const otherListId = 'other-list-123';

      // First call - user is co-manager of original list
      mockListFindUnique.mockResolvedValueOnce({
        ownerId: ownerUserId,
        visibility: 'private',
        password: null,
        admins: [{ userId: coManagerUserId }],
      } as any);

      const result1 = await permissionService.can(coManagerUserId, 'edit', {
        type: 'list',
        id: listId,
      });
      expect(result1.allowed).toBe(true);

      // Second call - user is NOT co-manager of other list
      mockListFindUnique.mockResolvedValueOnce({
        ownerId: ownerUserId,
        visibility: 'private',
        password: null,
        admins: [], // Not a co-manager of this list
      } as any);

      mockUserGroupFindFirst.mockResolvedValueOnce(null); // Not a group member

      const result2 = await permissionService.can(coManagerUserId, 'edit', {
        type: 'list',
        id: otherListId,
      });
      expect(result2.allowed).toBe(false);
      // Private lists return "List not found" to prevent enumeration
      expect(result2.reason).toBe('List not found');
    });

    it('should handle multiple co-managers on same list', async () => {
      const coManager2UserId = 'co-manager-2';
      const coManager3UserId = 'co-manager-3';

      mockListFindUnique.mockResolvedValueOnce({
        ownerId: ownerUserId,
        visibility: 'private',
        password: null,
        admins: [
          { userId: coManagerUserId },
          { userId: coManager2UserId },
          { userId: coManager3UserId },
        ],
      } as any);

      // First co-manager should have permissions
      const result1 = await permissionService.can(coManagerUserId, 'edit', {
        type: 'list',
        id: listId,
      });
      expect(result1.allowed).toBe(true);

      // Reset mock for second call
      jest.clearAllMocks();
      mockListFindUnique.mockResolvedValueOnce({
        ownerId: ownerUserId,
        visibility: 'private',
        password: null,
        admins: [
          { userId: coManagerUserId },
          { userId: coManager2UserId },
          { userId: coManager3UserId },
        ],
      } as any);

      // Second co-manager should also have permissions
      const result2 = await permissionService.can(coManager2UserId, 'edit', {
        type: 'list',
        id: listId,
      });
      expect(result2.allowed).toBe(true);
    });

    it('should handle co-manager permissions after owner deletion (orphaned list)', async () => {
      // Simulate orphaned list where original owner no longer exists
      mockListFindUnique.mockResolvedValueOnce({
        ownerId: 'deleted-owner-id',
        visibility: 'private',
        password: null,
        admins: [{ userId: coManagerUserId }],
      } as any);

      // Co-manager should still have their limited permissions
      const result = await permissionService.can(coManagerUserId, 'edit', {
        type: 'list',
        id: listId,
      });

      expect(result.allowed).toBe(true);
      expect(result.reason).toBeUndefined();
    });

    it('should prevent circular reference (owner as co-manager) from breaking delete permissions', async () => {
      // Owner should not lose delete permissions even if listed as admin
      mockListFindUnique.mockResolvedValueOnce({
        ownerId: ownerUserId,
        visibility: 'private',
        password: null,
        admins: [{ userId: ownerUserId }], // Owner is also listed as admin
      } as any);

      const result = await permissionService.can(ownerUserId, 'delete', {
        type: 'list',
        id: listId,
      });

      expect(result.allowed).toBe(true);
      expect(result.reason).toBeUndefined();
    });

    it('should handle list that does not exist', async () => {
      mockListFindUnique.mockResolvedValueOnce(null);

      const result = await permissionService.can(coManagerUserId, 'view', {
        type: 'list',
        id: 'nonexistent-list',
      });

      expect(result.allowed).toBe(false);
      expect(result.reason).toBe('List not found');
    });
  });

  describe('Permission Inheritance Tests', () => {
    it('should allow co-manager to view wishes on their lists', async () => {
      mockWishFindUnique.mockResolvedValueOnce({
        ownerId: otherUserId, // Wish owned by someone else
      } as any);

      // Mock that the wish is in a list where user is co-manager
      mockListWishFindFirst.mockResolvedValueOnce({
        listId,
        wishId,
      } as any);

      mockListFindUnique.mockResolvedValueOnce({
        ownerId: ownerUserId,
        visibility: 'private',
        password: null,
        admins: [{ userId: coManagerUserId }], // User is co-manager
      } as any);

      const result = await permissionService.can(coManagerUserId, 'view', {
        type: 'wish',
        id: wishId,
      });

      expect(result.allowed).toBe(true);
      expect(result.reason).toBeUndefined();
    });

    it('should deny co-manager from editing wishes they do not own', async () => {
      mockWishFindUnique.mockResolvedValueOnce({
        ownerId: otherUserId, // Wish owned by someone else
      } as any);

      const result = await permissionService.can(coManagerUserId, 'edit', {
        type: 'wish',
        id: wishId,
      });

      expect(result.allowed).toBe(false);
      // Wish permissions return "Insufficient permissions" when user doesn't own it
      expect(result.reason).toBe('Insufficient permissions');
    });

    it('should deny co-manager from deleting wishes they do not own', async () => {
      mockWishFindUnique.mockResolvedValueOnce({
        ownerId: otherUserId, // Wish owned by someone else
      } as any);

      const result = await permissionService.can(coManagerUserId, 'delete', {
        type: 'wish',
        id: wishId,
      });

      expect(result.allowed).toBe(false);
      // Wish permissions return "Insufficient permissions" when user doesn't own it
      expect(result.reason).toBe('Insufficient permissions');
    });

    it('should allow co-manager to add wishes to the list (through list management)', async () => {
      mockListFindUnique.mockResolvedValueOnce({
        ownerId: ownerUserId,
        visibility: 'private',
        password: null,
        admins: [{ userId: coManagerUserId }],
      } as any);

      // Co-manager can edit the list, which includes adding wishes
      const result = await permissionService.can(coManagerUserId, 'edit', {
        type: 'list',
        id: listId,
      });

      expect(result.allowed).toBe(true);
      expect(result.reason).toBeUndefined();
    });

    it('should handle wish access through multiple list memberships', async () => {
      mockWishFindUnique.mockResolvedValueOnce({
        ownerId: otherUserId, // Wish owned by someone else
      } as any);

      // Mock finding wish in a list where user has access (as co-manager)
      mockListWishFindFirst.mockResolvedValueOnce({
        listId,
        wishId,
      } as any);

      mockListFindUnique.mockResolvedValueOnce({
        ownerId: ownerUserId,
        visibility: 'private',
        password: null,
        admins: [{ userId: coManagerUserId }], // User is co-manager
      } as any);

      const result = await permissionService.can(coManagerUserId, 'view', {
        type: 'wish',
        id: wishId,
      });

      expect(result.allowed).toBe(true);
      expect(result.reason).toBeUndefined();
    });
  });

  describe('Performance Tests', () => {
    it('should handle permission checks with many co-managers efficiently', async () => {
      const manyCoManagers = Array.from({ length: 100 }, (_, i) => ({ userId: `co-manager-${i}` }));

      mockListFindUnique.mockResolvedValueOnce({
        ownerId: ownerUserId,
        visibility: 'private',
        password: null,
        admins: manyCoManagers,
      } as any);

      const startTime = Date.now();
      const result = await permissionService.can('co-manager-50', 'view', {
        type: 'list',
        id: listId,
      });
      const endTime = Date.now();

      expect(result.allowed).toBe(true);
      expect(endTime - startTime).toBeLessThan(100); // Should be fast even with many co-managers
    });

    it('should handle multiple rapid permission checks', async () => {
      mockListFindUnique.mockResolvedValue({
        ownerId: ownerUserId,
        visibility: 'private',
        password: null,
        admins: [{ userId: coManagerUserId }],
      } as any);

      const promises = Array.from({ length: 10 }, () =>
        permissionService.can(coManagerUserId, 'view', { type: 'list', id: listId })
      );

      const results = await Promise.all(promises);

      expect(results).toHaveLength(10);
      expect(results.every((r) => r.allowed)).toBe(true);
    });
  });

  describe('Error Handling Tests', () => {
    it('should handle database errors gracefully in list permission checks', async () => {
      mockListFindUnique.mockRejectedValueOnce(new Error('Database connection failed'));

      await expect(
        permissionService.can(coManagerUserId, 'view', { type: 'list', id: listId })
      ).rejects.toThrow('Database connection failed');
    });

    it('should throw NotFoundError when requiring permission on non-existent list', async () => {
      mockListFindUnique.mockResolvedValueOnce(null);

      await expect(
        permissionService.require(coManagerUserId, 'view', { type: 'list', id: 'nonexistent-list' })
      ).rejects.toThrow(NotFoundError);
    });

    it('should throw ForbiddenError when requiring forbidden action for co-manager', async () => {
      // Mock list for both require calls (since each call consumes the mock)
      mockListFindUnique.mockResolvedValue({
        ownerId: ownerUserId,
        visibility: 'private',
        password: null,
        admins: [{ userId: coManagerUserId }],
      } as any);

      await expect(
        permissionService.require(coManagerUserId, 'delete', { type: 'list', id: listId })
      ).rejects.toThrow(ForbiddenError);

      await expect(
        permissionService.require(coManagerUserId, 'delete', { type: 'list', id: listId })
      ).rejects.toThrow('Only list owners can delete lists');
    });

    it('should handle malformed admin data', async () => {
      // Mock malformed admin data
      mockListFindUnique.mockResolvedValueOnce({
        ownerId: ownerUserId,
        visibility: 'private',
        password: null,
        admins: [
          { userId: coManagerUserId },
          null, // Malformed entry
          { userId: null }, // Another malformed entry
          { userId: 'valid-user' },
        ] as any,
      } as any);

      const result = await permissionService.can(coManagerUserId, 'view', {
        type: 'list',
        id: listId,
      });

      expect(result.allowed).toBe(true);
      expect(result.reason).toBeUndefined();
    });
  });

  describe('Permission Verification Tests', () => {
    it('should verify specific user is checked (not just any admin)', async () => {
      mockListFindUnique.mockResolvedValueOnce({
        ownerId: ownerUserId,
        visibility: 'private',
        password: null,
        admins: [{ userId: 'different-user-123' }], // Different user is admin
      } as any);

      mockUserGroupFindFirst.mockResolvedValueOnce(null); // Not a group member

      // The current user should NOT have permissions even though someone else is admin
      const result = await permissionService.can(coManagerUserId, 'view', {
        type: 'list',
        id: listId,
      });

      expect(result.allowed).toBe(false);
      // Private lists return "List not found" to prevent enumeration
      expect(result.reason).toBe('List not found');
    });

    it('should correctly check userId match in admin list', async () => {
      mockListFindUnique.mockResolvedValueOnce({
        ownerId: ownerUserId,
        visibility: 'private',
        password: null,
        admins: [
          { userId: 'admin-1' },
          { userId: coManagerUserId }, // Exact match
          { userId: 'admin-3' },
        ],
      } as any);

      const result = await permissionService.can(coManagerUserId, 'edit', {
        type: 'list',
        id: listId,
      });

      expect(result.allowed).toBe(true);
      expect(result.reason).toBeUndefined();
    });

    it('should handle empty admin list', async () => {
      mockListFindUnique.mockResolvedValueOnce({
        ownerId: ownerUserId,
        visibility: 'private',
        password: null,
        admins: [], // No admins
      } as any);

      mockUserGroupFindFirst.mockResolvedValueOnce(null); // Not a group member

      const result = await permissionService.can(coManagerUserId, 'view', {
        type: 'list',
        id: listId,
      });

      expect(result.allowed).toBe(false);
      // Private lists return "List not found" to prevent enumeration
      expect(result.reason).toBe('List not found');
    });
  });

  describe('Integration with Other Permission Systems', () => {
    it('should allow group member access even if not co-manager', async () => {
      mockListFindUnique.mockResolvedValueOnce({
        ownerId: ownerUserId,
        visibility: 'private',
        password: null,
        admins: [], // Not a co-manager
      } as any);

      // But is a group member with access to the list
      mockUserGroupFindFirst.mockResolvedValueOnce({
        userId: regularUserId,
        groupId: 'group-123',
      } as any);

      const result = await permissionService.can(regularUserId, 'view', {
        type: 'list',
        id: listId,
      });

      expect(result.allowed).toBe(true);
      expect(result.reason).toBeUndefined();
    });

    it('should prioritize co-manager permissions over group membership for edit actions', async () => {
      mockListFindUnique.mockResolvedValueOnce({
        ownerId: ownerUserId,
        visibility: 'private',
        password: null,
        admins: [{ userId: coManagerUserId }], // Is co-manager
      } as any);

      // Co-manager can edit
      const result = await permissionService.can(coManagerUserId, 'edit', {
        type: 'list',
        id: listId,
      });

      expect(result.allowed).toBe(true);
      expect(result.reason).toBeUndefined();

      // Note: Implementation may check group membership even if co-manager is found
      // The important thing is that the correct permissions are granted
    });

    it('should handle public list access correctly for co-managers', async () => {
      mockListFindUnique.mockResolvedValueOnce({
        ownerId: ownerUserId,
        visibility: 'public', // Public list
        password: null,
        admins: [{ userId: coManagerUserId }], // Also co-manager
      } as any);

      // Co-manager should get co-manager permissions, not just public view
      const result = await permissionService.can(coManagerUserId, 'edit', {
        type: 'list',
        id: listId,
      });

      expect(result.allowed).toBe(true);
      expect(result.reason).toBeUndefined();
    });
  });
});
