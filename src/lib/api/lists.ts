import { z } from 'zod';

import { apiDelete, apiDeleteWithBody, apiGet, apiPost, apiPut } from '@/lib/api-client';
import {
  ListWithDetailsSchema,
  ListWithDetails as ListWithDetailsType,
  PaginatedListsResponse,
  PaginatedListsResponseSchema,
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
};
