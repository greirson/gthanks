/**
 * Tests for shared filter utilities
 * Validates generic type safety and core functionality
 */

import { applySearchFilter } from '../searchUtils';
import { countActiveFilters } from '../activeFilterCount';
import { getStoredFilters, saveFilters } from '../filterStorage';

describe('searchUtils', () => {
  it('filters items by text search on title field', () => {
    const items = [
      { id: 1, title: 'Birthday Gift' },
      { id: 2, title: 'Christmas Present' },
      { id: 3, title: 'Anniversary' },
    ];

    const result = applySearchFilter(items, 'gift', ['title']);
    expect(result).toHaveLength(1);
    expect(result.map((i) => i.id)).toEqual([1]);
  });

  it('returns all items when query is empty', () => {
    const items = [{ id: 1, name: 'Test' }];
    const result = applySearchFilter(items, '', ['name']);
    expect(result).toEqual(items);
  });

  it('handles null/undefined field values gracefully', () => {
    const items = [
      { id: 1, title: 'Test Item', description: null as string | null },
      { id: 2, title: null as string | null, description: 'Gift' },
    ];

    const result = applySearchFilter(items, 'test', ['title']);
    expect(result).toHaveLength(1);
    expect(result[0].id).toBe(1);
  });
});

describe('activeFilterCount', () => {
  it('counts filters that differ from defaults', () => {
    const state = {
      search: 'gift',
      priority: [3],
      sortBy: 'date',
    };
    const defaults = {
      search: '',
      priority: [],
      sortBy: 'priority',
    };

    const count = countActiveFilters(state, defaults);
    expect(count).toBe(3); // search, priority, and sortBy are all active
  });

  it('handles arrays correctly', () => {
    const state = { tags: [1, 2, 3] };
    const defaults = { tags: [] };

    const count = countActiveFilters(state, defaults);
    expect(count).toBe(1);
  });

  it('handles null/undefined gracefully', () => {
    const state = { value: null };
    const defaults = { value: null };

    const count = countActiveFilters(state, defaults);
    expect(count).toBe(0);
  });
});

describe('filterStorage', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it('saves and retrieves filters from localStorage', () => {
    const filters = { search: 'test', priority: [1, 2] };
    saveFilters('test-key', filters);

    const retrieved = getStoredFilters<typeof filters>('test-key');
    expect(retrieved).toEqual(filters);
  });

  it('returns null for non-existent keys', () => {
    const result = getStoredFilters('non-existent');
    expect(result).toBeNull();
  });

  it('handles JSON parsing errors gracefully', () => {
    localStorage.setItem('invalid-json', 'not valid json{');
    const result = getStoredFilters('invalid-json');
    expect(result).toBeNull();
  });
});
