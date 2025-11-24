'use client';

import React from 'react';
import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { GripVertical } from 'lucide-react';
import { UnifiedWishCard } from './wish-card-unified';
import { type Wish } from '@/lib/validators/api-responses/wishes';

interface SortableWishCardProps {
  // Layout variant (passed to UnifiedWishCard)
  variant: 'comfortable' | 'compact' | 'list';

  // Wish data and callbacks (passed to UnifiedWishCard)
  wish: Wish & { isOwner?: boolean };
  onEdit?: (wish: Wish) => void;
  onDelete?: (wish: Wish) => void;
  onReserve?: (wish: Wish) => void;
  onAddToList?: (wish: Wish) => void;
  isReserved?: boolean;
  showAddToList?: boolean;
  priority?: boolean;

  // Selection props (passed to UnifiedWishCard)
  isSelectionMode?: boolean;
  isSelected?: boolean;
  onToggleSelection?: (
    wishId: string,
    event?: React.MouseEvent | React.ChangeEvent | React.KeyboardEvent
  ) => void;

  // Sortable-specific prop
  sortable?: boolean;
}

export function SortableWishCard({
  variant,
  wish,
  onEdit,
  onDelete,
  onReserve,
  onAddToList,
  isReserved,
  showAddToList,
  priority,
  isSelectionMode,
  isSelected,
  onToggleSelection,
  sortable = false,
}: SortableWishCardProps) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({
    id: wish.id,
    disabled: !sortable,
  });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  };

  return (
    <div ref={setNodeRef} style={style} className="relative">
      {/* Drag Handle - Only visible when sortable is enabled */}
      {sortable && (
        <button
          type="button"
          className="absolute left-2 top-2 z-10 flex min-h-[56px] min-w-[56px] cursor-grab items-center justify-center rounded-lg border-2 border-primary/30 bg-primary/10 text-primary transition-[background-color,transform] duration-150 hover:bg-primary/20 hover:scale-105 hover:text-accent-foreground active:cursor-grabbing active:scale-95 md:min-h-[48px] md:min-w-[48px]"
          aria-label="Drag to reorder wish"
          {...attributes}
          {...listeners}
        >
          <GripVertical className="h-6 w-6 md:h-5 md:w-5" />
        </button>
      )}

      {/* Wish Card */}
      <UnifiedWishCard
        variant={variant}
        wish={wish}
        onEdit={onEdit}
        onDelete={onDelete}
        onReserve={onReserve}
        onAddToList={onAddToList}
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
