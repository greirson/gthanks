'use client';

import { Filter, LayoutGrid, List, LayoutList, Plus } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ToggleGroup, ToggleGroupItem } from '@/components/ui/toggle-group';
import { cn } from '@/lib/utils';

export type ViewMode = 'list' | 'compact' | 'comfortable';

interface ControlsBarProps {
  onToggleFilters: () => void;
  isFiltersOpen: boolean;
  filterCount: number;
  viewMode: ViewMode;
  onViewModeChange: (mode: ViewMode) => void;
  // Optional Select button props (desktop only on desktop, mobile on mobile)
  showSelectButton?: boolean;
  isSelectionMode?: boolean;
  onToggleSelection?: () => void;
  // Optional mobile action buttons
  showMobileActions?: boolean;
  onAddAction?: () => void;
  // Optional hydration state
  isHydrated?: boolean;
}

export function ControlsBar({
  onToggleFilters,
  isFiltersOpen,
  filterCount,
  viewMode,
  onViewModeChange,
  showSelectButton = false,
  isSelectionMode = false,
  onToggleSelection,
  showMobileActions = false,
  onAddAction,
  isHydrated = true,
}: ControlsBarProps) {
  return (
    <div className="mb-2 sm:mb-4 flex flex-col gap-3 border-b pb-4 sm:flex-row sm:items-center sm:justify-between">
      {/* Desktop: Filter + Select on left */}
      <div className="hidden sm:flex sm:items-center sm:gap-3">
        <Button
          variant={isFiltersOpen ? 'default' : 'outline'}
          size="sm"
          onClick={onToggleFilters}
          className="relative"
        >
          <Filter className="mr-2 h-4 w-4" />
          Filters
          {filterCount > 0 && (
            <Badge
              variant="secondary"
              className="ml-2 h-5 min-w-[20px] rounded-full bg-primary px-1 text-xs text-primary-foreground"
            >
              {filterCount}
            </Badge>
          )}
        </Button>

        {/* Select Button - Desktop Only */}
        {showSelectButton && onToggleSelection && (
          <Button
            variant={isSelectionMode ? 'default' : 'outline'}
            onClick={onToggleSelection}
          >
            {isSelectionMode ? 'Exit Selection' : 'Select'}
          </Button>
        )}
      </div>

      {/* Mobile: View picker on left, action buttons on right */}
      <div className="flex items-center justify-between sm:hidden">
        <ToggleGroup
          type="single"
          value={isHydrated ? (viewMode === 'list' ? 'list' : 'grid') : undefined}
          onValueChange={(value) => {
            if (value && isHydrated) {
              onViewModeChange(value === 'list' ? 'list' : 'compact');
            }
          }}
          disabled={!isHydrated}
          className={cn("gap-1", !isHydrated && "opacity-50 cursor-not-allowed")}
        >
          <ToggleGroupItem value="list" aria-label="List view" className="h-8 px-2">
            <List className="h-4 w-4" />
          </ToggleGroupItem>
          <ToggleGroupItem value="grid" aria-label="Grid view" className="h-8 px-2">
            <LayoutGrid className="h-4 w-4" />
          </ToggleGroupItem>
        </ToggleGroup>

        {showMobileActions && (
          <div className="flex items-center gap-1">
            {showSelectButton && onToggleSelection && (
              <Button
                variant={isSelectionMode ? 'default' : 'outline'}
                size="sm"
                onClick={onToggleSelection}
              >
                {isSelectionMode ? 'Done' : 'Select'}
              </Button>
            )}
            {onAddAction && (
              <Button size="sm" onClick={onAddAction}>
                <Plus className="h-4 w-4" />
                <span className="sr-only">Add</span>
              </Button>
            )}
          </div>
        )}
      </div>

      {/* Desktop: View Mode Toggle */}
      <div className="hidden sm:flex sm:items-center sm:gap-2">
        <span className="text-sm text-muted-foreground">View:</span>
        <ToggleGroup
          type="single"
          value={isHydrated ? viewMode : undefined}
          onValueChange={(value) => {
            if (value && isHydrated) {
              onViewModeChange(value as ViewMode);
            }
          }}
          disabled={!isHydrated}
          className={cn("gap-1", !isHydrated && "opacity-50 cursor-not-allowed")}
        >
          <ToggleGroupItem value="list" aria-label="List view" className="h-8 px-3">
            <List className="mr-2 h-4 w-4" />
            List
          </ToggleGroupItem>
          <ToggleGroupItem value="compact" aria-label="Compact grid" className="h-8 px-3">
            <LayoutGrid className="mr-2 h-4 w-4" />
            Compact
          </ToggleGroupItem>
          <ToggleGroupItem value="comfortable" aria-label="Comfortable grid" className="h-8 px-3">
            <LayoutList className="mr-2 h-4 w-4" />
            Comfortable
          </ToggleGroupItem>
        </ToggleGroup>
      </div>
    </div>
  );
}
