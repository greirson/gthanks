'use client';

import React from 'react';
import { cn } from '@/lib/utils';
import { Card } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { ListWithDetails } from '@/lib/services/list-service';
import { ListWithOwner } from '@/lib/validators/api-responses/lists';
import { ListCard } from './list-card';
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
  isFilterOpen?: boolean;
  currentUserId?: string;
}

export function ListGrid({
  lists,
  onEdit,
  onDelete,
  onShare,
  isLoading = false,
  viewMode = 'compact',
  isFilterOpen = false,
  currentUserId,
}: ListGridProps) {
  if (isLoading) {
    return (
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {[...Array(6)].map((_, i) => (
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
    <div className={getGridClasses()} role="grid" aria-label={`Grid of ${lists.length} lists`}>
      {lists.map((list) =>
        viewMode === 'compact' ? (
          <ListCardCompact
            key={list.id}
            list={list as ListWithOwner}
            onEdit={onEdit}
            onDelete={onDelete}
            onShare={onShare}
            viewMode="compact"
            currentUserId={currentUserId}
          />
        ) : (
          <ListCard
            key={list.id}
            list={list as ListWithDetails}
            onEdit={onEdit}
            onDelete={onDelete}
            onShare={onShare}
          />
        )
      )}
    </div>
  );
}
