import { NextRequest, NextResponse } from 'next/server';

import { getCurrentUser } from '@/lib/auth-utils';
import { getUserFriendlyError } from '@/lib/errors';
import { AuditActions } from '@/lib/schemas/audit-log';
import { auditService } from '@/lib/services/audit-service';
import { userService } from '@/lib/services/user-service';
import { logger } from '@/lib/services/logger';
// eslint-disable-next-line local-rules/no-direct-db-import -- Read-only query for email lookup before deletion
import { db } from '@/lib/db';

/**
 * Handles DELETE requests for removing an email from the user's account
 *
 * @description Deletes an email address with proper validation and constraint enforcement
 * @param {NextRequest} request - The incoming HTTP request object
 * @param {Object} params - Route parameters containing the email ID
 * @returns {Promise<NextResponse>} JSON response confirming deletion
 *
 * @throws {401} Unauthorized - Valid session required
 * @throws {403} Forbidden - Email belongs to another user
 * @throws {400} Bad Request - Cannot delete only email or primary email
 * @throws {404} Not Found - Email not found
 * @throws {500} Internal Server Error - Database errors
 *
 * @example
 * // Delete an email
 * DELETE /api/user/emails/abc123
 *
 * @see {@link getCurrentUser} for unified authentication
 * @see {@link userService.deleteEmail} for service implementation
 */
export async function DELETE(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const user = await getCurrentUser();
    if (!user?.id) {
      return NextResponse.json(
        { error: getUserFriendlyError('UNAUTHORIZED'), code: 'UNAUTHORIZED' },
        { status: 401 }
      );
    }

    const emailId = params.id;

    // Get email for audit log before deletion
    const emailRecord = await db.userEmail.findUnique({
      where: { id: emailId },
      select: { email: true },
    });

    // Use service layer
    await userService.deleteEmail(user.id, emailId);

    // Fire and forget audit log
    auditService.log({
      actorId: user.id,
      actorName: user.name || user.email || undefined,
      actorType: 'user',
      category: 'user',
      action: AuditActions.EMAIL_REMOVED,
      resourceType: 'user_email',
      resourceId: emailId,
      resourceName: emailRecord?.email || undefined,
    });

    return NextResponse.json({
      success: true,
      message: 'Email address removed successfully',
    });
  } catch (error) {
    logger.error({ error: error }, 'Delete email error');
    return NextResponse.json(
      { error: getUserFriendlyError('INTERNAL_ERROR'), code: 'INTERNAL_ERROR' },
      { status: 500 }
    );
  }
}
