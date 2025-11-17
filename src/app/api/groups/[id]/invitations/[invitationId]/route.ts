import { z } from 'zod';

import { NextRequest, NextResponse } from 'next/server';

import { getCurrentUser } from '@/lib/auth-utils';
import { AppError } from '@/lib/errors';
import { groupService } from '@/lib/services/group/group.service';
import { permissionService } from '@/lib/services/permission-service';

interface RouteParams {
  params: {
    id: string;
    invitationId: string;
  };
}

const InvitationActionSchema = z.object({
  action: z.enum(['accept', 'decline']),
});

/**
 * Handles PATCH requests for responding to group invitations
 *
 * @description Allows users to accept or decline group invitations with validation to ensure only the invited user can respond
 * @param {NextRequest} request - The incoming HTTP request object with action data in JSON body
 * @param {RouteParams} params - Route parameters containing the group ID and invitation ID
 * @returns {Promise<NextResponse>} JSON response with invitation response result or error
 *
 * @throws {401} Unauthorized - User authentication required
 * @throws {400} Bad Request - Invalid action or validation errors
 * @throws {403} Forbidden - User not authorized to respond to this invitation
 * @throws {404} Not Found - Invitation not found or already processed
 * @throws {500} Internal Server Error - Invitation processing service failures
 *
 * @example
 * // Accept group invitation
 * PATCH /api/groups/group123/invitations/inv456
 * {
 *   "action": "accept"
 * }
 * // Returns: { success: true, membership: { groupId: "group123", userId: "user789", role: "member" } }
 *
 * // Decline group invitation
 * PATCH /api/groups/group123/invitations/inv456
 * {
 *   "action": "decline"
 * }
 * // Returns: { success: true, status: "declined" }
 *
 * @requires Authentication - only the invited user can respond
 * @see {@link getCurrentUser} for authentication
 * @see {@link InvitationActionSchema} for request validation
 * @see {@link groupService.respondToInvitation} for invitation processing
 */
// PATCH /api/groups/[id]/invitations/[invitationId] - Accept or decline invitation
export async function PATCH(request: NextRequest, { params }: RouteParams) {
  try {
    const user = await getCurrentUser();

    if (!user) {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
    }

    const body = (await request.json()) as unknown;
    const { action } = InvitationActionSchema.parse(body);

    const result = await groupService.respondToInvitation(params.invitationId, action, user.id);

    return NextResponse.json(result);
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

    return NextResponse.json({ error: 'Failed to process invitation' }, { status: 500 });
  }
}

/**
 * Handles DELETE requests for canceling group invitations
 *
 * @description Cancels pending group invitations with admin-only access for invitation management and cleanup
 * @param {NextRequest} request - The incoming HTTP request object
 * @param {RouteParams} params - Route parameters containing the group ID and invitation ID
 * @returns {Promise<NextResponse>} JSON response with cancellation confirmation or error
 *
 * @throws {401} Unauthorized - User authentication required
 * @throws {403} Forbidden - User does not have admin permissions for the group
 * @throws {404} Not Found - Invitation not found or already processed
 * @throws {500} Internal Server Error - Invitation cancellation service failures
 *
 * @example
 * // Cancel pending invitation
 * DELETE /api/groups/group123/invitations/inv456
 * // Returns: { success: true }
 *
 * @requires Admin permission for the group
 * @see {@link getCurrentUser} for authentication
 * @see {@link permissionService.require} for authorization
 * @see {@link groupService.cancelInvitation} for cancellation logic
 */
// DELETE /api/groups/[id]/invitations/[invitationId] - Cancel invitation (admin only)
export async function DELETE(request: NextRequest, { params }: RouteParams) {
  try {
    const user = await getCurrentUser();

    if (!user) {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
    }

    // Check if user can cancel invitations (admin only)
    await permissionService.require(user.id, 'admin', { type: 'group', id: params.id });

    await groupService.cancelInvitation(params.invitationId, user.id);

    return NextResponse.json({ success: true });
  } catch (error) {
    if (error instanceof AppError) {
      return NextResponse.json(
        { error: error.message, code: error.code },
        { status: error.statusCode }
      );
    }

    return NextResponse.json({ error: 'Failed to cancel invitation' }, { status: 500 });
  }
}
