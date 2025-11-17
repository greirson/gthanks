import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';

import { getCurrentAdmin } from '@/lib/auth-admin';
import { db } from '@/lib/db';
import { ConflictError, handleApiError, NotFoundError } from '@/lib/errors';
import { usernameSchema } from '@/lib/validators/vanity-url';
import { Prisma } from '@prisma/client';

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
    const body = await request.json();
    const data = UpdateUsernameSchema.parse(body);

    // Verify user exists
    const user = await db.user.findUnique({
      where: { id: userId },
      select: { id: true },
    });

    if (!user) {
      throw new NotFoundError('User not found');
    }

    try {
      // Update username (admin can override existing username)
      const updatedUser = await db.user.update({
        where: { id: userId },
        data: {
          username: data.username ? data.username.toLowerCase() : null,
          usernameSetAt: data.username ? new Date() : null,
        },
      });

      return NextResponse.json({
        user: {
          id: updatedUser.id,
          name: updatedUser.name,
          email: updatedUser.email,
          username: updatedUser.username,
          canUseVanityUrls: updatedUser.canUseVanityUrls,
        },
      });
    } catch (error) {
      // Handle unique constraint violation
      if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002') {
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
