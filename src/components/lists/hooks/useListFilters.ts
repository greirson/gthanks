'use client';

import { useMemo, useCallback } from 'react';
import { ListWithOwner } from '@/lib/validators/api-responses/lists';
import { useFilterPersistence } from '@/hooks/filters/shared/useFilterPersistence';
import { applySearchFilter } from '@/hooks/filters/shared/searchUtils';
import { countActiveFilters } from '@/hooks/filters/shared/activeFilterCount';

export type VisibilitySelection = ('public' | 'private' | 'password')[];
export type OwnershipFilter = 'all' | 'owned' | 'shared';
export type ItemCountRange = 'all' | 'empty' | 'small' | 'medium' | 'large';
export type ListSortOption = 'newest' | 'oldest' | 'name' | 'items';

export interface ListFilterState {
  search: string;
  visibility: VisibilitySelection;
  ownership: OwnershipFilter;
  itemCount: ItemCountRange;
  sort: ListSortOption;
  [key: string]: unknown;
}

const DEFAULT_FILTER_STATE: ListFilterState = {
  search: '',
  visibility: [],
  ownership: 'all',
  itemCount: 'all',
  sort: 'newest',
};

const STORAGE_KEY = 'list-filters';

export function useListFilters(lists: ListWithOwner[], currentUserId?: string) {
  // Use shared persistence hook for URL + localStorage management
  const [filterState, setFilterState] = useFilterPersistence<ListFilterState>({
    storageKey: STORAGE_KEY,
    defaultState: DEFAULT_FILTER_STATE,
    urlSerializer: {
      toURL: (state) => {
        const params = new URLSearchParams();

        if (state.search) {
          params.set('search', state.search);
        }
        if (state.visibility.length > 0) {
          params.set('visibility', state.visibility.join(','));
        }
        if (state.ownership !== 'all') {
          params.set('ownership', state.ownership);
        }
        if (state.itemCount !== 'all') {
          params.set('itemCount', state.itemCount);
        }
        if (state.sort !== 'newest') {
          params.set('sort', state.sort);
        }

        return params;
      },
      fromURL: (params) => {
        const urlState: Partial<ListFilterState> = {};
        const search = params.get('search');
        const visibility = params.get('visibility');
        const ownership = params.get('ownership');
        const itemCount = params.get('itemCount');
        const sort = params.get('sort');

        if (search) {
          urlState.search = search;
        }
        if (visibility) {
          urlState.visibility = visibility.split(',') as VisibilitySelection;
        }
        if (ownership) {
          urlState.ownership = ownership as OwnershipFilter;
        }
        if (itemCount) {
          urlState.itemCount = itemCount as ItemCountRange;
        }
        if (sort) {
          urlState.sort = sort as ListSortOption;
        }

        return urlState;
      },
    },
  });

  // Filter and sort lists
  const filteredLists = useMemo(() => {
    let filtered = [...lists];

    // Search filter - use shared utility
    filtered = applySearchFilter(filtered, filterState.search, ['name', 'description']);

    // Visibility filter
    if (filterState.visibility.length > 0) {
      filtered = filtered.filter((list) => filterState.visibility.includes(list.visibility));
    }

    // Ownership filter
    if (filterState.ownership !== 'all' && currentUserId) {
      if (filterState.ownership === 'owned') {
        filtered = filtered.filter((list) => list.ownerId === currentUserId);
      } else if (filterState.ownership === 'shared') {
        filtered = filtered.filter((list) => list.ownerId !== currentUserId);
      }
    }

    // Item count filter
    if (filterState.itemCount !== 'all') {
      filtered = filtered.filter((list) => {
        const count = list._count?.listWishes || 0;
        switch (filterState.itemCount) {
          case 'empty':
            return count === 0;
          case 'small':
            return count >= 1 && count <= 5;
          case 'medium':
            return count >= 6 && count <= 15;
          case 'large':
            return count > 15;
          default:
            return true;
        }
      });
    }

    // Sort
    filtered.sort((a, b) => {
      switch (filterState.sort) {
        case 'oldest':
          return new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime();
        case 'name':
          return a.name.localeCompare(b.name);
        case 'items':
          return (b._count?.listWishes || 0) - (a._count?.listWishes || 0);
        case 'newest':
        default:
          return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
      }
    });

    return filtered;
  }, [lists, filterState, currentUserId]);

  // Calculate active filter count - use shared utility
  const activeFilterCount = useMemo(() => {
    return countActiveFilters(filterState, DEFAULT_FILTER_STATE);
  }, [filterState]);

  // Setters
  const setSearch = useCallback(
    (search: string) => {
      setFilterState((prev) => ({ ...prev, search }));
    },
    [setFilterState]
  );

  const setVisibility = useCallback(
    (visibility: VisibilitySelection) => {
      setFilterState((prev) => ({ ...prev, visibility }));
    },
    [setFilterState]
  );

  const setOwnership = useCallback(
    (ownership: OwnershipFilter) => {
      setFilterState((prev) => ({ ...prev, ownership }));
    },
    [setFilterState]
  );

  const setItemCount = useCallback(
    (itemCount: ItemCountRange) => {
      setFilterState((prev) => ({ ...prev, itemCount }));
    },
    [setFilterState]
  );

  const setSortOption = useCallback(
    (sort: ListSortOption) => {
      setFilterState((prev) => ({ ...prev, sort }));
    },
    [setFilterState]
  );

  const resetFilters = useCallback(() => {
    setFilterState(DEFAULT_FILTER_STATE);
  }, [setFilterState]);

  return {
    filteredLists,
    search: filterState.search,
    visibility: filterState.visibility,
    ownership: filterState.ownership,
    itemCount: filterState.itemCount,
    sort: filterState.sort,
    setSearch,
    setVisibility,
    setOwnership,
    setItemCount,
    setSort: setSortOption,
    clearAllFilters: resetFilters,
    activeFilterCount,
  };
}
