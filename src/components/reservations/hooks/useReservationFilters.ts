'use client';

import { useCallback, useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import type { ReservationWithWish } from '@/lib/validators/api-responses/reservations';
import { reservationsApi } from '@/lib/api/reservations';
import { useFilterPersistence } from '@/hooks/filters/shared/useFilterPersistence';
import { applySearchFilter } from '@/hooks/filters/shared/searchUtils';
import { countActiveFilters } from '@/hooks/filters/shared/activeFilterCount';
import { useDebounce } from '@/hooks/use-debounce';

// Types for filter/sort functionality
export type DateFilterOption = 'all' | 'thisWeek' | 'thisMonth' | 'older';

export type SortOption = 'recent' | 'oldest' | 'title-asc' | 'title-desc' | 'owner-asc' | 'owner-desc';

export interface FilterState {
  dateFilter: DateFilterOption;
  ownerIds: string[]; // Array of owner IDs to filter by
  purchaseStatus: 'all' | 'active' | 'purchased'; // Filter by purchase status
  sort: SortOption;
  search: string;
  [key: string]: unknown;
}

// LocalStorage key for persisting filters
const FILTER_STORAGE_KEY = 'reservation-filters';

// Default filter state
const DEFAULT_FILTER_STATE: FilterState = {
  dateFilter: 'all',
  ownerIds: [], // Empty array = show all owners
  purchaseStatus: 'all', // Show all reservations by default
  sort: 'recent',
  search: '',
};

export function useReservationFilters(reservations: ReservationWithWish[]) {
  // Ensure reservations is always an array
  const safeReservations = useMemo(() => reservations || [], [reservations]);

  // Extract unique owners from reservations
  const uniqueOwners = useMemo(() => {
    const ownerMap = new Map<string, { id: string; name: string; email: string }>();

    safeReservations.forEach((res) => {
      const owner = res.wish.user;
      if (!ownerMap.has(owner.id)) {
        ownerMap.set(owner.id, {
          id: owner.id,
          name: owner.name || owner.email,
          email: owner.email,
        });
      }
    });

    return Array.from(ownerMap.values());
  }, [safeReservations]);

  // Use shared filter persistence hook (localStorage only, no URL serialization)
  // Exclude 'search' field from persistence - search queries are ephemeral
  const [filterState, setFilterState] = useFilterPersistence<FilterState>({
    storageKey: FILTER_STORAGE_KEY,
    defaultState: DEFAULT_FILTER_STATE,
    fallback: 'memory', // In-memory fallback if localStorage unavailable
    excludeFromPersistence: ['search'], // Don't persist search queries
    onError: (error) => {
      console.warn('Filter persistence failed, using in-memory state:', error);
    },
  });

  // Setter functions
  const setDateFilter = useCallback(
    (dateFilter: DateFilterOption) => {
      setFilterState((prev) => ({ ...prev, dateFilter }));
    },
    [setFilterState]
  );

  const setOwnerFilter = useCallback(
    (ownerIds: string[]) => {
      setFilterState((prev) => ({ ...prev, ownerIds }));
    },
    [setFilterState]
  );

  const setSortOption = useCallback(
    (sort: SortOption) => {
      setFilterState((prev) => ({ ...prev, sort }));
    },
    [setFilterState]
  );

  const setPurchaseStatus = useCallback(
    (purchaseStatus: 'all' | 'active' | 'purchased') => {
      setFilterState((prev) => ({ ...prev, purchaseStatus }));
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
    setFilterState(DEFAULT_FILTER_STATE);
  }, [setFilterState]);

  // Debounce search query to prevent excessive re-renders
  const debouncedSearch = useDebounce(filterState.search, 300);

  // Apply filters
  const filteredReservations = useMemo(() => {
    let filtered = [...safeReservations];

    // Apply search filter (includes title, owner, and URL)
    if (debouncedSearch) {
      filtered = applySearchFilter(
        filtered,
        debouncedSearch,
        (res) => [
          res.wish.title,
          res.wish.user.name || '',
          res.wish.user.email,
          res.wish.user.username || '',
          res.wish.url || '', // Search by product URL
        ]
      );
    }

    // Apply date filter
    if (filterState.dateFilter !== 'all') {
      const now = new Date();
      const oneWeekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
      const oneMonthAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);

      filtered = filtered.filter((res) => {
        const reservedAt = new Date(res.reservedAt);

        switch (filterState.dateFilter) {
          case 'thisWeek':
            return reservedAt >= oneWeekAgo;
          case 'thisMonth':
            return reservedAt >= oneMonthAgo;
          case 'older':
            return reservedAt < oneMonthAgo;
          default:
            return true;
        }
      });
    }

    // Apply owner filter
    if (filterState.ownerIds.length > 0) {
      filtered = filtered.filter((res) =>
        filterState.ownerIds.includes(res.wish.user.id)
      );
    }

    // Apply purchase status filter
    if (filterState.purchaseStatus !== 'all') {
      filtered = filtered.filter((res) => {
        const isPurchased = !!res.purchasedAt;
        return filterState.purchaseStatus === 'purchased' ? isPurchased : !isPurchased;
      });
    }

    // Apply sorting
    switch (filterState.sort) {
      case 'recent':
        filtered.sort((a, b) =>
          new Date(b.reservedAt).getTime() - new Date(a.reservedAt).getTime()
        );
        break;
      case 'oldest':
        filtered.sort((a, b) =>
          new Date(a.reservedAt).getTime() - new Date(b.reservedAt).getTime()
        );
        break;
      case 'title-asc':
        filtered.sort((a, b) => a.wish.title.localeCompare(b.wish.title));
        break;
      case 'title-desc':
        filtered.sort((a, b) => b.wish.title.localeCompare(a.wish.title));
        break;
      case 'owner-asc':
        filtered.sort((a, b) => {
          const aName = a.wish.user.name || a.wish.user.email;
          const bName = b.wish.user.name || b.wish.user.email;
          return aName.localeCompare(bName);
        });
        break;
      case 'owner-desc':
        filtered.sort((a, b) => {
          const aName = a.wish.user.name || a.wish.user.email;
          const bName = b.wish.user.name || b.wish.user.email;
          return bName.localeCompare(aName);
        });
        break;
    }

    return filtered;
  }, [safeReservations, filterState, debouncedSearch]);

  // Count active filters (exclude search and sort)
  const activeFilterCount = useMemo(() => {
    return countActiveFilters(filterState, DEFAULT_FILTER_STATE, ['search', 'sort']);
  }, [filterState]);

  return {
    filterState,
    setDateFilter,
    setOwnerFilter,
    setPurchaseStatus,
    setSortOption,
    setSearchQuery,
    resetFilters,
    filteredReservations,
    activeFilterCount,
    uniqueOwners,
  };
}

// React Query hook for fetching reservations
export function useReservationsQuery() {
  return useQuery({
    queryKey: ['reservations'],
    queryFn: () => reservationsApi.getMyReservations(),
    staleTime: 30_000, // 30 seconds
  });
}
