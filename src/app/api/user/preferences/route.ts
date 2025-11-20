import { z } from 'zod';

import { NextRequest, NextResponse } from 'next/server';

import { getCurrentUser } from '@/lib/auth-utils';
import { getUserFriendlyError } from '@/lib/errors';
import { userService } from '@/lib/services/user-service';
import { logger } from '@/lib/services/logger';

const UpdatePreferencesSchema = z.object({
  autoAcceptGroupInvitations: z.boolean().optional(),
  sortBy: z.string().optional(),
  sortOrder: z.string().optional(),
  wishLevelMin: z.number().optional(),
  wishLevelMax: z.number().optional(),
  priceMin: z.number().optional(),
  priceMax: z.number().optional(),
});

/**
 * Handles GET requests for retrieving user preferences
 *
 * @description Retrieves the current user's preferences including auto-accept settings and wish filters
 * @param {NextRequest} _request - The incoming HTTP request object (unused parameter)
 * @returns {Promise<NextResponse>} JSON response with user preferences data
 *
 * @throws {401} Unauthorized - Valid session required
 * @throws {500} Internal Server Error - Database errors
 *
 * @example
 * // Get current user's preferences
 * GET /api/user/preferences
 * // Returns: { preferences: { autoAcceptGroupInvitations: false, sortBy: "createdAt", ... } }
 *
 * @see {@link userService.getPreferences} for service implementation
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

    // Use service layer - will create if doesn't exist
    const preferences = await userService.getPreferences(user.id);

    return NextResponse.json({
      preferences: preferences || {
        id: '',
        userId: user.id,
        autoAcceptGroupInvitations: false,
        sortBy: 'createdAt',
        sortOrder: 'desc',
        wishLevelMin: null,
        wishLevelMax: null,
        priceMin: null,
        priceMax: null,
      },
    });
  } catch (error) {
    logger.error({ error: error }, 'Get preferences error');
    return NextResponse.json(
      { error: getUserFriendlyError('INTERNAL_ERROR'), code: 'INTERNAL_ERROR' },
      { status: 500 }
    );
  }
}

/**
 * Handles PATCH requests for updating user preferences
 *
 * @description Updates the current user's preferences with validation and returns updated data
 * @param {NextRequest} request - The incoming HTTP request object with preferences update data in JSON body
 * @returns {Promise<NextResponse>} JSON response with updated user preferences data
 *
 * @throws {401} Unauthorized - Valid session required
 * @throws {400} Bad Request - Invalid preference data or validation errors
 * @throws {500} Internal Server Error - Database errors
 *
 * @example
 * // Update user preferences
 * PATCH /api/user/preferences
 * {
 *   "autoAcceptGroupInvitations": true
 * }
 *
 * @see {@link userService.updatePreferences} for service implementation
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
    const data = UpdatePreferencesSchema.parse(body);

    // Use service layer
    const preferences = await userService.updatePreferences(user.id, data);

    return NextResponse.json({
      preferences: {
        id: preferences.id,
        autoAcceptGroupInvitations: preferences.autoAcceptGroupInvitations,
        sortBy: preferences.sortBy,
        sortOrder: preferences.sortOrder,
        wishLevelMin: preferences.wishLevelMin,
        wishLevelMax: preferences.wishLevelMax,
        priceMin: preferences.priceMin,
        priceMax: preferences.priceMax,
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

    logger.error({ error: error }, 'Update preferences error');
    return NextResponse.json(
      { error: getUserFriendlyError('INTERNAL_ERROR'), code: 'INTERNAL_ERROR' },
      { status: 500 }
    );
  }
}
