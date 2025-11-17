import { NextRequest, NextResponse } from 'next/server';

import { getCurrentAdmin } from '@/lib/auth-admin';
import { db } from '@/lib/db';
import { getUserFriendlyError } from '@/lib/errors';
import { updateEmailPrimaryStatus } from '@/lib/utils/email-constraints';
import { logger } from '@/lib/services/logger';

interface RouteParams {
  params: {
    userId: string;
    emailId: string;
  };
}

/**
 * POST /api/admin/users/[userId]/emails/[emailId]/set-primary
 * Set email as primary for user
 */
export async function POST(request: NextRequest, { params }: RouteParams) {
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

    // Fetch email to verify it exists and belongs to user
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

    // Safety check: Cannot set unverified email as primary
    if (!userEmail.isVerified) {
      return NextResponse.json(
        {
          error: getUserFriendlyError(
            'VALIDATION_ERROR',
            'Cannot set unverified email as primary'
          ),
          code: 'VALIDATION_ERROR',
        },
        { status: 400 }
      );
    }

    // Idempotent: If already primary, return success
    if (userEmail.isPrimary) {
      return NextResponse.json({
        success: true,
        message: 'Email is already primary',
        email: userEmail,
      });
    }

    // Set as primary (uses transaction to ensure consistency)
    await updateEmailPrimaryStatus(db, emailId, true);

    // Fetch updated email
    const updatedEmail = await db.userEmail.findUnique({
      where: { id: emailId },
    });

    return NextResponse.json({
      success: true,
      message: 'Email set as primary successfully',
      email: updatedEmail,
    });
  } catch (error) {
    logger.error({ error: error }, 'Admin set primary email error');
    return NextResponse.json(
      { error: 'Something went wrong. Please try again', code: 'INTERNAL_ERROR' },
      { status: 500 }
    );
  }
}
