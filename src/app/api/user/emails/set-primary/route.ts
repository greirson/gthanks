import { z } from 'zod';

import { NextRequest, NextResponse } from 'next/server';

import { getCurrentUser } from '@/lib/auth-utils';
import { getUserFriendlyError } from '@/lib/errors';
import { userService } from '@/lib/services/user-service';
import { logger } from '@/lib/services/logger';

const SetPrimaryEmailSchema = z.object({
  emailId: z.string().min(1, 'Email ID is required'),
});

/**
 * Handles POST requests for setting an email as the primary email
 *
 * @description Sets an email as primary with proper constraint enforcement and User.email sync
 * @param {NextRequest} request - The incoming HTTP request object with emailId in JSON body
 * @returns {Promise<NextResponse>} JSON response with updated email record
 *
 * @throws {401} Unauthorized - Valid session required
 * @throws {400} Bad Request - Invalid request data, email not verified, or email not found
 * @throws {403} Forbidden - Email belongs to another user
 * @throws {500} Internal Server Error - Database or transaction errors
 *
 * @example
 * // Set email as primary
 * POST /api/user/emails/set-primary
 * { "emailId": "abc123" }
 *
 * @see {@link getCurrentUser} for unified authentication
 * @see {@link SetPrimaryEmailSchema} for request validation
 * @see {@link userService.setPrimaryEmail} for service implementation
 */
export async function POST(request: NextRequest) {
  try {
    const user = await getCurrentUser();
    if (!user?.id) {
      return NextResponse.json(
        { error: getUserFriendlyError('UNAUTHORIZED'), code: 'UNAUTHORIZED' },
        { status: 401 }
      );
    }

    const body = (await request.json()) as unknown;
    const data = SetPrimaryEmailSchema.parse(body);

    // Use service layer
    const result = await userService.setPrimaryEmail(user.id, data.emailId);

    return NextResponse.json({
      success: true,
      email: {
        id: result.id,
        email: result.email,
        isPrimary: result.isPrimary,
        isVerified: result.isVerified,
        verifiedAt: result.verifiedAt,
        createdAt: result.createdAt,
      },
      message: 'Primary email updated successfully',
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        {
          error: getUserFriendlyError('VALIDATION_ERROR', error.errors[0].message),
          code: 'VALIDATION_ERROR',
        },
        { status: 400 }
      );
    }

    logger.error({ error: error }, 'Set primary email error');
    return NextResponse.json(
      { error: getUserFriendlyError('INTERNAL_ERROR'), code: 'INTERNAL_ERROR' },
      { status: 500 }
    );
  }
}
