import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';

import { getCurrentAdmin } from '@/lib/auth-admin';
import { userService } from '@/lib/services/user-service';
import { ConflictError, handleApiError, NotFoundError } from '@/lib/errors';
import { usernameSchema } from '@/lib/validators/vanity-url';

interface RouteParams {
  params: {
    userId: string;
  };
}

const UpdateUsernameSchema = z.object({
  username: usernameSchema.nullable(),
});

/**
 * Handles PUT requests for updating a user's username (admin override)
 *
 * @description Allows admins to set or change usernames, bypassing the one-time-only restriction
 * @param {NextRequest} request - The incoming HTTP request object with username in JSON body
 * @param {RouteParams} params - Route parameters containing userId
 * @returns {Promise<NextResponse>} JSON response with updated user object
 *
 * @throws {401} Unauthorized - Admin authentication required
 * @throws {404} Not Found - User not found
 * @throws {409} Conflict - Username already taken
 * @throws {400} Bad Request - Invalid username format
 * @throws {500} Internal Server Error - Database errors
 *
 * @example
 * // Set username for user
 * PUT /api/admin/users/user-id-123/username
 * { "username": "john-doe" }
 *
 * // Remove username (set to null)
 * PUT /api/admin/users/user-id-123/username
 * { "username": null }
 *
 * @see {@link getCurrentAdmin} for admin authentication
 * @see {@link usernameSchema} for username validation
 */
export async function PUT(request: NextRequest, { params }: RouteParams) {
  try {
    // Verify admin access
    const admin = await getCurrentAdmin();
    if (!admin) {
      return NextResponse.json({ error: 'Admin access required' }, { status: 401 });
    }

    const { userId } = params;

    // Parse and validate request body
    const body: unknown = await request.json();
    const data = UpdateUsernameSchema.parse(body);

    // Verify user exists
    try {
      await userService.getUserById(userId);
    } catch {
      throw new NotFoundError('User not found');
    }

    try {
      // Update username using service (admin can override existing username)
      const updatedUser = await userService.adminUpdateUsername(userId, data.username);

      return NextResponse.json({
        user: {
          id: updatedUser.id,
          name: updatedUser.name,
          email: updatedUser.email,
          username: updatedUser.username,
          canUseVanityUrls: updatedUser.canUseVanityUrls,
        },
      });
    } catch (error: unknown) {
      // Handle ConflictError from service
      const errorMessage = error instanceof Error ? error.message : String(error);
      if (error instanceof ConflictError || errorMessage.includes('already')) {
        throw new ConflictError('Username already taken by another user');
      }
      throw error;
    }
  } catch (error) {
    // Handle validation errors
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: error.errors[0].message }, { status: 400 });
    }

    // Handle specific errors
    if (error instanceof NotFoundError) {
      return NextResponse.json({ error: error.message }, { status: 404 });
    }

    if (error instanceof ConflictError) {
      return NextResponse.json({ error: error.message }, { status: 409 });
    }

    // Handle all other errors
    return handleApiError(error);
  }
}
