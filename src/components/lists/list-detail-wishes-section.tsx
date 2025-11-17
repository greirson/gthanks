'use client';

import { Wish } from '@/lib/validators/api-responses/wishes';
import { WishesDisplay } from '@/components/wishes/wishes-display';
import { WishViewMode } from '@/components/wishes/wish-controls-bar';

interface ListDetailWishesSectionProps {
  wishes: Wish[];
  viewMode: WishViewMode;
  isOwner: boolean;
  isSelectionMode: boolean;
  selectedWishIds: Set<string>;
  reservedWishIds?: string[];
  onEdit?: (wish: Wish) => void;
  onDelete?: (wish: Wish) => void;
  onToggleSelection: (
    wishId: string,
    event?: React.MouseEvent | React.ChangeEvent | React.KeyboardEvent
  ) => void;
}

export function ListDetailWishesSection({
  wishes,
  viewMode,
  isOwner,
  isSelectionMode,
  selectedWishIds,
  reservedWishIds,
  onEdit,
  onDelete,
  onToggleSelection,
}: ListDetailWishesSectionProps) {
  return (
    <WishesDisplay
      wishes={wishes}
      isLoading={false}
      viewMode={viewMode}
      reservedWishIds={reservedWishIds}
      onEdit={isOwner ? onEdit : undefined}
      onDelete={isOwner ? onDelete : undefined}
      isSelectionMode={isSelectionMode}
      selectedWishIds={selectedWishIds}
      onToggleSelection={onToggleSelection}
    />
  );
}
