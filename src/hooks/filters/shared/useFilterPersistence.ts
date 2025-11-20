'use client';

import { useEffect, useState } from 'react';
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
  /** Serializers for URL parameter conversion */
  urlSerializer: {
    /** Convert filter state to URL search params */
    toURL: (state: F) => URLSearchParams;
    /** Parse filter state from URL search params */
    fromURL: (params: URLSearchParams) => Partial<F>;
  };
}

/**
 * Hook for managing filter state with URL and localStorage persistence
 *
 * Priority order:
 * 1. URL parameters (highest priority)
 * 2. localStorage (fallback)
 * 3. Default state
 *
 * Changes to state are synced to both URL and localStorage
 *
 * @param config - Persistence configuration
 * @returns Tuple of [state, setState] similar to useState
 *
 * @example
 * const [filters, setFilters] = useFilterPersistence({
 *   storageKey: 'wish-filters',
 *   defaultState: { search: '', priority: [] },
 *   urlSerializer: {
 *     toURL: (state) => new URLSearchParams({ search: state.search }),
 *     fromURL: (params) => ({ search: params.get('search') || '' })
 *   }
 * });
 */
export function useFilterPersistence<F extends Record<string, any>>(
  config: PersistenceConfig<F>
): [F, (state: F | ((prev: F) => F)) => void] {
  const router = useRouter();
  const pathname = usePathname();
  const { storageKey, defaultState, urlSerializer } = config;

  // Initialize state with defaults for both server and client (prevents hydration mismatch)
  const [state, setState] = useState<F>(defaultState);

  // Hydrate from URL and localStorage AFTER initial render (Phase 2)
  useEffect(() => {
    // Only run on client, skip on server
    if (typeof window === 'undefined') {
      return;
    }

    // 1. Try URL parameters first (highest priority)
    const urlParams = new URLSearchParams(window.location.search);
    const fromURL = urlSerializer.fromURL(urlParams);

    // 2. Try localStorage as fallback
    const stored = getStoredFilters<F>(storageKey);

    // 3. Merge: URL > localStorage > defaults (only if we have stored values)
    if (stored || Object.keys(fromURL).length > 0) {
      setState({
        ...defaultState,
        ...(stored || {}),
        ...fromURL,
      });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []); // Run once on mount

  // Sync state changes to URL and localStorage
  useEffect(() => {
    // Save to localStorage
    saveFilters(storageKey, state);

    // Update URL with new filter state
    const params = urlSerializer.toURL(state);
    const search = params.toString();
    const newURL = search ? `${pathname}?${search}` : pathname;

    // Use router.replace to avoid polluting browser history
    router.replace(newURL, { scroll: false });
  }, [state, storageKey, pathname, router, urlSerializer]);

  return [state, setState];
}
