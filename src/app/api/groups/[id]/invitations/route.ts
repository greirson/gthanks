import { z } from 'zod';

import { NextRequest, NextResponse } from 'next/server';

import { getCurrentUser } from '@/lib/auth-utils';
import { AppError } from '@/lib/errors';
import { invitationRateLimiter } from '@/lib/middleware/rate-limit';
import { groupService } from '@/lib/services/group/group.service';
import { GroupInvitationService } from '@/lib/services/group/group-invitation.service';
import { permissionService } from '@/lib/services/permission-service';
import { GroupInviteSchema } from '@/lib/validators/group';

// Create singleton instance of GroupInvitationService
const groupInvitationService = new GroupInvitationService();

interface RouteParams {
  params: {
    id: string;
  };
}

/**
 * Handles GET requests for retrieving group invitations
 *
 * @description Retrieves pending invitations for a specific group with admin-only access for invitation management
 * @param {NextRequest} request - The incoming HTTP request object
 * @param {RouteParams} params - Route parameters containing the group ID
 * @returns {Promise<NextResponse>} JSON response with array of pending invitations or error
 *
 * @throws {401} Unauthorized - User authentication required
 * @throws {403} Forbidden - User does not have admin permissions for the group
 * @throws {500} Internal Server Error - Invitation retrieval service failures
 *
 * @example
 * // Get pending invitations for group
 * GET /api/groups/group123/invitations
 * // Returns: [{ id: "inv123", email: "user@example.com", status: "pending", sentAt: "2024-01-15T10:00:00Z" }]
 *
 * @requires Admin permission for the group
 * @see {@link getCurrentUser} for authentication
 * @see {@link permissionService.require} for authorization
 * @see {@link groupService.getGroupInvitations} for invitation retrieval
 */
// GET /api/groups/[id]/invitations - Get pending invitations for group
export async function GET(request: NextRequest, { params }: RouteParams) {
  try {
    const user = await getCurrentUser();

    if (!user) {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
    }

    // Check if user has access to view group
    await permissionService.require(user.id, 'view', { type: 'group', id: params.id });

    const invitations = await groupService.getGroupInvitations(params.id);

    // Service already returns only pending invitations
    return NextResponse.json({ invitations });
  } catch (error) {
    if (error instanceof AppError) {
      return NextResponse.json(
        { error: error.message, code: error.code },
        { status: error.statusCode }
      );
    }

    return NextResponse.json({ error: 'Failed to fetch invitations' }, { status: 500 });
  }
}

/**
 * Handles POST requests for sending group invitations
 *
 * @description Sends invitations to join a specific group with feature flag checking and permission validation - supports bulk invitation sending
 * @param {NextRequest} request - The incoming HTTP request object with invitation data in JSON body
 * @param {RouteParams} params - Route parameters containing the group ID
 * @returns {Promise<NextResponse>} JSON response with invitation results or error
 *
 * @throws {401} Unauthorized - User authentication required
 * @throws {403} Forbidden - Feature disabled or user lacks invitation permissions
 * @throws {400} Bad Request - Invalid invitation data or validation errors
 * @throws {500} Internal Server Error - Invitation sending service failures
 *
 * @example
 * // Send group invitations
 * POST /api/groups/group123/invitations
 * {
 *   "emails": ["user1@example.com", "user2@example.com"],
 *   "message": "Join our family group!"
 * }
 * // Returns: { sent: 2, skipped: [], total: 2 }
 *
 * @requires Feature flag "group_invitations" enabled and invite permission for the group
 * @see {@link getCurrentUser} for authentication
 * @see {@link FeatureService.isFeatureEnabled} for feature flag checking
 * @see {@link permissionService.require} for authorization
 * @see {@link GroupInviteSchema} for request validation
 * @see {@link groupInvitationService.inviteUsers} for invitation processing with auto-accept support
 */
// POST /api/groups/[id]/invitations - Send invitations
export async function POST(request: NextRequest, { params }: RouteParams) {
  try {
    // Group invitations always enabled in MVP
    const user = await getCurrentUser();

    if (!user) {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
    }

    // Rate limit check - 10 invitation batches per hour
    const rateLimitCheck = await invitationRateLimiter(user.id);
    if (!rateLimitCheck.allowed) {
      return NextResponse.json(
        {
          error: 'Rate limit exceeded. Please try again later.',
          retryAfter: rateLimitCheck.retryAfter,
        },
        {
          status: 429,
          headers: {
            'Retry-After': String(rateLimitCheck.retryAfter || 3600),
          },
        }
      );
    }

    // Check if user can invite to this group
    await permissionService.require(user.id, 'invite', { type: 'group', id: params.id });

    const body = (await request.json()) as unknown;
    const data = GroupInviteSchema.parse(body);

    // Use groupInvitationService which has auto-accept logic
    const results = await groupInvitationService.inviteUsers(params.id, data, user.id);

    return NextResponse.json(
      {
        sent: results.sent,
        skipped: results.skipped,
        total: data.emails.length,
      },
      { status: 201 }
    );
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

    return NextResponse.json({ error: 'Failed to send invitations' }, { status: 500 });
  }
}
