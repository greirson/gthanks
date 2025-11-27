'use client';

import { Filter } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { ViewToggle, type ViewMode } from '@/components/ui/view-toggle';

// Re-export ViewMode for backwards compatibility
export type { ViewMode };

export interface ControlsBarProps {
  onToggleFilters: () => void;
  isFiltersOpen: boolean;
  filterCount: number;
  viewMode: ViewMode;
  onViewModeChange: (mode: ViewMode) => void;
  isHydrated?: boolean;
}

/**
 * Simple controls bar with Filters button and View toggle.
 * Used by groups page. For more complex toolbars, use inline JSX.
 */
export function ControlsBar({
  onToggleFilters,
  isFiltersOpen,
  filterCount,
  viewMode,
  onViewModeChange,
  isHydrated = true,
}: ControlsBarProps) {
  return (
    <div className="mb-4 flex items-center justify-between border-b pb-4">
      {/* Left side: Filters */}
      <Button
        variant={isFiltersOpen ? 'default' : 'outline'}
        size="sm"
        onClick={onToggleFilters}
        className="relative"
      >
        <Filter className="mr-2 h-4 w-4" />
        Filters
        {filterCount > 0 && (
          <span className="ml-2 flex h-5 min-w-[20px] items-center justify-center rounded-full bg-primary px-1 text-xs text-primary-foreground">
            {filterCount}
          </span>
        )}
      </Button>

      {/* Right side: View toggle */}
      <ViewToggle viewMode={viewMode} onViewModeChange={onViewModeChange} isHydrated={isHydrated} />
    </div>
  );
}
