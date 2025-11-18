import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';

import { getCurrentUser } from '@/lib/auth-utils';
import { ConflictError, ForbiddenError, handleApiError } from '@/lib/errors';
import { getClientIdentifier, getRateLimitHeaders, rateLimiter } from '@/lib/rate-limiter';
import { userService } from '@/lib/services/user-service';
import { usernameSchema } from '@/lib/validators/vanity-url';

const SetUsernameSchema = z.object({
  username: usernameSchema,
});

/**
 * Handles PUT requests for setting a username (one-time only)
 *
 * @description Allows authenticated users to set their username for vanity URLs
 * @param {NextRequest} request - The incoming HTTP request object with username in JSON body
 * @returns {Promise<NextResponse>} JSON response with updated user object
 *
 * @throws {401} Unauthorized - Valid session required
 * @throws {403} Forbidden - User doesn't have vanity URL access or username already set
 * @throws {409} Conflict - Username already taken
 * @throws {429} Too Many Requests - Rate limit exceeded
 * @throws {400} Bad Request - Invalid username format
 *
 * @example
 * // Set username
 * PUT /api/user/username
 * { "username": "john-doe" }
 *
 * @see {@link getCurrentUser} for unified authentication
 * @see {@link usernameSchema} for username validation
 * @see {@link userService.setUsername} for business logic
 */
export async function PUT(request: NextRequest) {
  try {
    // Check authentication
    const user = await getCurrentUser();
    if (!user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Check rate limit per user
    const userRateLimitResult = await rateLimiter.check('username-set', user.id);
    if (!userRateLimitResult.allowed) {
      return NextResponse.json(
        { error: 'Too many requests. Please try again later.' },
        {
          status: 429,
          headers: getRateLimitHeaders(userRateLimitResult),
        }
      );
    }

    // Check rate limit per IP
    const identifier = getClientIdentifier(request);
    const ipRateLimitResult = await rateLimiter.check('username-set-ip', identifier);
    if (!ipRateLimitResult.allowed) {
      return NextResponse.json(
        { error: 'Too many requests. Please try again later.' },
        {
          status: 429,
          headers: getRateLimitHeaders(ipRateLimitResult),
        }
      );
    }

    // Parse and validate request body
    const body = await request.json();
    const data = SetUsernameSchema.parse(body);

    // Set username via service
    const updatedUser = await userService.setUsername(user.id, data.username);

    return NextResponse.json(
      {
        user: {
          id: updatedUser.id,
          name: updatedUser.name,
          email: updatedUser.email,
          username: updatedUser.username,
          showPublicProfile: updatedUser.showPublicProfile,
          canUseVanityUrls: updatedUser.canUseVanityUrls,
        },
      },
      { headers: getRateLimitHeaders(userRateLimitResult) }
    );
  } catch (error) {
    // Handle specific errors
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: error.errors[0].message }, { status: 400 });
    }

    if (error instanceof ForbiddenError) {
      return NextResponse.json({ error: error.message }, { status: 403 });
    }

    if (error instanceof ConflictError) {
      return NextResponse.json({ error: error.message }, { status: 409 });
    }

    // Handle all other errors
    return handleApiError(error);
  }
}
