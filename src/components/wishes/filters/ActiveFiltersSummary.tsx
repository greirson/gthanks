'use client';

import { useState, useEffect } from 'react';
import type { WishLevelSelection, PriceRange } from '@/components/wishes/hooks/useWishFilters';

interface ActiveFiltersSummaryProps {
  wishLevels: WishLevelSelection;
  priceRange: PriceRange;
  maxPrice: number;
  className?: string;
}

const levelLabels: Record<number, string> = {
  1: 'Low',
  2: 'Medium',
  3: 'High',
};

export function ActiveFiltersSummary({
  wishLevels,
  priceRange,
  maxPrice,
  className,
}: ActiveFiltersSummaryProps) {
  // Track if component is mounted (client-side only) to avoid hydration mismatch
  const [isMounted, setIsMounted] = useState(false);

  useEffect(() => {
    setIsMounted(true);
  }, []);
  const formatPrice = (value: number) => {
    if (value >= 1000) {
      return '$1000+';
    }
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(value);
  };

  // Check if filters are at default values
  const isPriceDefault = priceRange.min === 0 && priceRange.max === maxPrice;
  const isWishLevelDefault = wishLevels.length === 3;

  // Don't show summary if all filters are at default or not yet mounted (to avoid hydration mismatch)
  if (!isMounted || (isPriceDefault && isWishLevelDefault)) {
    return null;
  }

  const wishLevelText = isWishLevelDefault
    ? 'All'
    : wishLevels.length === 0
      ? 'None'
      : wishLevels.map((level) => levelLabels[level]).join(', ');

  const priceText = isPriceDefault
    ? 'Any price'
    : `${formatPrice(priceRange.min)} - ${formatPrice(priceRange.max)}`;

  return (
    <div
      className={`space-y-1 rounded-md bg-muted/50 p-3 text-sm text-muted-foreground ${className}`}
    >
      <div className="mb-1 font-medium text-foreground">Active Filters</div>
      {!isPriceDefault && (
        <div>
          <span className="font-medium">Price Range:</span> {priceText}
        </div>
      )}
      {!isWishLevelDefault && (
        <div>
          <span className="font-medium">Wish Levels:</span> {wishLevelText}
        </div>
      )}
    </div>
  );
}
