import { NextRequest, NextResponse } from 'next/server';

import { getCurrentUser } from '@/lib/auth-utils';
import { AppError } from '@/lib/errors';
import { reservationService } from '@/lib/services/reservation-service';

interface RouteParams {
  params: {
    reservationId: string;
  };
}

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
    await reservationService.removeReservation(params.reservationId, userEmail);

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
