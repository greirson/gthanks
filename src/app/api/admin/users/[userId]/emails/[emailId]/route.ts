import { NextRequest, NextResponse } from 'next/server';

import { getCurrentAdmin } from '@/lib/auth-admin';
import { userService } from '@/lib/services/user-service';
import { getUserFriendlyError } from '@/lib/errors';
import { logger } from '@/lib/services/logger';

interface RouteParams {
  params: {
    userId: string;
    emailId: string;
  };
}

/**
 * DELETE /api/admin/users/[userId]/emails/[emailId]
 * Remove email from user
 */
export async function DELETE(request: NextRequest, { params }: RouteParams) {
  try {
    // Check admin authorization
    const admin = await getCurrentAdmin();
    if (!admin) {
      return NextResponse.json(
        { error: getUserFriendlyError('UNAUTHORIZED'), code: 'UNAUTHORIZED' },
        { status: 401 }
      );
    }

    const { userId, emailId } = params;

    // Delete email using service (includes all safety checks)
    try {
      await userService.deleteEmail(userId, emailId);
      return NextResponse.json({ success: true, message: 'Email removed successfully' });
    } catch (error: unknown) {
      // Handle NotFoundError
      const errorMessage = error instanceof Error ? error.message : String(error);
      if (errorMessage.includes('not found')) {
        return NextResponse.json(
          { error: getUserFriendlyError('NOT_FOUND', 'Email not found'), code: 'NOT_FOUND' },
          { status: 404 }
        );
      }

      // Handle ValidationError (safety checks)
      if (errorMessage.includes('Cannot remove')) {
        return NextResponse.json(
          {
            error: getUserFriendlyError('VALIDATION_ERROR', errorMessage),
            code: 'VALIDATION_ERROR',
          },
          { status: 400 }
        );
      }

      throw error;
    }
  } catch (error) {
    logger.error({ error: error }, 'Admin delete email error');
    return NextResponse.json(
      { error: 'Something went wrong. Please try again', code: 'INTERNAL_ERROR' },
      { status: 500 }
    );
  }
}
