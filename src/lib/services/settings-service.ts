import { db } from '@/lib/db';
import { sanitizeLoginMessage } from '@/lib/sanitize-html';
import { permissionService } from './permission-service';
import { ForbiddenError } from '@/lib/errors';
import { logAuditEvent } from './logger';

/**
 * Site Settings Service
 *
 * Manages global site settings including the login message banner.
 *
 * Security Features:
 * - Uses permissionService for authorization (not direct admin checks)
 * - Double sanitization: once before save, once on retrieval (defense in depth)
 * - Audit logging for all updates (adminId + timestamp)
 * - Singleton enforcement via upsert (id: 'global')
 */
export const settingsService = {
  /**
   * Get the current login message
   *
   * Returns the sanitized login message if it exists, otherwise null.
   * Applies double sanitization for defense in depth.
   *
   * @returns Sanitized login message or null
   */
  async getLoginMessage(): Promise<string | null> {
    const settings = await db.siteSettings.findUnique({
      where: { id: 'global' },
      select: { loginMessage: true },
    });

    // Double sanitization (defense in depth)
    if (settings?.loginMessage) {
      return sanitizeLoginMessage(settings.loginMessage);
    }

    return null;
  },

  /**
   * Update the login message
   *
   * Requires admin permission via permissionService.
   * Sanitizes message before saving to database.
   * Logs audit trail with adminId and timestamp.
   * Enforces singleton pattern via upsert.
   *
   * @param message - The new login message (HTML) or null to clear
   * @param adminId - The admin user ID performing the update
   * @throws ForbiddenError if user is not an admin
   */
  async updateLoginMessage(message: string | null, adminId: string): Promise<void> {
    // Use permissionService for authorization (CRITICAL from Zen feedback)
    const { allowed } = await permissionService.can(adminId, 'admin', {
      type: 'site-settings',
    });

    if (!allowed) {
      throw new ForbiddenError('Admin access required');
    }

    // Sanitize before saving (first layer of defense)
    const sanitized = message ? sanitizeLoginMessage(message) : null;

    // Upsert to enforce singleton (always id: 'global')
    await db.siteSettings.upsert({
      where: { id: 'global' },
      update: {
        loginMessage: sanitized,
        loginMessageUpdatedAt: new Date(),
        loginMessageUpdatedBy: adminId,
      },
      create: {
        id: 'global',
        loginMessage: sanitized,
        loginMessageUpdatedAt: new Date(),
        loginMessageUpdatedBy: adminId,
      },
    });

    // Audit log (required by Zen feedback)
    logAuditEvent('Login message updated', {
      adminId,
      timestamp: new Date().toISOString(),
      messageLength: sanitized?.length ?? 0,
    });
  },
};
