import { NextRequest, NextResponse } from 'next/server';

import { getCurrentUser } from '@/lib/auth-utils';
import { AppError } from '@/lib/errors';
import { wishService } from '@/lib/services/wish-service';

/**
 * Handles GET requests for retrieving user's wish count statistics
 *
 * @description Retrieves count statistics for the authenticated user's wishes including total counts and status categorization
 * @param {NextRequest} _request - The incoming HTTP request object (unused parameter)
 * @returns {Promise<NextResponse>} JSON response with wish count data or error
 *
 * @throws {401} Unauthorized - User authentication required
 * @throws {500} Internal Server Error - Database or service errors
 *
 * @example
 * // Get current user's wish count statistics
 * GET /api/wishes/count
 * // Returns: { total: 15, reserved: 3, available: 12, fulfilled: 0 }
 *
 * @see {@link getCurrentUser} for authentication details
 * @see {@link wishService.getWishesCount} for business logic
 */
export async function GET(_request: NextRequest) {
  try {
    const user = await getCurrentUser();

    if (!user) {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
    }

    const result = await wishService.getWishesCount(user.id);

    return NextResponse.json(result);
  } catch (error) {
    if (error instanceof AppError) {
      return NextResponse.json(
        { error: error.message, code: error.code },
        { status: error.statusCode }
      );
    }

    return NextResponse.json({ error: 'Failed to get wishes count' }, { status: 500 });
  }
}
