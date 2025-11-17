import { User } from '@prisma/client';

import { resolveAvatarUrl } from '@/lib/avatar-utils';
import { db } from '@/lib/db';
import { sanitizeForLogging } from '@/lib/utils';

import { logger } from './logger';

export interface UserProfileData {
  name?: string;
  email: string;
  image?: string;
  avatarUrl?: string;
  emailPreferences?: {
    wishReminders: boolean;
    groupInvitations: boolean;
    systemUpdates: boolean;
  };
}

export interface UserProfileWithAccounts extends User {
  accounts: Array<{
    id: string;
    provider: string;
    type: string;
  }>;
}

export class UserProfileService {
  static async getProfile(userId: string): Promise<UserProfileWithAccounts | null> {
    const user = await db.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        name: true,
        email: true,
        image: true,
        avatarUrl: true,
        role: true,
        isAdmin: true,
        createdAt: true,
        updatedAt: true,
        emailVerified: true,
        lastLoginAt: true,
        suspendedAt: true,
        suspendedBy: true,
        suspensionReason: true,
        themePreference: true,
        isOnboardingComplete: true,
        accounts: {
          select: {
            id: true,
            provider: true,
            type: true,
            // Don't include sensitive tokens
          },
        },
      },
    });

    if (!user) {
      return null;
    }

    // Resolve avatar URL using the utility function with error handling
    let resolvedAvatarUrl: string | null = null;
    try {
      resolvedAvatarUrl = resolveAvatarUrl(user);
    } catch (error) {
      logger.error('Avatar resolution failed for user:', error, {
        userId: user.id,
      });
      // Fallback to the original avatarUrl or null
      resolvedAvatarUrl =
        user.avatarUrl && !user.avatarUrl.startsWith('avatar:') ? user.avatarUrl : null;
    }

    // Return user data with resolved avatar URL
    return {
      ...user,
      avatarUrl: resolvedAvatarUrl,
    } as UserProfileWithAccounts;
  }

  static async updateProfile(userId: string, data: Partial<UserProfileData>): Promise<User> {
    // Validate email uniqueness if changing
    if (data.email) {
      const existingUser = await db.user.findFirst({
        where: {
          email: data.email,
          NOT: { id: userId },
        },
      });

      if (existingUser) {
        throw new Error('Email already in use');
      }
    }

    return db.user.update({
      where: { id: userId },
      data: {
        name: data.name,
        email: data.email,
        image: data.image,
        avatarUrl: data.avatarUrl,
        // updatedAt is automatically handled by Prisma @updatedAt
      },
    });
  }

  static async uploadAvatar(userId: string, imageDataUrl: string): Promise<string> {
    try {
      // Separate base64 data from URL for storage optimization
      const isBase64DataUri = imageDataUrl.startsWith('data:image/');

      if (isBase64DataUri) {
        // Store base64 data separately and keep a shorter URL reference
        await db.user.update({
          where: { id: userId },
          data: {
            avatarUrl: imageDataUrl, // Store the full image URL
            image: `avatar:${userId}`, // For NextAuth compatibility
            // updatedAt is automatically handled by Prisma @updatedAt
          },
        });
        return `avatar:${userId}`;
      } else {
        // Regular URL - store in avatarUrl
        await this.updateProfile(userId, {
          avatarUrl: imageDataUrl,
          image: imageDataUrl, // For NextAuth compatibility
        });
        return imageDataUrl;
      }
    } catch (error) {
      logger.error('Avatar upload failed:', error, {
        userId,
      });
      throw new Error('Failed to process avatar image');
    }
  }

  static async importOAuthProfile(
    userId: string,
    provider: string,
    oauthProfile: { name?: string; picture?: string }
  ): Promise<User> {
    const updateData: Partial<UserProfileData> = {};

    // Import name if not set
    const currentUser = await db.user.findUnique({ where: { id: userId } });
    if (!currentUser?.name && oauthProfile.name) {
      updateData.name = String(oauthProfile.name);
    }

    // Import avatar if not set and provider has one
    if (!currentUser?.image && oauthProfile.picture) {
      try {
        updateData.avatarUrl = await this.uploadAvatar(userId, String(oauthProfile.picture));
        updateData.image = updateData.avatarUrl;
      } catch (error) {
        // OAuth import logging for debugging authentication issues
        logger.warn('Failed to import OAuth avatar', {
          userId,
          error: sanitizeForLogging(error),
        });
        // Don't fail the whole import for avatar issues
      }
    }

    if (Object.keys(updateData).length > 0) {
      return this.updateProfile(userId, updateData);
    }

    if (!currentUser) {
      throw new Error('User not found after OAuth import');
    }
    return currentUser;
  }

  static async deleteAccount(userId: string): Promise<void> {
    // This is a soft delete - we'll keep the user record but anonymize it
    // and delete all associated data
    await db.$transaction(async (tx) => {
      // Delete user's wishes
      await tx.wish.deleteMany({ where: { ownerId: userId } });

      // Delete user's lists
      await tx.list.deleteMany({ where: { ownerId: userId } });

      // Remove from groups
      await tx.userGroup.deleteMany({ where: { userId } });

      // Delete sessions and accounts
      await tx.session.deleteMany({ where: { userId } });
      await tx.account.deleteMany({ where: { userId } });

      // Anonymize user record
      await tx.user.update({
        where: { id: userId },
        data: {
          email: `deleted-${userId}@gthanks.local`,
          name: 'Deleted User',
          image: null,
          avatarUrl: null,
          emailVerified: null,
        },
      });
    });
  }
}
