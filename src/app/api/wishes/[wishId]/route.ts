import { z } from 'zod';

import { NextRequest, NextResponse } from 'next/server';

import { getCurrentUser } from '@/lib/auth-utils';
import { AppError, ForbiddenError, NotFoundError, getUserFriendlyError } from '@/lib/errors';
import { wishService } from '@/lib/services/wish-service';
import { WishUpdateSchema } from '@/lib/validators/wish';
import { serializePrismaResponse } from '@/lib/utils/date-serialization';
import { logger } from '@/lib/services/logger';

interface RouteParams {
  params: {
    wishId: string;
  };
}

/**
 * Handles PUT requests for updating wish details
 *
 * @description Updates wish information (title, notes, url, price, image, etc.) with permission verification
 * @param {NextRequest} request - The incoming HTTP request object with update data in JSON body
 * @param {RouteParams} params - Route parameters containing the wishId
 * @returns {Promise<NextResponse>} JSON response with updated wish data or error
 *
 * @throws {401} Unauthorized - User authentication required
 * @throws {403} Forbidden - User does not have permission to edit this wish
 * @throws {404} Not Found - Wish with specified ID does not exist
 * @throws {400} Bad Request - Invalid input data or validation errors
 * @throws {500} Internal Server Error - Database or service errors
 *
 * @example
 * // Update wish details
 * PUT /api/wishes/def456
 * { "title": "Updated Title", "price": 99.99, "notes": "New notes" }
 * // Returns: { id: "def456", title: "Updated Title", ... }
 *
 * @see {@link getCurrentUser} for authentication details
 * @see {@link WishUpdateSchema} for request validation
 * @see {@link wishService.updateWish} for update logic with permission checks
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
    const data = WishUpdateSchema.parse(body);

    // Update wish
    const updated = await wishService.updateWish(wishId, data, user.id);

    return NextResponse.json(serializePrismaResponse(updated));
  } catch (error) {
    logger.error({ error, userId: user?.id, wishId }, 'PUT /api/wishes/[wishId] error');

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

/**
 * Handles DELETE requests for permanently removing a wish
 *
 * @description Permanently deletes a wish with ownership verification (only wish owner can delete)
 * @param {NextRequest} request - The incoming HTTP request object
 * @param {RouteParams} params - Route parameters containing the wishId
 * @returns {Promise<NextResponse>} No content response (204) on success or error
 *
 * @throws {401} Unauthorized - User authentication required
 * @throws {403} Forbidden - User does not have permission to delete this wish
 * @throws {404} Not Found - Wish with specified ID does not exist
 * @throws {500} Internal Server Error - Database or service errors
 *
 * @example
 * // Delete a wish permanently
 * DELETE /api/wishes/def456
 * // Returns: 204 No Content
 *
 * @security Destructive operation - only wish owner can delete, no recovery possible
 * @see {@link getCurrentUser} for authentication details
 * @see {@link wishService.deleteWish} for deletion logic
 */
export async function DELETE(request: NextRequest, { params }: RouteParams) {
  try {
    // Check authentication
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json(
        { error: getUserFriendlyError('UNAUTHORIZED'), code: 'UNAUTHORIZED' },
        { status: 401 }
      );
    }

    // Delete wish
    await wishService.deleteWish(params.wishId, user.id);

    return new NextResponse(null, { status: 204 });
  } catch (error) {
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
