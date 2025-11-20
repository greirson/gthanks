'use client';

import { useState, useEffect, useCallback } from 'react';
import { useMutation } from '@tanstack/react-query';
import { Plus, CreditCard } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useToast } from '@/components/ui/use-toast';
import { GiftCardItem } from './GiftCardItem';
import { ManageGiftCardsDialog } from './ManageGiftCardsDialog';
import { useManageGiftCardsDialog, type GiftCard } from './hooks/useManageGiftCardsDialog';
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
  onUpdate,
}: GiftCardSectionProps) {
  const { toast } = useToast();
  const [giftCards, setGiftCards] = useState<GiftCard[]>(initialCards || []);
  const debouncedGiftCards = useDebounce(giftCards, 500); // Auto-save after 500ms

  const manageDialog = useManageGiftCardsDialog(giftCards);

  // Update mutation
  const updateMutation = useMutation({
    mutationFn: async (cards: GiftCard[]) => {
      const response = await listsApi.updateList(listId, {
        giftCardPreferences: cards,
      });
      return response;
    },
    onSuccess: () => {
      // Silent success - auto-save
    },
    onError: (error: Error) => {
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
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [debouncedGiftCards]);

  // Sync with prop changes
  useEffect(() => {
    setGiftCards(initialCards || []);
  }, [initialCards]);

  const handleManageCards = useCallback(
    async (updatedCards: GiftCard[]) => {
      try {
        await updateMutation.mutateAsync(updatedCards);
        setGiftCards(updatedCards);
        onUpdate?.(updatedCards);
        toast({
          title: 'Gift cards updated',
          description: 'Your gift card preferences have been saved',
        });
      } catch (error) {
        console.error('Failed to update gift cards:', error);
        toast({
          title: 'Failed to save',
          description: 'Please try again',
          variant: 'destructive',
        });
      }
    },
    [updateMutation, onUpdate, toast]
  );

  // Hide entire section when no gift cards (Fix #1)
  if (!giftCards || giftCards.length === 0) {
    // Only show Add button for owners when there are no cards
    if (canEdit) {
      return (
        <div className="mb-6 sm:mb-8 md:mb-12">
          {' '}
          {/* Fix #3: Increased spacing */}
          <Button variant="outline" size="sm" onClick={() => manageDialog.open()} className="gap-2">
            <CreditCard className="h-4 w-4" />
            Manage Gift Cards
          </Button>
          {/* Manage Dialog */}
          <ManageGiftCardsDialog
            isOpen={manageDialog.isOpen}
            cards={giftCards}
            onClose={manageDialog.handleClose}
            onSave={(cards) => void handleManageCards(cards)}
            dialogProps={manageDialog.dialogProps}
          />
        </div>
      );
    }
    return null; // Don't show anything for non-owners
  }

  return (
    <div className="mb-4 space-y-3">
      {' '}
      {/* Reduced spacing from mb-12 to mb-4 (1rem) */}
      <div className="flex items-center justify-between">
        <h3 className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
          <CreditCard className="h-4 w-4" />
          Gift Cards
        </h3>

        {canEdit && (
          <Button
            variant="ghost"
            size="sm"
            onClick={() => manageDialog.open()}
            disabled={giftCards.length >= 8}
          >
            <Plus className="mr-1 h-4 w-4" />
            Manage Gift Cards
          </Button>
        )}
      </div>
      <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 md:grid-cols-4">
        {giftCards.map((card, index) => (
          <GiftCardItem key={`${card.name}-${index}`} card={card} />
        ))}
      </div>
      {/* Manage Dialog */}
      <ManageGiftCardsDialog
        isOpen={manageDialog.isOpen}
        cards={giftCards}
        onClose={manageDialog.handleClose}
        onSave={(cards) => void handleManageCards(cards)}
        dialogProps={manageDialog.dialogProps}
      />
    </div>
  );
}
