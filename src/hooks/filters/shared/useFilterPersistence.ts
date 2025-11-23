'use client';

import { useEffect, useState, useRef } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import { getStoredFilters, saveFilters } from './filterStorage';

/**
 * Configuration for filter persistence behavior
 */
export interface PersistenceConfig<F> {
  /** localStorage key for storing filter state */
  storageKey: string;
  /** Default filter state */
  defaultState: F;
  /** Serializers for URL parameter conversion (optional - if not provided, URL sync is disabled) */
  urlSerializer?: {
    /** Convert filter state to URL search params */
    toURL: (state: F) => URLSearchParams;
    /** Parse filter state from URL search params */
    fromURL: (params: URLSearchParams) => Partial<F>;
  };
  /** Fallback strategy when localStorage is unavailable (default: 'memory') */
  fallback?: 'memory';
  /** Error callback for storage failures */
  onError?: (error: Error) => void;
  /** Fields to exclude from persistence (e.g., ['search'] to keep search ephemeral) */
  excludeFromPersistence?: (keyof F)[];
}

/**
 * Hook for managing filter state with optional URL and localStorage persistence
 *
 * Priority order (when urlSerializer is provided):
 * 1. URL parameters (highest priority)
 * 2. localStorage (fallback)
 * 3. Default state
 *
 * Priority order (when urlSerializer is NOT provided):
 * 1. localStorage
 * 2. Default state
 *
 * Changes to state are synced to localStorage (and URL if urlSerializer provided).
 * If localStorage fails, falls back to in-memory state.
 *
 * @param config - Persistence configuration
 * @returns Tuple of [state, setState] similar to useState
 *
 * @example
 * // With URL sync (backwards compatible)
 * const [filters, setFilters] = useFilterPersistence({
 *   storageKey: 'wish-filters',
 *   defaultState: { search: '', priority: [] },
 *   urlSerializer: {
 *     toURL: (state) => new URLSearchParams({ search: state.search }),
 *     fromURL: (params) => ({ search: params.get('search') || '' })
 *   }
 * });
 *
 * @example
 * // Without URL sync (localStorage only with in-memory fallback)
 * const [filters, setFilters] = useFilterPersistence({
 *   storageKey: 'reservation-filters',
 *   defaultState: { dateFilter: 'all', sort: 'recent' },
 *   fallback: 'memory',
 *   onError: (error) => console.warn('Storage unavailable:', error)
 * });
 */
export function useFilterPersistence<F extends Record<string, any>>(
  config: PersistenceConfig<F>
): [F, (state: F | ((prev: F) => F)) => void] {
  const router = useRouter();
  const pathname = usePathname();
  const { storageKey, defaultState, urlSerializer, onError, excludeFromPersistence = [] } = config;

  // Track if localStorage is available
  const storageAvailable = useRef<boolean>(true);

  // Initialize state with defaults for both server and client (prevents hydration mismatch)
  const [state, setState] = useState<F>(defaultState);

  // Helper to strip excluded fields from state before persistence
  const stripExcludedFields = (data: Partial<F>): Partial<F> => {
    if (excludeFromPersistence.length === 0) {
      return data;
    }

    const filtered = { ...data };
    excludeFromPersistence.forEach((key) => {
      delete filtered[key];
    });
    return filtered;
  };

  // Hydrate from URL and localStorage AFTER initial render (Phase 2)
  useEffect(() => {
    // Only run on client, skip on server
    if (typeof window === 'undefined') {
      return;
    }

    let fromURL: Partial<F> = {};

    // 1. Try URL parameters first (if urlSerializer provided)
    if (urlSerializer) {
      const urlParams = new URLSearchParams(window.location.search);
      fromURL = urlSerializer.fromURL(urlParams);
    }

    // 2. Try localStorage as fallback
    const storageResult = getStoredFilters<F>(storageKey);

    if (!storageResult.success) {
      // localStorage unavailable or error
      storageAvailable.current = false;
      if (onError && storageResult.error) {
        onError(storageResult.error);
      }
    }

    const stored = storageResult.data || null;

    // 3. Merge: URL > localStorage > defaults (only if we have stored values)
    // Note: Excluded fields will use default values since they're not in storage
    if (stored || Object.keys(fromURL).length > 0) {
      setState({
        ...defaultState,
        ...(stored || {}),
        ...fromURL,
      });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []); // Run once on mount

  // Sync state changes to localStorage and optionally URL
  useEffect(() => {
    // Save to localStorage (if available) - strip excluded fields
    if (storageAvailable.current) {
      const stateToSave = stripExcludedFields(state);
      const saveResult = saveFilters(storageKey, stateToSave);

      if (!saveResult.success) {
        // localStorage failed - switch to in-memory mode
        storageAvailable.current = false;
        if (onError && saveResult.error) {
          onError(saveResult.error);
        }
      }
    }

    // Update URL with new filter state (only if urlSerializer provided)
    if (urlSerializer) {
      const params = urlSerializer.toURL(state);
      const search = params.toString();
      const newURL = search ? `${pathname}?${search}` : pathname;

      // Use router.replace to avoid polluting browser history
      router.replace(newURL, { scroll: false });
    }
  }, [state, storageKey, pathname, router, urlSerializer, onError]);

  return [state, setState];
}
