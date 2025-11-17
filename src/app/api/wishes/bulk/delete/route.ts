import { NextRequest, NextResponse } from 'next/server';

import { getCurrentUser } from '@/lib/auth-utils';
import { AppError, getUserFriendlyError } from '@/lib/errors';
import { wishService } from '@/lib/services/wish-service';
import { logger } from '@/lib/services/logger';

export async function POST(request: NextRequest) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json(
        { error: getUserFriendlyError('UNAUTHORIZED'), code: 'UNAUTHORIZED' },
        { status: 401 }
      );
    }

    const body = await request.json();

    if (!body?.wishIds || !Array.isArray(body.wishIds)) {
      return NextResponse.json(
        {
          error: getUserFriendlyError('VALIDATION_ERROR', 'wishIds array is required'),
          code: 'VALIDATION_ERROR',
        },
        { status: 400 }
      );
    }

    if (body.wishIds.length === 0) {
      return NextResponse.json(
        {
          error: getUserFriendlyError('VALIDATION_ERROR', 'wishIds cannot be empty'),
          code: 'VALIDATION_ERROR',
        },
        { status: 400 }
      );
    }

    const wishIds = body.wishIds as string[];

    const result = await wishService.deleteWishes(wishIds, user.id);
    return NextResponse.json(result);
  } catch (error) {
    if (error instanceof AppError) {
      return NextResponse.json(
        {
          error: getUserFriendlyError(error.code, error.message),
          code: error.code,
        },
        { status: error.statusCode }
      );
    }
    logger.error({ error: error }, 'Error deleting wishes');
    return NextResponse.json(
      { error: 'Something went wrong. Please try again', code: 'INTERNAL_ERROR' },
      { status: 500 }
    );
  }
}
