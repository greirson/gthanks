import { Prisma, UserEmail } from '@prisma/client';

import { db } from '@/lib/db';
import { ConflictError, ForbiddenError, NotFoundError, ValidationError } from '@/lib/errors';
import { generateVerificationToken, sendVerificationEmail } from '@/lib/email-verification';
import { logger } from '@/lib/services/logger';

/**
 * User Service
 *
 * Handles user-related operations including:
 * - Username and vanity URL management
 * - Email management (add, verify, delete, set primary)
 * - Profile settings
 * - Avatar management
 * - User preferences
 */
export class UserService {
  /**
   * Set a username for vanity URLs (one-time only)
   */
  async setUsername(userId: string, username: string) {
    // Check if user already has a username
    const user = await db.user.findUnique({
      where: { id: userId },
      select: { username: true, usernameSetAt: true, canUseVanityUrls: true },
    });

    if (!user) {
      throw new NotFoundError('User not found');
    }

    if (!user.canUseVanityUrls) {
      throw new ForbiddenError('You do not have access to vanity URLs');
    }

    if (user.username !== null) {
      throw new ConflictError('Username already set. Contact admin to change it.');
    }

    try {
      const updatedUser = await db.user.update({
        where: { id: userId },
        data: {
          username: username.toLowerCase(),
          usernameSetAt: new Date(),
        },
      });

      return updatedUser;
    } catch (error) {
      if (
        error instanceof Prisma.PrismaClientKnownRequestError &&
        error.code === 'P2002' &&
        error.meta?.['target'] &&
        Array.isArray(error.meta['target']) &&
        error.meta['target'].includes('username')
      ) {
        throw new ConflictError('Username just taken by another user');
      }
      throw error;
    }
  }

  /**
   * Check if user can set a username
   */
  async canSetUsername(userId: string): Promise<boolean> {
    const user = await db.user.findUnique({
      where: { id: userId },
      select: { username: true, canUseVanityUrls: true },
    });

    return user !== null && user.canUseVanityUrls && user.username === null;
  }

  /**
   * Get user by username with their public lists
   */
  async getUserByUsername(username: string) {
    return db.user.findUnique({
      where: { username: username.toLowerCase() },
      include: {
        lists: {
          where: {
            hideFromProfile: false,
            OR: [{ visibility: 'public' }, { visibility: 'password' }],
          },
          orderBy: { createdAt: 'desc' },
        },
      },
    });
  }

  // ============================================
  // EMAIL MANAGEMENT
  // ============================================

  /**
   * Add a new email to user's account
   */
  async addEmail(
    userId: string,
    email: string,
    sendVerification: boolean = true
  ): Promise<UserEmail> {
    // Create UserEmail record (not verified yet)
    try {
      const userEmail = await db.userEmail.create({
        data: {
          userId,
          email,
          isPrimary: false, // New emails are never primary by default
          isVerified: false,
        },
      });

      // Optionally send verification email
      if (sendVerification) {
        try {
          const token = await generateVerificationToken(userEmail.id);
          await sendVerificationEmail(email, token);
        } catch (emailError) {
          // If email sending fails, delete the UserEmail record and throw error
          await db.userEmail.delete({
            where: { id: userEmail.id },
          });
          logger.error({ error: emailError }, 'Failed to send verification email');
          throw new Error('Failed to send verification email. Please try again.');
        }
      }

      return userEmail;
    } catch (error) {
      if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002') {
        throw new ConflictError('Email already in use');
      }
      throw error;
    }
  }

  /**
   * Get all emails for a user
   */
  async getUserEmails(userId: string): Promise<UserEmail[]> {
    return db.userEmail.findMany({
      where: { userId },
      orderBy: [{ isPrimary: 'desc' }, { isVerified: 'desc' }, { createdAt: 'asc' }],
    });
  }

  /**
   * Get a specific email by ID (with user check)
   */
  async getUserEmail(userId: string, emailId: string): Promise<UserEmail> {
    const userEmail = await db.userEmail.findFirst({
      where: { id: emailId, userId },
    });

    if (!userEmail) {
      throw new NotFoundError('Email not found');
    }

    return userEmail;
  }

  /**
   * Delete an email from user's account
   */
  async deleteEmail(userId: string, emailId: string): Promise<void> {
    const userEmail = await this.getUserEmail(userId, emailId);

    // Safety check: Cannot delete the only email
    const emailCount = await db.userEmail.count({ where: { userId } });
    if (emailCount === 1) {
      throw new ValidationError('Cannot remove the only email address');
    }

    // Safety check: Cannot delete the only verified email
    const verifiedCount = await db.userEmail.count({
      where: { userId, isVerified: true },
    });
    if (verifiedCount === 1 && userEmail.isVerified) {
      throw new ValidationError('Cannot remove the only verified email address');
    }

    // Safety check: Cannot delete primary email
    if (userEmail.isPrimary) {
      throw new ValidationError('Cannot remove primary email. Set another email as primary first.');
    }

    await db.userEmail.delete({ where: { id: emailId } });
  }

  /**
   * Set an email as primary
   */
  async setPrimaryEmail(userId: string, emailId: string): Promise<UserEmail> {
    const userEmail = await this.getUserEmail(userId, emailId);

    // Must be verified to set as primary
    if (!userEmail.isVerified) {
      throw new ValidationError('Email must be verified before setting as primary');
    }

    // Already primary - no-op
    if (userEmail.isPrimary) {
      return userEmail;
    }

    // Use transaction to ensure atomicity
    await db.$transaction(async (tx) => {
      // Remove primary flag from current primary email
      await tx.userEmail.updateMany({
        where: { userId, isPrimary: true },
        data: { isPrimary: false },
      });

      // Set new primary email
      await tx.userEmail.update({
        where: { id: emailId },
        data: { isPrimary: true },
      });

      // Update User.email field to match primary email
      await tx.user.update({
        where: { id: userId },
        data: { email: userEmail.email },
      });
    });

    return db.userEmail.findUnique({ where: { id: emailId } }) as Promise<UserEmail>;
  }

  /**
   * Verify an email
   */
  async verifyEmail(emailId: string): Promise<UserEmail> {
    return db.userEmail.update({
      where: { id: emailId },
      data: {
        isVerified: true,
        verifiedAt: new Date(),
      },
    });
  }

  /**
   * Resend verification email
   */
  async resendVerificationEmail(userId: string, emailId: string): Promise<void> {
    const userEmail = await this.getUserEmail(userId, emailId);

    if (userEmail.isVerified) {
      throw new ValidationError('Email is already verified');
    }

    const token = await generateVerificationToken(emailId);
    await sendVerificationEmail(userEmail.email, token);
  }

  /**
   * Change email (for admin use - sets email without verification)
   */
  async changeEmail(userId: string, newEmail: string): Promise<void> {
    await db.$transaction(async (tx) => {
      // Update User.email
      await tx.user.update({
        where: { id: userId },
        data: { email: newEmail },
      });

      // Create or update UserEmail record
      const existingEmail = await tx.userEmail.findFirst({
        where: { userId, email: newEmail },
      });

      if (existingEmail) {
        // Email already exists, make it primary and verified
        await tx.userEmail.updateMany({
          where: { userId, isPrimary: true },
          data: { isPrimary: false },
        });

        await tx.userEmail.update({
          where: { id: existingEmail.id },
          data: {
            isPrimary: true,
            isVerified: true,
            verifiedAt: new Date(),
          },
        });
      } else {
        // Create new email as primary and verified
        await tx.userEmail.updateMany({
          where: { userId, isPrimary: true },
          data: { isPrimary: false },
        });

        await tx.userEmail.create({
          data: {
            userId,
            email: newEmail,
            isPrimary: true,
            isVerified: true,
            verifiedAt: new Date(),
          },
        });
      }
    });
  }

  // ============================================
  // PROFILE MANAGEMENT
  // ============================================

  /**
   * Update user profile settings
   */
  async updateProfileSettings(userId: string, data: { showPublicProfile?: boolean }) {
    return db.user.update({
      where: { id: userId },
      data,
    });
  }

  /**
   * Update user theme preference
   */
  async updateTheme(userId: string, theme: 'light' | 'dark' | 'system') {
    return db.user.update({
      where: { id: userId },
      data: { themePreference: theme },
    });
  }

  /**
   * Get user preferences
   */
  async getPreferences(userId: string) {
    return db.userPreference.findUnique({
      where: { userId },
    });
  }

  /**
   * Update user preferences
   */
  async updatePreferences(userId: string, data: Prisma.UserPreferenceUpdateInput) {
    // Upsert to create if doesn't exist
    // Extract user field if present (for create)
    const createData: Prisma.UserPreferenceCreateInput = {
      user: { connect: { id: userId } },
      ...(typeof data === 'object' && data !== null
        ? Object.fromEntries(Object.entries(data).filter(([key]) => key !== 'user'))
        : {}),
    };

    return db.userPreference.upsert({
      where: { userId },
      create: createData,
      update: data,
    });
  }

  /**
   * Complete user profile (onboarding)
   */
  async completeProfile(userId: string, data: { name?: string; username?: string }) {
    const updateData: Prisma.UserUpdateInput = {
      isOnboardingComplete: true, // Mark onboarding as complete
      updatedAt: new Date(),
    };

    if (data.name) {
      updateData.name = data.name;
    }

    if (data.username) {
      updateData.username = data.username.toLowerCase();
      updateData.usernameSetAt = new Date();
    }

    try {
      return await db.user.update({
        where: { id: userId },
        data: updateData,
      });
    } catch (error) {
      if (
        error instanceof Prisma.PrismaClientKnownRequestError &&
        error.code === 'P2002' &&
        error.meta?.['target'] &&
        Array.isArray(error.meta['target']) &&
        error.meta['target'].includes('username')
      ) {
        throw new ConflictError('Username already taken');
      }
      throw error;
    }
  }

  // ============================================
  // ADMIN-SPECIFIC OPERATIONS
  // ============================================

  /**
   * Admin: Set vanity URL access for user
   */
  async setVanityAccess(userId: string, canUseVanityUrls: boolean) {
    return db.user.update({
      where: { id: userId },
      data: { canUseVanityUrls },
    });
  }

  /**
   * Admin: Update username (bypass one-time restriction)
   */
  async adminUpdateUsername(userId: string, username: string | null) {
    try {
      return await db.user.update({
        where: { id: userId },
        data: {
          username: username ? username.toLowerCase() : null,
          usernameSetAt: username ? new Date() : null,
        },
      });
    } catch (error) {
      if (
        error instanceof Prisma.PrismaClientKnownRequestError &&
        error.code === 'P2002' &&
        error.meta?.['target'] &&
        Array.isArray(error.meta['target']) &&
        error.meta['target'].includes('username')
      ) {
        throw new ConflictError('Username already in use');
      }
      throw error;
    }
  }

  /**
   * Get user by ID
   */
  async getUserById(userId: string) {
    const user = await db.user.findUnique({
      where: { id: userId },
    });

    if (!user) {
      throw new NotFoundError('User not found');
    }

    return user;
  }

  /**
   * Check if user has access to a feature
   */
  async hasFeatureAccess(userId: string, feature: 'vanityUrls'): Promise<boolean> {
    const user = await db.user.findUnique({
      where: { id: userId },
      select: { canUseVanityUrls: true },
    });

    if (!user) {
      return false;
    }

    if (feature === 'vanityUrls') {
      return user.canUseVanityUrls;
    }

    return false;
  }
}

// Export singleton instance
export const userService = new UserService();
