/**
 * Minimal view preferences hook for MVP
 * Stores user's preferred view mode in localStorage
 */

import { useState, useEffect } from 'react';

export type ViewMode = 'list' | 'compact' | 'comfortable';

/**
 * Hook to manage view mode preference
 * @param storageKey - localStorage key for storing the preference
 * @param defaultMode - default view mode if no preference is stored
 * @returns [currentMode, setMode, isHydrated]
 */
export function useViewPreference(storageKey: string, defaultMode: ViewMode): [ViewMode, (mode: ViewMode) => void, boolean] {
  const [viewMode, setViewMode] = useState<ViewMode>(defaultMode);
  const [isHydrated, setIsHydrated] = useState(false);

  // Load preference from localStorage on mount
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const stored = localStorage.getItem(storageKey);
      if (stored && ['list', 'compact', 'comfortable'].includes(stored)) {
        setViewMode(stored as ViewMode);
      }
      setIsHydrated(true);
    }
  }, [storageKey]);

  // Update preference handler
  const updateViewMode = (mode: ViewMode) => {
    setViewMode(mode);
    if (typeof window !== 'undefined') {
      localStorage.setItem(storageKey, mode);
    }
  };

  return [viewMode, updateViewMode, isHydrated];
}
