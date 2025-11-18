import { NextRequest, NextResponse } from 'next/server';

import { getCurrentUser } from '@/lib/auth-utils';
import { AppError, ForbiddenError, NotFoundError, getUserFriendlyError } from '@/lib/errors';
import { rateLimiter, getRateLimitHeaders, getClientIdentifier } from '@/lib/rate-limiter';
import { listInvitationService } from '@/lib/services/list-invitation.service';
import { logger } from '@/lib/services/logger';

interface RouteParams {
  params: { listId: string; userId: string };
}

/**
 * Handles DELETE requests for removing a co-manager from a list
 *
 * @description Removes a user as co-manager from a list with validation and ownership verification (only list owner can remove co-managers)
 * @param {NextRequest} request - The incoming HTTP request object
 * @param {RouteParams} params - Route parameters containing the listId and userId
 * @returns {Promise<NextResponse>} JSON response with success confirmation or error
 *
 * @throws {401} Unauthorized - User authentication required
 * @throws {400} Bad Request - Attempting to remove owner from list
 * @throws {403} Forbidden - User does not have permission to remove co-managers from this list
 * @throws {404} Not Found - List not found or user is not a co-manager
 * @throws {429} Too Many Requests - Rate limit exceeded
 * @throws {500} Internal Server Error - Database or service errors
 *
 * @example
 * // Remove co-manager from list
 * DELETE /api/lists/abc123/admins/user456
 * // Returns: { success: true, message: "Co-manager removed successfully" }
 *
 * @see {@link getCurrentUser} for authentication details
 * @see {@link permissionService.require} for ownership validation
 */
export async function DELETE(request: NextRequest, { params }: RouteParams) {
  try {
    // Rate limiting - prevent spam removal
    const clientIdentifier = getClientIdentifier(request);
    const rateLimitResult = await rateLimiter.check('co-manager-remove', clientIdentifier);

    if (!rateLimitResult.allowed) {
      return NextResponse.json(
        {
          error: getUserFriendlyError('RATE_LIMIT_EXCEEDED'),
          code: 'RATE_LIMIT_EXCEEDED',
          retryAfter: rateLimitResult.retryAfter,
        },
        {
          status: 429,
          headers: getRateLimitHeaders(rateLimitResult),
        }
      );
    }

    // Check authentication
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json(
        { error: getUserFriendlyError('UNAUTHORIZED'), code: 'UNAUTHORIZED' },
        { status: 401 }
      );
    }

    const { listId, userId: targetUserId } = params;

    // Use service to remove co-manager (handles all validation and permission checks)
    await listInvitationService.removeCoManager(listId, targetUserId, user.id);

    return NextResponse.json(
      {
        success: true,
        message: 'Co-manager removed successfully',
      },
      {
        headers: getRateLimitHeaders(rateLimitResult),
      }
    );
  } catch (error) {
    logger.error({ error: error }, 'DELETE /api/lists/[listId]/admins/[userId] error');

    // Return 404 for both NotFoundError and ForbiddenError to prevent resource enumeration
    if (error instanceof NotFoundError || error instanceof ForbiddenError) {
      return NextResponse.json(
        { error: getUserFriendlyError('NOT_FOUND'), code: 'NOT_FOUND' },
        { status: 404 }
      );
    }

    if (error instanceof AppError) {
      return NextResponse.json(
        {
          error: getUserFriendlyError(error.code, error.message),
          code: error.code,
          field: error.field,
        },
        { status: error.statusCode }
      );
    }

    return NextResponse.json(
      { error: 'Something went wrong. Please try again', code: 'INTERNAL_ERROR' },
      { status: 500 }
    );
  }
}
