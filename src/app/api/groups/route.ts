import { z } from 'zod';

import { NextRequest, NextResponse } from 'next/server';

import { getCurrentUser } from '@/lib/auth-utils';
import { AppError } from '@/lib/errors';
import { groupService } from '@/lib/services/group/group.service';
import { createUnifiedPagination } from '@/lib/utils/pagination-adapters';
import { GroupCreateSchema } from '@/lib/validators/group';
import { serializePrismaArray, serializePrismaResponse } from '@/lib/utils/date-serialization';

/**
 * Handles GET requests for retrieving user groups with pagination
 *
 * @description Retrieves all groups the authenticated user is a member of
 * @param {NextRequest} request - The incoming HTTP request with query parameters
 * @returns {Promise<NextResponse>} JSON response with paginated groups or error
 *
 * @throws {401} Unauthorized - User authentication required
 * @throws {500} Internal Server Error - Database or service errors
 */
export async function GET(request: NextRequest) {
  try {
    const user = await getCurrentUser();

    if (!user) {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '20');
    const search = searchParams.get('search') || undefined;

    const result = await groupService.getUserGroups(user.id, {
      page,
      limit,
      search,
    });

    // Transform to unified format with estimated total based on hasMore
    const totalEstimate = result.hasMore ? (page + 1) * limit : page * limit;
    const response = createUnifiedPagination(
      serializePrismaArray(result.items),
      page,
      limit,
      totalEstimate
    );

    return NextResponse.json(response);
  } catch (error) {
    if (error instanceof AppError) {
      return NextResponse.json(
        { error: error.message, code: error.code },
        { status: error.statusCode }
      );
    }

    return NextResponse.json({ error: 'Failed to fetch groups' }, { status: 500 });
  }
}

/**
 * Handles POST requests for creating new groups
 *
 * @description Creates a new group for organizing and sharing wishlists with other users
 * @param {NextRequest} request - The incoming HTTP request object with group creation data in JSON body
 * @returns {Promise<NextResponse>} JSON response with created group data or error
 *
 * @throws {401} Unauthorized - User authentication required
 * @throws {400} Bad Request - Invalid group data or validation errors
 * @throws {500} Internal Server Error - Database or service errors
 *
 * @example
 * // Create a new group
 * POST /api/groups
 * {
 *   "name": "Smith Family",
 *   "description": "Family group for sharing wishlists",
 *   "visibility": "private"
 * }
 *
 * @see {@link getCurrentUser} for authentication details
 * @see {@link GroupCreateSchema} for request validation
 */
export async function POST(request: NextRequest) {
  try {
    const user = await getCurrentUser();

    if (!user) {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
    }

    const body = await request.json();
    const data = GroupCreateSchema.parse(body);

    const group = await groupService.createGroup(data, user.id);

    // Get full group details to return to the client
    const groupWithDetails = await groupService.getGroup(group.id, user.id);

    // Serialize dates before returning
    const serializedGroup = serializePrismaResponse(groupWithDetails);

    return NextResponse.json(serializedGroup, { status: 201 });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: error.errors[0].message }, { status: 400 });
    }

    if (error instanceof AppError) {
      return NextResponse.json(
        { error: error.message, code: error.code },
        { status: error.statusCode }
      );
    }

    return NextResponse.json({ error: 'Failed to create group' }, { status: 500 });
  }
}
