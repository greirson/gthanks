import { z } from 'zod';

import { NextRequest, NextResponse } from 'next/server';

import { getCurrentUser } from '@/lib/auth-utils';
import { AppError } from '@/lib/errors';
import { reservationService } from '@/lib/services/reservation-service';
import { CheckReservationSchema } from '@/lib/validators/reservation';

interface RouteParams {
  params: {
    listId: string;
  };
}

/**
 * GET /api/lists/[listId]/reservations - Get all reservations for a list
 * @public Authentication optional - anonymous access allowed for public/password-protected lists
 */
export async function GET(request: NextRequest, { params }: RouteParams) {
  try {
    const user = await getCurrentUser();

    // Get reservations (privacy-aware)
    // Note: The service method checks list access permissions internally
    const reservations = await reservationService.getListReservations(params.listId, user?.id);

    return NextResponse.json(reservations);
  } catch (error) {
    if (error instanceof AppError) {
      return NextResponse.json(
        { error: error.message, code: error.code },
        { status: error.statusCode }
      );
    }

    return NextResponse.json({ error: 'Failed to fetch reservations' }, { status: 500 });
  }
}

// POST /api/lists/[listId]/reservations/check - Check multiple wishes
export async function POST(request: NextRequest, _context: RouteParams) {
  try {
    const user = await getCurrentUser();
    const body = (await request.json()) as Record<string, unknown>;

    // Validate
    const { wishIds } = CheckReservationSchema.parse(body);

    // Get reservation status
    const status = await reservationService.getReservationStatus(wishIds, user?.email || undefined);

    return NextResponse.json(status);
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: 'Invalid request data' }, { status: 400 });
    }

    return NextResponse.json({ error: 'Failed to check reservations' }, { status: 500 });
  }
}
