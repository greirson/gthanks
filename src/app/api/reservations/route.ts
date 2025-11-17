import { z } from 'zod';

import { NextRequest, NextResponse } from 'next/server';

import { getCurrentUser } from '@/lib/auth-utils';
import { AppError } from '@/lib/errors';
import { reservationService } from '@/lib/services/reservation-service';
import { ReservationCreateSchema } from '@/lib/validators/reservation';
import { logger } from '@/lib/services/logger';

/**
 * Handles POST requests for creating new reservations
 *
 * @description Creates a new reservation for a wish, supports both authenticated and anonymous users with auto-population of user data
 * @param {NextRequest} request - The incoming HTTP request object with reservation data in JSON body
 * @returns {Promise<NextResponse>} JSON response with created reservation data or error
 *
 * @throws {400} Bad Request - Invalid reservation data, validation errors, or wish already reserved
 * @throws {404} Not Found - Wish with specified ID does not exist
 * @throws {500} Internal Server Error - Database or service errors
 *
 * @example
 * // Create reservation (authenticated user - email auto-populated)
 * POST /api/reservations
 * {
 *   "wishId": "wish456",
 *   "reserverName": "John Doe"
 * }
 *
 * // Create reservation (anonymous user)
 * POST /api/reservations
 * {
 *   "wishId": "wish456",
 *   "reserverEmail": "john@example.com",
 *   "reserverName": "John Doe"
 * }
 *
 * @public Supports both authenticated and anonymous users for flexible gift coordination
 * @see {@link getCurrentUser} for authentication details
 * @see {@link ReservationCreateSchema} for request validation
 * @see {@link reservationService.createReservation} for business logic
 */
export async function POST(request: NextRequest) {
  try {
    const user = await getCurrentUser();
    const body = (await request.json()) as {
      listId: string;
      wishId: string;
      reservedFor?: string;
      message?: string;
      metadata?: Record<string, unknown>;
    };

    // Validate input
    const validatedData = ReservationCreateSchema.parse(body);

    // If user is logged in, use their email
    if (user && !validatedData.reserverEmail) {
      validatedData.reserverEmail = user.email;
      validatedData.reserverName = validatedData.reserverName || user.name;
    }

    // Create reservation
    const reservation = await reservationService.createReservation(validatedData, user?.id);

    // Convert dates to ISO strings for JSON serialization
    const serializedReservation = {
      ...reservation,
      reservedAt: reservation.reservedAt.toISOString(),
      reminderSentAt: reservation.reminderSentAt?.toISOString() || null,
    };

    return NextResponse.json(serializedReservation, { status: 201 });
  } catch (error) {
    logger.error({ error: error }, 'POST /api/reservations error');

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
