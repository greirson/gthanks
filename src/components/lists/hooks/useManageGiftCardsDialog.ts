import { useState, useCallback } from 'react';
import { usePreventUnsavedClose } from '@/hooks/use-form-dirty-state';

export interface GiftCard {
  name: string;
  url: string;
  amount?: number;
}

const MAX_CARDS = 8;

/**
 * Custom hook for managing the table-based gift card editor state
 */
export function useManageGiftCardsDialog(initialCards: GiftCard[]) {
  const [cards, setCards] = useState<GiftCard[]>(initialCards);
  const [isOpen, setIsOpen] = useState(false);
  const [isDirty, setIsDirty] = useState(false);

  const closeHandler = usePreventUnsavedClose(isDirty, () => {
    setIsOpen(false);
    setIsDirty(false);
  });

  const open = useCallback(() => setIsOpen(true), []);

  const close = useCallback(() => {
    setIsOpen(false);
    setIsDirty(false);
  }, []);

  const updateCard = useCallback(
    (index: number, field: keyof GiftCard, value: any) => {
      setCards((prev) => {
        const updated = [...prev];
        updated[index] = { ...updated[index], [field]: value };
        return updated;
      });
      setIsDirty(true);
    },
    []
  );

  const deleteCard = useCallback((index: number) => {
    setCards((prev) => prev.filter((_, i) => i !== index));
    setIsDirty(true);
  }, []);

  const addCard = useCallback(() => {
    setCards((prev) => {
      if (prev.length >= MAX_CARDS) {
        return prev;
      }
      return [...prev, { name: '', url: '', amount: undefined }];
    });
    setIsDirty(true);
  }, []);

  const reorderCards = useCallback((oldIndex: number, newIndex: number) => {
    setCards((prev) => {
      const updated = [...prev];
      const [moved] = updated.splice(oldIndex, 1);
      updated.splice(newIndex, 0, moved);
      return updated;
    });
    setIsDirty(true);
  }, []);

  const resetCards = useCallback(() => {
    setCards(initialCards);
    setIsDirty(false);
  }, [initialCards]);

  const saveCards = useCallback((newCards: GiftCard[]) => {
    setCards(newCards);
    setIsDirty(false);
  }, []);

  return {
    cards,
    isOpen,
    isDirty,
    open,
    close,
    updateCard,
    deleteCard,
    addCard,
    reorderCards,
    resetCards,
    saveCards,
    handleClose: closeHandler.handleClose,
    dialogProps: closeHandler.dialogProps,
  };
}
