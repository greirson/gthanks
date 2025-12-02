import { z } from 'zod';

import { NextRequest, NextResponse } from 'next/server';

import { getCurrentAdmin } from '@/lib/auth-admin';
import { getErrorMessage, getUserFriendlyError } from '@/lib/errors';
import { AdminService, UserUpdateSchema } from '@/lib/services/admin-service';
import { auditService } from '@/lib/services/audit-service';
import { AuditActions } from '@/lib/schemas/audit-log';
import { logger } from '@/lib/services/logger';
// eslint-disable-next-line local-rules/no-direct-db-import -- Needed for audit log user lookup
import { db } from '@/lib/db';

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
    const body: unknown = await request.json();

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

    // Get current user state for audit log comparison
    const currentUser = await db.user.findUnique({
      where: { id: userId },
      select: { name: true, email: true, isAdmin: true, role: true },
    });

    // Update user
    const updatedUser = await AdminService.updateUser(userId, admin.id, updateData);

    // Get IP and user agent for audit logging
    const ipAddress = request.headers.get('x-forwarded-for')?.split(',')[0] || undefined;
    const userAgent = request.headers.get('user-agent') || undefined;

    // Log admin role changes
    if (updateData.role && currentUser) {
      const wasAdmin = currentUser.role === 'admin';
      const isNowAdmin = updateData.role === 'admin';

      if (!wasAdmin && isNowAdmin) {
        // Admin granted
        auditService.log({
          actorId: admin.id,
          actorName: admin.name || admin.email || undefined,
          actorType: 'user',
          category: 'admin',
          action: AuditActions.ADMIN_GRANTED,
          resourceType: 'user',
          resourceId: userId,
          resourceName: currentUser.name || currentUser.email || undefined,
          ipAddress,
          userAgent,
        });
      } else if (wasAdmin && !isNowAdmin) {
        // Admin revoked
        auditService.log({
          actorId: admin.id,
          actorName: admin.name || admin.email || undefined,
          actorType: 'user',
          category: 'admin',
          action: AuditActions.ADMIN_REVOKED,
          resourceType: 'user',
          resourceId: userId,
          resourceName: currentUser.name || currentUser.email || undefined,
          ipAddress,
          userAgent,
        });
      }
    }

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
