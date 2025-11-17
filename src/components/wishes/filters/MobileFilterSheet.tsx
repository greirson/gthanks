'use client';

import { useState, useEffect, useCallback } from 'react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { X } from 'lucide-react';
import { WishFilterPanel } from './WishFilterPanel';
import type { WishLevelSelection, PriceRange, SortOption } from '../hooks/useWishFilters';

interface MobileFilterSheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  wishLevelSelection: WishLevelSelection;
  priceRange: PriceRange;
  maxPrice: number;
  sortOption: SortOption;
  onWishLevelChange: (selection: WishLevelSelection) => void;
  onPriceChange: (range: PriceRange) => void;
  onSortChange: (sort: SortOption) => void;
  onClearAll: () => void; // Used within WishFilterPanel
  activeFilterCount: number;
}

export function MobileFilterSheet({
  open: _open,
  onOpenChange: _onOpenChange,
  wishLevelSelection,
  priceRange,
  maxPrice,
  sortOption,
  onWishLevelChange,
  onPriceChange,
  onSortChange,
  onClearAll: _onClearAll,
  activeFilterCount: _activeFilterCount,
}: MobileFilterSheetProps) {
  const [isFilterOpen, setIsFilterOpen] = useState(false);

  // Temporary state for filters (batch application)
  const [tempWishLevelSelection, setTempWishLevelSelection] = useState(wishLevelSelection);
  const [tempPriceRange, setTempPriceRange] = useState(priceRange);
  const [tempSortOption, setTempSortOption] = useState(sortOption);

  // Sync temporary state when props change
  useEffect(() => {
    setTempWishLevelSelection(wishLevelSelection);
    setTempPriceRange(priceRange);
    setTempSortOption(sortOption);
  }, [wishLevelSelection, priceRange, sortOption]);

  const closeFilter = useCallback(() => {
    setIsFilterOpen(false);
    // Reset temp state to actual state on cancel
    setTempWishLevelSelection(wishLevelSelection);
    setTempPriceRange(priceRange);
    setTempSortOption(sortOption);
  }, [wishLevelSelection, priceRange, sortOption]);

  const applyFilters = () => {
    onWishLevelChange(tempWishLevelSelection);
    onPriceChange(tempPriceRange);
    onSortChange(tempSortOption);
    setIsFilterOpen(false);
  };

  const clearTempFilters = () => {
    setTempWishLevelSelection([1, 2, 3]); // Reset to all levels selected
    setTempPriceRange({ min: 0, max: maxPrice });
  };

  // Prevent body scroll when sheet is open
  useEffect(() => {
    if (isFilterOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }

    return () => {
      document.body.style.overflow = '';
    };
  }, [isFilterOpen]);

  // Handle escape key
  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        if (isFilterOpen) {
          closeFilter();
        }
      }
    };

    window.addEventListener('keydown', handleEscape);
    return () => window.removeEventListener('keydown', handleEscape);
  }, [isFilterOpen, closeFilter]);

  // Sync open state with parent
  useEffect(() => {
    setIsFilterOpen(_open);
  }, [_open]);

  // Notify parent when internal state changes
  useEffect(() => {
    _onOpenChange(isFilterOpen);
  }, [isFilterOpen, _onOpenChange]);

  return (
    <>
      {/* Filter Sheet */}
      {isFilterOpen && (
        <>
          {/* Backdrop */}
          <div
            className="fixed inset-0 z-50 bg-black/50 md:hidden"
            onClick={closeFilter}
            aria-hidden="true"
          />

          {/* Sheet */}
          <div
            className={cn(
              'fixed bottom-0 left-0 right-0 z-50 bg-background',
              'transform transition-transform duration-300 ease-out',
              'max-h-[80vh] overflow-y-auto rounded-t-lg shadow-lg',
              'md:hidden',
              isFilterOpen ? 'translate-y-0' : 'translate-y-full'
            )}
            role="dialog"
            aria-label="Filter options"
            aria-modal="true"
          >
            {/* Header */}
            <div className="sticky top-0 flex items-center justify-between border-b bg-background p-4">
              <h2 className="text-lg font-semibold">Filters</h2>
              <Button variant="ghost" size="sm" onClick={closeFilter} aria-label="Close filters">
                <X className="h-5 w-5" />
              </Button>
            </div>

            {/* Filter Panel */}
            <WishFilterPanel
              wishLevelSelection={tempWishLevelSelection}
              priceRange={tempPriceRange}
              maxPrice={maxPrice}
              sortOption={tempSortOption}
              onWishLevelChange={setTempWishLevelSelection}
              onPriceChange={setTempPriceRange}
              onSortChange={setTempSortOption}
              onClearAll={clearTempFilters}
              onApply={applyFilters}
              activeFilterCount={
                (tempWishLevelSelection.length !== 3 ? 1 : 0) +
                (tempPriceRange.min !== 0 || tempPriceRange.max !== maxPrice ? 1 : 0)
              }
              isMobile={true}
            />
          </div>
        </>
      )}
    </>
  );
}
