import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';

/**
 * Loading skeleton for the audit logs page
 * Displayed during initial page load
 */
export default function AuditLogsLoading() {
  return (
    <div className="container mx-auto p-6">
      <Card>
        {/* Header skeleton */}
        <CardHeader>
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div className="space-y-2">
              <Skeleton className="h-8 w-40" />
              <Skeleton className="h-4 w-72" />
            </div>
            <div className="flex items-center gap-2">
              <Skeleton className="h-10 w-10 rounded-md" />
              <Skeleton className="h-10 w-10 rounded-md" />
              <Skeleton className="h-10 w-10 rounded-md" />
            </div>
          </div>
        </CardHeader>

        <CardContent className="space-y-4">
          {/* Filters skeleton */}
          <div className="space-y-4 rounded-lg border bg-card p-4">
            {/* First row */}
            <div className="flex flex-col gap-4 sm:flex-row sm:items-end">
              <div className="flex-1 space-y-2">
                <Skeleton className="h-4 w-16" />
                <Skeleton className="h-10 w-full" />
              </div>
              <div className="w-full space-y-2 sm:w-48">
                <Skeleton className="h-4 w-20" />
                <Skeleton className="h-10 w-full" />
              </div>
            </div>

            {/* Second row */}
            <div className="flex flex-col gap-4 sm:flex-row sm:items-end">
              <div className="w-full space-y-2 sm:w-52">
                <Skeleton className="h-4 w-12" />
                <Skeleton className="h-10 w-full" />
              </div>
              <div className="w-full space-y-2 sm:w-52">
                <Skeleton className="h-4 w-8" />
                <Skeleton className="h-10 w-full" />
              </div>
              <div className="flex-1 space-y-2">
                <Skeleton className="h-4 w-20" />
                <Skeleton className="h-10 w-full" />
              </div>
            </div>
          </div>

          {/* Controls row skeleton */}
          <div className="flex items-center justify-between border-b pb-4">
            <div className="flex items-center gap-2">
              <Skeleton className="h-6 w-11 rounded-full" />
              <Skeleton className="h-4 w-28" />
            </div>
          </div>

          {/* Table skeleton */}
          <div className="rounded-lg border">
            {/* Table header */}
            <div className="border-b bg-muted/50 px-4 py-3">
              <div className="grid grid-cols-4 gap-4 lg:grid-cols-5 xl:grid-cols-6">
                <Skeleton className="h-4 w-20" />
                <Skeleton className="h-4 w-16" />
                <Skeleton className="h-4 w-20" />
                <Skeleton className="h-4 w-16" />
                <Skeleton className="hidden h-4 w-24 lg:block" />
                <Skeleton className="hidden h-4 w-8 xl:block" />
              </div>
            </div>

            {/* Table rows */}
            <div className="divide-y">
              {Array.from({ length: 10 }).map((_, index) => (
                <div key={index} className="px-4 py-3">
                  <div className="grid grid-cols-4 items-center gap-4 lg:grid-cols-5 xl:grid-cols-6">
                    <Skeleton className="h-4 w-24" />
                    <div className="space-y-1">
                      <Skeleton className="h-4 w-28" />
                      <Skeleton className="h-3 w-16" />
                    </div>
                    <Skeleton className="h-5 w-16 rounded-full" />
                    <Skeleton className="h-4 w-32" />
                    <Skeleton className="hidden h-4 w-40 lg:block" />
                    <Skeleton className="hidden h-8 w-8 xl:block" />
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Pagination skeleton */}
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex items-center gap-4">
              <Skeleton className="h-4 w-48" />
              <div className="flex items-center gap-2">
                <Skeleton className="h-4 w-16" />
                <Skeleton className="h-8 w-20" />
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Skeleton className="h-4 w-24" />
              <div className="flex gap-1">
                <Skeleton className="h-8 w-8" />
                <Skeleton className="h-8 w-8" />
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
