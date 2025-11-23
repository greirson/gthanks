import { Gift, Filter } from 'lucide-react';

interface EmptyStateProps {
  hasActiveFilters?: boolean;
}

export function EmptyState({ hasActiveFilters = false }: EmptyStateProps) {
  // Show filtered state if filters are active
  if (hasActiveFilters) {
    return (
      <div className="flex min-h-[400px] items-center justify-center p-8">
        <div className="text-center">
          <div className="mx-auto mb-4 w-fit rounded-full bg-muted p-4">
            <Filter className="h-8 w-8 text-muted-foreground" />
          </div>
          <h3 className="text-lg font-semibold">No reservations match your filters</h3>
          <p className="mt-2 text-sm text-muted-foreground">
            Try adjusting or clearing your filters to see more results
          </p>
        </div>
      </div>
    );
  }

  // Default empty state
  return (
    <div className="flex min-h-[400px] items-center justify-center p-8">
      <div className="max-w-md text-center">
        {/* Icon */}
        <div className="mx-auto mb-4 w-fit rounded-full bg-muted p-4">
          <Gift className="h-8 w-8 text-muted-foreground" />
        </div>

        {/* Main heading */}
        <h3 className="mb-2 text-lg font-semibold">You haven't reserved any gifts yet</h3>

        {/* Subtext */}
        <p className="mb-8 text-sm text-muted-foreground">
          Visit shared lists or groups to reserve items and coordinate gift-giving
        </p>

        {/* Educational section */}
        <div className="rounded-lg border bg-muted/50 p-6 text-left">
          <h4 className="mb-3 text-sm font-semibold">How Reservations Work</h4>
          <ul className="space-y-2 text-sm text-muted-foreground">
            <li className="flex items-start">
              <span className="mr-2 mt-0.5 flex h-5 w-5 flex-shrink-0 items-center justify-center rounded-full bg-primary/10 text-xs text-primary">
                1
              </span>
              <span>Reservations are hidden from list owners to keep gifts a surprise</span>
            </li>
            <li className="flex items-start">
              <span className="mr-2 mt-0.5 flex h-5 w-5 flex-shrink-0 items-center justify-center rounded-full bg-primary/10 text-xs text-primary">
                2
              </span>
              <span>Helps coordinate with others so no one buys the same gift</span>
            </li>
            <li className="flex items-start">
              <span className="mr-2 mt-0.5 flex h-5 w-5 flex-shrink-0 items-center justify-center rounded-full bg-primary/10 text-xs text-primary">
                3
              </span>
              <span>Mark items as purchased to track what you've already bought</span>
            </li>
          </ul>
        </div>
      </div>
    </div>
  );
}
