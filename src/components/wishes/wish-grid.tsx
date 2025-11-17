'use client';

import { Wish } from '@/lib/validators/api-responses/wishes';

import { Card } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';

import { UnifiedWishCard } from './wish-card-unified';

interface WishGridProps {
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

export function WishGrid({
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
}: WishGridProps) {
  if (isLoading) {
    return (
      <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
        {Array.from({ length: 8 }).map((_, i) => (
          <Card key={i} className="overflow-hidden">
            <Skeleton className="h-48 w-full" />
            <div className="space-y-2 p-4">
              <Skeleton className="h-6 w-3/4" />
              <Skeleton className="h-4 w-1/2" />
              <Skeleton className="h-10 w-full" />
            </div>
          </Card>
        ))}
      </div>
    );
  }

  if (wishes.length === 0) {
    return (
      <div className="py-12 text-center">
        <p className="text-gray-500">No wishes yet</p>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
      {wishes.map((wish, index) => (
        <UnifiedWishCard
          key={wish.id}
          variant="comfortable"
          wish={wish}
          onEdit={onEdit}
          onDelete={onDelete}
          onReserve={onReserve}
          isReserved={reservedWishIds.includes(wish.id)}
          showAddToList={showAddToList}
          priority={index < 4} // Prioritize first 4 images for LCP optimization
          isSelectionMode={isSelectionMode}
          isSelected={selectedWishIds.has(wish.id)}
          onToggleSelection={onToggleSelection}
        />
      ))}
    </div>
  );
}
