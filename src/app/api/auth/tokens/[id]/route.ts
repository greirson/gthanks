import { NextRequest, NextResponse } from 'next/server';

import { getCurrentUser } from '@/lib/auth-utils';
import { ForbiddenError, NotFoundError } from '@/lib/errors';
import { getRateLimitHeaders, rateLimiter } from '@/lib/rate-limiter';
import { logger } from '@/lib/services/logger';
import { tokenService } from '@/lib/services/token-service';

interface RouteParams {
  params: {
    id: string;
  };
}

/**
 * DELETE /api/auth/tokens/[id] - Revoke a personal access token
 *
 * Soft deletes (revokes) a specific personal access token by ID.
 * The token must belong to the authenticated user.
 *
 * @description Revokes a PAT, making it immediately invalid for authentication
 * @param {NextRequest} _request - The incoming HTTP request (unused but required by Next.js)
 * @param {RouteParams} params - Route parameters containing token ID
 * @returns {Promise<NextResponse>} JSON response with success message or error
 *
 * @throws {401} Unauthorized - Authentication required
 * @throws {403} Forbidden - Token belongs to another user
 * @throws {404} Not Found - Token not found
 * @throws {429} Too Many Requests - Rate limit exceeded
 * @throws {500} Internal Server Error - Failed to revoke token
 *
 * @example
 * DELETE /api/auth/tokens/token_abc123
 *
 * Response (200):
 * {
 *   "success": true,
 *   "message": "Token revoked successfully"
 * }
 */
export async function DELETE(_request: NextRequest, { params }: RouteParams) {
  try {
    // Get user from session (Bearer auth will be added later via middleware)
    const user = await getCurrentUser();

    if (!user?.id) {
      return NextResponse.json(
        {
          error: 'unauthorized',
          message: 'Authentication required',
        },
        { status: 401 }
      );
    }

    // Rate limit by user ID
    const rateLimitResult = await rateLimiter.check('token-revoke', user.id);

    if (!rateLimitResult.allowed) {
      return NextResponse.json(
        {
          error: 'rate_limited',
          message: 'Too many revocation requests',
        },
        {
          status: 429,
          headers: getRateLimitHeaders(rateLimitResult),
        }
      );
    }

    const { id: tokenId } = params;

    // Revoke token using service (includes ownership verification)
    await tokenService.revokeToken(tokenId, user.id);

    logger.info({ userId: user.id, tokenId }, 'Personal access token revoked via API');

    return NextResponse.json(
      {
        success: true,
        message: 'Token revoked successfully',
      },
      {
        status: 200,
        headers: getRateLimitHeaders(rateLimitResult),
      }
    );
  } catch (error) {
    if (error instanceof NotFoundError) {
      return NextResponse.json(
        {
          error: 'not_found',
          message: 'Token not found',
        },
        { status: 404 }
      );
    }

    if (error instanceof ForbiddenError) {
      return NextResponse.json(
        {
          error: 'forbidden',
          message: 'Cannot revoke this token',
        },
        { status: 403 }
      );
    }

    logger.error({ error }, 'DELETE /api/auth/tokens/[id] error');

    return NextResponse.json(
      {
        error: 'internal_error',
        message: 'Failed to revoke token',
      },
      { status: 500 }
    );
  }
}
