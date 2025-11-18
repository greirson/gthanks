import { NextRequest, NextResponse } from 'next/server';

import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { NotFoundError, ValidationError, getUserFriendlyError } from '@/lib/errors';
import { rateLimiter, getRateLimitHeaders, getClientIdentifier } from '@/lib/rate-limiter';
import { listInvitationService } from '@/lib/services/list-invitation.service';
import { logger } from '@/lib/services/logger';

export async function GET(request: NextRequest, { params }: { params: { token: string } }) {
  try {
    const invitation = await listInvitationService.validateInvitation(params.token);

    if (!invitation) {
      return NextResponse.json(
        { error: getUserFriendlyError('NOT_FOUND'), code: 'NOT_FOUND' },
        { status: 404 }
      );
    }

    return NextResponse.json({ invitation });
  } catch (error) {
    logger.error({ error: error }, 'Error validating invitation');
    return NextResponse.json(
      { error: getUserFriendlyError('INTERNAL_ERROR'), code: 'INTERNAL_ERROR' },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest, { params }: { params: { token: string } }) {
  try {
    // Rate limiting - prevent brute force attempts
    const clientIdentifier = getClientIdentifier(request);
    const rateLimitResult = await rateLimiter.check('invitation-accept', clientIdentifier);

    if (!rateLimitResult.allowed) {
      return NextResponse.json(
        {
          error: 'Too many invitation acceptance attempts. Please try again later.',
          code: 'RATE_LIMIT_EXCEEDED',
          retryAfter: rateLimitResult.retryAfter,
        },
        {
          status: 429,
          headers: getRateLimitHeaders(rateLimitResult),
        }
      );
    }

    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json(
        { error: getUserFriendlyError('UNAUTHORIZED'), code: 'UNAUTHORIZED' },
        {
          status: 401,
          headers: getRateLimitHeaders(rateLimitResult),
        }
      );
    }

    const result = await listInvitationService.acceptInvitation(params.token, session.user.id);

    return NextResponse.json(
      {
        message: 'Invitation accepted successfully',
        listId: result.listId,
        listName: result.listName,
      },
      {
        headers: getRateLimitHeaders(rateLimitResult),
      }
    );
  } catch (error) {
    if (error instanceof ValidationError) {
      return NextResponse.json(
        { error: getUserFriendlyError('VALIDATION_ERROR'), code: 'VALIDATION_ERROR' },
        { status: 400 }
      );
    }
    if (error instanceof NotFoundError) {
      return NextResponse.json(
        { error: getUserFriendlyError('NOT_FOUND'), code: 'NOT_FOUND' },
        { status: 404 }
      );
    }

    logger.error({ error: error }, 'Error accepting invitation');
    return NextResponse.json(
      { error: getUserFriendlyError('INTERNAL_ERROR'), code: 'INTERNAL_ERROR' },
      { status: 500 }
    );
  }
}
