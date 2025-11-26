import { useState, useCallback } from 'react';
import { usePreventUnsavedClose } from '@/hooks/use-form-dirty-state';
import type { GiftCard } from '@/types/gift-card.types';

export type { GiftCard } from '@/types/gift-card.types';

/**
 * Custom hook for managing Add Gift Card dialog state
 */
export function useAddGiftCardDialog() {
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

  return {
    isOpen,
    isDirty,
    setIsDirty,
    open,
    close,
    handleClose: closeHandler.handleClose,
    dialogProps: closeHandler.dialogProps,
  };
}

/**
 * Custom hook for managing Edit Gift Card dialog state
 */
export function useEditGiftCardDialog() {
  const [editingCard, setEditingCard] = useState<GiftCard | null>(null);
  const [editingIndex, setEditingIndex] = useState<number>(-1);
  const [isDirty, setIsDirty] = useState(false);

  const closeHandler = usePreventUnsavedClose(isDirty, () => {
    setEditingCard(null);
    setEditingIndex(-1);
    setIsDirty(false);
  });

  const open = useCallback((card: GiftCard, index: number) => {
    setEditingCard(card);
    setEditingIndex(index);
  }, []);

  const close = useCallback(() => {
    setEditingCard(null);
    setEditingIndex(-1);
    setIsDirty(false);
  }, []);

  return {
    isOpen: !!editingCard,
    editingCard,
    editingIndex,
    isDirty,
    setIsDirty,
    open,
    close,
    handleClose: closeHandler.handleClose,
    dialogProps: closeHandler.dialogProps,
  };
}

/**
 * Custom hook for managing Remove Gift Card confirmation dialog
 */
export function useRemoveGiftCardDialog() {
  const [isOpen, setIsOpen] = useState(false);
  const [cardToRemove, setCardToRemove] = useState<{ card: GiftCard; index: number } | null>(null);

  const open = useCallback((card: GiftCard, index: number) => {
    setCardToRemove({ card, index });
    setIsOpen(true);
  }, []);

  const close = useCallback(() => {
    setIsOpen(false);
    setCardToRemove(null);
  }, []);

  return {
    isOpen,
    cardToRemove,
    open,
    close,
    setOpen: setIsOpen,
  };
}
