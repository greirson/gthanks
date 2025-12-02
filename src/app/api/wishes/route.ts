import { z } from 'zod';

import { NextRequest, NextResponse } from 'next/server';

import { getCurrentUserOrToken } from '@/lib/auth-utils';
import { AppError } from '@/lib/errors';
import { listService } from '@/lib/services/list-service';
import { logger } from '@/lib/services/logger';
import { permissionService } from '@/lib/services/permission-service';
import { wishService } from '@/lib/services/wish-service';
import { serializePrismaResponse } from '@/lib/utils/date-serialization';
import { WishCreateSchema, WishQuerySchema } from '@/lib/validators/wish';

/**
 * Handles GET requests for retrieving user wishes with filtering and pagination
 *
 * @description Retrieves wishes for authenticated user with optional filtering by price, priority, and pagination
 * @param {NextRequest} request - The incoming HTTP request with query parameters
 * @returns {Promise<NextResponse>} JSON response with paginated wishes or error
 *
 * @throws {401} Unauthorized - User authentication required
 * @throws {400} Bad Request - Invalid query parameters
 * @throws {500} Internal Server Error - Database or service errors
 */
export async function GET(request: NextRequest) {
  try {
    // Check authentication (supports both session and Bearer token)
    const auth = await getCurrentUserOrToken(request);
    if (!auth) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Parse query parameters
    const searchParams = request.nextUrl.searchParams;
    const queryParams = WishQuerySchema.parse({
      cursor: searchParams.get('cursor') || undefined,
      limit: searchParams.get('limit') ? parseInt(searchParams.get('limit') || '20') : undefined,
      sortBy: searchParams.get('sortBy') || undefined,
      sortOrder: searchParams.get('sortOrder') || undefined,
      priceMin: searchParams.get('priceMin')
        ? parseFloat(searchParams.get('priceMin') || '0')
        : undefined,
      priceMax: searchParams.get('priceMax')
        ? parseFloat(searchParams.get('priceMax') || '0')
        : undefined,
      wishLevelMin: searchParams.get('wishLevelMin')
        ? parseInt(searchParams.get('wishLevelMin') || '1')
        : undefined,
      wishLevelMax: searchParams.get('wishLevelMax')
        ? parseInt(searchParams.get('wishLevelMax') || '3')
        : undefined,
    });

    // Validate ranges if both min and max are provided
    if (
      queryParams.priceMin !== undefined &&
      queryParams.priceMax !== undefined &&
      queryParams.priceMin > queryParams.priceMax
    ) {
      return NextResponse.json(
        { error: 'priceMin cannot be greater than priceMax' },
        { status: 400 }
      );
    }

    if (
      queryParams.wishLevelMin !== undefined &&
      queryParams.wishLevelMax !== undefined &&
      queryParams.wishLevelMin > queryParams.wishLevelMax
    ) {
      return NextResponse.json(
        { error: 'wishLevelMin cannot be greater than wishLevelMax' },
        { status: 400 }
      );
    }

    // Get wishes
    const result = await wishService.getUserWishes(auth.userId, queryParams);

    // Serialize dates in the result and wrap in unified pagination format
    const serializedResult = {
      items: result.items.map((item) => serializePrismaResponse(item)),
      pagination: {
        nextCursor: result.nextCursor || null,
        hasMore: result.hasMore,
        limit: queryParams.limit || 20,
        hasPrevious: false, // Cursor-based pagination doesn't support previous
      },
    };

    return NextResponse.json(serializedResult);
  } catch (error) {
    logger.error({ error: error }, 'GET /api/wishes error');

    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Invalid parameters', details: error.errors },
        { status: 400 }
      );
    }

    return NextResponse.json({ error: 'Failed to fetch wishes' }, { status: 500 });
  }
}

/**
 * Handles POST requests for creating new wishes
 *
 * @description Creates a new wish for the authenticated user with validation and error handling
 * @param {NextRequest} request - The incoming HTTP request object with wish data in JSON body
 * @returns {Promise<NextResponse>} JSON response with created wish data or error
 *
 * @throws {401} Unauthorized - User authentication required
 * @throws {400} Bad Request - Invalid wish data or validation errors
 * @throws {500} Internal Server Error - Database or service errors
 *
 * @example
 * // Create a new wish
 * POST /api/wishes
 * {
 *   "title": "New Book",
 *   "description": "Latest bestseller",
 *   "url": "https://example.com/book",
 *   "listId": "abc123"
 * }
 *
 * @see {@link getCurrentUserOrToken} for authentication details
 * @see {@link WishCreateSchema} for request validation
 */
export async function POST(request: NextRequest) {
  try {
    // Check authentication (supports both session and Bearer token)
    const auth = await getCurrentUserOrToken(request);
    if (!auth) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Parse and validate body
    const body = (await request.json()) as unknown;
    const validatedData = WishCreateSchema.parse(body);

    // Extract listIds from validated data (not passed to wish service)
    const { listIds, ...wishData } = validatedData;

    // Create wish
    const wish = await wishService.createWish(wishData, auth.userId);

    // Track which lists the wish was added to
    const addedToLists: string[] = [];

    // If listIds provided, add wish to those lists
    if (listIds && listIds.length > 0) {
      // Check permissions and add to each list silently (don't fail on permission errors)
      for (const listId of listIds) {
        try {
          // Check if user can edit this list (owner or co-admin)
          const { allowed } = await permissionService.can(auth.userId, 'edit', {
            type: 'list',
            id: listId,
          });

          if (allowed) {
            // Add wish to list via service layer
            await listService.addWishToList(listId, { wishId: wish.id }, auth.userId);
            addedToLists.push(listId);
          } else {
            // Log warning but don't expose which lists exist
            logger.warn(
              { userId: auth.userId, listId, wishId: wish.id },
              'User lacks permission to add wish to list'
            );
          }
        } catch (listError) {
          // Log error but continue with other lists
          // Don't expose list existence information
          logger.warn(
            { userId: auth.userId, listId, wishId: wish.id, error: listError },
            'Failed to add wish to list'
          );
        }
      }
    }

    // Serialize dates before returning
    const serializedWish = serializePrismaResponse(wish);

    return NextResponse.json(
      {
        ...serializedWish,
        addedToLists,
      },
      { status: 201 }
    );
  } catch (error) {
    logger.error({ error: error }, 'POST /api/wishes error');

    if (error instanceof z.ZodError) {
      const firstError = error.errors[0];
      return NextResponse.json(
        {
          error: firstError.message,
          field: firstError.path.join('.'),
          code: 'VALIDATION_ERROR',
        },
        { status: 400 }
      );
    }

    if (error instanceof AppError) {
      return NextResponse.json(
        {
          error: error.message,
          code: error.code,
          field: error.field,
        },
        { status: error.statusCode }
      );
    }

    return NextResponse.json({ error: 'Failed to create wish' }, { status: 500 });
  }
}
