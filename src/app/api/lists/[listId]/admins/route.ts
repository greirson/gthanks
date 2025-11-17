import { z } from 'zod';

import { NextRequest, NextResponse } from 'next/server';

import { getCurrentUser } from '@/lib/auth-utils';
import { db } from '@/lib/db';
import {
  AppError,
  ForbiddenError,
  NotFoundError,
  ValidationError,
  getUserFriendlyError,
} from '@/lib/errors';
import { rateLimiter, getRateLimitHeaders, getClientIdentifier } from '@/lib/rate-limiter';
import { permissionService } from '@/lib/services/permission-service';
import { ListInvitationService } from '@/lib/services/list-invitation.service';
import { logger } from '@/lib/services/logger';

interface RouteParams {
  params: { listId: string };
}

// Request validation schema
const AddCoManagerSchema = z.object({
  email: z.string().email('Valid email address is required'),
});

/**
 * Handles GET requests for retrieving all co-managers of a list
 *
 * @description Retrieves all co-managers for a list with user details and metadata (who added them and when)
 * @param {NextRequest} request - The incoming HTTP request object
 * @param {RouteParams} params - Route parameters containing the listId
 * @returns {Promise<NextResponse>} JSON response with list of admins or error
 *
 * @throws {401} Unauthorized - User authentication required
 * @throws {403} Forbidden - User does not have permission to view list admins
 * @throws {404} Not Found - List does not exist
 * @throws {500} Internal Server Error - Database or service errors
 *
 * @example
 * // Get co-managers for list
 * GET /api/lists/abc123/admins
 * // Returns: { admins: [{ userId: "...", user: {...}, addedAt: "...", addedBy: {...} }] }
 *
 * @see {@link getCurrentUser} for authentication details
 * @see {@link permissionService.require} for permission validation
 */
export async function GET(request: NextRequest, { params }: RouteParams) {
  try {
    // Check authentication
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json(
        { error: getUserFriendlyError('UNAUTHORIZED'), code: 'UNAUTHORIZED' },
        { status: 401 }
      );
    }

    const { listId } = params;

    // Verify user has permission to view this list (any list access allows viewing admins)
    await permissionService.require(user.id, 'view', { type: 'list', id: listId });

    // Retrieve all co-managers with user details and metadata
    const admins = await db.listAdmin.findMany({
      where: { listId },
      include: {
        user: {
          select: {
            id: true,
            name: true,
            email: true,
            image: true,
          },
        },
      },
      orderBy: { addedAt: 'asc' },
    });

    // Get the addedBy user details for each admin
    const adminUserIds = admins.map((admin) => admin.addedBy);
    const addedByUsers = await db.user.findMany({
      where: { id: { in: adminUserIds } },
      select: { id: true, name: true },
    });

    // Create a map for quick lookup
    const addedByUsersMap = new Map(addedByUsers.map((user) => [user.id, user]));

    // Transform the response to match the required format
    const transformedAdmins = admins.map((admin) => ({
      userId: admin.userId,
      user: admin.user,
      addedAt: admin.addedAt,
      addedBy: addedByUsersMap.get(admin.addedBy) || { id: admin.addedBy, name: null },
    }));

    return NextResponse.json({ admins: transformedAdmins });
  } catch (error) {
    logger.error({ error: error }, 'GET /api/lists/[listId]/admins error');

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

    if (error instanceof AppError) {
      return NextResponse.json(
        {
          error: getUserFriendlyError(error.code, error.message),
          code: error.code,
          field: error.field,
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
 * Handles POST requests for adding a co-manager to a list
 *
 * @description Adds a user as co-manager to a list with validation and ownership verification (only list owner can add co-managers)
 * @param {NextRequest} request - The incoming HTTP request object with email in JSON body
 * @param {RouteParams} params - Route parameters containing the listId
 * @returns {Promise<NextResponse>} JSON response with success confirmation or error
 *
 * @throws {401} Unauthorized - User authentication required
 * @throws {400} Bad Request - Invalid email or user already co-manager
 * @throws {403} Forbidden - User does not have permission to add co-managers to this list
 * @throws {404} Not Found - List or user with specified email does not exist
 * @throws {429} Too Many Requests - Rate limit exceeded
 * @throws {500} Internal Server Error - Database or service errors
 *
 * @example
 * // Add co-manager to list
 * POST /api/lists/abc123/admins
 * { "email": "user@example.com" }
 * // Returns: { success: true, message: "Co-manager added successfully", admin: {...} }
 *
 * @see {@link getCurrentUser} for authentication details
 * @see {@link permissionService.require} for ownership validation
 * @see {@link AddCoManagerSchema} for request validation
 */
export async function POST(request: NextRequest, { params }: RouteParams) {
  try {
    // Rate limiting - prevent spam adding
    const clientIdentifier = getClientIdentifier(request);
    const rateLimitResult = rateLimiter.check('co-manager-add', clientIdentifier);

    if (!rateLimitResult.allowed) {
      return NextResponse.json(
        {
          error: getUserFriendlyError('RATE_LIMIT_EXCEEDED'),
          code: 'RATE_LIMIT_EXCEEDED',
          retryAfter: rateLimitResult.retryAfter,
        },
        {
          status: 429,
          headers: getRateLimitHeaders(rateLimitResult),
        }
      );
    }

    // Check authentication
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json(
        { error: getUserFriendlyError('UNAUTHORIZED'), code: 'UNAUTHORIZED' },
        { status: 401 }
      );
    }

    const { listId } = params;

    // Parse and validate request body
    const body = (await request.json()) as unknown;
    const { email } = AddCoManagerSchema.parse(body);

    // Prevent adding self as co-admin
    if (email === user.email) {
      return NextResponse.json(
        {
          error: getUserFriendlyError('INVALID_OPERATION', 'Cannot add yourself as co-manager'),
          code: 'INVALID_OPERATION',
        },
        {
          status: 400,
          headers: getRateLimitHeaders(rateLimitResult),
        }
      );
    }

    // Use the invitation service which handles both existing and non-existing users
    const listInvitationService = new ListInvitationService(db);
    const result = await listInvitationService.createInvitation(listId, email, user.id);

    if (result.directlyAdded) {
      // User existed and was added directly
      return NextResponse.json(
        {
          success: true,
          message: 'Co-manager added successfully',
          directlyAdded: true,
        },
        {
          status: 201,
          headers: getRateLimitHeaders(rateLimitResult),
        }
      );
    } else {
      // Invitation sent to non-existing user
      return NextResponse.json(
        {
          success: true,
          message: 'Invitation sent successfully',
          directlyAdded: false,
        },
        {
          status: 201,
          headers: getRateLimitHeaders(rateLimitResult),
        }
      );
    }
  } catch (error) {
    logger.error({ error: error }, 'POST /api/lists/[listId]/admins error');

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

    if (error instanceof ValidationError) {
      return NextResponse.json(
        { error: getUserFriendlyError('VALIDATION_ERROR', error.message), code: 'VALIDATION_ERROR' },
        { status: 400 }
      );
    }

    if (error instanceof AppError) {
      return NextResponse.json(
        {
          error: getUserFriendlyError(error.code, error.message),
          code: error.code,
          field: error.field,
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
