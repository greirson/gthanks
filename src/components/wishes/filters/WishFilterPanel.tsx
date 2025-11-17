'use client';

import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { WishLevelCheckboxFilter } from './WishLevelCheckboxFilter';
import { PriceRangeSlider } from './PriceRangeSlider';
import { ActiveFiltersSummary } from './ActiveFiltersSummary';
import { WishSortDropdown } from './WishSortDropdown';
import type { WishLevelSelection, PriceRange, SortOption } from '../hooks/useWishFilters';

interface WishFilterPanelProps {
  wishLevelSelection: WishLevelSelection;
  priceRange: PriceRange;
  maxPrice: number;
  sortOption: SortOption;
  onWishLevelChange: (selection: WishLevelSelection) => void;
  onPriceChange: (range: PriceRange) => void;
  onSortChange: (option: SortOption) => void;
  onClearAll: () => void;
  onApply?: () => void;
  activeFilterCount: number;
  isMobile?: boolean;
  className?: string;
}

export function WishFilterPanel({
  wishLevelSelection,
  priceRange,
  maxPrice,
  sortOption,
  onWishLevelChange,
  onPriceChange,
  onSortChange,
  onClearAll,
  onApply,
  activeFilterCount,
  isMobile = false,
  className,
}: WishFilterPanelProps) {
  const handlePriceChange = (value: [number, number]) => {
    onPriceChange({ min: value[0], max: value[1] });
  };

  return (
    <div data-testid="filter-panel" className={cn('space-y-6 p-4', className)}>
      {/* Sort Dropdown - Now at the top */}
      <div className="space-y-2">
        <span className="text-sm font-medium">Sort By</span>
        <WishSortDropdown value={sortOption} onValueChange={onSortChange} className="w-full" />
      </div>

      <div className="border-t pt-4" />

      {/* Price Range Filter (dual slider) */}
      <PriceRangeSlider
        value={[priceRange.min, priceRange.max]}
        onValueChange={handlePriceChange}
        min={0}
        max={maxPrice}
      />

      {/* Wish Level Filter (checkboxes) */}
      <WishLevelCheckboxFilter
        selectedLevels={wishLevelSelection}
        onLevelsChange={onWishLevelChange}
      />

      {/* Active Filters Summary */}
      <ActiveFiltersSummary
        wishLevels={wishLevelSelection}
        priceRange={priceRange}
        maxPrice={maxPrice}
      />

      {/* Clear Filters Button */}
      {activeFilterCount > 0 && (
        <div className="pt-2">
          <Button
            variant="outline"
            size="sm"
            onClick={onClearAll}
            data-testid="clear-filters"
            className="w-full"
          >
            Clear All Filters
          </Button>
        </div>
      )}

      {/* Apply Button (Mobile Only) */}
      {isMobile && onApply && (
        <div className="border-t pt-4">
          <Button className="w-full" onClick={onApply} data-testid="apply-filters">
            Apply Filters
          </Button>
        </div>
      )}
    </div>
  );
}
