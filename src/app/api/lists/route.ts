import { NextRequest, NextResponse } from 'next/server';

import { getCurrentUser } from '@/lib/auth-utils';
import { handleApiError } from '@/lib/errors';
import { listService } from '@/lib/services/list-service';
import { ListCreateSchema, ListPaginationSchema } from '@/lib/validators/list';
import { serializePrismaArray, serializePrismaResponse } from '@/lib/utils/date-serialization';

/**
 * Handles GET requests for retrieving user lists with pagination
 *
 * @description Retrieves all lists owned by or shared with the authenticated user
 * @param {NextRequest} request - The incoming HTTP request with query parameters
 * @returns {Promise<NextResponse>} JSON response with paginated lists or error
 *
 * @throws {401} Unauthorized - User authentication required
 * @throws {500} Internal Server Error - Database or service errors
 */
export async function GET(request: NextRequest) {
  try {
    // Check authentication
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Parse query parameters
    const searchParams = request.nextUrl.searchParams;
    const limitParam = searchParams.get('limit');
    const pagination = ListPaginationSchema.parse({
      cursor: searchParams.get('cursor') || undefined,
      limit: limitParam ? parseInt(limitParam) : undefined,
      search: searchParams.get('search') || undefined,
    });

    // Get lists
    const result = await listService.getUserLists(user.id, pagination);

    // Serialize dates in the result
    const serializedLists = serializePrismaArray(result.lists);

    // Transform to unified pagination response format
    const response = {
      items: serializedLists,
      pagination: {
        hasMore: result.hasMore,
        nextCursor:
          result.hasMore && serializedLists.length > 0
            ? serializedLists[serializedLists.length - 1].id
            : null,
        limit: pagination.limit || 20,
        // Page-based fields omitted for cursor pagination (will be undefined, not null)
      },
    };

    return NextResponse.json(response);
  } catch (error) {
    return handleApiError(error);
  }
}

/**
 * Handles POST requests for creating new wishlists
 *
 * @description Creates a new wishlist for the authenticated user with validation and data processing
 * @param {NextRequest} request - The incoming HTTP request object with list creation data in JSON body
 * @returns {Promise<NextResponse>} JSON response with created list data or error
 *
 * @throws {401} Unauthorized - User authentication required
 * @throws {400} Bad Request - Invalid list data or validation errors
 * @throws {500} Internal Server Error - Database or service errors
 *
 * @example
 * // Create a new list
 * POST /api/lists
 * {
 *   "name": "Birthday Wishes 2024",
 *   "description": "My birthday wishlist",
 *   "visibility": "private"
 * }
 *
 * @see {@link getCurrentUser} for authentication details
 * @see {@link ListCreateSchema} for request validation
 */
export async function POST(request: NextRequest) {
  try {
    // Check authentication
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Parse and validate body
    const body = (await request.json()) as unknown;
    const validatedData = ListCreateSchema.parse(body);

    // Create list
    const list = await listService.createList(validatedData, user.id);

    // Serialize dates before returning
    const serializedList = serializePrismaResponse(list);

    return NextResponse.json(serializedList, { status: 201 });
  } catch (error) {
    return handleApiError(error);
  }
}
