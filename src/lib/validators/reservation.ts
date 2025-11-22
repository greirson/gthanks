import { z } from 'zod';

/**
 * @swagger
 * components:
 *   schemas:
 *     ReservationCreate:
 *       type: object
 *       properties:
 *         wishId:
 *           type: string
 *           description: ID of the wish to reserve
 *       required:
 *         - wishId
 */

// Schema for creating a reservation (authenticated users only)
export const ReservationCreateSchema = z.object({
  wishId: z.string(),
});

// Schema for checking reservation status
export const CheckReservationSchema = z.object({
  wishIds: z
    .array(z.string())
    .min(1, 'At least one wish ID required')
    .max(100, 'Maximum 100 wishes at once'),
});

// Schema for reservation with details
export const ReservationDetailsSchema = z.object({
  id: z.string(),
  wishId: z.string(),
  userId: z.string(),
  reservedAt: z.date(),
});

// Type exports
export type ReservationCreateInput = z.infer<typeof ReservationCreateSchema>;
export type CheckReservationInput = z.infer<typeof CheckReservationSchema>;
export type ReservationDetails = z.infer<typeof ReservationDetailsSchema>;
