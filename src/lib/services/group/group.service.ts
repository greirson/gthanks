import { Group } from '@prisma/client';

import { db } from '@/lib/db';
import {
  GroupInvitationDetails,
  GroupMemberDetails,
  GroupPermissions,
  GroupWithCounts,
  GroupWithDetails,
  ListWithOwner,
} from '@/lib/services/group-types';
import { GroupInvitationService } from '@/lib/services/group/group-invitation.service';
import { GroupListSharingService } from '@/lib/services/group/group-list-sharing.service';
import { GroupManagementService } from '@/lib/services/group/group-management.service';
import { GroupMembershipService } from '@/lib/services/group/group-membership.service';
import {
  GroupAddMemberInput,
  GroupCreateInput,
  GroupInviteInput,
  GroupMemberInput,
  GroupShareListsInput,
  GroupUpdateInput,
} from '@/lib/validators/group';

/**
 * Main GroupService that orchestrates all group-related operations
 * by delegating to specialized services
 */
export class GroupService {
  private groupManagement: GroupManagementService;
  private groupMembership: GroupMembershipService;
  private groupInvitation: GroupInvitationService;
  private groupListSharing: GroupListSharingService;

  constructor(database?: typeof db) {
    const dbInstance = database || db;
    this.groupManagement = new GroupManagementService(dbInstance);
    this.groupMembership = new GroupMembershipService(dbInstance);
    this.groupInvitation = new GroupInvitationService(dbInstance);
    this.groupListSharing = new GroupListSharingService(dbInstance);
  }

  // ===== Management Operations =====

  async createGroup(data: GroupCreateInput, userId: string): Promise<GroupWithCounts> {
    return this.groupManagement.createGroup(data, userId);
  }

  async updateGroup(
    groupId: string,
    data: GroupUpdateInput,
    userId: string
  ): Promise<GroupWithCounts> {
    return this.groupManagement.updateGroup(groupId, data, userId);
  }

  async deleteGroup(groupId: string, userId: string): Promise<void> {
    return this.groupManagement.deleteGroup(groupId, userId);
  }

  async getGroup(groupId: string, userId: string): Promise<GroupWithDetails> {
    return this.groupManagement.getGroup(groupId, userId);
  }

  async getGroupById(groupId: string, userId: string): Promise<GroupWithDetails> {
    return this.groupManagement.getGroupById(groupId, userId);
  }

  async getGroupBaseInfo(
    groupId: string,
    userId: string
  ): Promise<Omit<GroupWithDetails, 'members' | 'lists' | 'invitations'>> {
    return this.groupManagement.getGroupBaseInfo(groupId, userId);
  }

  async uploadGroupAvatar(
    groupId: string,
    imageDataUrl: string,
    userId: string
  ): Promise<{ avatarUrl: string }> {
    return this.groupManagement.uploadGroupAvatar(groupId, imageDataUrl, userId);
  }

  // ===== Membership Operations =====

  async addMember(groupId: string, data: GroupAddMemberInput, userId: string): Promise<void> {
    return this.groupMembership.addMember(groupId, data, userId);
  }

  async updateMemberRole(
    groupId: string,
    data: GroupMemberInput,
    adminUserId: string
  ): Promise<void> {
    return this.groupMembership.updateMemberRole(groupId, data, adminUserId);
  }

  async removeMember(groupId: string, targetUserId: string, userId: string): Promise<void> {
    return this.groupMembership.removeMember(groupId, targetUserId, userId);
  }

  async leaveGroup(groupId: string, userId: string): Promise<void> {
    return this.groupMembership.leaveGroup(groupId, userId);
  }

  async getGroupMembers(groupId: string): Promise<GroupMemberDetails[]> {
    return this.groupMembership.getGroupMembers(groupId);
  }

  async getUserPermissions(groupId: string, userId: string): Promise<GroupPermissions> {
    return this.groupMembership.getUserPermissions(groupId, userId);
  }

  async requireAdmin(groupId: string, userId: string): Promise<void> {
    return this.groupMembership.requireAdmin(groupId, userId);
  }

  // ===== Invitation Operations =====

  async inviteUsers(
    groupId: string,
    data: GroupInviteInput,
    userId: string
  ): Promise<{ sent: number; skipped: string[] }> {
    return this.groupInvitation.inviteUsers(groupId, data, userId);
  }

  async acceptInvitation(token: string, userEmail: string): Promise<Group> {
    const group = await this.groupInvitation.acceptInvitation(token, userEmail);
    // Convert the returned object to a Group type
    return group as unknown as Group;
  }

  async getGroupInvitations(groupId: string): Promise<GroupInvitationDetails[]> {
    return this.groupInvitation.getGroupInvitations(groupId);
  }

  async respondToInvitation(
    invitationId: string,
    action: 'accept' | 'decline',
    userId: string
  ): Promise<{ success: boolean; message: string }> {
    return this.groupInvitation.respondToInvitation(invitationId, action, userId);
  }

  async cancelInvitation(invitationId: string, userId: string): Promise<void> {
    return this.groupInvitation.cancelInvitation(invitationId, userId);
  }

  async resendInvitationEmail(invitationId: string): Promise<boolean> {
    return this.groupInvitation.resendInvitationEmail(invitationId);
  }

  // ===== List Sharing Operations =====

  async shareLists(groupId: string, data: GroupShareListsInput, userId: string): Promise<void> {
    return this.groupListSharing.shareLists(groupId, data, userId);
  }

  async removeLists(groupId: string, listIds: string[], userId: string): Promise<void> {
    return this.groupListSharing.removeLists(groupId, listIds, userId);
  }

  async removeListFromGroup(groupId: string, listId: string, userId: string): Promise<void> {
    return this.groupListSharing.removeListFromGroup(groupId, listId, userId);
  }

  async getGroupLists(
    groupId: string,
    options?: { page?: number; limit?: number; search?: string }
  ): Promise<{ lists: ListWithOwner[]; hasMore: boolean }> {
    return this.groupListSharing.getGroupLists(groupId, options);
  }

  async searchAvailableLists(
    groupId: string,
    userId: string,
    searchTerm: string,
    limit: number = 20,
    offset: number = 0
  ): Promise<ListWithOwner[]> {
    return this.groupListSharing.searchAvailableLists(groupId, userId, searchTerm, limit, offset);
  }

  async searchListsForGroup(
    groupId: string,
    options: { query: string; limit?: number; offset?: number; excludeListIds?: string[] },
    userId: string
  ): Promise<{
    lists: ListWithOwner[];
    hasMore: boolean;
    total: number;
  }> {
    return this.groupListSharing.searchListsForGroup(groupId, options, userId);
  }

  async searchGroupLists(
    groupId: string,
    options: { query: string; limit: number; offset: number }
  ): Promise<{
    lists: ListWithOwner[];
    pagination: {
      offset: number;
      limit: number;
      total: number;
      hasMore: boolean;
    };
  }> {
    return this.groupListSharing.searchGroupLists(groupId, options);
  }

  // ===== Additional Operations =====

  async getUserGroups(
    userId: string,
    options?: { page?: number; limit?: number; search?: string }
  ): Promise<{
    items: (GroupWithCounts & {
      members: GroupMemberDetails[];
      currentUserRole: 'admin' | 'member' | null;
    })[];
    hasMore: boolean;
  }> {
    const { resolveAvatarUrlSync, resolveGroupAvatarUrlSync } = await import('@/lib/avatar-utils');

    const page = options?.page || 1;
    const limit = options?.limit || 20;
    const offset = (page - 1) * limit;

    const whereClause = {
      members: {
        some: { userId },
      },
      ...(options?.search && {
        OR: [{ name: { contains: options.search } }, { description: { contains: options.search } }],
      }),
    };

    const groups = await db.group.findMany({
      where: whereClause,
      include: {
        _count: {
          select: {
            members: true,
            lists: true,
          },
        },
        members: {
          include: {
            user: true,
          },
          take: 5, // Limit for performance
        },
      },
      orderBy: { updatedAt: 'desc' },
      take: limit + 1,
      skip: offset,
    });

    const hasMore = groups.length > limit;
    if (hasMore) {
      groups.pop();
    }

    // Resolve avatar URLs for groups and members, and add currentUserRole
    const groupsWithResolvedAvatars = groups.map((group) => {
      // Find the current user's membership in this group
      const currentUserMembership = group.members.find((m) => m.userId === userId);
      const currentUserRole = currentUserMembership?.role as 'admin' | 'member' | null;

      return {
        ...group,
        avatarUrl: resolveGroupAvatarUrlSync(group),
        currentUserRole: currentUserRole || null, // Add the currentUserRole field
        members: group.members.map((member) => ({
          ...member,
          user: {
            ...member.user,
            avatarUrl: resolveAvatarUrlSync(member.user),
          },
        })),
      };
    });

    return {
      items: groupsWithResolvedAvatars,
      hasMore,
    };
  }

  async getGroupsCount(userId: string): Promise<{ count: number }> {
    const count = await db.group.count({
      where: {
        members: {
          some: { userId },
        },
      },
    });
    return { count };
  }
}

// Export singleton instance for backward compatibility
export const groupService = new GroupService();
