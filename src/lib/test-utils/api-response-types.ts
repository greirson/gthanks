/**
 * Type definitions for API responses in tests
 * These types should match the actual API responses
 */
import type {
  GroupInvitationDetails,
  GroupMemberDetails,
  GroupWithCounts,
  ListWithOwner,
  GroupWithDetails as _GroupWithDetails,
} from '@/lib/services/group-types';

// Error response type
export interface ErrorResponse {
  error: string;
  code?: string;
}

// Success response type
export interface SuccessResponse {
  success: boolean;
  message?: string;
}

// Groups API responses
export interface GroupsListResponse {
  items: (GroupWithCounts & { members: GroupMemberDetails[] })[];
  pagination: {
    hasMore: boolean;
    limit: number;
    offset: number;
    currentPage: number;
    totalPages?: number;
  };
}

export interface GroupResponse extends GroupWithCounts {
  members: GroupMemberDetails[];
}

// Members API responses
export interface MembersListResponse {
  members: GroupMemberDetails[];
}

// Invitations API responses
export interface InvitationsListResponse {
  invitations: GroupInvitationDetails[];
}

export interface InviteUsersResponse {
  sent: number;
  failed: number;
  invitations: Array<{
    email: string;
    status: 'sent' | 'failed';
    reason?: string;
  }>;
}

// Lists API responses
export interface ListsResponse {
  lists: ListWithOwner[];
}

// Bulk actions responses
export interface BulkDeleteResponse {
  success: boolean;
  deletedCount: number;
}

export interface BulkAddToListResponse {
  success: boolean;
  addedCount: number;
}

export interface BulkRemoveFromListsResponse {
  success: boolean;
  removedCount: number;
}

// Generic action response
export interface ActionResponse {
  success: boolean;
  action?: string;
  [key: string]: unknown;
}

// Helper type for responses that can be either success or error
export type ApiResponse<T> = T | ErrorResponse;

// Type guard functions
export function isErrorResponse(response: unknown): response is ErrorResponse {
  return (
    typeof response === 'object' &&
    response !== null &&
    'error' in response &&
    typeof (response as { error: unknown }).error === 'string'
  );
}

export function isSuccessResponse(response: unknown): response is SuccessResponse {
  return (
    typeof response === 'object' &&
    response !== null &&
    'success' in response &&
    typeof (response as { success: unknown }).success === 'boolean'
  );
}
