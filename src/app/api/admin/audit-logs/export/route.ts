import { NextRequest, NextResponse } from 'next/server';

import { getCurrentAdmin } from '@/lib/auth-admin';
import { handleApiError, getUserFriendlyError } from '@/lib/errors';
import { rateLimiter, getRateLimitHeaders } from '@/lib/rate-limiter';
import { AuditLogExportParamsSchema } from '@/lib/schemas/audit-log';
import { auditService } from '@/lib/services/audit-service';

/**
 * CSV field names for audit log export
 */
const CSV_HEADERS = [
  'Timestamp',
  'Actor',
  'Actor Type',
  'Category',
  'Action',
  'Resource Type',
  'Resource ID',
  'Resource Name',
  'IP Address',
];

/**
 * Escape a value for CSV format
 * - Wraps in quotes if contains comma, newline, or quote
 * - Doubles any internal quotes
 */
function escapeCsvValue(value: string | null | undefined): string {
  if (value === null || value === undefined) {
    return '';
  }

  const stringValue = String(value);

  // Check if value needs quoting
  if (
    stringValue.includes(',') ||
    stringValue.includes('\n') ||
    stringValue.includes('\r') ||
    stringValue.includes('"')
  ) {
    // Escape quotes by doubling them and wrap in quotes
    return `"${stringValue.replace(/"/g, '""')}"`;
  }

  return stringValue;
}

/**
 * Convert audit logs to CSV format
 */
function convertToCSV(
  logs: Array<{
    timestamp: string;
    actorName: string | null;
    actorType: string;
    category: string;
    action: string;
    resourceType: string | null;
    resourceId: string | null;
    resourceName: string | null;
    ipAddress: string | null;
  }>
): string {
  const headerRow = CSV_HEADERS.join(',');

  const dataRows = logs.map((log) =>
    [
      escapeCsvValue(log.timestamp),
      escapeCsvValue(log.actorName),
      escapeCsvValue(log.actorType),
      escapeCsvValue(log.category),
      escapeCsvValue(log.action),
      escapeCsvValue(log.resourceType),
      escapeCsvValue(log.resourceId),
      escapeCsvValue(log.resourceName),
      escapeCsvValue(log.ipAddress),
    ].join(',')
  );

  return [headerRow, ...dataRows].join('\n');
}

/**
 * Generate filename with timestamp
 */
function generateFilename(format: 'csv' | 'json'): string {
  const timestamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19);
  return `audit-logs-${timestamp}.${format}`;
}

/**
 * GET /api/admin/audit-logs/export
 *
 * Export audit logs as CSV or JSON for compliance and reporting.
 *
 * Query Parameters:
 * - format: 'csv' | 'json' (default: 'csv')
 * - limit: number (max 1000, default 1000)
 * - category: 'auth' | 'user' | 'content' | 'admin' (optional filter)
 * - actorId: string (optional filter by user ID)
 * - startDate: ISO datetime (optional - filter entries from this date)
 * - endDate: ISO datetime (optional - filter entries until this date)
 * - search: string (searches action, resourceName, actorName)
 *
 * Returns:
 * - 200: CSV or JSON file download
 * - 401: Unauthorized - not authenticated
 * - 403: Forbidden - not an admin
 * - 429: Too many requests - rate limit exceeded (10/hour)
 * - 400: Bad Request - invalid query parameters
 * - 500: Internal Server Error
 *
 * @requires Admin authentication and authorization
 * @security Admin-only endpoint with strict rate limiting (10 req/hour)
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

    // Apply strict rate limiting (10 exports per hour - exports are expensive)
    const rateLimitResult = await rateLimiter.check('admin-audit-logs-export', admin.id);
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
      'format',
      'limit',
      'page',
      'pageSize',
      'category',
      'actorId',
      'startDate',
      'endDate',
      'search',
    ];

    for (const name of paramNames) {
      const value = url.searchParams.get(name);
      if (value !== null) {
        rawParams[name] = value;
      }
    }

    // Validate and parse query parameters with Zod
    const parseResult = AuditLogExportParamsSchema.safeParse(rawParams);

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

    const { format, limit, ...queryParams } = parseResult.data;

    // Export audit logs using the service (hard limit of 1000 rows)
    const logs = await auditService.export({
      ...queryParams,
      limit: Math.min(limit, 1000),
    });

    // Generate filename with timestamp
    const filename = generateFilename(format);

    // Create response headers
    const headers: Record<string, string> = {
      ...getRateLimitHeaders(rateLimitResult),
      'Content-Disposition': `attachment; filename="${filename}"`,
      'Cache-Control': 'no-store',
    };

    // Return appropriate format
    if (format === 'json') {
      headers['Content-Type'] = 'application/json';

      return new NextResponse(JSON.stringify(logs, null, 2), {
        status: 200,
        headers,
      });
    }

    // Default: CSV format
    headers['Content-Type'] = 'text/csv; charset=utf-8';

    const csvContent = convertToCSV(logs);

    return new NextResponse(csvContent, {
      status: 200,
      headers,
    });
  } catch (error) {
    return handleApiError(error);
  }
}
