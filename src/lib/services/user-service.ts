import { Prisma } from '@prisma/client';

import { db } from '@/lib/db';
import { ConflictError, ForbiddenError, NotFoundError } from '@/lib/errors';

/**
 * User Service
 *
 * Handles user-related operations including vanity URL management.
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
      if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002') {
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
}

// Export singleton instance
export const userService = new UserService();
