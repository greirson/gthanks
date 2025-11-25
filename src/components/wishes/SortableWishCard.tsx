'use client';

import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';

import { Wish } from '@/lib/validators/api-responses/wishes';
import { UnifiedWishCard } from './wish-card-unified';

interface SortableWishCardProps {
  wish: Wish & { isOwner?: boolean };
  onEdit?: (wish: Wish) => void;
  onDelete?: (wish: Wish) => void;
  onReserve?: (wish: Wish) => void;
  isReserved?: boolean;
  showAddToList?: boolean;
  priority?: boolean;
  isSelectionMode?: boolean;
  isSelected?: boolean;
  onToggleSelection?: (
    wishId: string,
    event?: React.MouseEvent | React.ChangeEvent | React.KeyboardEvent
  ) => void;
  isDragging?: boolean;
  sortable?: boolean; // Controls whether this is sortable or not
  variant?: 'comfortable' | 'compact'; // Allow variant to be passed in
}

export function SortableWishCard({
  wish,
  onEdit,
  onDelete,
  onReserve,
  isReserved = false,
  showAddToList = false,
  priority = false,
  isSelectionMode = false,
  isSelected = false,
  onToggleSelection,
  isDragging = false,
  sortable = true,
  variant = 'compact',
}: SortableWishCardProps) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging: isSortableDragging,
  } = useSortable({ id: wish.id, disabled: !sortable });

  const style = {
    transform: CSS.Transform.toString(transform),
    // Remove transition after drop to prevent jarring slide-in effect
    transition: isSortableDragging ? transition : undefined,
    opacity: isSortableDragging ? 0.5 : 1,
    cursor: sortable ? (isDragging ? 'grabbing' : 'grab') : undefined,
  };

  return (
    <div ref={setNodeRef} style={style} {...attributes} {...listeners}>
      <UnifiedWishCard
        variant={variant}
        wish={wish}
        onEdit={onEdit}
        onDelete={onDelete}
        onReserve={onReserve}
        isReserved={isReserved}
        showAddToList={showAddToList}
        priority={priority}
        isSelectionMode={isSelectionMode}
        isSelected={isSelected}
        onToggleSelection={onToggleSelection}
      />
    </div>
  );
}
