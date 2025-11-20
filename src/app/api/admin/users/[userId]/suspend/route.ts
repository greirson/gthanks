import { z } from 'zod';

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

const SuspendSchema = z.object({
  reason: z.string().min(1, 'Suspension reason is required'),
});

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

    // Prevent admin from suspending themselves
    if (userId === admin.id) {
      return NextResponse.json(
        {
          error: getUserFriendlyError('VALIDATION_ERROR', 'Cannot suspend your own account'),
          code: 'VALIDATION_ERROR',
        },
        { status: 400 }
      );
    }

    const body: unknown = await request.json();
    const { reason } = SuspendSchema.parse(body);

    // Suspend user
    const suspendedUser = await AdminService.suspendUser(userId, admin.id, reason);

    return NextResponse.json({
      user: suspendedUser,
      message: 'User suspended successfully',
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        {
          error: getUserFriendlyError('VALIDATION_ERROR', error.errors[0].message),
          code: 'VALIDATION_ERROR',
        },
        { status: 400 }
      );
    }

    logger.error({ error: error }, 'Admin user suspend error');

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
