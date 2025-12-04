import { NextRequest, NextResponse } from 'next/server';

import { getCurrentAdmin } from '@/lib/auth-admin';
import { userService } from '@/lib/services/user-service';
import { getErrorMessage, getUserFriendlyError } from '@/lib/errors';
import { auditService } from '@/lib/services/audit-service';
import { AuditActions } from '@/lib/schemas/audit-log';
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
    const body: unknown = await request.json();

    // Validate input - type guard
    if (
      !body ||
      typeof body !== 'object' ||
      !('canUseVanityUrls' in body) ||
      typeof (body as { canUseVanityUrls: unknown }).canUseVanityUrls !== 'boolean'
    ) {
      return NextResponse.json(
        {
          error: getUserFriendlyError('VALIDATION_ERROR', 'canUseVanityUrls must be a boolean'),
          code: 'VALIDATION_ERROR',
        },
        { status: 400 }
      );
    }

    // Type assertion is now safe after validation
    const validatedBody = body as { canUseVanityUrls: boolean };

    // Update user vanity URL access using service
    const updatedUser = await userService.setVanityAccess(userId, validatedBody.canUseVanityUrls);

    // Fire-and-forget audit log - NO await
    auditService.log({
      actorId: admin.id,
      actorName: admin.name || admin.email,
      actorType: 'user',
      category: 'admin',
      action: AuditActions.VANITY_ACCESS_CHANGED,
      resourceType: 'user',
      resourceId: userId,
      resourceName: updatedUser.name || updatedUser.email || undefined,
      details: {
        oldValue: !validatedBody.canUseVanityUrls,
        newValue: validatedBody.canUseVanityUrls,
      },
      ipAddress: request.headers.get('x-forwarded-for')?.split(',')[0] || undefined,
      userAgent: request.headers.get('user-agent')?.slice(0, 500) || undefined,
    });

    return NextResponse.json({
      user: {
        id: updatedUser.id,
        email: updatedUser.email,
        name: updatedUser.name,
        username: updatedUser.username,
        canUseVanityUrls: updatedUser.canUseVanityUrls,
      },
      message: `Vanity URL access ${validatedBody.canUseVanityUrls ? 'enabled' : 'disabled'} successfully`,
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
