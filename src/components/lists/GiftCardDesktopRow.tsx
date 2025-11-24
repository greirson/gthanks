'use client';

import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { GripVertical, Trash2, Store, Link } from 'lucide-react';
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

interface GiftCardDesktopRowProps {
  card: GiftCard;
  index: number;
  onUpdate: (index: number, field: keyof GiftCard, value: string | number | undefined) => void;
  onDelete: (index: number) => void;
  onBlur?: () => void;
}

export function GiftCardDesktopRow({
  card,
  index,
  onUpdate,
  onDelete,
  onBlur,
}: GiftCardDesktopRowProps) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: `card-${index}`,
  });

  const dragStyle = {
    transform: CSS.Transform.toString(transform),
    // Remove transition after drop to prevent jarring slide-in effect
    transition: isDragging ? transition : undefined,
  };

  return (
    <TableRow ref={setNodeRef} style={dragStyle}>
      {/* Column 1: Drag Handle (w-12 for larger click target on desktop) */}
      <TableCell className="w-12 p-3">
        <button
          className="cursor-grab touch-none active:cursor-grabbing"
          {...attributes}
          {...listeners}
          aria-label="Drag to reorder"
        >
          <GripVertical className="h-5 w-5 text-muted-foreground" />
        </button>
      </TableCell>

      {/* Column 2: Name Input */}
      <TableCell className="p-3">
        <div className="relative">
          <Store className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={card.name}
            onChange={(e) => onUpdate(index, 'name', e.target.value)}
            onBlur={onBlur}
            placeholder="Store name"
            maxLength={14}
            className="h-10 pl-9"
            aria-label="Gift card store name"
          />
        </div>
      </TableCell>

      {/* Column 3: URL Input */}
      <TableCell className="p-3">
        <div className="relative">
          <Link className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            type="url"
            value={card.url}
            onChange={(e) => onUpdate(index, 'url', e.target.value)}
            onBlur={onBlur}
            placeholder="https://..."
            className="h-10 pl-9"
            aria-label="Gift card URL"
          />
        </div>
      </TableCell>

      {/* Column 4: Delete Button (w-14 for larger click target) */}
      <TableCell className="w-14 p-3">
        <AlertDialog>
          <AlertDialogTrigger asChild>
            <Button
              variant="ghost"
              size="icon"
              className="h-10 w-10 hover:bg-destructive/20"
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
