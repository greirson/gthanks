'use client';

import { Wish } from '@/lib/validators/api-responses/wishes';

import { Card } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';

import { UnifiedWishCard } from './wish-card-unified';

interface WishSmallGridProps {
  wishes: (Wish & { isOwner?: boolean })[];
  onEdit?: (wish: Wish) => void;
  onDelete?: (wish: Wish) => void;
  onReserve?: (wish: Wish) => void;
  reservedWishIds?: string[];
  isLoading?: boolean;
  showAddToList?: boolean;
  // Selection props
  isSelectionMode?: boolean;
  selectedWishIds?: Set<string>;
  onToggleSelection?: (
    wishId: string,
    event?: React.MouseEvent | React.ChangeEvent | React.KeyboardEvent
  ) => void;
}

export function WishSmallGrid({
  wishes,
  onEdit,
  onDelete,
  onReserve,
  reservedWishIds = [],
  isLoading = false,
  showAddToList = false,
  isSelectionMode = false,
  selectedWishIds = new Set(),
  onToggleSelection,
}: WishSmallGridProps) {
  if (isLoading) {
    return (
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5">
        {Array.from({ length: 10 }).map((_, i) => (
          <Card key={i} className="overflow-hidden">
            <Skeleton className="aspect-square w-full" />
            <div className="space-y-1 p-3">
              <Skeleton className="h-4 w-full" />
              <Skeleton className="h-3 w-3/4" />
              <Skeleton className="h-6 w-1/2" />
            </div>
          </Card>
        ))}
      </div>
    );
  }

  if (wishes.length === 0) {
    return (
      <div className="rounded-lg border-2 border-dashed border-gray-200 p-12 text-center">
        <div className="mx-auto mb-4 text-4xl">✨</div>
        <h3 className="mb-2 text-lg font-medium text-gray-900">No wishes yet</h3>
        <p className="text-sm text-gray-500">
          Create your first wish to start building your wishlist.
        </p>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5">
      {wishes.map((wish, index) => (
        <UnifiedWishCard
          key={wish.id}
          variant="compact"
          wish={wish}
          onEdit={onEdit}
          onDelete={onDelete}
          onReserve={onReserve}
          isReserved={reservedWishIds.includes(wish.id)}
          showAddToList={showAddToList}
          priority={index < 6} // Prioritize first 6 images for small grid
          isSelectionMode={isSelectionMode}
          isSelected={selectedWishIds.has(wish.id)}
          onToggleSelection={onToggleSelection}
        />
      ))}
    </div>
  );
}
