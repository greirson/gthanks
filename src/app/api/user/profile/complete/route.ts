import { NextRequest, NextResponse } from 'next/server';

import { getCurrentUser } from '@/lib/auth-utils';
import { getUserFriendlyError } from '@/lib/errors';
import { userService } from '@/lib/services/user-service';
import { logger } from '@/lib/services/logger';

/**
 * POST /api/user/profile/complete - Complete user onboarding
 *
 * @description Completes the user onboarding process by updating their name and avatar,
 * and marking isOnboardingComplete as true.
 *
 * @see {@link userService.completeProfile} for service implementation
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

    const body = (await request.json()) as unknown;

    // Type guard for request body
    if (typeof body !== 'object' || body === null) {
      return NextResponse.json(
        {
          error: getUserFriendlyError('VALIDATION_ERROR', 'Invalid request body'),
          code: 'VALIDATION_ERROR',
        },
        { status: 400 }
      );
    }

    const requestBody = body as { name?: unknown; avatarUrl?: unknown; username?: unknown };
    const { name, avatarUrl, username } = requestBody;

    // Validate required fields
    if (!name || typeof name !== 'string' || name.trim().length === 0) {
      return NextResponse.json(
        {
          error: getUserFriendlyError(
            'VALIDATION_ERROR',
            'Name is required and must be a non-empty string'
          ),
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

    // Validate avatarUrl if provided (currently not used, but validated for future use)
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

    // Validate username if provided
    let validatedUsername: string | undefined;
    if (username !== undefined && username !== null) {
      if (typeof username !== 'string') {
        return NextResponse.json(
          {
            error: getUserFriendlyError('VALIDATION_ERROR', 'Username must be a string'),
            code: 'VALIDATION_ERROR',
          },
          { status: 400 }
        );
      }
      validatedUsername = username;
    }

    // Use service layer
    const updatedUser = await userService.completeProfile(user.id, {
      name: trimmedName,
      username: validatedUsername,
    });

    logger.info(
      {
        userId: user.id,
        hasUsername: !!updatedUser.username,
      },
      'User completed onboarding'
    );

    return NextResponse.json({
      success: true,
      user: {
        id: updatedUser.id,
        name: updatedUser.name,
        email: updatedUser.email,
        username: updatedUser.username,
        isOnboardingComplete: updatedUser.isOnboardingComplete,
      },
    });
  } catch (error) {
    logger.error('Profile completion error', error, {
      userId: user?.id,
    });

    return NextResponse.json(
      {
        error: getUserFriendlyError(
          'INTERNAL_ERROR',
          'Failed to complete profile. Please try again.'
        ),
        code: 'INTERNAL_ERROR',
      },
      { status: 500 }
    );
  }
}
