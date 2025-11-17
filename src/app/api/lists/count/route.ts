import { NextRequest, NextResponse } from 'next/server';

import { getCurrentUser } from '@/lib/auth-utils';
import { AppError } from '@/lib/errors';
import { listService } from '@/lib/services/list-service';

/**
 * Handles GET requests for retrieving user's list count statistics
 *
 * @description Retrieves count statistics for the authenticated user's lists including total counts and categorization
 * @param {NextRequest} _request - The incoming HTTP request object (unused parameter)
 * @returns {Promise<NextResponse>} JSON response with list count data or error
 *
 * @throws {401} Unauthorized - User authentication required
 * @throws {500} Internal Server Error - Database or service errors
 *
 * @example
 * // Get current user's list count statistics
 * GET /api/lists/count
 * // Returns: { total: 5, public: 2, private: 3 }
 *
 * @see {@link getCurrentUser} for authentication details
 * @see {@link listService.getListsCount} for business logic
 */
export async function GET(_request: NextRequest) {
  try {
    const user = await getCurrentUser();

    if (!user) {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
    }

    const result = await listService.getListsCount(user.id);

    return NextResponse.json(result);
  } catch (error) {
    if (error instanceof AppError) {
      return NextResponse.json(
        { error: error.message, code: error.code },
        { status: error.statusCode }
      );
    }

    return NextResponse.json({ error: 'Failed to get lists count' }, { status: 500 });
  }
}
