import { z } from 'zod';

import { NextRequest, NextResponse } from 'next/server';

import { getCurrentUser } from '@/lib/auth-utils';
import { getUserFriendlyError } from '@/lib/errors';
import { rateLimiter, getRateLimitHeaders, getClientIdentifier } from '@/lib/rate-limiter';
import { AuditActions } from '@/lib/schemas/audit-log';
import { auditService } from '@/lib/services/audit-service';
import { userService } from '@/lib/services/user-service';
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
 * @see {@link userService.addEmail} for service implementation
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
          headers: getRateLimitHeaders(rateLimitResult),
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

    const body = (await request.json()) as unknown;
    const data = AddEmailSchema.parse(body);

    // Use service layer
    const userEmail = await userService.addEmail(user.id, data.email, true);

    // Fire and forget audit log
    auditService.log({
      actorId: user.id,
      actorName: user.name || user.email || undefined,
      actorType: 'user',
      category: 'user',
      action: AuditActions.EMAIL_ADDED,
      resourceType: 'user_email',
      resourceId: userEmail.id,
      resourceName: userEmail.email,
    });

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
