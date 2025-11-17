'use client';

import { Wish } from '@/lib/validators/api-responses/wishes';
import { WishGrid } from '@/components/wishes/wish-grid';
import { WishList } from '@/components/wishes/wish-list';
import { WishSmallGrid } from '@/components/wishes/wish-small-grid';

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
  // View mode prop - when provided, overrides internal state
  viewMode?: 'list' | 'compact' | 'comfortable';
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
  viewMode = 'comfortable',
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

  const renderWishesView = () => {
    switch (viewMode) {
      case 'list':
        return <WishList {...commonProps} />;
      case 'compact':
        return <WishSmallGrid {...commonProps} />;
      case 'comfortable':
      default:
        return <WishGrid {...commonProps} />;
    }
  };

  return <div className={className}>{renderWishesView()}</div>;
}
