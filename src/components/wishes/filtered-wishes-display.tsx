'use client';

import { useState, useCallback } from 'react';
import { Wish } from '@/lib/validators/api-responses/wishes';
import { WishesDisplay } from '@/components/wishes/wishes-display';
import { EmptyStateWithFilters } from '@/components/wishes/empty-state-with-filters';
import { MobileFilterSheet } from '@/components/wishes/filters/MobileFilterSheet';
import { Button } from '@/components/ui/button';
import { Filter } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useViewPreference } from '@/lib/utils/view-preferences';
import { ViewToggle } from '@/components/ui/view-toggle';
import { Badge } from '@/components/ui/badge';
import type {
  FilterState,
  WishLevelSelection,
  SortOption,
  PriceRange,
} from '@/components/wishes/hooks/useWishFilters';

interface FilteredWishesDisplayProps {
  wishes: (Wish & { isOwner?: boolean })[];
  // Filter state from parent
  filterState?: FilterState;
  filteredWishes?: Wish[];
  maxPrice?: number;
  activeFilterCount?: number;
  // Filter handlers from parent
  onWishLevelChange?: (levels: WishLevelSelection) => void;
  onPriceChange?: (range: PriceRange) => void;
  onSortChange?: (sort: SortOption) => void;
  onResetFilters?: () => void;
  // Existing props
  onEdit?: (wish: Wish) => void;
  onDelete?: (wish: Wish) => void;
  onReserve?: (wish: Wish) => void;
  onAddToList?: (wish: Wish) => void;
  reservedWishIds?: string[];
  isLoading?: boolean;
  showAddToList?: boolean;
  className?: string;
  showFilters?: boolean;
  // Custom sort props
  listId?: string;
  canEdit?: boolean;
}

export function FilteredWishesDisplay({
  wishes,
  filterState,
  filteredWishes: filteredWishesFromParent,
  maxPrice: maxPriceFromParent,
  activeFilterCount: activeFilterCountFromParent,
  onWishLevelChange,
  onPriceChange,
  onSortChange,
  onResetFilters,
  onEdit,
  onDelete,
  onReserve,
  onAddToList,
  reservedWishIds = [],
  isLoading = false,
  showAddToList = false,
  className,
  showFilters = true,
}: FilteredWishesDisplayProps) {
  const [isMobileFilterOpen, setIsMobileFilterOpen] = useState(false);
  const [viewMode, setViewMode] = useViewPreference('viewMode.publicList', 'grid');

  // Use filter state from parent or fall back to showing all wishes
  const filteredWishes = filteredWishesFromParent || wishes;
  const maxPrice = maxPriceFromParent || 0;
  const activeFilterCount = activeFilterCountFromParent || 0;

  const handleClearFilters = useCallback(() => {
    onResetFilters?.();
  }, [onResetFilters]);

  if (!showFilters) {
    // If filters are disabled, just render the display directly
    return (
      <WishesDisplay
        wishes={wishes}
        onEdit={onEdit}
        onDelete={onDelete}
        onReserve={onReserve}
        onAddToList={onAddToList}
        reservedWishIds={reservedWishIds}
        isLoading={isLoading}
        showAddToList={showAddToList}
        viewMode={viewMode}
      />
    );
  }

  return (
    <div className={cn('mt-2 flex flex-col gap-6', className)}>
      {/* Mobile/Tablet Controls Bar - Filter Button + View Toggle in Same Row */}
      <div className="mb-4 flex items-center justify-between lg:hidden">
        <Button
          variant="outline"
          size="sm"
          onClick={() => setIsMobileFilterOpen(true)}
          className="min-h-[44px] gap-2"
        >
          <Filter className="h-4 w-4" />
          <span className="hidden sm:inline">Filters</span>
          {activeFilterCount > 0 && (
            <Badge variant="secondary" className="ml-2">
              {activeFilterCount}
            </Badge>
          )}
        </Button>
        <ViewToggle viewMode={viewMode} onViewModeChange={setViewMode} />
      </div>

      {/* Main Content */}
      <div className="flex-1">
        {/* Desktop Controls Bar */}
        <div className="mb-4 hidden items-center justify-between lg:mt-2 lg:flex">
          <div className="text-sm text-muted-foreground">
            {filteredWishes.length === wishes.length ? (
              <span>
                {wishes.length} {wishes.length === 1 ? 'wish' : 'wishes'}
              </span>
            ) : (
              <span>
                Showing {filteredWishes.length} of {wishes.length} wishes
              </span>
            )}
          </div>
          <ViewToggle viewMode={viewMode} onViewModeChange={setViewMode} />
        </div>

        {/* Mobile Results Count (no view toggle, it's in sticky header) */}
        <div className="mb-4 text-sm text-muted-foreground lg:hidden">
          {filteredWishes.length === wishes.length ? (
            <span>
              {wishes.length} {wishes.length === 1 ? 'wish' : 'wishes'}
            </span>
          ) : (
            <span>
              Showing {filteredWishes.length} of {wishes.length} wishes
            </span>
          )}
        </div>

        {/* Wishes Display or Empty State */}
        {filteredWishes.length === 0 ? (
          <EmptyStateWithFilters
            hasActiveFilters={activeFilterCount > 0}
            totalWishCount={wishes.length}
            onClearFilters={handleClearFilters}
          />
        ) : (
          <WishesDisplay
            wishes={filteredWishes}
            onEdit={onEdit}
            onDelete={onDelete}
            onReserve={onReserve}
            onAddToList={onAddToList}
            reservedWishIds={reservedWishIds}
            isLoading={isLoading}
            showAddToList={showAddToList}
            viewMode={viewMode}
          />
        )}
      </div>

      {/* Mobile Filter Sheet */}
      <MobileFilterSheet
        open={isMobileFilterOpen}
        onOpenChange={setIsMobileFilterOpen}
        wishLevelSelection={filterState?.wishLevel || [1, 2, 3]}
        priceRange={filterState?.cost || { min: 0, max: maxPrice }}
        maxPrice={maxPrice}
        sortOption={filterState?.sort || 'wishLevel-high'}
        onWishLevelChange={onWishLevelChange || (() => {})}
        onPriceChange={onPriceChange || (() => {})}
        onSortChange={onSortChange || (() => {})}
        onClearAll={handleClearFilters}
        activeFilterCount={activeFilterCount}
      />
    </div>
  );
}
