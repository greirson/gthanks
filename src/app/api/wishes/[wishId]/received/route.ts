import { z } from 'zod';

import { NextRequest, NextResponse } from 'next/server';

import { getCurrentUser } from '@/lib/auth-utils';
import { reservationService } from '@/lib/services/reservation-service';

interface RouteParams {
  params: {
    wishId: string;
  };
}

const ReceivedSchema = z.object({
  action: z.enum(['delete', 'unreserve']),
});

/**
 * Handles POST requests for marking wishes as received
 *
 * @description Processes received wish confirmations with actions like deletion or unreservation - only the wish owner can mark wishes as received
 * @param {NextRequest} request - The incoming HTTP request object with action data in JSON body
 * @param {RouteParams} params - Route parameters containing the wish ID
 * @returns {Promise<NextResponse>} JSON response with success confirmation or error
 *
 * @throws {401} Unauthorized - User authentication required
 * @throws {400} Bad Request - Invalid action type or validation errors
 * @throws {403} Forbidden - User does not own the wish
 * @throws {500} Internal Server Error - Wish processing service failures
 *
 * @example
 * // Mark wish as received and delete it
 * POST /api/wishes/wish123/received
 * {
 *   "action": "delete"
 * }
 * // Returns: { success: true }
 *
 * // Mark wish as received and unreserve it
 * POST /api/wishes/wish123/received
 * {
 *   "action": "unreserve"
 * }
 * // Returns: { success: true }
 *
 * @requires Authentication - only wish owners can mark wishes as received
 * @see {@link getCurrentUser} for authentication
 * @see {@link ReceivedSchema} for request validation
 * @see {@link reservationService.handleWishReceived} for processing logic
 */
// POST /api/wishes/[wishId]/received - Handle received wish
export async function POST(request: NextRequest, { params }: RouteParams) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { action } = ReceivedSchema.parse(body);

    // Handle the received wish
    await reservationService.handleWishReceived(params.wishId, user.id, action);

    return NextResponse.json({ success: true });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: 'Invalid action' }, { status: 400 });
    }

    return NextResponse.json({ error: 'Failed to process' }, { status: 500 });
  }
}
