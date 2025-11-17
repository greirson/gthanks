'use client';

import React from 'react';
import { Users } from 'lucide-react';
import { cn } from '@/lib/utils';
import { GroupWithCountsResponse } from '@/lib/types/api-responses';
import { GroupCard } from './group-card-accessible';
import { GroupCardCompact } from './group-card-compact';
import { GroupListView } from './group-list-view';
import type { GroupViewMode } from './group-controls-bar';

interface GroupGridProps {
  groups: GroupWithCountsResponse[];
  currentUserId?: string;
  onEdit?: (group: GroupWithCountsResponse) => void;
  onDelete?: (group: GroupWithCountsResponse) => void;
  onManage?: (group: GroupWithCountsResponse) => void;
  viewMode?: GroupViewMode;
  isFilterOpen?: boolean;
}

export const GroupGrid = React.memo(function GroupGrid({
  groups,
  currentUserId: _currentUserId,
  onEdit,
  onDelete,
  onManage,
  viewMode = 'compact',
  isFilterOpen = false,
}: GroupGridProps) {
  if (groups.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-16 text-center">
        <div className="mb-4 rounded-full bg-muted p-4">
          <Users className="h-8 w-8 text-muted-foreground" />
        </div>
        <h3 className="mb-2 text-lg font-semibold">No groups yet</h3>
        <p className="mx-auto max-w-sm text-sm text-muted-foreground">
          You haven&apos;t joined any groups yet. Create a new group or wait for an invitation to
          get started.
        </p>
      </div>
    );
  }

  // List view - works great on all screen sizes
  if (viewMode === 'list') {
    return (
      <GroupListView groups={groups} onEdit={onEdit} onDelete={onDelete} onManage={onManage} />
    );
  }

  // Grid views - responsive with filter awareness
  const getGridClasses = () => {
    if (viewMode === 'compact') {
      // Compact grid - more items per row
      if (isFilterOpen) {
        // When filter is open on desktop, reduce columns
        return cn(
          'grid gap-3',
          'grid-cols-1', // Mobile: always 1 column
          'sm:grid-cols-2', // Small tablets: 2 columns
          'lg:grid-cols-2', // Desktop with filter: 2 columns
          'xl:grid-cols-3' // Large desktop with filter: 3 columns
        );
      }
      return cn(
        'grid gap-3',
        'grid-cols-1', // Mobile: always 1 column
        'sm:grid-cols-2', // Small tablets: 2 columns
        'md:grid-cols-2', // Medium: 2 columns
        'lg:grid-cols-3', // Desktop: 3 columns
        'xl:grid-cols-4' // Large desktop: 4 columns
      );
    } else {
      // Comfortable grid - fewer items, more space
      if (isFilterOpen) {
        return cn(
          'grid gap-4',
          'grid-cols-1', // Mobile: always 1 column
          'sm:grid-cols-1', // Small tablets: 1 column
          'lg:grid-cols-2', // Desktop with filter: 2 columns
          'xl:grid-cols-2' // Large desktop with filter: 2 columns
        );
      }
      return cn(
        'grid gap-4',
        'grid-cols-1', // Mobile: always 1 column
        'sm:grid-cols-1', // Small tablets: 1 column
        'md:grid-cols-2', // Medium: 2 columns
        'lg:grid-cols-3', // Desktop: 3 columns
        'xl:grid-cols-3' // Large desktop: 3 columns
      );
    }
  };

  return (
    <div className={getGridClasses()} role="grid" aria-label={`Grid of ${groups.length} groups`}>
      {groups.map((group) =>
        viewMode === 'compact' ? (
          <GroupCardCompact
            key={group.id}
            group={group}
            onEdit={onEdit}
            onDelete={onDelete}
            onManage={onManage}
            viewMode="compact"
          />
        ) : (
          <GroupCard
            key={group.id}
            group={group}
            currentUserRole={group.currentUserRole || undefined}
            onEdit={onEdit}
            onDelete={onDelete}
            onManage={onManage}
          />
        )
      )}
    </div>
  );
});
