import { PrismaClient } from '@prisma/client';

/**
 * Database helper functions for E2E tests
 *
 * These helpers provide database setup and teardown utilities.
 * Use with caution - only run against test databases!
 */

let prisma: PrismaClient | null = null;

/**
 * Get Prisma client instance for test database
 *
 * WARNING: This should only be used with a dedicated test database,
 * never against production data.
 */
export function getTestDb(): PrismaClient {
  if (!prisma) {
    // Verify we're using a test database
    const dbUrl = process.env.DATABASE_URL;
    if (!dbUrl || (!dbUrl.includes('test') && !dbUrl.includes(':memory:'))) {
      throw new Error(
        'Refusing to run E2E tests against non-test database. ' +
          'DATABASE_URL must contain "test" or use in-memory database.'
      );
    }

    prisma = new PrismaClient();
  }
  return prisma;
}

/**
 * Clean up test database after tests
 */
export async function cleanupTestDb() {
  if (!prisma) return;

  // Delete test data in correct order to respect foreign key constraints
  await prisma.reservation.deleteMany();
  await prisma.listWish.deleteMany();
  await prisma.wish.deleteMany();
  await prisma.listGroup.deleteMany();
  await prisma.listAdmin.deleteMany();
  await prisma.list.deleteMany();
  await prisma.groupInvitation.deleteMany();
  await prisma.userGroup.deleteMany();
  await prisma.group.deleteMany();
  await prisma.magicLink.deleteMany();
  await prisma.verificationToken.deleteMany();
  await prisma.session.deleteMany();
  await prisma.account.deleteMany();
  await prisma.userPreference.deleteMany();
  await prisma.user.deleteMany();
}

/**
 * Disconnect Prisma client
 */
export async function disconnectTestDb() {
  if (prisma) {
    await prisma.$disconnect();
    prisma = null;
  }
}
