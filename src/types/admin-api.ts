/**
 * Type definitions for admin API routes
 */

// System configuration types
export interface SystemConfigCategory {
  instance?: InstanceSettings;
  landing?: LandingSettings;
  features?: FeaturesSettings;
  limits?: LimitsSettings;
  security?: SecuritySettings;
  email?: EmailSettings;
  moderation?: ModerationSettings;
}

export interface InstanceSettings {
  name?: string;
  description?: string;
  contact_email?: string;
  homepage_url?: string;
  logo_url?: string;
}

export interface LandingSettings {
  hero_title?: string;
  hero_subtitle?: string;
  hero_cta_primary_text?: string;
  hero_cta_primary_link?: string;
  hero_cta_secondary_text?: string;
  hero_cta_secondary_link?: string;
  feature_1_title?: string;
  feature_1_description?: string;
  feature_2_title?: string;
  feature_2_description?: string;
  feature_3_title?: string;
  feature_3_description?: string;
  footer_text?: string;
}

export interface FeaturesSettings {
  user_registration?: boolean;
  public_lists?: boolean;
  anonymous_reservations?: boolean;
  group_invitations?: boolean;
  image_uploads?: boolean;
}

export interface LimitsSettings {
  max_wishes_per_list?: number;
  max_lists_per_user?: number;
  max_image_size_mb?: number;
  max_description_length?: number;
  max_list_name_length?: number;
  virtualization_threshold?: number;
}

export interface SecuritySettings {
  session_timeout_hours?: number;
  require_email_verification?: boolean;
  password_min_length?: number;
  max_login_attempts?: number;
  lockout_duration_minutes?: number;
}

export interface EmailSettings {
  smtp_enabled?: boolean;
  smtp_host?: string;
  smtp_port?: number;
  smtp_secure?: boolean;
  smtp_user?: string;
  smtp_from_name?: string;
  smtp_from_email?: string;
}

export interface ModerationSettings {
  auto_approve_content?: boolean;
  require_approval_for_new_users?: boolean;
  flag_threshold_auto_hide?: number;
  flag_threshold_admin_review?: number;
}

// Content flag types
export type ContentType = 'wish' | 'list' | 'user';
export type FlagStatus = 'pending' | 'resolved' | 'dismissed';
export type ModerationAction = 'approve' | 'remove' | 'dismiss' | 'suspend_user';

export interface ContentFlag {
  id: string;
  contentType: string;
  contentId: string;
  reason: string;
  description: string | null;
  reportedBy: string | null;
  status: string;
  createdAt: Date;
  resolvedAt: Date | null;
  resolvedBy: string | null;
  metadata: string | null;
  reporter?: {
    id: string;
    email: string;
    name: string | null;
    avatarUrl: string | null;
  } | null;
  resolver?: {
    id: string;
    email: string;
    name: string | null;
    avatarUrl: string | null;
  } | null;
}

export interface ContentDetails {
  wish?: {
    id: string;
    title: string;
    imageUrl: string | null;
    user: {
      id: string;
      email: string;
      name: string | null;
    };
  };
  list?: {
    id: string;
    name: string;
    description: string | null;
    visibility: string;
    user: {
      id: string;
      email: string;
      name: string | null;
    };
  };
  user?: {
    id: string;
    email: string;
    name: string | null;
    avatarUrl: string | null;
    role: string;
    suspendedAt: Date | null;
  };
}

export interface ContentFlagWithDetails extends ContentFlag {
  contentDetails: ContentDetails[keyof ContentDetails] | null;
}

// Resolution metadata types
export interface ResolutionMetadata {
  resolution?: {
    action: string;
    notes?: string;
    actionResult?: string | null;
    resolvedAt: string;
  };
  [key: string]: unknown;
}

// Type guards
export function isValidContentType(value: string): value is ContentType {
  return ['wish', 'list', 'user'].includes(value);
}

export function isValidFlagStatus(value: string): value is FlagStatus {
  return ['pending', 'resolved', 'dismissed'].includes(value);
}

export function isValidModerationAction(value: string): value is ModerationAction {
  return ['approve', 'remove', 'dismiss', 'suspend_user'].includes(value);
}

// Request/Response types for API routes
export interface ApiResponse<T = unknown> {
  success?: boolean;
  data?: T;
  error?: string;
  message?: string;
  details?: string;
  field?: string;
  code?: string;
}

export interface PaginatedResponse<T> extends ApiResponse<T[]> {
  total: number;
  limit: number;
  offset: number;
}

// Generic request body type with unknown properties
export interface RequestBody {
  [key: string]: unknown;
}

// Error logging types
export interface ErrorLogRequest extends RequestBody {
  type: 'client' | 'server' | 'api' | 'database';
  level: 'error' | 'warning' | 'info';
  message: string;
  stack?: string;
  url?: string;
  userAgent?: string;
  sessionId?: string;
  requestId?: string;
  method?: string;
  statusCode?: number;
  responseTime?: number;
  metadata?: Record<string, unknown>;
}

// Configuration types
export interface SystemConfigValue {
  key: string;
  value: string;
  type: 'string' | 'number' | 'boolean' | 'json';
  isPublic: boolean;
  updatedAt: Date;
}

export interface ConfigurationRequest extends RequestBody {
  [key: string]: string | number | boolean | Record<string, unknown>;
}

// Moderation request types
export interface ModerationRequest extends RequestBody {
  action: ModerationAction;
  notes?: string;
  reason?: string;
}

// Legal document request types
export interface LegalDocumentRequest extends RequestBody {
  type?: string;
  title?: string;
  content?: string;
  version?: string;
  effectiveDate?: string;
  isActive?: boolean;
}

// User management types
export interface UserSuspensionRequest extends RequestBody {
  reason: string;
  duration?: number; // in days
  notes?: string;
}

export interface BulkUserRequest extends RequestBody {
  userIds: string[];
  action: 'suspend' | 'unsuspend' | 'delete' | 'role_change';
  reason?: string;
  newRole?: string;
}

// Common API request patterns
export interface GenericJsonRequest extends RequestBody {
  [key: string]: unknown;
}

// Common pattern for type assertions in API routes
export type SafeRequestBody = Record<string, unknown>;
