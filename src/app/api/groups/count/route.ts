import { NextRequest, NextResponse } from 'next/server';

import { getCurrentUser } from '@/lib/auth-utils';
import { AppError } from '@/lib/errors';
import { groupService } from '@/lib/services/group/group.service';

/**
 * Handles GET requests for retrieving user's group count statistics
 *
 * @description Retrieves count statistics for the authenticated user's groups including total counts and categorization
 * @param {NextRequest} _request - The incoming HTTP request object (unused parameter)
 * @returns {Promise<NextResponse>} JSON response with group count data or error
 *
 * @throws {401} Unauthorized - User authentication required
 * @throws {500} Internal Server Error - Database or service errors
 *
 * @example
 * // Get current user's group count statistics
 * GET /api/groups/count
 * // Returns: { total: 3, adminOf: 1, memberOf: 2 }
 *
 * @see {@link getCurrentUser} for authentication details
 * @see {@link groupService.getGroupsCount} for business logic
 */
export async function GET(_request: NextRequest) {
  try {
    const user = await getCurrentUser();

    if (!user) {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
    }

    const result = await groupService.getGroupsCount(user.id);

    return NextResponse.json(result);
  } catch (error) {
    if (error instanceof AppError) {
      return NextResponse.json(
        { error: error.message, code: error.code },
        { status: error.statusCode }
      );
    }

    return NextResponse.json({ error: 'Failed to get groups count' }, { status: 500 });
  }
}
