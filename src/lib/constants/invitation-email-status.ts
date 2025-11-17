// src/lib/constants/invitation-email-status.ts

export enum InvitationEmailStatus {
  NOT_SENT = 'not_sent',
  SENT = 'sent',
  FAILED = 'failed',
  BOUNCED = 'bounced',
}

export interface InvitationEmailTracking {
  emailSentAt?: Date;
  emailStatus?: InvitationEmailStatus;
  emailAttempts: number;
  lastEmailError?: string;
  reminderSentAt?: Date;
  reminderCount: number;
}

export const MAX_INVITATION_EMAIL_ATTEMPTS = 3;
export const MAX_REMINDER_COUNT = 2;

export function canRetryInvitationEmail(invitation: InvitationEmailTracking): boolean {
  return (
    invitation.emailStatus !== InvitationEmailStatus.SENT &&
    invitation.emailStatus !== InvitationEmailStatus.BOUNCED &&
    invitation.emailAttempts < MAX_INVITATION_EMAIL_ATTEMPTS
  );
}

export function canSendReminder(invitation: InvitationEmailTracking): boolean {
  return (
    invitation.emailStatus === InvitationEmailStatus.SENT &&
    invitation.reminderCount < MAX_REMINDER_COUNT
  );
}

export function getReminderDelay(reminderCount: number): number {
  // Days until next reminder: 3, 7 days
  const delays = [3, 7];
  return delays[reminderCount] || 7;
}
