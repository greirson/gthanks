'use client';

import { useState, useCallback } from 'react';
import { useQuery } from '@tanstack/react-query';
import { GroupWithCountsResponse } from '@/lib/types/api-responses';
import { useGroupFilters, GroupWithRole } from '@/components/groups/hooks/useGroupFilters';
import { GroupGrid } from '@/components/groups/group-grid';
import { GroupFilterPanel } from '@/components/groups/filters/GroupFilterPanel';
import { MobileGroupFilterSheet } from '@/components/groups/filters/MobileGroupFilterSheet';
import { Button } from '@/components/ui/button';
import { Filter, X } from 'lucide-react';
import { cn } from '@/lib/utils';

interface FilteredGroupsDisplayProps {
  groups: GroupWithCountsResponse[];
  onEdit?: (group: GroupWithCountsResponse) => void;
  onDelete?: (group: GroupWithCountsResponse) => void;
  onManage?: (group: GroupWithCountsResponse) => void;
  className?: string;
  showFilters?: boolean;
  compactFilters?: boolean;
}

interface UniqueMember {
  id: string;
  name: string | null;
  email: string;
  avatarUrl: string | null;
  groupCount: number;
}

export function FilteredGroupsDisplay({
  groups,
  onEdit,
  onDelete,
  onManage,
  className,
  showFilters = true,
  compactFilters = false,
}: FilteredGroupsDisplayProps) {
  const [isDesktopFilterOpen, setIsDesktopFilterOpen] = useState(!compactFilters);
  const [isMobileFilterOpen, setIsMobileFilterOpen] = useState(false);

  // Fetch unique members for member filtering
  const { data: membersData } = useQuery<{ members: UniqueMember[] }>({
    queryKey: ['groups', 'members', 'unique'],
    queryFn: async () => {
      const response = await fetch('/api/groups/members/unique');
      if (!response.ok) {
        throw new Error('Failed to fetch members');
      }
      return response.json();
    },
    enabled: showFilters,
  });

  const uniqueMembers = membersData?.members || [];

  // Enhance groups with current user role (if available)
  // This would come from the API in a real implementation
  const groupsWithRole: GroupWithRole[] = groups.map((group) => ({
    ...group,
    // TODO: Get actual user role from API or context
    currentUserRole: 'member' as 'admin' | 'member',
  }));

  // Use the filter hook
  const {
    filterState,
    filteredGroups,
    activeFilterCount,
    hasActiveFilters,
    setSearch,
    setSelectedMembers,
    setShowAdminOnly,
    resetFilters,
  } = useGroupFilters(groupsWithRole, uniqueMembers);

  const handleClearFilters = useCallback(() => {
    resetFilters();
  }, [resetFilters]);

  // If filters are disabled, just render the grid directly
  if (!showFilters) {
    return <GroupGrid groups={groups} onEdit={onEdit} onDelete={onDelete} onManage={onManage} />;
  }

  return (
    <div className={cn('flex flex-col gap-6 lg:flex-row', className)}>
      {/* Desktop Filter Panel */}
      <div className="hidden lg:block">
        <div
          className={cn(
            'sticky top-20 transition-all duration-300',
            isDesktopFilterOpen ? 'w-80' : 'w-12'
          )}
        >
          {isDesktopFilterOpen ? (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="font-semibold">Filters</h3>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => setIsDesktopFilterOpen(false)}
                  className="h-8 w-8"
                >
                  <X className="h-4 w-4" />
                </Button>
              </div>
              <GroupFilterPanel
                search={filterState.search}
                selectedMembers={filterState.selectedMembers}
                availableMembers={uniqueMembers}
                showAdminOnly={filterState.showAdminOnly}
                onSearchChange={setSearch}
                onMembersChange={setSelectedMembers}
                onShowAdminOnlyChange={setShowAdminOnly}
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

        {/* Results Count */}
        <div className="mb-4 text-sm text-muted-foreground">
          {filteredGroups.length === groups.length ? (
            <span>
              {groups.length} {groups.length === 1 ? 'group' : 'groups'}
            </span>
          ) : (
            <span>
              Showing {filteredGroups.length} of {groups.length} groups
              {hasActiveFilters && (
                <button onClick={handleClearFilters} className="ml-2 text-primary hover:underline">
                  Clear filters
                </button>
              )}
            </span>
          )}
        </div>

        {/* Groups Display or Empty State */}
        {filteredGroups.length === 0 ? (
          <div className="rounded-lg border border-dashed p-8 text-center">
            <p className="text-muted-foreground">
              {hasActiveFilters ? 'No groups match your filters' : 'No groups found'}
            </p>
            {hasActiveFilters && (
              <Button variant="outline" size="sm" onClick={handleClearFilters} className="mt-4">
                Clear filters
              </Button>
            )}
          </div>
        ) : (
          <GroupGrid
            groups={filteredGroups}
            onEdit={onEdit}
            onDelete={onDelete}
            onManage={onManage}
          />
        )}
      </div>

      {/* Mobile Filter Sheet */}
      <MobileGroupFilterSheet
        open={isMobileFilterOpen}
        onOpenChange={setIsMobileFilterOpen}
        search={filterState.search}
        selectedMembers={filterState.selectedMembers}
        availableMembers={uniqueMembers}
        showAdminOnly={filterState.showAdminOnly}
        onSearchChange={setSearch}
        onMembersChange={setSelectedMembers}
        onShowAdminOnlyChange={setShowAdminOnly}
        onClearAll={handleClearFilters}
        activeFilterCount={activeFilterCount}
      />
    </div>
  );
}
