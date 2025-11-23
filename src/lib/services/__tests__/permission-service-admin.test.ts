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
const { permissionService } = jest.requireActual(
  '@/lib/services/permission-service'
) as typeof import('../permission-service');

// Add missing mock methods
if (!db.userGroup.findFirst) {
  (db.userGroup as any).findFirst = jest.fn();
}

if (!db.listWish) {
  (db as any).listWish = {
    findFirst: jest.fn(),
  };
} else if (!db.listWish.findFirst) {
  (db.listWish as any).findFirst = jest.fn();
}

// Create typed references to the mocked functions
const mockUserFindUnique = db.user.findUnique as jest.MockedFunction<typeof db.user.findUnique>;
const mockListFindUnique = db.list.findUnique as jest.MockedFunction<typeof db.list.findUnique>;
const mockWishFindUnique = db.wish.findUnique as jest.MockedFunction<typeof db.wish.findUnique>;
const mockGroupFindUnique = db.group.findUnique as jest.MockedFunction<typeof db.group.findUnique>;
const mockReservationFindUnique = db.reservation.findUnique as jest.MockedFunction<
  typeof db.reservation.findUnique
>;

describe('PermissionService Admin Override Tests', () => {
  const adminUserId = 'admin-123';
  const regularUserId = 'regular-456';
  const suspendedUserId = 'suspended-789';
  const listId = 'list-123';
  const wishId = 'wish-456';
  const groupId = 'group-123';
  const reservationId = 'reservation-123';

  beforeEach(() => {
    jest.clearAllMocks();
    jest.resetAllMocks();
  });

  describe('Admin Override - isAdmin Field', () => {
    it('should allow admin to view any list (isAdmin = true)', async () => {
      mockUserFindUnique.mockResolvedValueOnce({
        id: adminUserId,
        isAdmin: true,
        role: 'user',
        suspendedAt: null,
      } as any);

      const result = await permissionService.can(adminUserId, 'view', {
        type: 'list',
        id: listId,
      });

      expect(result.allowed).toBe(true);
      expect(result.reason).toBeUndefined();
      // Should NOT call list-specific checks
      expect(mockListFindUnique).not.toHaveBeenCalled();
    });

    it('should allow admin to edit any list (isAdmin = true)', async () => {
      mockUserFindUnique.mockResolvedValueOnce({
        id: adminUserId,
        isAdmin: true,
        role: 'user',
        suspendedAt: null,
      } as any);

      const result = await permissionService.can(adminUserId, 'edit', {
        type: 'list',
        id: listId,
      });

      expect(result.allowed).toBe(true);
      expect(result.reason).toBeUndefined();
    });

    it('should allow admin to delete any list (isAdmin = true)', async () => {
      mockUserFindUnique.mockResolvedValueOnce({
        id: adminUserId,
        isAdmin: true,
        role: 'user',
        suspendedAt: null,
      } as any);

      const result = await permissionService.can(adminUserId, 'delete', {
        type: 'list',
        id: listId,
      });

      expect(result.allowed).toBe(true);
      expect(result.reason).toBeUndefined();
    });
  });

  describe('Admin Override - role Field', () => {
    it('should allow admin to view any list (role = "admin")', async () => {
      mockUserFindUnique.mockResolvedValueOnce({
        id: adminUserId,
        isAdmin: false, // Using role field instead
        role: 'admin',
        suspendedAt: null,
      } as any);

      const result = await permissionService.can(adminUserId, 'view', {
        type: 'list',
        id: listId,
      });

      expect(result.allowed).toBe(true);
      expect(result.reason).toBeUndefined();
    });

    it('should allow admin to delete any wish (role = "admin")', async () => {
      mockUserFindUnique.mockResolvedValueOnce({
        id: adminUserId,
        isAdmin: false,
        role: 'admin',
        suspendedAt: null,
      } as any);

      const result = await permissionService.can(adminUserId, 'delete', {
        type: 'wish',
        id: wishId,
      });

      expect(result.allowed).toBe(true);
      expect(result.reason).toBeUndefined();
    });
  });

  describe('Admin Override - All Resource Types', () => {
    it('should allow admin to manage wishes', async () => {
      mockUserFindUnique.mockResolvedValueOnce({
        id: adminUserId,
        isAdmin: true,
        role: 'user',
        suspendedAt: null,
      } as any);

      const result = await permissionService.can(adminUserId, 'delete', {
        type: 'wish',
        id: wishId,
      });

      expect(result.allowed).toBe(true);
      expect(mockWishFindUnique).not.toHaveBeenCalled();
    });

    it('should allow admin to manage groups', async () => {
      mockUserFindUnique.mockResolvedValueOnce({
        id: adminUserId,
        isAdmin: true,
        role: 'user',
        suspendedAt: null,
      } as any);

      const result = await permissionService.can(adminUserId, 'delete', {
        type: 'group',
        id: groupId,
      });

      expect(result.allowed).toBe(true);
      expect(mockGroupFindUnique).not.toHaveBeenCalled();
    });

    it('should allow admin to manage reservations', async () => {
      mockUserFindUnique.mockResolvedValueOnce({
        id: adminUserId,
        isAdmin: true,
        role: 'user',
        suspendedAt: null,
      } as any);

      const result = await permissionService.can(adminUserId, 'delete', {
        type: 'reservation',
        id: reservationId,
      });

      expect(result.allowed).toBe(true);
      expect(mockReservationFindUnique).not.toHaveBeenCalled();
    });
  });

  describe('Suspended User Checks', () => {
    it('should deny access to suspended user (suspendedAt is set)', async () => {
      mockUserFindUnique.mockResolvedValueOnce({
        id: suspendedUserId,
        isAdmin: false,
        role: 'user',
        suspendedAt: new Date('2024-01-15'),
      } as any);

      const result = await permissionService.can(suspendedUserId, 'view', {
        type: 'list',
        id: listId,
      });

      expect(result.allowed).toBe(false);
      expect(result.reason).toBe('Account suspended');
    });

    it('should deny access to suspended user (role = "suspended")', async () => {
      mockUserFindUnique.mockResolvedValueOnce({
        id: suspendedUserId,
        isAdmin: false,
        role: 'suspended',
        suspendedAt: null,
      } as any);

      const result = await permissionService.can(suspendedUserId, 'view', {
        type: 'list',
        id: listId,
      });

      expect(result.allowed).toBe(false);
      expect(result.reason).toBe('Account suspended');
    });

    it('should deny access when both suspendedAt and role = "suspended"', async () => {
      mockUserFindUnique.mockResolvedValueOnce({
        id: suspendedUserId,
        isAdmin: false,
        role: 'suspended',
        suspendedAt: new Date('2024-01-15'),
      } as any);

      const result = await permissionService.can(suspendedUserId, 'view', {
        type: 'list',
        id: listId,
      });

      expect(result.allowed).toBe(false);
      expect(result.reason).toBe('Account suspended');
    });
  });

  describe('Regular User Behavior (Non-Admin)', () => {
    it('should still apply normal permission checks for regular users', async () => {
      mockUserFindUnique.mockResolvedValueOnce({
        id: regularUserId,
        isAdmin: false,
        role: 'user',
        suspendedAt: null,
      } as any);

      mockListFindUnique.mockResolvedValueOnce({
        id: listId,
        ownerId: 'other-user',
        visibility: 'private',
        password: null,
        listAdmins: [],
      } as any);

      const result = await permissionService.can(regularUserId, 'view', {
        type: 'list',
        id: listId,
      });

      expect(result.allowed).toBe(false);
      // Private lists return "List not found" to prevent enumeration
      expect(result.reason).toBe('List not found');
      expect(mockListFindUnique).toHaveBeenCalled();
    });

    it('should allow regular users to access their own resources', async () => {
      mockUserFindUnique.mockResolvedValueOnce({
        id: regularUserId,
        isAdmin: false,
        role: 'user',
        suspendedAt: null,
      } as any);

      mockWishFindUnique.mockResolvedValueOnce({
        ownerId: regularUserId,
      } as any);

      const result = await permissionService.can(regularUserId, 'edit', {
        type: 'wish',
        id: wishId,
      });

      expect(result.allowed).toBe(true);
    });
  });

  describe('Edge Cases', () => {
    it('should handle user not found', async () => {
      mockUserFindUnique.mockResolvedValueOnce(null);

      const result = await permissionService.can('nonexistent-user', 'view', {
        type: 'list',
        id: listId,
      });

      expect(result.allowed).toBe(false);
      expect(result.reason).toBe('User not found');
    });

    it('should handle admin with both isAdmin = true and role = "admin"', async () => {
      mockUserFindUnique.mockResolvedValueOnce({
        id: adminUserId,
        isAdmin: true,
        role: 'admin',
        suspendedAt: null,
      } as any);

      const result = await permissionService.can(adminUserId, 'delete', {
        type: 'list',
        id: listId,
      });

      expect(result.allowed).toBe(true);
    });

    it('should prioritize suspension check over admin check', async () => {
      // Even if user has isAdmin = true, if they're suspended, deny access
      mockUserFindUnique.mockResolvedValueOnce({
        id: adminUserId,
        isAdmin: true,
        role: 'admin',
        suspendedAt: new Date('2024-01-15'),
      } as any);

      const result = await permissionService.can(adminUserId, 'view', {
        type: 'list',
        id: listId,
      });

      expect(result.allowed).toBe(false);
      expect(result.reason).toBe('Account suspended');
    });
  });

  describe('require() Method with Admin Override', () => {
    it('should not throw error when admin accesses restricted resource', async () => {
      mockUserFindUnique.mockResolvedValueOnce({
        id: adminUserId,
        isAdmin: true,
        role: 'user',
        suspendedAt: null,
      } as any);

      await expect(
        permissionService.require(adminUserId, 'delete', {
          type: 'list',
          id: listId,
        })
      ).resolves.not.toThrow();
    });

    it('should throw ForbiddenError when suspended user tries to access', async () => {
      // First call to require()
      mockUserFindUnique.mockResolvedValueOnce({
        id: suspendedUserId,
        isAdmin: false,
        role: 'suspended',
        suspendedAt: new Date('2024-01-15'),
      } as any);

      await expect(
        permissionService.require(suspendedUserId, 'view', {
          type: 'list',
          id: listId,
        })
      ).rejects.toThrow(ForbiddenError);

      // Second call to require() - need new mock
      mockUserFindUnique.mockResolvedValueOnce({
        id: suspendedUserId,
        isAdmin: false,
        role: 'suspended',
        suspendedAt: new Date('2024-01-15'),
      } as any);

      await expect(
        permissionService.require(suspendedUserId, 'view', {
          type: 'list',
          id: listId,
        })
      ).rejects.toThrow('Account suspended');
    });

    it('should throw NotFoundError when user does not exist', async () => {
      mockUserFindUnique.mockResolvedValueOnce(null);

      await expect(
        permissionService.require('nonexistent-user', 'view', {
          type: 'list',
          id: listId,
        })
      ).rejects.toThrow(NotFoundError);
    });
  });

  describe('Performance Considerations', () => {
    it('should short-circuit permission checks for admins (no unnecessary DB queries)', async () => {
      mockUserFindUnique.mockResolvedValueOnce({
        id: adminUserId,
        isAdmin: true,
        role: 'user',
        suspendedAt: null,
      } as any);

      await permissionService.can(adminUserId, 'delete', {
        type: 'list',
        id: listId,
      });

      // Should only check user, not list details
      expect(mockUserFindUnique).toHaveBeenCalledTimes(1);
      expect(mockListFindUnique).not.toHaveBeenCalled();
    });

    it('should cache user lookup result (single DB call per permission check)', async () => {
      mockUserFindUnique.mockResolvedValueOnce({
        id: adminUserId,
        isAdmin: true,
        role: 'user',
        suspendedAt: null,
      } as any);

      await permissionService.can(adminUserId, 'view', {
        type: 'list',
        id: listId,
      });

      expect(mockUserFindUnique).toHaveBeenCalledTimes(1);
      expect(mockUserFindUnique).toHaveBeenCalledWith({
        where: { id: adminUserId },
        select: {
          isAdmin: true,
          role: true,
          suspendedAt: true,
        },
      });
    });
  });
});
