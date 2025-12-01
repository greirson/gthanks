import { z } from 'zod';

import { NextRequest, NextResponse } from 'next/server';

import { getCurrentUser } from '@/lib/auth-utils';
import { rateLimiter, getRateLimitHeaders, getClientIdentifier } from '@/lib/rate-limiter';
import { logger } from '@/lib/services/logger';
import { tokenService } from '@/lib/services/token-service';
import { createTokenSchema } from '@/lib/validators/token';

/**
 * POST /api/auth/tokens - Create a new personal access token
 *
 * Creates a new personal access token pair (access + refresh) for API authentication.
 * This endpoint ONLY accepts session authentication to prevent token escalation attacks.
 *
 * @description Creates a PAT for programmatic API access (e.g., browser extensions)
 * @param {NextRequest} request - The incoming HTTP request with token metadata in JSON body
 * @returns {Promise<NextResponse>} JSON response with token pair or error
 *
 * @throws {401} Unauthorized - Session authentication required
 * @throws {400} Bad Request - Invalid request body
 * @throws {429} Too Many Requests - Rate limit exceeded
 * @throws {500} Internal Server Error - Token creation failed
 *
 * @example
 * POST /api/auth/tokens
 * {
 *   "name": "Safari Extension - MacBook Pro",
 *   "deviceType": "safari_extension"
 * }
 *
 * Response (201):
 * {
 *   "accessToken": "gth_abc123...",
 *   "refreshToken": "gth_ref_xyz789...",
 *   "expiresAt": 1735689600000,
 *   "user": { "id": "...", "name": "...", "email": "..." }
 * }
 */
export async function POST(request: NextRequest) {
  try {
    // Get user from session ONLY (not Bearer token)
    // This prevents token escalation attacks where a compromised token creates more tokens
    const user = await getCurrentUser();

    if (!user?.id) {
      return NextResponse.json(
        {
          error: 'unauthorized',
          message: 'You must be logged in to create a token',
        },
        { status: 401 }
      );
    }

    // Rate limit by user ID (not IP, since this requires authentication)
    const rateLimitResult = await rateLimiter.check('token-create', user.id);

    if (!rateLimitResult.allowed) {
      return NextResponse.json(
        {
          error: 'rate_limited',
          message: 'Too many token creation requests. Please try again later.',
        },
        {
          status: 429,
          headers: getRateLimitHeaders(rateLimitResult),
        }
      );
    }

    // Parse and validate request body
    const body = (await request.json()) as unknown;
    const validatedData = createTokenSchema.parse(body);

    // Get client IP for audit trail
    const clientIp = getClientIdentifier(request);

    // Create token pair using token service
    const tokenPair = await tokenService.createToken({
      userId: user.id,
      name: validatedData.name,
      deviceType: validatedData.deviceType,
      createdIp: clientIp,
    });

    logger.info(
      { userId: user.id, deviceType: validatedData.deviceType },
      'Personal access token created via API'
    );

    // Return token pair with user info (already fetched by getCurrentUser)
    return NextResponse.json(
      {
        accessToken: tokenPair.accessToken,
        refreshToken: tokenPair.refreshToken,
        expiresAt: tokenPair.expiresAt.getTime(),
        user: {
          id: user.id,
          name: user.name,
          email: user.email,
        },
      },
      {
        status: 201,
        headers: getRateLimitHeaders(rateLimitResult),
      }
    );
  } catch (error) {
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

    logger.error({ error }, 'POST /api/auth/tokens error');

    return NextResponse.json(
      {
        error: 'internal_error',
        message: 'Failed to create token',
      },
      { status: 500 }
    );
  }
}

/**
 * GET /api/auth/tokens - List all active tokens for the current user
 *
 * Returns a list of all non-revoked tokens for the authenticated user.
 * Currently only supports session authentication; Bearer token auth will be
 * added when middleware is updated (Task 10-11).
 *
 * @description Lists all active PATs for the authenticated user
 * @param {NextRequest} _request - The incoming HTTP request (unused but required by Next.js)
 * @returns {Promise<NextResponse>} JSON response with token list or error
 *
 * @throws {401} Unauthorized - Authentication required
 * @throws {500} Internal Server Error - Failed to fetch tokens
 *
 * @example
 * GET /api/auth/tokens
 *
 * Response (200):
 * {
 *   "tokens": [
 *     {
 *       "id": "token_abc123",
 *       "name": "Safari Extension - MacBook Pro",
 *       "deviceType": "safari_extension",
 *       "tokenPrefix": "gth_abc1...",
 *       "lastUsedAt": "2025-01-15T10:30:00Z",
 *       "createdAt": "2025-01-01T00:00:00Z",
 *       "expiresAt": "2025-01-16T10:30:00Z",
 *       "current": false
 *     }
 *   ]
 * }
 */
export async function GET(_request: NextRequest) {
  try {
    // Get user from session (Bearer auth will be added later via middleware)
    const user = await getCurrentUser();

    if (!user?.id) {
      return NextResponse.json(
        {
          error: 'unauthorized',
          message: 'You must be logged in to view your tokens',
        },
        { status: 401 }
      );
    }

    // Fetch tokens using token service
    // Note: currentTokenId will be populated when Bearer auth is implemented
    const tokens = await tokenService.listUserTokens(user.id);

    // Transform dates to ISO strings for JSON response
    const serializedTokens = tokens.map((token) => ({
      id: token.id,
      name: token.name,
      deviceType: token.deviceType,
      tokenPrefix: token.tokenPrefix,
      lastUsedAt: token.lastUsedAt?.toISOString() || null,
      createdAt: token.createdAt.toISOString(),
      expiresAt: token.expiresAt.toISOString(),
      current: token.current || false,
    }));

    return NextResponse.json({
      tokens: serializedTokens,
    });
  } catch (error) {
    logger.error({ error }, 'GET /api/auth/tokens error');

    return NextResponse.json(
      {
        error: 'internal_error',
        message: 'Failed to fetch tokens',
      },
      { status: 500 }
    );
  }
}
