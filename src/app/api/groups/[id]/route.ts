import { z } from 'zod';

import { NextRequest, NextResponse } from 'next/server';

import { getCurrentUser } from '@/lib/auth-utils';
import { AppError, ForbiddenError, NotFoundError, getUserFriendlyError } from '@/lib/errors';
import { groupService } from '@/lib/services/group/group.service';
import { permissionService } from '@/lib/services/permission-service';
import { serializePrismaResponse } from '@/lib/utils/date-serialization';
import { GroupUpdateSchema } from '@/lib/validators/group';
import { logger } from '@/lib/services/logger';

interface RouteParams {
  params: {
    id: string;
  };
}

/**
 * Handles PATCH requests for updating group details
 *
 * @description Updates group information (name, description, avatarUrl, visibility) with permission verification
 * @param {NextRequest} request - The incoming HTTP request object with update data in JSON body
 * @param {RouteParams} params - Route parameters containing the group id
 * @returns {Promise<NextResponse>} JSON response with updated group data or error
 *
 * @throws {401} Unauthorized - User authentication required
 * @throws {403} Forbidden - User does not have permission to edit this group
 * @throws {404} Not Found - Group with specified ID does not exist
 * @throws {400} Bad Request - Invalid input data or validation errors
 * @throws {500} Internal Server Error - Database or service errors
 *
 * @example
 * // Update group details
 * PATCH /api/groups/abc123
 * { "name": "Updated Group", "description": "New description", "visibility": "public" }
 * // Returns: { id: "abc123", name: "Updated Group", ... }
 *
 * @see {@link getCurrentUser} for authentication details
 * @see {@link GroupUpdateSchema} for request validation
 * @see {@link groupService.updateGroup} for update logic with permission checks
 */
export async function PATCH(request: NextRequest, { params }: RouteParams) {
  let user: Awaited<ReturnType<typeof getCurrentUser>> | null = null;

  try {
    user = await getCurrentUser();

    if (!user) {
      return NextResponse.json(
        { error: getUserFriendlyError('UNAUTHORIZED'), code: 'UNAUTHORIZED' },
        { status: 401 }
      );
    }

    // Parse and validate request body
    const body = (await request.json()) as unknown;
    const data = GroupUpdateSchema.parse(body);

    // Update group
    await groupService.updateGroup(params.id, data, user.id);

    // Get full group details to return to the client (matches POST pattern)
    const groupWithDetails = await groupService.getGroup(params.id, user.id);

    // Serialize dates before returning
    const serializedGroup = serializePrismaResponse(groupWithDetails);

    return NextResponse.json(serializedGroup);
  } catch (error) {
    logger.error({ error, userId: user?.id, groupId: params.id }, 'PATCH /api/groups/[id] error');

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
 * Handles DELETE requests for permanently removing a group
 *
 * @description Permanently deletes a group and all associated data including members and shared lists (only group owners can delete)
 * @param {NextRequest} request - The incoming HTTP request object
 * @param {RouteParams} params - Route parameters containing the group id
 * @returns {Promise<NextResponse>} JSON response with success confirmation or error
 *
 * @throws {401} Unauthorized - User authentication required
 * @throws {403} Forbidden - User does not have permission to delete this group
 * @throws {404} Not Found - Group with specified ID does not exist
 * @throws {500} Internal Server Error - Database or service errors
 *
 * @example
 * // Delete a group permanently
 * DELETE /api/groups/abc123
 * // Returns: { success: true }
 *
 * @security Destructive operation - only group owners can delete, removes all members and shared content
 * @see {@link getCurrentUser} for authentication details
 * @see {@link permissionService.require} for delete permission validation
 * @see {@link groupService.deleteGroup} for deletion logic with cascade handling
 */
export async function DELETE(request: NextRequest, { params }: RouteParams) {
  try {
    const user = await getCurrentUser();

    if (!user) {
      return NextResponse.json(
        { error: getUserFriendlyError('UNAUTHORIZED'), code: 'UNAUTHORIZED' },
        { status: 401 }
      );
    }

    // Check if user can delete this group
    await permissionService.require(user.id, 'delete', { type: 'group', id: params.id });

    await groupService.deleteGroup(params.id, user.id);

    return NextResponse.json({ success: true });
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
