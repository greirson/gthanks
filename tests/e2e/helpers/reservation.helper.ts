/**
 * Reservation helpers for E2E tests
 * Provides utilities for reservation-related test scenarios
 */

import { Page } from '@playwright/test';
import { db } from '@/lib/db';
import { createId } from '@paralleldrive/cuid2';
import { loginAsUser } from './auth.helper';

/**
 * Get the magic link URL from the database for a given email
 * This simulates clicking the magic link from an email
 *
 * @param email - Email address to get magic link for
 * @returns The magic link URL
 */
export async function getMagicLink(email: string): Promise<string> {
  // Wait a moment for the token to be created
  await new Promise((resolve) => setTimeout(resolve, 1000));

  // Find the most recent verification token for this email
  const token = await db.verificationToken.findFirst({
    where: { identifier: email },
    orderBy: { expires: 'desc' },
  });

  if (!token) {
    throw new Error(`No magic link found for email: ${email}`);
  }

  // Construct the callback URL (same format as NextAuth sends in emails)
  const baseUrl = process.env.NEXTAUTH_URL || 'http://localhost:3000';
  const callbackUrl = encodeURIComponent('/my-reservations');
  return `${baseUrl}/api/auth/callback/email?token=${token.token}&email=${encodeURIComponent(email)}&callbackUrl=${callbackUrl}`;
}

/**
 * Login a user via magic link flow
 * This simulates the complete magic link authentication process
 *
 * @param page - Playwright page instance
 * @param email - Email address to login with
 */
export async function loginWithMagicLink(page: Page, email: string): Promise<void> {
  // Create or get user
  let user = await db.user.findUnique({
    where: { email },
  });

  if (!user) {
    // Create user if doesn't exist
    const userId = createId();
    user = await db.user.create({
      data: {
        id: userId,
        email,
        name: email.split('@')[0],
        emailVerified: new Date(),
        isOnboardingComplete: true,
      },
    });

    // Create verified UserEmail record
    await db.userEmail.create({
      data: {
        userId: user.id,
        email: user.email,
        isPrimary: true,
        isVerified: true,
        verifiedAt: new Date(),
      },
    });
  }

  // Use the faster direct login method
  await loginAsUser(page, email);
}

/**
 * Seed a reservation for testing
 * Creates a wish, list, and reservation for a given user
 *
 * @param email - Email of the reserver
 * @param wishTitle - Title of the wish to reserve
 * @returns Object with wish, list, and reservation IDs
 */
export async function seedReservation(
  email: string,
  wishTitle: string
): Promise<{
  wishId: string;
  listId: string;
  reservationId: string;
}> {
  // Get or create the reserver user
  let reserver = await db.user.findUnique({
    where: { email },
  });

  if (!reserver) {
    const userId = createId();
    reserver = await db.user.create({
      data: {
        id: userId,
        email,
        name: email.split('@')[0],
        emailVerified: new Date(),
        isOnboardingComplete: true,
      },
    });

    await db.userEmail.create({
      data: {
        userId: reserver.id,
        email: reserver.email,
        isPrimary: true,
        isVerified: true,
        verifiedAt: new Date(),
      },
    });
  }

  // Create a list owner (different from reserver)
  const ownerEmail = `owner-${Date.now()}@test.com`;
  const ownerId = createId();
  const owner = await db.user.create({
    data: {
      id: ownerId,
      email: ownerEmail,
      name: 'List Owner',
      emailVerified: new Date(),
      isOnboardingComplete: true,
    },
  });

  await db.userEmail.create({
    data: {
      userId: owner.id,
      email: owner.email,
      isPrimary: true,
      isVerified: true,
      verifiedAt: new Date(),
    },
  });

  // Create wish
  const wishId = createId();
  const wish = await db.wish.create({
    data: {
      id: wishId,
      title: wishTitle,
      ownerId: owner.id,
      wishLevel: 2,
    },
  });

  // Create public list with the wish
  const listId = createId();
  const list = await db.list.create({
    data: {
      id: listId,
      name: 'Test List',
      ownerId: owner.id,
      visibility: 'public',
    },
  });

  // Add wish to list
  await db.listWish.create({
    data: {
      wishId: wish.id,
      listId: list.id,
      wishLevel: 2,
    },
  });

  // Create reservation (connected to existing wish and user)
  const reservationId = createId();
  const reservation = await db.reservation.create({
    data: {
      id: reservationId,
      wish: {
        connect: { id: wish.id },
      },
      user: {
        connect: { id: reserver.id },
      },
    },
  });

  return {
    wishId: wish.id,
    listId: list.id,
    reservationId: reservation.id,
  };
}

/**
 * Create a public list with wishes for testing reservation flow
 *
 * @param ownerEmail - Email of the list owner
 * @param wishes - Array of wish titles to create
 * @returns Object with owner, list, and wishes
 */
export async function createPublicListWithWishes(
  ownerEmail: string,
  wishes: string[]
): Promise<{
  owner: { id: string; email: string };
  list: { id: string; name: string };
  wishes: Array<{ id: string; title: string }>;
}> {
  // Create owner
  let owner = await db.user.findUnique({
    where: { email: ownerEmail },
  });

  if (!owner) {
    const ownerId = createId();
    owner = await db.user.create({
      data: {
        id: ownerId,
        email: ownerEmail,
        name: 'List Owner',
        emailVerified: new Date(),
        isOnboardingComplete: true,
      },
    });

    await db.userEmail.create({
      data: {
        userId: owner.id,
        email: owner.email,
        isPrimary: true,
        isVerified: true,
        verifiedAt: new Date(),
      },
    });
  }

  // Create public list
  const listId = createId();
  const list = await db.list.create({
    data: {
      id: listId,
      name: 'Public Test List',
      ownerId: owner.id,
      visibility: 'public',
    },
  });

  // Create wishes
  const createdWishes = [];
  for (const title of wishes) {
    const wishId = createId();
    const wish = await db.wish.create({
      data: {
        id: wishId,
        title,
        ownerId: owner.id,
        wishLevel: 2,
      },
    });

    // Add to list
    await db.listWish.create({
      data: {
        wishId: wish.id,
        listId: list.id,
        wishLevel: 2,
      },
    });

    createdWishes.push({
      id: wish.id,
      title: wish.title,
    });
  }

  return {
    owner: {
      id: owner.id,
      email: owner.email,
    },
    list: {
      id: list.id,
      name: list.name,
    },
    wishes: createdWishes,
  };
}
