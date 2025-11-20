import { z } from 'zod';

import { NextRequest, NextResponse } from 'next/server';

import { getCurrentUser } from '@/lib/auth-utils';
import { AppError, ForbiddenError, NotFoundError, getUserFriendlyError } from '@/lib/errors';
import { logger } from '@/lib/services/logger';
import { wishService } from '@/lib/services/wish-service';
import { serializePrismaResponse } from '@/lib/utils/date-serialization';

interface RouteParams {
  params: {
    wishId: string;
  };
}

// Input validation schema
const UpdateMembershipsSchema = z.object({
  listIds: z.array(z.string()),
});

/**
 * Handles PUT requests for updating which lists a wish belongs to
 *
 * @description Transactionally updates list memberships for a wish (complete replacement)
 * @param {NextRequest} request - The incoming HTTP request with { listIds: string[] }
 * @param {RouteParams} params - Route parameters containing the wish ID
 * @returns {Promise<NextResponse>} JSON response with { success: boolean }
 *
 * @throws {401} Unauthorized - User authentication required
 * @throws {403} Forbidden - User does not own the wish or target lists
 * @throws {404} Not Found - Wish or list does not exist
 * @throws {400} Bad Request - Invalid input data
 * @throws {500} Internal Server Error - Database or transaction errors
 *
 * @example
 * // Update wish to belong to specific lists
 * PUT /api/wishes/abc123/memberships
 * { "listIds": ["list1", "list2", "list3"] }
 * // Returns: { "success": true }
 *
 * @security Requires user to own both the wish and all target lists
 * @see {@link getCurrentUser} for authentication details
 * @see {@link permissionService} for authorization checks
 */
export async function PUT(request: NextRequest, { params }: RouteParams) {
  let user: Awaited<ReturnType<typeof getCurrentUser>> | null = null;
  const { wishId } = params;

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
    const body = (await request.json()) as unknown;
    const { listIds } = UpdateMembershipsSchema.parse(body);

    // Use service layer to update list memberships
    const result = await wishService.updateWishListMemberships(wishId, listIds, user.id);

    return NextResponse.json(serializePrismaResponse(result));
  } catch (error) {
    logger.error(
      { error, userId: user?.id, wishId },
      'PUT /api/wishes/[wishId]/memberships error'
    );

    if (error instanceof z.ZodError) {
      return NextResponse.json(
        {
          error: getUserFriendlyError('VALIDATION_ERROR', error.errors[0].message),
          code: 'VALIDATION_ERROR',
        },
        { status: 400 }
      );
    }

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
