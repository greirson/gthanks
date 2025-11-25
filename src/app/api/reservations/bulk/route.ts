import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';

import { authOptions } from '@/lib/auth';
import { reservationService } from '@/lib/services/reservation-service';
import {
  BulkCancelReservationsSchema,
  BulkMarkPurchasedSchema,
  BulkUnmarkPurchasedSchema,
} from '@/lib/validators/api-responses/reservations';
import { ForbiddenError } from '@/lib/errors';
import { rateLimiter } from '@/lib/rate-limiter';
import { logger } from '@/lib/services/logger';

/**
 * Handles POST requests for bulk reservation operations
 *
 * @description Performs bulk actions on reservations (cancel or mark as purchased)
 * @param {NextRequest} request - The incoming HTTP request with action and reservation IDs
 * @returns {Promise<NextResponse>} JSON response with operation results (partial success supported)
 *
 * @throws {401} Unauthorized - User must be logged in
 * @throws {403} Forbidden - User doesn't own all specified reservations
 * @throws {429} Too Many Requests - Rate limit exceeded (10 operations/hour)
 * @throws {400} Bad Request - Invalid action or validation error
 * @throws {500} Internal Server Error - Database or service errors
 *
 * @example
 * // Bulk cancel reservations
 * POST /api/reservations/bulk
 * {
 *   "action": "cancel",
 *   "reservationIds": ["res123", "res456"]
 * }
 *
 * @example
 * // Bulk mark as purchased with optional date
 * POST /api/reservations/bulk
 * {
 *   "action": "markPurchased",
 *   "reservationIds": ["res123", "res456"],
 *   "purchasedDate": "2025-01-15"
 * }
 *
 * @protected Requires authentication
 * @see {@link reservationService.bulkCancel} for cancel implementation
 * @see {@link reservationService.bulkMarkPurchased} for mark purchased implementation
 */
export async function POST(req: NextRequest) {
  try {
    // REQUIRE AUTHENTICATION
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Apply rate limiting (10 bulk operations per hour per user)
    const rateLimitKey = `${session.user.id}`;
    const rateLimitResult = await rateLimiter.check('bulk-operation', rateLimitKey);

    if (!rateLimitResult.allowed) {
      return NextResponse.json(
        {
          error: 'Too many bulk operations. Please try again later.',
          retryAfter: rateLimitResult.retryAfter,
        },
        { status: 429 }
      );
    }

    const body: unknown = await req.json();
    const action = (body as { action?: string }).action;

    // Handle cancel action
    if (action === 'cancel') {
      const validationResult = BulkCancelReservationsSchema.safeParse(body);

      if (!validationResult.success) {
        return NextResponse.json(
          { error: 'Invalid request body', details: validationResult.error.issues },
          { status: 400 }
        );
      }

      const { reservationIds } = validationResult.data;

      // Use service layer (handles ownership verification + transaction)
      const result = await reservationService.bulkCancel(reservationIds, session.user.id);

      return NextResponse.json({
        success: result.failed.length === 0,
        succeeded: result.succeeded,
        failed: result.failed,
        cancelledCount: result.succeeded.length,
        message: `${result.succeeded.length} of ${result.totalProcessed} reservation(s) cancelled`,
      });
    }

    // Handle markPurchased action
    if (action === 'markPurchased') {
      const validationResult = BulkMarkPurchasedSchema.safeParse(body);

      if (!validationResult.success) {
        return NextResponse.json(
          { error: 'Invalid request body', details: validationResult.error.issues },
          { status: 400 }
        );
      }

      const { reservationIds, purchasedDate } = validationResult.data;

      // Use service layer (handles ownership verification + transaction)
      const result = await reservationService.bulkMarkPurchased(
        reservationIds,
        session.user.id,
        purchasedDate ? new Date(purchasedDate) : undefined
      );

      return NextResponse.json({
        success: result.failed.length === 0,
        succeeded: result.succeeded,
        failed: result.failed,
        purchasedCount: result.succeeded.length,
        message: `${result.succeeded.length} of ${result.totalProcessed} reservation(s) marked as purchased`,
      });
    }

    // Handle unmarkPurchased action
    if (action === 'unmarkPurchased') {
      const validationResult = BulkUnmarkPurchasedSchema.safeParse(body);

      if (!validationResult.success) {
        return NextResponse.json(
          { error: 'Invalid request body', details: validationResult.error.issues },
          { status: 400 }
        );
      }

      const { reservationIds } = validationResult.data;

      // Use service layer (handles ownership verification + transaction)
      const result = await reservationService.bulkUnmarkPurchased(reservationIds, session.user.id);

      return NextResponse.json({
        success: result.failed.length === 0,
        succeeded: result.succeeded,
        failed: result.failed,
        unmarkedCount: result.succeeded.length,
        message: `${result.succeeded.length} of ${result.totalProcessed} reservation(s) un-marked`,
      });
    }

    // Invalid action
    return NextResponse.json({ error: 'Invalid action' }, { status: 400 });
  } catch (error) {
    logger.error({ error }, 'POST /api/reservations/bulk error');

    if (error instanceof ForbiddenError) {
      return NextResponse.json({ error: error.message }, { status: 403 });
    }

    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
