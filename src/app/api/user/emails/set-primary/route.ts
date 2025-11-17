import { z } from 'zod';

import { NextRequest, NextResponse } from 'next/server';

import { getCurrentUser } from '@/lib/auth-utils';
import { getUserFriendlyError } from '@/lib/errors';
import { db } from '@/lib/db';
import { ensureOnePrimaryEmail, syncUserEmailWithPrimary } from '@/lib/utils/email-constraints';
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
 * @see {@link ensureOnePrimaryEmail} for constraint enforcement
 * @see {@link syncUserEmailWithPrimary} for User.email sync
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

    const body = await request.json();
    const data = SetPrimaryEmailSchema.parse(body);

    // Use transaction to ensure atomic operation
    const result = await db.$transaction(async (tx) => {
      // Get the email to verify ownership and verification status
      const email = await tx.userEmail.findUnique({
        where: { id: data.emailId },
      });

      if (!email) {
        throw new Error('EMAIL_NOT_FOUND');
      }

      // Check if email belongs to the authenticated user
      if (email.userId !== user.id) {
        throw new Error('FORBIDDEN');
      }

      // Check if email is verified
      if (!email.isVerified) {
        throw new Error('EMAIL_NOT_VERIFIED');
      }

      // Ensure only one primary email (unset all others)
      await ensureOnePrimaryEmail(tx, user.id, data.emailId, true);

      // Update this email to be primary
      const updatedEmail = await tx.userEmail.update({
        where: { id: data.emailId },
        data: { isPrimary: true },
      });

      // Sync User.email with the new primary email
      await syncUserEmailWithPrimary(tx, user.id);

      return updatedEmail;
    });

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

    if (error instanceof Error) {
      switch (error.message) {
        case 'EMAIL_NOT_FOUND':
          return NextResponse.json(
            { error: getUserFriendlyError('NOT_FOUND', 'Email not found'), code: 'NOT_FOUND' },
            { status: 404 }
          );
        case 'FORBIDDEN':
          return NextResponse.json(
            {
              error: getUserFriendlyError('FORBIDDEN', 'You do not have permission to modify this email'),
              code: 'FORBIDDEN',
            },
            { status: 403 }
          );
        case 'EMAIL_NOT_VERIFIED':
          return NextResponse.json(
            {
              error: getUserFriendlyError('VALIDATION_ERROR', 'Email must be verified before setting as primary'),
              code: 'VALIDATION_ERROR',
            },
            { status: 400 }
          );
      }
    }

    logger.error({ error: error }, 'Set primary email error');
    return NextResponse.json(
      { error: getUserFriendlyError('INTERNAL_ERROR'), code: 'INTERNAL_ERROR' },
      { status: 500 }
    );
  }
}
