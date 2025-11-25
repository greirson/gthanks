'use client';

import { Filter, Grid2x2, List, Plus } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';

export type ViewMode = 'list' | 'grid';

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
    <div className="mb-0 flex flex-row flex-wrap items-center justify-between gap-3 border-b pb-2">
      {/* Left side - Filter button (all screens) + Select (desktop only) */}
      <div className="flex items-center gap-3">
        {/* Filter button - Always visible */}
        <Button
          variant={isFiltersOpen ? 'default' : 'outline'}
          size="sm"
          onClick={onToggleFilters}
          className="relative"
        >
          <Filter className="mr-2 h-4 w-4" />
          <span>Filter</span>
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
            className="hidden sm:flex"
          >
            {isSelectionMode ? 'Exit Selection' : 'Select'}
          </Button>
        )}
      </div>

      {/* Mobile: Action buttons on left */}
      {showMobileActions && (
        <div className="flex items-center gap-1 sm:hidden">
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

      {/* Unified View Mode Toggle - Works on mobile and desktop */}
      <div className="flex items-center gap-2">
        <span className="hidden text-sm text-muted-foreground sm:inline">View:</span>
        <button
          onClick={() => {
            if (isHydrated) {
              onViewModeChange(viewMode === 'list' ? 'grid' : 'list');
            }
          }}
          disabled={!isHydrated}
          className={cn(
            'inline-flex min-h-[44px] items-center justify-center gap-1 rounded-md bg-muted p-1 text-muted-foreground',
            !isHydrated && 'cursor-not-allowed opacity-50'
          )}
          aria-label={`Switch to ${viewMode === 'list' ? 'grid' : 'list'} view`}
        >
          <div
            className={cn(
              'inline-flex min-h-[36px] min-w-[44px] items-center justify-center rounded-sm px-3 text-sm font-medium transition-all',
              viewMode === 'list'
                ? 'bg-background text-foreground shadow-sm'
                : 'text-muted-foreground'
            )}
          >
            <List className="h-4 w-4 sm:mr-2" />
            <span className="hidden sm:inline">List</span>
          </div>
          <div
            className={cn(
              'inline-flex min-h-[36px] min-w-[44px] items-center justify-center rounded-sm px-3 text-sm font-medium transition-all',
              viewMode === 'grid'
                ? 'bg-background text-foreground shadow-sm'
                : 'text-muted-foreground'
            )}
          >
            <Grid2x2 className="h-4 w-4 sm:mr-2" />
            <span className="hidden sm:inline">Grid</span>
          </div>
        </button>
      </div>
    </div>
  );
}
