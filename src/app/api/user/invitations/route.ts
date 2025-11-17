import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';

import { authOptions } from '@/lib/auth';
import { getUserFriendlyError } from '@/lib/errors';
import { db } from '@/lib/db';
import { logger } from '@/lib/services/logger';

/**
 * Handles GET requests for retrieving user's pending group invitations
 *
 * @description Retrieves all pending group invitations for the current user that have not been accepted yet
 * @param {NextRequest} _request - The incoming HTTP request object (unused parameter)
 * @returns {Promise<NextResponse>} JSON response with pending invitations array or error
 *
 * @throws {401} Unauthorized - User authentication required
 * @throws {500} Internal Server Error - Database or service errors
 *
 * @example
 * // Get current user's pending invitations
 * GET /api/user/invitations
 * // Returns: [{ id: "inv123", email: "user@example.com", group: {...}, inviter: {...}, createdAt: "..." }]
 *
 * @see {@link getCurrentUser} for authentication details
 * @see {@link db.groupInvitation} for database query with relations
 */
export async function GET(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json(
        { error: getUserFriendlyError('UNAUTHORIZED'), code: 'UNAUTHORIZED' },
        { status: 401 }
      );
    }

    const searchParams = req.nextUrl.searchParams;
    const status = searchParams.get('status') || 'pending';
    const page = parseInt(searchParams.get('page') || '1', 10);
    const limit = parseInt(searchParams.get('limit') || '20', 10);
    const skip = (page - 1) * limit;

    const where: Record<string, unknown> = {
      email: session.user.email,
    };

    // Filter by status
    if (status === 'pending') {
      where.acceptedAt = null;
    } else if (status === 'accepted') {
      where.acceptedAt = { not: null };
    }

    const [invitations, total] = await Promise.all([
      db.groupInvitation.findMany({
        where,
        include: {
          group: {
            select: {
              id: true,
              name: true,
              description: true,
              avatarUrl: true,
              _count: {
                select: {
                  members: true,
                },
              },
            },
          },
          inviter: {
            select: {
              id: true,
              name: true,
              email: true,
              avatarUrl: true,
            },
          },
        },
        orderBy: { createdAt: 'desc' },
        skip,
        take: limit,
      }),
      db.groupInvitation.count({ where }),
    ]);

    // Process invitations to add computed fields
    const processedInvitations = invitations.map((inv) => {
      const isPending = !inv.acceptedAt;

      return {
        ...inv,
        invitedBy: inv.inviter, // Map inviter to invitedBy for backward compatibility
        status: inv.acceptedAt ? 'accepted' : 'pending',
        isPending,
        canRespond: isPending,
      };
    });

    return NextResponse.json({
      invitations: processedInvitations,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
        hasMore: skip + limit < total,
      },
    });
  } catch (error) {
    logger.error({ error: error }, 'Failed to fetch user invitations');
    return NextResponse.json(
      {
        error: getUserFriendlyError('INTERNAL_ERROR', 'Failed to fetch invitations'),
        code: 'INTERNAL_ERROR',
      },
      { status: 500 }
    );
  }
}
