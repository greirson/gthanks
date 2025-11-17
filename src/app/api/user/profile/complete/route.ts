import { NextRequest, NextResponse } from 'next/server';

import { getCurrentUser } from '@/lib/auth-utils';
import { getUserFriendlyError } from '@/lib/errors';
import { db } from '@/lib/db';
import { logger } from '@/lib/services/logger';

/**
 * POST /api/user/profile/complete - Complete user onboarding
 *
 * @description Completes the user onboarding process by updating their name and avatar,
 * and marking isOnboardingComplete as true.
 */
export async function POST(request: NextRequest) {
  let user: Awaited<ReturnType<typeof getCurrentUser>> | null = null;

  try {
    user = await getCurrentUser();
    if (!user) {
      return NextResponse.json(
        { error: getUserFriendlyError('UNAUTHORIZED'), code: 'UNAUTHORIZED' },
        { status: 401 }
      );
    }

    const body = await request.json();
    const { name, avatarUrl } = body;

    // Validate required fields
    if (!name || typeof name !== 'string' || name.trim().length === 0) {
      return NextResponse.json(
        {
          error: getUserFriendlyError('VALIDATION_ERROR', 'Name is required and must be a non-empty string'),
          code: 'VALIDATION_ERROR',
        },
        { status: 400 }
      );
    }

    // Validate name length (reasonable limits)
    const trimmedName = name.trim();
    if (trimmedName.length > 100) {
      return NextResponse.json(
        {
          error: getUserFriendlyError('VALIDATION_ERROR', 'Name must be 100 characters or less'),
          code: 'VALIDATION_ERROR',
        },
        { status: 400 }
      );
    }

    // Validate avatarUrl if provided
    if (avatarUrl !== undefined && avatarUrl !== null) {
      if (typeof avatarUrl !== 'string') {
        return NextResponse.json(
          {
            error: getUserFriendlyError('VALIDATION_ERROR', 'Avatar URL must be a string'),
            code: 'VALIDATION_ERROR',
          },
          { status: 400 }
        );
      }

      // Allow either uploaded images (/api/images/, /uploads/) or external URLs
      const isValidUrl =
        avatarUrl.startsWith('http://') ||
        avatarUrl.startsWith('https://') ||
        avatarUrl.startsWith('/api/images/') ||
        avatarUrl.startsWith('/uploads/');

      if (avatarUrl.trim().length > 0 && !isValidUrl) {
        return NextResponse.json(
          {
            error: getUserFriendlyError('VALIDATION_ERROR', 'Invalid avatar URL format'),
            code: 'VALIDATION_ERROR',
          },
          { status: 400 }
        );
      }
    }

    // Update user profile and mark onboarding complete
    const updatedUser = await db.user.update({
      where: { id: user.id },
      data: {
        name: trimmedName,
        ...(avatarUrl && {
          avatarUrl: avatarUrl.trim(),
          image: avatarUrl.trim(), // For NextAuth compatibility
        }),
        isOnboardingComplete: true,
      },
      select: {
        id: true,
        name: true,
        email: true,
        avatarUrl: true,
        image: true,
        isOnboardingComplete: true,
      },
    });

    logger.info(
      {
        userId: user.id,
        hasAvatar: !!updatedUser.avatarUrl,
      },
      'User completed onboarding'
    );

    return NextResponse.json({
      success: true,
      user: updatedUser,
    });
  } catch (error) {
    logger.error('Profile completion error', error, {
      userId: user?.id,
    });

    return NextResponse.json(
      {
        error: getUserFriendlyError('INTERNAL_ERROR', 'Failed to complete profile. Please try again.'),
        code: 'INTERNAL_ERROR',
      },
      { status: 500 }
    );
  }
}
