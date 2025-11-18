import { z } from 'zod';
import { NextRequest, NextResponse } from 'next/server';

import { getCurrentUser } from '@/lib/auth-utils';
import { AppError, getUserFriendlyError } from '@/lib/errors';
import { wishService } from '@/lib/services/wish-service';
import { logger } from '@/lib/services/logger';
import { BulkRemoveFromListsSchema } from '@/lib/validators/wish';

export async function POST(request: NextRequest) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json(
        { error: getUserFriendlyError('UNAUTHORIZED'), code: 'UNAUTHORIZED' },
        { status: 401 }
      );
    }

    const body = (await request.json()) as unknown;
    const validatedData = BulkRemoveFromListsSchema.parse(body);

    const result = await wishService.removeWishesFromLists(validatedData.wishIds, user.id);

    if (result.removed === 0) {
      return NextResponse.json({
        removed: 0,
        message: 'No wishes were found in any lists',
      });
    }

    return NextResponse.json(result);
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        {
          error: getUserFriendlyError('VALIDATION_ERROR', error.errors[0].message),
          code: 'VALIDATION_ERROR',
        },
        { status: 400 }
      );
    }

    if (error instanceof AppError) {
      return NextResponse.json(
        {
          error: getUserFriendlyError(error.code, error.message),
          code: error.code,
        },
        { status: error.statusCode }
      );
    }

    logger.error({ error: error }, 'Error removing wishes from lists');
    return NextResponse.json(
      { error: 'Something went wrong. Please try again', code: 'INTERNAL_ERROR' },
      { status: 500 }
    );
  }
}
