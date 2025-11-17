/**
 * Generic text search utilities for filtering
 */

/**
 * Filters an array of items by searching across specified fields
 *
 * @param items - Array of items to search through
 * @param query - Search query string
 * @param fields - Object keys to search within
 * @returns Filtered array of items matching the query
 *
 * @example
 * const filtered = applySearchFilter(wishes, 'gift', ['title', 'notes']);
 * const filtered = applySearchFilter(lists, 'birthday', ['name', 'description']);
 */
export function applySearchFilter<T>(
  items: T[],
  query: string,
  fields: (keyof T)[]
): T[] {
  // Return unchanged if no query
  if (!query.trim()) {
    return items;
  }

  const lowerQuery = query.toLowerCase();

  return items.filter((item) => {
    return fields.some((field) => {
      const value = item[field];
      // Handle undefined/null/non-string values
      if (value === null || value === undefined) {
        return false;
      }
      return String(value).toLowerCase().includes(lowerQuery);
    });
  });
}
