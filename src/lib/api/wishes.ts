import { z } from 'zod';

import { apiDelete, apiGet, apiPost, apiPut } from '@/lib/api-client';
import {
  BulkWishOperationResult,
  BulkWishOperationResultSchema,
  MetadataExtractionResponse,
  MetadataExtractionResponseSchema,
  PaginatedWishesResponse,
  PaginatedWishesResponseSchema,
  Wish,
  WishMetadata,
  WishMetadataSchema,
  WishSchema,
} from '@/lib/validators/api-responses/wishes';
import { ListWithOwnerSchema, type ListWithOwner } from '@/lib/validators/api-responses/lists';
import { WishCreateInput, WishUpdateInput } from '@/lib/validators/wish';

export const wishesApi = {
  // Get user's wishes
  getWishes: async (cursor?: string): Promise<PaginatedWishesResponse> => {
    const url = cursor ? `/api/wishes?cursor=${cursor}` : '/api/wishes';
    return apiGet(url, PaginatedWishesResponseSchema);
  },

  // Get single wish
  getWish: async (wishId: string): Promise<Wish> => {
    return apiGet(`/api/wishes/${wishId}`, WishSchema);
  },

  // Create wish
  createWish: async (input: WishCreateInput): Promise<Wish> => {
    return apiPost('/api/wishes', input, WishSchema);
  },

  // Update wish
  updateWish: async (wishId: string, input: WishUpdateInput): Promise<Wish> => {
    return apiPut(`/api/wishes/${wishId}`, input, WishSchema);
  },

  // Delete wish
  deleteWish: async (wishId: string): Promise<void> => {
    return apiDelete(`/api/wishes/${wishId}`);
  },

  // Extract metadata (legacy - throws on error)
  extractMetadata: async (url: string): Promise<WishMetadata> => {
    return apiPost('/api/metadata', { url }, WishMetadataSchema);
  },

  // Extract metadata with detailed error handling
  extractMetadataWithDetails: async (url: string): Promise<MetadataExtractionResponse> => {
    return apiPost('/api/metadata', { url }, MetadataExtractionResponseSchema);
  },

  // Get wishes count
  getWishesCount: async (): Promise<{ count: number }> => {
    return apiGet('/api/wishes/count', z.object({ count: z.number() }));
  },

  // Bulk delete wishes
  bulkDelete: async (wishIds: string[]): Promise<BulkWishOperationResult> => {
    return apiPost('/api/wishes/bulk/delete', { wishIds }, BulkWishOperationResultSchema);
  },

  // Bulk add wishes to list
  bulkAddToList: async (wishIds: string[], listId: string): Promise<BulkWishOperationResult> => {
    return apiPost(
      '/api/wishes/bulk/add-to-list',
      { wishIds, listId },
      BulkWishOperationResultSchema
    );
  },

  // Bulk remove wishes from all lists
  bulkRemoveFromLists: async (wishIds: string[]): Promise<BulkWishOperationResult> => {
    return apiPost(
      '/api/wishes/bulk/remove-from-lists',
      { wishIds },
      BulkWishOperationResultSchema
    );
  },

  // Get all lists a wish belongs to
  getWishLists: async (wishId: string): Promise<ListWithOwner[]> => {
    return apiGet(`/api/wishes/${wishId}/lists`, z.array(ListWithOwnerSchema));
  },

  // Update which lists a wish belongs to (transactional)
  updateWishMemberships: async (
    wishId: string,
    input: { listIds: string[] }
  ): Promise<{ success: boolean }> => {
    return apiPut(`/api/wishes/${wishId}/memberships`, input, z.object({ success: z.boolean() }));
  },
};
