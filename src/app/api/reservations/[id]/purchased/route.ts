import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { db } from '@/lib/db';
import { z } from 'zod';

const markPurchasedSchema = z.object({
  purchasedDate: z.string().or(z.date()).optional(),
});

export async function PATCH(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession();
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await req.json();
    const { purchasedDate } = markPurchasedSchema.parse(body);

    // Verify reservation belongs to user
    const reservation = await db.reservation.findUnique({
      where: { id: params.id },
    });

    if (!reservation) {
      return NextResponse.json({ error: 'Reservation not found' }, { status: 404 });
    }

    if (reservation.userId !== session.user.id) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    // Update reservation
    const updated = await db.reservation.update({
      where: { id: params.id },
      data: {
        purchasedAt: new Date(),
        purchasedDate: purchasedDate ? new Date(purchasedDate) : new Date(),
      },
    });

    return NextResponse.json(updated);
  } catch (error) {
    console.error('Mark as purchased error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
