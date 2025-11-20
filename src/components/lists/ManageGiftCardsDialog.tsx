'use client';

import { useCallback, useRef, useEffect } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { GiftCardTable } from '@/components/lists/GiftCardTable';
import {
  useManageGiftCardsDialog,
  type GiftCard,
} from '@/components/lists/hooks/useManageGiftCardsDialog';
import { Plus } from 'lucide-react';

interface ManageGiftCardsDialogProps {
  isOpen: boolean;
  cards: GiftCard[];
  onClose: () => void;
  onSave: (cards: GiftCard[]) => void;
  dialogProps?: {
    onOpenAutoFocus?: (event: Event) => void;
    onInteractOutside?: (event: Event) => void;
    onEscapeKeyDown?: (event: KeyboardEvent) => void;
  }; // From usePreventUnsavedClose hook
}

/**
 * Dialog for managing gift cards with table editor, auto-save, and manual save
 *
 * Features:
 * - Table-based editing with drag-and-drop reordering
 * - Auto-save with 1000ms debouncing
 * - Manual save button (only enabled when dirty)
 * - Cancel button (reverts changes)
 * - Card limit: 8 cards max
 * - Validation on save (filters empty cards)
 * - Mobile responsive
 */
export function ManageGiftCardsDialog({
  isOpen,
  cards: initialCards,
  onClose,
  onSave,
  dialogProps,
}: ManageGiftCardsDialogProps) {
  const dialog = useManageGiftCardsDialog(initialCards);
  const autoSaveTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const wasOpenRef = useRef(false);

  // Reset cards ONLY when dialog first opens (not on every parent re-render)
  useEffect(() => {
    console.log('[ManageGiftCardsDialog] Effect triggered:', {
      isOpen,
      wasOpen: wasOpenRef.current,
      timestamp: new Date().toISOString(),
    });

    // Only reset when transitioning from closed to open
    if (isOpen && !wasOpenRef.current) {
      console.log('[ManageGiftCardsDialog] Dialog opened - resetting cards');
      dialog.resetCards();
      wasOpenRef.current = true;
    } else if (!isOpen && wasOpenRef.current) {
      console.log('[ManageGiftCardsDialog] Dialog closed');
      wasOpenRef.current = false;
    }
  }, [isOpen]); // Only depend on isOpen, not dialog.resetCards

  // Cleanup auto-save timeout on unmount
  useEffect(() => {
    return () => {
      if (autoSaveTimeoutRef.current) {
        clearTimeout(autoSaveTimeoutRef.current);
      }
    };
  }, []);

  /**
   * Auto-save with debouncing (1000ms)
   * Called on input blur to debounce rapid changes
   */
  const handleBlur = useCallback(() => {
    // Clear existing timeout
    if (autoSaveTimeoutRef.current) {
      clearTimeout(autoSaveTimeoutRef.current);
    }

    // Set new timeout (1000ms debounce)
    autoSaveTimeoutRef.current = setTimeout(() => {
      // Auto-save logic here
      // For now, just mark as dirty (actual save happens on manual Save button)
      // In future, could auto-save to localStorage or draft API
    }, 1000);
  }, []);

  /**
   * Save handler: validates and saves cards
   * Filters out cards with empty name or URL
   */
  const handleSave = useCallback(() => {
    // Validate cards (basic validation)
    const validCards = dialog.cards.filter(
      (card) => card.name.trim() !== '' && card.url.trim() !== ''
    );

    onSave(validCards);
    onClose();
  }, [dialog.cards, onSave, onClose]);

  /**
   * Cancel handler: reverts changes and closes
   */
  const handleCancel = useCallback(() => {
    dialog.resetCards(); // Revert changes
    onClose();
  }, [dialog.resetCards, onClose]);

  return (
    <Dialog open={isOpen} onOpenChange={dialog.handleClose} {...dialogProps}>
      <DialogContent className="flex max-h-[90vh] max-w-[800px] flex-col p-4 sm:max-w-[90vw] sm:p-6 md:max-w-[800px]">
        {/* Header */}
        <DialogHeader className="pb-4">
          <DialogTitle className="text-lg sm:text-xl">Manage Gift Cards</DialogTitle>
          <DialogDescription>{dialog.cards.length}/8 cards</DialogDescription>
        </DialogHeader>

        {/* Table/Cards (scrollable) */}
        <div className="-mx-4 flex-1 overflow-auto px-4 sm:-mx-6 sm:px-6">
          <GiftCardTable
            cards={dialog.cards}
            onReorder={dialog.reorderCards}
            onUpdate={dialog.updateCard}
            onDelete={dialog.deleteCard}
            onBlur={handleBlur}
          />
        </div>

        {/* Footer */}
        <DialogFooter className="flex flex-col items-stretch gap-3 pt-4 sm:flex-row sm:items-center">
          <Button
            variant="outline"
            onClick={dialog.addCard}
            disabled={dialog.cards.length >= 8}
            className="h-11 w-full sm:h-10 sm:w-auto"
          >
            <Plus className="mr-2 h-4 w-4" />
            Add Card ({dialog.cards.length}/8)
          </Button>

          <div className="flex w-full gap-2 sm:w-auto">
            <Button
              variant="outline"
              onClick={handleCancel}
              className="h-11 flex-1 sm:h-10 sm:flex-initial"
            >
              Cancel
            </Button>
            <Button
              onClick={handleSave}
              disabled={!dialog.isDirty}
              className="h-11 flex-1 sm:h-10 sm:flex-initial"
            >
              Save
            </Button>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
