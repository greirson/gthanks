import { z } from 'zod';

import { UnifiedPaginatedResponseSchema } from '@/lib/validators/pagination';

// Reservation schema for API responses
export const ReservationSchema = z.object({
  id: z.string(),
  wishId: z.string(),
  userId: z.string(),
  reservedAt: z.string().or(z.date()),
  purchasedAt: z.string().or(z.date()).nullable().optional(),
  purchasedDate: z.string().or(z.date()).nullable().optional(),
});

// Reservation with wish details
export const ReservationWithDetailsSchema = ReservationSchema.extend({
  wish: z.object({
    id: z.string(),
    title: z.string(),
    price: z.number().nullable(),
    imageUrl: z.string().nullable(),
    quantity: z.number(),
    ownerId: z.string(),
  }),
});

// Paginated reservations response using unified pagination
export const PaginatedReservationsResponseSchema = UnifiedPaginatedResponseSchema(
  ReservationWithDetailsSchema
);

// Reservation creation response
export const ReservationCreateResponseSchema = z.object({
  success: z.boolean(),
  message: z.string(),
  reservation: ReservationSchema.optional(),
});

// Reservation cancellation response
export const ReservationCancelResponseSchema = z.object({
  success: z.boolean(),
  message: z.string(),
});

// Reservation availability check response
export const ReservationAvailabilitySchema = z.object({
  available: z.boolean(),
  totalQuantity: z.number(),
  reservedQuantity: z.number(),
  availableQuantity: z.number(),
  wishId: z.string(),
});

// Bulk reservation operation result
export const BulkReservationOperationResultSchema = z.object({
  created: z.number().optional(),
  cancelled: z.number().optional(),
  skipped: z.number().optional(),
  message: z.string().optional(),
  errors: z
    .array(
      z.object({
        wishId: z.string(),
        error: z.string(),
      })
    )
    .optional(),
});

// Reservation with wish details (for user's own reservations)
export const ReservationWithWishSchema = ReservationSchema.extend({
  wish: z.object({
    id: z.string(),
    title: z.string(),
    notes: z.string().nullable(),
    url: z.string().nullable(),
    imageUrl: z.string().nullable(),
    sourceImageUrl: z.string().nullable(),
    localImagePath: z.string().nullable(),
    imageStatus: z.string(),
    price: z.number().nullable(),
    currency: z.string().nullable(),
    quantity: z.number(),
    size: z.string().nullable(),
    color: z.string().nullable(),
    wishLevel: z.number().nullable(),
    ownerId: z.string(),
    createdAt: z.string().or(z.date()),
    updatedAt: z.string().or(z.date()),
    user: z.object({
      id: z.string(),
      name: z.string().nullable(),
      email: z.string(),
      username: z.string().nullable().optional(),
    }),
  }),
});

// Public reservation info (hides reserver details from wish owner)
export const PublicReservationSchema = z.object({
  wishId: z.string(),
  isReserved: z.boolean(),
  reservedAt: z.string().or(z.date()).optional(),
  canUnreserve: z.boolean().optional(),
});

// Reservation status for multiple wishes
export const ReservationStatusSchema = z.record(
  z.string(),
  z.object({
    isReserved: z.boolean(),
    reservedAt: z.string().or(z.date()).optional(),
    isOwnReservation: z.boolean().optional(),
  })
);

// Reminder status
export const ReminderStatusSchema = z.object({
  needsReminder: z.boolean(),
  daysSinceReserved: z.number(),
  wishTitle: z.string(),
  reserverEmail: z.string().optional(),
});

// Export types
export type Reservation = z.infer<typeof ReservationSchema>;
export type ReservationWithDetails = z.infer<typeof ReservationWithDetailsSchema>;
export type ReservationWithWish = z.infer<typeof ReservationWithWishSchema>;
export type PublicReservation = z.infer<typeof PublicReservationSchema>;
export type ReservationStatus = z.infer<typeof ReservationStatusSchema>;
export type ReminderStatus = z.infer<typeof ReminderStatusSchema>;
export type PaginatedReservationsResponse = z.infer<typeof PaginatedReservationsResponseSchema>;
export type ReservationCreateResponse = z.infer<typeof ReservationCreateResponseSchema>;
export type ReservationCancelResponse = z.infer<typeof ReservationCancelResponseSchema>;
export type ReservationAvailability = z.infer<typeof ReservationAvailabilitySchema>;
export type BulkReservationOperationResult = z.infer<typeof BulkReservationOperationResultSchema>;

// Bulk cancel request
export const BulkCancelReservationsSchema = z.object({
  reservationIds: z.array(z.string()).min(1),
});

// Bulk mark as purchased request
export const BulkMarkPurchasedSchema = z.object({
  reservationIds: z.array(z.string()).min(1),
  purchasedDate: z.string().or(z.date()).optional(),
});

// Bulk operation response
export const BulkReservationResponseSchema = z.object({
  success: z.boolean(),
  cancelledCount: z.number().optional(),
  purchasedCount: z.number().optional(),
  message: z.string(),
});

// Export bulk operation types
export type BulkCancelReservations = z.infer<typeof BulkCancelReservationsSchema>;
export type BulkMarkPurchased = z.infer<typeof BulkMarkPurchasedSchema>;
export type BulkReservationResponse = z.infer<typeof BulkReservationResponseSchema>;
