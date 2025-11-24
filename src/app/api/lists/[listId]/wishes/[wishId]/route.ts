import { z } from 'zod';

import { NextRequest, NextResponse } from 'next/server';

import { getCurrentUser } from '@/lib/auth-utils';
import {
  AppError,
  ConflictError,
  ForbiddenError,
  NotFoundError,
  ValidationError,
  getUserFriendlyError,
} from '@/lib/errors';
import { listService } from '@/lib/services/list-service';
import { logger } from '@/lib/services/logger';

interface RouteParams {
  params: { listId: string; wishId: string };
}

const updateWishSchema = z.object({
  sortOrder: z.number().finite(), // Finite = no Infinity/NaN
});

/**
 * Handles PATCH requests for updating a wish's sortOrder in a list
 *
 * @description Updates the custom sort position of a wish within a list (drag-and-drop sorting).
 * Uses fractional indexing to avoid renumbering all wishes. Supports conflict detection via
 * If-Unmodified-Since header for optimistic locking in concurrent edit scenarios.
 *
 * @param {NextRequest} request - The incoming HTTP request object with sortOrder in JSON body
 * @param {RouteParams} params - Route parameters containing listId and wishId
 * @returns {Promise<NextResponse>} JSON response with updated ListWish data or error
 *
 * @throws {400} Bad Request - Invalid sortOrder value (NaN, Infinity, etc.)
 * @throws {401} Unauthorized - User authentication required
 * @throws {403} Forbidden - User does not have permission to edit this list
 * @throws {404} Not Found - List or wish not found in list
 * @throws {409} Conflict - List was modified by another user since clientLastFetchedAt
 * @throws {500} Internal Server Error - Database or service errors
 *
 * @example
 * // Update wish position with conflict detection
 * PATCH /api/lists/abc123/wishes/xyz789
 * Headers: If-Unmodified-Since: 2025-11-23T10:00:00.000Z
 * Body: { "sortOrder": 1.5 }
 * // Returns: { wish: { listId, wishId, sortOrder: 1.5, ... } }
 *
 * @see {@link getCurrentUser} for authentication details
 * @see {@link listService.updateWishSortOrder} for update logic with permission checks
 */
export async function PATCH(request: NextRequest, { params }: RouteParams) {
  let user: Awaited<ReturnType<typeof getCurrentUser>> | null = null;
  const { listId, wishId } = params;

  try {
    // Check authentication
    user = await getCurrentUser();
    if (!user) {
      return NextResponse.json(
        { error: getUserFriendlyError('UNAUTHORIZED'), code: 'UNAUTHORIZED' },
        { status: 401 }
      );
    }

    // Parse and validate request body
    const body = await request.json();
    const result = updateWishSchema.safeParse(body);

    if (!result.success) {
      return NextResponse.json(
        {
          error: 'Invalid sortOrder value',
          code: 'VALIDATION_ERROR',
          details: result.error.errors,
        },
        { status: 400 }
      );
    }

    const { sortOrder } = result.data;

    // Optional: conflict detection via If-Unmodified-Since header
    let clientLastFetchedAt: Date | undefined;
    const ifUnmodifiedSince = request.headers.get('If-Unmodified-Since');
    if (ifUnmodifiedSince) {
      clientLastFetchedAt = new Date(ifUnmodifiedSince);
    }

    // Update wish sortOrder via service layer
    const updated = await listService.updateWishSortOrder(
      listId,
      wishId,
      sortOrder,
      user.id,
      clientLastFetchedAt
    );

    return NextResponse.json({ wish: updated });
  } catch (error) {
    logger.error(
      { error, userId: user?.id, listId, wishId },
      'PATCH /api/lists/[listId]/wishes/[wishId] error'
    );

    // Return 404 for both NotFoundError and ForbiddenError to prevent resource enumeration
    if (error instanceof NotFoundError || error instanceof ForbiddenError) {
      return NextResponse.json(
        { error: getUserFriendlyError('NOT_FOUND'), code: 'NOT_FOUND' },
        { status: 404 }
      );
    }

    if (error instanceof ConflictError) {
      return NextResponse.json(
        { error: error.message, code: 'CONFLICT' },
        { status: 409 }
      );
    }

    if (error instanceof ValidationError) {
      return NextResponse.json(
        { error: error.message, code: 'VALIDATION_ERROR' },
        { status: 400 }
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
