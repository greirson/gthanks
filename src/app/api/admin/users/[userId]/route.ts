import { z } from 'zod';

import { NextRequest, NextResponse } from 'next/server';

import { getCurrentAdmin } from '@/lib/auth-admin';
import { getErrorMessage, getUserFriendlyError } from '@/lib/errors';
import { AdminService, UserUpdateSchema } from '@/lib/services/admin-service';
import { logger } from '@/lib/services/logger';

interface RouteParams {
  params: {
    userId: string;
  };
}

export async function GET(request: NextRequest, { params }: RouteParams) {
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

    // Get user details
    const user = await AdminService.getUserDetails(userId);

    // Create audit log - not async for MVP
    AdminService.createAuditLog(
      admin.id,
      'VIEW',
      'USER',
      userId,
      undefined,
      undefined,
      { endpoint: `/api/admin/users/${userId}` },
      request.headers.get('x-forwarded-for') || undefined,
      request.headers.get('user-agent') || undefined
    );

    return NextResponse.json({ user });
  } catch (error) {
    logger.error({ error: error }, 'Admin user details error');

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
      role?: string;
      name?: string;
      email?: string;
      suspendedAt?: string | null;
      suspensionReason?: string | null;
    };

    // Validate input
    const updateData = UserUpdateSchema.parse(body);

    // Prevent admin from demoting themselves
    if (userId === admin.id && updateData.role && updateData.role !== 'admin') {
      return NextResponse.json(
        {
          error: getUserFriendlyError('VALIDATION_ERROR', 'Cannot change your own admin role'),
          code: 'VALIDATION_ERROR',
        },
        { status: 400 }
      );
    }

    // Update user
    const updatedUser = await AdminService.updateUser(userId, admin.id, updateData);

    return NextResponse.json({
      user: updatedUser,
      message: 'User updated successfully',
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

    logger.error({ error: error }, 'Admin user update error');

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
