import { z } from 'zod';

import { NextRequest, NextResponse } from 'next/server';

import { getCurrentUser } from '@/lib/auth-utils';
import { db } from '@/lib/db';
import { AppError, ForbiddenError, NotFoundError, getUserFriendlyError } from '@/lib/errors';
import { permissionService } from '@/lib/services/permission-service';
import { logger } from '@/lib/services/logger';
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
    const { listIds: rawListIds } = UpdateMembershipsSchema.parse(body);
    const listIds = [...new Set(rawListIds)]; // Deduplicate list IDs

    // Verify user owns the wish using permission service (MANDATORY)
    await permissionService.require(user.id, 'edit', { type: 'wish', id: wishId });

    // Verify wish exists
    const wish = await db.wish.findUnique({
      where: { id: wishId },
      select: { id: true, ownerId: true },
    });

    if (!wish) {
      throw new NotFoundError('Wish not found');
    }

    // Verify user owns all target lists
    if (listIds.length > 0) {
      const targetLists = await db.list.findMany({
        where: { id: { in: listIds } },
        select: { id: true, ownerId: true },
      });

      // Check if all requested lists exist
      if (targetLists.length !== listIds.length) {
        const foundIds = targetLists.map((l) => l.id);
        const missingIds = listIds.filter((id) => !foundIds.includes(id));
        throw new NotFoundError(`Lists not found: ${missingIds.join(', ')}`);
      }

      // Check if user owns all target lists
      const unauthorizedLists = targetLists.filter((list) => list.ownerId !== user!.id);
      if (unauthorizedLists.length > 0) {
        throw new ForbiddenError(
          `Cannot add wish to lists you don't own: ${unauthorizedLists.map((l) => l.id).join(', ')}`
        );
      }
    }

    // Transactionally update list memberships
    await db.$transaction(async (tx) => {
      // Get current list memberships
      const currentMemberships = await tx.listWish.findMany({
        where: { wishId },
        select: { listId: true },
      });

      const currentListIds = currentMemberships.map((m) => m.listId);

      // Calculate diff
      const toRemove = currentListIds.filter((id) => !listIds.includes(id));
      const toAdd = listIds.filter((id) => !currentListIds.includes(id));

      // Remove wish from lists no longer selected
      if (toRemove.length > 0) {
        await tx.listWish.deleteMany({
          where: {
            wishId,
            listId: { in: toRemove },
          },
        });
      }

      // Add wish to newly selected lists
      if (toAdd.length > 0) {
        await tx.listWish.createMany({
          data: toAdd.map((listId) => ({
            wishId,
            listId,
          })),
        });
      }
    });

    return NextResponse.json(serializePrismaResponse({ success: true }));
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
