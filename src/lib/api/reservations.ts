import { z } from 'zod';

import { apiDelete, apiGet, apiPatch, apiPost } from '@/lib/api-client';
import {
  BulkReservationResponse,
  BulkReservationResponseSchema,
  PublicReservation,
  PublicReservationSchema,
  ReservationCreateResponse,
  ReservationCreateResponseSchema,
  ReservationStatus,
  ReservationStatusSchema,
  ReservationWithWish,
  ReservationWithWishSchema,
} from '@/lib/validators/api-responses/reservations';
import { ReservationCreateInput } from '@/lib/validators/reservation';

export const reservationsApi = {
  // Get user's reservations
  getMyReservations: async (email?: string): Promise<ReservationWithWish[]> => {
    const url = email ? `/api/reservations?email=${email}` : '/api/reservations';
    return apiGet(url, z.array(ReservationWithWishSchema));
  },

  // Create reservation
  createReservation: async (input: ReservationCreateInput): Promise<ReservationCreateResponse> => {
    return apiPost('/api/reservations', input, ReservationCreateResponseSchema);
  },

  // Remove reservation
  removeReservation: async (reservationId: string): Promise<void> => {
    return apiDelete(`/api/reservations/${reservationId}`);
  },

  // Reserve specific wish
  reserveWish: async (
    wishId: string,
    input?: Partial<ReservationCreateInput>
  ): Promise<ReservationCreateResponse> => {
    return apiPost(
      `/api/wishes/${wishId}/reservation`,
      input || {},
      ReservationCreateResponseSchema
    );
  },

  // Unreserve wish
  unreserveWish: async (wishId: string): Promise<void> => {
    return apiDelete(`/api/wishes/${wishId}/reservation`);
  },

  // Get wish reservation status
  getWishReservationStatus: async (wishId: string): Promise<PublicReservation> => {
    return apiGet(`/api/wishes/${wishId}/reservation`, PublicReservationSchema);
  },

  // Get list reservations
  getListReservations: async (listId: string): Promise<Record<string, PublicReservation>> => {
    return apiGet(`/api/lists/${listId}/reservations`, z.record(PublicReservationSchema));
  },

  // Check multiple wishes
  checkReservations: async (listId: string, wishIds: string[]): Promise<ReservationStatus> => {
    return apiPost(`/api/lists/${listId}/reservations/check`, { wishIds }, ReservationStatusSchema);
  },

  // Mark wish as received
  markWishReceived: async (wishId: string, action: 'delete' | 'unreserve'): Promise<void> => {
    return apiPost(`/api/wishes/${wishId}/received`, { action }, z.void());
  },

  // Mark as purchased
  markAsPurchased: async (
    reservationId: string,
    purchasedDate?: Date | string
  ): Promise<ReservationWithWish> => {
    return apiPatch(
      `/api/reservations/${reservationId}/purchased`,
      { purchasedDate },
      ReservationWithWishSchema
    );
  },

  // Un-mark as purchased
  unmarkAsPurchased: async (reservationId: string): Promise<ReservationWithWish> => {
    return apiDelete(
      `/api/reservations/${reservationId}/purchased`,
      ReservationWithWishSchema
    ) as Promise<ReservationWithWish>;
  },

  // Bulk cancel
  bulkCancel: async (reservationIds: string[]): Promise<BulkReservationResponse> => {
    return apiPost(
      '/api/reservations/bulk',
      { action: 'cancel', reservationIds },
      BulkReservationResponseSchema
    );
  },

  // Bulk mark as purchased
  bulkMarkAsPurchased: async (
    reservationIds: string[],
    purchasedDate?: Date | string
  ): Promise<BulkReservationResponse> => {
    return apiPost(
      '/api/reservations/bulk',
      { action: 'markPurchased', reservationIds, purchasedDate },
      BulkReservationResponseSchema
    );
  },

  // Bulk un-mark purchased
  bulkUnmarkPurchased: async (reservationIds: string[]): Promise<BulkReservationResponse> => {
    return apiPost(
      '/api/reservations/bulk',
      { action: 'unmarkPurchased', reservationIds },
      BulkReservationResponseSchema
    );
  },
};
