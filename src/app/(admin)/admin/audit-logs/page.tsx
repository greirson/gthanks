'use client';

import { RefreshCw, Settings } from 'lucide-react';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';

import {
  AuditLogFilters,
  AuditLogTable,
  AuditLogSettings,
  AuditLogExport,
  useAuditLogPolling,
  type AuditLogFiltersState,
} from '@/components/admin/audit-logs';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { cn } from '@/lib/utils';

const DEFAULT_PAGE_SIZE = 50;

/**
 * Get default start date (1 hour ago)
 */
function getDefaultStartDate(): string {
  const oneHourAgo = new Date();
  oneHourAgo.setHours(oneHourAgo.getHours() - 1);
  return oneHourAgo.toISOString();
}

/**
 * Parse URL search params into filter state
 */
function parseFiltersFromParams(searchParams: URLSearchParams): AuditLogFiltersState {
  // Check if any date params are in URL - if not, use default (last hour)
  const hasDateParams = searchParams.has('startDate') || searchParams.has('endDate');

  return {
    category: searchParams.get('category') || undefined,
    startDate: searchParams.get('startDate') || (hasDateParams ? undefined : getDefaultStartDate()),
    endDate: searchParams.get('endDate') || undefined,
    search: searchParams.get('search') || undefined,
    actorId: searchParams.get('actorId') || undefined,
  };
}

/**
 * Build URL search params from filter state
 */
function buildSearchParams(
  filters: AuditLogFiltersState,
  page: number,
  pageSize: number
): URLSearchParams {
  const params = new URLSearchParams();

  if (filters.category) {
    params.set('category', filters.category);
  }
  if (filters.startDate) {
    params.set('startDate', filters.startDate);
  }
  if (filters.endDate) {
    params.set('endDate', filters.endDate);
  }
  if (filters.search) {
    params.set('search', filters.search);
  }
  if (filters.actorId) {
    params.set('actorId', filters.actorId);
  }
  if (page > 1) {
    params.set('page', String(page));
  }
  if (pageSize !== DEFAULT_PAGE_SIZE) {
    params.set('pageSize', String(pageSize));
  }

  return params;
}

export default function AuditLogsPage() {
  const router = useRouter();
  const searchParams = useSearchParams();

  // Parse initial state from URL
  const initialFilters = useMemo(() => parseFiltersFromParams(searchParams), [searchParams]);
  const initialPage = parseInt(searchParams.get('page') || '1', 10);
  const initialPageSize = parseInt(searchParams.get('pageSize') || String(DEFAULT_PAGE_SIZE), 10);

  // State
  const [filters, setFilters] = useState<AuditLogFiltersState>(initialFilters);
  const [page, setPage] = useState(initialPage);
  const [pageSize, setPageSize] = useState(initialPageSize);
  const [autoRefresh, setAutoRefresh] = useState(true);
  const [settingsOpen, setSettingsOpen] = useState(false);

  // Sync state when searchParams change (browser back/forward navigation)
  useEffect(() => {
    const parsedFilters = parseFiltersFromParams(searchParams);
    const parsedPage = parseInt(searchParams.get('page') || '1', 10) || 1;
    const parsedPageSize =
      parseInt(searchParams.get('pageSize') || String(DEFAULT_PAGE_SIZE), 10) || DEFAULT_PAGE_SIZE;

    // Only update if values actually changed to avoid unnecessary re-renders
    setFilters((prev) => {
      if (JSON.stringify(prev) !== JSON.stringify(parsedFilters)) {
        return parsedFilters;
      }
      return prev;
    });

    setPage((prev) => (prev !== parsedPage ? parsedPage : prev));
    setPageSize((prev) => (prev !== parsedPageSize ? parsedPageSize : prev));
  }, [searchParams]);

  // Fetch audit logs with polling
  const {
    data,
    isLoading,
    error,
    newEntriesCount,
    clearNewEntriesNotification,
    isPolling,
    refetch,
    isRefetching,
  } = useAuditLogPolling({
    enabled: true,
    interval: autoRefresh ? 30000 : 0, // 30s polling or disabled
    filters,
    page,
    pageSize,
  });

  // Update URL when filters/pagination change
  const updateUrl = useCallback(
    (newFilters: AuditLogFiltersState, newPage: number, newPageSize: number) => {
      const params = buildSearchParams(newFilters, newPage, newPageSize);
      const queryString = params.toString();
      const url = queryString ? `?${queryString}` : '/admin/audit-logs';
      router.push(url, { scroll: false });
    },
    [router]
  );

  // Handle filter changes
  const handleFiltersChange = useCallback(
    (newFilters: AuditLogFiltersState) => {
      setFilters(newFilters);
      setPage(1); // Reset to first page on filter change
      updateUrl(newFilters, 1, pageSize);
    },
    [pageSize, updateUrl]
  );

  // Handle page change
  const handlePageChange = useCallback(
    (newPage: number) => {
      setPage(newPage);
      updateUrl(filters, newPage, pageSize);
    },
    [filters, pageSize, updateUrl]
  );

  // Handle page size change
  const handlePageSizeChange = useCallback(
    (newPageSize: number) => {
      setPageSize(newPageSize);
      setPage(1); // Reset to first page on page size change
      updateUrl(filters, 1, newPageSize);
    },
    [filters, updateUrl]
  );

  // Handle new entries banner click
  const handleLoadNewEntries = useCallback(() => {
    clearNewEntriesNotification();
    refetch();
    // Scroll to top of table
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }, [clearNewEntriesNotification, refetch]);

  // Pagination data from response
  const pagination = data?.pagination ?? {
    page: 1,
    pageSize: DEFAULT_PAGE_SIZE,
    total: 0,
    totalPages: 0,
  };

  return (
    <TooltipProvider>
      <div className="container mx-auto p-6">
        <Card>
          <CardHeader>
            <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <CardTitle className="text-2xl">Audit Logs</CardTitle>
                <CardDescription>
                  View system activity, security events, and user actions.
                </CardDescription>
              </div>

              {/* Action buttons */}
              <div className="flex items-center gap-2">
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button variant="outline" size="icon" onClick={() => setSettingsOpen(true)}>
                      <Settings className="h-4 w-4" aria-hidden="true" />
                      <span className="sr-only">Settings</span>
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent>Audit log settings</TooltipContent>
                </Tooltip>

                <AuditLogExport filters={filters} />

                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button
                      variant="outline"
                      size="icon"
                      onClick={() => refetch()}
                      disabled={isLoading || isRefetching}
                    >
                      <RefreshCw
                        className={cn('h-4 w-4', isRefetching && 'animate-spin')}
                        aria-hidden="true"
                      />
                      <span className="sr-only">Refresh</span>
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent>Refresh now</TooltipContent>
                </Tooltip>
              </div>
            </div>
          </CardHeader>

          <CardContent className="space-y-4">
            {/* Filters */}
            <AuditLogFilters filters={filters} onFiltersChange={handleFiltersChange} />

            {/* Controls row: Auto-refresh toggle */}
            <div className="flex flex-col gap-4 border-b pb-4 sm:flex-row sm:items-center sm:justify-between">
              <div className="flex items-center gap-4">
                {/* Auto-refresh toggle */}
                <div className="flex items-center gap-2">
                  <Switch
                    id="auto-refresh"
                    checked={autoRefresh}
                    onCheckedChange={setAutoRefresh}
                    aria-describedby="auto-refresh-description"
                  />
                  <Label
                    htmlFor="auto-refresh"
                    className="flex items-center gap-2 text-sm font-medium"
                  >
                    Auto-refresh
                    {autoRefresh && <span className="text-xs text-muted-foreground">(30s)</span>}
                  </Label>
                  <span id="auto-refresh-description" className="sr-only">
                    Automatically refresh the audit logs every 30 seconds
                  </span>
                </div>

                {/* Polling indicator */}
                {isPolling && (
                  <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                    <span
                      className="inline-block h-2 w-2 animate-pulse rounded-full bg-green-500"
                      aria-hidden="true"
                    />
                    Checking for updates...
                  </div>
                )}
              </div>
            </div>

            {/* New entries banner */}
            {newEntriesCount > 0 && (
              <Alert
                className="cursor-pointer border-blue-200 bg-blue-50 hover:bg-blue-100 dark:border-blue-800 dark:bg-blue-950 dark:hover:bg-blue-900"
                onClick={handleLoadNewEntries}
                role="button"
                tabIndex={0}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' || e.key === ' ') {
                    handleLoadNewEntries();
                  }
                }}
                aria-label={`${newEntriesCount} new entries available. Click to load.`}
              >
                <AlertDescription className="flex items-center gap-2">
                  <Badge variant="secondary" className="bg-blue-100 dark:bg-blue-800">
                    {newEntriesCount}
                  </Badge>
                  <span>new {newEntriesCount === 1 ? 'entry' : 'entries'} - Click to load</span>
                </AlertDescription>
              </Alert>
            )}

            {/* Error state */}
            {error && (
              <Alert variant="destructive">
                <AlertDescription>
                  Failed to load audit logs. Please try again.
                  <Button
                    variant="link"
                    className="ml-2 h-auto p-0 text-inherit underline"
                    onClick={() => refetch()}
                  >
                    Retry
                  </Button>
                </AlertDescription>
              </Alert>
            )}

            {/* Audit log table */}
            <AuditLogTable
              logs={data?.data ?? []}
              isLoading={isLoading}
              pagination={pagination}
              onPageChange={handlePageChange}
              onPageSizeChange={handlePageSizeChange}
            />
          </CardContent>
        </Card>
      </div>

      {/* Settings sheet */}
      <AuditLogSettings open={settingsOpen} onOpenChange={setSettingsOpen} />
    </TooltipProvider>
  );
}
