'use client';

import { format, formatDistanceToNow } from 'date-fns';
import { ChevronLeft, ChevronRight, Eye, FileText } from 'lucide-react';

import * as React from 'react';
import { useState, useCallback, useMemo } from 'react';

import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Skeleton } from '@/components/ui/skeleton';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { cn } from '@/lib/utils';
import type { AuditLog } from '@/lib/schemas/audit-log';

export interface AuditLogTableProps {
  logs: AuditLog[];
  isLoading?: boolean;
  pagination: {
    page: number;
    pageSize: number;
    total: number;
    totalPages: number;
  };
  onPageChange: (page: number) => void;
  onPageSizeChange?: (pageSize: number) => void;
}

const PAGE_SIZE_OPTIONS = [25, 50, 100] as const;

/**
 * Get category badge styling based on category type - compact version
 */
function getCategoryStyle(category: string): string {
  switch (category) {
    case 'auth':
      return 'bg-blue-500/10 text-blue-600 dark:text-blue-400 border-blue-500/20';
    case 'user':
      return 'bg-green-500/10 text-green-600 dark:text-green-400 border-green-500/20';
    case 'content':
      return 'bg-purple-500/10 text-purple-600 dark:text-purple-400 border-purple-500/20';
    case 'admin':
      return 'bg-orange-500/10 text-orange-600 dark:text-orange-400 border-orange-500/20';
    default:
      return 'bg-gray-500/10 text-gray-600 dark:text-gray-400 border-gray-500/20';
  }
}

/**
 * Format action string for display (convert snake_case to readable)
 */
function formatAction(action: string): string {
  return action.replace(/_/g, ' ').replace(/\b\w/g, (char) => char.toUpperCase());
}

/**
 * Format actor display name - compact version
 */
function formatActor(log: AuditLog): { name: string; id?: string } {
  if (log.actorType === 'system') {
    return { name: 'System' };
  }
  if (log.actorType === 'anonymous') {
    return { name: 'Anonymous' };
  }
  return {
    name: log.actorName || 'Unknown',
    id: log.actorId?.slice(0, 8),
  };
}

/**
 * Format resource display - compact version
 */
function formatResourceCompact(log: AuditLog): string {
  if (!log.resourceType) {
    return '-';
  }
  if (log.resourceName) {
    return `${log.resourceType}:${log.resourceName.slice(0, 20)}${log.resourceName.length > 20 ? '...' : ''}`;
  }
  if (log.resourceId) {
    return `${log.resourceType}:${log.resourceId.slice(0, 8)}`;
  }
  return log.resourceType;
}

/**
 * Parse details JSON safely
 */
function parseDetails(details: string | null): Record<string, unknown> | null {
  if (!details) {
    return null;
  }
  try {
    return JSON.parse(details);
  } catch {
    return null;
  }
}

/**
 * Compact skeleton loader for table rows
 */
function TableSkeleton({ rowCount = 10 }: { rowCount?: number }) {
  return (
    <>
      {Array.from({ length: rowCount }).map((_, index) => (
        <tr key={index} className="border-b border-border/50">
          <td className="px-2 py-1.5">
            <Skeleton className="h-3.5 w-20" />
          </td>
          <td className="px-2 py-1.5">
            <Skeleton className="h-3.5 w-24" />
          </td>
          <td className="px-2 py-1.5">
            <Skeleton className="h-4 w-12 rounded" />
          </td>
          <td className="px-2 py-1.5">
            <Skeleton className="h-3.5 w-28" />
          </td>
          <td className="hidden px-2 py-1.5 lg:table-cell">
            <Skeleton className="h-3.5 w-32" />
          </td>
          <td className="px-2 py-1.5">
            <Skeleton className="h-5 w-5" />
          </td>
        </tr>
      ))}
    </>
  );
}

/**
 * Details dialog for viewing full audit log details
 */
function DetailsDialog({
  log,
  open,
  onOpenChange,
}: {
  log: AuditLog | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const details = useMemo(() => (log ? parseDetails(log.details) : null), [log]);

  if (!log) {
    return null;
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[80vh] max-w-2xl overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-base">Audit Log Details</DialogTitle>
          <DialogDescription className="text-xs">
            {formatAction(log.action)} - {format(new Date(log.timestamp), 'PPpp')}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-3 text-sm">
          {/* Basic Info Grid */}
          <div className="grid grid-cols-2 gap-x-4 gap-y-2">
            <div>
              <span className="text-xs text-muted-foreground">ID</span>
              <p className="font-mono text-xs">{log.id}</p>
            </div>
            <div>
              <span className="text-xs text-muted-foreground">Timestamp</span>
              <p className="text-xs">{format(new Date(log.timestamp), 'PPpp')}</p>
            </div>
            <div>
              <span className="text-xs text-muted-foreground">Actor</span>
              <p className="text-xs">
                {formatActor(log).name}
                {log.actorId && (
                  <span className="ml-1 font-mono text-muted-foreground">
                    ({log.actorId.slice(0, 8)})
                  </span>
                )}
              </p>
            </div>
            <div>
              <span className="text-xs text-muted-foreground">Category</span>
              <p>
                <Badge
                  variant="outline"
                  className={cn(
                    'mt-0.5 h-5 px-1.5 text-[10px] font-medium',
                    getCategoryStyle(log.category)
                  )}
                >
                  {log.category}
                </Badge>
              </p>
            </div>
            <div>
              <span className="text-xs text-muted-foreground">Action</span>
              <p className="text-xs">{formatAction(log.action)}</p>
            </div>
            <div>
              <span className="text-xs text-muted-foreground">Resource</span>
              <p className="text-xs">{formatResourceCompact(log)}</p>
            </div>
          </div>

          {/* IP and User Agent */}
          {(log.ipAddress || log.userAgent) && (
            <div className="space-y-1 border-t pt-2">
              <h4 className="text-xs font-medium text-muted-foreground">Request Info</h4>
              {log.ipAddress && (
                <p className="text-xs">
                  <span className="text-muted-foreground">IP: </span>
                  <span className="font-mono">{log.ipAddress}</span>
                </p>
              )}
              {log.userAgent && (
                <p className="break-all text-xs text-muted-foreground">{log.userAgent}</p>
              )}
            </div>
          )}

          {/* Details JSON */}
          {details && (
            <div className="space-y-1 border-t pt-2">
              <h4 className="text-xs font-medium text-muted-foreground">Additional Details</h4>
              <pre className="max-h-48 overflow-auto rounded bg-muted p-2 text-[10px] leading-tight">
                {JSON.stringify(details, null, 2)}
              </pre>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}

/**
 * Empty state component - compact version
 */
function EmptyState() {
  return (
    <tr>
      <td colSpan={6} className="py-12 text-center">
        <div className="flex flex-col items-center gap-1">
          <FileText className="h-8 w-8 text-muted-foreground/40" aria-hidden="true" />
          <p className="text-sm font-medium text-muted-foreground">No audit logs found</p>
          <p className="text-xs text-muted-foreground/70">Try adjusting your filters</p>
        </div>
      </td>
    </tr>
  );
}

export function AuditLogTable({
  logs,
  isLoading = false,
  pagination,
  onPageChange,
  onPageSizeChange,
}: AuditLogTableProps) {
  const [selectedLog, setSelectedLog] = useState<AuditLog | null>(null);
  const [detailsOpen, setDetailsOpen] = useState(false);

  const handleViewDetails = useCallback((log: AuditLog) => {
    setSelectedLog(log);
    setDetailsOpen(true);
  }, []);

  const handlePreviousPage = useCallback(() => {
    if (pagination.page > 1) {
      onPageChange(pagination.page - 1);
    }
  }, [pagination.page, onPageChange]);

  const handleNextPage = useCallback(() => {
    if (pagination.page < pagination.totalPages) {
      onPageChange(pagination.page + 1);
    }
  }, [pagination.page, pagination.totalPages, onPageChange]);

  const handlePageSizeChange = useCallback(
    (value: string) => {
      const newSize = parseInt(value, 10);
      if (onPageSizeChange) {
        onPageSizeChange(newSize);
      }
    },
    [onPageSizeChange]
  );

  const showingFrom = (pagination.page - 1) * pagination.pageSize + 1;
  const showingTo = Math.min(pagination.page * pagination.pageSize, pagination.total);

  return (
    <TooltipProvider>
      <div className="space-y-2">
        {/* Compact table */}
        <div className="overflow-hidden rounded border border-border/60">
          <div className="overflow-x-auto">
            <table className="w-full text-xs">
              <thead>
                <tr className="border-b border-border/60 bg-muted/30">
                  <th className="whitespace-nowrap px-2 py-2 text-left font-medium text-muted-foreground">
                    Time
                  </th>
                  <th className="whitespace-nowrap px-2 py-2 text-left font-medium text-muted-foreground">
                    Actor
                  </th>
                  <th className="whitespace-nowrap px-2 py-2 text-left font-medium text-muted-foreground">
                    Cat
                  </th>
                  <th className="whitespace-nowrap px-2 py-2 text-left font-medium text-muted-foreground">
                    Action
                  </th>
                  <th className="hidden whitespace-nowrap px-2 py-2 text-left font-medium text-muted-foreground lg:table-cell">
                    Resource
                  </th>
                  <th className="w-8 px-2 py-2">
                    <span className="sr-only">Details</span>
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border/40">
                {isLoading ? (
                  <TableSkeleton rowCount={pagination.pageSize} />
                ) : logs.length === 0 ? (
                  <EmptyState />
                ) : (
                  logs.map((log) => {
                    const timestamp = new Date(log.timestamp);
                    const relativeTime = formatDistanceToNow(timestamp, { addSuffix: true });
                    const absoluteTime = format(timestamp, 'MMM d, HH:mm:ss');
                    const details = parseDetails(log.details);
                    const actor = formatActor(log);
                    const hasDetails = details || log.ipAddress || log.userAgent;

                    return (
                      <tr key={log.id} className="transition-colors hover:bg-muted/40">
                        {/* Timestamp - compact */}
                        <td className="whitespace-nowrap px-2 py-1.5">
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <span className="cursor-default text-muted-foreground">
                                {absoluteTime}
                              </span>
                            </TooltipTrigger>
                            <TooltipContent className="text-xs">{relativeTime}</TooltipContent>
                          </Tooltip>
                        </td>

                        {/* Actor - compact inline */}
                        <td className="whitespace-nowrap px-2 py-1.5">
                          <span className="font-medium">{actor.name}</span>
                          {actor.id && (
                            <span className="ml-1 font-mono text-[10px] text-muted-foreground">
                              {actor.id}
                            </span>
                          )}
                        </td>

                        {/* Category - tiny badge */}
                        <td className="px-2 py-1.5">
                          <Badge
                            variant="outline"
                            className={cn(
                              'h-4 px-1 text-[10px] font-medium leading-none',
                              getCategoryStyle(log.category)
                            )}
                          >
                            {log.category}
                          </Badge>
                        </td>

                        {/* Action */}
                        <td className="whitespace-nowrap px-2 py-1.5 font-medium">
                          {formatAction(log.action)}
                        </td>

                        {/* Resource - compact with tooltip */}
                        <td className="hidden max-w-[200px] truncate px-2 py-1.5 lg:table-cell">
                          {log.resourceType ? (
                            <Tooltip>
                              <TooltipTrigger asChild>
                                <span className="cursor-default font-mono text-[10px] text-muted-foreground">
                                  {formatResourceCompact(log)}
                                </span>
                              </TooltipTrigger>
                              <TooltipContent className="max-w-xs text-xs">
                                <div className="space-y-0.5">
                                  <p>Type: {log.resourceType}</p>
                                  {log.resourceId && (
                                    <p className="font-mono">ID: {log.resourceId}</p>
                                  )}
                                  {log.resourceName && <p>Name: {log.resourceName}</p>}
                                </div>
                              </TooltipContent>
                            </Tooltip>
                          ) : (
                            <span className="text-muted-foreground/50">-</span>
                          )}
                        </td>

                        {/* Details button - tiny */}
                        <td className="px-2 py-1.5">
                          {hasDetails && (
                            <button
                              onClick={() => handleViewDetails(log)}
                              className="inline-flex h-5 w-5 items-center justify-center rounded text-muted-foreground hover:bg-muted hover:text-foreground"
                              aria-label={`View details for ${formatAction(log.action)}`}
                            >
                              <Eye className="h-3 w-3" aria-hidden="true" />
                            </button>
                          )}
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Compact pagination */}
        <nav
          role="navigation"
          aria-label="Audit log pagination"
          className="flex items-center justify-between text-xs"
        >
          <div className="flex items-center gap-3">
            <span className="text-muted-foreground" aria-live="polite">
              {pagination.total > 0 ? (
                <>
                  {showingFrom}-{showingTo} of {pagination.total}
                </>
              ) : (
                'No entries'
              )}
            </span>

            {onPageSizeChange && (
              <Select value={pagination.pageSize.toString()} onValueChange={handlePageSizeChange}>
                <SelectTrigger className="h-6 w-16 text-xs">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {PAGE_SIZE_OPTIONS.map((size) => (
                    <SelectItem key={size} value={size.toString()} className="text-xs">
                      {size}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}
          </div>

          <div className="flex items-center gap-1">
            <span className="text-muted-foreground">
              {pagination.page}/{pagination.totalPages || 1}
            </span>
            <Button
              variant="ghost"
              size="icon"
              onClick={handlePreviousPage}
              disabled={pagination.page <= 1 || isLoading}
              aria-label="Previous page"
              className="h-6 w-6"
            >
              <ChevronLeft className="h-3.5 w-3.5" aria-hidden="true" />
            </Button>
            <Button
              variant="ghost"
              size="icon"
              onClick={handleNextPage}
              disabled={pagination.page >= pagination.totalPages || isLoading}
              aria-label="Next page"
              className="h-6 w-6"
            >
              <ChevronRight className="h-3.5 w-3.5" aria-hidden="true" />
            </Button>
          </div>
        </nav>

        {/* Details Dialog */}
        <DetailsDialog log={selectedLog} open={detailsOpen} onOpenChange={setDetailsOpen} />
      </div>
    </TooltipProvider>
  );
}
