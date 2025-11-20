'use client';

import { Wish } from '@/lib/validators/api-responses/wishes';
import { WishGrid } from '@/components/wishes/wish-grid';
import { WishList } from '@/components/wishes/wish-list';

interface WishesDisplayProps {
  wishes: (Wish & { isOwner?: boolean })[];
  onEdit?: (wish: Wish) => void;
  onDelete?: (wish: Wish) => void;
  onReserve?: (wish: Wish) => void;
  onAddToList?: (wish: Wish) => void;
  reservedWishIds?: string[];
  isLoading?: boolean;
  showAddToList?: boolean;
  className?: string;
  // View mode prop - binary choice between list and grid
  viewMode?: 'list' | 'grid';
  // Selection props
  isSelectionMode?: boolean;
  selectedWishIds?: Set<string>;
  onToggleSelection?: (
    wishId: string,
    event?: React.MouseEvent | React.ChangeEvent | React.KeyboardEvent
  ) => void;
}

export function WishesDisplay({
  wishes,
  onEdit,
  onDelete,
  onReserve,
  onAddToList,
  reservedWishIds = [],
  isLoading = false,
  showAddToList = false,
  className,
  viewMode = 'grid',
  isSelectionMode = false,
  selectedWishIds = new Set(),
  onToggleSelection,
}: WishesDisplayProps) {
  const commonProps = {
    wishes,
    onEdit,
    onDelete,
    onReserve,
    onAddToList,
    reservedWishIds,
    isLoading,
    showAddToList,
    isSelectionMode,
    selectedWishIds,
    onToggleSelection,
  };

  return (
    <div className={className}>
      {viewMode === 'list' ? <WishList {...commonProps} /> : <WishGrid {...commonProps} />}
    </div>
  );
}
