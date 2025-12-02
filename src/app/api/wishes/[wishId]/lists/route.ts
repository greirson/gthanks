import { NextRequest, NextResponse } from 'next/server';

import { getCurrentUserOrToken, AuthResult } from '@/lib/auth-utils';
import { AppError, ForbiddenError, NotFoundError, getUserFriendlyError } from '@/lib/errors';
import { logger } from '@/lib/services/logger';
import { wishService } from '@/lib/services/wish-service';
import { serializePrismaResponse } from '@/lib/utils/date-serialization';

interface RouteParams {
  params: {
    wishId: string;
  };
}

/**
 * Handles GET requests for retrieving all lists a wish belongs to
 *
 * @description Returns all lists that contain this wish (filtered to user's own lists only)
 * @param {NextRequest} request - The incoming HTTP request object
 * @param {RouteParams} params - Route parameters containing the wish ID
 * @returns {Promise<NextResponse>} JSON response with array of lists
 *
 * @throws {401} Unauthorized - User authentication required
 * @throws {403} Forbidden - User does not own the wish
 * @throws {404} Not Found - Wish does not exist
 * @throws {500} Internal Server Error - Database errors
 *
 * @example
 * // Get all lists containing a wish
 * GET /api/wishes/abc123/lists
 * // Returns: [{ id: "list1", name: "Birthday", _count: { listWishes: 5 }, ... }, ...]
 *
 * @security Only returns user's own lists (ownerId = session.user.id)
 * @see {@link getCurrentUser} for authentication details
 * @see {@link permissionService} for authorization checks
 */
export async function GET(request: NextRequest, { params }: RouteParams) {
  let auth: AuthResult | null = null;
  const { wishId } = params;

  try {
    // Check authentication
    auth = await getCurrentUserOrToken(request);
    if (!auth) {
      return NextResponse.json(
        { error: getUserFriendlyError('UNAUTHORIZED'), code: 'UNAUTHORIZED' },
        { status: 401 }
      );
    }

    // Use service layer to get lists containing this wish
    const lists = await wishService.getWishLists(wishId, auth.userId);

    return NextResponse.json(serializePrismaResponse(lists));
  } catch (error) {
    logger.error({ error, userId: auth?.userId, wishId }, 'GET /api/wishes/[wishId]/lists error');

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
