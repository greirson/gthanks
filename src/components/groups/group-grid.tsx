'use client';

import React from 'react';
import { Users } from 'lucide-react';
import { cn } from '@/lib/utils';
import { GroupWithCountsResponse } from '@/lib/types/api-responses';
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
}

export const GroupGrid = React.memo(function GroupGrid({
  groups,
  currentUserId: _currentUserId,
  onEdit,
  onDelete,
  onManage,
  viewMode = 'grid',
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

  // List view - vertical card layout
  if (viewMode === 'list') {
    return (
      <GroupListView groups={groups} onEdit={onEdit} onDelete={onDelete} onManage={onManage} />
    );
  }

  // Grid view - 2 columns mobile, 4 columns desktop
  return (
    <div
      className={cn(
        'grid gap-3',
        'grid-cols-2', // Mobile: 2 columns
        'md:grid-cols-4' // Desktop: 4 columns
      )}
      role="grid"
      aria-label={`Grid of ${groups.length} groups`}
    >
      {groups.map((group) => (
        <GroupCardCompact
          key={group.id}
          group={group}
          onEdit={onEdit}
          onDelete={onDelete}
          onManage={onManage}
        />
      ))}
    </div>
  );
});
