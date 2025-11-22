import { NextRequest, NextResponse } from 'next/server';

/**
 * DEPRECATED: Anonymous reservations via access tokens are no longer supported.
 *
 * As of the Reservation schema migration, all reservations now require authentication.
 * This endpoint returns 410 Gone to indicate the feature has been permanently removed.
 *
 * Users should:
 * 1. Sign in to create/manage reservations
 * 2. Use the authenticated reservation endpoints:
 *    - POST /api/wishes/[wishId]/reservation
 *    - DELETE /api/wishes/[wishId]/reservation
 */

export async function GET(_request: NextRequest) {
  return NextResponse.json(
    {
      error: 'Anonymous reservations are no longer supported. Please sign in to reserve wishes.',
      code: 'FEATURE_REMOVED',
      migration: {
        reason: 'Reservation schema migrated to authenticated-only model',
        alternative: 'Sign in and use POST /api/wishes/[wishId]/reservation',
      },
    },
    { status: 410 } // 410 Gone - resource permanently unavailable
  );
}

export async function DELETE(_request: NextRequest) {
  return NextResponse.json(
    {
      error:
        'Anonymous reservation removal is no longer supported. Please sign in to manage reservations.',
      code: 'FEATURE_REMOVED',
      migration: {
        reason: 'Reservation schema migrated to authenticated-only model',
        alternative: 'Sign in and use DELETE /api/wishes/[wishId]/reservation',
      },
    },
    { status: 410 } // 410 Gone - resource permanently unavailable
  );
}
