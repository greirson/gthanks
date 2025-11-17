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
 *         reserverName:
 *           type: string
 *           maxLength: 100
 *           nullable: true
 *           description: Name of the person making the reservation (optional for authenticated users)
 *         reserverEmail:
 *           type: string
 *           format: email
 *           nullable: true
 *           description: Email of the person making the reservation (optional for authenticated users)
 *       required:
 *         - wishId
 */

// Schema for creating a reservation
export const ReservationCreateSchema = z.object({
  wishId: z.string(),

  reserverName: z
    .string()
    .max(100, 'Name must be less than 100 characters')
    .optional()
    .nullable()
    .transform((val) => val || null),

  reserverEmail: z
    .string()
    .email('Invalid email address')
    .optional()
    .nullable()
    .transform((val) => val || null),
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
  reserverName: z.string().nullable(),
  reserverEmail: z.string().nullable(),
  reservedAt: z.date(),
  reminderSentAt: z.date().nullable(),
});

// Type exports
export type ReservationCreateInput = z.infer<typeof ReservationCreateSchema>;
export type CheckReservationInput = z.infer<typeof CheckReservationSchema>;
export type ReservationDetails = z.infer<typeof ReservationDetailsSchema>;
