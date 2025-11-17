import { useState, useCallback } from 'react';
import { usePreventUnsavedClose } from '@/hooks/use-form-dirty-state';
import type { Wish as ApiWish } from '@/lib/validators/api-responses/wishes';

/**
 * Custom hook for managing Edit List dialog state
 */
export function useEditListDialog() {
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
 * Custom hook for managing Add Wish dialog state
 */
export function useAddWishDialog() {
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
 * Custom hook for managing Edit Wish dialog state
 */
export function useEditWishDialog() {
  const [editingWish, setEditingWish] = useState<ApiWish | null>(null);
  const [isDirty, setIsDirty] = useState(false);

  const closeHandler = usePreventUnsavedClose(isDirty, () => {
    setEditingWish(null);
    setIsDirty(false);
  });

  const open = useCallback((wish: ApiWish) => {
    setEditingWish(wish);
  }, []);

  const close = useCallback(() => {
    setEditingWish(null);
    setIsDirty(false);
  }, []);

  return {
    isOpen: !!editingWish,
    editingWish,
    isDirty,
    setIsDirty,
    open,
    close,
    handleClose: closeHandler.handleClose,
    dialogProps: closeHandler.dialogProps,
  };
}

/**
 * Custom hook for managing Sharing dialog state
 */
export function useSharingDialog() {
  const [isOpen, setIsOpen] = useState(false);

  const open = useCallback(() => setIsOpen(true), []);
  const close = useCallback(() => setIsOpen(false), []);

  return {
    isOpen,
    open,
    close,
    setOpen: setIsOpen,
  };
}

/**
 * Custom hook for managing Remove Wish confirmation dialog
 */
export function useRemoveWishDialog() {
  const [isOpen, setIsOpen] = useState(false);
  const [wishToRemove, setWishToRemove] = useState<ApiWish | null>(null);

  const open = useCallback((wish: ApiWish) => {
    setWishToRemove(wish);
    setIsOpen(true);
  }, []);

  const close = useCallback(() => {
    setIsOpen(false);
    setWishToRemove(null);
  }, []);

  return {
    isOpen,
    wishToRemove,
    open,
    close,
    setOpen: setIsOpen,
  };
}
