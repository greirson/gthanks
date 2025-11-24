import { z } from 'zod';

import { apiDelete, apiDeleteWithBody, apiGet, apiPatch, apiPost, apiPut } from '@/lib/api-client';
import {
  ListWithDetailsSchema,
  ListWithDetails as ListWithDetailsType,
  PaginatedListsResponse,
  PaginatedListsResponseSchema,
  ListWishSchema,
  ListWish,
} from '@/lib/validators/api-responses/lists';
import { ReservationSchema } from '@/lib/validators/api-responses/reservations';
import { BulkWishOperationResultSchema } from '@/lib/validators/api-responses/wishes';
import {
  AddWishToListInput,
  ListCreateInput,
  ListPaginationOptions,
  ListUpdateInput,
  RemoveWishFromListInput,
} from '@/lib/validators/list';
import { ReservationCreateInput } from '@/lib/validators/reservation';

export const listsApi = {
  // Get user's lists
  getLists: async (options?: ListPaginationOptions): Promise<PaginatedListsResponse> => {
    const params = new URLSearchParams();
    if (options?.cursor) {
      params.append('cursor', options.cursor);
    }
    if (options?.limit) {
      params.append('limit', options.limit.toString());
    }
    if (options?.search) {
      params.append('search', options.search);
    }

    const url = `/api/lists${params.toString() ? `?${params.toString()}` : ''}`;
    return apiGet(url, PaginatedListsResponseSchema);
  },

  // Get single list
  getList: async (listId: string): Promise<ListWithDetailsType> => {
    return apiGet(`/api/lists/${listId}`, ListWithDetailsSchema);
  },

  // Create list
  createList: async (input: ListCreateInput): Promise<ListWithDetailsType> => {
    return apiPost('/api/lists', input, ListWithDetailsSchema);
  },

  // Update list
  updateList: async (listId: string, input: ListUpdateInput): Promise<ListWithDetailsType> => {
    return apiPut(`/api/lists/${listId}`, input, ListWithDetailsSchema);
  },

  // Delete list
  deleteList: async (listId: string): Promise<void> => {
    return apiDelete(`/api/lists/${listId}`);
  },

  // Add wish to list
  addWishToList: async (
    listId: string,
    input: AddWishToListInput
  ): Promise<{ success: boolean }> => {
    return apiPost(`/api/lists/${listId}/wishes`, input, z.object({ success: z.boolean() }));
  },

  // Remove wish from list
  removeWishFromList: async (
    listId: string,
    input: RemoveWishFromListInput
  ): Promise<{ success: boolean }> => {
    return apiDeleteWithBody(
      `/api/lists/${listId}/wishes`,
      input,
      z.object({ success: z.boolean() })
    );
  },

  // Bulk remove wishes from list
  bulkRemoveFromList: async (
    listId: string,
    wishIds: string[]
  ): Promise<z.infer<typeof BulkWishOperationResultSchema>> => {
    return apiPost(
      `/api/lists/${listId}/wishes/bulk-remove`,
      { wishIds },
      BulkWishOperationResultSchema
    );
  },

  // Public list access
  accessPublicList: async (shareToken: string, password?: string): Promise<ListWithDetailsType> => {
    if (password) {
      return apiPost(`/api/lists/public/${shareToken}`, { password }, ListWithDetailsSchema);
    } else {
      return apiGet(`/api/lists/public/${shareToken}`, ListWithDetailsSchema);
    }
  },

  // Alias for better naming
  getPublicList: async (shareToken: string, password?: string): Promise<ListWithDetailsType> => {
    if (password) {
      return apiPost(`/api/lists/public/${shareToken}`, { password }, ListWithDetailsSchema);
    } else {
      return apiGet(`/api/lists/public/${shareToken}`, ListWithDetailsSchema);
    }
  },

  // Create anonymous reservation
  createAnonymousReservation: async (
    shareToken: string,
    input: ReservationCreateInput
  ): Promise<z.infer<typeof ReservationSchema>> => {
    return apiPost(`/api/lists/public/${shareToken}/reservations`, input, ReservationSchema);
  },

  // Get lists count
  getListsCount: async (): Promise<{ count: number }> => {
    return apiGet('/api/lists/count', z.object({ count: z.number() }));
  },

  /**
   * Update a wish's sortOrder in a list (drag-and-drop custom sorting).
   *
   * Uses fractional indexing to avoid renumbering all wishes. Supports conflict detection
   * via If-Unmodified-Since header for optimistic locking in concurrent edit scenarios.
   *
   * @param listId - ID of the list containing the wish
   * @param wishId - ID of the wish to reorder
   * @param sortOrder - New sortOrder value (calculated via fractional indexing)
   * @param clientLastFetchedAt - Optional: when client loaded the list (for conflict detection)
   * @returns Updated ListWish with wish relation included
   * @throws {ApiError} 400 - Invalid sortOrder value
   * @throws {ApiError} 401 - User not authenticated
   * @throws {ApiError} 403 - User lacks permission to edit this list
   * @throws {ApiError} 404 - List or wish not found
   * @throws {ApiError} 409 - List modified by another user (conflict)
   *
   * @example
   * // Update wish position with conflict detection
   * const updated = await listsApi.updateWishSortOrder(
   *   'list-123',
   *   'wish-456',
   *   1.5,
   *   new Date('2025-11-23T10:00:00Z')
   * );
   */
  updateWishSortOrder: async (
    listId: string,
    wishId: string,
    sortOrder: number,
    clientLastFetchedAt?: Date
  ): Promise<ListWish> => {
    const headers: HeadersInit = {
      'Content-Type': 'application/json',
    };

    if (clientLastFetchedAt) {
      headers['If-Unmodified-Since'] = clientLastFetchedAt.toISOString();
    }

    return apiPatch(
      `/api/lists/${listId}/wishes/${wishId}`,
      { sortOrder },
      z.object({
        wish: ListWishSchema,
      }),
      { headers }
    ).then((res) => res.wish);
  },

  /**
   * Initialize custom sort for a list (first-time setup).
   *
   * Assigns sortOrder values to all wishes based on their current display order (addedAt DESC).
   * Called when user first activates "Custom Order" sort mode. If custom sort is already
   * initialized (any sortOrder !== null), returns { initialized: 0 }.
   *
   * @param listId - ID of the list to initialize custom sorting for
   * @returns Number of wishes initialized with sortOrder values
   * @throws {ApiError} 401 - User not authenticated
   * @throws {ApiError} 403 - User lacks permission to edit this list
   *
   * @example
   * // Initialize custom sort for a list
   * const result = await listsApi.initializeCustomSort('list-123');
   * console.log(`Initialized ${result.initialized} wishes`);
   */
  initializeCustomSort: async (listId: string): Promise<{ initialized: number }> => {
    return apiPost(
      `/api/lists/${listId}/wishes/initialize-custom-sort`,
      {},
      z.object({ initialized: z.number() })
    );
  },
};
