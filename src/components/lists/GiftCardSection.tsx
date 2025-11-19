'use client';

import { useState, useEffect, useCallback } from 'react';
import { useMutation } from '@tanstack/react-query';
import { Plus, CreditCard } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useToast } from '@/components/ui/use-toast';
import { GiftCardItem } from './GiftCardItem';
import { AddGiftCardDialog } from './AddGiftCardDialog';
import { ConfirmDialog } from '@/components/ui/confirm-dialog';
import {
  GiftCard,
  useAddGiftCardDialog,
  useEditGiftCardDialog,
  useRemoveGiftCardDialog,
} from './hooks/useGiftCardDialogs';
import { listsApi } from '@/lib/api/lists';
import { useDebounce } from '@/hooks/use-debounce';

interface GiftCardSectionProps {
  listId: string;
  giftCards: GiftCard[];
  canEdit: boolean;
  onUpdate?: (cards: GiftCard[]) => void;
}

export function GiftCardSection({ 
  listId, 
  giftCards: initialCards, 
  canEdit,
  onUpdate 
}: GiftCardSectionProps) {
  const { toast } = useToast();
  const [giftCards, setGiftCards] = useState<GiftCard[]>(initialCards || []);
  const debouncedGiftCards = useDebounce(giftCards, 500); // Auto-save after 500ms

  const addDialog = useAddGiftCardDialog();
  const editDialog = useEditGiftCardDialog();
  const removeDialog = useRemoveGiftCardDialog();

  // Update mutation
  const updateMutation = useMutation({
    mutationFn: async (cards: GiftCard[]) => {
      const response = await listsApi.updateList(listId, {
        giftCardPreferences: cards
      });
      return response;
    },
    onSuccess: () => {
      // Silent success - auto-save
    },
    onError: (error: any) => {
      toast({
        title: 'Failed to save gift cards',
        description: error.message || 'Please try again',
        variant: 'destructive',
      });
    },
  });

  // Auto-save when giftCards change (debounced)
  useEffect(() => {
    if (debouncedGiftCards !== initialCards && canEdit) {
      updateMutation.mutate(debouncedGiftCards);
      onUpdate?.(debouncedGiftCards);
    }
  }, [debouncedGiftCards]);

  // Sync with prop changes
  useEffect(() => {
    setGiftCards(initialCards || []);
  }, [initialCards]);

  const handleAdd = useCallback((card: GiftCard) => {
    if (giftCards.length >= 10) {
      toast({
        title: 'Maximum cards reached',
        description: 'You can only have up to 10 gift cards per list',
        variant: 'destructive',
      });
      return;
    }
    setGiftCards([...giftCards, card]);
  }, [giftCards, toast]);

  const handleEdit = useCallback((card: GiftCard, index: number) => {
    const updatedCards = [...giftCards];
    updatedCards[index] = card;
    setGiftCards(updatedCards);
    editDialog.close();
  }, [giftCards, editDialog]);

  const handleRemove = useCallback((index: number) => {
    const updatedCards = giftCards.filter((_, i) => i !== index);
    setGiftCards(updatedCards);
    removeDialog.close();
  }, [giftCards, removeDialog]);

  // Hide entire section when no gift cards (Fix #1)
  if (!giftCards || giftCards.length === 0) {
    // Only show Add button for owners when there are no cards
    if (canEdit) {
      return (
        <div className="mb-12"> {/* Fix #3: Increased spacing */}
          <Button
            variant="outline"
            size="sm"
            onClick={addDialog.open}
            className="gap-2"
          >
            <CreditCard className="h-4 w-4" />
            Add Gift Card
          </Button>

          {/* Add Dialog */}
          <AddGiftCardDialog
            isOpen={addDialog.isOpen}
            onOpenChange={addDialog.close}
            onAdd={handleAdd}
            existingCards={giftCards}
          />
        </div>
      );
    }
    return null; // Don't show anything for non-owners
  }

  return (
    <div className="space-y-3 mb-12"> {/* Fix #3: Increased spacing from mb-8 to mb-12 */}
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-medium text-muted-foreground flex items-center gap-2">
          <CreditCard className="h-4 w-4" />
          Gift Cards
        </h3>
        
        {canEdit && (
          <Button
            variant="ghost"
            size="sm"
            onClick={addDialog.open}
            disabled={giftCards.length >= 10}
          >
            <Plus className="h-4 w-4 mr-1" />
            Add
          </Button>
        )}
      </div>

      <div className="flex flex-wrap gap-2">
        {giftCards.map((card, index) => (
          <GiftCardItem
            key={`${card.name}-${index}`}
            card={card}
            index={index}
            isOwner={canEdit}
            onEdit={canEdit ? editDialog.open : undefined}
            onRemove={canEdit ? removeDialog.open : undefined}
          />
        ))}
      </div>

      {/* Add Dialog */}
      <AddGiftCardDialog
        isOpen={addDialog.isOpen}
        onOpenChange={addDialog.close}
        onAdd={handleAdd}
        existingCards={giftCards}
      />

      {/* Edit Dialog - reuse Add dialog with edit mode */}
      {editDialog.editingCard && (
        <AddGiftCardDialog
          isOpen={editDialog.isOpen}
          onOpenChange={editDialog.close}
          onAdd={(card) => handleEdit(card, editDialog.editingIndex)}
          existingCards={giftCards}
        />
      )}

      {/* Remove Confirmation Dialog */}
      <ConfirmDialog
        open={removeDialog.isOpen}
        onOpenChange={removeDialog.close}
        title="Remove Gift Card"
        description={`Are you sure you want to remove "${removeDialog.cardToRemove?.card.name}"?`}
        confirmText="Remove"
        cancelText="Cancel"
        onConfirm={() => {
          if (removeDialog.cardToRemove) {
            handleRemove(removeDialog.cardToRemove.index);
          }
        }}
        variant="destructive"
      />
    </div>
  );
}
