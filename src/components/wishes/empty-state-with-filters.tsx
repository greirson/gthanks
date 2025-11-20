'use client';

import { Button } from '@/components/ui/button';
import { Filter, X } from 'lucide-react';

interface EmptyStateWithFiltersProps {
  hasActiveFilters: boolean;
  totalWishCount: number;
  onClearFilters: () => void;
}

export function EmptyStateWithFilters({
  hasActiveFilters,
  totalWishCount,
  onClearFilters,
}: EmptyStateWithFiltersProps) {
  // No wishes exist at all
  if (totalWishCount === 0) {
    return (
      <div className="flex min-h-[400px] items-center justify-center p-8">
        <div className="text-center">
          <div className="mx-auto mb-4 w-fit rounded-full bg-muted p-4">
            <Filter className="h-8 w-8 text-muted-foreground" />
          </div>
          <h3 className="text-lg font-semibold">There are no wishes yet!</h3>
          <p className="mt-2 text-sm text-muted-foreground">Go add some.</p>
        </div>
      </div>
    );
  }

  // Filters are hiding wishes
  if (hasActiveFilters && totalWishCount > 0) {
    return (
      <div className="flex min-h-[400px] items-center justify-center p-8">
        <div className="space-y-4 text-center">
          <div>
            <div className="mx-auto mb-4 w-fit rounded-full bg-muted p-4">
              <Filter className="h-8 w-8 text-muted-foreground" />
            </div>
            <h3 className="text-lg font-semibold">
              There&apos;s {totalWishCount} {totalWishCount === 1 ? 'wish' : 'wishes'} hidden by
              filters!
            </h3>
            <p className="mt-2 text-sm text-muted-foreground">Clear filters?</p>
          </div>
          <Button
            onClick={onClearFilters}
            size="lg"
            className="h-12 min-w-[200px]"
            variant="default"
          >
            <X className="mr-2 h-4 w-4" />
            Clear Filters
          </Button>
        </div>
      </div>
    );
  }

  // Shouldn't reach here, but provide fallback
  return (
    <div className="flex min-h-[400px] items-center justify-center p-8">
      <div className="text-center">
        <p className="text-sm text-muted-foreground">No wishes to display</p>
      </div>
    </div>
  );
}
