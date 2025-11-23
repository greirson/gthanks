import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { z } from 'zod';

import { authOptions } from '@/lib/auth';
import { reservationService } from '@/lib/services/reservation-service';
import { ForbiddenError, NotFoundError } from '@/lib/errors';

const markPurchasedSchema = z.object({
  purchasedDate: z.string().or(z.date()).optional(),
});

type MarkPurchasedBody = z.infer<typeof markPurchasedSchema>;

export async function PATCH(
  req: NextRequest,
  { params }: { params: { reservationId: string } }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body: unknown = await req.json();
    const parsed: MarkPurchasedBody = markPurchasedSchema.parse(body);

    const purchasedDate = parsed.purchasedDate
      ? new Date(parsed.purchasedDate)
      : undefined;

    // Use service layer for authorization and update
    const updated = await reservationService.markAsPurchased(
      params.reservationId,
      session.user.id,
      purchasedDate
    );

    return NextResponse.json(updated);
  } catch (error) {
    console.error('Mark as purchased error:', error);

    if (error instanceof NotFoundError) {
      return NextResponse.json({ error: error.message }, { status: 404 });
    }

    if (error instanceof ForbiddenError) {
      return NextResponse.json({ error: error.message }, { status: 403 });
    }

    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
