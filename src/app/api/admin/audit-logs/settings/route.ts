import { NextRequest, NextResponse } from 'next/server';

import { getCurrentAdmin } from '@/lib/auth-admin';
import { handleApiError, getUserFriendlyError } from '@/lib/errors';
import { rateLimiter, getRateLimitHeaders } from '@/lib/rate-limiter';
import { UpdateAuditLogSettingsSchema, AuditActions } from '@/lib/schemas/audit-log';
import { auditService } from '@/lib/services/audit-service';

/**
 * GET /api/admin/audit-logs/settings
 *
 * Returns current audit log settings (category toggles) for admin dashboard.
 *
 * Returns:
 * - 200: { id, authEnabled, userManagementEnabled, contentEnabled, adminEnabled, updatedAt }
 * - 401: Unauthorized - not authenticated
 * - 403: Forbidden - not an admin
 * - 429: Too many requests - rate limit exceeded
 * - 500: Internal Server Error
 *
 * @requires Admin authentication and authorization
 * @security Admin-only endpoint with rate limiting (30 req/min)
 */
export async function GET(_request: NextRequest) {
  try {
    // Verify admin access
    const admin = await getCurrentAdmin();
    if (!admin) {
      return NextResponse.json(
        { error: getUserFriendlyError('UNAUTHORIZED'), code: 'UNAUTHORIZED' },
        { status: 401 }
      );
    }

    // Apply rate limiting (30 requests per minute per admin user)
    const rateLimitResult = await rateLimiter.check('admin-audit-logs-settings', admin.id);
    if (!rateLimitResult.allowed) {
      return NextResponse.json(
        {
          error: getUserFriendlyError('RATE_LIMIT_EXCEEDED'),
          code: 'RATE_LIMIT_EXCEEDED',
          retryAfter: rateLimitResult.retryAfter,
        },
        {
          status: 429,
          headers: getRateLimitHeaders(rateLimitResult),
        }
      );
    }

    // Get current settings
    const settings = await auditService.getSettings();

    // Return response with rate limit headers
    return NextResponse.json(
      {
        id: settings.id,
        authEnabled: settings.authEnabled,
        userManagementEnabled: settings.userManagementEnabled,
        contentEnabled: settings.contentEnabled,
        adminEnabled: settings.adminEnabled,
        updatedAt: settings.updatedAt.toISOString(),
      },
      {
        headers: getRateLimitHeaders(rateLimitResult),
      }
    );
  } catch (error) {
    return handleApiError(error);
  }
}

/**
 * PATCH /api/admin/audit-logs/settings
 *
 * Updates audit log category toggles.
 *
 * Request Body (all fields optional):
 * - authEnabled: boolean
 * - userManagementEnabled: boolean
 * - contentEnabled: boolean
 * - adminEnabled: boolean
 *
 * Returns:
 * - 200: Updated settings object
 * - 400: Bad Request - invalid request body
 * - 401: Unauthorized - not authenticated
 * - 403: Forbidden - not an admin
 * - 429: Too many requests - rate limit exceeded
 * - 500: Internal Server Error
 *
 * @requires Admin authentication and authorization
 * @security Admin-only endpoint with rate limiting (30 req/min)
 * @audit Logs settings changes to audit log (category: 'admin', action: 'settings_changed')
 */
export async function PATCH(request: NextRequest) {
  try {
    // Verify admin access
    const admin = await getCurrentAdmin();
    if (!admin) {
      return NextResponse.json(
        { error: getUserFriendlyError('UNAUTHORIZED'), code: 'UNAUTHORIZED' },
        { status: 401 }
      );
    }

    // Apply rate limiting (30 requests per minute per admin user)
    const rateLimitResult = await rateLimiter.check('admin-audit-logs-settings', admin.id);
    if (!rateLimitResult.allowed) {
      return NextResponse.json(
        {
          error: getUserFriendlyError('RATE_LIMIT_EXCEEDED'),
          code: 'RATE_LIMIT_EXCEEDED',
          retryAfter: rateLimitResult.retryAfter,
        },
        {
          status: 429,
          headers: getRateLimitHeaders(rateLimitResult),
        }
      );
    }

    // Parse and validate request body
    let body: unknown;
    try {
      body = await request.json();
    } catch {
      return NextResponse.json(
        { error: 'Invalid JSON in request body', code: 'VALIDATION_ERROR' },
        { status: 400 }
      );
    }

    const parseResult = UpdateAuditLogSettingsSchema.safeParse(body);
    if (!parseResult.success) {
      return NextResponse.json(
        {
          error: 'Invalid request body',
          code: 'VALIDATION_ERROR',
          details: parseResult.error.issues,
        },
        { status: 400 }
      );
    }

    const updates = parseResult.data;

    // Check if there are any updates to apply
    if (Object.keys(updates).length === 0) {
      return NextResponse.json(
        { error: 'No settings to update', code: 'VALIDATION_ERROR' },
        { status: 400 }
      );
    }

    // Get current settings before update (for audit log details)
    const previousSettings = await auditService.getSettings();

    // Update settings
    const updatedSettings = await auditService.updateSettings(updates);

    // Log the settings change to audit log (fire-and-forget)
    // Extract IP and user agent for security tracking
    const ipAddress =
      request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ||
      request.headers.get('x-real-ip') ||
      undefined;
    const userAgent = request.headers.get('user-agent') || undefined;

    auditService.log({
      actorId: admin.id,
      actorName: admin.name || admin.email,
      actorType: 'user',
      category: 'admin',
      action: AuditActions.SETTINGS_CHANGED,
      resourceType: 'audit_log_settings',
      resourceId: updatedSettings.id,
      resourceName: 'Audit Log Settings',
      details: {
        changes: updates,
        previous: {
          authEnabled: previousSettings.authEnabled,
          userManagementEnabled: previousSettings.userManagementEnabled,
          contentEnabled: previousSettings.contentEnabled,
          adminEnabled: previousSettings.adminEnabled,
        },
      },
      ipAddress,
      userAgent,
    });

    // Return updated settings with rate limit headers
    return NextResponse.json(
      {
        id: updatedSettings.id,
        authEnabled: updatedSettings.authEnabled,
        userManagementEnabled: updatedSettings.userManagementEnabled,
        contentEnabled: updatedSettings.contentEnabled,
        adminEnabled: updatedSettings.adminEnabled,
        updatedAt: updatedSettings.updatedAt.toISOString(),
      },
      {
        headers: getRateLimitHeaders(rateLimitResult),
      }
    );
  } catch (error) {
    return handleApiError(error);
  }
}
