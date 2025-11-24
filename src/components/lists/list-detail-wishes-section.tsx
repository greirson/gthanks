'use client';

import { Wish } from '@/lib/validators/api-responses/wishes';
import { WishesDisplay, type SortOption as DisplaySortOption } from '@/components/wishes/wishes-display';
import { WishViewMode } from '@/components/wishes/wish-controls-bar';

interface ListDetailWishesSectionProps {
  wishes: Wish[];
  viewMode: WishViewMode;
  isOwner: boolean;
  isSelectionMode: boolean;
  selectedWishIds: Set<string>;
  reservedWishIds?: string[];
  sortMode?: string;
  onEdit?: (wish: Wish) => void;
  onDelete?: (wish: Wish) => void;
  onToggleSelection: (
    wishId: string,
    event?: React.MouseEvent | React.ChangeEvent | React.KeyboardEvent
  ) => void;
  onReorder?: (wishId: string, newSortOrder: number) => Promise<void>;
}

export function ListDetailWishesSection({
  wishes,
  viewMode,
  isOwner,
  isSelectionMode,
  selectedWishIds,
  reservedWishIds,
  sortMode,
  onEdit,
  onDelete,
  onToggleSelection,
  onReorder,
}: ListDetailWishesSectionProps) {
  return (
    <WishesDisplay
      wishes={wishes}
      isLoading={false}
      viewMode={viewMode}
      reservedWishIds={reservedWishIds}
      sortMode={sortMode as DisplaySortOption}
      canEdit={isOwner}
      onEdit={isOwner ? onEdit : undefined}
      onDelete={isOwner ? onDelete : undefined}
      onReorder={isOwner ? onReorder : undefined}
      isSelectionMode={isSelectionMode}
      selectedWishIds={selectedWishIds}
      onToggleSelection={onToggleSelection}
    />
  );
}
