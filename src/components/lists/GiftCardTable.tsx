'use client';

import {
  DndContext,
  closestCenter,
  PointerSensor,
  KeyboardSensor,
  useSensor,
  useSensors,
  DragEndEvent,
} from '@dnd-kit/core';
import { SortableContext, verticalListSortingStrategy, sortableKeyboardCoordinates } from '@dnd-kit/sortable';
import { Table, TableHeader, TableBody, TableHead, TableRow, TableCell } from '@/components/ui/table';
import { GiftCardTableRow } from '@/components/lists/GiftCardTableRow';
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
    <DndContext
      sensors={sensors}
      collisionDetection={closestCenter}
      onDragEnd={handleDragEnd}
    >
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead className="w-8"></TableHead> {/* Drag handle */}
            <TableHead>Name</TableHead>
            <TableHead>URL</TableHead>
            <TableHead className="w-32">Amount ($)</TableHead>
            <TableHead className="w-12"></TableHead> {/* Delete */}
          </TableRow>
        </TableHeader>
        <TableBody>
          {cards.length === 0 ? (
            <TableRow>
              <TableCell colSpan={5} className="text-center text-muted-foreground p-8">
                Click &quot;Add Card&quot; to create your first gift card
              </TableCell>
            </TableRow>
          ) : (
            <SortableContext
              items={cards.map((_, i) => `card-${i}`)}
              strategy={verticalListSortingStrategy}
            >
              {cards.map((card, index) => (
                <GiftCardTableRow
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
