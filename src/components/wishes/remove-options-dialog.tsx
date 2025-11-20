'use client';

import { FolderMinus, Folders } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';

export interface RemoveOptionsDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  selectedCount: number;
  listId?: string;
  listName?: string;
  onRemoveFromList: () => void;
  onRemoveFromAllLists: () => void;
  isRemoving: boolean;
}

export function RemoveOptionsDialog({
  open,
  onOpenChange,
  selectedCount,
  listId,
  listName,
  onRemoveFromList,
  onRemoveFromAllLists,
  isRemoving,
}: RemoveOptionsDialogProps) {
  const wishText = selectedCount === 1 ? 'Wish' : 'Wishes';

  // When in a specific list context, show both options
  if (listId) {
    return (
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>
              Remove {selectedCount} {wishText}?
            </DialogTitle>
            <DialogDescription>Choose how to remove the selected wishes</DialogDescription>
          </DialogHeader>

          <div className="space-y-3">
            {/* Option 1: Remove from this specific list (Primary/Safer) */}
            <Button
              variant="outline"
              className="h-auto w-full justify-start py-3"
              onClick={() => {
                onRemoveFromList();
                onOpenChange(false);
              }}
              disabled={isRemoving}
            >
              <FolderMinus className="mr-3 h-5 w-5 flex-shrink-0" />
              <div className="flex flex-col items-start text-left">
                <div className="font-medium">Remove from This List</div>
                <div className="text-xs font-normal text-muted-foreground">
                  Remove from {listName || 'this list'} only. Wishes stay in your other lists.
                </div>
              </div>
            </Button>

            {/* Option 2: Remove from all lists (Destructive) */}
            <Button
              variant="destructive"
              className="h-auto w-full justify-start py-3"
              onClick={() => {
                onRemoveFromAllLists();
                onOpenChange(false);
              }}
              disabled={isRemoving}
            >
              <Folders className="mr-3 h-5 w-5 flex-shrink-0" />
              <div className="flex flex-col items-start text-left">
                <div className="font-medium">Remove from All Lists</div>
                <div className="text-xs font-normal text-muted-foreground">
                  Remove from all lists. Wishes stay in My Wishes.
                </div>
              </div>
            </Button>
          </div>

          <Button variant="ghost" onClick={() => onOpenChange(false)} disabled={isRemoving}>
            Cancel
          </Button>
        </DialogContent>
      </Dialog>
    );
  }

  // When not in a specific list context, show single confirmation
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Remove from All Lists?</DialogTitle>
          <DialogDescription>
            Remove {selectedCount} {selectedCount === 1 ? 'wish' : 'wishes'} from all lists?
          </DialogDescription>
        </DialogHeader>

        <p className="text-sm text-muted-foreground">
          This will remove the selected wishes from all lists they belong to. The wishes will remain
          in your My Wishes collection.
        </p>

        <div className="flex justify-end gap-2">
          <Button variant="ghost" onClick={() => onOpenChange(false)} disabled={isRemoving}>
            Cancel
          </Button>
          <Button
            variant="destructive"
            onClick={() => {
              onRemoveFromAllLists();
              onOpenChange(false);
            }}
            disabled={isRemoving}
          >
            {isRemoving ? 'Removing...' : 'Remove from All Lists'}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
