import { z } from 'zod';

import { NextRequest, NextResponse } from 'next/server';

import { getCurrentUser } from '@/lib/auth-utils';
import { getUserFriendlyError } from '@/lib/errors';
import { UserProfileService } from '@/lib/services/user-profile';
import { logger } from '@/lib/services/logger';

const UpdateProfileSchema = z.object({
  name: z.string().min(1).max(100).optional(),
  email: z.string().email().optional(),
});

/**
 * Handles GET requests for retrieving user profile information
 *
 * @description Retrieves the current user's profile information including completion status and missing fields
 * @param {NextRequest} _request - The incoming HTTP request object (unused parameter)
 * @returns {Promise<NextResponse>} JSON response with user profile data and completion metrics
 *
 * @throws {401} Unauthorized - Valid session required
 * @throws {500} Internal Server Error - Database or service errors
 *
 * @example
 * // Get current user's profile
 * GET /api/user/profile
 * // Returns: { profile: {...}, completion: { isComplete: true, missingFields: [], completionPercentage: 100 } }
 *
 * @see {@link getCurrentUser} for unified authentication
 * @see {@link UserProfileService.getProfile} for business logic
 */
export async function GET(_request: NextRequest) {
  try {
    const user = await getCurrentUser();
    if (!user?.id) {
      return NextResponse.json(
        { error: getUserFriendlyError('UNAUTHORIZED'), code: 'UNAUTHORIZED' },
        { status: 401 }
      );
    }

    const profileData = await UserProfileService.getProfile(user.id);

    return NextResponse.json({
      profile: {
        id: profileData?.id,
        name: profileData?.name,
        email: profileData?.email,
        image: profileData?.avatarUrl,
        avatarUrl: profileData?.avatarUrl,
        accounts: profileData?.accounts || [],
      },
      completion: {
        isComplete: !!(profileData?.name && profileData?.email),
        missingFields: [
          ...(profileData?.name ? [] : ['name']),
          ...(profileData?.email ? [] : ['email']),
        ],
        completionPercentage: Math.round(
          ([profileData?.name, profileData?.email].filter(Boolean).length / 2) * 100
        ),
      },
    });
  } catch (error) {
    logger.error({ error: error }, 'Get profile error');
    return NextResponse.json(
      { error: getUserFriendlyError('INTERNAL_ERROR'), code: 'INTERNAL_ERROR' },
      { status: 500 }
    );
  }
}

/**
 * Handles PATCH requests for updating user profile information
 *
 * @description Updates the current user's profile information with validation and returns updated profile data
 * @param {NextRequest} request - The incoming HTTP request object with profile update data in JSON body
 * @returns {Promise<NextResponse>} JSON response with updated user profile data and completion metrics
 *
 * @throws {401} Unauthorized - Valid session required
 * @throws {400} Bad Request - Invalid user data, validation errors, or email already in use
 * @throws {500} Internal Server Error - Database or service errors
 *
 * @example
 * // Update user profile
 * PATCH /api/user/profile
 * {
 *   "name": "John Doe",
 *   "email": "john.doe@example.com"
 * }
 *
 * @see {@link getCurrentUser} for unified authentication
 * @see {@link UpdateProfileSchema} for request validation
 * @see {@link UserProfileService.updateProfile} for business logic
 */
export async function PATCH(request: NextRequest) {
  try {
    const user = await getCurrentUser();
    if (!user?.id) {
      return NextResponse.json(
        { error: getUserFriendlyError('UNAUTHORIZED'), code: 'UNAUTHORIZED' },
        { status: 401 }
      );
    }

    const body = (await request.json()) as unknown;
    const data = UpdateProfileSchema.parse(body);

    await UserProfileService.updateProfile(user.id, data);

    // Get the updated profile after update
    const profileData = await UserProfileService.getProfile(user.id);

    return NextResponse.json({
      profile: {
        id: profileData?.id,
        name: profileData?.name,
        email: profileData?.email,
        image: profileData?.avatarUrl,
        avatarUrl: profileData?.avatarUrl,
        accounts: profileData?.accounts || [],
      },
      completion: {
        isComplete: !!(profileData?.name && profileData?.email),
        missingFields: [
          ...(profileData?.name ? [] : ['name']),
          ...(profileData?.email ? [] : ['email']),
        ],
        completionPercentage: Math.round(
          ([profileData?.name, profileData?.email].filter(Boolean).length / 2) * 100
        ),
      },
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

    if (error instanceof Error && error.message === 'Email already in use') {
      return NextResponse.json(
        {
          error: getUserFriendlyError('ALREADY_EXISTS', error.message),
          code: 'ALREADY_EXISTS',
        },
        { status: 400 }
      );
    }

    logger.error({ error: error }, 'Update profile error');
    return NextResponse.json(
      { error: getUserFriendlyError('INTERNAL_ERROR'), code: 'INTERNAL_ERROR' },
      { status: 500 }
    );
  }
}
