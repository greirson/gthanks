import { reservationService } from '@/lib/services/reservation-service';
import { db } from '@/lib/db';
import { ForbiddenError } from '@/lib/errors';

// Mock dependencies
jest.mock('@/lib/db', () => ({
  db: {
    reservation: {
      findMany: jest.fn(),
      delete: jest.fn(),
      update: jest.fn(),
    },
    $transaction: jest.fn(),
  },
}));

jest.mock('@/lib/services/logger', () => ({
  logger: {
    error: jest.fn(),
  },
}));

describe('reservationService', () => {
  const mockUserId = 'user-123';
  const mockOtherUserId = 'user-456';

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('bulkCancel', () => {
    const mockReservationIds = ['res-1', 'res-2', 'res-3'];

    describe('authentication validation', () => {
      it('throws ForbiddenError when userId is empty string', async () => {
        await expect(reservationService.bulkCancel(mockReservationIds, '')).rejects.toThrow(
          ForbiddenError
        );

        await expect(reservationService.bulkCancel(mockReservationIds, '')).rejects.toThrow(
          'Authentication required to cancel reservations'
        );

        expect(db.reservation.findMany).not.toHaveBeenCalled();
      });

      it('throws ForbiddenError when userId is null/undefined', async () => {
        // TypeScript would catch this, but test runtime behavior
        await expect(
          reservationService.bulkCancel(mockReservationIds, null as any)
        ).rejects.toThrow(ForbiddenError);

        await expect(
          reservationService.bulkCancel(mockReservationIds, undefined as any)
        ).rejects.toThrow('Authentication required to cancel reservations');
      });
    });

    describe('ownership validation', () => {
      it('throws ForbiddenError when user does not own all reservations', async () => {
        const mockReservations = [
          { id: 'res-1', userId: mockUserId },
          { id: 'res-2', userId: mockOtherUserId }, // Not owned by user
          { id: 'res-3', userId: mockUserId },
        ];

        (db.reservation.findMany as jest.Mock).mockResolvedValue(mockReservations);

        await expect(reservationService.bulkCancel(mockReservationIds, mockUserId)).rejects.toThrow(
          ForbiddenError
        );

        await expect(reservationService.bulkCancel(mockReservationIds, mockUserId)).rejects.toThrow(
          'Cannot cancel 1 reservation(s) belonging to other users'
        );

        expect(db.$transaction).not.toHaveBeenCalled();
      });

      it('throws ForbiddenError with count when multiple unauthorized reservations', async () => {
        const mockReservations = [
          { id: 'res-1', userId: mockOtherUserId },
          { id: 'res-2', userId: mockOtherUserId },
          { id: 'res-3', userId: mockUserId },
        ];

        (db.reservation.findMany as jest.Mock).mockResolvedValue(mockReservations);

        await expect(reservationService.bulkCancel(mockReservationIds, mockUserId)).rejects.toThrow(
          'Cannot cancel 2 reservation(s) belonging to other users'
        );
      });

      it('verifies ownership by querying reservations with correct filter', async () => {
        const mockReservations = [
          { id: 'res-1', userId: mockUserId },
          { id: 'res-2', userId: mockUserId },
        ];

        (db.reservation.findMany as jest.Mock).mockResolvedValue(mockReservations);
        (db.$transaction as jest.Mock).mockImplementation((callback) => callback(db));

        await reservationService.bulkCancel(['res-1', 'res-2'], mockUserId);

        expect(db.reservation.findMany).toHaveBeenCalledWith({
          where: { id: { in: ['res-1', 'res-2'] } },
          select: { id: true, userId: true },
        });
      });
    });

    describe('successful cancellation', () => {
      it('deletes all reservations in a transaction when all owned by user', async () => {
        const mockReservations = [
          { id: 'res-1', userId: mockUserId },
          { id: 'res-2', userId: mockUserId },
          { id: 'res-3', userId: mockUserId },
        ];

        (db.reservation.findMany as jest.Mock).mockResolvedValue(mockReservations);

        const transactionCallback = jest.fn(async (tx) => {
          for (const id of mockReservationIds) {
            await tx.reservation.delete({ where: { id, userId: mockUserId } });
          }
        });

        (db.$transaction as jest.Mock).mockImplementation(async (callback) => {
          return callback(db);
        });

        const result = await reservationService.bulkCancel(mockReservationIds, mockUserId);

        expect(db.$transaction).toHaveBeenCalled();
        expect(db.reservation.delete).toHaveBeenCalledTimes(3);
        expect(db.reservation.delete).toHaveBeenCalledWith({
          where: { id: 'res-1', userId: mockUserId },
        });
        expect(result).toEqual({
          succeeded: ['res-1', 'res-2', 'res-3'],
          failed: [],
          totalProcessed: 3,
        });
      });

      it('returns succeeded list with all reservation IDs on success', async () => {
        const mockReservations = [
          { id: 'res-1', userId: mockUserId },
          { id: 'res-2', userId: mockUserId },
        ];

        (db.reservation.findMany as jest.Mock).mockResolvedValue(mockReservations);
        (db.$transaction as jest.Mock).mockImplementation((callback) => callback(db));

        const result = await reservationService.bulkCancel(['res-1', 'res-2'], mockUserId);

        expect(result.succeeded).toEqual(['res-1', 'res-2']);
        expect(result.failed).toEqual([]);
        expect(result.totalProcessed).toBe(2);
      });
    });

    describe('partial failure handling', () => {
      it('returns succeeded and failed lists for partial success', async () => {
        const mockReservations = [
          { id: 'res-1', userId: mockUserId },
          { id: 'res-2', userId: mockUserId },
          { id: 'res-3', userId: mockUserId },
        ];

        (db.reservation.findMany as jest.Mock).mockResolvedValue(mockReservations);

        (db.$transaction as jest.Mock).mockImplementation(async (callback) => {
          const mockTx = {
            reservation: {
              delete: jest.fn().mockImplementation(({ where }) => {
                if (where.id === 'res-2') {
                  throw new Error('Database constraint violation');
                }
                return Promise.resolve();
              }),
            },
          };
          return callback(mockTx);
        });

        const result = await reservationService.bulkCancel(mockReservationIds, mockUserId);

        expect(result.succeeded).toEqual(['res-1', 'res-3']);
        expect(result.failed).toEqual([
          {
            id: 'res-2',
            reason: 'Database constraint violation',
          },
        ]);
        expect(result.totalProcessed).toBe(3);
      });

      it('handles all failures gracefully', async () => {
        const mockReservations = [
          { id: 'res-1', userId: mockUserId },
          { id: 'res-2', userId: mockUserId },
        ];

        (db.reservation.findMany as jest.Mock).mockResolvedValue(mockReservations);

        (db.$transaction as jest.Mock).mockImplementation(async (callback) => {
          const mockTx = {
            reservation: {
              delete: jest.fn().mockRejectedValue(new Error('Database error')),
            },
          };
          return callback(mockTx);
        });

        const result = await reservationService.bulkCancel(['res-1', 'res-2'], mockUserId);

        expect(result.succeeded).toEqual([]);
        expect(result.failed).toEqual([
          { id: 'res-1', reason: 'Database error' },
          { id: 'res-2', reason: 'Database error' },
        ]);
        expect(result.totalProcessed).toBe(2);
      });

      it('handles non-Error exceptions in failed list', async () => {
        const mockReservations = [{ id: 'res-1', userId: mockUserId }];

        (db.reservation.findMany as jest.Mock).mockResolvedValue(mockReservations);

        (db.$transaction as jest.Mock).mockImplementation(async (callback) => {
          const mockTx = {
            reservation: {
              delete: jest.fn().mockRejectedValue('String error'),
            },
          };
          return callback(mockTx);
        });

        const result = await reservationService.bulkCancel(['res-1'], mockUserId);

        expect(result.failed).toEqual([
          {
            id: 'res-1',
            reason: 'Unknown error',
          },
        ]);
      });
    });

    describe('transaction behavior', () => {
      it('double-checks ownership in delete operation (defense in depth)', async () => {
        const mockReservations = [{ id: 'res-1', userId: mockUserId }];

        (db.reservation.findMany as jest.Mock).mockResolvedValue(mockReservations);
        (db.$transaction as jest.Mock).mockImplementation((callback) => callback(db));

        await reservationService.bulkCancel(['res-1'], mockUserId);

        expect(db.reservation.delete).toHaveBeenCalledWith({
          where: { id: 'res-1', userId: mockUserId },
        });
      });

      it('uses transaction for atomic operation', async () => {
        const mockReservations = [
          { id: 'res-1', userId: mockUserId },
          { id: 'res-2', userId: mockUserId },
        ];

        (db.reservation.findMany as jest.Mock).mockResolvedValue(mockReservations);

        let transactionCalled = false;
        (db.$transaction as jest.Mock).mockImplementation(async (callback) => {
          transactionCalled = true;
          return callback(db);
        });

        await reservationService.bulkCancel(['res-1', 'res-2'], mockUserId);

        expect(transactionCalled).toBe(true);
      });
    });

    describe('edge cases', () => {
      it('handles empty reservation ID array', async () => {
        (db.reservation.findMany as jest.Mock).mockResolvedValue([]);
        (db.$transaction as jest.Mock).mockImplementation((callback) => callback(db));

        const result = await reservationService.bulkCancel([], mockUserId);

        expect(result).toEqual({
          succeeded: [],
          failed: [],
          totalProcessed: 0,
        });
      });

      it('handles single reservation ID', async () => {
        const mockReservations = [{ id: 'res-1', userId: mockUserId }];

        (db.reservation.findMany as jest.Mock).mockResolvedValue(mockReservations);
        (db.$transaction as jest.Mock).mockImplementation((callback) => callback(db));

        const result = await reservationService.bulkCancel(['res-1'], mockUserId);

        expect(result.totalProcessed).toBe(1);
        expect(result.succeeded).toEqual(['res-1']);
      });
    });
  });

  describe('bulkMarkPurchased', () => {
    const mockReservationIds = ['res-1', 'res-2', 'res-3'];
    const mockPurchasedDate = new Date('2025-01-15T10:00:00Z');

    describe('authentication validation', () => {
      it('throws ForbiddenError when userId is empty string', async () => {
        await expect(reservationService.bulkMarkPurchased(mockReservationIds, '')).rejects.toThrow(
          ForbiddenError
        );

        await expect(reservationService.bulkMarkPurchased(mockReservationIds, '')).rejects.toThrow(
          'Authentication required to mark reservations as purchased'
        );

        expect(db.reservation.findMany).not.toHaveBeenCalled();
      });

      it('throws ForbiddenError when userId is null/undefined', async () => {
        await expect(
          reservationService.bulkMarkPurchased(mockReservationIds, null as any)
        ).rejects.toThrow(ForbiddenError);

        await expect(
          reservationService.bulkMarkPurchased(mockReservationIds, undefined as any)
        ).rejects.toThrow('Authentication required to mark reservations as purchased');
      });
    });

    describe('ownership validation', () => {
      it('throws ForbiddenError when user does not own all reservations', async () => {
        const mockReservations = [
          { id: 'res-1', userId: mockUserId },
          { id: 'res-2', userId: mockOtherUserId }, // Not owned by user
          { id: 'res-3', userId: mockUserId },
        ];

        (db.reservation.findMany as jest.Mock).mockResolvedValue(mockReservations);

        await expect(
          reservationService.bulkMarkPurchased(mockReservationIds, mockUserId)
        ).rejects.toThrow(ForbiddenError);

        await expect(
          reservationService.bulkMarkPurchased(mockReservationIds, mockUserId)
        ).rejects.toThrow('Cannot mark 1 reservation(s) as purchased (not yours)');

        expect(db.$transaction).not.toHaveBeenCalled();
      });

      it('throws ForbiddenError with count when multiple unauthorized reservations', async () => {
        const mockReservations = [
          { id: 'res-1', userId: mockOtherUserId },
          { id: 'res-2', userId: mockOtherUserId },
          { id: 'res-3', userId: mockUserId },
        ];

        (db.reservation.findMany as jest.Mock).mockResolvedValue(mockReservations);

        await expect(
          reservationService.bulkMarkPurchased(mockReservationIds, mockUserId)
        ).rejects.toThrow('Cannot mark 2 reservation(s) as purchased (not yours)');
      });

      it('verifies ownership by querying reservations with correct filter', async () => {
        const mockReservations = [
          { id: 'res-1', userId: mockUserId },
          { id: 'res-2', userId: mockUserId },
        ];

        (db.reservation.findMany as jest.Mock).mockResolvedValue(mockReservations);
        (db.$transaction as jest.Mock).mockImplementation((callback) => callback(db));

        await reservationService.bulkMarkPurchased(['res-1', 'res-2'], mockUserId);

        expect(db.reservation.findMany).toHaveBeenCalledWith({
          where: { id: { in: ['res-1', 'res-2'] } },
          select: { id: true, userId: true },
        });
      });
    });

    describe('successful update', () => {
      it('updates all reservations with purchasedAt timestamp in transaction', async () => {
        const mockReservations = [
          { id: 'res-1', userId: mockUserId },
          { id: 'res-2', userId: mockUserId },
          { id: 'res-3', userId: mockUserId },
        ];

        (db.reservation.findMany as jest.Mock).mockResolvedValue(mockReservations);
        (db.$transaction as jest.Mock).mockImplementation((callback) => callback(db));

        const result = await reservationService.bulkMarkPurchased(mockReservationIds, mockUserId);

        expect(db.$transaction).toHaveBeenCalled();
        expect(db.reservation.update).toHaveBeenCalledTimes(3);
        expect(db.reservation.update).toHaveBeenCalledWith({
          where: { id: 'res-1', userId: mockUserId },
          data: {
            purchasedAt: expect.any(Date),
            purchasedDate: expect.any(Date),
          },
        });
        expect(result).toEqual({
          succeeded: ['res-1', 'res-2', 'res-3'],
          failed: [],
          totalProcessed: 3,
        });
      });

      it('uses provided purchasedDate when specified', async () => {
        const mockReservations = [{ id: 'res-1', userId: mockUserId }];

        (db.reservation.findMany as jest.Mock).mockResolvedValue(mockReservations);
        (db.$transaction as jest.Mock).mockImplementation((callback) => callback(db));

        await reservationService.bulkMarkPurchased(['res-1'], mockUserId, mockPurchasedDate);

        expect(db.reservation.update).toHaveBeenCalledWith({
          where: { id: 'res-1', userId: mockUserId },
          data: {
            purchasedAt: expect.any(Date),
            purchasedDate: mockPurchasedDate,
          },
        });
      });

      it('uses current date for purchasedDate when not provided', async () => {
        const mockReservations = [{ id: 'res-1', userId: mockUserId }];

        (db.reservation.findMany as jest.Mock).mockResolvedValue(mockReservations);
        (db.$transaction as jest.Mock).mockImplementation((callback) => callback(db));

        const beforeCall = new Date();
        await reservationService.bulkMarkPurchased(['res-1'], mockUserId);
        const afterCall = new Date();

        expect(db.reservation.update).toHaveBeenCalledWith({
          where: { id: 'res-1', userId: mockUserId },
          data: {
            purchasedAt: expect.any(Date),
            purchasedDate: expect.any(Date),
          },
        });

        // Verify dates are reasonable
        const callArgs = (db.reservation.update as jest.Mock).mock.calls[0][0];
        expect(callArgs.data.purchasedAt.getTime()).toBeGreaterThanOrEqual(beforeCall.getTime());
        expect(callArgs.data.purchasedAt.getTime()).toBeLessThanOrEqual(afterCall.getTime());
      });

      it('returns succeeded list with all reservation IDs on success', async () => {
        const mockReservations = [
          { id: 'res-1', userId: mockUserId },
          { id: 'res-2', userId: mockUserId },
        ];

        (db.reservation.findMany as jest.Mock).mockResolvedValue(mockReservations);
        (db.$transaction as jest.Mock).mockImplementation((callback) => callback(db));

        const result = await reservationService.bulkMarkPurchased(['res-1', 'res-2'], mockUserId);

        expect(result.succeeded).toEqual(['res-1', 'res-2']);
        expect(result.failed).toEqual([]);
        expect(result.totalProcessed).toBe(2);
      });
    });

    describe('partial failure handling', () => {
      it('returns succeeded and failed lists for partial success', async () => {
        const mockReservations = [
          { id: 'res-1', userId: mockUserId },
          { id: 'res-2', userId: mockUserId },
          { id: 'res-3', userId: mockUserId },
        ];

        (db.reservation.findMany as jest.Mock).mockResolvedValue(mockReservations);

        (db.$transaction as jest.Mock).mockImplementation(async (callback) => {
          const mockTx = {
            reservation: {
              update: jest.fn().mockImplementation(({ where }) => {
                if (where.id === 'res-2') {
                  throw new Error('Database constraint violation');
                }
                return Promise.resolve();
              }),
            },
          };
          return callback(mockTx);
        });

        const result = await reservationService.bulkMarkPurchased(mockReservationIds, mockUserId);

        expect(result.succeeded).toEqual(['res-1', 'res-3']);
        expect(result.failed).toEqual([
          {
            id: 'res-2',
            reason: 'Database constraint violation',
          },
        ]);
        expect(result.totalProcessed).toBe(3);
      });

      it('handles all failures gracefully', async () => {
        const mockReservations = [
          { id: 'res-1', userId: mockUserId },
          { id: 'res-2', userId: mockUserId },
        ];

        (db.reservation.findMany as jest.Mock).mockResolvedValue(mockReservations);

        (db.$transaction as jest.Mock).mockImplementation(async (callback) => {
          const mockTx = {
            reservation: {
              update: jest.fn().mockRejectedValue(new Error('Database error')),
            },
          };
          return callback(mockTx);
        });

        const result = await reservationService.bulkMarkPurchased(['res-1', 'res-2'], mockUserId);

        expect(result.succeeded).toEqual([]);
        expect(result.failed).toEqual([
          { id: 'res-1', reason: 'Database error' },
          { id: 'res-2', reason: 'Database error' },
        ]);
        expect(result.totalProcessed).toBe(2);
      });

      it('handles non-Error exceptions in failed list', async () => {
        const mockReservations = [{ id: 'res-1', userId: mockUserId }];

        (db.reservation.findMany as jest.Mock).mockResolvedValue(mockReservations);

        (db.$transaction as jest.Mock).mockImplementation(async (callback) => {
          const mockTx = {
            reservation: {
              update: jest.fn().mockRejectedValue('String error'),
            },
          };
          return callback(mockTx);
        });

        const result = await reservationService.bulkMarkPurchased(['res-1'], mockUserId);

        expect(result.failed).toEqual([
          {
            id: 'res-1',
            reason: 'Unknown error',
          },
        ]);
      });
    });

    describe('transaction behavior', () => {
      it('double-checks ownership in update operation (defense in depth)', async () => {
        const mockReservations = [{ id: 'res-1', userId: mockUserId }];

        (db.reservation.findMany as jest.Mock).mockResolvedValue(mockReservations);
        (db.$transaction as jest.Mock).mockImplementation((callback) => callback(db));

        await reservationService.bulkMarkPurchased(['res-1'], mockUserId);

        expect(db.reservation.update).toHaveBeenCalledWith({
          where: { id: 'res-1', userId: mockUserId },
          data: expect.any(Object),
        });
      });

      it('uses transaction for atomic operation', async () => {
        const mockReservations = [
          { id: 'res-1', userId: mockUserId },
          { id: 'res-2', userId: mockUserId },
        ];

        (db.reservation.findMany as jest.Mock).mockResolvedValue(mockReservations);

        let transactionCalled = false;
        (db.$transaction as jest.Mock).mockImplementation(async (callback) => {
          transactionCalled = true;
          return callback(db);
        });

        await reservationService.bulkMarkPurchased(['res-1', 'res-2'], mockUserId);

        expect(transactionCalled).toBe(true);
      });
    });

    describe('edge cases', () => {
      it('handles empty reservation ID array', async () => {
        (db.reservation.findMany as jest.Mock).mockResolvedValue([]);
        (db.$transaction as jest.Mock).mockImplementation((callback) => callback(db));

        const result = await reservationService.bulkMarkPurchased([], mockUserId);

        expect(result).toEqual({
          succeeded: [],
          failed: [],
          totalProcessed: 0,
        });
      });

      it('handles single reservation ID', async () => {
        const mockReservations = [{ id: 'res-1', userId: mockUserId }];

        (db.reservation.findMany as jest.Mock).mockResolvedValue(mockReservations);
        (db.$transaction as jest.Mock).mockImplementation((callback) => callback(db));

        const result = await reservationService.bulkMarkPurchased(['res-1'], mockUserId);

        expect(result.totalProcessed).toBe(1);
        expect(result.succeeded).toEqual(['res-1']);
      });

      it('handles undefined purchasedDate (uses current date)', async () => {
        const mockReservations = [{ id: 'res-1', userId: mockUserId }];

        (db.reservation.findMany as jest.Mock).mockResolvedValue(mockReservations);
        (db.$transaction as jest.Mock).mockImplementation((callback) => callback(db));

        await reservationService.bulkMarkPurchased(['res-1'], mockUserId, undefined);

        expect(db.reservation.update).toHaveBeenCalledWith({
          where: { id: 'res-1', userId: mockUserId },
          data: {
            purchasedAt: expect.any(Date),
            purchasedDate: expect.any(Date),
          },
        });
      });
    });
  });
});
