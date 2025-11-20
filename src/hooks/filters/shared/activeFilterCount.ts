/**
 * Utility for counting active filters against defaults
 */

/**
 * Counts the number of active filters by comparing current state to defaults
 *
 * @param filterState - Current filter state
 * @param defaults - Default filter state to compare against
 * @returns Number of filters that differ from defaults
 *
 * @example
 * const count = countActiveFilters(
 *   { search: 'gift', priority: [3], sortBy: 'date' },
 *   { search: '', priority: [], sortBy: 'priority' }
 * ); // Returns 2 (search and priority are active)
 */
export function countActiveFilters(
  filterState: Record<string, unknown>,
  defaults: Record<string, unknown>
): number {
  return Object.keys(filterState).reduce((count, key) => {
    const current = filterState[key];
    const defaultValue = defaults[key];

    // Handle arrays - check length and contents
    if (Array.isArray(current) && Array.isArray(defaultValue)) {
      // Check if arrays are equal in length and content
      if (current.length !== defaultValue.length) {
        return count + 1;
      }
      // Deep equality check for arrays
      const areEqual = current.every((val, idx) => val === defaultValue[idx]);
      return areEqual ? count : count + 1;
    }

    // Handle null/undefined
    if (current === null && defaultValue === null) {
      return count;
    }
    if (current === undefined && defaultValue === undefined) {
      return count;
    }

    // Handle objects - deep comparison
    if (
      typeof current === 'object' &&
      typeof defaultValue === 'object' &&
      current !== null &&
      defaultValue !== null
    ) {
      // Deep equality check for objects
      const currentObj = current as Record<string, unknown>;
      const defaultObj = defaultValue as Record<string, unknown>;
      const currentKeys = Object.keys(currentObj);
      const defaultKeys = Object.keys(defaultObj);

      if (currentKeys.length !== defaultKeys.length) {
        return count + 1;
      }

      const areEqual = currentKeys.every((k) => currentObj[k] === defaultObj[k]);
      return areEqual ? count : count + 1;
    }

    // Compare primitive values
    return current !== defaultValue ? count + 1 : count;
  }, 0);
}
