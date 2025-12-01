import { NextRequest, NextResponse } from 'next/server';

import { ForbiddenError, NotFoundError, getUserFriendlyError } from '@/lib/errors';
import { listAccessTokenService } from '@/lib/services/list-access-token';
import { listService } from '@/lib/services/list-service';
import { logger } from '@/lib/services/logger';

// Reserved routes that cannot be used as usernames
const RESERVED_ROUTES = [
  'admin',
  'api',
  'auth',
  'reservations',
  'share',
  'lists',
  'wishes',
  'groups',
  'settings',
  'profile',
];

interface RouteContext {
  params: Promise<{
    username: string;
    slug: string;
  }>;
}

/**
 * GET /api/public-profile/[username]/[slug]
 * Get list by vanity URL (username + slug)
 */
export async function GET(request: NextRequest, context: RouteContext) {
  try {
    const { username, slug } = await context.params;

    // Check for reserved routes
    if (RESERVED_ROUTES.includes(username.toLowerCase())) {
      return NextResponse.json(
        { error: getUserFriendlyError('NOT_FOUND'), code: 'NOT_FOUND' },
        { status: 404 }
      );
    }

    // Fetch list using service
    const list = await listService.getByVanityUrl(username, slug);

    // Handle list not found
    if (!list) {
      return NextResponse.json(
        { error: getUserFriendlyError('NOT_FOUND'), code: 'NOT_FOUND' },
        { status: 404 }
      );
    }

    // For password-protected lists, check cookie-based access
    if (list.visibility === 'password') {
      const accessCookie = request.cookies.get(listAccessTokenService.getCookieName())?.value;
      const hasValidAccess = listAccessTokenService.hasValidAccess(
        accessCookie,
        list.id,
        list.password ?? null
      );

      if (hasValidAccess) {
        // Mark list as having access
        list.hasAccess = true;
      } else {
        // Return 403 with PASSWORD_REQUIRED code
        return NextResponse.json(
          { error: 'Password required', code: 'PASSWORD_REQUIRED' },
          { status: 403 }
        );
      }
    }

    // Exclude password hash from response
    const { password: _, ...safeList } = list;

    return NextResponse.json(safeList);
  } catch (error) {
    if (error instanceof NotFoundError) {
      return NextResponse.json(
        { error: getUserFriendlyError('NOT_FOUND'), code: 'NOT_FOUND' },
        { status: 404 }
      );
    }

    if (error instanceof ForbiddenError) {
      return NextResponse.json(
        { error: getUserFriendlyError('FORBIDDEN'), code: 'FORBIDDEN' },
        { status: 403 }
      );
    }

    logger.error({ error: error }, 'Error fetching list by vanity URL');
    return NextResponse.json(
      { error: getUserFriendlyError('INTERNAL_ERROR'), code: 'INTERNAL_ERROR' },
      { status: 500 }
    );
  }
}

/**
 * POST /api/public-profile/[username]/[slug]
 * Access password-protected list via vanity URL
 */
export async function POST(request: NextRequest, context: RouteContext) {
  try {
    const { username, slug } = await context.params;

    // Check for reserved routes
    if (RESERVED_ROUTES.includes(username.toLowerCase())) {
      return NextResponse.json(
        { error: getUserFriendlyError('NOT_FOUND'), code: 'NOT_FOUND' },
        { status: 404 }
      );
    }

    const body: unknown = await request.json();

    // Type guard: ensure body is an object with password property
    if (!body || typeof body !== 'object' || !('password' in body)) {
      return NextResponse.json(
        { error: getUserFriendlyError('FORBIDDEN'), code: 'FORBIDDEN' },
        { status: 403 }
      );
    }

    const { password } = body as { password: unknown };

    // Validate password is a string
    if (typeof password !== 'string') {
      return NextResponse.json(
        { error: getUserFriendlyError('FORBIDDEN'), code: 'FORBIDDEN' },
        { status: 403 }
      );
    }

    // Fetch list using service
    const list = await listService.getByVanityUrl(username, slug);

    // Handle list not found or not accessible
    if (!list) {
      return NextResponse.json(
        { error: getUserFriendlyError('NOT_FOUND'), code: 'NOT_FOUND' },
        { status: 404 }
      );
    }

    // If list is password-protected, verify password
    if (list.visibility === 'password') {
      if (!password) {
        return NextResponse.json(
          { error: getUserFriendlyError('FORBIDDEN'), code: 'FORBIDDEN' },
          { status: 403 }
        );
      }

      // Verify password using service method
      const isValid = await listService.verifyPassword(password, list.password || '');

      if (!isValid) {
        return NextResponse.json(
          { error: getUserFriendlyError('FORBIDDEN'), code: 'FORBIDDEN' },
          { status: 403 }
        );
      }

      // Mark list as having access
      list.hasAccess = true;

      // Exclude password hash from response
      const { password: _, ...safeList } = list;

      // Create response with access cookie
      const existingCookie = request.cookies.get(listAccessTokenService.getCookieName())?.value;
      const newCookieValue = listAccessTokenService.addListAccess(
        existingCookie,
        list.id,
        list.password ?? null
      );
      const cookieConfig = listAccessTokenService.getCookieConfig(newCookieValue);

      const response = NextResponse.json(safeList);
      response.cookies.set(cookieConfig);
      return response;
    }

    // For non-password lists, just return the list
    const { password: _, ...safeList } = list;
    return NextResponse.json(safeList);
  } catch (error) {
    if (error instanceof NotFoundError) {
      return NextResponse.json(
        { error: getUserFriendlyError('NOT_FOUND'), code: 'NOT_FOUND' },
        { status: 404 }
      );
    }

    if (error instanceof ForbiddenError) {
      return NextResponse.json(
        { error: getUserFriendlyError('FORBIDDEN'), code: 'FORBIDDEN' },
        { status: 403 }
      );
    }

    logger.error({ error: error }, 'Error accessing password-protected list');
    return NextResponse.json(
      { error: getUserFriendlyError('INTERNAL_ERROR'), code: 'INTERNAL_ERROR' },
      { status: 500 }
    );
  }
}
