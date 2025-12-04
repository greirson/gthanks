import { z } from 'zod';

// =============================================================================
// Enums and Constants
// =============================================================================

export const AuditCategory = {
  AUTH: 'auth',
  USER: 'user',
  CONTENT: 'content',
  ADMIN: 'admin',
} as const;

export const AuditActorType = {
  USER: 'user',
  SYSTEM: 'system',
  ANONYMOUS: 'anonymous',
} as const;

export type AuditCategory = (typeof AuditCategory)[keyof typeof AuditCategory];
export type AuditActorType = (typeof AuditActorType)[keyof typeof AuditActorType];

// =============================================================================
// Input Schemas
// =============================================================================

/**
 * Schema for creating a new audit log entry
 * Used by audit-service.ts
 */
export const AuditLogEntrySchema = z.object({
  actorId: z.string().optional(),
  actorName: z.string().optional(),
  actorType: z.enum(['user', 'system', 'anonymous']),
  category: z.enum(['auth', 'user', 'content', 'admin']),
  action: z.string().min(1).max(100),
  resourceType: z.string().max(50).optional(),
  resourceId: z.string().optional(),
  resourceName: z.string().max(200).optional(),
  details: z.record(z.unknown()).optional(),
  ipAddress: z.string().max(45).optional(), // IPv6 max length
  userAgent: z.string().max(500).optional(),
});

export type AuditLogEntry = z.infer<typeof AuditLogEntrySchema>;

// =============================================================================
// Response Schemas
// =============================================================================

/**
 * Schema for audit log record from database
 * Used for API responses
 */
export const AuditLogSchema = z.object({
  id: z.string(),
  timestamp: z.string().datetime(),
  actorId: z.string().nullable(),
  actorName: z.string().nullable(),
  actorType: z.string(),
  category: z.string(),
  action: z.string(),
  resourceType: z.string().nullable(),
  resourceId: z.string().nullable(),
  resourceName: z.string().nullable(),
  details: z.string().nullable(),
  ipAddress: z.string().nullable(),
  userAgent: z.string().nullable(),
});

export type AuditLog = z.infer<typeof AuditLogSchema>;

/**
 * Pagination info for list responses
 */
export const PaginationSchema = z.object({
  page: z.number().int().positive(),
  pageSize: z.number().int().positive().max(100),
  total: z.number().int().nonnegative(),
  totalPages: z.number().int().nonnegative(),
});

export type Pagination = z.infer<typeof PaginationSchema>;

/**
 * Paginated audit logs response
 */
export const AuditLogListResponseSchema = z.object({
  data: z.array(AuditLogSchema),
  pagination: PaginationSchema,
});

export type AuditLogListResponse = z.infer<typeof AuditLogListResponseSchema>;

// =============================================================================
// Query Parameter Schemas
// =============================================================================

/**
 * Schema for GET /api/admin/audit-logs query parameters
 */
export const AuditLogQueryParamsSchema = z.object({
  page: z.coerce.number().int().positive().default(1),
  pageSize: z.coerce.number().int().positive().max(100).default(50),
  category: z.enum(['auth', 'user', 'content', 'admin']).optional(),
  actorId: z.string().optional(),
  startDate: z.string().datetime().optional(),
  endDate: z.string().datetime().optional(),
  search: z.string().max(100).optional(),
  since: z.string().datetime().optional(), // For polling - entries after this timestamp
});

export type AuditLogQueryParams = z.infer<typeof AuditLogQueryParamsSchema>;

/**
 * Schema for export query parameters
 */
export const AuditLogExportParamsSchema = AuditLogQueryParamsSchema.extend({
  format: z.enum(['csv', 'json']).default('csv'),
  limit: z.coerce.number().int().positive().max(1000).default(1000),
});

export type AuditLogExportParams = z.infer<typeof AuditLogExportParamsSchema>;

// =============================================================================
// Settings Schemas
// =============================================================================

/**
 * Schema for audit log settings (category toggles)
 */
export const AuditLogSettingsSchema = z.object({
  id: z.string(),
  authEnabled: z.boolean(),
  userManagementEnabled: z.boolean(),
  contentEnabled: z.boolean(),
  adminEnabled: z.boolean(),
  updatedAt: z.string().datetime(),
});

export type AuditLogSettings = z.infer<typeof AuditLogSettingsSchema>;

/**
 * Schema for updating audit log settings
 */
export const UpdateAuditLogSettingsSchema = z.object({
  authEnabled: z.boolean().optional(),
  userManagementEnabled: z.boolean().optional(),
  contentEnabled: z.boolean().optional(),
  adminEnabled: z.boolean().optional(),
});

export type UpdateAuditLogSettings = z.infer<typeof UpdateAuditLogSettingsSchema>;

// =============================================================================
// Action Constants (for type safety when logging)
// =============================================================================

export const AuditActions = {
  // Auth
  LOGIN_SUCCESS: 'login_success',
  LOGIN_FAILURE: 'login_failure',
  LOGOUT: 'logout',
  MAGIC_LINK_SENT: 'magic_link_sent',
  OAUTH_CONNECT: 'oauth_connect',
  TOKEN_CREATED: 'token_created',
  TOKEN_REVOKED: 'token_revoked',

  // User
  PROFILE_UPDATE: 'profile_update',
  EMAIL_ADDED: 'email_added',
  EMAIL_VERIFIED: 'email_verified',
  EMAIL_REMOVED: 'email_removed',
  USERNAME_CHANGED: 'username_changed',
  ACCOUNT_DELETED: 'account_deleted',

  // Content
  WISH_CREATED: 'wish_created',
  WISH_UPDATED: 'wish_updated',
  WISH_DELETED: 'wish_deleted',
  BULK_WISH_DELETE: 'bulk_wish_delete',
  BULK_WISH_ADD_TO_LIST: 'bulk_wish_add_to_list',
  BULK_WISH_REMOVE_FROM_LIST: 'bulk_wish_remove_from_list',
  LIST_CREATED: 'list_created',
  LIST_UPDATED: 'list_updated',
  LIST_DELETED: 'list_deleted',
  LIST_SHARED: 'list_shared',
  GROUP_CREATED: 'group_created',
  GROUP_UPDATED: 'group_updated',
  GROUP_DELETED: 'group_deleted',
  GROUP_MEMBER_ADDED: 'group_member_added',
  GROUP_MEMBER_REMOVED: 'group_member_removed',
  GROUP_MEMBER_LEFT: 'group_member_left',
  GROUP_ROLE_CHANGED: 'group_role_changed',
  RESERVATION_CREATED: 'reservation_created',
  RESERVATION_REMOVED: 'reservation_removed',
  RESERVATION_MARKED_PURCHASED: 'reservation_marked_purchased',
  RESERVATION_UNMARKED_PURCHASED: 'reservation_unmarked_purchased',
  BULK_RESERVATION_CANCEL: 'bulk_reservation_cancel',
  BULK_RESERVATION_PURCHASED: 'bulk_reservation_purchased',
  BULK_RESERVATION_UNPURCHASED: 'bulk_reservation_unpurchased',

  // Admin
  USER_SUSPENDED: 'user_suspended',
  USER_UNSUSPENDED: 'user_unsuspended',
  ADMIN_GRANTED: 'admin_granted',
  ADMIN_REVOKED: 'admin_revoked',
  SETTINGS_CHANGED: 'settings_changed',
  USER_UPDATED: 'user_updated',
  USER_VIEWED: 'user_viewed',
  USER_LIST_VIEWED: 'user_list_viewed',
  ADMIN_LOGOUT: 'admin_logout',
  ADMIN_ACTION_ATTEMPTED: 'admin_action_attempted',
  VANITY_ACCESS_CHANGED: 'vanity_access_changed',
  BULK_USER_OPERATION: 'bulk_user_operation',
} as const;

export type AuditAction = (typeof AuditActions)[keyof typeof AuditActions];
