import { hash, verify } from '@node-rs/argon2';
import { List, Prisma, User, Wish } from '@prisma/client';
import crypto from 'crypto';

import { resolveAvatarUrlSync } from '@/lib/avatar-utils';
import { db } from '@/lib/db';
import { ConflictError, ForbiddenError, NotFoundError, ValidationError } from '@/lib/errors';
import { AuditActions } from '@/lib/schemas/audit-log';
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

import { auditService } from './audit-service';
import { logger } from './logger';
import { permissionService } from './permission-service';

export interface ListWithDetails extends Omit<List, 'password'> {
  user: Pick<User, 'id' | 'name' | 'email' | 'avatarUrl'>;
  password?: string | null | undefined;
  _count: {
    listWishes: number;
    listAdmins: number;
  };
  listWishes?: Array<{
    wish: Wish;
    addedAt: Date;
    wishLevel: number | null;
  }>;
  listAdmins?: Array<{
    user: Pick<User, 'id' | 'name' | 'email' | 'avatarUrl'>;
    addedAt: Date;
  }>;
  listGroups?: Array<{
    group: {
      id: string;
      name: string;
      avatarUrl: string | null;
    };
  }>;
  isOwner?: boolean;
  canEdit?: boolean;
  hasAccess?: boolean;
}

export interface ReservationWithDetails {
  id: string;
  userId: string;
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
        user: {
          select: {
            id: true,
            name: true,
            email: true,
            avatarUrl: true,
          },
        },
        _count: {
          select: {
            listWishes: true,
            listAdmins: true,
          },
        },
      },
    });

    // Fire and forget audit log
    auditService.log({
      actorId: userId,
      actorType: 'user',
      category: 'content',
      action: AuditActions.LIST_CREATED,
      resourceType: 'list',
      resourceId: list.id,
      resourceName: list.name,
      details: { visibility: list.visibility },
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

    // Get current list to check visibility and other settings
    const currentList = await db.list.findUnique({
      where: { id: listId },
      select: { shareToken: true, visibility: true, slug: true, name: true, ownerId: true },
    });

    if (!currentList) {
      throw new NotFoundError('List not found');
    }

    // Validate password requirement for password-protected lists
    // Only require password when CHANGING to password visibility (not when already password-protected)
    if (data.visibility === 'password' && !data.password && currentList.visibility !== 'password') {
      throw new ValidationError('Password is required for password-protected lists');
    }

    // Hash password if provided
    let hashedPassword = undefined;
    if (data.password) {
      hashedPassword = await this.hashPassword(data.password);
    } else if (data.visibility !== 'password') {
      hashedPassword = null;
    }
    // Note: if visibility === 'password' and no new password provided, hashedPassword stays undefined
    // which means the existing password is preserved (not updated in the database)

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
            user: {
              select: {
                id: true,
                name: true,
                email: true,
                avatarUrl: true,
              },
            },
            _count: {
              select: {
                listWishes: true,
                listAdmins: true,
              },
            },
          },
        });

        // Fire and forget audit log
        auditService.log({
          actorId: userId,
          actorType: 'user',
          category: 'content',
          action: AuditActions.LIST_UPDATED,
          resourceType: 'list',
          resourceId: listId,
          resourceName: updated.name,
          details: {
            updatedFields: Object.keys(data).filter(
              (k) => data[k as keyof ListUpdateInput] !== undefined
            ),
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

    // Get list name for audit log before deletion
    const list = await db.list.findUnique({
      where: { id: listId },
      select: { name: true },
    });

    // Delete list and all associations
    await db.$transaction(async (tx) => {
      // Delete reservations for wishes in this list
      await tx.reservation.deleteMany({
        where: {
          wish: {
            listWishes: {
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

    // Fire and forget audit log
    auditService.log({
      actorId: userId,
      actorType: 'user',
      category: 'content',
      action: AuditActions.LIST_DELETED,
      resourceType: 'list',
      resourceId: listId,
      resourceName: list?.name || undefined,
    });
  }

  /**
   * Get list details
   */
  async getList(listId: string, userId?: string, password?: string): Promise<ListWithDetails> {
    const list = await db.list.findUnique({
      where: { id: listId },
      include: {
        user: {
          select: {
            id: true,
            name: true,
            email: true,
            avatarUrl: true,
          },
        },
        _count: {
          select: {
            listWishes: true,
            listAdmins: true,
          },
        },
        listWishes: {
          include: {
            wish: true,
          },
          orderBy: [
            { sortOrder: 'asc' }, // Primary: custom order (nulls last)
            { addedAt: 'desc' }, // Fallback: for wishes without custom sort
          ],
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
              listGroups: {
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
          listAdmins: {
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
        user: {
          select: {
            id: true,
            name: true,
            email: true,
            avatarUrl: true,
          },
        },
        listAdmins: {
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
        listGroups: {
          include: {
            group: {
              select: {
                id: true,
                name: true,
                avatarUrl: true,
              },
            },
          },
        },
        _count: {
          select: {
            listWishes: true,
            listAdmins: true,
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
        const isAdmin = list.listAdmins.some((admin) => admin.userId === userId);

        return {
          ...list,
          user: {
            ...list.user,
            avatarUrl: resolveAvatarUrlSync(list.user),
          },
          listAdmins: list.listAdmins.map((admin) => ({
            user: {
              ...admin.user,
              avatarUrl: resolveAvatarUrlSync(admin.user),
            },
            addedAt: admin.addedAt,
          })),
          listGroups: list.listGroups.map((lg) => ({
            group: {
              id: lg.group.id,
              name: lg.group.name,
              avatarUrl: lg.group.avatarUrl?.startsWith('avatar:')
                ? `/api/groups/${lg.group.id}/avatar`
                : lg.group.avatarUrl,
            },
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
    const list = await db.list.update({
      where: { id: listId },
      data: { shareToken },
    });

    // Fire and forget audit log
    auditService.log({
      actorId: userId,
      actorType: 'user',
      category: 'content',
      action: AuditActions.LIST_SHARED,
      resourceType: 'list',
      resourceId: listId,
      resourceName: list.name,
      details: { shareMethod: 'token' },
    });

    return shareToken;
  }

  /**
   * Get list visibility and password hash by share token (lightweight check)
   * Used for cookie-based access validation before fetching full list data
   */
  async getListAccessInfoByShareToken(
    token: string
  ): Promise<{ id: string; visibility: string; password: string | null } | null> {
    const list = await db.list.findUnique({
      where: { shareToken: token },
      select: { id: true, visibility: true, password: true },
    });

    return list;
  }

  /**
   * Get list by share token with cookie-based access (no password required)
   * Used when cookie has already validated access
   */
  async getListByShareTokenWithCookieAccess(token: string): Promise<ListWithDetails> {
    const list = await db.list.findUnique({
      where: { shareToken: token },
      include: {
        user: {
          select: {
            id: true,
            name: true,
            email: true,
            avatarUrl: true,
          },
        },
        _count: {
          select: {
            listWishes: true,
            listAdmins: true,
          },
        },
        listWishes: {
          include: {
            wish: true,
          },
          orderBy: [{ sortOrder: 'asc' }, { addedAt: 'desc' }],
        },
      },
    });

    if (!list) {
      throw new NotFoundError('List not found or share link is invalid');
    }

    // Only password-protected lists can use cookie access
    if (list.visibility !== 'password') {
      throw new ForbiddenError('Invalid access method for this list type');
    }

    return {
      ...list,
      isOwner: false,
      canEdit: false,
      hasAccess: true,
    };
  }

  /**
   * Get list by share token
   */
  async getListByShareToken(token: string, password?: string): Promise<ListWithDetails> {
    const list = await db.list.findUnique({
      where: { shareToken: token },
      include: {
        user: {
          select: {
            id: true,
            name: true,
            email: true,
            avatarUrl: true,
          },
        },
        _count: {
          select: {
            listWishes: true,
            listAdmins: true,
          },
        },
        listWishes: {
          include: {
            wish: true, // Include all wish fields for editing
          },
          orderBy: [{ sortOrder: 'asc' }, { addedAt: 'desc' }],
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
          user: {
            select: {
              id: true,
              name: true,
              email: true,
              avatarUrl: true,
            },
          },
          _count: {
            select: {
              listWishes: true,
              listAdmins: true,
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
        user: {
          username: username.toLowerCase(),
        },
      },
      include: {
        user: {
          select: {
            id: true,
            name: true,
            email: true,
            avatarUrl: true,
          },
        },
        _count: {
          select: {
            listWishes: true,
            listAdmins: true,
          },
        },
        listWishes: {
          include: {
            wish: true,
          },
          orderBy: [{ sortOrder: 'asc' }, { addedAt: 'desc' }],
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
        user: {
          username: username.toLowerCase(),
        },
        hideFromProfile: false,
        OR: [{ visibility: 'public' }, { visibility: 'password' }],
      },
      include: {
        user: {
          select: {
            id: true,
            name: true,
            email: true,
            avatarUrl: true,
          },
        },
        _count: {
          select: {
            listWishes: true,
            listAdmins: true,
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

  /**
   * Update the sortOrder of a single wish in a list.
   *
   * Uses fractional indexing to avoid renumbering all wishes. This method:
   * - Checks user has edit permission on the list
   * - Verifies the list exists and checks for conflicts (if clientLastFetchedAt provided)
   * - Verifies the wish exists in the list
   * - Updates only the moved wish's sortOrder
   *
   * @param listId - ID of the list containing the wish
   * @param wishId - ID of the wish to reorder
   * @param newSortOrder - New sortOrder value (calculated via fractional indexing)
   * @param userId - ID of the user performing the action
   * @param clientLastFetchedAt - Optional: when the client loaded the list (for conflict detection)
   * @returns Updated ListWish with wish relation included
   * @throws {ForbiddenError} If user lacks edit permission on the list
   * @throws {NotFoundError} If list or wish not found in list
   * @throws {ConflictError} If list was modified since clientLastFetchedAt
   *
   * @example
   * // Update wish position with conflict detection
   * const updated = await listService.updateWishSortOrder(
   *   'list-123',
   *   'wish-456',
   *   1.5,
   *   'user-789',
   *   new Date('2025-11-23T10:00:00Z')
   * );
   */
  async updateWishSortOrder(
    listId: string,
    wishId: string,
    newSortOrder: number,
    userId: string,
    clientLastFetchedAt?: Date
  ) {
    // 1. Permission check (MANDATORY)
    await permissionService.require(userId, 'edit', {
      type: 'list',
      id: listId,
    });

    // 2. Verify list exists and check for conflicts
    const list = await db.list.findUnique({
      where: { id: listId },
      select: { id: true, updatedAt: true },
    });

    if (!list) {
      throw new NotFoundError('List not found');
    }

    // Conflict detection: list was modified since client loaded it
    if (clientLastFetchedAt && list.updatedAt > clientLastFetchedAt) {
      throw new ConflictError('List was modified by another user. Please refresh and try again.');
    }

    // 3. Verify wish belongs to this list
    const existingListWish = await db.listWish.findUnique({
      where: {
        listId_wishId: {
          listId,
          wishId,
        },
      },
    });

    if (!existingListWish) {
      throw new NotFoundError('Wish not found in this list');
    }

    // 4. Update sortOrder
    const updated = await db.listWish.update({
      where: {
        listId_wishId: {
          listId,
          wishId,
        },
      },
      data: {
        sortOrder: newSortOrder,
      },
      include: {
        wish: true,
      },
    });

    return updated;
  }

  /**
   * Initialize custom sort for a list by assigning sortOrder values
   * to all wishes based on their current display order (addedAt DESC).
   *
   * This is called when a user first activates "Custom Order" sort.
   * - Checks if custom sort is already initialized (any sortOrder !== null)
   * - If already initialized, returns { initialized: 0 }
   * - Otherwise, assigns sortOrder with gaps: 0, 10, 20, 30...
   *
   * @param listId - ID of the list to initialize
   * @param userId - ID of the user performing the action
   * @returns Object with count of wishes initialized
   * @throws {ForbiddenError} If user lacks edit permission on the list
   * @throws {NotFoundError} If list not found
   *
   * @example
   * // Initialize custom sort for a list
   * const result = await listService.initializeCustomSort('list-123', 'user-789');
   * console.log(`Initialized ${result.initialized} wishes`);
   */
  async initializeCustomSort(listId: string, userId: string): Promise<{ initialized: number }> {
    // 1. Permission check (MANDATORY)
    await permissionService.require(userId, 'edit', {
      type: 'list',
      id: listId,
    });

    // 2. Check if already initialized
    const hasCustomSort = await db.listWish.count({
      where: {
        listId,
        sortOrder: { not: null },
      },
    });

    if (hasCustomSort > 0) {
      // Already initialized, no action needed
      return { initialized: 0 };
    }

    // 3. Fetch wishes in current default order (addedAt DESC)
    const wishes = await db.listWish.findMany({
      where: { listId },
      orderBy: { addedAt: 'desc' },
    });

    if (wishes.length === 0) {
      return { initialized: 0 };
    }

    // 4. Assign sortOrder with gaps: 0, 10, 20, 30...
    // Using transaction to ensure atomicity
    await db.$transaction(
      wishes.map((lw, index) =>
        db.listWish.update({
          where: {
            listId_wishId: {
              listId: lw.listId,
              wishId: lw.wishId,
            },
          },
          data: {
            sortOrder: index * 10.0,
          },
        })
      )
    );

    return { initialized: wishes.length };
  }
}

// Export singleton instance
export const listService = new ListService();
