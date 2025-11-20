import { z } from 'zod';
import { NextRequest, NextResponse } from 'next/server';
import { reservationService } from '@/lib/services/reservation-service';
import { logger } from '@/lib/services/logger';
import { getUserFriendlyError } from '@/lib/errors';

const AccessTokenSchema = z.object({
  accessToken: z.string().min(1, 'Access token is required'),
});

const AccessTokensSchema = z.object({
  accessTokens: z
    .array(z.string().min(1))
    .min(1, 'At least one access token is required')
    .max(50, 'Maximum 50 tokens per request'),
});

const RemoveReservationSchema = z.object({
  accessToken: z.string().min(1, 'Access token is required'),
});

export async function GET(request: NextRequest) {
  try {
    const url = new URL(request.url);
    const singleToken = url.searchParams.get('token');
    const multipleTokens = url.searchParams.get('tokens');

    // Single token access
    if (singleToken) {
      const result = AccessTokenSchema.safeParse({ accessToken: singleToken });
      if (!result.success) {
        return NextResponse.json(
          {
            error: getUserFriendlyError('VALIDATION_ERROR', result.error.errors[0].message),
            code: 'VALIDATION_ERROR',
          },
          { status: 400 }
        );
      }

      const reservation = await reservationService.getReservationByToken(singleToken);

      if (!reservation) {
        return NextResponse.json(
          {
            error: getUserFriendlyError(
              'NOT_FOUND',
              'Reservation not found or invalid access token'
            ),
            code: 'NOT_FOUND',
          },
          { status: 404 }
        );
      }

      return NextResponse.json({ reservation });
    }

    // Multiple tokens access
    if (multipleTokens) {
      const tokenArray = multipleTokens
        .split(',')
        .map((t) => t.trim())
        .filter((t) => t.length > 0);

      const result = AccessTokensSchema.safeParse({ accessTokens: tokenArray });
      if (!result.success) {
        return NextResponse.json(
          {
            error: getUserFriendlyError('VALIDATION_ERROR', result.error.errors[0].message),
            code: 'VALIDATION_ERROR',
          },
          { status: 400 }
        );
      }

      const reservations = await reservationService.getReservationsByTokens(tokenArray);

      return NextResponse.json({
        reservations,
        total: reservations.length,
      });
    }

    return NextResponse.json(
      {
        error: getUserFriendlyError(
          'VALIDATION_ERROR',
          'Either "token" or "tokens" query parameter is required'
        ),
        code: 'VALIDATION_ERROR',
      },
      { status: 400 }
    );
  } catch (error) {
    logger.error({ error: error }, 'Anonymous reservation access error');
    return NextResponse.json(
      {
        error: getUserFriendlyError('INTERNAL_ERROR', 'Failed to retrieve reservation'),
        code: 'INTERNAL_ERROR',
      },
      { status: 500 }
    );
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const body = (await request.json()) as unknown;
    const result = RemoveReservationSchema.safeParse(body);

    if (!result.success) {
      return NextResponse.json(
        {
          error: getUserFriendlyError('VALIDATION_ERROR', result.error.errors[0].message),
          code: 'VALIDATION_ERROR',
        },
        { status: 400 }
      );
    }

    await reservationService.removeReservationByToken(result.data.accessToken);

    return NextResponse.json({
      success: true,
      message: 'Reservation removed successfully',
    });
  } catch (error) {
    logger.error({ error: error }, 'Anonymous reservation removal error');

    if (error instanceof Error) {
      if (error.message.includes('not found') || error.message.includes('invalid access token')) {
        return NextResponse.json(
          {
            error: getUserFriendlyError(
              'NOT_FOUND',
              'Reservation not found or invalid access token'
            ),
            code: 'NOT_FOUND',
          },
          { status: 404 }
        );
      }

      if (error.message.includes('required')) {
        return NextResponse.json(
          {
            error: getUserFriendlyError('VALIDATION_ERROR', error.message),
            code: 'VALIDATION_ERROR',
          },
          { status: 400 }
        );
      }
    }

    return NextResponse.json(
      {
        error: getUserFriendlyError('INTERNAL_ERROR', 'Failed to remove reservation'),
        code: 'INTERNAL_ERROR',
      },
      { status: 500 }
    );
  }
}
