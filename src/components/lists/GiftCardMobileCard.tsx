'use client';

import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { GripVertical, Trash2, Store, Link } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
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

interface GiftCardMobileCardProps {
  card: GiftCard;
  index: number;
  onUpdate: (index: number, field: keyof GiftCard, value: string | number | undefined) => void;
  onDelete: (index: number) => void;
  onBlur?: () => void;
}

export function GiftCardMobileCard({
  card,
  index,
  onUpdate,
  onDelete,
  onBlur,
}: GiftCardMobileCardProps) {
  const { attributes, listeners, setNodeRef, transform, transition } = useSortable({
    id: `card-${index}`,
  });

  const dragStyle = {
    transform: CSS.Transform.toString(transform),
    transition,
  };

  return (
    <div
      ref={setNodeRef}
      style={dragStyle}
      className="border rounded-lg p-4 mb-3 bg-card hover:bg-accent/5 transition-colors"
    >
      {/* Top Row: Drag Handle + Store Name + Delete Button */}
      <div className="flex items-center gap-3 mb-3">
        <button
          className="cursor-grab active:cursor-grabbing touch-none p-2 -ml-2 hover:bg-accent/10 rounded transition-colors flex-shrink-0"
          {...attributes}
          {...listeners}
          aria-label="Drag to reorder"
        >
          <GripVertical className="h-5 w-5 text-muted-foreground" />
        </button>

        <div className="flex-1 min-w-0 relative">
          <Store className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none" />
          <Input
            value={card.name}
            onChange={(e) => onUpdate(index, 'name', e.target.value)}
            onBlur={onBlur}
            placeholder="Store name"
            maxLength={14}
            className="h-11 text-base pl-9"
            aria-label="Gift card store name"
          />
        </div>

        <AlertDialog>
          <AlertDialogTrigger asChild>
            <Button
              variant="ghost"
              size="icon"
              className="h-11 w-11 hover:bg-destructive/20 flex-shrink-0"
              aria-label="Delete gift card"
            >
              <Trash2 className="h-5 w-5" />
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
      </div>

      {/* URL Input (Full Width) */}
      <div className="relative">
        <Link className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none" />
        <Input
          type="url"
          value={card.url}
          onChange={(e) => onUpdate(index, 'url', e.target.value)}
          onBlur={onBlur}
          placeholder="https://..."
          className="h-11 text-base pl-9"
          aria-label="Gift card URL"
        />
      </div>
    </div>
  );
}
