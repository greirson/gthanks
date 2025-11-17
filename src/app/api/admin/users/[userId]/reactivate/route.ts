import { NextRequest, NextResponse } from 'next/server';

import { getCurrentAdmin } from '@/lib/auth-admin';
import { getErrorMessage, getUserFriendlyError } from '@/lib/errors';
import { AdminService } from '@/lib/services/admin-service';
import { logger } from '@/lib/services/logger';

interface RouteParams {
  params: {
    userId: string;
  };
}

export async function POST(request: NextRequest, { params }: RouteParams) {
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

    // Reactivate user
    const reactivatedUser = await AdminService.unsuspendUser(userId, admin.id);

    return NextResponse.json({
      user: reactivatedUser,
      message: 'User reactivated successfully',
    });
  } catch (error) {
    logger.error({ error: error }, 'Admin user reactivate error');

    if (getErrorMessage(error) === 'User not found') {
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
