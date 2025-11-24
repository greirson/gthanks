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
}: SortableWishCardProps) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging: isSortableDragging,
  } = useSortable({ id: wish.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    // Remove transition after drop to prevent jarring slide-in effect
    transition: isSortableDragging ? transition : undefined,
    opacity: isSortableDragging ? 0.5 : 1,
    cursor: isDragging ? 'grabbing' : 'grab',
  };

  return (
    <div ref={setNodeRef} style={style} {...attributes} {...listeners}>
      <UnifiedWishCard
        variant="compact"
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
