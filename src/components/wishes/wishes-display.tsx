'use client';

import { Wish } from '@/lib/validators/api-responses/wishes';
import { WishGrid } from '@/components/wishes/wish-grid';
import { WishList } from '@/components/wishes/wish-list';
import { SortableWishGrid } from './SortableWishGrid';
import { SortableWishList } from './SortableWishList';

export type SortOption =
  | 'custom'
  | 'createdAt-desc'
  | 'createdAt-asc'
  | 'wishLevel-desc'
  | 'wishLevel-asc'
  | 'price-desc'
  | 'price-asc';

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
  // Sortable props
  sortMode?: SortOption;
  canEdit?: boolean;
  onReorder?: (wishId: string, newSortOrder: number) => Promise<void>;
  // Hide menu on public pages
  hideMenu?: boolean;
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
  sortMode,
  canEdit = false,
  onReorder,
  hideMenu = false,
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
    hideMenu,
  };

  // Use sortable components only when in custom sort mode with edit permissions
  const useSortable = canEdit && sortMode === 'custom' && onReorder;

  return (
    <div className={className}>
      {viewMode === 'list' ? (
        useSortable ? (
          <SortableWishList {...commonProps} onReorder={onReorder} canEdit={canEdit} />
        ) : (
          <WishList {...commonProps} />
        )
      ) : useSortable ? (
        <SortableWishGrid {...commonProps} onReorder={onReorder} canEdit={canEdit} />
      ) : (
        <WishGrid {...commonProps} />
      )}
    </div>
  );
}
