// API Client Exports
// Centralized exports for the modernized API client infrastructure

// Core API client and error handling
export { safeFetch, apiGet, apiPost, apiPut, apiPatch, apiDelete, ApiError } from '../api-client';

// Feature-specific API modules
export { groupsApi } from './groups';
export { wishesApi } from './wishes';
export { listsApi } from './lists';
export { reservationsApi } from './reservations';
export { adminApi } from './admin';

// Re-export types for convenience
export type {
  // Admin types
  QueueStatus,
  StorageStats,
  EmailStats,
  SystemHealth,
  EmailConfig,
  EmailStatus,
  EmailTestResponse,
} from './admin';

export type {
  // Groups types
  GroupWithCounts,
  GroupWithDetails,
  GroupMemberDetails,
  GroupInvitationDetails,
  ListWithOwner,
  PaginatedGroupsResponse,
  GroupsCount,
  GroupInvitationResponse,
} from '../validators/api-responses/groups';

export type {
  // Wishes types
  Wish,
  WishMetadata,
  PaginatedWishesResponse,
  BulkWishOperationResult,
} from '../validators/api-responses/wishes';

export type {
  // Lists types
  ListWithDetails,
  PaginatedListsResponse,
} from '../validators/api-responses/lists';

export type {
  // Reservations types
  ReservationCreateResponse,
} from '../validators/api-responses/reservations';
