import { NextRequest, NextResponse } from 'next/server';

import { verifyEmailToken } from '@/lib/email-verification';
import { rateLimiter, getClientIdentifier } from '@/lib/rate-limiter';
// eslint-disable-next-line local-rules/no-direct-db-import -- Read-only query for first-email check, utilities handle verification
import { db } from '@/lib/db';
import { updateEmailPrimaryStatus } from '@/lib/utils/email-constraints';
import { logger } from '@/lib/services/logger';
import { getAppBaseUrl } from '@/lib/utils';

/**
 * Handles GET requests for email verification via token
 *
 * @description Verifies an email address using the token from the verification email link.
 * If this is the user's first verified email, automatically promotes it to primary.
 * @param {NextRequest} request - The incoming HTTP request object with token in query params
 * @returns {Promise<NextResponse>} Redirect to settings page with success or error message
 *
 * @throws Redirects to settings page with appropriate message
 *
 * @example
 * // Verify email (first verified email - will be promoted to primary)
 * GET /api/user/emails/verify?token=abc123...
 * // Redirects to /settings?emailVerified=success&email=user@example.com&promoted=true
 *
 * @example
 * // Verify additional email (will NOT be promoted to primary)
 * GET /api/user/emails/verify?token=def456...
 * // Redirects to /settings?emailVerified=success&email=user2@example.com
 *
 * @note This route uses utility functions appropriately:
 *       - verifyEmailToken() handles core verification logic
 *       - updateEmailPrimaryStatus() handles auto-promotion with transaction safety
 *       - Simple count query to determine first-email status
 *       - Could use userService.verifyEmail() + userService.setPrimaryEmail() but current
 *         approach with utilities is cleaner for this redirect-based flow
 *
 * @see {@link verifyEmailToken} for token verification logic
 * @see {@link updateEmailPrimaryStatus} for auto-promotion logic
 */
export async function GET(request: NextRequest) {
  try {
    // Check rate limit before processing
    const identifier = getClientIdentifier(request);
    const rateLimitResult = await rateLimiter.check('email-verify', identifier);

    if (!rateLimitResult.allowed) {
      return NextResponse.redirect(
        new URL(
          '/settings?emailVerified=error&message=Too+many+verification+attempts.+Please+try+again+later.',
          getAppBaseUrl()
        )
      );
    }

    const { searchParams } = new URL(request.url);
    const token = searchParams.get('token');

    if (!token) {
      return NextResponse.redirect(
        new URL('/settings?emailVerified=error&message=Missing+verification+token', getAppBaseUrl())
      );
    }

    // Verify the token and mark email as verified
    const verifiedEmail = await verifyEmailToken(token);

    if (!verifiedEmail) {
      return NextResponse.redirect(
        new URL(
          '/settings?emailVerified=error&message=Invalid+or+expired+verification+token',
          getAppBaseUrl()
        )
      );
    }

    // Auto-promote if this is the user's first verified email
    const verifiedCount = await db.userEmail.count({
      where: {
        userId: verifiedEmail.userId,
        isVerified: true,
      },
    });

    let wasPromoted = false;

    // If this is the first (or only) verified email, make it primary
    if (verifiedCount === 1) {
      try {
        await updateEmailPrimaryStatus(db, verifiedEmail.id, true);
        wasPromoted = true;
      } catch (error) {
        // Log error but don't fail verification - email is still verified
        logger.error({ error: error }, 'Failed to auto-promote first verified email');
      }
    }

    // Success - redirect to settings with success message
    return NextResponse.redirect(
      new URL(
        `/settings?emailVerified=success&email=${encodeURIComponent(verifiedEmail.email)}${wasPromoted ? '&promoted=true' : ''}`,
        getAppBaseUrl()
      )
    );
  } catch (error) {
    logger.error({ error: error }, 'Email verification error');
    return NextResponse.redirect(
      new URL('/settings?emailVerified=error&message=Verification+failed', getAppBaseUrl())
    );
  }
}
