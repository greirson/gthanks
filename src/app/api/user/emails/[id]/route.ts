import { NextRequest, NextResponse } from 'next/server';

import { getCurrentUser } from '@/lib/auth-utils';
import { getUserFriendlyError } from '@/lib/errors';
import { db } from '@/lib/db';
import { logger } from '@/lib/services/logger';

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
 */
export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const user = await getCurrentUser();
    if (!user?.id) {
      return NextResponse.json(
        { error: getUserFriendlyError('UNAUTHORIZED'), code: 'UNAUTHORIZED' },
        { status: 401 }
      );
    }

    const emailId = params.id;

    // Get the email to verify ownership
    const email = await db.userEmail.findUnique({
      where: { id: emailId },
    });

    if (!email) {
      return NextResponse.json(
        { error: getUserFriendlyError('NOT_FOUND', 'Email not found'), code: 'NOT_FOUND' },
        { status: 404 }
      );
    }

    // Check if email belongs to the authenticated user
    if (email.userId !== user.id) {
      return NextResponse.json(
        {
          error: getUserFriendlyError('FORBIDDEN', 'You do not have permission to delete this email'),
          code: 'FORBIDDEN',
        },
        { status: 403 }
      );
    }

    // Check if this is the primary email
    if (email.isPrimary) {
      return NextResponse.json(
        {
          error: getUserFriendlyError('INVALID_OPERATION', 'Cannot delete primary email. Please set another email as primary first.'),
          code: 'INVALID_OPERATION',
        },
        { status: 400 }
      );
    }

    // Check if this is the only email
    const emailCount = await db.userEmail.count({
      where: { userId: user.id },
    });

    if (emailCount === 1) {
      return NextResponse.json(
        {
          error: getUserFriendlyError('INVALID_OPERATION', 'Cannot delete the only email address. Your account must have at least one email.'),
          code: 'INVALID_OPERATION',
        },
        { status: 400 }
      );
    }

    // Delete the email
    await db.userEmail.delete({
      where: { id: emailId },
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
