/**
 * LocalStorage utilities for filter persistence
 * Provides SSR-safe read/write operations for filter state
 */

/**
 * Retrieves stored filter state from localStorage
 *
 * @param key - The localStorage key to read from
 * @returns Partial filter state or null if not found/error
 *
 * @example
 * const filters = getStoredFilters<WishFilters>('wish-filters');
 */
export function getStoredFilters<F>(key: string): Partial<F> | null {
  // SSR safety check
  if (typeof window === 'undefined') {
    return null;
  }

  try {
    const stored = localStorage.getItem(key);
    if (!stored) {
      return null;
    }
    return JSON.parse(stored) as Partial<F>;
  } catch (error) {
    console.error(`Failed to read filters from localStorage (${key}):`, error);
    return null;
  }
}

/**
 * Saves filter state to localStorage
 *
 * @param key - The localStorage key to write to
 * @param filters - The filter state to save
 *
 * @example
 * saveFilters('wish-filters', { search: 'gift', priority: [3] });
 */
export function saveFilters<F>(key: string, filters: F): void {
  // SSR safety check
  if (typeof window === 'undefined') {
    return;
  }

  try {
    localStorage.setItem(key, JSON.stringify(filters));
  } catch (error) {
    console.error(`Failed to save filters to localStorage (${key}):`, error);
  }
}
