import { getServerSession } from 'next-auth';
import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';

export async function DELETE(
  request: NextRequest,
  { params }: { params: { reservationId: string } }
) {
  const session = await getServerSession();

  if (!session?.user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  // Verify user owns this reservation
  const reservation = await db.reservation.findUnique({
    where: { id: params.reservationId },
  });

  if (!reservation) {
    return NextResponse.json({ error: 'Reservation not found' }, { status: 404 });
  }

  if (reservation.userId !== session.user.id) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  await db.reservation.delete({
    where: { id: params.reservationId },
  });

  return new NextResponse(null, { status: 204 });
}
