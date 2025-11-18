import { z } from 'zod';

import { NextRequest, NextResponse } from 'next/server';

import { getCurrentUser } from '@/lib/auth-utils';
import { getUserFriendlyError } from '@/lib/errors';
import { userService } from '@/lib/services/user-service';
import { rateLimiter, getRateLimitHeaders, getClientIdentifier } from '@/lib/rate-limiter';
import { logger } from '@/lib/services/logger';

const ChangeEmailSchema = z.object({
  email: z.string().email('Invalid email address'),
});

/**
 * Handles POST requests for changing the user's primary email address
 *
 * @description Provides traditional "change email" UX while using multi-email system under the hood.
 * Adds new email as secondary (unverified, non-primary), sends verification email with special message,
 * and auto-promotes to primary after verification.
 *
 * @param {NextRequest} request - The incoming HTTP request object with email in JSON body
 * @returns {Promise<NextResponse>} JSON response with the created email record
 *
 * @throws {401} Unauthorized - Valid session required
 * @throws {400} Bad Request - Invalid email format or email already in use
 * @throws {429} Too Many Requests - Rate limit exceeded (5 requests per hour)
 * @throws {500} Internal Server Error - Database or email sending errors
 *
 * @example
 * // Change primary email
 * POST /api/user/emails/change
 * { "email": "newemail@example.com" }
 *
 * @see {@link getCurrentUser} for unified authentication
 * @see {@link ChangeEmailSchema} for request validation
 * @see {@link generateVerificationToken} for token generation
 * @see {@link sendVerificationEmail} for verification email
 */
export async function POST(request: NextRequest) {
  try {
    // 1. Rate limiting (reuse email-add category - 5 requests per hour)
    const identifier = getClientIdentifier(request);
    const rateLimitResult = await rateLimiter.check('email-add', identifier);

    if (!rateLimitResult.allowed) {
      return NextResponse.json(
        {
          error: getUserFriendlyError('RATE_LIMIT_EXCEEDED'),
          code: 'RATE_LIMIT_EXCEEDED',
        },
        {
          status: 429,
          headers: getRateLimitHeaders(rateLimitResult)
        }
      );
    }

    // 2. Authentication
    const user = await getCurrentUser();
    if (!user?.id) {
      return NextResponse.json(
        { error: getUserFriendlyError('UNAUTHORIZED'), code: 'UNAUTHORIZED' },
        { status: 401 }
      );
    }

    // 3. Validation
    const body = (await request.json()) as unknown;
    const data = ChangeEmailSchema.parse(body);

    // 4. Add email using service layer
    // Service handles: creation, verification token generation, email sending, and rollback on failure
    try {
      const userEmail = await userService.addEmail(user.id, data.email, true);

      return NextResponse.json(
        {
          success: true,
          message: 'Verification email sent. Please verify to complete the email change.',
          email: {
            id: userEmail.id,
            email: userEmail.email,
            isPrimary: userEmail.isPrimary,
            isVerified: userEmail.isVerified,
            verifiedAt: userEmail.verifiedAt,
            createdAt: userEmail.createdAt,
          },
        },
        { headers: getRateLimitHeaders(rateLimitResult) }
      );
    } catch (createError: unknown) {
      // Handle service layer errors
      const err = createError instanceof Error ? createError : new Error(String(createError));

      if (err.message.includes('already in use')) {
        return NextResponse.json(
          {
            error: getUserFriendlyError('ALREADY_EXISTS', 'Email already in use'),
            code: 'ALREADY_EXISTS',
          },
          { status: 400, headers: getRateLimitHeaders(rateLimitResult) }
        );
      }

      if (err.message.includes('Failed to send verification email')) {
        logger.error({ error: err }, 'Failed to send verification email');
        return NextResponse.json(
          {
            error: getUserFriendlyError('INTERNAL_ERROR', 'Failed to send verification email. Please try again.'),
            code: 'INTERNAL_ERROR',
          },
          { status: 500, headers: getRateLimitHeaders(rateLimitResult) }
        );
      }

      // Re-throw other errors to be handled by outer catch
      throw err;
    }
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        {
          error: getUserFriendlyError('VALIDATION_ERROR', error.errors[0]?.message || 'Invalid email format'),
          code: 'VALIDATION_ERROR',
        },
        { status: 400 }
      );
    }

    logger.error({ error: error }, 'Change email error');
    return NextResponse.json(
      {
        error: getUserFriendlyError('INTERNAL_ERROR', 'Failed to process email change request'),
        code: 'INTERNAL_ERROR',
      },
      { status: 500 }
    );
  }
}
