'use client';

import { useState, useCallback } from 'react';
import { Wish } from '@/lib/validators/api-responses/wishes';
import { useWishFilters } from '@/components/wishes/hooks/useWishFilters';
import { WishesDisplay } from '@/components/wishes/wishes-display';
import { EmptyStateWithFilters } from '@/components/wishes/empty-state-with-filters';
import { WishFilterPanel } from '@/components/wishes/filters/WishFilterPanel';
import { MobileFilterSheet } from '@/components/wishes/filters/MobileFilterSheet';
import { Button } from '@/components/ui/button';
import { Filter, X } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useViewPreference } from '@/lib/utils/view-preferences';
import { ViewToggle } from '@/components/ui/view-toggle';
import { Badge } from '@/components/ui/badge';

interface FilteredWishesDisplayProps {
  wishes: (Wish & { isOwner?: boolean })[];
  onEdit?: (wish: Wish) => void;
  onDelete?: (wish: Wish) => void;
  onReserve?: (wish: Wish) => void;
  onAddToList?: (wish: Wish) => void;
  reservedWishIds?: string[];
  isLoading?: boolean;
  showAddToList?: boolean;
  className?: string;
  showFilters?: boolean;
  compactFilters?: boolean;
}

export function FilteredWishesDisplay({
  wishes,
  onEdit,
  onDelete,
  onReserve,
  onAddToList,
  reservedWishIds = [],
  isLoading = false,
  showAddToList = false,
  className,
  showFilters = true,
  compactFilters = false,
}: FilteredWishesDisplayProps) {
  const [isDesktopFilterOpen, setIsDesktopFilterOpen] = useState(!compactFilters);
  const [isMobileFilterOpen, setIsMobileFilterOpen] = useState(false);
  const [viewMode, setViewMode] = useViewPreference('viewMode.publicList', 'grid');

  // Use the filter hook
  const {
    filterState,
    setWishLevelSelection,
    setPriceRange,
    setSortOption,
    resetFilters,
    filteredWishes,
    activeFilterCount,
    maxPrice,
  } = useWishFilters(wishes);

  const handleClearFilters = useCallback(() => {
    resetFilters();
  }, [resetFilters]);

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
    <div className={cn('flex flex-col gap-6 lg:flex-row', className)}>
      {/* Mobile Controls Bar - Sticky */}
      <div className="sticky top-0 z-30 flex items-center justify-between border-b bg-background px-4 py-2 lg:hidden">
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

      {/* Desktop Filter Panel */}
      <div className="hidden lg:block">
        <div
          className={cn(
            'sticky top-20 transition-all duration-300',
            isDesktopFilterOpen ? 'w-64' : 'w-12'
          )}
        >
          {isDesktopFilterOpen ? (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="font-semibold">Filters</h3>
                <div className="flex items-center gap-2">
                  <ViewToggle viewMode={viewMode} onViewModeChange={setViewMode} />
                  <Button variant="ghost" size="icon" onClick={() => setIsDesktopFilterOpen(false)}>
                    <X className="h-4 w-4" />
                  </Button>
                </div>
              </div>
              <WishFilterPanel
                wishLevelSelection={filterState.wishLevel}
                priceRange={filterState.cost}
                maxPrice={maxPrice}
                sortOption={filterState.sort}
                onWishLevelChange={setWishLevelSelection}
                onPriceChange={setPriceRange}
                onSortChange={setSortOption}
                onClearAll={handleClearFilters}
                activeFilterCount={activeFilterCount}
              />
            </div>
          ) : (
            <Button
              variant="outline"
              size="icon"
              onClick={() => setIsDesktopFilterOpen(true)}
              className="relative"
            >
              <Filter className="h-4 w-4" />
              {activeFilterCount > 0 && (
                <span className="absolute -right-1 -top-1 flex h-5 w-5 items-center justify-center rounded-full bg-primary text-[10px] font-bold text-primary-foreground">
                  {activeFilterCount}
                </span>
              )}
            </Button>
          )}
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1">
        {/* Desktop Controls Bar */}
        <div className="mb-4 hidden items-center justify-between lg:flex">
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
        wishLevelSelection={filterState.wishLevel}
        priceRange={filterState.cost}
        maxPrice={maxPrice}
        sortOption={filterState.sort}
        onWishLevelChange={setWishLevelSelection}
        onPriceChange={setPriceRange}
        onSortChange={setSortOption}
        onClearAll={handleClearFilters}
        activeFilterCount={activeFilterCount}
      />
    </div>
  );
}
