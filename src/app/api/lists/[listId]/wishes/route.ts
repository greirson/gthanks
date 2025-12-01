import { z } from 'zod';

import { NextRequest, NextResponse } from 'next/server';

import { getCurrentUserOrToken } from '@/lib/auth-utils';
import { ForbiddenError, NotFoundError, getUserFriendlyError } from '@/lib/errors';
import { listService } from '@/lib/services/list-service';
import { AddWishToListSchema, RemoveWishFromListSchema } from '@/lib/validators/list';
import { logger } from '@/lib/services/logger';

interface RouteParams {
  params: { listId: string };
}

/**
 * Handles POST requests for adding wishes to a specific list
 *
 * @description Adds wish to the specified list (creates list-wish association)
 * @param {NextRequest} request - The incoming HTTP request object with wish data in JSON body
 * @param {RouteParams} params - Route parameters containing the listId
 * @returns {Promise<NextResponse>} JSON response with success confirmation or error
 *
 * @throws {401} Unauthorized - User authentication required
 * @throws {400} Bad Request - Invalid wish data or validation errors
 * @throws {403} Forbidden - User does not have permission to modify this list or wish
 * @throws {404} Not Found - List or wish with specified ID does not exist
 * @throws {500} Internal Server Error - Database or service errors
 *
 * @example
 * // Add wish to list
 * POST /api/lists/abc123/wishes
 * {
 *   "wishId": "def456"
 * }
 * // Returns: { success: true }
 *
 * @see {@link getCurrentUser} for authentication details
 * @see {@link AddWishToListSchema} for request validation
 * @see {@link listService.addWishToList} for business logic
 */
export async function POST(request: NextRequest, { params }: RouteParams) {
  try {
    // Check authentication
    const auth = await getCurrentUserOrToken(request);
    if (!auth) {
      return NextResponse.json(
        { error: getUserFriendlyError('UNAUTHORIZED'), code: 'UNAUTHORIZED' },
        { status: 401 }
      );
    }

    const { listId } = params;

    // Parse and validate body
    const body = (await request.json()) as unknown;
    const validatedData = AddWishToListSchema.parse(body);

    // Add wish to list
    await listService.addWishToList(listId, validatedData, auth.userId);

    return NextResponse.json({ success: true });
  } catch (error) {
    logger.error({ error: error }, 'POST /api/lists/[listId]/wishes error');

    if (error instanceof z.ZodError) {
      const firstError = error.errors[0];
      return NextResponse.json(
        {
          error: getUserFriendlyError('VALIDATION_ERROR', firstError.message),
          field: firstError.path.join('.'),
          code: 'VALIDATION_ERROR',
        },
        { status: 400 }
      );
    }

    if (error instanceof NotFoundError) {
      return NextResponse.json(
        { error: getUserFriendlyError('NOT_FOUND', error.message), code: 'NOT_FOUND' },
        { status: 404 }
      );
    }

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

/**
 * Handles DELETE requests for removing wishes from a specific list
 *
 * @description Removes wish association from the specified list (wish itself remains, only list membership is removed)
 * @param {NextRequest} request - The incoming HTTP request object with wish removal data in JSON body
 * @param {RouteParams} params - Route parameters containing the listId
 * @returns {Promise<NextResponse>} JSON response with success confirmation or error
 *
 * @throws {401} Unauthorized - User authentication required
 * @throws {400} Bad Request - Invalid wish data, validation errors, or wish not in list
 * @throws {403} Forbidden - User does not have permission to modify this list
 * @throws {404} Not Found - List with specified ID does not exist
 * @throws {500} Internal Server Error - Database or service errors
 *
 * @example
 * // Remove wish from list (wish itself is preserved)
 * DELETE /api/lists/abc123/wishes
 * {
 *   "wishId": "def456"
 * }
 * // Returns: { success: true }
 *
 * @security Non-destructive operation - only removes list association, preserves wish data
 * @see {@link getCurrentUser} for authentication details
 * @see {@link RemoveWishFromListSchema} for request validation
 * @see {@link listService.removeWishFromList} for business logic
 */
export async function DELETE(request: NextRequest, { params }: RouteParams) {
  try {
    // Check authentication
    const auth = await getCurrentUserOrToken(request);
    if (!auth) {
      return NextResponse.json(
        { error: getUserFriendlyError('UNAUTHORIZED'), code: 'UNAUTHORIZED' },
        { status: 401 }
      );
    }

    const { listId } = params;

    // Parse and validate body
    const body = (await request.json()) as unknown;
    const validatedData = RemoveWishFromListSchema.parse(body);

    // Remove wish from list
    await listService.removeWishFromList(listId, validatedData, auth.userId);

    return NextResponse.json({ success: true });
  } catch (error) {
    logger.error({ error: error }, 'DELETE /api/lists/[listId]/wishes error');

    if (error instanceof z.ZodError) {
      const firstError = error.errors[0];
      return NextResponse.json(
        {
          error: getUserFriendlyError('VALIDATION_ERROR', firstError.message),
          field: firstError.path.join('.'),
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

    return NextResponse.json(
      { error: 'Something went wrong. Please try again', code: 'INTERNAL_ERROR' },
      { status: 500 }
    );
  }
}
