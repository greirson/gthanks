'use client';

import { Card, CardContent, CardFooter } from '@/components/ui/card';

interface WishSkeletonProps {
  variant?: 'grid' | 'list';
}

export function WishSkeleton({ variant = 'grid' }: WishSkeletonProps) {
  if (variant === 'list') {
    return (
      <Card className="overflow-hidden">
        <CardContent className="p-4">
          <div className="flex gap-4">
            <div className="h-16 w-16 animate-pulse rounded bg-muted sm:h-20 sm:w-20" />
            <div className="flex-1 space-y-2">
              <div className="h-5 w-3/4 animate-pulse rounded bg-muted" />
              <div className="h-4 w-1/4 animate-pulse rounded bg-muted" />
              <div className="h-3 w-full animate-pulse rounded bg-muted" />
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }

  // grid variant
  return (
    <Card className="overflow-hidden">
      <div className="aspect-square animate-pulse bg-muted" />
      <CardContent className="p-3 space-y-2">
        <div className="h-4 w-full animate-pulse rounded bg-muted" />
        <div className="h-3 w-1/3 animate-pulse rounded bg-muted" />
      </CardContent>
      <CardFooter className="p-3 pt-0">
        <div className="h-8 w-full animate-pulse rounded bg-muted" />
      </CardFooter>
    </Card>
  );
}

export function WishesLoadingSkeleton({
  variant = 'grid',
  count = 8
}: {
  variant?: 'grid' | 'list';
  count?: number;
}) {
  const gridClass = variant === 'list'
    ? 'space-y-3'
    : 'grid grid-cols-2 gap-3 md:grid-cols-4';

  return (
    <div className={gridClass}>
      {Array.from({ length: count }).map((_, index) => (
        <WishSkeleton key={index} variant={variant} />
      ))}
    </div>
  );
}
