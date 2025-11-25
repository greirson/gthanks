/**
 * Sort preferences hook for list sorting with direction support
 * Stores user's preferred sort mode and direction in localStorage
 */

import { useState, useEffect } from 'react';

export type SortDirection = 'asc' | 'desc';
export type ListSortMode = 'name' | 'wishes' | 'newest';

export interface ListSortPreference {
  mode: ListSortMode;
  direction: SortDirection;
}

// Smart defaults per mode
export const DEFAULT_DIRECTION: Record<ListSortMode, SortDirection> = {
  name: 'asc', // A-Z natural
  wishes: 'desc', // Most wishes first
  newest: 'desc', // Newest first
};

/**
 * Hook to manage list sort preference with direction
 * @param storageKey - localStorage key for storing the preference
 * @param defaultMode - default sort mode if no preference is stored
 * @returns [preference, setPreference, isHydrated]
 */
export function useSortPreference(
  storageKey: string,
  defaultMode: ListSortMode
): [ListSortPreference, (preference: ListSortPreference) => void, boolean] {
  const [sortPreference, setSortPreference] = useState<ListSortPreference>({
    mode: defaultMode,
    direction: DEFAULT_DIRECTION[defaultMode],
  });
  const [isHydrated, setIsHydrated] = useState(false);

  // Load preference from localStorage on mount
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const stored = localStorage.getItem(storageKey);

      if (stored) {
        try {
          // Try parsing as new JSON format
          const parsed = JSON.parse(stored) as ListSortPreference;

          if (
            parsed &&
            typeof parsed === 'object' &&
            'mode' in parsed &&
            'direction' in parsed &&
            ['name', 'wishes', 'newest'].includes(parsed.mode) &&
            ['asc', 'desc'].includes(parsed.direction)
          ) {
            setSortPreference(parsed);
          } else {
            // Invalid format, use defaults
            setSortPreference({
              mode: defaultMode,
              direction: DEFAULT_DIRECTION[defaultMode],
            });
          }
        } catch {
          // Old format (simple string) or invalid JSON - migrate from old format
          if (['name', 'wishes', 'newest'].includes(stored)) {
            const migratedMode = stored as ListSortMode;
            setSortPreference({
              mode: migratedMode,
              direction: DEFAULT_DIRECTION[migratedMode],
            });
          } else {
            setSortPreference({
              mode: defaultMode,
              direction: DEFAULT_DIRECTION[defaultMode],
            });
          }
        }
      } else {
        setSortPreference({
          mode: defaultMode,
          direction: DEFAULT_DIRECTION[defaultMode],
        });
      }

      setIsHydrated(true);
    }
  }, [storageKey, defaultMode]);

  // Update preference handler
  const updateSortPreference = (preference: ListSortPreference) => {
    setSortPreference(preference);
    if (typeof window !== 'undefined') {
      localStorage.setItem(storageKey, JSON.stringify(preference));
    }
  };

  return [sortPreference, updateSortPreference, isHydrated];
}
