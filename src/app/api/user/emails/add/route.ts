import { z } from 'zod';

import { NextRequest, NextResponse } from 'next/server';

import { getCurrentUser } from '@/lib/auth-utils';
import { getUserFriendlyError } from '@/lib/errors';
import { db } from '@/lib/db';
import { generateVerificationToken, sendVerificationEmail } from '@/lib/email-verification';
import { rateLimiter, getRateLimitHeaders, getClientIdentifier } from '@/lib/rate-limiter';
import { logger } from '@/lib/services/logger';

const AddEmailSchema = z.object({
  email: z.string().email('Invalid email address'),
});

/**
 * Handles POST requests for adding a new email to the user's account
 *
 * @description Validates and adds a new email address, sends verification email
 * @param {NextRequest} request - The incoming HTTP request object with email in JSON body
 * @returns {Promise<NextResponse>} JSON response with the created email record
 *
 * @throws {401} Unauthorized - Valid session required
 * @throws {400} Bad Request - Invalid email format or email already in use
 * @throws {500} Internal Server Error - Database or email sending errors
 *
 * @example
 * // Add new email
 * POST /api/user/emails/add
 * { "email": "newemail@example.com" }
 *
 * @see {@link getCurrentUser} for unified authentication
 * @see {@link AddEmailSchema} for request validation
 * @see {@link generateVerificationToken} for token generation
 * @see {@link sendVerificationEmail} for verification email
 */
export async function POST(request: NextRequest) {
  try {
    // Check rate limit before processing
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

    const user = await getCurrentUser();
    if (!user?.id) {
      return NextResponse.json(
        { error: getUserFriendlyError('UNAUTHORIZED'), code: 'UNAUTHORIZED' },
        { status: 401 }
      );
    }

    const body = await request.json();
    const data = AddEmailSchema.parse(body);

    // Create UserEmail record (not verified yet)
    // Database unique constraints will prevent duplicates atomically
    try {
      const userEmail = await db.userEmail.create({
        data: {
          userId: user.id,
          email: data.email,
          isPrimary: false, // New emails are never primary by default
          isVerified: false,
        },
      });

      // Generate verification token
      const token = await generateVerificationToken(userEmail.id);

      // Send verification email
      try {
        await sendVerificationEmail(data.email, token);
      } catch (emailError) {
        // If email sending fails, delete the UserEmail record and return error
        await db.userEmail.delete({
          where: { id: userEmail.id },
        });

        logger.error({ error: emailError }, 'Failed to send verification email');
        return NextResponse.json(
          {
            error: getUserFriendlyError('INTERNAL_ERROR', 'Failed to send verification email. Please try again.'),
            code: 'INTERNAL_ERROR',
          },
          { status: 500 }
        );
      }

      return NextResponse.json(
        {
          success: true,
          email: {
            id: userEmail.id,
            email: userEmail.email,
            isPrimary: userEmail.isPrimary,
            isVerified: userEmail.isVerified,
            verifiedAt: userEmail.verifiedAt,
            createdAt: userEmail.createdAt,
          },
          message: 'Email added. Please check your inbox for verification link.',
        },
        { headers: getRateLimitHeaders(rateLimitResult) }
      );
    } catch (createError: any) {
      // Handle Prisma unique constraint violation
      if (createError.code === 'P2002') {
        return NextResponse.json(
          {
            error: getUserFriendlyError('ALREADY_EXISTS', 'Email already in use'),
            code: 'ALREADY_EXISTS',
          },
          { status: 400, headers: getRateLimitHeaders(rateLimitResult) }
        );
      }

      // Re-throw other errors to be handled by outer catch
      throw createError;
    }
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

    logger.error({ error: error }, 'Add email error');
    return NextResponse.json(
      { error: getUserFriendlyError('INTERNAL_ERROR'), code: 'INTERNAL_ERROR' },
      { status: 500 }
    );
  }
}
