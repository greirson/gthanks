import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';

import { getCurrentUser } from '@/lib/auth-utils';
import { handleApiError } from '@/lib/errors';
import { userService } from '@/lib/services/user-service';

const UpdateProfileSettingsSchema = z.object({
  showPublicProfile: z.boolean(),
});

/**
 * Handles PUT requests for updating user profile settings
 *
 * @description Updates profile visibility and other settings
 * @param {NextRequest} request - The incoming HTTP request object with settings in JSON body
 * @returns {Promise<NextResponse>} JSON response with updated user object
 *
 * @throws {401} Unauthorized - Valid session required
 * @throws {400} Bad Request - Invalid input data
 * @throws {500} Internal Server Error - Database errors
 *
 * @example
 * // Toggle public profile visibility
 * PUT /api/user/profile-settings
 * { "showPublicProfile": true }
 *
 * @see {@link getCurrentUser} for unified authentication
 * @see {@link userService.updateProfileSettings} for service implementation
 */
export async function PUT(request: NextRequest) {
  try {
    // Check authentication
    const user = await getCurrentUser();
    if (!user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Parse and validate request body
    const body = await request.json();
    const data = UpdateProfileSettingsSchema.parse(body);

    // Use service layer
    const updatedUser = await userService.updateProfileSettings(user.id, data);

    return NextResponse.json({
      user: {
        id: updatedUser.id,
        name: updatedUser.name,
        email: updatedUser.email,
        username: updatedUser.username,
        showPublicProfile: updatedUser.showPublicProfile,
        canUseVanityUrls: updatedUser.canUseVanityUrls,
      },
    });
  } catch (error) {
    // Handle validation errors
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: error.errors[0].message }, { status: 400 });
    }

    // Handle all other errors
    return handleApiError(error);
  }
}
