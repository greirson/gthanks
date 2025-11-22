import { z } from 'zod';

import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';

import { AppError, NotFoundError, ForbiddenError, ValidationError } from '@/lib/errors';
import { logger } from '@/lib/services/logger';
import { rateLimiter } from '@/lib/rate-limiter';
import { reservationService } from '@/lib/services/reservation-service';
// eslint-disable-next-line local-rules/no-direct-db-import -- Needed for rate limiting and email data
import { db } from '@/lib/db';
import { sendReservationConfirmation } from '@/lib/email';

// Helper function to get list ID for rate limiting
async function getListIdFromWish(wishId: string): Promise<string | null> {
  const listWish = await db.listWish.findFirst({
    where: { wishId },
    select: { listId: true },
  });
  return listWish?.listId || null;
}

/**
 * Handles POST requests for creating new reservations
 *
 * @description Creates a new reservation for a wish. REQUIRES AUTHENTICATION.
 * @param {NextRequest} request - The incoming HTTP request object with reservation data in JSON body
 * @returns {Promise<NextResponse>} JSON response with created reservation data or error
 *
 * @throws {401} Unauthorized - User must be logged in to reserve items
 * @throws {404} Not Found - Wish with specified ID does not exist
 * @throws {429} Too Many Requests - Rate limit exceeded (10 reservations/hour per list)
 * @throws {500} Internal Server Error - Database or service errors
 *
 * @example
 * // Create reservation (authenticated user only)
 * POST /api/reservations
 * {
 *   "wishId": "wish456"
 * }
 *
 * @protected Requires authentication - user must be logged in
 * @see {@link getServerSession} for authentication details
 * @see {@link sendReservationConfirmation} for email confirmation
 */
export async function POST(request: NextRequest) {
  try {
    // REQUIRE AUTHENTICATION
    const session = await getServerSession();

    if (!session?.user) {
      return NextResponse.json(
        { error: 'You must be logged in to reserve items' },
        { status: 401 }
      );
    }

    const { wishId } = await request.json();

    // Apply rate limiting first (per list, per user)
    const listId = await getListIdFromWish(wishId);
    const rateLimitIdentifier = `${session.user.id}:${listId}`;
    const rateLimitResult = await rateLimiter.check(
      'reservation-authenticated',
      rateLimitIdentifier
    );

    if (!rateLimitResult.allowed) {
      return NextResponse.json(
        {
          error: 'Too many reservations. Please wait.',
          retryAfter: rateLimitResult.retryAfter,
        },
        { status: 429 }
      );
    }

    // Create reservation using service layer (includes permission checks)
    const reservation = await reservationService.createReservation(
      { wishId },
      session.user.id
    );

    // Fetch wish details for confirmation email (simple read, acceptable per architecture guide)
    const wish = await db.wish.findUnique({
      where: { id: wishId },
      include: {
        owner: {
          select: { name: true, email: true },
        },
      },
    });

    // Send confirmation email if we have wish data
    if (wish) {
      await sendReservationConfirmation({
        to: session.user.email || '',
        userName: session.user.name || 'there',
        wishTitle: wish.title,
        ownerName: wish.owner.name || wish.owner.email,
        productUrl: wish.url || undefined,
      });
    }

    return NextResponse.json(reservation, { status: 201 });
  } catch (error) {
    logger.error({ error: error }, 'POST /api/reservations error');

    if (error instanceof NotFoundError) {
      return NextResponse.json({ error: error.message }, { status: 404 });
    }

    if (error instanceof ForbiddenError) {
      return NextResponse.json({ error: error.message }, { status: 403 });
    }

    if (error instanceof ValidationError) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }

    if (error instanceof z.ZodError) {
      const firstError = error.errors[0];
      return NextResponse.json(
        {
          error: firstError.message,
          field: firstError.path.join('.'),
          code: 'VALIDATION_ERROR',
        },
        { status: 400 }
      );
    }

    if (error instanceof AppError) {
      return NextResponse.json(
        {
          error: error.message,
          code: error.code,
          field: error.field,
        },
        { status: error.statusCode }
      );
    }

    return NextResponse.json({ error: 'Failed to create reservation' }, { status: 500 });
  }
}
