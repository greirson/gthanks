/**
 * Utility for managing reservation access tokens in browser storage
 * Allows anonymous users to track their reservations securely
 */

const STORAGE_KEY = 'gthanks_reservation_tokens';

export interface StoredReservationToken {
  accessToken: string;
  wishTitle?: string;
  reserverName?: string;
  createdAt: string;
}

/**
 * Get all stored reservation tokens
 */
export function getStoredReservationTokens(): StoredReservationToken[] {
  if (typeof window === 'undefined') {
    return [];
  }

  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (!stored) {
      return [];
    }

    const tokens = JSON.parse(stored) as unknown;
    return Array.isArray(tokens) ? (tokens as StoredReservationToken[]) : [];
  } catch (error) {
    console.error('Failed to parse stored reservation tokens:', error);
    return [];
  }
}

/**
 * Store a new reservation token
 */
export function storeReservationToken(token: StoredReservationToken): void {
  if (typeof window === 'undefined') {
    return;
  }

  try {
    const existing = getStoredReservationTokens();

    // Remove duplicate tokens (just in case)
    const filtered = existing.filter((t) => t.accessToken !== token.accessToken);

    // Add new token
    filtered.push(token);

    // Store updated list
    localStorage.setItem(STORAGE_KEY, JSON.stringify(filtered));
  } catch (error) {
    console.error('Failed to store reservation token:', error);
  }
}

/**
 * Remove a reservation token
 */
export function removeReservationToken(accessToken: string): void {
  if (typeof window === 'undefined') {
    return;
  }

  try {
    const existing = getStoredReservationTokens();
    const filtered = existing.filter((t) => t.accessToken !== accessToken);

    localStorage.setItem(STORAGE_KEY, JSON.stringify(filtered));
  } catch (error) {
    console.error('Failed to remove reservation token:', error);
  }
}

/**
 * Clear all stored reservation tokens
 */
export function clearAllReservationTokens(): void {
  if (typeof window === 'undefined') {
    return;
  }

  try {
    localStorage.removeItem(STORAGE_KEY);
  } catch (error) {
    console.error('Failed to clear reservation tokens:', error);
  }
}

/**
 * Get access tokens only (for API calls)
 */
export function getAccessTokens(): string[] {
  return getStoredReservationTokens().map((t) => t.accessToken);
}

/**
 * Check if a specific access token is stored
 */
export function hasAccessToken(accessToken: string): boolean {
  return getStoredReservationTokens().some((t) => t.accessToken === accessToken);
}
