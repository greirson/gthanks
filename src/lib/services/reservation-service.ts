import { Prisma, Reservation } from '@prisma/client';

import { db } from '@/lib/db';
import { ForbiddenError, NotFoundError, ValidationError } from '@/lib/errors';
import { ReservationCreateInput } from '@/lib/validators/reservation';

import { logger } from './logger';
import { permissionService } from './permission-service';
import { PublicReservation, ReservationStatus, ReservationWithWish } from './reservation-types';

export class ReservationService {
  /**
   * Create a reservation via public share token (validates list access)
   * Uses serializable transaction isolation to prevent race conditions
   *
   * **AUTHENTICATED USERS ONLY** - Anonymous reservations are no longer supported
   */
  async createReservationViaShareToken(
    shareToken: string,
    data: ReservationCreateInput,
    userId: string
  ): Promise<Reservation> {
    if (!userId) {
      throw new ForbiddenError('Authentication required to reserve wishes');
    }

    try {
      // Use interactive transaction with serializable isolation to prevent race conditions
      const reservation = await db.$transaction(
        async (tx) => {
          try {
            // Validate that the wish belongs to a list with this share token
            const list = await tx.list.findUnique({
              where: { shareToken },
              include: {
                listWishes: {
                  where: { wishId: data.wishId },
                  include: { wish: true },
                },
              },
            });

            if (!list) {
              throw new NotFoundError('Invalid share token or list not found');
            }

            // Check if the wish is actually in this list
            if (list.listWishes.length === 0) {
              throw new ForbiddenError('This wish does not belong to the shared list');
            }

            // Check if list is accessible (public or password-protected)
            if (list.visibility === 'private') {
              throw new ForbiddenError('Cannot create reservations on private lists');
            }

            // Can't reserve your own wish (surprise protection)
            if (list.listWishes[0].wish.ownerId === userId) {
              throw new ForbiddenError('You cannot reserve your own wishes');
            }

            // Check if already reserved (within transaction)
            const existingReservation = await tx.reservation.findFirst({
              where: { wishId: data.wishId },
            });

            if (existingReservation) {
              throw new ValidationError('This wish is already reserved');
            }

            // Create reservation
            const newReservation = await tx.reservation.create({
              data: {
                wishId: data.wishId,
                userId,
              },
            });

            return newReservation;
          } catch (error) {
            logger.error(
              {
                error,
                shareToken,
                wishId: data.wishId,
                userId,
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
   *
   * Permission Requirements:
   * - Must be authenticated
   * - Must have view access to at least one list containing the wish
   * - Cannot reserve own wishes (surprise protection)
   *
   * Security:
   * - Serializable transaction prevents race conditions
   * - Permission check ensures user can view the wish via list access
   */
  async createReservation(data: ReservationCreateInput, userId: string): Promise<Reservation> {
    if (!userId) {
      throw new ForbiddenError('Authentication required to reserve wishes');
    }

    try {
      // Use interactive transaction with serializable isolation to prevent race conditions
      const reservation = await db.$transaction(
        async (tx) => {
          try {
            // Check if wish exists and get list information
            const wish = await tx.wish.findUnique({
              where: { id: data.wishId },
              include: {
                user: true,
                listWishes: {
                  include: {
                    list: true,
                  },
                },
              },
            });

            if (!wish) {
              throw new NotFoundError('Wish not found');
            }

            // Can't reserve your own wish (surprise protection)
            if (wish.ownerId === userId) {
              throw new ForbiddenError('You cannot reserve your own wishes');
            }

            // Verify user has permission to view at least one list containing this wish
            if (wish.listWishes.length === 0) {
              throw new NotFoundError('Wish is not on any list');
            }

            // Check permission to view at least one list containing the wish
            let hasAccess = false;
            for (const listWish of wish.listWishes) {
              const permissionResult = await permissionService.can(userId, 'view', {
                type: 'list',
                id: listWish.list.id,
              });
              if (permissionResult.allowed) {
                hasAccess = true;
                break;
              }
            }

            if (!hasAccess) {
              throw new ForbiddenError('You do not have permission to reserve this wish');
            }

            // Check if already reserved (within transaction)
            const existingReservation = await tx.reservation.findFirst({
              where: { wishId: data.wishId },
            });

            if (existingReservation) {
              throw new ValidationError('This wish is already reserved');
            }

            // Create reservation
            const newReservation = await tx.reservation.create({
              data: {
                wishId: data.wishId,
                userId,
              },
            });

            return newReservation;
          } catch (error) {
            logger.error(
              {
                error,
                wishId: data.wishId,
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
   *
   * Permission Requirements:
   * - Must be authenticated
   * - Can only remove own reservations
   * - Admins can remove any reservation (permission service override)
   *
   * @param reservationId - ID of reservation to remove
   * @param userId - ID of authenticated user
   */
  async removeReservation(reservationId: string, userId: string): Promise<void> {
    if (!userId) {
      throw new ForbiddenError('Authentication required to remove reservations');
    }

    // Use permission service to check access
    await permissionService.require(userId, 'delete', {
      type: 'reservation',
      id: reservationId,
    });

    // Remove reservation
    await db.reservation.delete({
      where: { id: reservationId },
    });
  }

  /**
   * Remove reservation by wish ID
   *
   * Permission Requirements:
   * - Must be authenticated
   * - Can only remove own reservations
   * - Admins can remove any reservation (permission service override)
   *
   * @param wishId - ID of wish to unreserve
   * @param userId - ID of authenticated user
   */
  async removeReservationByWishId(wishId: string, userId: string): Promise<void> {
    if (!userId) {
      throw new ForbiddenError('Authentication required to remove reservations');
    }

    // Find reservation
    const reservation = await db.reservation.findFirst({
      where: { wishId },
    });

    if (!reservation) {
      throw new NotFoundError('No reservation found for this wish');
    }

    // Use permission service to check access
    await permissionService.require(userId, 'delete', {
      type: 'reservation',
      id: reservation.id,
    });

    // Remove reservation
    await db.reservation.delete({
      where: { id: reservation.id },
    });
  }

  /**
   * Get reservation status for multiple wishes
   */
  async getReservationStatus(wishIds: string[], userId?: string): Promise<ReservationStatus> {
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
          isOwnReservation: reservation.userId === userId,
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
   *
   * Permission Requirements:
   * - Must have view access to the wish (via list access)
   *
   * Privacy Rules:
   * - Wish owners see that wish is reserved but not who/when (surprise protection)
   * - Non-owners see full reservation details
   */
  async getPublicReservationInfo(wishId: string, userId: string): Promise<PublicReservation> {
    // Verify user has permission to view the wish
    await permissionService.require(userId, 'view', { type: 'wish', id: wishId });

    // Get wish
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

    // If user owns the wish, hide reservation details (surprise protection)
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
      canUnreserve: reservation?.userId === userId,
    };
  }

  /**
   * Get reservations for a list (excluding owner's view)
   * Allows anonymous access for public/password-protected lists
   *
   * Permission Requirements:
   * - Public lists: Anyone can view reservations
   * - Password-protected lists: Anyone with password can view
   * - Private lists: Owner, co-managers, or group members
   *
   * Privacy Rules:
   * - Wish owners never see their own reservation details (surprise protection)
   * - Others see if wish is reserved and can unreserve if they made the reservation
   */
  async getListReservations(
    listId: string,
    userId?: string
  ): Promise<Record<string, PublicReservation>> {
    // Use permission service to check list access
    await permissionService.require(userId, 'view', { type: 'list', id: listId });

    // Get list with wishes
    const list = await db.list.findUnique({
      where: { id: listId },
      include: {
        listWishes: {
          include: {
            wish: true,
          },
        },
      },
    });

    if (!list) {
      throw new NotFoundError('List not found');
    }

    // Get all wish IDs
    const wishIds = list.listWishes.map((lw) => lw.wishId);

    // Get all reservations
    const reservations = await db.reservation.findMany({
      where: {
        wishId: { in: wishIds },
      },
    });

    // Build reservation map
    const reservationMap: Record<string, PublicReservation> = {};

    for (const listWish of list.listWishes) {
      const reservation = reservations.find((r) => r.wishId === listWish.wishId);
      const isOwner = userId === listWish.wish.ownerId;

      // Hide reservation details from wish owner (surprise protection)
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
          canUnreserve: reservation?.userId === userId,
        };
      }
    }

    return reservationMap;
  }

  /**
   * Get user's reservations
   *
   * @param userId - ID of authenticated user
   * @returns List of user's reservations with wish details
   */
  async getUserReservations(userId: string): Promise<ReservationWithWish[]> {
    if (!userId) {
      throw new ForbiddenError('Authentication required');
    }

    const reservations = await db.reservation.findMany({
      where: { userId },
      include: {
        wish: {
          include: {
            user: {
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
        user: r.wish.user,
      },
    }));
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
