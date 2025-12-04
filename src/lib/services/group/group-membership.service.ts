import { resolveAvatarUrlSync } from '@/lib/avatar-utils';
import { db } from '@/lib/db';
import { AppError, ForbiddenError, NotFoundError, ValidationError } from '@/lib/errors';
import { AuditActions } from '@/lib/schemas/audit-log';
import { auditService } from '@/lib/services/audit-service';
import { GroupMemberDetails, GroupPermissions } from '@/lib/services/group-types';
import { permissionService } from '@/lib/services/permission-service';
import { GroupAddMemberInput, GroupMemberInput } from '@/lib/validators/group';

export class GroupMembershipService {
  private db: typeof db;

  constructor(database?: typeof db) {
    this.db = database || db;
  }

  /**
   * Add member to group
   */
  async addMember(groupId: string, data: GroupAddMemberInput, userId: string): Promise<void> {
    // Check permission to add members
    const permission = await permissionService.can(userId, 'admin', { type: 'group', id: groupId });
    if (!permission.allowed) {
      throw new ForbiddenError(
        permission.reason || 'You do not have permission to add members to this group'
      );
    }

    // Find user by email or userId
    let targetUser;
    if (data.email) {
      targetUser = await this.db.user.findUnique({
        where: { email: data.email },
      });
      if (!targetUser) {
        throw new NotFoundError(`No user found with email: ${data.email}`);
      }
    } else if (data.userId) {
      targetUser = await this.db.user.findUnique({
        where: { id: data.userId },
      });
      if (!targetUser) {
        throw new NotFoundError('User not found');
      }
    } else {
      throw new ValidationError('Either userId or email must be provided');
    }

    // Check if user is already a member
    const existingMember = await this.db.userGroup.findUnique({
      where: {
        userId_groupId: {
          userId: targetUser.id,
          groupId: groupId,
        },
      },
    });

    if (existingMember) {
      throw new ValidationError('User is already a member of this group');
    }

    // Get group name for audit log
    const group = await this.db.group.findUnique({
      where: { id: groupId },
      select: { name: true },
    });

    // Add member
    await this.db.userGroup.create({
      data: {
        userId: targetUser.id,
        groupId: groupId,
        role: data.role || 'member',
      },
    });

    // Fire and forget audit log
    auditService.log({
      actorId: userId,
      actorType: 'user',
      category: 'content',
      action: AuditActions.GROUP_MEMBER_ADDED,
      resourceType: 'group',
      resourceId: groupId,
      resourceName: group?.name || undefined,
      details: {
        addedUserId: targetUser.id,
        addedUserEmail: targetUser.email,
        role: data.role || 'member',
      },
    });
  }

  /**
   * Update member role
   */
  async updateMemberRole(
    groupId: string,
    data: GroupMemberInput,
    adminUserId: string
  ): Promise<void> {
    // Validate role change - simplified for MVP
    // Users cannot change their own role
    if (data.userId === adminUserId) {
      throw new AppError('You cannot change your own role', 'SELF_ROLE_CHANGE', 403);
    }

    // Validate that the role is valid
    const validRoles = ['member', 'admin', 'owner'];
    if (!validRoles.includes(data.role)) {
      throw new AppError('Invalid role specified', 'VALIDATION_ERROR', 400);
    }

    // Check if this would leave the group without admins
    const currentMember = await this.db.userGroup.findUnique({
      where: {
        userId_groupId: {
          userId: data.userId,
          groupId: groupId,
        },
      },
      include: {
        user: { select: { name: true, email: true } },
      },
    });

    if (data.role === 'member' && currentMember?.role === 'admin') {
      const adminCount = await this.db.userGroup.count({
        where: {
          groupId: groupId,
          role: 'admin',
        },
      });

      if (adminCount <= 1) {
        throw new AppError('Cannot demote the last admin', 'LAST_ADMIN', 400);
      }
    }

    const previousRole = currentMember?.role;

    // Update the role
    await this.db.userGroup.update({
      where: {
        userId_groupId: {
          userId: data.userId,
          groupId: groupId,
        },
      },
      data: {
        role: data.role,
      },
    });

    // Get group name for audit log
    const group = await this.db.group.findUnique({
      where: { id: groupId },
      select: { name: true },
    });

    // Fire and forget audit log
    auditService.log({
      actorId: adminUserId,
      actorType: 'user',
      category: 'content',
      action: AuditActions.GROUP_ROLE_CHANGED,
      resourceType: 'group',
      resourceId: groupId,
      resourceName: group?.name || undefined,
      details: {
        targetUserId: data.userId,
        targetUserName: currentMember?.user?.name || currentMember?.user?.email || undefined,
        oldRole: previousRole,
        newRole: data.role,
      },
    });
  }

  /**
   * Remove member from group
   */
  async removeMember(groupId: string, targetUserId: string, userId: string): Promise<void> {
    // Check permissions
    await permissionService.require(userId, 'admin', { type: 'group', id: groupId });

    // Verify target user is a member and get user details for audit log
    const membership = await this.db.userGroup.findUnique({
      where: {
        userId_groupId: {
          userId: targetUserId,
          groupId: groupId,
        },
      },
      include: {
        user: { select: { name: true, email: true } },
      },
    });

    if (!membership) {
      throw new NotFoundError('User is not a member of this group');
    }

    // Prevent removing the last admin
    if (membership.role === 'admin') {
      const adminCount = await this.db.userGroup.count({
        where: {
          groupId: groupId,
          role: 'admin',
        },
      });

      if (adminCount <= 1) {
        throw new ValidationError('Cannot remove the last admin of the group');
      }
    }

    // Get group name for audit log
    const group = await this.db.group.findUnique({
      where: { id: groupId },
      select: { name: true },
    });

    await this.db.userGroup.delete({
      where: {
        userId_groupId: {
          userId: targetUserId,
          groupId: groupId,
        },
      },
    });

    // Fire and forget audit log
    auditService.log({
      actorId: userId,
      actorType: 'user',
      category: 'content',
      action: AuditActions.GROUP_MEMBER_REMOVED,
      resourceType: 'group',
      resourceId: groupId,
      resourceName: group?.name,
      details: {
        removedUserId: targetUserId,
        removedUserName: membership.user?.name || membership.user?.email,
      },
    });
  }

  /**
   * Leave group
   */
  async leaveGroup(groupId: string, userId: string): Promise<void> {
    // Verify user is a member
    const membership = await this.db.userGroup.findUnique({
      where: {
        userId_groupId: {
          userId: userId,
          groupId: groupId,
        },
      },
    });

    if (!membership) {
      throw new NotFoundError('You are not a member of this group');
    }

    // Prevent leaving if user is the last admin
    if (membership.role === 'admin') {
      const adminCount = await this.db.userGroup.count({
        where: {
          groupId: groupId,
          role: 'admin',
        },
      });

      if (adminCount <= 1) {
        throw new ValidationError(
          'Cannot leave group as the last admin. Please promote another member to admin first.'
        );
      }
    }

    // Get group name for audit log
    const group = await this.db.group.findUnique({
      where: { id: groupId },
      select: { name: true },
    });

    await this.db.userGroup.delete({
      where: {
        userId_groupId: {
          userId: userId,
          groupId: groupId,
        },
      },
    });

    // Fire and forget audit log
    auditService.log({
      actorId: userId,
      actorType: 'user',
      category: 'content',
      action: AuditActions.GROUP_MEMBER_LEFT,
      resourceType: 'group',
      resourceId: groupId,
      resourceName: group?.name,
    });
  }

  /**
   * Get group members
   */
  async getGroupMembers(groupId: string): Promise<GroupMemberDetails[]> {
    const members = await this.db.userGroup.findMany({
      where: { groupId },
      include: {
        user: true,
      },
    });

    return members.map((member) => ({
      ...member,
      user: {
        ...member.user,
        avatarUrl: resolveAvatarUrlSync(member.user),
      },
    }));
  }

  /**
   * Get user permissions for a group
   */
  async getUserPermissions(groupId: string, userId: string): Promise<GroupPermissions> {
    const membership = await this.db.userGroup.findUnique({
      where: {
        userId_groupId: {
          userId: userId,
          groupId: groupId,
        },
      },
    });

    if (!membership) {
      return {
        canEdit: false,
        canDelete: false,
        canInvite: false,
        canRemoveMembers: false,
        canManageLists: false,
      };
    }

    const isAdmin = membership.role === 'admin';

    return {
      canEdit: isAdmin,
      canDelete: false, // Only creators can delete (not implemented yet)
      canInvite: isAdmin,
      canRemoveMembers: isAdmin,
      canManageLists: isAdmin,
    };
  }

  /**
   * Require admin permissions for a group
   */
  async requireAdmin(groupId: string, userId: string): Promise<void> {
    const membership = await this.db.userGroup.findUnique({
      where: {
        userId_groupId: {
          userId: userId,
          groupId: groupId,
        },
      },
    });

    if (!membership || membership.role !== 'admin') {
      throw new ForbiddenError('You must be a group admin to perform this action');
    }
  }
}
