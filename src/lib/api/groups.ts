import { z } from 'zod';

import { apiDelete, apiGet, apiPatch, apiPost } from '@/lib/api-client';
import { SuccessResponse, SuccessResponseSchema } from '@/lib/validators/api-responses';
import { ListWithOwner } from '@/lib/validators/api-responses/lists';
import {
  GroupInvitationDetails,
  GroupInvitationDetailsSchema,
  GroupInvitationResponse,
  GroupInvitationResponseSchema,
  GroupMemberDetails,
  GroupMemberDetailsSchema,
  GroupWithCounts,
  GroupWithCountsSchema,
  GroupWithDetails,
  GroupWithDetailsSchema,
  GroupsCount,
  GroupsCountSchema,
  PaginatedGroupsResponse,
  PaginatedGroupsResponseSchema,
} from '@/lib/validators/api-responses/groups';
import { ListWithOwnerSchema } from '@/lib/validators/api-responses/lists';
import {
  GroupCreateInput,
  GroupInviteInput,
  GroupMemberInput,
  GroupShareListsInput,
  GroupUpdateInput,
} from '@/lib/validators/group';

// Schema for paginated group lists result
const PaginatedGroupListsResultSchema = z.object({
  lists: z.array(ListWithOwnerSchema),
  hasMore: z.boolean(),
});

export interface PaginatedGroupListsResult {
  lists: ListWithOwner[];
  hasMore: boolean;
}

export const groupsApi = {
  // Get user's groups
  getGroups: async (options?: {
    page?: number;
    limit?: number;
    search?: string;
  }): Promise<PaginatedGroupsResponse> => {
    const params = new URLSearchParams();
    if (options?.page) {
      params.append('page', options.page.toString());
    }
    if (options?.limit) {
      params.append('limit', options.limit.toString());
    }
    if (options?.search) {
      params.append('search', options.search);
    }

    const url = `/api/groups${params.toString() ? `?${params.toString()}` : ''}`;
    return apiGet(url, PaginatedGroupsResponseSchema);
  },

  // Create new group
  createGroup: async (data: GroupCreateInput): Promise<GroupWithDetails> => {
    return apiPost('/api/groups', data, GroupWithDetailsSchema);
  },

  // Get group by ID
  getGroup: async (id: string): Promise<GroupWithDetails> => {
    return apiGet(`/api/groups/${id}`, GroupWithDetailsSchema);
  },

  // Get lightweight group base info
  getGroupBaseInfo: async (
    id: string
  ): Promise<Omit<GroupWithDetails, 'members' | 'lists' | 'invitations'>> => {
    const baseInfoSchema = GroupWithDetailsSchema.omit({
      members: true,
      lists: true,
      invitations: true,
    });
    return apiGet(`/api/groups/${id}/base`, baseInfoSchema);
  },

  // Update group
  updateGroup: async (id: string, data: GroupUpdateInput): Promise<GroupWithDetails> => {
    return apiPatch(`/api/groups/${id}`, data, GroupWithDetailsSchema);
  },

  // Delete group
  deleteGroup: async (id: string): Promise<void> => {
    return apiDelete(`/api/groups/${id}`);
  },

  // Group Members
  getMembers: async (groupId: string): Promise<GroupMemberDetails[]> => {
    return apiGet(`/api/groups/${groupId}/members`, z.array(GroupMemberDetailsSchema));
  },

  addMember: async (groupId: string, member: GroupMemberInput): Promise<void> => {
    return apiPost(`/api/groups/${groupId}/members`, member, z.void());
  },

  removeMember: async (groupId: string, userId: string): Promise<void> => {
    return apiDelete(`/api/groups/${groupId}/members/${userId}`);
  },

  // Group Invitations
  getInvitations: async (groupId: string): Promise<GroupInvitationDetails[]> => {
    return apiGet(`/api/groups/${groupId}/invitations`, z.array(GroupInvitationDetailsSchema));
  },

  inviteUsers: async (groupId: string, invitation: GroupInviteInput): Promise<void> => {
    return apiPost(`/api/groups/${groupId}/invitations`, invitation, z.void());
  },

  respondToInvitation: async (
    groupId: string,
    invitationId: string,
    action: 'accept' | 'decline'
  ): Promise<GroupInvitationResponse> => {
    return apiPatch(
      `/api/groups/${groupId}/invitations/${invitationId}`,
      { action },
      GroupInvitationResponseSchema
    );
  },

  cancelInvitation: async (groupId: string, invitationId: string): Promise<void> => {
    return apiDelete(`/api/groups/${groupId}/invitations/${invitationId}`);
  },

  // Group Lists
  getLists: async (
    groupId: string,
    options?: { page?: number; limit?: number; search?: string }
  ): Promise<PaginatedGroupListsResult> => {
    const params = new URLSearchParams();
    if (options?.page) {
      params.append('page', options.page.toString());
    }
    if (options?.limit) {
      params.append('limit', options.limit.toString());
    }
    if (options?.search) {
      params.append('search', options.search);
    }

    const url = `/api/groups/${groupId}/lists${params.toString() ? `?${params.toString()}` : ''}`;
    return apiGet(url, PaginatedGroupListsResultSchema);
  },

  shareLists: async (groupId: string, data: GroupShareListsInput): Promise<SuccessResponse> => {
    return apiPost(`/api/groups/${groupId}/lists`, data, SuccessResponseSchema);
  },

  removeList: async (groupId: string, listId: string): Promise<void> => {
    return apiDelete(`/api/groups/${groupId}/lists/${listId}`);
  },

  // Get groups that contain a specific list
  getGroupsForList: async (listId: string): Promise<GroupWithCounts[]> => {
    return apiGet(`/api/lists/${listId}/groups`, z.array(GroupWithCountsSchema));
  },

  // Get groups count
  getGroupsCount: async (): Promise<GroupsCount> => {
    return apiGet('/api/groups/count', GroupsCountSchema);
  },
};
