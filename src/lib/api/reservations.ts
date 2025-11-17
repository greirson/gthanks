import { z } from 'zod';

import { apiDelete, apiGet, apiPost } from '@/lib/api-client';
import {
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
};
