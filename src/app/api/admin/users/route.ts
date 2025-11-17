import { z } from 'zod';

import { NextRequest, NextResponse } from 'next/server';

import { getCurrentAdmin } from '@/lib/auth-admin';
import { handleApiError, getUserFriendlyError } from '@/lib/errors';
import { AdminService } from '@/lib/services/admin-service';

const UserSearchSchema = z.object({
  search: z.string().optional(),
  role: z.string().optional(),
  suspended: z.boolean().optional(),
  limit: z.number().min(1).max(100).default(50),
  offset: z.number().min(0).default(0),
});

/**
 * Retrieves paginated user list with search and filtering for admin management
 *
 * @description Fetches users with comprehensive filtering, search capabilities, and pagination for admin user management interface
 * @param {NextRequest} request - The incoming HTTP request object with optional query parameters (search, role, suspended, limit, offset)
 * @returns {Promise<NextResponse>} JSON response with paginated user data and metadata
 *
 * @requires Admin authentication and authorization
 * @throws {401} Unauthorized - Admin access required
 * @throws {400} Bad Request - Invalid query parameters or validation errors
 * @throws {500} Internal Server Error - Database or service errors
 *
 * @example
 * // Search for users with filters
 * GET /api/admin/users?search=john&role=user&suspended=false&limit=25&offset=0
 * // Returns: { users: [...], total: 150, hasMore: true }
 *
 * @security Admin-only endpoint with comprehensive audit logging
 * @see {@link getCurrentAdmin} for admin authorization
 * @see {@link UserSearchSchema} for request validation
 * @see {@link AdminService.searchUsers} for business logic
 * @see {@link AdminService.createAuditLog} for audit trail
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

    // Parse query parameters
    const url = new URL(request.url);
    const searchParams = Object.fromEntries(url.searchParams);

    // Convert string params to proper types
    const filters = UserSearchSchema.parse({
      ...searchParams,
      suspended: searchParams.suspended === 'true',
      limit: searchParams.limit ? parseInt(searchParams.limit) : undefined,
      offset: searchParams.offset ? parseInt(searchParams.offset) : undefined,
    });

    // Search users
    const result = await AdminService.searchUsers(filters);

    // Create audit log - not async for MVP
    AdminService.createAuditLog(
      admin.id,
      'VIEW',
      'USER_LIST',
      null,
      undefined,
      undefined,
      { filters, resultCount: result.users.length },
      request.headers.get('x-forwarded-for') || undefined,
      request.headers.get('user-agent') || undefined
    );

    return NextResponse.json(result);
  } catch (error) {
    return handleApiError(error);
  }
}
