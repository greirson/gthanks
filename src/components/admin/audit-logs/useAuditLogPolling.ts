'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';

import { auditLogsApi } from '@/lib/api/audit-logs';
import type { AuditLog, AuditLogListResponse } from '@/lib/schemas/audit-log';

// Default polling interval: 30 seconds
const DEFAULT_POLL_INTERVAL = 30000;

// Query key factory for audit logs
export const auditLogsQueryKeys = {
  all: ['audit-logs'] as const,
  list: (filters: AuditLogFilters) => ['audit-logs', filters] as const,
  polling: (filters: AuditLogFilters) => ['audit-logs', 'polling', filters] as const,
};

export interface AuditLogFilters {
  category?: string;
  actorId?: string;
  startDate?: string;
  endDate?: string;
  search?: string;
}

export interface UseAuditLogPollingOptions {
  /** Whether polling is enabled */
  enabled?: boolean;
  /** Polling interval in milliseconds (default: 30000ms / 30s) */
  interval?: number;
  /** Filter parameters for the query */
  filters?: AuditLogFilters;
  /** Page size for initial fetch */
  pageSize?: number;
  /** Current page number */
  page?: number;
}

export interface UseAuditLogPollingResult {
  /** The fetched audit log data */
  data: AuditLogListResponse | undefined;
  /** Whether the initial fetch is loading */
  isLoading: boolean;
  /** Error from the query */
  error: Error | null;
  /** Number of new entries since last clear */
  newEntriesCount: number;
  /** Clear the new entries notification count */
  clearNewEntriesNotification: () => void;
  /** Whether polling is currently active */
  isPolling: boolean;
  /** Manually refetch data */
  refetch: () => void;
  /** Whether a refetch is in progress */
  isRefetching: boolean;
}

/**
 * React Query hook for fetching and polling audit logs
 *
 * Features:
 * - Fetches audit logs with filters and pagination
 * - Supports auto-refresh polling with configurable interval
 * - Tracks new entries count when polling discovers new logs
 * - Prepends new entries to existing cache data
 *
 * @example
 * ```tsx
 * const {
 *   data,
 *   isLoading,
 *   newEntriesCount,
 *   clearNewEntriesNotification,
 *   isPolling,
 * } = useAuditLogPolling({
 *   enabled: true,
 *   interval: 30000,
 *   filters: { category: 'auth' },
 * });
 *
 * // Show notification badge when new entries arrive
 * {newEntriesCount > 0 && (
 *   <Badge onClick={clearNewEntriesNotification}>
 *     {newEntriesCount} new
 *   </Badge>
 * )}
 * ```
 */
export function useAuditLogPolling(
  options: UseAuditLogPollingOptions = {}
): UseAuditLogPollingResult {
  const {
    enabled = true,
    interval = DEFAULT_POLL_INTERVAL,
    filters = {},
    pageSize = 50,
    page = 1,
  } = options;

  const queryClient = useQueryClient();
  const [newEntriesCount, setNewEntriesCount] = useState(0);
  const [isPolling, setIsPolling] = useState(false);
  const lastTimestampRef = useRef<string | null>(null);
  const pollIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // Query key based on filters
  const queryKey = auditLogsQueryKeys.list(filters);

  // Main query for fetching audit logs
  const { data, isLoading, error, refetch, isRefetching } = useQuery({
    queryKey,
    queryFn: () =>
      auditLogsApi.getAuditLogs({
        page,
        pageSize,
        category: filters.category as 'auth' | 'user' | 'content' | 'admin' | undefined,
        actorId: filters.actorId,
        startDate: filters.startDate,
        endDate: filters.endDate,
        search: filters.search,
      }),
    enabled,
    staleTime: 30000, // Consider data stale after 30s
    refetchOnWindowFocus: false, // Don't refetch on tab switch when polling is active
  });

  // Update last timestamp when data changes
  useEffect(() => {
    if (data?.data && data.data.length > 0) {
      // Store the most recent entry's timestamp for polling
      lastTimestampRef.current = data.data[0].timestamp;
    }
  }, [data]);

  // Poll for new entries
  const pollForNewEntries = useCallback(async () => {
    if (!enabled || !lastTimestampRef.current) {
      return;
    }

    try {
      setIsPolling(true);

      // Fetch entries newer than our last known timestamp
      const newData = await auditLogsApi.getAuditLogs({
        since: lastTimestampRef.current,
        category: filters.category as 'auth' | 'user' | 'content' | 'admin' | undefined,
        actorId: filters.actorId,
        startDate: filters.startDate,
        endDate: filters.endDate,
        search: filters.search,
        pageSize: 100, // Fetch more to catch any new entries
      });

      if (newData.data.length > 0) {
        // Update the count of new entries
        setNewEntriesCount((prev) => prev + newData.data.length);

        // Update the last timestamp
        lastTimestampRef.current = newData.data[0].timestamp;

        // Prepend new entries to the cached data
        queryClient.setQueryData<AuditLogListResponse>(queryKey, (oldData) => {
          if (!oldData) {
            return newData;
          }

          // Deduplicate by ID and prepend new entries
          const existingIds = new Set(oldData.data.map((log) => log.id));
          const uniqueNewEntries = newData.data.filter((log: AuditLog) => !existingIds.has(log.id));

          return {
            ...oldData,
            data: [...uniqueNewEntries, ...oldData.data],
            pagination: {
              ...oldData.pagination,
              total: oldData.pagination.total + uniqueNewEntries.length,
            },
          };
        });
      }
    } catch (err) {
      // Silently fail polling - don't disrupt user experience
      console.error('[AuditLogPolling] Polling failed:', err);
    } finally {
      setIsPolling(false);
    }
  }, [enabled, filters, queryKey, queryClient]);

  // Set up polling interval
  useEffect(() => {
    if (!enabled || interval <= 0) {
      if (pollIntervalRef.current) {
        clearInterval(pollIntervalRef.current);
        pollIntervalRef.current = null;
      }
      return;
    }

    // Start polling after initial data is loaded
    if (data && !isLoading) {
      pollIntervalRef.current = setInterval(() => {
        void pollForNewEntries();
      }, interval);
    }

    return () => {
      if (pollIntervalRef.current) {
        clearInterval(pollIntervalRef.current);
        pollIntervalRef.current = null;
      }
    };
  }, [enabled, interval, data, isLoading, pollForNewEntries]);

  // Clear new entries notification
  const clearNewEntriesNotification = useCallback(() => {
    setNewEntriesCount(0);
  }, []);

  // Wrap refetch to return void (avoid Promise in interface)
  const handleRefetch = useCallback(() => {
    void refetch();
  }, [refetch]);

  // Reset new entries count when filters change
  useEffect(() => {
    setNewEntriesCount(0);
  }, [filters.category, filters.actorId, filters.startDate, filters.endDate, filters.search]);

  return {
    data,
    isLoading,
    error: error,
    newEntriesCount,
    clearNewEntriesNotification,
    isPolling,
    refetch: handleRefetch,
    isRefetching,
  };
}
