'use client';

import { useState, useId } from 'react';
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  DragEndEvent,
  DragStartEvent,
  DragOverlay,
} from '@dnd-kit/core';
import {
  SortableContext,
  rectSwappingStrategy,
  sortableKeyboardCoordinates,
} from '@dnd-kit/sortable';

import { Wish } from '@/lib/validators/api-responses/wishes';
import { calculateNewSortOrder } from '@/lib/utils/fractional-indexing-client';
import { dragDebug } from '@/lib/utils/drag-debug';

import { WishGrid, WishGridProps } from './wish-grid';
import { SortableWishCard } from './SortableWishCard';

interface SortableWishGridProps extends Omit<WishGridProps, 'wishes'> {
  wishes: (Wish & { sortOrder?: number })[];
  onReorder: (wishId: string, newSortOrder: number) => Promise<void>;
  canEdit: boolean;
}

// Disable drop animation to prevent overlay from snapping back to original position
// Setting to null makes the overlay disappear immediately at drop location
const dropAnimationConfig = null;

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
  const dndId = useId();
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
    const itemId = event.active.id as string;
    setActiveId(itemId);
    dragDebug.logDragStart(itemId);
  };

  const handleDragEnd = async (event: DragEndEvent) => {
    const { active, over } = event;

    setActiveId(null);

    // No drop target or dropped on itself
    if (!over || active.id === over.id) {
      dragDebug.log('DRAG_CANCELLED', { reason: !over ? 'no target' : 'same position' });
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
    dragDebug.logReorder(activeId, activeIndex, overIndex, newSortOrder);

    try {
      await onReorder(activeId, newSortOrder);
      dragDebug.logDragEnd(activeId, overId, newSortOrder);
    } catch (error) {
      console.error('Failed to reorder wish:', error);
      dragDebug.log('REORDER_FAILED', { error: error instanceof Error ? error.message : error });
      // Parent component should handle error display
    }
  };

  const handleDragCancel = () => {
    setActiveId(null);
  };

  // Find the currently dragged wish for overlay
  const activeWish = activeId ? wishes.find((w) => w.id === activeId) : null;

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
      id={dndId}
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
              variant="comfortable"
              onEdit={onEdit}
              onDelete={onDelete}
              onReserve={onReserve}
              isReserved={reservedWishIds.includes(wish.id)}
              showAddToList={showAddToList}
              priority={index < 6} // Prioritize first 6 images for grid
              isSelectionMode={isSelectionMode}
              isSelected={selectedWishIds.has(wish.id)}
              onToggleSelection={onToggleSelection}
              sortable={true}
              isDragging={activeId === wish.id}
            />
          ))}
        </div>
      </SortableContext>

      {/* Drag overlay for smooth drag preview */}
      <DragOverlay dropAnimation={dropAnimationConfig}>
        {activeWish ? (
          <div className="opacity-80 shadow-2xl">
            <SortableWishCard
              key={activeWish.id}
              wish={activeWish}
              variant="comfortable"
              onEdit={onEdit}
              onDelete={onDelete}
              onReserve={onReserve}
              isReserved={reservedWishIds.includes(activeWish.id)}
              showAddToList={showAddToList}
              priority={false}
              isSelectionMode={false}
              isSelected={false}
              sortable={false}  // Disable drag handle on overlay
              isDragging={false}
            />
          </div>
        ) : null}
      </DragOverlay>
    </DndContext>
  );
}
