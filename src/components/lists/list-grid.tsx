'use client';

import React from 'react';
import { Card } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { ListWithDetails } from '@/lib/services/list-service';
import { ListWithOwner } from '@/lib/validators/api-responses/lists';
import { ListCardCompact } from './list-card-compact';
import { ListListView } from './list-list-view';
import { EmptyListState } from './empty-list-state';
import type { ListViewMode } from './list-controls-bar';

interface ListGridProps {
  lists: (ListWithDetails | ListWithOwner)[];
  onEdit?: (list: ListWithDetails | ListWithOwner) => void;
  onDelete?: (list: ListWithDetails | ListWithOwner) => void;
  onShare?: (list: ListWithDetails | ListWithOwner) => void;
  isLoading?: boolean;
  viewMode?: ListViewMode;
  currentUserId?: string;
}

export function ListGrid({
  lists,
  onEdit,
  onDelete,
  onShare,
  isLoading = false,
  viewMode = 'grid',
  currentUserId,
}: ListGridProps) {
  if (isLoading) {
    return (
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {Array.from({ length: 6 }).map((_, i) => (
          <Card key={i} className="overflow-hidden">
            <div className="space-y-3 p-6">
              <div className="space-y-2">
                <Skeleton className="h-6 w-3/4" />
                <Skeleton className="h-4 w-full" />
                <Skeleton className="h-4 w-2/3" />
              </div>
              <div className="flex items-center justify-between">
                <Skeleton className="h-6 w-20" />
                <Skeleton className="h-4 w-16" />
              </div>
              <div className="flex items-center justify-between">
                <Skeleton className="h-3 w-24" />
                <Skeleton className="h-3 w-16" />
              </div>
            </div>
          </Card>
        ))}
      </div>
    );
  }

  if (lists.length === 0) {
    return <EmptyListState />;
  }

  // List view - works great on all screen sizes
  if (viewMode === 'list') {
    return (
      <ListListView
        lists={lists as ListWithOwner[]}
        onEdit={onEdit}
        onDelete={onDelete}
        onShare={onShare}
        currentUserId={currentUserId}
      />
    );
  }

  // Grid view - unified responsive grid: 2 columns mobile, 4 columns desktop
  return (
    <div
      className="grid grid-cols-2 gap-3 md:grid-cols-4"
      role="grid"
      aria-label={`Grid of ${lists.length} lists`}
    >
      {lists.map((list) => (
        <ListCardCompact
          key={list.id}
          list={list as ListWithOwner}
          onEdit={onEdit}
          onDelete={onDelete}
          onShare={onShare}
          currentUserId={currentUserId}
        />
      ))}
    </div>
  );
}
