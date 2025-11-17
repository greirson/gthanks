import { z } from 'zod';

import { ListWithOwnerSchema } from '@/lib/validators/api-responses/lists';
import { UnifiedPaginatedResponseSchema } from '@/lib/validators/pagination';
import {
  flexibleDateSchema,
  flexibleDateSchemaOptional,
} from '@/lib/validators/helpers/date-schema';

// Group member details schema for API responses
export const GroupMemberDetailsSchema = z.object({
  userId: z.string(),
  groupId: z.string(),
  role: z.string(),
  joinedAt: flexibleDateSchema(),
  invitedBy: z.string().nullable(),
  user: z.object({
    id: z.string(),
    name: z.string().nullable(),
    email: z.string(),
    avatarUrl: z.string().nullable(),
  }),
});

// Group with counts schema for list responses
export const GroupWithCountsSchema = z.object({
  id: z.string(),
  name: z.string(),
  description: z.string().nullable(),
  avatarUrl: z.string().nullable(),
  visibility: z.enum(['public', 'private']),
  createdAt: flexibleDateSchema(),
  updatedAt: flexibleDateSchema(),
  _count: z.object({
    members: z.number(),
    lists: z.number(),
  }),
  currentUserRole: z.enum(['admin', 'member']).nullable().optional(),
});

// Group invitation details schema
export const GroupInvitationDetailsSchema = z.object({
  id: z.string(),
  groupId: z.string(),
  email: z.string(),
  token: z.string(),
  invitedBy: z.string(),
  acceptedAt: flexibleDateSchemaOptional(),
  createdAt: flexibleDateSchema(),
  emailSentAt: flexibleDateSchemaOptional().optional(),
  emailStatus: z.string().nullable().optional(),
  emailAttempts: z.number().optional(),
  lastEmailError: z.string().nullable().optional(),
  reminderSentAt: flexibleDateSchemaOptional().optional(),
  reminderCount: z.number().optional(),
  inviter: z.object({
    id: z.string(),
    name: z.string().nullable(),
    email: z.string(),
    avatarUrl: z.string().nullable().optional(),
  }),
  group: z.object({
    id: z.string(),
    name: z.string(),
    description: z.string().nullable().optional(),
  }),
  status: z.enum(['pending', 'accepted']).optional(),
});

// Group with full details schema
export const GroupWithDetailsSchema = z.object({
  id: z.string(),
  name: z.string(),
  description: z.string().nullable(),
  avatarUrl: z.string().nullable(),
  visibility: z.enum(['public', 'private']),
  createdAt: flexibleDateSchema(),
  updatedAt: flexibleDateSchema(),
  members: z.array(GroupMemberDetailsSchema),
  lists: z.array(ListWithOwnerSchema),
  invitations: z.array(GroupInvitationDetailsSchema),
  currentUserRole: z.enum(['admin', 'member']).nullable().optional(),
  _count: z.object({
    members: z.number(),
    lists: z.number(),
  }),
});

// API response schemas using unified pagination
export const PaginatedGroupsResponseSchema = UnifiedPaginatedResponseSchema(GroupWithCountsSchema);

export const GroupInvitationResponseSchema = z.object({
  success: z.boolean(),
  message: z.string(),
});

export const GroupsCountSchema = z.object({
  count: z.number(),
});

// Import and re-export ListWithOwner from group-types
export type { ListWithOwner } from '@/lib/services/group-types';

// Export types
export type GroupMemberDetails = z.infer<typeof GroupMemberDetailsSchema>;
export type GroupInvitationDetails = z.infer<typeof GroupInvitationDetailsSchema>;
export type GroupWithCounts = z.infer<typeof GroupWithCountsSchema>;
export type GroupWithDetails = z.infer<typeof GroupWithDetailsSchema>;
export type PaginatedGroupsResponse = z.infer<typeof PaginatedGroupsResponseSchema>;
export type GroupInvitationResponse = z.infer<typeof GroupInvitationResponseSchema>;
export type GroupsCount = z.infer<typeof GroupsCountSchema>;
