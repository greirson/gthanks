'use client';

import { Card, CardContent } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';

interface ReservationSkeletonProps {
  variant?: 'grid' | 'list';
}

/**
 * Skeleton for a single reservation card
 */
export function ReservationSkeleton({ variant = 'grid' }: ReservationSkeletonProps) {
  if (variant === 'list') {
    return (
      <Card className="overflow-hidden">
        <CardContent className="p-4">
          <div className="flex h-20 items-center gap-4">
            {/* Checkbox placeholder */}
            <Skeleton className="h-5 w-5 shrink-0" />

            {/* Thumbnail */}
            <Skeleton className="h-12 w-12 shrink-0 rounded" />

            {/* Title + Breadcrumb */}
            <div className="flex-1 space-y-2">
              <Skeleton className="h-5 w-3/4" />
              <Skeleton className="h-3 w-1/2" />
            </div>

            {/* Reserved date */}
            <Skeleton className="hidden h-4 w-20 sm:block" />

            {/* Action buttons */}
            <div className="flex gap-2">
              <Skeleton className="h-8 w-8 rounded" />
              <Skeleton className="h-8 w-8 rounded" />
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }

  // Grid variant
  return (
    <Card className="overflow-hidden">
      {/* Image placeholder */}
      <Skeleton className="h-48 w-full" />

      <CardContent className="space-y-3 p-4">
        {/* Title */}
        <Skeleton className="h-5 w-full" />

        {/* Breadcrumb: Owner → List */}
        <Skeleton className="h-4 w-3/4" />

        {/* Reserved date */}
        <Skeleton className="h-3 w-1/2" />

        {/* Action buttons */}
        <div className="flex gap-2 pt-2">
          <Skeleton className="h-8 flex-1" />
          <Skeleton className="h-8 flex-1" />
        </div>
      </CardContent>
    </Card>
  );
}

interface ReservationsLoadingSkeletonProps {
  variant?: 'grid' | 'list';
  count?: number;
}

/**
 * Loading skeleton for reservations page with grouped view
 * Shows 2-3 owner groups, each with owner name and 3-4 cards
 */
export function ReservationsLoadingSkeleton({
  variant = 'grid',
  count = 8,
}: ReservationsLoadingSkeletonProps) {
  // Calculate number of groups and items per group
  const numberOfGroups = Math.min(3, Math.ceil(count / 3));
  const itemsPerGroup = Math.ceil(count / numberOfGroups);

  const gridClass =
    variant === 'list'
      ? 'space-y-3'
      : 'grid grid-cols-1 gap-3 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4';

  return (
    <div className="space-y-8">
      {Array.from({ length: numberOfGroups }).map((_, groupIndex) => (
        <div key={groupIndex} className="space-y-4">
          {/* Owner name skeleton */}
          <div className="flex items-center gap-2 border-b pb-2">
            <Skeleton className="h-6 w-48" />
            <Skeleton className="h-4 w-16" />
          </div>

          {/* Cards/rows for this owner */}
          <div className={gridClass}>
            {Array.from({ length: itemsPerGroup }).map((_, itemIndex) => (
              <ReservationSkeleton key={itemIndex} variant={variant} />
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}
