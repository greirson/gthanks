import { resolveGroupAvatarUrlSync } from '@/lib/avatar-utils';
import { db } from '@/lib/db';
import { NotFoundError, ValidationError } from '@/lib/errors';
import { AuditActions } from '@/lib/schemas/audit-log';
import { auditService } from '@/lib/services/audit-service';
import { GroupWithCounts, GroupWithDetails } from '@/lib/services/group-types';
import { permissionService } from '@/lib/services/permission-service';
import { GroupCreateInput, GroupUpdateInput } from '@/lib/validators/group';

export class GroupManagementService {
  private db: typeof db;

  constructor(database?: typeof db) {
    this.db = database || db;
  }

  /**
   * Create a new group
   */
  async createGroup(data: GroupCreateInput, userId: string): Promise<GroupWithCounts> {
    // Verify user exists
    const user = await this.db.user.findUnique({
      where: { id: userId },
    });
    if (!user) {
      throw new NotFoundError('User not found');
    }

    // Create group and add creator as admin
    const group = await this.db.$transaction(async (tx) => {
      const newGroup = await tx.group.create({
        data: {
          name: data.name,
          description: data.description || null,
          avatarUrl: data.avatarUrl || null,
          visibility: data.visibility || 'private',
        },
      });

      // Add creator as admin
      await tx.userGroup.create({
        data: {
          userId: userId,
          groupId: newGroup.id,
          role: 'admin',
        },
      });

      // Get the group with counts
      const groupWithCounts = await tx.group.findUnique({
        where: { id: newGroup.id },
        include: {
          _count: {
            select: {
              userGroups: true,
              listGroups: true,
            },
          },
        },
      });

      if (!groupWithCounts) {
        throw new Error('Failed to create group');
      }

      return groupWithCounts as GroupWithCounts;
    });

    // Fire and forget audit log
    auditService.log({
      actorId: userId,
      actorType: 'user',
      category: 'content',
      action: AuditActions.GROUP_CREATED,
      resourceType: 'group',
      resourceId: group.id,
      resourceName: group.name,
    });

    return group;
  }

  /**
   * Update group details
   */
  async updateGroup(
    groupId: string,
    data: GroupUpdateInput,
    userId: string
  ): Promise<GroupWithCounts> {
    // Check permissions
    await permissionService.require(userId, 'edit', { type: 'group', id: groupId });

    await this.db.group.update({
      where: { id: groupId },
      data: {
        name: data.name,
        description: data.description,
        avatarUrl: data.avatarUrl,
        visibility: data.visibility,
      },
    });

    const groupWithCounts = await this.db.group.findUnique({
      where: { id: groupId },
      include: {
        _count: {
          select: {
            userGroups: true,
            listGroups: true,
          },
        },
      },
    });

    if (!groupWithCounts) {
      throw new NotFoundError('Group not found');
    }

    return groupWithCounts as GroupWithCounts;
  }

  /**
   * Delete a group
   */
  async deleteGroup(groupId: string, userId: string): Promise<void> {
    // Check permissions
    await permissionService.require(userId, 'delete', { type: 'group', id: groupId });

    // Delete group and all associations
    await this.db.$transaction(async (tx) => {
      // Delete group invitations
      await tx.groupInvitation.deleteMany({
        where: { groupId },
      });

      // Delete list-group associations
      await tx.listGroup.deleteMany({
        where: { groupId },
      });

      // Delete user-group memberships
      await tx.userGroup.deleteMany({
        where: { groupId },
      });

      // Delete the group
      await tx.group.delete({
        where: { id: groupId },
      });
    });
  }

  /**
   * Get group with full details
   */
  async getGroup(groupId: string, userId: string): Promise<GroupWithDetails> {
    // Check permissions
    await permissionService.require(userId, 'view', { type: 'group', id: groupId });

    const group = await this.db.group.findUnique({
      where: { id: groupId },
      include: {
        userGroups: {
          include: {
            user: true,
          },
        },
        listGroups: {
          include: {
            list: {
              include: {
                user: true,
              },
            },
          },
        },
        groupInvitations: {
          include: {
            user: true,
            group: {
              select: {
                id: true,
                name: true,
                description: true,
              },
            },
          },
        },
        _count: {
          select: {
            userGroups: true,
            listGroups: true,
          },
        },
      },
    });

    if (!group) {
      throw new NotFoundError('Group not found');
    }

    // Get current user's role
    const currentUserMembership = group.userGroups.find((m) => m.userId === userId);
    const currentUserRole = currentUserMembership?.role as 'admin' | 'member' | undefined;

    return {
      ...group,
      avatarUrl: resolveGroupAvatarUrlSync(group),
      members: group.userGroups.map((member) => ({
        ...member,
        user: {
          ...member.user,
          avatarUrl: member.user.avatarUrl || null,
        },
      })),
      lists: group.listGroups.map((lg) => ({
        ...lg.list,
        user: lg.list.user,
      })),
      invitations: group.groupInvitations.map((inv) => ({
        ...inv,
        status: 'pending' as const,
      })),
      currentUserRole: currentUserRole || null,
    } as unknown as GroupWithDetails;
  }

  /**
   * Get lightweight group info without relations for better performance
   */
  async getGroupBaseInfo(
    groupId: string,
    userId: string
  ): Promise<Omit<GroupWithDetails, 'members' | 'lists' | 'invitations'>> {
    // Check permissions
    await permissionService.require(userId, 'view', { type: 'group', id: groupId });

    const group = await this.db.group.findUnique({
      where: { id: groupId },
      include: {
        _count: {
          select: {
            userGroups: true,
            listGroups: true,
          },
        },
      },
    });

    if (!group) {
      throw new NotFoundError('Group not found');
    }

    // Get current user's role efficiently
    const currentUserMembership = await this.db.userGroup.findUnique({
      where: {
        userId_groupId: {
          userId: userId,
          groupId: groupId,
        },
      },
    });

    return {
      ...group,
      avatarUrl: resolveGroupAvatarUrlSync(group),
      currentUserRole: (currentUserMembership?.role as 'admin' | 'member' | null) || null,
    } as Omit<GroupWithDetails, 'members' | 'lists' | 'invitations'>;
  }

  /**
   * Upload group avatar
   */
  async uploadGroupAvatar(
    groupId: string,
    imageDataUrl: string,
    userId: string
  ): Promise<{ avatarUrl: string }> {
    // Check permissions
    await permissionService.require(userId, 'edit', { type: 'group', id: groupId });

    // Validate image format
    if (!imageDataUrl.startsWith('data:image/')) {
      throw new ValidationError('Invalid image format. Please provide a base64 encoded image.');
    }

    // Check for proper data URL format with base64 encoding
    if (!imageDataUrl.includes(';base64,')) {
      throw new ValidationError('Invalid image format. Please provide a base64 encoded image.');
    }

    const mimeType = imageDataUrl.match(/data:image\/([^;]+)/)?.[1];
    if (!mimeType || !['png', 'jpeg', 'jpg'].includes(mimeType.toLowerCase())) {
      throw new ValidationError('Invalid image format. Only PNG and JPEG images are supported.');
    }

    const base64Data = imageDataUrl.split(',')[1];
    if (!base64Data) {
      throw new ValidationError('Invalid image format. Please provide a base64 encoded image.');
    }

    // Update group with avatar URL
    await this.db.group.update({
      where: { id: groupId },
      data: {
        avatarUrl: imageDataUrl,
      },
    });

    // Return the resolved avatar URL that clients can use
    return {
      avatarUrl: `/api/groups/${groupId}/avatar`,
    };
  }

  /**
   * Get group by ID (alias for getGroup)
   */
  async getGroupById(groupId: string, userId: string): Promise<GroupWithDetails> {
    return this.getGroup(groupId, userId);
  }
}
