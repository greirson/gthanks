'use client';

import { useCallback, useMemo } from 'react';

// Form dirty state tracking hook
export function useFormDirtyState<T extends Record<string, unknown>>(
  initialValues: T,
  currentValues: T,
  options: {
    ignoreFields?: (keyof T)[];
    // Custom equality check for complex objects
    isEqual?: (a: unknown, b: unknown) => boolean;
  } = {}
) {
  const { ignoreFields = [], isEqual } = options;

  const isDirty = useMemo(() => {
    const keys = Object.keys(currentValues) as (keyof T)[];

    for (const key of keys) {
      // Skip ignored fields
      if (ignoreFields.includes(key)) {
        continue;
      }

      const initial = initialValues[key];
      const current = currentValues[key];

      // Use custom equality check if provided
      if (isEqual) {
        if (!isEqual(initial, current)) {
          return true;
        }
      } else {
        // Deep equality check for objects/arrays, shallow for primitives
        if (
          typeof current === 'object' &&
          current !== null &&
          typeof initial === 'object' &&
          initial !== null
        ) {
          if (JSON.stringify(initial) !== JSON.stringify(current)) {
            return true;
          }
        } else if (initial !== current) {
          return true;
        }
      }
    }

    return false;
  }, [initialValues, currentValues, ignoreFields, isEqual]);

  return { isDirty };
}

// Hook to prevent dialog close when there are unsaved changes
export function usePreventUnsavedClose(
  isDirty: boolean,
  onClose: () => void,
  options: {
    confirmMessage?: string;
    bypassConfirm?: boolean;
  } = {}
) {
  const {
    confirmMessage = 'You have unsaved changes. Are you sure you want to close without saving?',
    bypassConfirm = false,
  } = options;

  const handleClose = useCallback(() => {
    if (!bypassConfirm && isDirty) {
      if (window.confirm(confirmMessage)) {
        onClose();
      }
    } else {
      onClose();
    }
  }, [isDirty, onClose, confirmMessage, bypassConfirm]);

  // Return handler for onOpenChange and custom props for DialogContent
  return {
    handleClose,
    dialogProps: {
      onInteractOutside: (event: Event) => {
        if (!bypassConfirm && isDirty) {
          event.preventDefault();
          if (window.confirm(confirmMessage)) {
            onClose();
          }
        }
      },
      onEscapeKeyDown: (event: KeyboardEvent) => {
        if (!bypassConfirm && isDirty) {
          event.preventDefault();
          if (window.confirm(confirmMessage)) {
            onClose();
          }
        }
      },
    },
  };
}
