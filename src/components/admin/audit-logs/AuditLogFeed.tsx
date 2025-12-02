'use client';

import { formatDistanceToNow, format } from 'date-fns';
import { ChevronDown, FileText, Settings, Shield, User } from 'lucide-react';
import { useState, useCallback, useMemo } from 'react';

import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { Skeleton } from '@/components/ui/skeleton';
import { cn } from '@/lib/utils';
import type { AuditLog } from '@/lib/schemas/audit-log';

export interface AuditLogFeedProps {
  logs: AuditLog[];
  isLoading?: boolean;
}

/**
 * Get category badge styling based on category type
 */
function getCategoryBadgeClass(category: string): string {
  switch (category) {
    case 'auth':
      return 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200';
    case 'user':
      return 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200';
    case 'content':
      return 'bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-200';
    case 'admin':
      return 'bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-200';
    default:
      return 'bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-200';
  }
}

/**
 * Get category icon background color
 */
function getCategoryIconBgClass(category: string): string {
  switch (category) {
    case 'auth':
      return 'bg-blue-100 dark:bg-blue-900/50';
    case 'user':
      return 'bg-green-100 dark:bg-green-900/50';
    case 'content':
      return 'bg-purple-100 dark:bg-purple-900/50';
    case 'admin':
      return 'bg-orange-100 dark:bg-orange-900/50';
    default:
      return 'bg-gray-100 dark:bg-gray-800';
  }
}

/**
 * Get category icon color
 */
function getCategoryIconColorClass(category: string): string {
  switch (category) {
    case 'auth':
      return 'text-blue-600 dark:text-blue-400';
    case 'user':
      return 'text-green-600 dark:text-green-400';
    case 'content':
      return 'text-purple-600 dark:text-purple-400';
    case 'admin':
      return 'text-orange-600 dark:text-orange-400';
    default:
      return 'text-gray-600 dark:text-gray-400';
  }
}

/**
 * Get category icon component
 */
function CategoryIcon({ category, className }: { category: string; className?: string }) {
  const iconClass = cn('h-4 w-4', className);

  switch (category) {
    case 'auth':
      return <Shield className={iconClass} aria-hidden="true" />;
    case 'user':
      return <User className={iconClass} aria-hidden="true" />;
    case 'content':
      return <FileText className={iconClass} aria-hidden="true" />;
    case 'admin':
      return <Settings className={iconClass} aria-hidden="true" />;
    default:
      return <FileText className={iconClass} aria-hidden="true" />;
  }
}

/**
 * Format action string for display (convert snake_case to readable)
 */
function formatAction(action: string): string {
  return action.replace(/_/g, ' ').replace(/\b\w/g, (char) => char.toUpperCase());
}

/**
 * Format actor display name
 */
function formatActor(log: AuditLog): string {
  if (log.actorType === 'system') {
    return 'System';
  }
  if (log.actorType === 'anonymous') {
    return 'Anonymous';
  }
  return log.actorName || 'Unknown User';
}

/**
 * Format resource display
 */
function formatResource(log: AuditLog): string | null {
  if (!log.resourceType) {
    return null;
  }
  const resourceType = log.resourceType.charAt(0).toUpperCase() + log.resourceType.slice(1);
  if (log.resourceName) {
    return `${resourceType}: ${log.resourceName}`;
  }
  if (log.resourceId) {
    return `${resourceType} (${log.resourceId.slice(0, 8)}...)`;
  }
  return resourceType;
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
 * Skeleton loader for feed items
 */
function FeedSkeleton({ itemCount = 10 }: { itemCount?: number }) {
  return (
    <div className="space-y-4">
      {Array.from({ length: itemCount }).map((_, index) => (
        <div key={index} className="flex gap-4">
          {/* Icon skeleton */}
          <div className="flex flex-col items-center">
            <Skeleton className="h-10 w-10 rounded-full" />
            {index < itemCount - 1 && <Skeleton className="mt-2 h-16 w-0.5" />}
          </div>
          {/* Content skeleton */}
          <div className="flex-1 space-y-2 pb-4">
            <Skeleton className="h-5 w-48" />
            <Skeleton className="h-4 w-32" />
            <Skeleton className="h-4 w-24" />
          </div>
        </div>
      ))}
    </div>
  );
}

/**
 * Empty state component
 */
function EmptyState() {
  return (
    <div className="flex flex-col items-center justify-center gap-2 py-12">
      <FileText className="h-12 w-12 text-muted-foreground/50" aria-hidden="true" />
      <h3 className="text-lg font-medium">No audit logs found</h3>
      <p className="text-sm text-muted-foreground">
        Try adjusting your filters or check back later.
      </p>
    </div>
  );
}

/**
 * Individual feed item component
 */
function FeedItem({ log, isLast }: { log: AuditLog; isLast: boolean }) {
  const [isOpen, setIsOpen] = useState(false);

  const timestamp = useMemo(() => new Date(log.timestamp), [log.timestamp]);
  const relativeTime = useMemo(
    () => formatDistanceToNow(timestamp, { addSuffix: true }),
    [timestamp]
  );
  const absoluteTime = useMemo(() => format(timestamp, 'PPpp'), [timestamp]);
  const details = useMemo(() => parseDetails(log.details), [log.details]);
  const resourceInfo = useMemo(() => formatResource(log), [log]);
  const hasDetails = details || log.ipAddress || log.userAgent;

  const toggleOpen = useCallback(() => {
    setIsOpen((prev) => !prev);
  }, []);

  return (
    <div className="flex gap-4">
      {/* Timeline icon and connector */}
      <div className="flex flex-col items-center">
        <div
          className={cn(
            'flex h-10 w-10 items-center justify-center rounded-full',
            getCategoryIconBgClass(log.category)
          )}
          aria-hidden="true"
        >
          <CategoryIcon
            category={log.category}
            className={getCategoryIconColorClass(log.category)}
          />
        </div>
        {/* Connector line */}
        {!isLast && <div className="mt-2 w-0.5 flex-1 bg-border" aria-hidden="true" />}
      </div>

      {/* Content */}
      <div className={cn('flex-1 pb-6', isLast && 'pb-0')}>
        <Collapsible open={isOpen} onOpenChange={setIsOpen}>
          {/* Main content - always visible */}
          <div
            className={cn('rounded-lg border bg-card p-4 transition-colors', 'hover:bg-accent/50')}
          >
            {/* Header row: actor + action + badge */}
            <div className="flex flex-wrap items-start justify-between gap-2">
              <div className="flex-1">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="font-medium">{formatActor(log)}</span>
                  <span className="text-muted-foreground">
                    {formatAction(log.action).toLowerCase()}
                  </span>
                </div>

                {/* Resource info */}
                {resourceInfo && (
                  <p className="mt-1 text-sm text-muted-foreground">{resourceInfo}</p>
                )}

                {/* Timestamp */}
                <p className="mt-2 text-xs text-muted-foreground" title={absoluteTime}>
                  {relativeTime}
                </p>
              </div>

              {/* Category badge */}
              <Badge
                variant="outline"
                className={cn('capitalize', getCategoryBadgeClass(log.category))}
              >
                {log.category}
              </Badge>
            </div>

            {/* Expand/collapse button */}
            {hasDetails && (
              <CollapsibleTrigger asChild>
                <Button
                  variant="ghost"
                  size="sm"
                  className="mt-3 h-8 w-full justify-start gap-2 text-muted-foreground hover:text-foreground"
                  onClick={toggleOpen}
                  aria-expanded={isOpen}
                >
                  <ChevronDown
                    className={cn(
                      'h-4 w-4 transition-transform duration-200',
                      isOpen && 'rotate-180'
                    )}
                    aria-hidden="true"
                  />
                  {isOpen ? 'Hide details' : 'Show details'}
                </Button>
              </CollapsibleTrigger>
            )}
          </div>

          {/* Expandable details */}
          <CollapsibleContent
            className={cn(
              'overflow-hidden',
              'data-[state=closed]:animate-collapsible-up',
              'data-[state=open]:animate-collapsible-down'
            )}
          >
            <div className="mt-2 space-y-3 rounded-lg border bg-muted/30 p-4">
              {/* Full timestamp */}
              <div className="text-sm">
                <span className="font-medium text-muted-foreground">Timestamp: </span>
                <span>{absoluteTime}</span>
              </div>

              {/* Log ID */}
              <div className="text-sm">
                <span className="font-medium text-muted-foreground">Log ID: </span>
                <span className="font-mono text-xs">{log.id}</span>
              </div>

              {/* Actor ID */}
              {log.actorId && (
                <div className="text-sm">
                  <span className="font-medium text-muted-foreground">Actor ID: </span>
                  <span className="font-mono text-xs">{log.actorId}</span>
                </div>
              )}

              {/* Resource details */}
              {log.resourceType && (
                <div className="text-sm">
                  <span className="font-medium text-muted-foreground">Resource: </span>
                  <span>
                    {log.resourceType}
                    {log.resourceId && (
                      <span className="ml-2 font-mono text-xs text-muted-foreground">
                        ({log.resourceId})
                      </span>
                    )}
                  </span>
                </div>
              )}

              {/* IP Address */}
              {log.ipAddress && (
                <div className="text-sm">
                  <span className="font-medium text-muted-foreground">IP Address: </span>
                  <span className="font-mono">{log.ipAddress}</span>
                </div>
              )}

              {/* User Agent */}
              {log.userAgent && (
                <div className="text-sm">
                  <span className="font-medium text-muted-foreground">User Agent: </span>
                  <span className="break-all text-xs text-muted-foreground">{log.userAgent}</span>
                </div>
              )}

              {/* Additional details JSON */}
              {details && Object.keys(details).length > 0 && (
                <div className="space-y-1">
                  <span className="text-sm font-medium text-muted-foreground">
                    Additional Details:
                  </span>
                  <pre className="max-h-48 overflow-auto rounded-md bg-muted p-3 text-xs">
                    {JSON.stringify(details, null, 2)}
                  </pre>
                </div>
              )}
            </div>
          </CollapsibleContent>
        </Collapsible>
      </div>
    </div>
  );
}

/**
 * AuditLogFeed - Timeline/feed view for audit logs
 *
 * Displays audit logs as a vertical timeline with expandable details.
 * Alternative view to the table-based AuditLogTable component.
 */
export function AuditLogFeed({ logs, isLoading = false }: AuditLogFeedProps) {
  if (isLoading) {
    return <FeedSkeleton itemCount={10} />;
  }

  if (logs.length === 0) {
    return <EmptyState />;
  }

  return (
    <div className="space-y-0" role="feed" aria-label="Audit log activity feed">
      {logs.map((log, index) => (
        <FeedItem key={log.id} log={log} isLast={index === logs.length - 1} />
      ))}
    </div>
  );
}
