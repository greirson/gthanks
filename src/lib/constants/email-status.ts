// src/lib/constants/email-status.ts

export enum EmailStatus {
  PENDING = 'pending',
  SENDING = 'sending',
  SENT = 'sent',
  FAILED = 'failed',
  BOUNCED = 'bounced',
  COMPLAINED = 'complained', // Spam complaint
}

export interface EmailMetadata {
  // Common metadata
  source: 'group_invitation' | 'password_reset' | 'system' | 'admin';
  userId?: string;
  groupId?: string;
  invitationId?: string;

  // Template variables used
  variables?: Record<string, unknown>;

  // SMTP provider info
  provider?: 'smtp' | 'sendgrid' | 'ses' | 'dev';

  // Error details
  errorCode?: string;
  errorType?: 'temporary' | 'permanent';

  // Tracking
  ipAddress?: string;
  userAgent?: string;
}

export interface EmailError {
  code: string;
  message: string;
  type: 'temporary' | 'permanent';
  details?: unknown;
}

export const RETRY_DELAYS = {
  1: 60, // 1 minute
  2: 300, // 5 minutes
  3: 900, // 15 minutes
  4: 3600, // 1 hour
  5: 14400, // 4 hours
} as const;

export const MAX_RETRY_ATTEMPTS = 5;

export function getNextRetryTime(attempts: number): Date | null {
  if (attempts >= MAX_RETRY_ATTEMPTS) {
    return null;
  }

  const delaySeconds = RETRY_DELAYS[attempts as keyof typeof RETRY_DELAYS] || 3600;
  return new Date(Date.now() + delaySeconds * 1000);
}

export function isRetryableError(error: EmailError): boolean {
  return error.type === 'temporary';
}
