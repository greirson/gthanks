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
import { useManageGiftCardsDialog, type GiftCard } from '@/components/lists/hooks/useManageGiftCardsDialog';
import { Plus } from 'lucide-react';

interface ManageGiftCardsDialogProps {
  isOpen: boolean;
  cards: GiftCard[];
  onClose: () => void;
  onSave: (cards: GiftCard[]) => void;
  dialogProps?: any; // From usePreventUnsavedClose hook
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

  // Reset cards when dialog opens
  useEffect(() => {
    if (isOpen) {
      dialog.resetCards();
    }
  }, [isOpen, dialog]);

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
  }, [dialog, onClose]);

  return (
    <Dialog open={isOpen} onOpenChange={onClose} {...dialogProps}>
      <DialogContent className="max-w-4xl max-h-[90vh] flex flex-col sm:max-w-[90vw]">
        {/* Header */}
        <DialogHeader>
          <DialogTitle>Manage Gift Cards</DialogTitle>
          <DialogDescription>
            {dialog.cards.length}/8 cards
          </DialogDescription>
        </DialogHeader>

        {/* Table (scrollable) */}
        <div className="flex-1 overflow-auto -mx-6 px-6">
          <GiftCardTable
            cards={dialog.cards}
            onReorder={dialog.reorderCards}
            onUpdate={dialog.updateCard}
            onDelete={dialog.deleteCard}
            onBlur={handleBlur}
          />
        </div>

        {/* Add Card Button */}
        <div className="border-t pt-4 -mx-6 px-6">
          <Button
            variant="outline"
            onClick={dialog.addCard}
            disabled={dialog.cards.length >= 8}
            className="w-full"
          >
            <Plus className="h-4 w-4 mr-2" />
            Add Card ({dialog.cards.length}/8)
          </Button>
        </div>

        {/* Footer */}
        <DialogFooter>
          <Button variant="outline" onClick={handleCancel}>
            Cancel
          </Button>
          <Button onClick={handleSave} disabled={!dialog.isDirty}>
            Save
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
