import { z } from 'zod';

import { NextRequest, NextResponse } from 'next/server';

import { AppError } from '@/lib/errors';
import { getCurrentUser } from '@/lib/auth-utils';
import { rateLimiter, getRateLimitHeaders, getClientIdentifier } from '@/lib/rate-limiter';
import { listAccessTokenService } from '@/lib/services/list-access-token';
import { reservationService } from '@/lib/services/reservation-service';
import { ReservationCreateSchema } from '@/lib/validators/reservation';
import { logger } from '@/lib/services/logger';

/**
 * POST /api/lists/public/[shareToken]/reservations
 * Create a reservation on a public list via share token (authenticated users only)
 *
 * @description Allows authenticated users to reserve wishes on public lists
 * @param {NextRequest} request - The incoming HTTP request with reservation data
 * @param {Object} params - Route parameters containing the share token
 * @returns {Promise<NextResponse>} JSON response with created reservation or error
 *
 * @throws {401} Unauthorized - User not authenticated
 * @throws {400} Bad Request - Invalid reservation data or wish already reserved
 * @throws {403} Forbidden - List is private or wish not in shared list
 * @throws {404} Not Found - Invalid share token or wish not found
 * @throws {429} Too Many Requests - Rate limit exceeded
 * @throws {500} Internal Server Error - Database or service errors
 *
 * @example
 * // Create reservation on public list (authenticated)
 * POST /api/lists/public/abc123/reservations
 * {
 *   "wishId": "wish456"
 * }
 *
 * @security Rate limited to prevent abuse. Authentication required.
 */
export async function POST(request: NextRequest, { params }: { params: { shareToken: string } }) {
  // Rate limiting - prevent abuse (declare outside try-catch for error handler access)
  const clientIdentifier = getClientIdentifier(request);
  const rateLimitResult = await rateLimiter.check('public-reservation', clientIdentifier);

  if (!rateLimitResult.allowed) {
    return NextResponse.json(
      {
        error: 'Too many requests. Please try again later.',
        code: 'RATE_LIMIT_EXCEEDED',
        retryAfter: rateLimitResult.retryAfter,
      },
      {
        status: 429,
        headers: getRateLimitHeaders(rateLimitResult),
      }
    );
  }

  try {
    // Check authentication
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json(
        {
          error: 'Authentication required to reserve wishes',
          code: 'UNAUTHORIZED',
        },
        {
          status: 401,
          headers: getRateLimitHeaders(rateLimitResult),
        }
      );
    }

    // Parse and validate request body
    const body = (await request.json()) as unknown;
    const validatedData = ReservationCreateSchema.parse(body);

    // Extract access cookie for password-protected list verification
    const accessCookie = request.cookies.get(listAccessTokenService.getCookieName())?.value;

    // Create reservation via share token
    const reservation = await reservationService.createReservationViaShareToken(
      params.shareToken,
      validatedData,
      user.id,
      accessCookie
    );

    // Convert dates to ISO strings for JSON serialization
    const serializedReservation = {
      ...reservation,
      reservedAt: reservation.reservedAt.toISOString(),
    };

    return NextResponse.json(serializedReservation, {
      status: 201,
      headers: getRateLimitHeaders(rateLimitResult),
    });
  } catch (error) {
    logger.error({ error: error }, 'POST /api/lists/public/[shareToken]/reservations error');

    // Handle validation errors
    if (error instanceof z.ZodError) {
      const firstError = error.errors[0];
      return NextResponse.json(
        {
          error: firstError.message,
          field: firstError.path.join('.'),
          code: 'VALIDATION_ERROR',
        },
        {
          status: 400,
          headers: getRateLimitHeaders(rateLimitResult),
        }
      );
    }

    // Handle application errors
    if (error instanceof AppError) {
      return NextResponse.json(
        {
          error: error.message,
          code: error.code,
          field: error.field,
        },
        {
          status: error.statusCode,
          headers: getRateLimitHeaders(rateLimitResult),
        }
      );
    }

    // Handle unknown errors
    return NextResponse.json(
      { error: 'Failed to create reservation' },
      {
        status: 500,
        headers: getRateLimitHeaders(rateLimitResult),
      }
    );
  }
}
