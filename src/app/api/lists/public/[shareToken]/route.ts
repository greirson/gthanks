import { NextRequest, NextResponse } from 'next/server';

import { NotFoundError, ForbiddenError } from '@/lib/errors';
import { rateLimiter, getRateLimitHeaders, getClientIdentifier } from '@/lib/rate-limiter';
import { listService } from '@/lib/services/list-service';
import { logger } from '@/lib/services/logger';

/**
 * GET /api/lists/public/[shareToken]
 * Access a public list via share token (no authentication required)
 */
export async function GET(
  request: NextRequest,
  { params }: { params: { shareToken: string } }
) {
  try {
    // Rate limiting - prevent abuse
    const clientIdentifier = getClientIdentifier(request);
    const rateLimitResult = await rateLimiter.check('public-list-access', clientIdentifier);

    if (!rateLimitResult.allowed) {
      return NextResponse.json(
        {
          error: 'Too many requests. Please try again later.',
          code: 'RATE_LIMIT_EXCEEDED',
          retryAfter: rateLimitResult.retryAfter,
        },
        {
          status: 429,
          headers: getRateLimitHeaders(rateLimitResult),
        }
      );
    }

    // Fetch list by share token (no password required for public lists)
    const list = await listService.getListByShareToken(params.shareToken);

    // Exclude password hash from response
    const { password: _, ...safeList } = list;

    return NextResponse.json(safeList, {
      headers: getRateLimitHeaders(rateLimitResult),
    });
  } catch (error) {
    if (error instanceof NotFoundError) {
      return NextResponse.json({ error: error.message }, { status: 404 });
    }

    if (error instanceof ForbiddenError) {
      return NextResponse.json(
        { error: error.message, code: 'FORBIDDEN' },
        { status: 403 }
      );
    }

    logger.error({ error: error }, 'Error fetching public list');
    return NextResponse.json({ error: 'Failed to fetch list' }, { status: 500 });
  }
}

/**
 * POST /api/lists/public/[shareToken]
 * Access a password-protected list via share token with password
 */
export async function POST(
  request: NextRequest,
  { params }: { params: { shareToken: string } }
) {
  try {
    // Rate limiting - prevent brute force password attempts (stricter limit)
    const clientIdentifier = getClientIdentifier(request);
    const rateLimitResult = await rateLimiter.check('public-list-password', clientIdentifier);

    if (!rateLimitResult.allowed) {
      return NextResponse.json(
        {
          error: 'Too many requests. Please try again later.',
          code: 'RATE_LIMIT_EXCEEDED',
          retryAfter: rateLimitResult.retryAfter,
        },
        {
          status: 429,
          headers: getRateLimitHeaders(rateLimitResult),
        }
      );
    }

    // Extract password from request body
    const body = (await request.json()) as unknown;
    const password = typeof body === 'object' && body !== null && 'password' in body
      ? (body as { password: unknown }).password
      : undefined;

    if (!password || typeof password !== 'string') {
      return NextResponse.json(
        { error: 'Password is required', code: 'VALIDATION_ERROR' },
        {
          status: 400,
          headers: getRateLimitHeaders(rateLimitResult),
        }
      );
    }

    // Fetch list by share token with password
    const list = await listService.getListByShareToken(params.shareToken, password);

    // Exclude password hash from response
    const { password: _, ...safeList } = list;

    return NextResponse.json(safeList, {
      headers: getRateLimitHeaders(rateLimitResult),
    });
  } catch (error) {
    if (error instanceof NotFoundError) {
      return NextResponse.json({ error: error.message }, { status: 404 });
    }

    if (error instanceof ForbiddenError) {
      return NextResponse.json(
        { error: error.message, code: 'FORBIDDEN' },
        { status: 403 }
      );
    }

    logger.error({ error: error }, 'Error fetching password-protected list');
    return NextResponse.json({ error: 'Failed to fetch list' }, { status: 500 });
  }
}
