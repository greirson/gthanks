import { hash, verify } from '@node-rs/argon2';
import { List, Prisma, User, Wish } from '@prisma/client';
import crypto from 'crypto';

import { resolveAvatarUrlSync } from '@/lib/avatar-utils';
import { db } from '@/lib/db';
import { ConflictError, ForbiddenError, NotFoundError, ValidationError } from '@/lib/errors';
import { ListWithOwner } from '@/lib/services/group-types';
import { generateSlugFromListName } from '@/lib/utils/slugify';
import {
  AddWishToListInput,
  ListAccessInput,
  ListCreateInput,
  ListPaginationOptions,
  ListUpdateInput,
  RemoveWishFromListInput,
} from '@/lib/validators/list';

import { logger } from './logger';
import { permissionService } from './permission-service';

export interface ListWithDetails extends Omit<List, 'password'> {
  owner: Pick<User, 'id' | 'name' | 'email' | 'avatarUrl'>;
  password?: string | null | undefined;
  _count: {
    wishes: number;
    admins: number;
  };
  wishes?: Array<{
    wish: Wish;
    addedAt: Date;
    wishLevel: number | null;
  }>;
  admins?: Array<{
    user: Pick<User, 'id' | 'name' | 'email' | 'avatarUrl'>;
    addedAt: Date;
  }>;
  isOwner?: boolean;
  canEdit?: boolean;
  hasAccess?: boolean;
}

export interface ReservationWithDetails {
  id: string;
  reserverName: string | null;
  reserverEmail: string | null;
  reservedAt: Date;
  wish: {
    id: string;
    title: string;
    price: number | null;
    imageUrl: string | null;
  };
}

export class ListService {
  /**
   * Create a new list
   */
  async createList(data: ListCreateInput, userId: string): Promise<ListWithOwner> {
    // Verify user exists
    const user = await db.user.findUnique({
      where: { id: userId },
    });

    if (!user) {
      throw new NotFoundError('User not found');
    }

    // Validate password requirement for password-protected lists
    if (data.visibility === 'password' && !data.password) {
      throw new ValidationError('Password is required for password-protected lists');
    }

    // Hash password if provided
    let hashedPassword = null;
    if (data.password) {
      hashedPassword = await this.hashPassword(data.password);
    }

    // Generate share token for public and password-protected lists
    let shareToken = null;
    if (data.visibility === 'public' || data.visibility === 'password') {
      shareToken = crypto.randomBytes(32).toString('hex');
    }

    const list = await db.list.create({
      data: {
        name: data.name,
        description: data.description || null,
        visibility: data.visibility || 'private',
        password: hashedPassword,
        shareToken,
        ownerId: userId,
      },
      include: {
        owner: {
          select: {
            id: true,
            name: true,
            email: true,
            avatarUrl: true,
          },
        },
        _count: {
          select: {
            wishes: true,
            admins: true,
          },
        },
      },
    });

    return list as ListWithOwner;
  }

  /**
   * Validate gift card preferences structure
   */
  private validateGiftCardPreferences(
    giftCardPreferences: unknown
  ): Array<{ name: string; url: string }> {
    // Handle null, undefined, or empty string
    if (!giftCardPreferences || giftCardPreferences === '[]') {
      return [];
    }

    // Parse if it's a string
    let parsed: unknown;
    try {
      parsed =
        typeof giftCardPreferences === 'string'
          ? JSON.parse(giftCardPreferences)
          : giftCardPreferences;
    } catch {
      throw new ValidationError('Invalid gift card preferences format');
    }

    // Validate it's an array
    if (!Array.isArray(parsed)) {
      throw new ValidationError('Gift card preferences must be an array');
    }

    // Max 8 gift cards
    if (parsed.length > 8) {
      throw new ValidationError('Maximum 8 gift cards allowed per list');
    }

    // Validate each gift card
    return parsed
      .map((card: unknown) => {
        if (typeof card !== 'object' || card === null) {
          return null;
        }
        const cardObj = card as Record<string, unknown>;
        const name = typeof cardObj.name === 'string' ? cardObj.name : '';
        const url = typeof cardObj.url === 'string' ? cardObj.url : '';
        return {
          name: name.slice(0, 14),
          url: url,
        };
      })
      .filter(
        (card): card is { name: string; url: string } =>
          card !== null && card.name !== '' && card.url !== ''
      );
  }

  /**
   * Update list details
   */
  async updateList(listId: string, data: ListUpdateInput, userId: string): Promise<ListWithOwner> {
    // Use centralized permission service
    await permissionService.require(userId, 'edit', { type: 'list', id: listId });

    // Validate password requirement for password-protected lists
    if (data.visibility === 'password' && !data.password) {
      throw new ValidationError('Password is required for password-protected lists');
    }

    // Hash password if provided
    let hashedPassword = undefined;
    if (data.password) {
      hashedPassword = await this.hashPassword(data.password);
    } else if (data.visibility !== 'password') {
      hashedPassword = null;
    }

    // Get current list to check if we need to generate/remove share token
    const currentList = await db.list.findUnique({
      where: { id: listId },
      select: { shareToken: true, visibility: true, slug: true, name: true, ownerId: true },
    });

    if (!currentList) {
      throw new NotFoundError('List not found');
    }

    const updateData: Prisma.ListUpdateInput = {
      name: data.name,
      description: data.description,
      visibility: data.visibility,
    };

    if (hashedPassword !== undefined) {
      updateData.password = hashedPassword;
    }
    // Handle gift card preferences
    if ('giftCardPreferences' in data && data.giftCardPreferences !== undefined) {
      const validated = this.validateGiftCardPreferences(data.giftCardPreferences);
      updateData.giftCardPreferences = JSON.stringify(validated);
    }

    // Handle share token generation/removal based on visibility change
    if (data.visibility === 'public' || data.visibility === 'password') {
      // Generate share token if not exists
      if (!currentList.shareToken) {
        updateData.shareToken = crypto.randomBytes(32).toString('hex');
      }
    } else if (data.visibility === 'private') {
      // Remove share token for private lists
      updateData.shareToken = null;
    }

    // Auto-generate slug if changing to public/password and no slug exists
    let generatedSlug: string | undefined;
    if (
      data.visibility &&
      (data.visibility === 'public' || data.visibility === 'password') &&
      !currentList.slug // Current list has no slug
    ) {
      const baseSlug = generateSlugFromListName(currentList.name);
      generatedSlug = await this.findUniqueSlug(currentList.ownerId, baseSlug);
      updateData.slug = generatedSlug;
    }

    // Retry logic for slug collisions (race condition handling)
    const maxRetries = 3;
    for (let attempt = 0; attempt < maxRetries; attempt++) {
      try {
        const updated = await db.list.update({
          where: { id: listId },
          data: updateData,
          include: {
            owner: {
              select: {
                id: true,
                name: true,
                email: true,
                avatarUrl: true,
              },
            },
            _count: {
              select: {
                wishes: true,
                admins: true,
              },
            },
          },
        });

        return updated as ListWithOwner;
      } catch (error) {
        // Handle slug collision race condition
        if (
          error instanceof Prisma.PrismaClientKnownRequestError &&
          error.code === 'P2002' &&
          generatedSlug &&
          attempt < maxRetries - 1
        ) {
          // Regenerate slug with timestamp suffix to ensure uniqueness
          const timestamp = Date.now();
          const baseSlug = generateSlugFromListName(currentList.name);
          updateData.slug = await this.findUniqueSlug(
            currentList.ownerId,
            `${baseSlug}-${timestamp}`
          );
          continue;
        }
        throw error;
      }
    }

    throw new Error('Failed to update list after multiple attempts');
  }

  /**
   * Delete a list
   */
  async deleteList(listId: string, userId: string): Promise<void> {
    // Use centralized permission service
    await permissionService.require(userId, 'delete', { type: 'list', id: listId });

    // Delete list and all associations
    await db.$transaction(async (tx) => {
      // Delete reservations for wishes in this list
      await tx.reservation.deleteMany({
        where: {
          wish: {
            lists: {
              some: { listId },
            },
          },
        },
      });

      // Delete wish-list associations
      await tx.listWish.deleteMany({
        where: { listId },
      });

      // Delete list admin associations
      await tx.listAdmin.deleteMany({
        where: { listId },
      });

      // Delete list group associations
      await tx.listGroup.deleteMany({
        where: { listId },
      });

      // Delete the list
      await tx.list.delete({
        where: { id: listId },
      });
    });
  }

  /**
   * Get list details
   */
  async getList(listId: string, userId?: string, password?: string): Promise<ListWithDetails> {
    const list = await db.list.findUnique({
      where: { id: listId },
      include: {
        owner: {
          select: {
            id: true,
            name: true,
            email: true,
            avatarUrl: true,
          },
        },
        _count: {
          select: {
            wishes: true,
            admins: true,
          },
        },
        wishes: {
          include: {
            wish: true,
          },
          orderBy: {
            addedAt: 'desc',
          },
        },
      },
    });

    if (!list) {
      throw new NotFoundError('List not found');
    }

    // Check access permissions
    const isOwner = userId === list.ownerId;
    let hasAccess = false;
    let canEdit = false;

    if (isOwner) {
      hasAccess = true;
      canEdit = true;
    } else if (list.visibility === 'public') {
      hasAccess = true;
    } else if (list.visibility === 'password') {
      if (password) {
        hasAccess = await this.verifyPassword(password, list.password || '');
      }
    } else if (list.visibility === 'private' && userId) {
      // Check if user is admin
      const admin = await db.listAdmin.findUnique({
        where: {
          listId_userId: {
            listId,
            userId,
          },
        },
      });

      if (admin) {
        hasAccess = true;
        canEdit = true;
      } else {
        // Check if user has access through group membership
        const isGroupMember = await db.userGroup.findFirst({
          where: {
            userId,
            group: {
              lists: {
                some: {
                  listId,
                },
              },
            },
          },
        });

        if (isGroupMember) {
          hasAccess = true;
          // Group members can view but cannot edit (per business rules)
          canEdit = false;
        }
      }
    }

    if (!hasAccess) {
      if (list.visibility === 'password') {
        throw new ForbiddenError('Password required to access this list');
      } else {
        throw new ForbiddenError('You do not have access to this list');
      }
    }

    return {
      ...list,
      isOwner,
      canEdit,
      hasAccess,
    };
  }

  /**
   * Get user's lists
   */
  async getUserLists(
    userId: string,
    options: ListPaginationOptions = {}
  ): Promise<{ lists: ListWithDetails[]; hasMore: boolean }> {
    const limit = options.limit || 20;
    const cursor = options.cursor;

    // Build where clause to include both owned lists and lists where user is admin
    const whereClause: Prisma.ListWhereInput = {
      OR: [
        { ownerId: userId },
        {
          admins: {
            some: {
              userId: userId,
            },
          },
        },
      ],
    };

    if (options.search) {
      whereClause.AND = [
        { OR: whereClause.OR },
        {
          OR: [
            { name: { contains: options.search } },
            { description: { contains: options.search } },
          ],
        },
      ];
      delete whereClause.OR;
    }

    const lists = await db.list.findMany({
      where: whereClause,
      include: {
        owner: {
          select: {
            id: true,
            name: true,
            email: true,
            avatarUrl: true,
          },
        },
        admins: {
          include: {
            user: {
              select: {
                id: true,
                name: true,
                email: true,
                avatarUrl: true,
              },
            },
          },
          orderBy: {
            addedAt: 'asc',
          },
        },
        _count: {
          select: {
            wishes: true,
            admins: true,
          },
        },
        // Remove wishes include to prevent performance issues
        // Wishes will be loaded separately when needed (e.g., on list detail page)
      },
      orderBy: {
        updatedAt: 'desc',
      },
      take: limit + 1,
      cursor: cursor ? { id: cursor } : undefined,
      skip: cursor ? 1 : 0,
    });

    const hasMore = lists.length > limit;
    if (hasMore) {
      lists.pop();
    }

    return {
      lists: lists.map((list) => {
        const isOwner = list.ownerId === userId;
        const isAdmin = list.admins.some((admin) => admin.userId === userId);

        return {
          ...list,
          owner: {
            ...list.owner,
            avatarUrl: resolveAvatarUrlSync(list.owner),
          },
          admins: list.admins.map((admin) => ({
            user: {
              ...admin.user,
              avatarUrl: resolveAvatarUrlSync(admin.user),
            },
            addedAt: admin.addedAt,
          })),
          // Note: wishes not included for performance (loaded separately when needed)
          isOwner,
          canEdit: isOwner || isAdmin,
          hasAccess: true,
        };
      }),
      hasMore,
    };
  }

  /**
   * Add wish to list
   */
  async addWishToList(listId: string, data: AddWishToListInput, userId: string): Promise<void> {
    // Use centralized permission service
    await permissionService.require(userId, 'edit', { type: 'list', id: listId });

    // Verify wish exists and user owns it
    await permissionService.require(userId, 'edit', { type: 'wish', id: data.wishId });

    // Check if wish is already in the list
    const existing = await db.listWish.findUnique({
      where: {
        listId_wishId: {
          listId,
          wishId: data.wishId,
        },
      },
    });

    if (existing) {
      // Wish is already in list, return silently (idempotent operation)
      return;
    }

    // Add wish to list
    await db.listWish.create({
      data: {
        listId,
        wishId: data.wishId,
      },
    });
  }

  /**
   * Remove wish from list
   */
  async removeWishFromList(
    listId: string,
    data: RemoveWishFromListInput,
    userId: string
  ): Promise<void> {
    // Use centralized permission service
    await permissionService.require(userId, 'edit', { type: 'list', id: listId });

    // Remove wish from list
    const { count } = await db.listWish.deleteMany({
      where: {
        listId,
        wishId: data.wishId,
      },
    });

    if (count === 0) {
      throw new NotFoundError('Wish not found in this list');
    }
  }

  /**
   * Bulk remove wishes from list
   */
  async bulkRemoveWishesFromList(
    listId: string,
    wishIds: string[],
    userId: string
  ): Promise<{ removed: number }> {
    // Use centralized permission service
    await permissionService.require(userId, 'edit', { type: 'list', id: listId });

    // Validate input
    if (!Array.isArray(wishIds) || wishIds.length === 0) {
      throw new ValidationError('wishIds must be a non-empty array');
    }

    // Remove wishes from list in a transaction
    const result = await db.$transaction(async (tx) => {
      const deleteResult = await tx.listWish.deleteMany({
        where: {
          listId,
          wishId: { in: wishIds },
        },
      });

      return deleteResult;
    });

    return { removed: result.count };
  }

  /**
   * Create reservation (for anonymous users)
   */
  async createReservation(
    wishId: string,
    reserverName: string,
    reserverEmail: string
  ): Promise<void> {
    // Get wish and check if it exists
    const wish = await db.wish.findUnique({
      where: { id: wishId },
      include: {
        reservations: true,
      },
    });

    if (!wish) {
      throw new NotFoundError('Wish not found');
    }

    // Check if there's enough quantity available
    const totalReserved = wish.reservations.length;
    const availableQuantity = wish.quantity - totalReserved;

    if (availableQuantity <= 0) {
      throw new ValidationError('This item is fully reserved');
    }

    // Check if this email already has a reservation
    const existingReservation = wish.reservations.find((r) => r.reserverEmail === reserverEmail);

    if (existingReservation) {
      throw new ValidationError('You already have a reservation for this item');
    }

    // Create new reservation
    await db.reservation.create({
      data: {
        wishId,
        reserverName,
        reserverEmail,
      },
    });
  }

  /**
   * Cancel reservation
   */
  async cancelReservation(wishId: string, reserverEmail: string): Promise<void> {
    const reservation = await db.reservation.findFirst({
      where: {
        wishId,
        reserverEmail,
      },
    });

    if (!reservation) {
      throw new NotFoundError('Reservation not found');
    }

    await db.reservation.delete({
      where: { id: reservation.id },
    });
  }

  /**
   * Get reservations for a wish (owner only)
   */
  async getWishReservations(wishId: string, userId: string): Promise<ReservationWithDetails[]> {
    // Use centralized permission service to verify user owns the wish
    await permissionService.require(userId, 'view', { type: 'wish', id: wishId });

    const reservations = await db.reservation.findMany({
      where: { wishId },
      include: {
        wish: {
          select: {
            id: true,
            title: true,
            price: true,
            imageUrl: true,
          },
        },
      },
      orderBy: {
        reservedAt: 'desc',
      },
    });

    return reservations;
  }

  /**
   * Verify list access with password
   */
  async verifyListAccess(listId: string, data: ListAccessInput): Promise<boolean> {
    const list = await db.list.findUnique({
      where: { id: listId },
      select: { id: true, password: true, visibility: true },
    });

    if (!list) {
      throw new NotFoundError('List not found');
    }

    if (list.visibility !== 'password') {
      throw new ValidationError('This list is not password protected');
    }

    return this.verifyPassword(data.password, list.password || '');
  }

  /**
   * Generate shareable link for list
   */
  async generateShareToken(listId: string, userId: string): Promise<string> {
    // Use centralized permission service
    await permissionService.require(userId, 'share', { type: 'list', id: listId });

    // Generate unique token
    const shareToken = crypto.randomBytes(32).toString('hex');

    // Update list with share token
    await db.list.update({
      where: { id: listId },
      data: { shareToken },
    });

    return shareToken;
  }

  /**
   * Get list by share token
   */
  async getListByShareToken(token: string, password?: string): Promise<ListWithDetails> {
    const list = await db.list.findUnique({
      where: { shareToken: token },
      include: {
        owner: {
          select: {
            id: true,
            name: true,
            email: true,
            avatarUrl: true,
          },
        },
        _count: {
          select: {
            wishes: true,
            admins: true,
          },
        },
        wishes: {
          include: {
            wish: true, // Include all wish fields for editing
          },
          orderBy: {
            addedAt: 'desc',
          },
        },
      },
    });

    if (!list) {
      throw new NotFoundError('List not found or share link is invalid');
    }

    // Check access permissions for shared lists
    let hasAccess = false;

    if (list.visibility === 'public') {
      hasAccess = true;
    } else if (list.visibility === 'password') {
      if (password) {
        hasAccess = await this.verifyPassword(password, list.password || '');
      }
    } else {
      // Private lists should not be accessible via share token
      throw new ForbiddenError('This list is private and cannot be accessed');
    }

    if (!hasAccess) {
      if (list.visibility === 'password') {
        throw new ForbiddenError('Password required to access this list');
      } else {
        throw new ForbiddenError('You do not have access to this list');
      }
    }

    return {
      ...list,
      isOwner: false,
      canEdit: false,
      hasAccess: true,
    };
  }

  // Helper methods

  /**
   * Find a unique slug for a user by appending numeric suffixes if needed
   *
   * @param ownerId - User ID who owns the list
   * @param baseSlug - Base slug to make unique
   * @returns Unique slug with numeric suffix if needed
   */
  private async findUniqueSlug(ownerId: string, baseSlug: string): Promise<string> {
    // Check if base slug is available
    const exists = await db.list.findUnique({
      where: { ownerId_slug: { ownerId, slug: baseSlug } },
    });

    if (!exists) {
      return baseSlug;
    }

    // Find next available numeric suffix
    let counter = 2;
    const maxAttempts = 100; // Safety limit

    while (counter <= maxAttempts) {
      const nextSlug = `${baseSlug}-${counter}`;
      const collision = await db.list.findUnique({
        where: { ownerId_slug: { ownerId, slug: nextSlug } },
      });

      if (!collision) {
        return nextSlug;
      }
      counter++;
    }

    throw new Error('Unable to generate unique slug after 100 attempts');
  }

  private async hashPassword(password: string): Promise<string> {
    // Use Argon2 for all new passwords
    return hash(password, {
      memoryCost: 19456,
      timeCost: 2,
      outputLen: 32,
      parallelism: 1,
    });
  }

  async verifyPassword(password: string, storedHash: string): Promise<boolean> {
    if (!storedHash) {
      return false;
    }

    // All passwords are Argon2 hashed
    try {
      return await verify(storedHash, password);
    } catch (err) {
      logger.error('Argon2 password verification failed:', err);
      return false;
    }
  }

  /**
   * Get count of lists for a user
   */
  async getListsCount(userId: string): Promise<{ count: number }> {
    const count = await db.list.count({
      where: { ownerId: userId },
    });
    return { count };
  }

  /**
   * Set a slug for a list (vanity URL)
   */
  async setSlug(listId: string, userId: string, slug: string): Promise<ListWithOwner> {
    // Use centralized permission service
    await permissionService.require(userId, 'edit', { type: 'list', id: listId });

    // Verify the list exists and get the owner
    const list = await db.list.findUnique({
      where: { id: listId },
      select: { id: true, ownerId: true, slug: true },
    });

    if (!list) {
      throw new NotFoundError('List not found');
    }

    // Only the owner can set/change slugs
    if (list.ownerId !== userId) {
      throw new ForbiddenError('Only the list owner can set a slug');
    }

    try {
      const updatedList = await db.list.update({
        where: { id: listId },
        data: { slug: slug.toLowerCase() },
        include: {
          owner: {
            select: {
              id: true,
              name: true,
              email: true,
              avatarUrl: true,
            },
          },
          _count: {
            select: {
              wishes: true,
              admins: true,
            },
          },
        },
      });

      return updatedList as ListWithOwner;
    } catch (error) {
      if (
        error instanceof Prisma.PrismaClientKnownRequestError &&
        error.code === 'P2002' &&
        error.meta?.['target'] &&
        Array.isArray(error.meta['target']) &&
        error.meta['target'].includes('slug')
      ) {
        throw new ConflictError('Slug is already in use by another of your lists');
      }
      throw error;
    }
  }

  /**
   * Get list by vanity URL (username + slug)
   * Returns null if list not found, is private, or hidden from profile
   */
  async getByVanityUrl(username: string, slug: string): Promise<ListWithDetails | null> {
    const list = await db.list.findFirst({
      where: {
        slug: slug.toLowerCase(),
        owner: {
          username: username.toLowerCase(),
        },
      },
      include: {
        owner: {
          select: {
            id: true,
            name: true,
            email: true,
            avatarUrl: true,
          },
        },
        _count: {
          select: {
            wishes: true,
            admins: true,
          },
        },
        wishes: {
          include: {
            wish: true,
          },
          orderBy: {
            addedAt: 'desc',
          },
        },
      },
    });

    if (!list) {
      return null;
    }

    // Check visibility - vanity URLs only work for public and password-protected lists
    // Also exclude lists hidden from profile
    if (list.visibility === 'private' || list.hideFromProfile) {
      return null;
    }

    // For password-protected lists, return basic info without wishes
    // The caller will need to verify the password separately
    return {
      ...list,
      isOwner: false,
      canEdit: false,
      hasAccess: list.visibility === 'public',
    };
  }

  /**
   * Get public lists by username (for user profile page)
   */
  async getPublicListsByUsername(username: string): Promise<ListWithDetails[]> {
    const lists = await db.list.findMany({
      where: {
        owner: {
          username: username.toLowerCase(),
        },
        hideFromProfile: false,
        OR: [{ visibility: 'public' }, { visibility: 'password' }],
      },
      include: {
        owner: {
          select: {
            id: true,
            name: true,
            email: true,
            avatarUrl: true,
          },
        },
        _count: {
          select: {
            wishes: true,
            admins: true,
          },
        },
      },
      orderBy: {
        createdAt: 'desc',
      },
    });

    return lists.map((list) => ({
      ...list,
      isOwner: false,
      canEdit: false,
      hasAccess: list.visibility === 'public',
    }));
  }
}

// Export singleton instance
export const listService = new ListService();
