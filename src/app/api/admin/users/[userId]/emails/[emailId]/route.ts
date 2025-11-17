import { NextRequest, NextResponse } from 'next/server';

import { getCurrentAdmin } from '@/lib/auth-admin';
import { db } from '@/lib/db';
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

    // Fetch the email to verify it exists and belongs to user
    const userEmail = await db.userEmail.findFirst({
      where: {
        id: emailId,
        userId,
      },
    });

    if (!userEmail) {
      return NextResponse.json(
        { error: getUserFriendlyError('NOT_FOUND', 'Email not found'), code: 'NOT_FOUND' },
        { status: 404 }
      );
    }

    // Safety check: Cannot delete the only email
    const emailCount = await db.userEmail.count({
      where: { userId },
    });

    if (emailCount === 1) {
      return NextResponse.json(
        {
          error: getUserFriendlyError(
            'VALIDATION_ERROR',
            'Cannot remove the only email address'
          ),
          code: 'VALIDATION_ERROR',
        },
        { status: 400 }
      );
    }

    // Safety check: Cannot delete the only verified email
    const verifiedCount = await db.userEmail.count({
      where: { userId, isVerified: true },
    });

    if (verifiedCount === 1 && userEmail.isVerified) {
      return NextResponse.json(
        {
          error: getUserFriendlyError(
            'VALIDATION_ERROR',
            'Cannot remove the only verified email address'
          ),
          code: 'VALIDATION_ERROR',
        },
        { status: 400 }
      );
    }

    // Safety check: Cannot delete primary email
    if (userEmail.isPrimary) {
      return NextResponse.json(
        {
          error: getUserFriendlyError(
            'VALIDATION_ERROR',
            'Cannot remove primary email. Set another email as primary first.'
          ),
          code: 'VALIDATION_ERROR',
        },
        { status: 400 }
      );
    }

    // Delete email
    await db.userEmail.delete({
      where: { id: emailId },
    });

    return NextResponse.json({ success: true, message: 'Email removed successfully' });
  } catch (error) {
    logger.error({ error: error }, 'Admin delete email error');
    return NextResponse.json(
      { error: 'Something went wrong. Please try again', code: 'INTERNAL_ERROR' },
      { status: 500 }
    );
  }
}
