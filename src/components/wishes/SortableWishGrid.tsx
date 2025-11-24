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
  DragStartEvent,
} from '@dnd-kit/core';
import {
  SortableContext,
  rectSwappingStrategy,
  sortableKeyboardCoordinates,
} from '@dnd-kit/sortable';

import { Wish } from '@/lib/validators/api-responses/wishes';
import { calculateNewSortOrder } from '@/lib/utils/fractional-indexing-client';

import { WishGrid, WishGridProps } from './wish-grid';
import { SortableWishCard } from './SortableWishCard';

interface SortableWishGridProps extends Omit<WishGridProps, 'wishes'> {
  wishes: (Wish & { sortOrder?: number })[];
  onReorder: (wishId: string, newSortOrder: number) => Promise<void>;
  canEdit: boolean;
}

export function SortableWishGrid({
  wishes,
  onReorder,
  canEdit,
  onEdit,
  onDelete,
  onReserve,
  reservedWishIds = [],
  isLoading = false,
  showAddToList = false,
  isSelectionMode = false,
  selectedWishIds = new Set(),
  onToggleSelection,
}: SortableWishGridProps) {
  const [activeId, setActiveId] = useState<string | null>(null);

  // Configure sensors for drag-and-drop
  const sensors = useSensors(
    // Pointer sensor with 8px activation distance (prevents accidental drags)
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 8,
      },
    }),
    // Keyboard sensor for accessibility
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  // If not editable, render regular WishGrid
  if (!canEdit) {
    return (
      <WishGrid
        wishes={wishes}
        onEdit={onEdit}
        onDelete={onDelete}
        onReserve={onReserve}
        reservedWishIds={reservedWishIds}
        isLoading={isLoading}
        showAddToList={showAddToList}
        isSelectionMode={isSelectionMode}
        selectedWishIds={selectedWishIds}
        onToggleSelection={onToggleSelection}
      />
    );
  }

  const handleDragStart = (event: DragStartEvent) => {
    setActiveId(event.active.id as string);
  };

  const handleDragEnd = async (event: DragEndEvent) => {
    const { active, over } = event;

    setActiveId(null);

    // No drop target or dropped on itself
    if (!over || active.id === over.id) {
      return;
    }

    const activeId = active.id as string;
    const overId = over.id as string;

    // Find current positions
    const activeIndex = wishes.findIndex((w) => w.id === activeId);
    const overIndex = wishes.findIndex((w) => w.id === overId);

    if (activeIndex === -1 || overIndex === -1) {
      return;
    }

    // Calculate new sortOrder using fractional indexing
    let newSortOrder: number;

    if (overIndex === 0) {
      // Moving to first position
      const nextOrder = wishes[0].sortOrder ?? 1.0;
      newSortOrder = calculateNewSortOrder(null, nextOrder);
    } else if (overIndex === wishes.length - 1) {
      // Moving to last position
      const prevOrder = wishes[wishes.length - 1].sortOrder ?? wishes.length;
      newSortOrder = calculateNewSortOrder(prevOrder, null);
    } else {
      // Moving between two items
      const targetIndex = overIndex > activeIndex ? overIndex : overIndex - 1;
      const prevOrder = wishes[targetIndex].sortOrder ?? targetIndex + 1;
      const nextOrder = wishes[targetIndex + 1].sortOrder ?? targetIndex + 2;
      newSortOrder = calculateNewSortOrder(prevOrder, nextOrder);
    }

    // Call the reorder callback
    try {
      await onReorder(activeId, newSortOrder);
    } catch (error) {
      console.error('Failed to reorder wish:', error);
      // Parent component should handle error display
    }
  };

  const handleDragCancel = () => {
    setActiveId(null);
  };

  // Loading state
  if (isLoading) {
    return (
      <WishGrid
        wishes={[]}
        isLoading={true}
        onEdit={onEdit}
        onDelete={onDelete}
        onReserve={onReserve}
        reservedWishIds={reservedWishIds}
        showAddToList={showAddToList}
        isSelectionMode={isSelectionMode}
        selectedWishIds={selectedWishIds}
        onToggleSelection={onToggleSelection}
      />
    );
  }

  // Empty state
  if (wishes.length === 0) {
    return (
      <WishGrid
        wishes={[]}
        onEdit={onEdit}
        onDelete={onDelete}
        onReserve={onReserve}
        reservedWishIds={reservedWishIds}
        showAddToList={showAddToList}
        isSelectionMode={isSelectionMode}
        selectedWishIds={selectedWishIds}
        onToggleSelection={onToggleSelection}
      />
    );
  }

  return (
    <DndContext
      sensors={sensors}
      collisionDetection={closestCenter}
      onDragStart={handleDragStart}
      onDragEnd={handleDragEnd}
      onDragCancel={handleDragCancel}
    >
      <SortableContext items={wishes.map((w) => w.id)} strategy={rectSwappingStrategy}>
        <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
          {wishes.map((wish, index) => (
            <SortableWishCard
              key={wish.id}
              wish={wish}
              onEdit={onEdit}
              onDelete={onDelete}
              onReserve={onReserve}
              isReserved={reservedWishIds.includes(wish.id)}
              showAddToList={showAddToList}
              priority={index < 6} // Prioritize first 6 images for grid
              isSelectionMode={isSelectionMode}
              isSelected={selectedWishIds.has(wish.id)}
              onToggleSelection={onToggleSelection}
              isDragging={activeId === wish.id}
            />
          ))}
        </div>
      </SortableContext>
    </DndContext>
  );
}
