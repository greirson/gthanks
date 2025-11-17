import { NextRequest, NextResponse } from 'next/server';

import { getCurrentUser } from '@/lib/auth-utils';
import { AppError, getUserFriendlyError } from '@/lib/errors';
import { GroupInvitationService } from '@/lib/services/group/group-invitation.service';
import { logger } from '@/lib/services/logger';

const groupInvitationService = new GroupInvitationService();

interface RouteParams {
  params: {
    token: string;
  };
}

/**
 * Accept a group invitation via token
 * POST /api/invitations/accept/[token]
 */
export async function POST(request: NextRequest, { params }: RouteParams) {
  try {
    const user = await getCurrentUser();

    if (!user || !user.email) {
      return NextResponse.json(
        { error: getUserFriendlyError('UNAUTHORIZED'), code: 'UNAUTHORIZED' },
        { status: 401 }
      );
    }

    const group = await groupInvitationService.acceptInvitation(params.token, user.email);

    return NextResponse.json(
      {
        message: 'Invitation accepted successfully',
        group: {
          id: group.id,
          name: group.name,
        },
      },
      { status: 200 }
    );
  } catch (error) {
    if (error instanceof AppError) {
      return NextResponse.json(
        { error: getUserFriendlyError(error.code, error.message), code: error.code },
        { status: error.statusCode }
      );
    }

    logger.error({ error: error }, 'Error accepting invitation');
    return NextResponse.json(
      { error: getUserFriendlyError('INTERNAL_ERROR'), code: 'INTERNAL_ERROR' },
      { status: 500 }
    );
  }
}
