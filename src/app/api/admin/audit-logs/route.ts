import { NextRequest, NextResponse } from 'next/server';

import { getCurrentAdmin } from '@/lib/auth-admin';
import { handleApiError, getUserFriendlyError } from '@/lib/errors';
import { rateLimiter, getRateLimitHeaders } from '@/lib/rate-limiter';
import { AuditLogQueryParamsSchema } from '@/lib/schemas/audit-log';
import { auditService } from '@/lib/services/audit-service';

/**
 * GET /api/admin/audit-logs
 *
 * Query audit logs with pagination and filtering for admin dashboard.
 *
 * Query Parameters:
 * - page: number (default: 1)
 * - pageSize: number (default: 50, max: 100)
 * - category: 'auth' | 'user' | 'content' | 'admin' (optional filter)
 * - actorId: string (optional filter by user ID)
 * - startDate: ISO datetime (optional - filter entries from this date)
 * - endDate: ISO datetime (optional - filter entries until this date)
 * - search: string (searches action, resourceName, actorName)
 * - since: ISO datetime (for polling - entries after this timestamp)
 *
 * Returns:
 * - 200: { data: AuditLog[], pagination: { page, pageSize, total, totalPages } }
 * - 401: Unauthorized - not authenticated
 * - 403: Forbidden - not an admin
 * - 429: Too many requests - rate limit exceeded
 * - 400: Bad Request - invalid query parameters
 * - 500: Internal Server Error
 *
 * @requires Admin authentication and authorization
 * @security Admin-only endpoint with rate limiting (60 req/min)
 */
export async function GET(request: NextRequest) {
  try {
    // Verify admin access
    const admin = await getCurrentAdmin();
    if (!admin) {
      return NextResponse.json(
        { error: getUserFriendlyError('UNAUTHORIZED'), code: 'UNAUTHORIZED' },
        { status: 401 }
      );
    }

    // Apply rate limiting (60 requests per minute per admin user)
    const rateLimitResult = await rateLimiter.check('admin-audit-logs', admin.id);
    if (!rateLimitResult.allowed) {
      return NextResponse.json(
        {
          error: getUserFriendlyError('RATE_LIMIT_EXCEEDED'),
          code: 'RATE_LIMIT_EXCEEDED',
          retryAfter: rateLimitResult.retryAfter,
        },
        {
          status: 429,
          headers: getRateLimitHeaders(rateLimitResult),
        }
      );
    }

    // Parse query parameters
    const url = new URL(request.url);
    const rawParams: Record<string, string | undefined> = {};

    // Extract all expected query parameters
    const paramNames = [
      'page',
      'pageSize',
      'category',
      'actorId',
      'startDate',
      'endDate',
      'search',
      'since',
    ];

    for (const name of paramNames) {
      const value = url.searchParams.get(name);
      if (value !== null) {
        rawParams[name] = value;
      }
    }

    // Validate and parse query parameters with Zod
    const parseResult = AuditLogQueryParamsSchema.safeParse(rawParams);

    if (!parseResult.success) {
      return NextResponse.json(
        {
          error: 'Invalid query parameters',
          code: 'VALIDATION_ERROR',
          details: parseResult.error.issues,
        },
        { status: 400 }
      );
    }

    const queryParams = parseResult.data;

    // Query audit logs using the service
    const result = await auditService.query(queryParams);

    // Return response with rate limit headers
    return NextResponse.json(result, {
      headers: getRateLimitHeaders(rateLimitResult),
    });
  } catch (error) {
    return handleApiError(error);
  }
}
