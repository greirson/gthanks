import { z } from 'zod';

import { NextRequest, NextResponse } from 'next/server';

import { getCurrentUser } from '@/lib/auth-utils';
import { ForbiddenError, NotFoundError, ValidationError, getUserFriendlyError } from '@/lib/errors';
import { logger } from '@/lib/services/logger';
import { listService } from '@/lib/services/list-service';

interface RouteParams {
  params: { listId: string };
}


// Validation schema for bulk remove request
const BulkRemoveSchema = z.object({
  wishIds: z.array(z.string()).min(1, 'wishIds cannot be empty'),
});

/**
 * Handles POST requests for bulk removing wishes from a specific list
 *
 * @description Removes multiple wish associations from the specified list in a single transaction
 * @param {NextRequest} request - The incoming HTTP request object with wishIds array in JSON body
 * @param {RouteParams} params - Route parameters containing the listId
 * @returns {Promise<NextResponse>} JSON response with count of removed associations or error
 *
 * @throws {401} Unauthorized - User authentication required
 * @throws {400} Bad Request - Invalid request body or empty wishIds array
 * @throws {403} Forbidden - User does not have permission to modify this list
 * @throws {404} Not Found - List with specified ID does not exist
 * @throws {500} Internal Server Error - Database or transaction errors
 *
 * @example
 * // Remove multiple wishes from a specific list
 * POST /api/lists/abc123/wishes/bulk-remove
 * {
 *   "wishIds": ["wish1", "wish2", "wish3"]
 * }
 * // Returns: { removed: 3 }
 *
 * @security Non-destructive operation - only removes list associations, preserves wish data
 * @see {@link getCurrentUser} for authentication details
 */
export async function POST(request: NextRequest, { params }: RouteParams) {
  // Check authentication
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json(
      { error: getUserFriendlyError('UNAUTHORIZED'), code: 'UNAUTHORIZED' },
      { status: 401 }
    );
  }

  const { listId } = params;

  // Parse and validate request body
  let wishIds: string[];
  try {
    const body = await request.json() as unknown;
    const validated = BulkRemoveSchema.parse(body);
    wishIds = validated.wishIds;
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
    return NextResponse.json(
      { error: getUserFriendlyError('VALIDATION_ERROR'), code: 'VALIDATION_ERROR' },
      { status: 400 }
    );
  }

  try {
    // Use list service for bulk removal (includes permission check)
    const result = await listService.bulkRemoveWishesFromList(listId, wishIds, user.id);

    // Return appropriate response based on results
    if (result.removed === 0) {
      return NextResponse.json({
        removed: 0,
        message: 'No wishes were found in this list',
      });
    }

    return NextResponse.json({
      removed: result.removed,
      message: `Removed ${result.removed} wish${result.removed === 1 ? '' : 'es'} from list`,
    });
  } catch (error) {
    // Handle validation errors
    if (error instanceof ValidationError) {
      return NextResponse.json(
        {
          error: getUserFriendlyError('VALIDATION_ERROR', error.message),
          code: 'VALIDATION_ERROR',
        },
        { status: 400 }
      );
    }

    // Handle permission errors from centralized service
    if (error instanceof ForbiddenError) {
      return NextResponse.json(
        {
          error: getUserFriendlyError('FORBIDDEN', error.message),
          code: 'FORBIDDEN',
        },
        { status: 403 }
      );
    }

    if (error instanceof NotFoundError) {
      return NextResponse.json(
        {
          error: getUserFriendlyError('NOT_FOUND', error.message),
          code: 'NOT_FOUND',
        },
        { status: 404 }
      );
    }

    logger.error({ error: error }, 'Error bulk removing wishes from list');
    return NextResponse.json(
      { error: 'Something went wrong. Please try again', code: 'INTERNAL_ERROR' },
      { status: 500 }
    );
  }
}
