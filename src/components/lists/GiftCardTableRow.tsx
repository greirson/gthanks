'use client';

import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { GripVertical, Trash2 } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { TableRow, TableCell } from '@/components/ui/table';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog';
import type { GiftCard } from '@/components/lists/hooks/useManageGiftCardsDialog';

interface GiftCardTableRowProps {
  card: GiftCard;
  index: number;
  onUpdate: (index: number, field: keyof GiftCard, value: string | number | undefined) => void;
  onDelete: (index: number) => void;
  onBlur?: () => void; // For auto-save trigger
}

export function GiftCardTableRow({
  card,
  index,
  onUpdate,
  onDelete,
  onBlur,
}: GiftCardTableRowProps) {
  const { attributes, listeners, setNodeRef, transform, transition } = useSortable({
    id: `card-${index}`,
  });

  const dragStyle = {
    transform: CSS.Transform.toString(transform),
    transition,
  };

  return (
    <TableRow ref={setNodeRef} style={dragStyle}>
      {/* Column 1: Drag Handle (w-8) */}
      <TableCell className="w-8 p-2">
        <button
          className="cursor-grab active:cursor-grabbing touch-none"
          {...attributes}
          {...listeners}
          aria-label="Drag to reorder"
        >
          <GripVertical className="h-4 w-4 text-muted-foreground" />
        </button>
      </TableCell>

      {/* Column 2: Name Input */}
      <TableCell className="p-2">
        <Input
          value={card.name}
          onChange={(e) => onUpdate(index, 'name', e.target.value)}
          onBlur={onBlur}
          placeholder="Store name"
          className="h-9"
          aria-label="Gift card store name"
        />
      </TableCell>

      {/* Column 3: URL Input */}
      <TableCell className="p-2">
        <Input
          type="url"
          value={card.url}
          onChange={(e) => onUpdate(index, 'url', e.target.value)}
          onBlur={onBlur}
          placeholder="https://..."
          className="h-9"
          aria-label="Gift card URL"
        />
      </TableCell>

      {/* Column 4: Amount Input (w-32) */}
      <TableCell className="w-32 p-2">
        <Input
          type="number"
          step="0.01"
          value={card.amount ?? ''}
          onChange={(e) =>
            onUpdate(index, 'amount', e.target.value ? parseFloat(e.target.value) : undefined)
          }
          onBlur={onBlur}
          placeholder="Optional"
          className="h-9"
          aria-label="Gift card amount"
        />
      </TableCell>

      {/* Column 5: Delete Button (w-12) */}
      <TableCell className="w-12 p-2">
        <AlertDialog>
          <AlertDialogTrigger asChild>
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8 hover:bg-destructive/20"
              aria-label="Delete gift card"
            >
              <Trash2 className="h-4 w-4" />
            </Button>
          </AlertDialogTrigger>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Delete gift card?</AlertDialogTitle>
              <AlertDialogDescription>
                This will remove &quot;{card.name || 'this card'}&quot; from the list.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Cancel</AlertDialogCancel>
              <AlertDialogAction onClick={() => onDelete(index)}>Delete</AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </TableCell>
    </TableRow>
  );
}
