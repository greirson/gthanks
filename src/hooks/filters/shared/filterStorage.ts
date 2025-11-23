/**
 * LocalStorage utilities for filter persistence
 * Provides SSR-safe read/write operations for filter state
 */

/**
 * Storage operation result type
 */
export interface StorageResult<T> {
  success: boolean;
  data?: T;
  error?: Error;
}

/**
 * Retrieves stored filter state from localStorage
 *
 * @param key - The localStorage key to read from
 * @returns Storage result with partial filter state or error
 *
 * @example
 * const result = getStoredFilters<WishFilters>('wish-filters');
 * if (result.success) {
 *   console.log('Loaded filters:', result.data);
 * }
 */
export function getStoredFilters<F>(key: string): StorageResult<Partial<F>> {
  // SSR safety check
  if (typeof window === 'undefined') {
    return { success: false, error: new Error('SSR: localStorage not available') };
  }

  try {
    const stored = localStorage.getItem(key);
    if (!stored) {
      return { success: true, data: null as any }; // No data is not an error
    }
    const data = JSON.parse(stored) as Partial<F>;
    return { success: true, data };
  } catch (error) {
    const err = error instanceof Error ? error : new Error(String(error));

    // Provide specific error messages for known issues
    if (err.name === 'SecurityError') {
      console.warn(`[FilterStorage] Private browsing mode detected - localStorage unavailable (${key})`);
      return {
        success: false,
        error: new Error('Private browsing mode: localStorage unavailable')
      };
    }

    console.error(`Failed to read filters from localStorage (${key}):`, err);
    return { success: false, error: err };
  }
}

/**
 * Saves filter state to localStorage
 *
 * @param key - The localStorage key to write to
 * @param filters - The filter state to save
 * @returns Storage result indicating success or error
 *
 * @example
 * const result = saveFilters('wish-filters', { search: 'gift', priority: [3] });
 * if (!result.success) {
 *   console.warn('Failed to save filters:', result.error);
 * }
 */
export function saveFilters<F>(key: string, filters: F): StorageResult<void> {
  // SSR safety check
  if (typeof window === 'undefined') {
    return { success: false, error: new Error('SSR: localStorage not available') };
  }

  try {
    localStorage.setItem(key, JSON.stringify(filters));
    return { success: true };
  } catch (error) {
    const err = error instanceof Error ? error : new Error(String(error));

    // Provide specific error messages for known issues
    if (err.name === 'SecurityError') {
      console.warn(`[FilterStorage] Private browsing mode detected - cannot save (${key})`);
      return {
        success: false,
        error: new Error('Private browsing mode: localStorage unavailable')
      };
    }

    if (err.name === 'QuotaExceededError') {
      console.warn(`[FilterStorage] Storage quota exceeded - cannot save (${key})`);
      return {
        success: false,
        error: new Error('Storage quota exceeded')
      };
    }

    console.error(`Failed to save filters to localStorage (${key}):`, err);
    return { success: false, error: err };
  }
}
