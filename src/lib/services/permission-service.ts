import { db } from '@/lib/db';
import { ForbiddenError, NotFoundError } from '@/lib/errors';
import { listService } from '@/lib/services/list-service';

export type Resource =
  | { type: 'list'; id: string }
  | { type: 'wish'; id: string }
  | { type: 'group'; id: string }
  | { type: 'reservation'; id: string };

export type Action = 'view' | 'edit' | 'delete' | 'admin' | 'share' | 'invite' | 'reserve';

export interface PermissionResult {
  allowed: boolean;
  reason?: string;
}

/**
 * Centralized permission service for all resources in the application
 *
 * Business Rules:
 * - System admins have full access to all resources for moderation purposes
 * - Suspended users are denied all access (except admins cannot be suspended)
 * - Owners have full permissions on their resources
 * - List admins can edit lists but not delete them
 * - Group members can view shared lists but cannot edit them
 * - Group admins can manage group membership and list sharing
 * - Wish owners cannot see their own reservations (privacy rule)
 */
export class PermissionService {
  /**
   * Check if a user can perform an action on a resource
   *
   * Admin Override Behavior:
   * - Admins bypass all permission checks for moderation tasks
   * - Admins can delete abusive content, help users with access issues
   * - Admin actions should be logged for audit purposes (future enhancement)
   * - Suspended users are denied access (suspendedAt is set)
   */
  async can(
    userId: string | undefined,
    action: Action,
    resource: Resource,
    context?: { password?: string }
  ): Promise<PermissionResult> {
    // Anonymous users - limited permissions
    if (!userId) {
      return this.checkAnonymousPermission(action, resource, context);
    }

    // Check user status and admin privileges
    const user = await db.user.findUnique({
      where: { id: userId },
      select: {
        isAdmin: true,
        role: true,
        suspendedAt: true,
      },
    });

    if (!user) {
      return { allowed: false, reason: 'User not found' };
    }

    // Suspended users are denied all access
    if (user.suspendedAt || user.role === 'suspended') {
      return { allowed: false, reason: 'Account suspended' };
    }

    // Admin override - admins have full access to all resources for moderation
    if (user.isAdmin || user.role === 'admin') {
      return { allowed: true };
    }

    // Regular users - check normal permissions
    switch (resource.type) {
      case 'list':
        return this.checkListPermission(userId, action, resource.id, context);
      case 'wish':
        return this.checkWishPermission(userId, action, resource.id);
      case 'group':
        return this.checkGroupPermission(userId, action, resource.id);
      case 'reservation':
        return this.checkReservationPermission(userId, action, resource.id);
      default:
        return { allowed: false, reason: 'Unknown resource type' };
    }
  }

  /**
   * Require permission - throws error if not allowed
   */
  async require(
    userId: string | undefined,
    action: Action,
    resource: Resource,
    context?: { password?: string }
  ): Promise<void> {
    const result = await this.can(userId, action, resource, context);
    if (!result.allowed) {
      // Special handling for "not found" errors
      if (result.reason?.toLowerCase().includes('not found')) {
        throw new NotFoundError(result.reason);
      }
      throw new ForbiddenError(result.reason || 'Permission denied');
    }
  }

  /**
   * Check permissions for anonymous users
   */
  private async checkAnonymousPermission(
    action: Action,
    resource: Resource,
    context?: { password?: string }
  ): Promise<PermissionResult> {
    switch (resource.type) {
      case 'list':
        if (action === 'view') {
          // Single query with ALL needed data to prevent timing attacks
          const list = await db.list.findUnique({
            where: { id: resource.id },
            select: {
              id: true,
              visibility: true,
              password: true, // Get password upfront, not in second query
            },
          });

          if (!list) {
            // Constant-time delay to prevent list enumeration via timing
            await new Promise((resolve) => setTimeout(resolve, 100));
            return { allowed: false, reason: 'List not found' };
          }

          if (list.visibility === 'public') {
            return { allowed: true };
          }

          if (list.visibility === 'password') {
            if (!context?.password) {
              return { allowed: false, reason: 'Password is required for this list' };
            }

            // Always verify password even if null (constant-time operation)
            const passwordToCheck = list.password || '';
            const isValidPassword = await listService.verifyPassword(
              context.password,
              passwordToCheck
            );

            if (!isValidPassword) {
              // Same delay as "not found" to prevent timing analysis
              await new Promise((resolve) => setTimeout(resolve, 100));
              return { allowed: false, reason: 'Invalid password' };
            }

            return { allowed: true };
          }

          // Private lists - use same error as "not found" to prevent enumeration
          await new Promise((resolve) => setTimeout(resolve, 100));
          return { allowed: false, reason: 'List not found' };
        }
        break;
      case 'reservation':
        // Anonymous users can create reservations
        return { allowed: action === 'reserve' };
    }

    return { allowed: false, reason: 'Anonymous users have limited permissions' };
  }

  /**
   * Check list permissions
   */
  private async checkListPermission(
    userId: string,
    action: Action,
    listId: string,
    context?: { password?: string }
  ): Promise<PermissionResult> {
    // Single query with ALL needed data to prevent timing attacks
    const [list, isGroupMemberResult] = await Promise.all([
      db.list.findUnique({
        where: { id: listId },
        select: {
          id: true,
          ownerId: true,
          visibility: true,
          password: true, // Get password upfront
          admins: {
            where: { userId },
            select: { userId: true },
          },
        },
      }),
      // Check group membership separately
      db.userGroup.findFirst({
        where: {
          userId,
          group: {
            lists: {
              some: { listId },
            },
          },
        },
        select: { userId: true },
      }),
    ]);

    if (!list) {
      // Constant-time delay to prevent list enumeration via timing
      await new Promise((resolve) => setTimeout(resolve, 100));
      return { allowed: false, reason: 'List not found' };
    }

    // Owner has full permissions
    if (list.ownerId === userId) {
      return { allowed: true };
    }

    // Co-manager (ListAdmin) permissions
    const isCoManager = list.admins.some((admin) => admin.userId === userId);
    if (isCoManager) {
      switch (action) {
        case 'view':
        case 'edit':
        case 'share':
          return { allowed: true };
        case 'delete':
          return { allowed: false, reason: 'Only list owners can delete lists' };
        case 'admin':
          return { allowed: false, reason: 'Only list owners can add/remove co-managers' };
        default:
          return { allowed: false, reason: 'Action not allowed for co-managers' };
      }
    }

    // Group member permissions
    if (action === 'view' && isGroupMemberResult) {
      return { allowed: true };
    }

    // Public/password list visibility
    if (action === 'view') {
      if (list.visibility === 'public') {
        return { allowed: true };
      }

      if (list.visibility === 'password') {
        if (!context?.password) {
          return { allowed: false, reason: 'Password is required for this list' };
        }

        // Always verify password even if null (constant-time operation)
        const passwordToCheck = list.password || '';
        const isValidPassword = await listService.verifyPassword(context.password, passwordToCheck);

        if (!isValidPassword) {
          // Same delay as "not found" to prevent timing analysis
          await new Promise((resolve) => setTimeout(resolve, 100));
          return { allowed: false, reason: 'Invalid password' };
        }

        return { allowed: true };
      }
    }

    // Private lists - use same error as "not found" to prevent enumeration
    await new Promise((resolve) => setTimeout(resolve, 100));
    return { allowed: false, reason: 'List not found' };
  }

  /**
   * Check wish permissions
   */
  private async checkWishPermission(
    userId: string,
    action: Action,
    wishId: string
  ): Promise<PermissionResult> {
    const wish = await db.wish.findUnique({
      where: { id: wishId },
      select: { ownerId: true },
    });

    if (!wish) {
      return { allowed: false, reason: 'Wish not found' };
    }

    // Owner has full permissions except viewing their own reservations
    if (wish.ownerId === userId) {
      if (action === 'view' || action === 'edit' || action === 'delete') {
        return { allowed: true };
      }
    }

    // Others can view wishes if they have access to the containing list
    if (action === 'view') {
      // Check if user has access to any list containing this wish
      const accessibleList = await db.listWish.findFirst({
        where: {
          wishId,
          list: {
            OR: [
              { ownerId: userId },
              { visibility: 'public' },
              {
                admins: {
                  some: { userId },
                },
              },
              {
                groups: {
                  some: {
                    group: {
                      members: {
                        some: { userId },
                      },
                    },
                  },
                },
              },
            ],
          },
        },
      });

      return {
        allowed: !!accessibleList,
        reason: !accessibleList ? 'No access to lists containing this wish' : undefined,
      };
    }

    return { allowed: false, reason: 'Insufficient permissions' };
  }

  /**
   * Check group permissions
   */
  private async checkGroupPermission(
    userId: string,
    action: Action,
    groupId: string
  ): Promise<PermissionResult> {
    const membership = await db.userGroup.findUnique({
      where: {
        userId_groupId: { userId, groupId },
      },
      select: { role: true },
    });

    if (!membership) {
      // Check if group exists to provide better error message
      const group = await db.group.findUnique({
        where: { id: groupId },
        select: { id: true },
      });

      if (!group) {
        return { allowed: false, reason: 'Group not found' };
      }

      return { allowed: false, reason: 'You do not have permission to access this group' };
    }

    const isAdmin = membership.role === 'admin';

    switch (action) {
      case 'view':
        return { allowed: true }; // All members can view
      case 'share':
        return { allowed: true }; // All members can share their own lists with the group
      case 'edit':
      case 'admin':
      case 'invite':
        return {
          allowed: isAdmin,
          reason: !isAdmin ? 'Admin permission required' : undefined,
        };
      case 'delete':
        // Currently only admins can delete groups
        return {
          allowed: isAdmin,
          reason: !isAdmin ? 'You do not have permission to delete this group' : undefined,
        };
      default:
        return { allowed: false, reason: 'Unknown action' };
    }
  }

  /**
   * Check reservation permissions
   */
  private async checkReservationPermission(
    userId: string,
    action: Action,
    reservationId: string
  ): Promise<PermissionResult> {
    const reservation = await db.reservation.findUnique({
      where: { id: reservationId },
      select: {
        reserverEmail: true,
        wish: {
          select: { ownerId: true },
        },
      },
    });

    if (!reservation) {
      return { allowed: false, reason: 'Reservation not found' };
    }

    // Get user email for comparison
    const user = await db.user.findUnique({
      where: { id: userId },
      select: { email: true },
    });

    if (!user) {
      return { allowed: false, reason: 'User not found' };
    }

    switch (action) {
      case 'view':
        // Wish owner can see reservations, reserver can see their own
        if (reservation.wish.ownerId === userId || reservation.reserverEmail === user.email) {
          return { allowed: true };
        }
        return {
          allowed: false,
          reason: 'Can only view your own reservations or reservations on your wishes',
        };

      case 'delete':
        // Only the reserver can cancel their reservation
        if (reservation.reserverEmail === user.email) {
          return { allowed: true };
        }
        return { allowed: false, reason: 'Can only cancel your own reservations' };

      default:
        return { allowed: false, reason: 'Unknown action' };
    }
  }
}

// Export singleton instance
export const permissionService = new PermissionService();
