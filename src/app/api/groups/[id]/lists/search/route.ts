import { NextRequest, NextResponse } from 'next/server';

import { getCurrentUser } from '@/lib/auth-utils';
import { AppError } from '@/lib/errors';
import { groupService } from '@/lib/services/group/group.service';
import { permissionService } from '@/lib/services/permission-service';
import { serializePrismaResponse } from '@/lib/utils/date-serialization';
import { createUnifiedPagination } from '@/lib/utils/pagination-adapters';

interface RouteParams {
  params: {
    id: string;
  };
}

/**
 * Handles GET requests for searching lists available to share with a group
 *
 * @description Searches for lists that can be shared with a group based on query string.
 * Only returns lists not already shared with the group. Requires group admin permissions.
 * Searches both list names and descriptions with case-insensitive matching.
 *
 * @param {NextRequest} request - The incoming HTTP request object with search parameters
 * @param {RouteParams} params - Route parameters containing the group id
 * @returns {Promise<NextResponse>} JSON response with search results and pagination info
 *
 * @throws {401} Unauthorized - User authentication required
 * @throws {400} Bad Request - Invalid or missing query parameters
 * @throws {403} Forbidden - User does not have admin permissions for this group
 * @throws {404} Not Found - Group with specified ID does not exist
 * @throws {500} Internal Server Error - Database or service errors
 *
 * @example
 * // Search for lists containing "birthday"
 * GET /api/groups/abc123/lists/search?q=birthday&limit=10&offset=0
 * // Returns: {
 * //   data: { lists: [...] },
 * //   pagination: { hasMore: true, total: 25 }
 * // }
 *
 * @see {@link getCurrentUser} for authentication details
 * @see {@link permissionService.require} for admin permission validation
 * @see {@link groupService.searchListsForGroup} for search logic
 */
export async function GET(request: NextRequest, { params }: RouteParams) {
  try {
    const user = await getCurrentUser();

    if (!user) {
      return NextResponse.json(
        {
          error: {
            message: 'Authentication required',
            code: 'UNAUTHORIZED',
          },
        },
        { status: 401 }
      );
    }

    // Check if user has access to view group lists
    await permissionService.require(user.id, 'view', { type: 'group', id: params.id });

    const { searchParams } = new URL(request.url);
    const query = searchParams.get('q');
    const limit = parseInt(searchParams.get('limit') || '20', 10);
    const offset = parseInt(searchParams.get('offset') || '0', 10);

    // Validate query parameter
    if (!query || query.trim() === '') {
      return NextResponse.json(
        {
          error: {
            message: "Search query parameter 'q' is required",
            code: 'VALIDATION_ERROR',
            field: 'q',
          },
        },
        { status: 400 }
      );
    }

    // Validate query length
    if (query.length > 100) {
      return NextResponse.json(
        {
          error: {
            message: 'Search query must be between 1 and 100 characters',
            code: 'VALIDATION_ERROR',
            field: 'q',
          },
        },
        { status: 400 }
      );
    }

    // Validate limit
    if (isNaN(limit) || limit < 1 || limit > 100) {
      return NextResponse.json(
        {
          error: {
            message: 'Limit must be between 1 and 100',
            code: 'VALIDATION_ERROR',
            field: 'limit',
          },
        },
        { status: 400 }
      );
    }

    // Validate offset
    if (isNaN(offset) || offset < 0) {
      return NextResponse.json(
        {
          error: {
            message: 'Offset must be a non-negative number',
            code: 'VALIDATION_ERROR',
            field: 'offset',
          },
        },
        { status: 400 }
      );
    }

    // Call the group service to search lists
    const result = await groupService.searchListsForGroup(
      params.id,
      {
        query,
        limit,
        offset,
      },
      user.id
    );

    // Transform the result to unified pagination format with proper date serialization
    const totalEstimate = result.hasMore ? offset + limit + 1 : offset + result.lists.length;
    const response = createUnifiedPagination(
      result.lists.map((list) => {
        const serializedList = serializePrismaResponse(list);
        return {
          id: serializedList.id,
          name: serializedList.name,
          description: serializedList.description,
          isPublic: serializedList.visibility === 'public',
          hasPassword: serializedList.password !== null,
          shareToken: serializedList.shareToken,
          createdAt: serializedList.createdAt,
          updatedAt: serializedList.updatedAt,
          owner: {
            id: serializedList.user.id,
            name: serializedList.user.name,
          },
          _count: serializedList._count,
        };
      }),
      Math.floor(offset / limit) + 1,
      limit,
      totalEstimate
    );

    return NextResponse.json(response);
  } catch (error) {
    if (error instanceof AppError) {
      return NextResponse.json(
        {
          error: {
            message: error.message,
            code: error.code,
          },
        },
        { status: error.statusCode }
      );
    }

    return NextResponse.json(
      {
        error: {
          message: 'Failed to search group lists',
          code: 'INTERNAL_ERROR',
        },
      },
      { status: 500 }
    );
  }
}
