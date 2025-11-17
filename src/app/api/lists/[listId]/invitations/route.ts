import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';

import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { NotFoundError, ValidationError, getUserFriendlyError } from '@/lib/errors';
import { rateLimiter, getRateLimitHeaders, getClientIdentifier } from '@/lib/rate-limiter';
import { listInvitationService } from '@/lib/services/list-invitation.service';
import { logger } from '@/lib/services/logger';

const createInvitationSchema = z.object({
  email: z.string().email('Invalid email address'),
});

export async function POST(request: NextRequest, { params }: { params: { listId: string } }) {
  try {
    // Rate limiting - prevent email bombing
    const clientIdentifier = getClientIdentifier(request);
    const rateLimitResult = rateLimiter.check('co-manager-invite', clientIdentifier);

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

    const body = await request.json();
    const { email } = createInvitationSchema.parse(body);

    const result = await listInvitationService.createInvitation(
      params.listId,
      email,
      session.user.id
    );

    if (result.directlyAdded) {
      return NextResponse.json(
        {
          message: 'User added as co-manager directly',
          directlyAdded: true,
        },
        {
          headers: getRateLimitHeaders(rateLimitResult),
        }
      );
    } else {
      return NextResponse.json(
        {
          message: 'Invitation sent successfully',
          directlyAdded: false,
        },
        {
          headers: getRateLimitHeaders(rateLimitResult),
        }
      );
    }
  } catch (error) {
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
    if (error instanceof ValidationError) {
      return NextResponse.json(
        { error: getUserFriendlyError('VALIDATION_ERROR', error.message), code: 'VALIDATION_ERROR' },
        { status: 400 }
      );
    }
    if (error instanceof NotFoundError) {
      return NextResponse.json(
        { error: getUserFriendlyError('NOT_FOUND', error.message), code: 'NOT_FOUND' },
        { status: 404 }
      );
    }

    logger.error({ error: error }, 'Error creating list invitation');
    return NextResponse.json(
      { error: 'Something went wrong. Please try again', code: 'INTERNAL_ERROR' },
      { status: 500 }
    );
  }
}

export async function GET(request: NextRequest, { params }: { params: { listId: string } }) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json(
        { error: getUserFriendlyError('UNAUTHORIZED'), code: 'UNAUTHORIZED' },
        { status: 401 }
      );
    }

    const invitations = await listInvitationService.getListInvitations(
      params.listId,
      session.user.id
    );

    return NextResponse.json({ invitations });
  } catch (error) {
    if (error instanceof NotFoundError) {
      return NextResponse.json(
        { error: getUserFriendlyError('NOT_FOUND', error.message), code: 'NOT_FOUND' },
        { status: 404 }
      );
    }

    logger.error({ error: error }, 'Error getting list invitations');
    return NextResponse.json(
      { error: 'Something went wrong. Please try again', code: 'INTERNAL_ERROR' },
      { status: 500 }
    );
  }
}
