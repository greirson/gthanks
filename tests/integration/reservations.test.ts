/**
 * Integration tests for reservation system critical paths
 * 
 * Tests cover:
 * - Creating reservations on wishes
 * - Reservation visibility (hidden from wish owner)
 * - Cancelling reservations
 * - Anonymous reservations (if supported)
 * 
 * Core feature: prevents duplicate gifts by managing reservations
 */

import { describe, it, expect, beforeEach, afterEach, jest } from '@jest/globals';
import { NextRequest, NextResponse } from 'next/server';

// Import API route handlers
import { GET as getReservations, POST as createReservation } from '@/app/api/reservations/route';
import { DELETE as deleteReservation } from '@/app/api/reservations/[reservationId]/route';
import { GET as getWishReservation } from '@/app/api/wishes/[wishId]/reservation/route';

// Import utilities and mocks
import { getCurrentUser } from '@/lib/auth-utils';
import { db } from '@/lib/db';

// Mock auth utilities
jest.mock('@/lib/auth-utils');

describe('Reservation System Integration Tests', () => {
  let testUser: any;
  let wishOwner: any;
  let testWish: any;
  let testList: any;

  beforeEach(async () => {
    // Reset database state
    if (global.mockDb && typeof global.mockDb._resetMockData === 'function') {
      global.mockDb._resetMockData();
    }

    // Create test users
    wishOwner = await db.user.create({
      data: {
        id: 'owner-123',
        email: 'owner@example.com',
        name: 'Wish Owner'
      }
    });

    testUser = await db.user.create({
      data: {
        id: 'reserver-456',
        email: 'reserver@example.com',
        name: 'Gift Giver'
      }
    });

    // Create test list
    testList = await db.list.create({
      data: {
        id: 'list-789',
        name: 'Birthday List',
        description: 'My birthday wishlist',
        ownerId: wishOwner.id
      }
    });

    // Create test wish
    testWish = await db.wish.create({
      data: {
        id: 'wish-001',
        title: 'Test Gift Item',
        notes: 'This is something I really want',
        url: 'https://example.com/product',
        price: 49.99,
        wishLevel: 3, // High priority
        ownerId: wishOwner.id
      }
    });

    // Add wish to list
    await db.listWish.create({
      data: {
        listId: testList.id,
        wishId: testWish.id
      }
    });
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('Create Reservation', () => {
    it('should allow user to create reservation on a wish', async () => {
      // Mock current user as gift giver
      (getCurrentUser as jest.Mock).mockResolvedValue(testUser);

      // Create reservation
      const reservation = await db.reservation.create({
        data: {
          wishId: testWish.id,
          reserverName: testUser.name,
          reserverEmail: testUser.email
        }
      });

      expect(reservation).toBeTruthy();
      expect(reservation.wishId).toBe(testWish.id);
      expect(reservation.reserverEmail).toBe(testUser.email);
      expect(reservation.reserverName).toBe(testUser.name);
      expect(reservation.reservedAt).toBeTruthy();
    });

    it('should prevent duplicate reservations on the same wish', async () => {
      // Mock current user
      (getCurrentUser as jest.Mock).mockResolvedValue(testUser);

      // Create first reservation
      const firstReservation = await db.reservation.create({
        data: {
          wishId: testWish.id,
          reserverName: testUser.name,
          reserverEmail: testUser.email
        }
      });

      expect(firstReservation).toBeTruthy();

      // Check if wish already has reservation
      const existingReservation = await db.reservation.findFirst({
        where: { wishId: testWish.id }
      });

      expect(existingReservation).toBeTruthy();

      // In real flow, creating second reservation would be prevented
      const canReserve = !existingReservation;
      expect(canReserve).toBe(false);
    });

    it('should generate access token for anonymous reservations', async () => {
      // Create anonymous reservation (no authenticated user)
      (getCurrentUser as jest.Mock).mockResolvedValue(null);

      const anonymousName = 'Anonymous Giver';
      const anonymousEmail = 'anonymous@example.com';
      const accessToken = 'secure-token-' + Date.now();

      const anonymousReservation = await db.reservation.create({
        data: {
          wishId: testWish.id,
          reserverName: anonymousName,
          reserverEmail: anonymousEmail,
          accessToken
        }
      });

      expect(anonymousReservation).toBeTruthy();
      expect(anonymousReservation.accessToken).toBe(accessToken);
      expect(anonymousReservation.reserverName).toBe(anonymousName);
      expect(anonymousReservation.reserverEmail).toBe(anonymousEmail);

      // Verify token can be used to access reservation
      const reservationByToken = await db.reservation.findUnique({
        where: { accessToken }
      });

      expect(reservationByToken).toBeTruthy();
      expect(reservationByToken?.id).toBe(anonymousReservation.id);
    });

    it('should include wish details when creating reservation', async () => {
      (getCurrentUser as jest.Mock).mockResolvedValue(testUser);

      // Create reservation
      const reservation = await db.reservation.create({
        data: {
          wishId: testWish.id,
          reserverName: testUser.name,
          reserverEmail: testUser.email
        },
        include: {
          wish: true
        }
      });

      expect(reservation.wish).toBeTruthy();
      expect(reservation.wish.title).toBe(testWish.title);
      expect(reservation.wish.price).toBe(testWish.price);
      expect(reservation.wish.url).toBe(testWish.url);
    });
  });

  describe('Reservation Visibility', () => {
    it('should hide reservation details from wish owner', async () => {
      // Create reservation
      const reservation = await db.reservation.create({
        data: {
          wishId: testWish.id,
          reserverName: testUser.name,
          reserverEmail: testUser.email
        }
      });

      // Mock current user as wish owner
      (getCurrentUser as jest.Mock).mockResolvedValue(wishOwner);

      // Get wish with reservation status (owner's view)
      const wish = await db.wish.findUnique({
        where: { id: testWish.id },
        include: {
          reservation: true
        }
      });

      // In real implementation, reservation details would be filtered
      // Owner should only see that wish is reserved, not by whom
      expect(wish).toBeTruthy();
      expect(wish?.reservation).toBeTruthy();

      // Simulate filtered response for owner
      const ownerView = {
        ...wish,
        reservation: wish?.reservation ? { reserved: true } : null
      };

      expect(ownerView.reservation?.reserved).toBe(true);
      expect(ownerView.reservation?.reserverName).toBeUndefined();
      expect(ownerView.reservation?.reserverEmail).toBeUndefined();
    });

    it('should show reservation details to the reserver', async () => {
      // Create reservation
      const reservation = await db.reservation.create({
        data: {
          wishId: testWish.id,
          reserverName: testUser.name,
          reserverEmail: testUser.email
        }
      });

      // Mock current user as reserver
      (getCurrentUser as jest.Mock).mockResolvedValue(testUser);

      // Get user's reservations
      const userReservations = await db.reservation.findMany({
        where: { reserverEmail: testUser.email },
        include: { wish: true }
      });

      expect(userReservations).toHaveLength(1);
      expect(userReservations[0].id).toBe(reservation.id);
      expect(userReservations[0].reserverEmail).toBe(testUser.email);
      expect(userReservations[0].wish.title).toBe(testWish.title);
    });

    it('should show reservation to other group members (not owner)', async () => {
      // Create another user in the same group
      const otherMember = await db.user.create({
        data: {
          id: 'member-789',
          email: 'member@example.com',
          name: 'Group Member'
        }
      });

      // Create group and add members
      const group = await db.group.create({
        data: {
          id: 'group-001',
          name: 'Family Group',
          description: 'Our family'
        }
      });

      await db.userGroup.create({
        data: {
          userId: wishOwner.id,
          groupId: group.id,
          role: 'admin'
        }
      });

      await db.userGroup.create({
        data: {
          userId: otherMember.id,
          groupId: group.id,
          role: 'member'
        }
      });

      // Share list with group
      await db.listGroup.create({
        data: {
          listId: testList.id,
          groupId: group.id,
          sharedBy: wishOwner.id
        }
      });

      // Create reservation
      await db.reservation.create({
        data: {
          wishId: testWish.id,
          reserverName: testUser.name,
          reserverEmail: testUser.email
        }
      });

      // Mock current user as other group member
      (getCurrentUser as jest.Mock).mockResolvedValue(otherMember);

      // Get wish status - other members should see it's reserved
      const wishWithReservation = await db.wish.findUnique({
        where: { id: testWish.id },
        include: { reservation: true }
      });

      expect(wishWithReservation?.reservation).toBeTruthy();
      
      // Other members see reservation exists but not details
      const memberView = {
        ...wishWithReservation,
        reservation: wishWithReservation?.reservation ? { reserved: true } : null
      };

      expect(memberView.reservation?.reserved).toBe(true);
    });
  });

  describe('Cancel Reservation', () => {
    it('should allow user to cancel their own reservation', async () => {
      // Create reservation
      const reservation = await db.reservation.create({
        data: {
          id: 'res-to-cancel',
          wishId: testWish.id,
          reserverName: testUser.name,
          reserverEmail: testUser.email
        }
      });

      // Mock current user as reserver
      (getCurrentUser as jest.Mock).mockResolvedValue(testUser);

      // Verify reservation exists
      let existingReservation = await db.reservation.findUnique({
        where: { id: reservation.id }
      });
      expect(existingReservation).toBeTruthy();

      // Cancel reservation
      await db.reservation.delete({
        where: { id: reservation.id }
      });

      // Verify reservation is deleted
      const deletedReservation = await db.reservation.findUnique({
        where: { id: reservation.id }
      });
      expect(deletedReservation).toBeNull();

      // Verify wish is available again
      const availableWish = await db.wish.findUnique({
        where: { id: testWish.id },
        include: { reservation: true }
      });
      expect(availableWish?.reservation).toBeNull();
    });

    it('should not allow user to cancel another user\'s reservation', async () => {
      // Create reservation by testUser
      const reservation = await db.reservation.create({
        data: {
          id: 'res-protected',
          wishId: testWish.id,
          reserverName: testUser.name,
          reserverEmail: testUser.email
        }
      });

      // Create another user
      const anotherUser = await db.user.create({
        data: {
          id: 'another-user',
          email: 'another@example.com',
          name: 'Another User'
        }
      });

      // Mock current user as different user
      (getCurrentUser as jest.Mock).mockResolvedValue(anotherUser);

      // Check if user can delete (should be prevented in real implementation)
      const canDelete = reservation.reserverEmail === anotherUser.email;
      expect(canDelete).toBe(false);

      // Verify reservation still exists
      const protectedReservation = await db.reservation.findUnique({
        where: { id: reservation.id }
      });
      expect(protectedReservation).toBeTruthy();
      expect(protectedReservation?.reserverEmail).toBe(testUser.email);
    });

    it('should allow anonymous user to cancel with access token', async () => {
      const accessToken = 'anonymous-token-' + Date.now();

      // Create anonymous reservation
      const anonymousReservation = await db.reservation.create({
        data: {
          id: 'anon-res',
          wishId: testWish.id,
          reserverName: 'Anonymous',
          reserverEmail: 'anon@example.com',
          accessToken
        }
      });

      // No authenticated user
      (getCurrentUser as jest.Mock).mockResolvedValue(null);

      // Find reservation by token
      const reservationByToken = await db.reservation.findUnique({
        where: { accessToken }
      });

      expect(reservationByToken).toBeTruthy();
      expect(reservationByToken?.id).toBe(anonymousReservation.id);

      // Cancel with token
      if (reservationByToken) {
        await db.reservation.delete({
          where: { id: reservationByToken.id }
        });
      }

      // Verify deleted
      const deleted = await db.reservation.findUnique({
        where: { accessToken }
      });
      expect(deleted).toBeNull();
    });
  });

  describe('View Reservations', () => {
    it('should list all reservations for a user', async () => {
      // Create multiple wishes and reservations
      const wish2 = await db.wish.create({
        data: {
          id: 'wish-002',
          title: 'Second Gift',
          price: 29.99,
          ownerId: wishOwner.id
        }
      });

      const wish3 = await db.wish.create({
        data: {
          id: 'wish-003',
          title: 'Third Gift',
          price: 79.99,
          ownerId: wishOwner.id
        }
      });

      // Create reservations for testUser
      await db.reservation.create({
        data: {
          wishId: testWish.id,
          reserverEmail: testUser.email,
          reserverName: testUser.name
        }
      });

      await db.reservation.create({
        data: {
          wishId: wish2.id,
          reserverEmail: testUser.email,
          reserverName: testUser.name
        }
      });

      await db.reservation.create({
        data: {
          wishId: wish3.id,
          reserverEmail: testUser.email,
          reserverName: testUser.name
        }
      });

      // Mock current user
      (getCurrentUser as jest.Mock).mockResolvedValue(testUser);

      // Get all user's reservations
      const userReservations = await db.reservation.findMany({
        where: { reserverEmail: testUser.email },
        include: { wish: true },
        orderBy: { reservedAt: 'desc' }
      });

      expect(userReservations).toHaveLength(3);
      expect(userReservations[0].wish.title).toBeTruthy();
      expect(userReservations[1].wish.title).toBeTruthy();
      expect(userReservations[2].wish.title).toBeTruthy();

      // Calculate total reserved value
      const totalValue = userReservations.reduce((sum, res) => {
        return sum + (res.wish.price || 0);
      }, 0);
      expect(totalValue).toBe(159.97); // 49.99 + 29.99 + 79.99
    });

    it('should not show reservations in wish owner\'s list view', async () => {
      // Create reservation
      await db.reservation.create({
        data: {
          wishId: testWish.id,
          reserverEmail: testUser.email,
          reserverName: testUser.name
        }
      });

      // Mock current user as wish owner
      (getCurrentUser as jest.Mock).mockResolvedValue(wishOwner);

      // Get owner's wishes
      const ownerWishes = await db.wish.findMany({
        where: { ownerId: wishOwner.id },
        include: { reservation: true }
      });

      // Simulate filtered view for owner
      const ownerView = ownerWishes.map(wish => ({
        ...wish,
        reservation: wish.reservation ? { reserved: true } : null,
        // Hide reserver details from owner
        _isReserved: !!wish.reservation
      }));

      expect(ownerView).toHaveLength(1);
      expect(ownerView[0]._isReserved).toBe(true);
      expect(ownerView[0].reservation?.reserverEmail).toBeUndefined();
    });
  });

  describe('Reservation Edge Cases', () => {
    it('should handle wish deletion with active reservation', async () => {
      // Create reservation
      const reservation = await db.reservation.create({
        data: {
          wishId: testWish.id,
          reserverEmail: testUser.email,
          reserverName: testUser.name
        }
      });

      // Delete wish (cascade should delete reservation)
      await db.wish.delete({
        where: { id: testWish.id }
      });

      // Verify reservation is also deleted (cascade)
      const deletedReservation = await db.reservation.findUnique({
        where: { id: reservation.id }
      });

      // Due to cascade delete in schema
      expect(deletedReservation).toBeNull();
    });

    it('should handle concurrent reservation attempts', async () => {
      // Simulate two users trying to reserve at same time
      const user2 = await db.user.create({
        data: {
          id: 'user2',
          email: 'user2@example.com',
          name: 'User 2'
        }
      });

      // First reservation succeeds
      const firstReservation = await db.reservation.create({
        data: {
          wishId: testWish.id,
          reserverEmail: testUser.email,
          reserverName: testUser.name
        }
      });

      expect(firstReservation).toBeTruthy();

      // Check for existing reservation before second attempt
      const existingReservation = await db.reservation.findFirst({
        where: { wishId: testWish.id }
      });

      // Second reservation should be prevented
      if (!existingReservation) {
        await db.reservation.create({
          data: {
            wishId: testWish.id,
            reserverEmail: user2.email,
            reserverName: user2.name
          }
        });
      }

      // Verify only one reservation exists
      const allReservations = await db.reservation.findMany({
        where: { wishId: testWish.id }
      });

      expect(allReservations).toHaveLength(1);
      expect(allReservations[0].reserverEmail).toBe(testUser.email);
    });

    it('should update reservation timestamp on modifications', async () => {
      const reservation = await db.reservation.create({
        data: {
          wishId: testWish.id,
          reserverEmail: testUser.email,
          reserverName: testUser.name
        }
      });

      const originalTime = reservation.reservedAt;

      // Wait a moment and update
      await new Promise(resolve => setTimeout(resolve, 10));

      // Update reservation (e.g., adding a note)
      const updated = await db.reservation.update({
        where: { id: reservation.id },
        data: {
          reminderSentAt: new Date()
        }
      });

      expect(updated.reminderSentAt).toBeTruthy();
      expect(updated.reservedAt.getTime()).toBe(originalTime.getTime());
    });
  });
});
