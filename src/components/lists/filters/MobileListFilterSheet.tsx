'use client';

import { useState, useEffect, useCallback } from 'react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Filter, X } from 'lucide-react';
import { ListFilterPanel } from './ListFilterPanel';
import type {
  VisibilitySelection,
  OwnershipFilter,
  ItemCountRange,
  ListSortOption,
} from '@/components/lists/hooks/useListFilters';

interface MobileListFilterSheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  search: string;
  visibility: VisibilitySelection;
  ownership: OwnershipFilter;
  itemCount: ItemCountRange;
  sort: ListSortOption;
  onSearchChange: (value: string) => void;
  onVisibilityChange: (value: VisibilitySelection) => void;
  onOwnershipChange: (value: OwnershipFilter) => void;
  onItemCountChange: (value: ItemCountRange) => void;
  onSortChange: (value: ListSortOption) => void;
  onClearAll: () => void;
  activeFilterCount: number;
}

export function MobileListFilterSheet({
  open,
  onOpenChange,
  search,
  visibility,
  ownership,
  itemCount,
  sort,
  onSearchChange,
  onVisibilityChange,
  onOwnershipChange,
  onItemCountChange,
  onSortChange,
  onClearAll: _onClearAll,
  activeFilterCount: _activeFilterCount,
}: MobileListFilterSheetProps) {
  // Temporary state for filters (only applied when user clicks "Apply")
  const [tempSearch, setTempSearch] = useState(search);
  const [tempVisibility, setTempVisibility] = useState(visibility);
  const [tempOwnership, setTempOwnership] = useState(ownership);
  const [tempItemCount, setTempItemCount] = useState(itemCount);
  const [tempSort, setTempSort] = useState(sort);

  // Calculate temporary active filter count
  const tempActiveFilterCount = useCallback(() => {
    let count = 0;
    if (tempSearch) {
      count++;
    }
    if (tempVisibility.length > 0) {
      count++;
    }
    if (tempOwnership !== 'all') {
      count++;
    }
    if (tempItemCount !== 'all') {
      count++;
    }
    if (tempSort !== 'newest') {
      count++;
    }
    return count;
  }, [tempSearch, tempVisibility, tempOwnership, tempItemCount, tempSort]);

  // Sync temp state with actual state when sheet opens
  useEffect(() => {
    if (open) {
      setTempSearch(search);
      setTempVisibility(visibility);
      setTempOwnership(ownership);
      setTempItemCount(itemCount);
      setTempSort(sort);
    }
  }, [open, search, visibility, ownership, itemCount, sort]);

  const applyFilters = () => {
    onSearchChange(tempSearch);
    onVisibilityChange(tempVisibility);
    onOwnershipChange(tempOwnership);
    onItemCountChange(tempItemCount);
    onSortChange(tempSort);
    onOpenChange(false);
  };

  const clearAllTemp = () => {
    setTempSearch('');
    setTempVisibility([]);
    setTempOwnership('all');
    setTempItemCount('all');
    setTempSort('newest');
  };

  const closeFilter = () => {
    // Reset temp state to match actual state
    setTempSearch(search);
    setTempVisibility(visibility);
    setTempOwnership(ownership);
    setTempItemCount(itemCount);
    setTempSort(sort);
    onOpenChange(false);
  };

  if (!open) {
    return null;
  }

  return (
    <>
      {/* Backdrop */}
      <button
        type="button"
        className="fixed inset-0 z-40 bg-black/50 backdrop-blur-sm animate-in fade-in md:hidden"
        onClick={closeFilter}
        aria-label="Close filter panel"
      />

      {/* Sheet */}
      <div
        className={cn(
          'fixed inset-x-0 bottom-0 z-50 h-[85vh] bg-background animate-in slide-in-from-bottom md:hidden',
          'rounded-t-lg border-t shadow-xl'
        )}
      >
        <div className="flex h-full flex-col">
          {/* Header */}
          <div className="flex items-center justify-between border-b px-4 py-3">
            <h2 className="flex items-center gap-2 text-lg font-semibold">
              <Filter className="h-5 w-5" />
              Filters
              {tempActiveFilterCount() > 0 && (
                <Badge variant="secondary" className="ml-1">
                  {tempActiveFilterCount()}
                </Badge>
              )}
            </h2>
            <Button variant="ghost" size="sm" onClick={closeFilter} aria-label="Close filters">
              <X className="h-5 w-5" />
            </Button>
          </div>

          {/* Scrollable Content */}
          <div className="flex-1 overflow-y-auto">
            <div className="p-4">
              <ListFilterPanel
                search={tempSearch}
                visibility={tempVisibility}
                ownership={tempOwnership}
                itemCount={tempItemCount}
                sort={tempSort}
                onSearchChange={setTempSearch}
                onVisibilityChange={setTempVisibility}
                onOwnershipChange={setTempOwnership}
                onItemCountChange={setTempItemCount}
                onSortChange={setTempSort}
                onClearAll={clearAllTemp}
                activeFilterCount={tempActiveFilterCount()}
                isMobile={true}
              />
            </div>
          </div>

          {/* Footer Actions */}
          <div className="border-t p-4">
            <div className="flex gap-2">
              <Button
                variant="outline"
                onClick={clearAllTemp}
                className="flex-1"
                disabled={tempActiveFilterCount() === 0}
              >
                Clear All
              </Button>
              <Button onClick={applyFilters} className="flex-1">
                Apply Filters
                {tempActiveFilterCount() > 0 && ` (${tempActiveFilterCount()})`}
              </Button>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
