import { z } from 'zod';

import { NextRequest, NextResponse } from 'next/server';

import { getCurrentUserOrToken, type AuthResult } from '@/lib/auth-utils';
import { AppError, ForbiddenError, NotFoundError, getUserFriendlyError } from '@/lib/errors';
import { listService } from '@/lib/services/list-service';
import { ListUpdateSchema } from '@/lib/validators/list';
import { logger } from '@/lib/services/logger';

interface RouteParams {
  params: { listId: string };
}

/**
 * Handles GET requests for fetching list details
 *
 * @description Retrieves detailed list information including wishes, admins, and groups with permission verification
 * @param {NextRequest} request - The incoming HTTP request object
 * @param {RouteParams} params - Route parameters containing the listId
 * @returns {Promise<NextResponse>} JSON response with list details or error
 *
 * @throws {401} Unauthorized - User authentication required
 * @throws {403} Forbidden - User does not have permission to view this list
 * @throws {404} Not Found - List with specified ID does not exist
 * @throws {500} Internal Server Error - Database or service errors
 *
 * @example
 * // Get list details
 * GET /api/lists/abc123
 * // Returns: { id: "abc123", name: "My List", wishes: [...], ... }
 *
 * @see {@link getCurrentUser} for authentication details
 * @see {@link listService.getList} for fetch logic with permission checks
 */
export async function GET(request: NextRequest, { params }: RouteParams) {
  let auth: AuthResult | null = null;
  const { listId } = params;

  try {
    // Check authentication (supports both session and Bearer token)
    auth = await getCurrentUserOrToken(request);
    if (!auth) {
      return NextResponse.json(
        { error: getUserFriendlyError('UNAUTHORIZED'), code: 'UNAUTHORIZED' },
        { status: 401 }
      );
    }

    // Fetch list with details
    const list = await listService.getList(listId, auth.userId);

    return NextResponse.json(list);
  } catch (error) {
    logger.error({ error, userId: auth?.userId, listId }, 'GET /api/lists/[listId] error');

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
 * Handles PUT requests for updating list details
 *
 * @description Updates list information (name, description, visibility, password) with permission verification
 * @param {NextRequest} request - The incoming HTTP request object with update data in JSON body
 * @param {RouteParams} params - Route parameters containing the listId
 * @returns {Promise<NextResponse>} JSON response with updated list data or error
 *
 * @throws {401} Unauthorized - User authentication required
 * @throws {403} Forbidden - User does not have permission to edit this list
 * @throws {404} Not Found - List with specified ID does not exist
 * @throws {400} Bad Request - Invalid input data or validation errors
 * @throws {500} Internal Server Error - Database or service errors
 *
 * @example
 * // Update list details
 * PUT /api/lists/abc123
 * { "name": "Updated List", "description": "New description", "visibility": "public" }
 * // Returns: { id: "abc123", name: "Updated List", ... }
 *
 * @see {@link getCurrentUser} for authentication details
 * @see {@link ListUpdateSchema} for request validation
 * @see {@link listService.updateList} for update logic with permission checks
 */
export async function PUT(request: NextRequest, { params }: RouteParams) {
  let auth: AuthResult | null = null;
  const { listId } = params;

  try {
    // Check authentication (supports both session and Bearer token)
    auth = await getCurrentUserOrToken(request);
    if (!auth) {
      return NextResponse.json(
        { error: getUserFriendlyError('UNAUTHORIZED'), code: 'UNAUTHORIZED' },
        { status: 401 }
      );
    }

    // Parse and validate request body
    const body = (await request.json()) as unknown;
    const data = ListUpdateSchema.parse(body);

    // Update list
    const updated = await listService.updateList(listId, data, auth.userId);

    return NextResponse.json(updated);
  } catch (error) {
    logger.error({ error, userId: auth?.userId, listId }, 'PUT /api/lists/[listId] error');

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
 * Handles DELETE requests for permanently removing a list
 *
 * @description Permanently deletes a list and all associated wishes with ownership verification (only list owner can delete)
 * @param {NextRequest} request - The incoming HTTP request object
 * @param {RouteParams} params - Route parameters containing the listId
 * @returns {Promise<NextResponse>} JSON response with success confirmation or error
 *
 * @throws {401} Unauthorized - User authentication required
 * @throws {403} Forbidden - User does not have permission to delete this list
 * @throws {404} Not Found - List with specified ID does not exist
 * @throws {500} Internal Server Error - Database or service errors
 *
 * @example
 * // Delete a list permanently
 * DELETE /api/lists/abc123
 * // Returns: { success: true }
 *
 * @security Destructive operation - only list owner can delete, no recovery possible
 * @see {@link getCurrentUser} for authentication details
 * @see {@link listService.deleteList} for deletion logic with cascade handling
 */
export async function DELETE(request: NextRequest, { params }: RouteParams) {
  let auth: AuthResult | null = null;
  const { listId } = params;

  try {
    // Check authentication (supports both session and Bearer token)
    auth = await getCurrentUserOrToken(request);
    if (!auth) {
      return NextResponse.json(
        { error: getUserFriendlyError('UNAUTHORIZED'), code: 'UNAUTHORIZED' },
        { status: 401 }
      );
    }

    // Delete list
    await listService.deleteList(listId, auth.userId);

    return NextResponse.json({ success: true });
  } catch (error) {
    logger.error({ error, userId: auth?.userId, listId }, 'DELETE /api/lists/[listId] error');

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
