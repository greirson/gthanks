import { Reservation } from '@prisma/client';

// Reservation with wish details
export interface ReservationWithWish extends Reservation {
  wish: {
    id: string;
    title: string;
    user: {
      id: string;
      name: string | null;
      email: string;
    };
  };
}

// Public reservation info (hides reserver details from wish owner)
export interface PublicReservation {
  wishId: string;
  isReserved: boolean;
  reservedAt?: Date;
  canUnreserve?: boolean;
}

// Reservation status for multiple wishes
export interface ReservationStatus {
  [wishId: string]: {
    isReserved: boolean;
    reservedAt?: Date;
    isOwnReservation?: boolean;
  };
}

// Reminder status
export interface ReminderStatus {
  needsReminder: boolean;
  daysSinceReserved: number;
  wishTitle: string;
  reserverEmail?: string;
}
