import { renderHook, waitFor, act } from '@testing-library/react';
import { useReservationFilters } from '@/components/reservations/hooks/useReservationFilters';
import type { ReservationWithWish } from '@/lib/validators/api-responses/reservations';

// Mock dependencies
jest.mock('@/hooks/filters/shared/useFilterPersistence');
jest.mock('@/hooks/use-debounce');

// Import mocked modules
import { useFilterPersistence } from '@/hooks/filters/shared/useFilterPersistence';
import { useDebounce } from '@/hooks/use-debounce';

// Type the mocks
const mockUseFilterPersistence = useFilterPersistence as jest.MockedFunction<
  typeof useFilterPersistence
>;
const mockUseDebounce = useDebounce as jest.MockedFunction<typeof useDebounce>;

describe('useReservationFilters', () => {
  // Sample reservation data for testing
  const mockReservations: ReservationWithWish[] = [
    {
      id: 'res1',
      wishId: 'wish1',
      userId: 'user1',
      reserverName: 'John Doe',
      reserverEmail: 'john@example.com',
      accessToken: 'token1',
      reservedAt: new Date('2024-01-15'),
      purchasedAt: null,
      notes: null,
      wish: {
        id: 'wish1',
        title: 'Red Bike',
        url: 'https://amazon.com/bike',
        price: 299.99,
        currency: 'USD',
        notes: null,
        wishLevel: 3,
        quantity: 1,
        size: null,
        color: 'red',
        ownerId: 'owner1',
        imageUrl: null,
        localImagePath: null,
        imageStatus: null,
        createdAt: new Date('2024-01-01'),
        updatedAt: new Date('2024-01-01'),
        user: {
          id: 'owner1',
          name: 'Alice Smith',
          email: 'alice@example.com',
          username: 'alice',
          image: null,
          avatarUrl: null,
        },
      },
    },
    {
      id: 'res2',
      wishId: 'wish2',
      userId: 'user1',
      reserverName: 'John Doe',
      reserverEmail: 'john@example.com',
      accessToken: 'token2',
      reservedAt: new Date('2024-01-10'),
      purchasedAt: new Date('2024-01-20'),
      notes: null,
      wish: {
        id: 'wish2',
        title: 'Blue Skateboard',
        url: 'https://example.com/skateboard',
        price: 150.0,
        currency: 'USD',
        notes: null,
        wishLevel: 2,
        quantity: 1,
        size: null,
        color: 'blue',
        ownerId: 'owner2',
        imageUrl: null,
        localImagePath: null,
        imageStatus: null,
        createdAt: new Date('2024-01-05'),
        updatedAt: new Date('2024-01-05'),
        user: {
          id: 'owner2',
          name: 'Bob Jones',
          email: 'bob@example.com',
          username: 'bob',
          image: null,
          avatarUrl: null,
        },
      },
    },
    {
      id: 'res3',
      wishId: 'wish3',
      userId: 'user1',
      reserverName: 'John Doe',
      reserverEmail: 'john@example.com',
      accessToken: 'token3',
      reservedAt: new Date('2024-01-05'),
      purchasedAt: null,
      notes: null,
      wish: {
        id: 'wish3',
        title: 'Green Headphones',
        url: null,
        price: 75.0,
        currency: 'USD',
        notes: null,
        wishLevel: 1,
        quantity: 1,
        size: null,
        color: 'green',
        ownerId: 'owner1',
        imageUrl: null,
        localImagePath: null,
        imageStatus: null,
        createdAt: new Date('2024-01-03'),
        updatedAt: new Date('2024-01-03'),
        user: {
          id: 'owner1',
          name: 'Alice Smith',
          email: 'alice@example.com',
          username: 'alice',
          image: null,
          avatarUrl: null,
        },
      },
    },
  ];

  beforeEach(() => {
    jest.clearAllMocks();

    // Default mock implementation - returns state and setState function
    let mockState = {
      dateFilter: 'all' as const,
      ownerIds: [],
      purchaseStatus: 'all' as const,
      sort: 'recent' as const,
      search: '',
    };

    mockUseFilterPersistence.mockImplementation(() => {
      const setState = (updater: any) => {
        if (typeof updater === 'function') {
          mockState = updater(mockState);
        } else {
          mockState = updater;
        }
      };
      return [mockState, setState];
    });

    // Default debounce mock - returns value immediately
    mockUseDebounce.mockImplementation((value) => value);
  });

  describe('Filter Persistence', () => {
    it('falls back to memory when localStorage throws SecurityError', () => {
      const mockOnError = jest.fn();

      // Mock useFilterPersistence to trigger error callback
      mockUseFilterPersistence.mockImplementation((config) => {
        // Simulate SecurityError on first mount
        if (config.onError) {
          const securityError = new Error('SecurityError: localStorage disabled');
          securityError.name = 'SecurityError';
          config.onError(securityError);
        }

        let state = config.defaultState;
        const setState = jest.fn((updater) => {
          if (typeof updater === 'function') {
            state = updater(state);
          } else {
            state = updater;
          }
        });

        return [state, setState];
      });

      const { result } = renderHook(() =>
        useReservationFilters(mockReservations)
      );

      // Should still work with default state
      expect(result.current.filterState).toEqual({
        dateFilter: 'all',
        ownerIds: [],
        purchaseStatus: 'all',
        sort: 'recent',
        search: '',
      });

      // Should be able to update filters in memory
      act(() => {
        result.current.setDateFilter('thisWeek');
      });

      // Verify useFilterPersistence was called with correct config
      expect(mockUseFilterPersistence).toHaveBeenCalledWith(
        expect.objectContaining({
          storageKey: 'reservation-filters',
          fallback: 'memory',
          excludeFromPersistence: ['search'],
        })
      );
    });

    it('handles QuotaExceededError gracefully', () => {
      mockUseFilterPersistence.mockImplementation((config) => {
        // Simulate QuotaExceededError
        if (config.onError) {
          const quotaError = new Error('QuotaExceededError: Storage full');
          quotaError.name = 'QuotaExceededError';
          config.onError(quotaError);
        }

        let state = config.defaultState;
        const setState = jest.fn((updater) => {
          if (typeof updater === 'function') {
            state = updater(state);
          } else {
            state = updater;
          }
        });

        return [state, setState];
      });

      const { result } = renderHook(() =>
        useReservationFilters(mockReservations)
      );

      // Should still work with in-memory state
      expect(result.current.filterState).toBeDefined();

      act(() => {
        result.current.setSortOption('title-asc');
      });

      // Should not crash
      expect(result.current.filterState.sort).toBe('recent'); // Uses default since memory state
    });

    it('excludes search queries from persistence', () => {
      renderHook(() => useReservationFilters(mockReservations));

      expect(mockUseFilterPersistence).toHaveBeenCalledWith(
        expect.objectContaining({
          excludeFromPersistence: ['search'],
        })
      );
    });
  });

  describe('Search Debouncing', () => {
    it('debounces search input by 300ms', () => {
      let mockState = {
        dateFilter: 'all' as const,
        ownerIds: [],
        purchaseStatus: 'all' as const,
        sort: 'recent' as const,
        search: '',
      };

      mockUseFilterPersistence.mockImplementation(() => {
        const setState = (updater: any) => {
          if (typeof updater === 'function') {
            mockState = updater(mockState);
          } else {
            mockState = updater;
          }
        };
        return [mockState, setState];
      });

      const { result, rerender } = renderHook(() =>
        useReservationFilters(mockReservations)
      );

      // Initially called with empty string
      expect(mockUseDebounce).toHaveBeenCalledWith('', 300);

      act(() => {
        result.current.setSearchQuery('bike');
      });

      rerender();

      // After update, called with new search value
      expect(mockUseDebounce).toHaveBeenCalledWith('bike', 300);
    });

    it('filters reservations only after debounce completes', async () => {
      let debouncedValue = '';

      mockUseDebounce.mockImplementation((value) => debouncedValue);

      const { result, rerender } = renderHook(() =>
        useReservationFilters(mockReservations)
      );

      // Initially no search
      expect(result.current.filteredReservations).toHaveLength(3);

      // Set search query
      act(() => {
        result.current.setSearchQuery('bike');
      });

      // Before debounce - still shows all
      rerender();
      expect(result.current.filteredReservations).toHaveLength(3);

      // Simulate debounce completion
      act(() => {
        debouncedValue = 'bike';
      });

      rerender();

      await waitFor(() => {
        expect(result.current.filteredReservations).toHaveLength(1);
        expect(result.current.filteredReservations[0].wish.title).toBe('Red Bike');
      });
    });
  });

  describe('Purchase Status Filtering', () => {
    it('shows all reservations when purchaseStatus is "all"', () => {
      const { result } = renderHook(() =>
        useReservationFilters(mockReservations)
      );

      expect(result.current.filteredReservations).toHaveLength(3);
    });

    it('shows only active (non-purchased) reservations when purchaseStatus is "active"', () => {
      mockUseFilterPersistence.mockImplementation(() => {
        const state = {
          dateFilter: 'all' as const,
          ownerIds: [],
          purchaseStatus: 'active' as const,
          sort: 'recent' as const,
          search: '',
        };
        return [state, jest.fn()];
      });

      const { result } = renderHook(() =>
        useReservationFilters(mockReservations)
      );

      expect(result.current.filteredReservations).toHaveLength(2);
      expect(
        result.current.filteredReservations.every((r) => !r.purchasedAt)
      ).toBe(true);
    });

    it('shows only purchased reservations when purchaseStatus is "purchased"', () => {
      mockUseFilterPersistence.mockImplementation(() => {
        const state = {
          dateFilter: 'all' as const,
          ownerIds: [],
          purchaseStatus: 'purchased' as const,
          sort: 'recent' as const,
          search: '',
        };
        return [state, jest.fn()];
      });

      const { result } = renderHook(() =>
        useReservationFilters(mockReservations)
      );

      expect(result.current.filteredReservations).toHaveLength(1);
      expect(result.current.filteredReservations[0].purchasedAt).toBeTruthy();
    });

    it('updates purchase status filter correctly', () => {
      let mockState = {
        dateFilter: 'all' as const,
        ownerIds: [],
        purchaseStatus: 'all' as const,
        sort: 'recent' as const,
        search: '',
      };

      mockUseFilterPersistence.mockImplementation(() => {
        const setState = (updater: any) => {
          if (typeof updater === 'function') {
            mockState = updater(mockState);
          } else {
            mockState = updater;
          }
        };
        return [mockState, setState];
      });

      const { result, rerender } = renderHook(() =>
        useReservationFilters(mockReservations)
      );

      // Initially all
      expect(result.current.filteredReservations).toHaveLength(3);

      // Change to active
      act(() => {
        result.current.setPurchaseStatus('active');
      });

      rerender();
      expect(result.current.filteredReservations).toHaveLength(2);
    });
  });

  describe('Search Scope', () => {
    beforeEach(() => {
      mockUseDebounce.mockImplementation((value) => value);
    });

    it('searches by wish title', () => {
      let mockState = {
        dateFilter: 'all' as const,
        ownerIds: [],
        purchaseStatus: 'all' as const,
        sort: 'recent' as const,
        search: 'bike',
      };

      mockUseFilterPersistence.mockImplementation(() => [mockState, jest.fn()]);

      const { result } = renderHook(() =>
        useReservationFilters(mockReservations)
      );

      expect(result.current.filteredReservations).toHaveLength(1);
      expect(result.current.filteredReservations[0].wish.title).toBe('Red Bike');
    });

    it('searches by owner name', () => {
      let mockState = {
        dateFilter: 'all' as const,
        ownerIds: [],
        purchaseStatus: 'all' as const,
        sort: 'recent' as const,
        search: 'alice',
      };

      mockUseFilterPersistence.mockImplementation(() => [mockState, jest.fn()]);

      const { result } = renderHook(() =>
        useReservationFilters(mockReservations)
      );

      expect(result.current.filteredReservations).toHaveLength(2);
      expect(
        result.current.filteredReservations.every(
          (r) => r.wish.user.name === 'Alice Smith'
        )
      ).toBe(true);
    });

    it('searches by owner email', () => {
      let mockState = {
        dateFilter: 'all' as const,
        ownerIds: [],
        purchaseStatus: 'all' as const,
        sort: 'recent' as const,
        search: 'bob@example.com',
      };

      mockUseFilterPersistence.mockImplementation(() => [mockState, jest.fn()]);

      const { result } = renderHook(() =>
        useReservationFilters(mockReservations)
      );

      expect(result.current.filteredReservations).toHaveLength(1);
      expect(result.current.filteredReservations[0].wish.user.email).toBe(
        'bob@example.com'
      );
    });

    it('searches by owner username', () => {
      let mockState = {
        dateFilter: 'all' as const,
        ownerIds: [],
        purchaseStatus: 'all' as const,
        sort: 'recent' as const,
        search: 'alice',
      };

      mockUseFilterPersistence.mockImplementation(() => [mockState, jest.fn()]);

      const { result } = renderHook(() =>
        useReservationFilters(mockReservations)
      );

      expect(result.current.filteredReservations).toHaveLength(2);
      expect(
        result.current.filteredReservations.every(
          (r) => r.wish.user.username === 'alice'
        )
      ).toBe(true);
    });

    it('searches by product URL', () => {
      let mockState = {
        dateFilter: 'all' as const,
        ownerIds: [],
        purchaseStatus: 'all' as const,
        sort: 'recent' as const,
        search: 'amazon.com',
      };

      mockUseFilterPersistence.mockImplementation(() => [mockState, jest.fn()]);

      const { result } = renderHook(() =>
        useReservationFilters(mockReservations)
      );

      expect(result.current.filteredReservations).toHaveLength(1);
      expect(result.current.filteredReservations[0].wish.url).toContain(
        'amazon.com'
      );
    });

    it('handles case-insensitive search', () => {
      let mockState = {
        dateFilter: 'all' as const,
        ownerIds: [],
        purchaseStatus: 'all' as const,
        sort: 'recent' as const,
        search: 'BIKE',
      };

      mockUseFilterPersistence.mockImplementation(() => [mockState, jest.fn()]);

      const { result } = renderHook(() =>
        useReservationFilters(mockReservations)
      );

      expect(result.current.filteredReservations).toHaveLength(1);
      expect(result.current.filteredReservations[0].wish.title).toBe('Red Bike');
    });

    it('handles empty search query', () => {
      let mockState = {
        dateFilter: 'all' as const,
        ownerIds: [],
        purchaseStatus: 'all' as const,
        sort: 'recent' as const,
        search: '',
      };

      mockUseFilterPersistence.mockImplementation(() => [mockState, jest.fn()]);

      const { result } = renderHook(() =>
        useReservationFilters(mockReservations)
      );

      expect(result.current.filteredReservations).toHaveLength(3);
    });
  });

  describe('Active Filter Count', () => {
    it('counts active filters excluding search and sort', () => {
      let mockState = {
        dateFilter: 'thisWeek' as const,
        ownerIds: ['owner1'],
        purchaseStatus: 'active' as const,
        sort: 'title-asc' as const,
        search: 'bike',
      };

      mockUseFilterPersistence.mockImplementation(() => [mockState, jest.fn()]);

      const { result } = renderHook(() =>
        useReservationFilters(mockReservations)
      );

      // Should count: dateFilter, ownerIds, purchaseStatus = 3
      // Should NOT count: search, sort
      expect(result.current.activeFilterCount).toBe(3);
    });

    it('returns 0 when all filters are at default values', () => {
      let mockState = {
        dateFilter: 'all' as const,
        ownerIds: [],
        purchaseStatus: 'all' as const,
        sort: 'recent' as const,
        search: '',
      };

      mockUseFilterPersistence.mockImplementation(() => [mockState, jest.fn()]);

      const { result } = renderHook(() =>
        useReservationFilters(mockReservations)
      );

      expect(result.current.activeFilterCount).toBe(0);
    });

    it('counts array filters correctly', () => {
      let mockState = {
        dateFilter: 'all' as const,
        ownerIds: ['owner1', 'owner2'],
        purchaseStatus: 'all' as const,
        sort: 'recent' as const,
        search: '',
      };

      mockUseFilterPersistence.mockImplementation(() => [mockState, jest.fn()]);

      const { result } = renderHook(() =>
        useReservationFilters(mockReservations)
      );

      // Only ownerIds is active (non-empty array)
      expect(result.current.activeFilterCount).toBe(1);
    });

    it('does not count search query as active filter', () => {
      let mockState = {
        dateFilter: 'all' as const,
        ownerIds: [],
        purchaseStatus: 'all' as const,
        sort: 'recent' as const,
        search: 'bike',
      };

      mockUseFilterPersistence.mockImplementation(() => [mockState, jest.fn()]);

      const { result } = renderHook(() =>
        useReservationFilters(mockReservations)
      );

      expect(result.current.activeFilterCount).toBe(0);
    });

    it('does not count sort option as active filter', () => {
      let mockState = {
        dateFilter: 'all' as const,
        ownerIds: [],
        purchaseStatus: 'all' as const,
        sort: 'title-desc' as const,
        search: '',
      };

      mockUseFilterPersistence.mockImplementation(() => [mockState, jest.fn()]);

      const { result } = renderHook(() =>
        useReservationFilters(mockReservations)
      );

      expect(result.current.activeFilterCount).toBe(0);
    });
  });

  describe('Edge Cases', () => {
    it('handles empty reservations array', () => {
      const { result } = renderHook(() => useReservationFilters([]));

      expect(result.current.filteredReservations).toEqual([]);
      expect(result.current.uniqueOwners).toEqual([]);
    });

    it('handles null reservations gracefully', () => {
      const { result } = renderHook(() =>
        useReservationFilters(null as any)
      );

      expect(result.current.filteredReservations).toEqual([]);
      expect(result.current.uniqueOwners).toEqual([]);
    });

    it('extracts unique owners correctly', () => {
      const { result } = renderHook(() =>
        useReservationFilters(mockReservations)
      );

      expect(result.current.uniqueOwners).toHaveLength(2);
      expect(result.current.uniqueOwners).toEqual(
        expect.arrayContaining([
          {
            id: 'owner1',
            name: 'Alice Smith',
            email: 'alice@example.com',
          },
          {
            id: 'owner2',
            name: 'Bob Jones',
            email: 'bob@example.com',
          },
        ])
      );
    });

    it('uses email as name fallback for users without name', () => {
      const reservationsWithoutNames: ReservationWithWish[] = [
        {
          ...mockReservations[0],
          wish: {
            ...mockReservations[0].wish,
            user: {
              ...mockReservations[0].wish.user,
              name: null,
            },
          },
        },
      ];

      const { result } = renderHook(() =>
        useReservationFilters(reservationsWithoutNames)
      );

      expect(result.current.uniqueOwners[0].name).toBe('alice@example.com');
    });
  });

  describe('Reset Filters', () => {
    it('resets all filters to default state', () => {
      let mockState = {
        dateFilter: 'thisWeek' as const,
        ownerIds: ['owner1'],
        purchaseStatus: 'purchased' as const,
        sort: 'title-asc' as const,
        search: 'bike',
      };

      const mockSetState = jest.fn((updater) => {
        if (typeof updater === 'function') {
          mockState = updater(mockState);
        } else {
          mockState = updater;
        }
      });

      mockUseFilterPersistence.mockImplementation(() => [
        mockState,
        mockSetState,
      ]);

      const { result } = renderHook(() =>
        useReservationFilters(mockReservations)
      );

      act(() => {
        result.current.resetFilters();
      });

      expect(mockSetState).toHaveBeenCalledWith({
        dateFilter: 'all',
        ownerIds: [],
        purchaseStatus: 'all',
        sort: 'recent',
        search: '',
      });
    });
  });
});
