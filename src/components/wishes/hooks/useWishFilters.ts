'use client';

import { useState, useCallback, useEffect, useMemo, useRef } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useSession } from 'next-auth/react';
import type { Wish } from '@/lib/validators/api-responses/wishes';
import { useFilterPersistence } from '@/hooks/filters/shared/useFilterPersistence';
import { applySearchFilter } from '@/hooks/filters/shared/searchUtils';
import { countActiveFilters } from '@/hooks/filters/shared/activeFilterCount';

// Extended Wish type with optional ListWish fields for sorting
export type WishWithListContext = Wish & {
  sortOrder?: number | null;
  addedAt?: string;
};

// Types for filter/sort functionality
// Changed from range to array for multi-select checkbox support
export type WishLevelSelection = number[]; // Array of selected wish levels (1, 2, 3)

export interface PriceRange {
  min: number;
  max: number;
}

export type SortOption = 'custom' | 'wishLevel-high' | 'wishLevel-low' | 'price-high' | 'price-low';

export interface LocalStorageFilters {
  wishLevel?: WishLevelSelection; // Updated to use array for multi-select
  cost?: PriceRange;
}

export interface FilterState {
  wishLevel: WishLevelSelection; // Changed to array for multi-select
  cost: PriceRange;
  sort: SortOption;
  search: string;
  [key: string]: unknown;
}

// LocalStorage key for persisting filters
const FILTER_STORAGE_KEY = 'wish-filters';

// Default filter state
const DEFAULT_FILTER_STATE = {
  wishLevel: [1, 2, 3] as WishLevelSelection, // All levels selected
  cost: { min: 0, max: 0 } as PriceRange, // Will be updated with dynamic maxPrice
  sort: 'custom' as SortOption,
  search: '',
};

export function useWishFilters(wishes: WishWithListContext[], pageSize = 24) {
  // Ensure wishes is always an array - wrap in useMemo to fix React hook dependencies
  const safeWishes = useMemo(() => wishes || [], [wishes]);

  // Compute max price from wishes - MUST be computed before useFilterPersistence
  const maxPrice = useMemo(() => {
    const prices = safeWishes
      .map((w) => w.price)
      .filter((p): p is number => p !== null && p !== undefined && p > 0);
    // Use 0 as max when no priced items exist (this makes the default state show no active filters)
    return prices.length > 0 ? Math.max(...prices) : 0;
  }, [safeWishes]);

  // Memoize urlSerializer to prevent infinite re-render loop
  // The urlSerializer object must have a stable reference; creating it fresh on every render
  // causes useFilterPersistence's useEffect to trigger repeatedly, calling router.replace()
  // in an infinite loop. Only recreate when maxPrice changes (which is rare).
  const urlSerializer = useMemo(
    () => ({
      toURL: (state: FilterState) => {
        const params = new URLSearchParams();

        // Only set params if different from defaults
        if (state.wishLevel.length !== 3) {
          params.set('wishLevel', state.wishLevel.join(','));
        }

        if (state.cost.min !== 0 || state.cost.max !== maxPrice) {
          params.set('cost', `${state.cost.min}-${state.cost.max}`);
        }

        if (state.sort !== 'custom') {
          params.set('sort', state.sort);
        }

        if (state.search) {
          params.set('search', state.search);
        }

        return params;
      },
      fromURL: (params: URLSearchParams) => {
        const wishLevelParam = params.get('wishLevel');
        const costParam = params.get('cost');
        const sortParam = params.get('sort');
        const searchParam = params.get('search');

        const partial: Partial<FilterState> = {};

        if (wishLevelParam) {
          partial.wishLevel = wishLevelParam.split(',').map((level) => parseInt(level, 10));
        }

        if (costParam) {
          const [min, max] = costParam.split('-').map((val) => parseFloat(val));
          partial.cost = { min, max };
        }

        if (sortParam) {
          partial.sort = sortParam as SortOption;
        }

        if (searchParam) {
          partial.search = searchParam;
        }

        return partial;
      },
    }),
    [maxPrice] // Only recreate when maxPrice changes
  );

  // Use shared filter persistence hook
  const [filterState, setFilterState] = useFilterPersistence<FilterState>({
    storageKey: FILTER_STORAGE_KEY,
    defaultState: {
      ...DEFAULT_FILTER_STATE,
      cost: { min: 0, max: maxPrice }, // Update default cost with dynamic maxPrice
    },
    urlSerializer,
  });

  const [currentPage, setCurrentPage] = useState(1);

  // Track if user has manually adjusted the price filter
  // We use a ref to track the previous maxPrice to detect when it actually changes
  const prevMaxPriceRef = useRef(maxPrice);

  // Auto-update price max ONLY when maxPrice increases (new expensive items added)
  // Do NOT reset when user manually lowers the max filter
  useEffect(() => {
    const prevMaxPrice = prevMaxPriceRef.current;
    prevMaxPriceRef.current = maxPrice;

    // Only auto-update when:
    // 1. maxPrice actually increased (new items added with higher prices)
    // 2. Current max equals the old maxPrice (user hasn't customized it)
    const maxPriceIncreased = maxPrice > prevMaxPrice;
    const maxIsAtPreviousDefault = filterState.cost.max === prevMaxPrice;

    if (maxPrice > 0 && maxPriceIncreased && maxIsAtPreviousDefault) {
      setFilterState((prev) => ({
        ...prev,
        cost: { ...prev.cost, max: maxPrice },
      }));
    }
  }, [maxPrice, filterState.cost.max, setFilterState]);

  // Updated to handle array-based wish level selection
  const setWishLevelSelection = useCallback(
    (selection: WishLevelSelection) => {
      setFilterState((prev) => ({ ...prev, wishLevel: selection }));
    },
    [setFilterState]
  );

  const setPriceRange = useCallback(
    (range: PriceRange) => {
      setFilterState((prev) => ({ ...prev, cost: range }));
    },
    [setFilterState]
  );

  const setSortOption = useCallback(
    (sort: SortOption) => {
      setFilterState((prev) => ({ ...prev, sort }));
    },
    [setFilterState]
  );

  const setSearchQuery = useCallback(
    (search: string) => {
      setFilterState((prev) => ({ ...prev, search }));
    },
    [setFilterState]
  );

  const resetFilters = useCallback(() => {
    setCurrentPage(1);
    setFilterState({
      ...DEFAULT_FILTER_STATE,
      cost: { min: 0, max: maxPrice }, // Reset with dynamic maxPrice
    });
  }, [maxPrice, setFilterState]);

  // Calculate active filter count using shared utility
  const activeFilterCount = useMemo(() => {
    // Use shared utility for standard filter counting
    let count = countActiveFilters(filterState, {
      ...DEFAULT_FILTER_STATE,
      cost: { min: 0, max: maxPrice }, // Use dynamic maxPrice for comparison
    });

    // Add custom pagination counting if currentPage > 1
    if (currentPage > 1) {
      count++;
    }

    return count;
  }, [filterState, maxPrice, currentPage]);

  // Filter and sort wishes
  const filteredAndSortedWishes = useMemo(() => {
    // Ensure we preserve all properties including isOwner
    let result = safeWishes.map((wish) => ({ ...wish }));

    // Apply search filter using shared utility
    result = applySearchFilter(result, filterState.search, ['title', 'notes']);

    // Apply wishLevel filter - now using array-based selection
    result = result.filter((wish) => {
      const wishLevel = wish.wishLevel ?? 1; // Treat null/undefined as 1
      // If all levels are selected (default), include all wishes
      if (filterState.wishLevel.length === 3) {
        return true;
      }
      // Otherwise check if the wish level is in the selected array
      return filterState.wishLevel.includes(wishLevel);
    });

    // Apply price filter (skip if at default max to show all wishes)
    if (filterState.cost.min !== 0 || filterState.cost.max !== maxPrice) {
      result = result.filter((wish) => {
        const price = wish.price ?? 0;
        return price >= filterState.cost.min && price <= filterState.cost.max;
      });
    }

    // Sort wishes
    result.sort((a, b) => {
      switch (filterState.sort) {
        case 'custom': {
          // Sort by sortOrder (ascending), fallback to addedAt (descending) for nulls
          const aOrder = a.sortOrder ?? Number.MAX_SAFE_INTEGER;
          const bOrder = b.sortOrder ?? Number.MAX_SAFE_INTEGER;

          if (aOrder !== bOrder) {
            return aOrder - bOrder;
          }

          // Fallback to addedAt for wishes without sortOrder (or createdAt if addedAt not available)
          const aTime = new Date(a.addedAt || a.createdAt).getTime();
          const bTime = new Date(b.addedAt || b.createdAt).getTime();
          return bTime - aTime;
        }

        case 'wishLevel-high':
          return (b.wishLevel ?? 1) - (a.wishLevel ?? 1);

        case 'wishLevel-low':
          return (a.wishLevel ?? 1) - (b.wishLevel ?? 1);

        case 'price-high':
          return (b.price ?? 0) - (a.price ?? 0);

        case 'price-low':
          return (a.price ?? 0) - (b.price ?? 0);

        default:
          return 0;
      }
    });

    return result;
  }, [safeWishes, filterState, maxPrice]);

  // Paginate results
  const paginatedWishes = useMemo(() => {
    const startIndex = (currentPage - 1) * pageSize;
    const endIndex = startIndex + pageSize;
    return filteredAndSortedWishes.slice(startIndex, endIndex);
  }, [filteredAndSortedWishes, currentPage, pageSize]);

  const totalPages = Math.ceil(filteredAndSortedWishes.length / pageSize);

  // Reset to page 1 when filters change
  useEffect(() => {
    setCurrentPage(1);
  }, [filterState]);

  return {
    // Filter state (already contains sort and search)
    filterState,

    // Filter setters
    setWishLevelSelection, // Renamed from setWishLevelRange
    setPriceRange,
    setSortOption,
    setSearchQuery,
    resetFilters,

    // Results
    filteredWishes: filteredAndSortedWishes,
    paginatedWishes,
    totalWishes: filteredAndSortedWishes.length,
    activeFilterCount,

    // Pagination
    currentPage,
    setCurrentPage,
    totalPages,
    pageSize,

    // Computed values
    maxPrice,
  };
}

// React Query hook for fetching wishes data
export function useWishesQuery() {
  const { data: session } = useSession();

  return useQuery({
    queryKey: ['wishes'],
    queryFn: async () => {
      if (!session?.user?.id) {
        return { items: [] };
      }

      // Fetch all wishes - users expect to see their full wishlist
      // Default pagination (20) causes items to "disappear" for users with 20+ wishes
      const response = await fetch('/api/wishes?limit=10000');
      if (!response.ok) {
        throw new Error('Failed to fetch wishes');
      }

      const data = (await response.json()) as { items?: Wish[] };

      // Validate API response structure
      if (!data.items || !Array.isArray(data.items)) {
        console.error('Unexpected API response structure:', data);
        return { items: [] };
      }

      return {
        items: data.items.map((w: Wish) => ({
          ...w,
          isOwner: true,
        })),
      };
    },
    enabled: !!session?.user?.id,
    staleTime: 0, // Always consider data stale to ensure fresh data after mutations
    refetchOnMount: true, // Refetch when component mounts
    refetchOnWindowFocus: true, // Refetch on window focus (overrides global config)
  });
}
