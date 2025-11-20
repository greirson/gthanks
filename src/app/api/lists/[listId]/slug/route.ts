import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';

import { getCurrentUser } from '@/lib/auth-utils';
import { ConflictError, ForbiddenError, handleApiError, NotFoundError } from '@/lib/errors';
import { getRateLimitHeaders, rateLimiter } from '@/lib/rate-limiter';
import { listService } from '@/lib/services/list-service';
import { slugSchema } from '@/lib/validators/vanity-url';

interface RouteParams {
  params: {
    listId: string;
  };
}

const SetSlugSchema = z.object({
  slug: slugSchema,
});

/**
 * Handles PUT requests for setting/updating a list slug
 *
 * @description Allows list owners to set or update the slug for vanity URLs
 * @param {NextRequest} request - The incoming HTTP request object with slug in JSON body
 * @param {RouteParams} params - Route parameters containing listId
 * @returns {Promise<NextResponse>} JSON response with updated list object
 *
 * @throws {401} Unauthorized - Valid session required
 * @throws {403} Forbidden - User doesn't have permission to edit list
 * @throws {404} Not Found - List not found
 * @throws {409} Conflict - Slug already in use
 * @throws {429} Too Many Requests - Rate limit exceeded
 * @throws {400} Bad Request - Invalid slug format
 *
 * @example
 * // Set list slug
 * PUT /api/lists/list-id-123/slug
 * { "slug": "christmas-2024" }
 *
 * @see {@link getCurrentUser} for unified authentication
 * @see {@link slugSchema} for slug validation
 * @see {@link listService.setSlug} for business logic
 */
export async function PUT(request: NextRequest, { params }: RouteParams) {
  try {
    // Check authentication
    const user = await getCurrentUser();
    if (!user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Check rate limit per user
    const rateLimitResult = await rateLimiter.check('slug-set', user.id);
    if (!rateLimitResult.allowed) {
      return NextResponse.json(
        { error: 'Too many requests. Please try again later.' },
        {
          status: 429,
          headers: getRateLimitHeaders(rateLimitResult),
        }
      );
    }

    const { listId } = params;

    // Parse and validate request body
    const body = (await request.json()) as unknown;
    const data = SetSlugSchema.parse(body);

    // Set slug via service (includes permission check)
    const updatedList = await listService.setSlug(listId, user.id, data.slug);

    return NextResponse.json(
      {
        list: {
          id: updatedList.id,
          slug: updatedList.slug,
        },
      },
      { headers: getRateLimitHeaders(rateLimitResult) }
    );
  } catch (error) {
    // Handle validation errors
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: error.errors[0].message }, { status: 400 });
    }

    // Return 404 for both NotFoundError and ForbiddenError to prevent resource enumeration
    if (error instanceof NotFoundError || error instanceof ForbiddenError) {
      return NextResponse.json({ error: 'Resource not found' }, { status: 404 });
    }

    if (error instanceof ConflictError) {
      return NextResponse.json({ error: error.message }, { status: 409 });
    }

    // Handle all other errors
    return handleApiError(error);
  }
}
