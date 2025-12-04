import { apiGet } from '@/lib/api-client';
import {
  AuditLogListResponseSchema,
  type AuditLogListResponse,
  type AuditLogQueryParams,
} from '@/lib/schemas/audit-log';

/**
 * Build query string from audit log query parameters
 * Filters out undefined/null values
 */
function buildQueryString(params: Partial<AuditLogQueryParams>): string {
  const searchParams = new URLSearchParams();

  if (params.page !== undefined) {
    searchParams.set('page', String(params.page));
  }
  if (params.pageSize !== undefined) {
    searchParams.set('pageSize', String(params.pageSize));
  }
  if (params.category) {
    searchParams.set('category', params.category);
  }
  if (params.actorId) {
    searchParams.set('actorId', params.actorId);
  }
  if (params.startDate) {
    searchParams.set('startDate', params.startDate);
  }
  if (params.endDate) {
    searchParams.set('endDate', params.endDate);
  }
  if (params.search) {
    searchParams.set('search', params.search);
  }
  if (params.since) {
    searchParams.set('since', params.since);
  }

  const queryString = searchParams.toString();
  return queryString ? `?${queryString}` : '';
}

/**
 * Audit Logs API client
 *
 * Provides methods for fetching and querying audit logs.
 * All responses are validated against Zod schemas.
 */
export const auditLogsApi = {
  /**
   * Fetch audit logs with optional filters and pagination
   *
   * @param params - Query parameters for filtering and pagination
   * @returns Paginated list of audit log entries
   *
   * @example
   * // Fetch first page with default settings
   * const logs = await auditLogsApi.getAuditLogs({});
   *
   * @example
   * // Fetch with filters
   * const logs = await auditLogsApi.getAuditLogs({
   *   category: 'auth',
   *   startDate: '2024-01-01T00:00:00.000Z',
   *   page: 1,
   *   pageSize: 50,
   * });
   *
   * @example
   * // Fetch new entries since last poll
   * const newLogs = await auditLogsApi.getAuditLogs({
   *   since: lastTimestamp,
   * });
   */
  getAuditLogs: async (
    params: Partial<AuditLogQueryParams> = {}
  ): Promise<AuditLogListResponse> => {
    const queryString = buildQueryString(params);
    return apiGet(`/api/admin/audit-logs${queryString}`, AuditLogListResponseSchema);
  },
};
