import { Prisma, Reservation } from '@prisma/client';

import { db } from '@/lib/db';
import { ForbiddenError, NotFoundError, ValidationError } from '@/lib/errors';
import { generateSecureToken } from '@/lib/utils';
import { ReservationCreateInput } from '@/lib/validators/reservation';

import { logger } from './logger';
import {
  PublicReservation,
  ReminderStatus,
  ReservationStatus,
  ReservationWithWish,
} from './reservation-types';

export class ReservationService {
  /**
   * Create a reservation via public share token (validates list access)
   * Uses serializable transaction isolation to prevent race conditions
   */
  async createReservationViaShareToken(
    shareToken: string,
    data: ReservationCreateInput
  ): Promise<Reservation> {
    try {
      // Use interactive transaction with serializable isolation to prevent race conditions
      const reservation = await db.$transaction(
        async (tx) => {
          try {
            // Validate that the wish belongs to a list with this share token
            const list = await tx.list.findUnique({
              where: { shareToken },
              include: {
                wishes: {
                  where: { wishId: data.wishId },
                  include: { wish: true },
                },
              },
            });

            if (!list) {
              throw new NotFoundError('Invalid share token or list not found');
            }

            // Check if the wish is actually in this list
            if (list.wishes.length === 0) {
              throw new ForbiddenError('This wish does not belong to the shared list');
            }

            // Check if list is accessible (public or password-protected)
            if (list.visibility === 'private') {
              throw new ForbiddenError('Cannot create reservations on private lists');
            }

            // Check if already reserved (within transaction)
            const existingReservation = await tx.reservation.findFirst({
              where: { wishId: data.wishId },
            });

            if (existingReservation) {
              throw new ValidationError('This wish is already reserved');
            }

            // Create reservation with secure access token
            const accessToken = generateSecureToken(32); // 256-bit security

            const newReservation = await tx.reservation.create({
              data: {
                wishId: data.wishId,
                reserverName: data.reserverName,
                reserverEmail: data.reserverEmail,
                accessToken,
              },
            });

            return newReservation;
          } catch (error) {
            logger.error(
              {
                error,
                shareToken,
                wishId: data.wishId,
                reserverName: data.reserverName,
                reserverEmail: data.reserverEmail,
              },
              'Error creating reservation via share token within transaction'
            );
            throw error; // Re-throw to ensure transaction rollback
          }
        },
        {
          isolationLevel: 'Serializable', // Prevent concurrent reservations
          maxWait: 5000, // Wait up to 5s to acquire transaction
          timeout: 10000, // Transaction must complete within 10s
        }
      );

      return reservation;
    } catch (error) {
      // Handle transaction serialization failures with user-friendly message
      if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2034') {
        throw new ValidationError(
          'This wish was just reserved by someone else. Please refresh and try again.'
        );
      }
      // Re-throw other errors (including our custom errors from inside the transaction)
      throw error;
    }
  }

  /**
   * Create a reservation for a wish
   * Uses serializable transaction isolation to prevent race conditions
   */
  async createReservation(data: ReservationCreateInput, userId?: string): Promise<Reservation> {
    try {
      // Use interactive transaction with serializable isolation to prevent race conditions
      const reservation = await db.$transaction(
        async (tx) => {
          try {
            // Check if wish exists
            const wish = await tx.wish.findUnique({
              where: { id: data.wishId },
              include: {
                owner: true,
              },
            });

            if (!wish) {
              throw new NotFoundError('Wish not found');
            }

            // Can't reserve your own wish
            if (userId && wish.ownerId === userId) {
              throw new ForbiddenError('You cannot reserve your own wishes');
            }

            // Check if already reserved (within transaction)
            const existingReservation = await tx.reservation.findFirst({
              where: { wishId: data.wishId },
            });

            if (existingReservation) {
              throw new ValidationError('This wish is already reserved');
            }

            // Create reservation with secure access token
            const accessToken = generateSecureToken(32); // 256-bit security

            const newReservation = await tx.reservation.create({
              data: {
                wishId: data.wishId,
                reserverName: data.reserverName,
                reserverEmail: data.reserverEmail,
                accessToken,
              },
            });

            return newReservation;
          } catch (error) {
            logger.error(
              {
                error,
                wishId: data.wishId,
                reserverName: data.reserverName,
                reserverEmail: data.reserverEmail,
                userId,
              },
              'Error creating reservation within transaction'
            );
            throw error; // Re-throw to ensure transaction rollback
          }
        },
        {
          isolationLevel: 'Serializable', // Prevent concurrent reservations
          maxWait: 5000, // Wait up to 5s to acquire transaction
          timeout: 10000, // Transaction must complete within 10s
        }
      );

      return reservation;
    } catch (error) {
      // Handle transaction serialization failures with user-friendly message
      if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2034') {
        throw new ValidationError(
          'This wish was just reserved by someone else. Please refresh and try again.'
        );
      }
      // Re-throw other errors (including our custom errors from inside the transaction)
      throw error;
    }
  }

  /**
   * Remove a reservation
   */
  async removeReservation(reservationId: string, userEmail?: string): Promise<void> {
    // Require email for authorization
    if (!userEmail) {
      throw new ForbiddenError('Authentication required to remove reservations');
    }

    // Find reservation
    const reservation = await db.reservation.findUnique({
      where: { id: reservationId },
    });

    if (!reservation) {
      throw new NotFoundError('Reservation not found');
    }

    // Check permission to remove
    // Only the reserver can remove their reservation
    if (reservation.reserverEmail !== userEmail) {
      throw new ForbiddenError('You can only remove your own reservations');
    }

    // Remove reservation
    await db.reservation.delete({
      where: { id: reservationId },
    });
  }

  /**
   * Remove reservation by wish ID
   */
  async removeReservationByWishId(wishId: string, userEmail?: string): Promise<void> {
    // Require email for authorization
    if (!userEmail) {
      throw new ForbiddenError('Authentication required to remove reservations');
    }

    // Find reservation
    const reservation = await db.reservation.findFirst({
      where: { wishId },
    });

    if (!reservation) {
      throw new NotFoundError('No reservation found for this wish');
    }

    // Check permission
    if (reservation.reserverEmail !== userEmail) {
      throw new ForbiddenError('You can only remove your own reservations');
    }

    // Remove reservation
    await db.reservation.delete({
      where: { id: reservation.id },
    });
  }

  /**
   * Get reservation status for multiple wishes
   */
  async getReservationStatus(wishIds: string[], userEmail?: string): Promise<ReservationStatus> {
    // Get all reservations for these wishes
    const reservations = await db.reservation.findMany({
      where: {
        wishId: { in: wishIds },
      },
    });

    // Build status map
    const status: ReservationStatus = {};

    for (const wishId of wishIds) {
      const reservation = reservations.find((r) => r.wishId === wishId);

      if (reservation) {
        status[wishId] = {
          isReserved: true,
          reservedAt: reservation.reservedAt,
          isOwnReservation: reservation.reserverEmail === userEmail,
        };
      } else {
        status[wishId] = {
          isReserved: false,
        };
      }
    }

    return status;
  }

  /**
   * Get public reservation info (for wish owners)
   */
  async getPublicReservationInfo(wishId: string, userId: string): Promise<PublicReservation> {
    // Check if user owns the wish
    const wish = await db.wish.findUnique({
      where: { id: wishId },
    });

    if (!wish) {
      throw new NotFoundError('Wish not found');
    }

    // Find reservation
    const reservation = await db.reservation.findFirst({
      where: { wishId },
    });

    // If user owns the wish, hide reservation details
    if (wish.ownerId === userId) {
      return {
        wishId,
        isReserved: !!reservation,
        // Don't show who reserved it or when
        canUnreserve: false,
      };
    }

    // For non-owners, show full details
    return {
      wishId,
      isReserved: !!reservation,
      reservedAt: reservation?.reservedAt,
      canUnreserve: false, // Will implement later
    };
  }

  /**
   * Get reservations for a list (excluding owner's view)
   * Allows anonymous access for public/password-protected lists
   */
  async getListReservations(
    listId: string,
    userId?: string
  ): Promise<Record<string, PublicReservation>> {
    // Get list with wishes
    const list = await db.list.findUnique({
      where: { id: listId },
      include: {
        wishes: {
          include: {
            wish: true,
          },
        },
      },
    });

    if (!list) {
      throw new NotFoundError('List not found');
    }

    // Check access permissions for private lists
    if (list.visibility === 'private') {
      // For private lists, require authentication and ownership/admin access
      if (!userId) {
        throw new ForbiddenError('Authentication required to view this list');
      }

      // Check if user is owner
      const isOwner = list.ownerId === userId;
      if (!isOwner) {
        // Check if user is admin
        const isAdmin = await db.listAdmin.findUnique({
          where: {
            listId_userId: {
              listId,
              userId,
            },
          },
        });

        // Check if user has access through group membership
        const hasGroupAccess = !isAdmin
          ? await db.userGroup.findFirst({
              where: {
                userId,
                group: {
                  lists: {
                    some: { listId },
                  },
                },
              },
            })
          : null;

        if (!isAdmin && !hasGroupAccess) {
          throw new ForbiddenError('You do not have access to this list');
        }
      }
    }
    // Public and password-protected lists allow anonymous access to reservations

    // Get all wish IDs
    const wishIds = list.wishes.map((lw) => lw.wishId);

    // Get all reservations
    const reservations = await db.reservation.findMany({
      where: {
        wishId: { in: wishIds },
      },
    });

    // Build reservation map
    const reservationMap: Record<string, PublicReservation> = {};

    for (const listWish of list.wishes) {
      const reservation = reservations.find((r) => r.wishId === listWish.wishId);
      const isOwner = userId === listWish.wish.ownerId;

      // Hide reservation details from wish owner
      if (isOwner) {
        reservationMap[listWish.wish.id] = {
          wishId: listWish.wish.id,
          isReserved: false, // Always show as not reserved to owner
          canUnreserve: false,
        };
      } else {
        reservationMap[listWish.wish.id] = {
          wishId: listWish.wish.id,
          isReserved: !!reservation,
          reservedAt: reservation?.reservedAt,
          canUnreserve: reservation?.reserverEmail === userId,
        };
      }
    }

    return reservationMap;
  }

  /**
   * Get reservation by access token (for anonymous access)
   */
  async getReservationByToken(accessToken: string): Promise<ReservationWithWish | null> {
    if (!accessToken || accessToken.trim() === '') {
      throw new ValidationError('Access token is required');
    }

    const reservation = await db.reservation.findUnique({
      where: { accessToken },
      include: {
        wish: {
          include: {
            owner: {
              select: {
                id: true,
                name: true,
                email: true,
              },
            },
          },
        },
      },
    });

    if (!reservation) {
      return null;
    }

    return {
      ...reservation,
      wish: {
        id: reservation.wish.id,
        title: reservation.wish.title,
        owner: reservation.wish.owner,
      },
    };
  }

  /**
   * Remove reservation by access token (for anonymous access)
   */
  async removeReservationByToken(accessToken: string): Promise<void> {
    if (!accessToken || accessToken.trim() === '') {
      throw new ValidationError('Access token is required');
    }

    // Find reservation by token
    const reservation = await db.reservation.findUnique({
      where: { accessToken },
    });

    if (!reservation) {
      throw new NotFoundError('Reservation not found or invalid access token');
    }

    // Remove reservation
    await db.reservation.delete({
      where: { accessToken },
    });
  }

  /**
   * Get all reservations by access tokens (for bulk anonymous access)
   */
  async getReservationsByTokens(accessTokens: string[]): Promise<ReservationWithWish[]> {
    if (!accessTokens || accessTokens.length === 0) {
      return [];
    }

    // Filter out empty tokens
    const validTokens = accessTokens.filter((token) => token && token.trim() !== '');

    if (validTokens.length === 0) {
      return [];
    }

    const reservations = await db.reservation.findMany({
      where: {
        accessToken: { in: validTokens },
      },
      include: {
        wish: {
          include: {
            owner: {
              select: {
                id: true,
                name: true,
                email: true,
              },
            },
          },
        },
      },
      orderBy: {
        reservedAt: 'desc',
      },
    });

    return reservations.map((r) => ({
      ...r,
      wish: {
        id: r.wish.id,
        title: r.wish.title,
        owner: r.wish.owner,
      },
    }));
  }

  /**
   * Get user's reservations
   */
  async getUserReservations(email: string): Promise<ReservationWithWish[]> {
    const reservations = await db.reservation.findMany({
      where: { reserverEmail: email },
      include: {
        wish: {
          include: {
            owner: {
              select: {
                id: true,
                name: true,
                email: true,
              },
            },
          },
        },
      },
      orderBy: {
        reservedAt: 'desc',
      },
    });

    return reservations.map((r) => ({
      ...r,
      wish: {
        id: r.wish.id,
        title: r.wish.title,
        owner: r.wish.owner,
      },
    }));
  }

  /**
   * Check for overdue reservations (30+ days)
   */
  async getOverdueReservations(userId: string): Promise<ReminderStatus[]> {
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    // Get user's wishes with old reservations
    const wishes = await db.wish.findMany({
      where: {
        ownerId: userId,
        reservations: {
          some: {
            reservedAt: { lt: thirtyDaysAgo },
            reminderSentAt: null,
          },
        },
      },
      include: {
        reservations: {
          where: {
            reservedAt: { lt: thirtyDaysAgo },
            reminderSentAt: null,
          },
        },
      },
    });

    // Build reminder status
    const reminders: ReminderStatus[] = [];

    for (const wish of wishes) {
      for (const reservation of wish.reservations) {
        const daysSinceReserved = Math.floor(
          (Date.now() - reservation.reservedAt.getTime()) / (1000 * 60 * 60 * 24)
        );

        reminders.push({
          needsReminder: true,
          daysSinceReserved,
          wishTitle: wish.title,
          reserverEmail: reservation.reserverEmail || undefined,
        });
      }
    }

    return reminders;
  }

  /**
   * Mark reminder as sent
   */
  async markReminderSent(reservationId: string): Promise<void> {
    await db.reservation.update({
      where: { id: reservationId },
      data: { reminderSentAt: new Date() },
    });
  }

  /**
   * Handle post-purchase actions
   */
  async handleWishReceived(
    wishId: string,
    userId: string,
    action: 'delete' | 'unreserve'
  ): Promise<void> {
    // Verify user owns the wish
    const wish = await db.wish.findUnique({
      where: { id: wishId },
    });

    if (!wish) {
      throw new NotFoundError('Wish not found');
    }

    if (wish.ownerId !== userId) {
      throw new ForbiddenError('You can only manage your own wishes');
    }

    if (action === 'delete') {
      // Delete wish (cascade will handle reservation)
      await db.wish.delete({
        where: { id: wishId },
      });
    } else {
      // Remove reservation
      await db.reservation.deleteMany({
        where: { wishId },
      });
    }
  }
}

// Export singleton instance
export const reservationService = new ReservationService();
