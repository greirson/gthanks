import { z } from 'zod';

import { NextRequest, NextResponse } from 'next/server';

import { rateLimiter, getRateLimitHeaders, getClientIdentifier } from '@/lib/rate-limiter';
import { logger } from '@/lib/services/logger';
import { tokenService } from '@/lib/services/token-service';
import { refreshTokenSchema } from '@/lib/validators/token';

/**
 * POST /api/auth/tokens/refresh - Refresh an expired access token
 *
 * Exchanges a valid refresh token for a new access token.
 * This endpoint does NOT require session authentication - the refresh token itself
 * serves as the authentication credential.
 *
 * @description Refreshes an access token using a refresh token
 * @param {NextRequest} request - The incoming HTTP request with refresh token in JSON body
 * @returns {Promise<NextResponse>} JSON response with new access token or error
 *
 * @throws {400} Bad Request - Refresh token is required
 * @throws {401} Unauthorized - Refresh token is invalid or expired
 * @throws {403} Forbidden - Token has been revoked
 * @throws {429} Too Many Requests - Rate limit exceeded
 * @throws {500} Internal Server Error - Token refresh failed
 *
 * @example
 * POST /api/auth/tokens/refresh
 * {
 *   "refreshToken": "gth_ref_xyz789..."
 * }
 *
 * Response (200):
 * {
 *   "accessToken": "gth_newtoken123...",
 *   "expiresAt": 1735696800000
 * }
 */
export async function POST(request: NextRequest) {
  // Get client IP for rate limiting (no auth required for this endpoint)
  const clientIp = getClientIdentifier(request);

  try {
    // Rate limit by IP address (not user ID since no authentication required)
    const rateLimitResult = await rateLimiter.check('token-refresh', clientIp);

    if (!rateLimitResult.allowed) {
      return NextResponse.json(
        {
          error: 'rate_limited',
          message: 'Too many refresh requests. Please try again later.',
        },
        {
          status: 429,
          headers: getRateLimitHeaders(rateLimitResult),
        }
      );
    }

    // Parse and validate request body
    const body = (await request.json()) as unknown;
    const validatedData = refreshTokenSchema.parse(body);

    // Attempt to refresh the token
    const refreshed = await tokenService.refreshAccessToken(validatedData.refreshToken);

    // Handle invalid/expired refresh token
    if (!refreshed) {
      // Log for security monitoring (potential token probing)
      logger.warn({ ip: clientIp }, 'Invalid refresh token attempt');

      return NextResponse.json(
        {
          error: 'invalid_refresh_token',
          message: 'Refresh token is invalid or expired',
        },
        {
          status: 401,
          headers: getRateLimitHeaders(rateLimitResult),
        }
      );
    }

    logger.info({ ip: clientIp }, 'Access token refreshed via API');

    return NextResponse.json(
      {
        accessToken: refreshed.accessToken,
        expiresAt: refreshed.expiresAt.getTime(),
      },
      {
        status: 200,
        headers: getRateLimitHeaders(rateLimitResult),
      }
    );
  } catch (error) {
    // Handle Zod validation errors
    if (error instanceof z.ZodError) {
      const firstError = error.errors[0];
      return NextResponse.json(
        {
          error: 'validation_error',
          message: firstError.message,
        },
        { status: 400 }
      );
    }

    logger.error({ error, ip: clientIp }, 'POST /api/auth/tokens/refresh error');

    return NextResponse.json(
      {
        error: 'internal_error',
        message: 'Failed to refresh token',
      },
      { status: 500 }
    );
  }
}
