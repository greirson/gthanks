'use client';

import { useState } from 'react';
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  DragEndEvent,
} from '@dnd-kit/core';
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  verticalListSortingStrategy,
  useSortable,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { restrictToVerticalAxis } from '@dnd-kit/modifiers';

import { Wish } from '@/lib/validators/api-responses/wishes';
import { calculateNewSortOrder } from '@/lib/utils/fractional-indexing-client';

import { WishList, WishListProps } from './wish-list';
import { UnifiedWishCard } from './wish-card-unified';
import { Skeleton } from '@/components/ui/skeleton';

// Extend Wish type to include sortOrder
type WishWithSort = Wish & { sortOrder?: number | null; isOwner?: boolean };

interface SortableWishListProps extends Omit<WishListProps, 'wishes'> {
  wishes: WishWithSort[];
  onReorder: (wishId: string, newSortOrder: number) => Promise<void>;
  canEdit: boolean;
}

// Sortable wrapper for individual wish items
interface SortableWishItemProps {
  wish: WishWithSort;
  index: number;
  onEdit?: (wish: Wish) => void;
  onDelete?: (wish: Wish) => void;
  onReserve?: (wish: Wish) => void;
  onAddToList?: (wish: Wish) => void;
  isReserved: boolean;
  showAddToList: boolean;
  isSelectionMode: boolean;
  isSelected: boolean;
  onToggleSelection?: (
    wishId: string,
    event?: React.MouseEvent | React.ChangeEvent | React.KeyboardEvent
  ) => void;
}

function SortableWishItem({
  wish,
  index,
  onEdit,
  onDelete,
  onReserve,
  onAddToList,
  isReserved,
  showAddToList,
  isSelectionMode,
  isSelected,
  onToggleSelection,
}: SortableWishItemProps) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: wish.id,
  });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  };

  return (
    <div ref={setNodeRef} style={style} {...attributes} {...listeners}>
      <UnifiedWishCard
        variant="list"
        wish={wish}
        onEdit={onEdit}
        onDelete={onDelete}
        onReserve={onReserve}
        onAddToList={onAddToList}
        isReserved={isReserved}
        showAddToList={showAddToList}
        priority={index < 4}
        isSelectionMode={isSelectionMode}
        isSelected={isSelected}
        onToggleSelection={onToggleSelection}
      />
    </div>
  );
}

export function SortableWishList({
  wishes,
  isLoading,
  onEdit,
  onDelete,
  onReserve,
  onAddToList,
  onReorder,
  canEdit,
  reservedWishIds = [],
  showAddToList = false,
  isSelectionMode = false,
  selectedWishIds = new Set(),
  onToggleSelection,
}: SortableWishListProps) {
  const [activeId, setActiveId] = useState<string | null>(null);
  const [localWishes, setLocalWishes] = useState<WishWithSort[]>(wishes);

  // Update local wishes when props change
  if (wishes !== localWishes) {
    setLocalWishes(wishes);
  }

  // Configure sensors for touch and keyboard
  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 8, // 8px threshold for touch-friendly dragging
      },
    }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  // If not editable, render regular WishList
  if (!canEdit) {
    return (
      <WishList
        wishes={wishes}
        isLoading={isLoading}
        onEdit={onEdit}
        onDelete={onDelete}
        onReserve={onReserve}
        onAddToList={onAddToList}
        reservedWishIds={reservedWishIds}
        showAddToList={showAddToList}
        isSelectionMode={isSelectionMode}
        selectedWishIds={selectedWishIds}
        onToggleSelection={onToggleSelection}
      />
    );
  }

  const handleDragStart = (event: { active: { id: string } }) => {
    setActiveId(event.active.id);
  };

  const handleDragEnd = async (event: DragEndEvent) => {
    const { active, over } = event;

    setActiveId(null);

    if (!over || active.id === over.id) {
      return;
    }

    const oldIndex = localWishes.findIndex((w) => w.id === active.id);
    const newIndex = localWishes.findIndex((w) => w.id === over.id);

    if (oldIndex === -1 || newIndex === -1) {
      return;
    }

    // Optimistically update UI
    const reorderedWishes = arrayMove(localWishes, oldIndex, newIndex);
    setLocalWishes(reorderedWishes);

    // Calculate new sortOrder using fractional indexing
    const prevOrder = newIndex > 0 ? reorderedWishes[newIndex - 1].sortOrder ?? null : null;
    const nextOrder =
      newIndex < reorderedWishes.length - 1 ? reorderedWishes[newIndex + 1].sortOrder ?? null : null;

    const newSortOrder = calculateNewSortOrder(prevOrder, nextOrder);

    // Call onReorder callback
    try {
      await onReorder(active.id as string, newSortOrder);
    } catch (error) {
      // Revert optimistic update on error
      console.error('Failed to reorder wish:', error);
      setLocalWishes(wishes);
    }
  };

  const handleDragCancel = () => {
    setActiveId(null);
  };

  // Loading state
  if (isLoading) {
    return (
      <div className="space-y-3">
        {Array.from({ length: 6 }).map((_, i) => (
          <div key={i} className="flex gap-4 rounded-lg border p-4">
            <Skeleton className="h-16 w-16 rounded sm:h-20 sm:w-20" />
            <div className="flex-1 space-y-2">
              <Skeleton className="h-5 w-3/4" />
              <Skeleton className="h-4 w-1/2" />
              <Skeleton className="h-4 w-1/4" />
            </div>
          </div>
        ))}
      </div>
    );
  }

  // Empty state
  if (localWishes.length === 0) {
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
    <DndContext
      sensors={sensors}
      collisionDetection={closestCenter}
      modifiers={[restrictToVerticalAxis]}
      onDragStart={handleDragStart}
      onDragEnd={handleDragEnd}
      onDragCancel={handleDragCancel}
    >
      <SortableContext items={localWishes.map((w) => w.id)} strategy={verticalListSortingStrategy}>
        <div className="divide-y rounded-lg border bg-card">
          {localWishes.map((wish, index) => (
            <SortableWishItem
              key={wish.id}
              wish={wish}
              index={index}
              onEdit={onEdit}
              onDelete={onDelete}
              onReserve={onReserve}
              onAddToList={onAddToList}
              isReserved={reservedWishIds.includes(wish.id)}
              showAddToList={showAddToList}
              isSelectionMode={isSelectionMode}
              isSelected={selectedWishIds.has(wish.id)}
              onToggleSelection={onToggleSelection}
            />
          ))}
        </div>
      </SortableContext>
    </DndContext>
  );
}
