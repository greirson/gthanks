import { z } from 'zod';

import { NextRequest, NextResponse } from 'next/server';

import { getCurrentUser } from '@/lib/auth-utils';
import { AppError } from '@/lib/errors';
import { groupService } from '@/lib/services/group/group.service';
import { permissionService } from '@/lib/services/permission-service';
import { GroupAddMemberSchema } from '@/lib/validators/group';

interface RouteParams {
  params: {
    id: string;
  };
}

/**
 * Handles GET requests for retrieving group members
 *
 * @description Retrieves all members of a specific group with permission verification for group access
 * @param {NextRequest} request - The incoming HTTP request object
 * @param {RouteParams} params - Route parameters containing the group id
 * @returns {Promise<NextResponse>} JSON response with group members array or error
 *
 * @throws {401} Unauthorized - User authentication required
 * @throws {403} Forbidden - User does not have permission to view this group's members
 * @throws {404} Not Found - Group with specified ID does not exist
 * @throws {500} Internal Server Error - Database or service errors
 *
 * @example
 * // Get group members
 * GET /api/groups/abc123/members
 * // Returns: [{ id: "user1", name: "John Doe", email: "john@example.com", role: "member" }]
 *
 * @see {@link getCurrentUser} for authentication details
 * @see {@link permissionService.require} for group access validation
 * @see {@link groupService.getGroupMembers} for business logic
 */
export async function GET(request: NextRequest, { params }: RouteParams) {
  try {
    const user = await getCurrentUser();

    if (!user) {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
    }

    // Check if user has access to view group members
    await permissionService.require(user.id, 'view', { type: 'group', id: params.id });

    const members = await groupService.getGroupMembers(params.id);

    return NextResponse.json(members);
  } catch (error) {
    if (error instanceof AppError) {
      return NextResponse.json(
        { error: error.message, code: error.code },
        { status: error.statusCode }
      );
    }

    return NextResponse.json({ error: 'Failed to fetch group members' }, { status: 500 });
  }
}

/**
 * Handles POST requests for adding members to a group
 *
 * @description Adds a new member to the specified group with admin permission verification and validation
 * @param {NextRequest} request - The incoming HTTP request object with member data in JSON body
 * @param {RouteParams} params - Route parameters containing the group id
 * @returns {Promise<NextResponse>} JSON response with success confirmation or error
 *
 * @throws {401} Unauthorized - User authentication required
 * @throws {400} Bad Request - Invalid member data or validation errors
 * @throws {403} Forbidden - User does not have admin permission for this group
 * @throws {404} Not Found - Group with specified ID does not exist
 * @throws {500} Internal Server Error - Database or service errors
 *
 * @example
 * // Add member to group
 * POST /api/groups/abc123/members
 * {
 *   "email": "newmember@example.com",
 *   "role": "member"
 * }
 * // Returns: { success: true }
 *
 * @security Requires admin permission for the group
 * @see {@link getCurrentUser} for authentication details
 * @see {@link permissionService.require} for admin permission validation
 * @see {@link GroupAddMemberSchema} for request validation
 * @see {@link groupService.addMember} for business logic
 */
export async function POST(request: NextRequest, { params }: RouteParams) {
  try {
    const user = await getCurrentUser();

    if (!user) {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
    }

    // Check if user can manage group members
    await permissionService.require(user.id, 'admin', { type: 'group', id: params.id });

    const body = (await request.json()) as unknown;
    const data = GroupAddMemberSchema.parse(body);

    // If email is provided, check if user exists
    const responseData: { success: true; action?: 'added' | 'invited' } = { success: true };

    if (data.email) {
      try {
        // Try to add existing user
        await groupService.addMember(params.id, data, user.id);
        responseData.action = 'added';
      } catch (error) {
        // If user not found, create an invitation instead
        if (error instanceof AppError && error.code === 'NOT_FOUND') {
          try {
            // Attempting to create invitation for user email
            await groupService.inviteUsers(params.id, { emails: [data.email] }, user.id);
            responseData.action = 'invited';
          } catch (inviteError) {
            // Failed to create invitation - errors logged internally by service
            // User ID, Group ID, and Email are available in the service logs
            throw inviteError; // Let the outer catch block handle it
          }
        } else {
          throw error; // Re-throw other errors
        }
      }
    } else {
      // If userId is provided, add member directly
      await groupService.addMember(params.id, data, user.id);
      responseData.action = 'added';
    }

    return NextResponse.json(responseData, { status: 201 });
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

    return NextResponse.json({ error: 'Failed to add member' }, { status: 500 });
  }
}
