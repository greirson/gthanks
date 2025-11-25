'use client';

import { Wish } from '@/lib/validators/api-responses/wishes';

import { Skeleton } from '@/components/ui/skeleton';

import { UnifiedWishCard } from './wish-card-unified';

export interface WishListProps {
  wishes: (Wish & { isOwner?: boolean })[];
  isLoading?: boolean;
  onEdit?: (wish: Wish) => void;
  onDelete?: (wish: Wish) => void;
  onReserve?: (wish: Wish) => void;
  onAddToList?: (wish: Wish) => void;
  reservedWishIds?: string[];
  showAddToList?: boolean;
  // Selection props
  isSelectionMode?: boolean;
  selectedWishIds?: Set<string>;
  onToggleSelection?: (
    wishId: string,
    event?: React.MouseEvent | React.ChangeEvent | React.KeyboardEvent
  ) => void;
  // Hide menu on public pages
  hideMenu?: boolean;
}

export function WishList({
  wishes,
  isLoading,
  onEdit,
  onDelete,
  onReserve,
  onAddToList,
  reservedWishIds = [],
  showAddToList = false,
  isSelectionMode = false,
  selectedWishIds = new Set(),
  onToggleSelection,
  hideMenu = false,
}: WishListProps) {
  if (isLoading) {
    return (
      <div className="space-y-3">
        {Array.from({ length: 6 }).map((_, i) => (
          <div key={i} className="flex gap-4 rounded-lg border p-4">
            <Skeleton className="h-16 w-16 rounded sm:h-20 sm:w-20" />
            <div className="flex-1 space-y-2">
              <Skeleton className="h-5 w-3/4" />
              <Skeleton className="h-4 w-1/2" />
              <Skeleton className="h-4 w-1/4" />
            </div>
          </div>
        ))}
      </div>
    );
  }

  if (wishes.length === 0) {
    return (
      <div className="rounded-lg border-2 border-dashed border-gray-200 p-12 text-center dark:border-gray-700">
        <div className="mx-auto mb-4 text-4xl">✨</div>
        <h3 className="mb-2 text-lg font-medium text-gray-900 dark:text-gray-100">No wishes yet</h3>
        <p className="text-sm text-gray-500 dark:text-gray-400">
          Create your first wish to start building your wishlist.
        </p>
      </div>
    );
  }

  return (
    <div className="divide-y rounded-lg border bg-card">
      {wishes.map((wish, index) => (
        <UnifiedWishCard
          key={wish.id}
          variant="list"
          wish={wish}
          onEdit={onEdit}
          onDelete={onDelete}
          onReserve={onReserve}
          onAddToList={onAddToList}
          isReserved={reservedWishIds.includes(wish.id)}
          showAddToList={showAddToList}
          priority={index < 4} // Prioritize first 4 items for loading
          isSelectionMode={isSelectionMode}
          isSelected={selectedWishIds.has(wish.id)}
          onToggleSelection={onToggleSelection}
          hideMenu={hideMenu}
        />
      ))}
    </div>
  );
}
