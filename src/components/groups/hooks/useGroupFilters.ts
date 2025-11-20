'use client';

import { useMemo, useCallback } from 'react';
import type { GroupWithCountsResponse } from '@/lib/types/api-responses';
import { useFilterPersistence } from '@/hooks/filters/shared/useFilterPersistence';
import { applySearchFilter } from '@/hooks/filters/shared/searchUtils';
import { countActiveFilters } from '@/hooks/filters/shared/activeFilterCount';

// Filter state types
export interface GroupFilterState {
  search: string;
  selectedMembers: string[];
  showAdminOnly: boolean;
}

// Enhanced group type with current user role
export interface GroupWithRole extends GroupWithCountsResponse {
  currentUserRole?: 'admin' | 'member' | null;
}

const DEFAULT_FILTER_STATE: GroupFilterState = {
  search: '',
  selectedMembers: [],
  showAdminOnly: false,
};

const STORAGE_KEY = 'group-filters';

export function useGroupFilters(
  groups: GroupWithRole[] = [],
  initialMembers?: Array<{ id: string; name: string | null; email: string }>
) {
  // Use shared persistence hook for URL + localStorage management
  const [filterState, setFilterState] = useFilterPersistence<GroupFilterState>({
    storageKey: STORAGE_KEY,
    defaultState: DEFAULT_FILTER_STATE,
    urlSerializer: {
      toURL: (state) => {
        const params = new URLSearchParams();

        if (state.search) {
          params.set('search', state.search);
        }
        if (state.selectedMembers.length > 0) {
          params.set('members', state.selectedMembers.join(','));
        }
        if (state.showAdminOnly) {
          params.set('adminOnly', 'true');
        }

        return params;
      },
      fromURL: (params) => {
        const urlState: Partial<GroupFilterState> = {};
        const search = params.get('search');
        const members = params.get('members');
        const adminOnly = params.get('adminOnly');

        if (search) {
          urlState.search = search;
        }
        if (members) {
          urlState.selectedMembers = members.split(',').filter(Boolean);
        }
        if (adminOnly === 'true') {
          urlState.showAdminOnly = true;
        }

        return urlState;
      },
    },
  });

  // Filter groups
  const filteredGroups = useMemo(() => {
    let result = [...groups];

    // Search filter - use shared utility
    result = applySearchFilter(result, filterState.search, ['name', 'description']);

    // Member filter (AND logic - group must contain ALL selected members)
    if (filterState.selectedMembers.length > 0 && initialMembers) {
      // This would require additional data about group members
      // For now, we'll skip this filter as it needs backend support
      // TODO: Implement when group member data is available
    }

    // Admin only filter
    if (filterState.showAdminOnly) {
      result = result.filter((group) => group.currentUserRole === 'admin');
    }

    return result;
  }, [groups, filterState, initialMembers]);

  // Calculate active filter count - use shared utility
  const activeFilterCount = useMemo(() => {
    return countActiveFilters(filterState, DEFAULT_FILTER_STATE);
  }, [filterState]);

  // Filter update functions
  const setSearch = useCallback(
    (search: string) => {
      setFilterState((prev) => ({ ...prev, search }));
    },
    [setFilterState]
  );

  const setSelectedMembers = useCallback(
    (selectedMembers: string[]) => {
      setFilterState((prev) => ({ ...prev, selectedMembers }));
    },
    [setFilterState]
  );

  const setShowAdminOnly = useCallback(
    (showAdminOnly: boolean) => {
      setFilterState((prev) => ({ ...prev, showAdminOnly }));
    },
    [setFilterState]
  );

  // Reset filters
  const resetFilters = useCallback(() => {
    setFilterState(DEFAULT_FILTER_STATE);
  }, [setFilterState]);

  // Check if filters are active
  const hasActiveFilters = activeFilterCount > 0;

  return {
    // State
    filterState,
    filteredGroups,
    activeFilterCount,
    hasActiveFilters,

    // Update functions
    setSearch,
    setSelectedMembers,
    setShowAdminOnly,
    resetFilters,
  };
}
