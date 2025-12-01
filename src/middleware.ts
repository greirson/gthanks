import { getToken } from 'next-auth/jwt';
import { NextRequest, NextResponse } from 'next/server';
import { rateLimiter, getClientIdentifier, getRateLimitHeaders } from '@/lib/rate-limiter';
import { getAppBaseUrl } from '@/lib/utils';

/**
 * Middleware for handling rate limiting, authentication, and username-based routing
 *
 * Responsibilities:
 * 1. Apply global rate limiting to all API routes (100 req/min per IP)
 * 2. Detect potential username-based vanity URL routes (e.g., /johndoe, /johndoe/birthday-list)
 * 3. Check authentication for protected routes
 * 4. Redirect unauthenticated users from protected pages
 * 5. Handle onboarding completion checks
 *
 * Rate Limiting:
 * - Global limit: 100 requests per minute per IP for all API routes
 * - Excluded: NextAuth endpoints, cron endpoints, health checks, static assets
 * - Returns 429 with Retry-After header when limit exceeded
 *
 * NOTE: Username validation happens in the route handler, not here.
 * Middleware runs in Edge Runtime which doesn't support database queries.
 * We only detect potential username routes and let the handler validate them.
 */
export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Skip middleware for static assets
  if (
    pathname.startsWith('/_next/static/') ||
    pathname.match(/\.(jpg|jpeg|png|gif|webp|svg|ico|woff|woff2|eot|ttf|otf)$/)
  ) {
    return NextResponse.next();
  }

  // Apply global rate limiting to API routes
  if (pathname.startsWith('/api/')) {
    // Exclude NextAuth endpoints (they have their own rate limiting)
    // and cron endpoints (protected by secret)
    const isExcludedEndpoint =
      pathname.startsWith('/api/auth/') ||
      pathname.startsWith('/api/cron/') ||
      pathname.startsWith('/api/health');

    if (!isExcludedEndpoint) {
      const clientId = getClientIdentifier(request);
      const result = await rateLimiter.check('global-api', clientId);

      if (!result.allowed) {
        return NextResponse.json(
          {
            error: 'Too many requests. Please wait a moment and try again',
            code: 'RATE_LIMIT_EXCEEDED',
            retryAfter: result.retryAfter,
          },
          {
            status: 429,
            headers: getRateLimitHeaders(result),
          }
        );
      }

      // Rate limit passed - headers will be added later if this is an API response
      // For now, just continue processing

      // Check for Bearer token with gth_ prefix on API routes
      // Pass through for route handler validation - Edge Runtime cannot access database
      const authHeader = request.headers.get('authorization');
      if (authHeader?.startsWith('Bearer gth_')) {
        // Valid access token format detected (not refresh tokens which use gth_ref_)
        // Let route handler perform actual token validation against database
        return NextResponse.next();
      }
    }
  }

  // Username-based routing detection
  // Check if this might be a username route (not a known static route)
  const segments = pathname.split('/').filter(Boolean);

  // Define all static/reserved routes that should NOT be treated as usernames
  const STATIC_ROUTES = [
    'api',
    'auth',
    'admin',
    '_next',
    'lists',
    'groups',
    'wishes',
    'settings',
    'profile',
    'share',
    'reservations',
    'onboarding',
    'favicon.svg',
    'favicon.ico',
  ];

  // If the first segment is not a static route, it might be a username
  // Let the dynamic route handler ([username]/page.tsx) validate the username
  if (segments.length > 0 && !STATIC_ROUTES.includes(segments[0])) {
    // Valid username route patterns we support:
    // - /[username] - Public profile page (handled by [username]/page.tsx)
    // - /[username]/[slug] - Public list page (handled by [username]/[slug]/page.tsx)

    // For MVP: Allow these patterns through and let the route handler validate
    // Phase 2: Add Redis caching to check username existence before routing
    // Example: const exists = await redis.get(`username:${segments[0]}`);

    if (segments.length === 1 || segments.length === 2) {
      // Potential username route - allow through to dynamic route handler
      // The handler will query the database and return 404 if username doesn't exist
      return NextResponse.next();
    }

    // Invalid pattern (too many segments), continue to 404
    return NextResponse.next();
  }

  // Note: CORS preflight (OPTIONS) requests are handled automatically by Next.js
  // via the headers configuration in next.config.js. No manual handling needed.

  // Check for onboarding completion on protected pages (not API routes, auth pages, or onboarding itself)
  const isProtectedPage =
    !pathname.startsWith('/api/') &&
    !pathname.startsWith('/auth/') &&
    !pathname.startsWith('/onboarding') &&
    pathname !== '/' &&
    !pathname.startsWith('/_next');

  if (isProtectedPage) {
    const token = await getToken({ req: request });

    if (token && token.id) {
      // Check if user has completed onboarding
      const isOnboardingComplete = token.isOnboardingComplete;

      // Only redirect if explicitly false (not undefined for backward compatibility)
      // Existing users from before onboarding feature have undefined, treat as complete
      if (isOnboardingComplete === false) {
        // Redirect to onboarding page if not completed
        return NextResponse.redirect(new URL('/onboarding', getAppBaseUrl()));
      }
    }
  }

  // Check authentication for protected routes
  if (pathname.startsWith('/api/admin/') || pathname.startsWith('/admin/')) {
    const token = await getToken({ req: request });

    if (!token) {
      if (pathname.startsWith('/api/')) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
      }
      return NextResponse.redirect(new URL('/auth/login', getAppBaseUrl()));
    }
  }

  // Check authentication for other protected API routes
  if (
    pathname.startsWith('/api/') &&
    !pathname.startsWith('/api/auth/') &&
    !pathname.startsWith('/api/health')
  ) {
    const token = await getToken({ req: request });

    // Allow some endpoints without auth for anonymous viewing
    const publicEndpoints = [
      '/api/lists/shared',
      '/api/lists/public',
      '/api/wishes/public',
      '/api/metadata',
      '/api/reservations', // Allow anonymous reservations
      '/api/public-profile', // Allow anonymous access to vanity URL lists
    ];

    // Check for specific patterns that should allow anonymous access
    const isReservationEndpoint =
      /^\/api\/(lists\/[^/]+\/reservations|wishes\/[^/]+\/reservation)/.test(pathname);

    const isPublicEndpoint =
      publicEndpoints.some((ep) => pathname.startsWith(ep)) || isReservationEndpoint;

    if (!token && !isPublicEndpoint) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
  }

  return NextResponse.next();
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico).*)'],
};
