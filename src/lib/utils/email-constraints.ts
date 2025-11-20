/**
 * Email Constraints Utilities
 *
 * Enforces business rules for the UserEmail model:
 * - Each user must have exactly one primary email
 * - User.email field must stay in sync with primary UserEmail
 */

import { PrismaClient } from '@prisma/client';

// Type for Prisma transaction client
type TransactionClient = Omit<
  PrismaClient,
  '$connect' | '$disconnect' | '$on' | '$transaction' | '$use' | '$extends'
>;

/**
 * Ensures a user has exactly one primary email
 *
 * Strategy:
 * 1. If setting isPrimary=true, unset all other primary emails for that user
 * 2. If unsetting isPrimary=false on the only primary, prevent it (must have one primary)
 *
 * @param tx - Prisma client or transaction instance
 * @param userId - User ID
 * @param emailId - Email ID being modified
 * @param isPrimary - Desired primary status
 * @returns Promise<void>
 * @throws Error if trying to unset the only primary email
 */
export async function ensureOnePrimaryEmail(
  tx: PrismaClient | TransactionClient,
  userId: string,
  emailId: string,
  isPrimary: boolean
): Promise<void> {
  if (isPrimary) {
    // Setting this email as primary - unset all others
    await tx.userEmail.updateMany({
      where: {
        userId,
        id: { not: emailId },
        isPrimary: true,
      },
      data: {
        isPrimary: false,
      },
    });
  } else {
    // Trying to unset primary - check if this is the only primary
    const primaryCount = await tx.userEmail.count({
      where: {
        userId,
        isPrimary: true,
      },
    });

    if (primaryCount === 1) {
      const currentPrimary = await tx.userEmail.findFirst({
        where: {
          userId,
          isPrimary: true,
        },
      });

      if (currentPrimary?.id === emailId) {
        throw new Error('Cannot unset primary email. User must have exactly one primary email.');
      }
    }
  }
}

/**
 * Validates that a user has exactly one primary email
 *
 * @param db - Prisma client instance
 * @param userId - User ID
 * @returns Promise<boolean> - True if valid, false otherwise
 */
export async function validateUserPrimaryEmail(db: PrismaClient, userId: string): Promise<boolean> {
  const primaryCount = await db.userEmail.count({
    where: {
      userId,
      isPrimary: true,
    },
  });

  return primaryCount === 1;
}

/**
 * Syncs User.email with the primary UserEmail.email
 *
 * Should be called after any primary email change to maintain backward compatibility
 *
 * @param tx - Prisma client or transaction instance
 * @param userId - User ID
 * @returns Promise<void>
 */
export async function syncUserEmailWithPrimary(
  tx: PrismaClient | TransactionClient,
  userId: string
): Promise<void> {
  const primaryEmail = await tx.userEmail.findFirst({
    where: {
      userId,
      isPrimary: true,
    },
  });

  if (!primaryEmail) {
    throw new Error(`No primary email found for user ${userId}`);
  }

  await tx.user.update({
    where: { id: userId },
    data: { email: primaryEmail.email },
  });
}

/**
 * Gets the primary email for a user
 *
 * @param db - Prisma client instance
 * @param userId - User ID
 * @returns Promise<UserEmail | null>
 */
export async function getPrimaryEmail(db: PrismaClient, userId: string) {
  return await db.userEmail.findFirst({
    where: {
      userId,
      isPrimary: true,
    },
  });
}

/**
 * Creates a new email and optionally sets it as primary
 * Handles all constraint enforcement automatically
 *
 * @param db - Prisma client instance
 * @param userId - User ID
 * @param email - Email address
 * @param isPrimary - Whether this should be the primary email
 * @param isVerified - Whether this email is verified
 * @returns Promise<UserEmail>
 */
export async function createUserEmail(
  db: PrismaClient,
  userId: string,
  email: string,
  isPrimary: boolean = false,
  isVerified: boolean = false
) {
  return await db.$transaction(async (tx) => {
    // If setting as primary, unset all other primary emails
    if (isPrimary) {
      await tx.userEmail.updateMany({
        where: {
          userId,
          isPrimary: true,
        },
        data: {
          isPrimary: false,
        },
      });
    }

    // Create the new email
    const userEmail = await tx.userEmail.create({
      data: {
        userId,
        email,
        isPrimary,
        isVerified,
        verifiedAt: isVerified ? new Date() : null,
      },
    });

    // If this is now the primary email, sync User.email
    if (isPrimary) {
      await tx.user.update({
        where: { id: userId },
        data: { email },
      });
    }

    return userEmail;
  });
}

/**
 * Updates an email's primary status with proper constraint enforcement
 *
 * @param db - Prisma client instance
 * @param emailId - Email ID
 * @param isPrimary - Desired primary status
 * @returns Promise<UserEmail>
 */
export async function updateEmailPrimaryStatus(
  db: PrismaClient,
  emailId: string,
  isPrimary: boolean
) {
  return await db.$transaction(async (tx) => {
    // Get the email to find the userId
    const email = await tx.userEmail.findUnique({
      where: { id: emailId },
    });

    if (!email) {
      throw new Error(`Email ${emailId} not found`);
    }

    // Enforce constraints
    await ensureOnePrimaryEmail(tx, email.userId, emailId, isPrimary);

    // Update the email
    const updatedEmail = await tx.userEmail.update({
      where: { id: emailId },
      data: { isPrimary },
    });

    // If this is now primary, sync User.email
    if (isPrimary) {
      await syncUserEmailWithPrimary(tx, email.userId);
    }

    return updatedEmail;
  });
}

/**
 * Deletes an email with proper constraint enforcement
 * Prevents deletion of the only email or primary email
 *
 * @param db - Prisma client instance
 * @param emailId - Email ID to delete
 * @returns Promise<void>
 * @throws Error if trying to delete the only email or primary email
 */
export async function deleteUserEmail(db: PrismaClient, emailId: string): Promise<void> {
  return await db.$transaction(async (tx) => {
    // Get the email
    const email = await tx.userEmail.findUnique({
      where: { id: emailId },
    });

    if (!email) {
      throw new Error(`Email ${emailId} not found`);
    }

    // Check if this is the primary email
    if (email.isPrimary) {
      throw new Error('Cannot delete primary email. Set another email as primary first.');
    }

    // Check if this is the only email
    const emailCount = await tx.userEmail.count({
      where: { userId: email.userId },
    });

    if (emailCount === 1) {
      throw new Error('Cannot delete the only email address. User must have at least one email.');
    }

    // Delete the email
    await tx.userEmail.delete({
      where: { id: emailId },
    });
  });
}
