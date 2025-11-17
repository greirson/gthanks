import { NextRequest, NextResponse } from 'next/server';

import { getCurrentAdmin } from '@/lib/auth-admin';
import { db } from '@/lib/db';
import { getErrorMessage, getUserFriendlyError } from '@/lib/errors';
import { AdminService } from '@/lib/services/admin-service';
import { logger } from '@/lib/services/logger';

interface RouteParams {
  params: {
    userId: string;
  };
}

/**
 * Toggle vanity URL access for a user
 */
export async function PATCH(request: NextRequest, { params }: RouteParams) {
  try {
    // Verify admin access
    const admin = await getCurrentAdmin();
    if (!admin) {
      return NextResponse.json(
        { error: getUserFriendlyError('UNAUTHORIZED'), code: 'UNAUTHORIZED' },
        { status: 401 }
      );
    }

    const { userId } = params;
    const body = (await request.json()) as {
      canUseVanityUrls: boolean;
    };

    // Validate input
    if (typeof body.canUseVanityUrls !== 'boolean') {
      return NextResponse.json(
        {
          error: getUserFriendlyError('VALIDATION_ERROR', 'canUseVanityUrls must be a boolean'),
          code: 'VALIDATION_ERROR',
        },
        { status: 400 }
      );
    }

    // Update user vanity URL access
    const updatedUser = await db.user.update({
      where: { id: userId },
      data: {
        canUseVanityUrls: body.canUseVanityUrls,
      },
      select: {
        id: true,
        email: true,
        name: true,
        username: true,
        canUseVanityUrls: true,
      },
    });

    // Create audit log
    AdminService.createAuditLog(
      admin.id,
      'UPDATE',
      'USER_VANITY_ACCESS',
      userId,
      { canUseVanityUrls: !body.canUseVanityUrls },
      { canUseVanityUrls: body.canUseVanityUrls },
      { endpoint: `/api/admin/users/${userId}/vanity-access` },
      request.headers.get('x-forwarded-for') || undefined,
      request.headers.get('user-agent') || undefined
    );

    return NextResponse.json({
      user: updatedUser,
      message: `Vanity URL access ${body.canUseVanityUrls ? 'enabled' : 'disabled'} successfully`,
    });
  } catch (error) {
    logger.error({ error: error }, 'Admin vanity access toggle error');

    if (getErrorMessage(error).includes('not found')) {
      return NextResponse.json(
        { error: getUserFriendlyError('NOT_FOUND', 'User not found'), code: 'NOT_FOUND' },
        { status: 404 }
      );
    }

    return NextResponse.json(
      { error: 'Something went wrong. Please try again', code: 'INTERNAL_ERROR' },
      { status: 500 }
    );
  }
}
