import { z } from 'zod';

import { NextRequest, NextResponse } from 'next/server';

import { getCurrentUser } from '@/lib/auth-utils';
import { AppError } from '@/lib/errors';
import { reservationService } from '@/lib/services/reservation-service';
import { ReservationCreateSchema } from '@/lib/validators/reservation';

interface RouteParams {
  params: {
    wishId: string;
  };
}

/**
 * Handles GET requests for retrieving wish reservation status
 *
 * @description Retrieves reservation status for a specific wish with optional user context for enhanced information
 * @param {NextRequest} request - The incoming HTTP request object
 * @param {RouteParams} params - Route parameters containing the wish ID
 * @returns {Promise<NextResponse>} JSON response with reservation status or error
 *
 * @throws {500} Internal Server Error - Reservation status retrieval failures
 *
 * @example
 * // Get reservation status for wish
 * GET /api/wishes/wish123/reservation
 * // Returns: { isReserved: true, reserverName: "John Doe", reservedAt: "2024-01-15T10:00:00Z" }
 *
 * @public Authentication optional - provides enhanced information for authenticated users
 * @see {@link getCurrentUser} for optional authentication
 * @see {@link reservationService.getReservationStatus} for status retrieval
 */
// GET /api/wishes/[wishId]/reservation - Get reservation status
export async function GET(request: NextRequest, { params }: RouteParams) {
  try {
    const user = await getCurrentUser();

    // Get public reservation info
    const status = await reservationService.getReservationStatus(
      [params.wishId],
      user?.email || undefined
    );

    return NextResponse.json(status[params.wishId]);
  } catch {
    return NextResponse.json({ error: 'Failed to fetch reservation status' }, { status: 500 });
  }
}

/**
 * Handles POST requests for creating wish reservations
 *
 * @description Creates a reservation for a specific wish with support for both authenticated and anonymous users - includes validation and conflict detection
 * @param {NextRequest} request - The incoming HTTP request object with reservation data in JSON body
 * @param {RouteParams} params - Route parameters containing the wish ID
 * @returns {Promise<NextResponse>} JSON response with created reservation data or error
 *
 * @throws {400} Bad Request - Invalid reservation data or validation errors
 * @throws {409} Conflict - Wish already reserved or validation business logic failures
 * @throws {500} Internal Server Error - Reservation creation service failures
 *
 * @example
 * // Reserve a wish (authenticated user)
 * POST /api/wishes/wish123/reservation
 * {
 *   "reserverEmail": "john@example.com",
 *   "reserverName": "John Doe"
 * }
 * // Returns: { id: "res123", wishId: "wish123", reserverEmail: "john@example.com", reservedAt: "2024-01-15T10:00:00Z" }
 *
 * @public Supports both authenticated and anonymous reservation with email validation
 * @see {@link getCurrentUser} for optional authentication
 * @see {@link ReservationCreateSchema} for request validation
 * @see {@link reservationService.createReservation} for reservation logic
 */
// POST /api/wishes/[wishId]/reservation - Reserve a wish
export async function POST(request: NextRequest, { params }: RouteParams) {
  try {
    const user = await getCurrentUser();
    const body = await request.json();

    // Add wishId to body
    const dataWithWishId = { ...body, wishId: params.wishId };

    // Validate
    const validatedData = ReservationCreateSchema.parse(dataWithWishId);

    // If user is logged in, use their info
    if (user) {
      validatedData.reserverEmail = validatedData.reserverEmail || user.email;
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
        },
        { status: error.statusCode }
      );
    }

    return NextResponse.json({ error: 'Failed to reserve wish' }, { status: 500 });
  }
}

/**
 * Handles DELETE requests for removing wish reservations
 *
 * @description Removes a reservation for a specific wish with strict authentication requirements - only authenticated users can delete their own reservations
 * @param {NextRequest} request - The incoming HTTP request object
 * @param {RouteParams} params - Route parameters containing the wish ID
 * @returns {Promise<NextResponse>} 204 No Content on success or error response
 *
 * @throws {401} Unauthorized - User authentication required for deletion
 * @throws {403} Forbidden - User does not own the reservation
 * @throws {404} Not Found - Reservation not found or already removed
 * @throws {500} Internal Server Error - Reservation removal service failures
 *
 * @example
 * // Remove reservation for authenticated user
 * DELETE /api/wishes/wish123/reservation
 * // Returns: 204 No Content (success)
 *
 * @requires Authentication - only authenticated users can delete reservations
 * @see {@link getCurrentUser} for authentication
 * @see {@link reservationService.removeReservationByWishId} for deletion logic
 */
// DELETE /api/wishes/[wishId]/reservation - Unreserve wish
export async function DELETE(request: NextRequest, { params }: RouteParams) {
  try {
    const user = await getCurrentUser();

    // For anonymous users, we would need a secure way to verify their identity
    // (e.g., a signed token sent to their email). For now, only authenticated
    // users can delete reservations.
    if (!user) {
      return NextResponse.json(
        { error: 'Authentication required to delete reservations' },
        { status: 401 }
      );
    }

    // The user's email MUST come from the session, never from client input
    const userEmail = user.email || undefined;

    // Remove reservation
    await reservationService.removeReservationByWishId(params.wishId, userEmail);

    return new NextResponse(null, { status: 204 });
  } catch (error) {
    if (error instanceof AppError) {
      return NextResponse.json(
        {
          error: error.message,
          code: error.code,
        },
        { status: error.statusCode }
      );
    }

    return NextResponse.json({ error: 'Failed to remove reservation' }, { status: 500 });
  }
}
