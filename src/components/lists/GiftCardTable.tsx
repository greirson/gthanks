'use client';

import { useId } from 'react';
import {
  DndContext,
  closestCenter,
  PointerSensor,
  KeyboardSensor,
  useSensor,
  useSensors,
  DragEndEvent,
} from '@dnd-kit/core';
import {
  SortableContext,
  verticalListSortingStrategy,
  sortableKeyboardCoordinates,
} from '@dnd-kit/sortable';
import {
  Table,
  TableHeader,
  TableBody,
  TableHead,
  TableRow,
  TableCell,
} from '@/components/ui/table';
import { GiftCardMobileCard } from '@/components/lists/GiftCardMobileCard';
import { GiftCardDesktopRow } from '@/components/lists/GiftCardDesktopRow';
import type { GiftCard } from '@/components/lists/hooks/useManageGiftCardsDialog';

interface GiftCardTableProps {
  cards: GiftCard[];
  onReorder: (oldIndex: number, newIndex: number) => void;
  onUpdate: (index: number, field: keyof GiftCard, value: string | number | undefined) => void;
  onDelete: (index: number) => void;
  onBlur?: () => void;
}

export function GiftCardTable({
  cards,
  onReorder,
  onUpdate,
  onDelete,
  onBlur,
}: GiftCardTableProps) {
  const dndId = useId();

  // Configure sensors for drag-and-drop
  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 8, // Prevent accidental drags on click
      },
    }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  // Handle drag end event
  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;

    if (over && active.id !== over.id) {
      // Extract index from id format "card-{index}"
      const oldIndex = parseInt(active.id.toString().replace('card-', ''));
      const newIndex = parseInt(over.id.toString().replace('card-', ''));
      onReorder(oldIndex, newIndex);
    }
  };

  return (
    <DndContext id={dndId} sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
      {/* Mobile Card List (< md breakpoint) */}
      <div className="md:hidden">
        {cards.length === 0 ? (
          <div className="px-4 py-12 text-center text-muted-foreground">
            Click &quot;Add Card&quot; to create your first gift card
          </div>
        ) : (
          <SortableContext
            items={cards.map((_, i) => `card-${i}`)}
            strategy={verticalListSortingStrategy}
          >
            {cards.map((card, index) => (
              <GiftCardMobileCard
                key={`card-${index}`}
                card={card}
                index={index}
                onUpdate={onUpdate}
                onDelete={onDelete}
                onBlur={onBlur}
              />
            ))}
          </SortableContext>
        )}
      </div>

      {/* Desktop Table (md breakpoint and up) */}
      <Table className="hidden md:table">
        <TableHeader>
          <TableRow>
            {/* Drag handle */}
            <TableHead className="w-12"></TableHead>
            {/* Name */}
            <TableHead>Name</TableHead>
            {/* URL */}
            <TableHead>URL</TableHead>
            {/* Delete */}
            <TableHead className="w-14"></TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {cards.length === 0 ? (
            <TableRow>
              <TableCell colSpan={4} className="p-8 text-center text-muted-foreground">
                Click &quot;Add Card&quot; to create your first gift card
              </TableCell>
            </TableRow>
          ) : (
            <SortableContext
              items={cards.map((_, i) => `card-${i}`)}
              strategy={verticalListSortingStrategy}
            >
              {cards.map((card, index) => (
                <GiftCardDesktopRow
                  key={`card-${index}`}
                  card={card}
                  index={index}
                  onUpdate={onUpdate}
                  onDelete={onDelete}
                  onBlur={onBlur}
                />
              ))}
            </SortableContext>
          )}
        </TableBody>
      </Table>
    </DndContext>
  );
}
