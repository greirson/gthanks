import { NextRequest, NextResponse } from 'next/server';

import { getCurrentUser } from '@/lib/auth-utils';
import { ForbiddenError, getUserFriendlyError } from '@/lib/errors';
import { listService } from '@/lib/services/list-service';
import { logger } from '@/lib/services/logger';

interface RouteParams {
  params: { listId: string };
}

/**
 * Handles POST requests for initializing custom sort order on a list
 *
 * @description Assigns sequential sortOrder values to all wishes in a list based on their current order.
 * This endpoint is called when a user first switches to "Custom Order" sort mode.
 * The operation is idempotent - safe to call multiple times without side effects.
 *
 * @param {NextRequest} _request - The incoming HTTP request object (no body required)
 * @param {RouteParams} params - Route parameters containing the listId
 * @returns {Promise<NextResponse>} JSON response with initialization result or error
 *
 * @throws {401} Unauthorized - User authentication required
 * @throws {403} Forbidden - User does not have permission to modify this list
 * @throws {404} Not Found - List with specified ID does not exist
 * @throws {500} Internal Server Error - Database or service errors
 *
 * @example
 * // Initialize custom sort for a list
 * POST /api/lists/abc123/wishes/initialize-custom-sort
 * // Returns: { initialized: 5 }  // 5 wishes were assigned sortOrder values
 *
 * @security Requires list owner or co-admin permissions
 * @see {@link getCurrentUser} for authentication details
 * @see {@link listService.initializeCustomSort} for business logic
 */
export async function POST(_request: NextRequest, { params }: RouteParams) {
  try {
    // Check authentication
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json(
        { error: getUserFriendlyError('UNAUTHORIZED'), code: 'UNAUTHORIZED' },
        { status: 401 }
      );
    }

    const { listId } = params;

    // Initialize custom sort order
    const result = await listService.initializeCustomSort(listId, user.id);

    return NextResponse.json(result, { status: 200 });
  } catch (error) {
    logger.error({ error: error }, 'POST /api/lists/[listId]/wishes/initialize-custom-sort error');

    if (error instanceof ForbiddenError) {
      return NextResponse.json(
        { error: getUserFriendlyError('FORBIDDEN', error.message), code: 'FORBIDDEN' },
        { status: 403 }
      );
    }

    return NextResponse.json(
      { error: 'Something went wrong. Please try again', code: 'INTERNAL_ERROR' },
      { status: 500 }
    );
  }
}
