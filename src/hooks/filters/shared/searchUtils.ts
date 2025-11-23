/**
 * Generic text search utilities for filtering
 */

/**
 * Filters an array of items by searching across specified fields
 *
 * @param items - Array of items to search through
 * @param query - Search query string
 * @param fields - Object keys to search within OR a function that returns an array of strings to search
 * @returns Filtered array of items matching the query
 *
 * @example
 * // Simple field names
 * const filtered = applySearchFilter(wishes, 'gift', ['title', 'notes']);
 *
 * @example
 * // Custom accessor function (for nested fields)
 * const filtered = applySearchFilter(
 *   reservations,
 *   'gift',
 *   (res) => [res.wish.title, res.wish.user.name]
 * );
 */
export function applySearchFilter<T>(
  items: T[],
  query: string,
  fields: (keyof T)[] | ((item: T) => string[])
): T[] {
  // Return unchanged if no query
  if (!query.trim()) {
    return items;
  }

  const lowerQuery = query.toLowerCase();

  return items.filter((item) => {
    // Handle function accessor (for nested fields)
    if (typeof fields === 'function') {
      const values = fields(item);
      return values.some((value) => {
        if (value === null || value === undefined) {
          return false;
        }
        return String(value).toLowerCase().includes(lowerQuery);
      });
    }

    // Handle simple field names
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
