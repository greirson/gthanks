import { Prisma, Wish } from '@prisma/client';

import { db } from '@/lib/db';
import { ForbiddenError, NotFoundError, ValidationError } from '@/lib/errors';
import {
  WishCreateInput,
  WishQueryOptions,
  WishQueryValidatedParams,
  WishUpdateInput,
} from '@/lib/validators/wish';

import { imageProcessor } from './image-processor';
import { logger } from './logger';
import { permissionService } from './permission-service';

export interface PaginatedResult<T> {
  items: T[];
  nextCursor?: string;
  hasMore: boolean;
  total: number;
}

export interface WishFilters {
  priceMin?: number;
  priceMax?: number;
  wishLevelMin?: number;
  wishLevelMax?: number;
  hasPrice?: boolean;
  hasWishLevel?: boolean;
}

export interface WishSortOptions {
  sortBy: 'price' | 'wishLevel' | 'createdAt' | 'title';
  sortOrder: 'asc' | 'desc';
}

export class WishService {
  /**
   * Create a new wish for a user
   */
  async createWish(data: WishCreateInput, userId: string): Promise<Wish> {
    // Verify user exists
    const user = await db.user.findUnique({
      where: { id: userId },
    });

    if (!user) {
      throw new NotFoundError('User not found');
    }

    // If URL is provided and no title, we'll extract metadata later
    if (data.url && !data.title) {
      throw new ValidationError('Title is required', 'title');
    }

    try {
      const wish = await db.wish.create({
        data: {
          title: data.title,
          notes: data.notes || null,
          url: data.url || null,
          price: data.price ? data.price : null,
          imageUrl: data.imageUrl || null,
          sourceImageUrl: data.imageUrl || null, // Store source URL for processing
          localImagePath: data.imageUrl?.startsWith('/api/images/') ? data.imageUrl : null, // Set localImagePath for uploaded images
          quantity: data.quantity || 1,
          size: data.size || null,
          color: data.color || null,
          wishLevel: data.wishLevel || 1,
          ownerId: userId,
          imageStatus:
            data.imageUrl && !data.imageUrl.startsWith('/api/images/') ? 'PENDING' : 'COMPLETED', // Uploaded images are already processed
        },
      });
      // If a remote image URL was provided, process and store it locally
      let result = wish;
      if (data.imageUrl && !data.imageUrl.startsWith('/api/images/')) {
        logger.info(
          {
            wishId: wish.id,
            imageUrl: data.imageUrl.substring(0, 100),
          },
          'Processing remote image'
        );
        try {
          await imageProcessor.processImageFromUrl(wish.id, data.imageUrl);
          result = await db.wish.findUniqueOrThrow({ where: { id: wish.id } });
          logger.info(
            {
              wishId: wish.id,
              localImagePath: result.localImagePath,
            },
            'Image processed successfully'
          );
        } catch (processError) {
          logger.error(
            {
              error: processError,
              userId,
              wishId: wish.id,
              imageUrl: data.imageUrl,
            },
            'Image processing failed'
          );
          // Error already logged by logger.error above
        }
      }

      return result;
    } catch (error) {
      logger.error(
        {
          error,
          userId,
          wishData: { title: data.title, hasImage: !!data.imageUrl },
        },
        'Failed to create wish'
      );
      throw new Error('Failed to create wish');
    }
  }

  /**
   * Update an existing wish
   */
  async updateWish(wishId: string, data: WishUpdateInput, userId: string): Promise<Wish> {
    // Use centralized permission service
    await permissionService.require(userId, 'edit', { type: 'wish', id: wishId });

    // Find wish for current state
    const wish = await db.wish.findUnique({
      where: { id: wishId },
    });

    if (!wish) {
      throw new NotFoundError('Wish not found');
    }

    try {
      // Check if imageUrl is being updated
      const isImageUrlUpdated = data.imageUrl !== undefined && data.imageUrl !== wish.imageUrl;
      const _oldLocalImagePath = isImageUrlUpdated ? wish.localImagePath : null;

      const updated = await db.wish.update({
        where: { id: wishId },
        data: {
          title: data.title !== undefined ? data.title : wish.title,
          notes: data.notes !== undefined ? data.notes : wish.notes,
          url: data.url !== undefined ? data.url : wish.url,
          price: data.price !== undefined ? (data.price ? data.price : null) : wish.price,
          imageUrl: data.imageUrl !== undefined ? data.imageUrl : wish.imageUrl,
          sourceImageUrl: isImageUrlUpdated ? data.imageUrl : wish.sourceImageUrl,
          quantity: data.quantity !== undefined ? data.quantity : wish.quantity,
          size: data.size !== undefined ? data.size : wish.size,
          color: data.color !== undefined ? data.color : wish.color,
          wishLevel: data.wishLevel !== undefined ? data.wishLevel : wish.wishLevel,
          imageStatus:
            isImageUrlUpdated && data.imageUrl && !data.imageUrl.startsWith('/api/images/')
              ? 'PENDING'
              : 'COMPLETED',
          localImagePath: isImageUrlUpdated
            ? data.imageUrl?.startsWith('/api/images/')
              ? data.imageUrl
              : null
            : wish.localImagePath, // Set localImagePath for uploaded images or clear for external URLs
        },
      });
      // Process new remote image if needed
      let result = updated;
      if (isImageUrlUpdated && data.imageUrl && !data.imageUrl.startsWith('/api/images/')) {
        try {
          await imageProcessor.processImageFromUrl(wishId, data.imageUrl);
          result = await db.wish.findUniqueOrThrow({ where: { id: wishId } });
        } catch (processError) {
          logger.error(
            {
              error: processError,
              userId,
              wishId,
              imageUrl: data.imageUrl,
            },
            'Image processing failed'
          );
        }
      }

      // Clean up previous local image if it existed
      if (isImageUrlUpdated && _oldLocalImagePath) {
        await imageProcessor.deleteImage(_oldLocalImagePath);
      }

      return result;
    } catch (error) {
      logger.error(
        {
          error,
          userId,
          wishId,
          updateData: { hasTitle: !!data.title, hasImage: !!data.imageUrl },
        },
        'Failed to update wish'
      );
      throw new Error('Failed to update wish');
    }
  }

  /**
   * Delete a wish
   */
  async deleteWish(wishId: string, userId: string): Promise<void> {
    // Use centralized permission service
    await permissionService.require(userId, 'delete', { type: 'wish', id: wishId });

    // Find wish for cleanup
    const wish = await db.wish.findUnique({
      where: { id: wishId },
      include: {
        listWishes: true,
        reservations: true,
      },
    });

    if (!wish) {
      throw new NotFoundError('Wish not found');
    }

    // Use transaction to ensure all related data is cleaned up
    await db.$transaction(async (tx) => {
      // Remove from all lists first
      if (wish.listWishes.length > 0) {
        await tx.listWish.deleteMany({
          where: { wishId },
        });
      }

      // Remove all reservations
      if (wish.reservations.length > 0) {
        await tx.reservation.deleteMany({
          where: { wishId },
        });
      }

      // Delete the wish
      await tx.wish.delete({
        where: { id: wishId },
      });
    });

    // Clean up the locally stored image file (outside of transaction)
    if (wish.localImagePath) {
      await imageProcessor.deleteImage(wish.localImagePath);
    }
  }

  /**
   * Add multiple wishes to a list (bulk operation)
   */
  async addWishesToList(
    wishIds: string[],
    listId: string,
    userId: string
  ): Promise<{ added: number; skipped: number }> {
    // Verify user owns the list using permissionService
    await permissionService.require(userId, 'edit', { type: 'list', id: listId });

    // Verify user owns all wishes (single query)
    const userWishes = await db.wish.findMany({
      where: { id: { in: wishIds }, ownerId: userId },
      select: { id: true },
    });

    const ownedWishIds = userWishes.map((w) => w.id);
    const unauthorizedIds = wishIds.filter((id) => !ownedWishIds.includes(id));

    if (unauthorizedIds.length > 0) {
      throw new ForbiddenError(`Cannot add wishes you don't own: ${unauthorizedIds.join(', ')}`);
    }

    // Add to list in transaction
    return db.$transaction(async (tx) => {
      const existingListWishes = await tx.listWish.findMany({
        where: { listId, wishId: { in: wishIds } },
        select: { wishId: true },
      });

      const existingWishIds = existingListWishes.map((lw) => lw.wishId);
      const newWishIds = wishIds.filter((id) => !existingWishIds.includes(id));

      if (newWishIds.length === 0) {
        return { added: 0, skipped: wishIds.length };
      }

      const result = await tx.listWish.createMany({
        data: newWishIds.map((wishId) => ({ wishId, listId })),
      });

      return { added: result.count, skipped: wishIds.length - result.count };
    });
  }

  /**
   * Delete multiple wishes (bulk operation)
   */
  async deleteWishes(wishIds: string[], userId: string): Promise<{ deleted: number }> {
    // Verify user owns all wishes
    const userWishes = await db.wish.findMany({
      where: { id: { in: wishIds }, ownerId: userId },
      select: { id: true, localImagePath: true },
    });

    const ownedWishIds = userWishes.map((w) => w.id);
    const unauthorizedIds = wishIds.filter((id) => !ownedWishIds.includes(id));

    if (unauthorizedIds.length > 0) {
      throw new ForbiddenError(`Cannot delete wishes you don't own: ${unauthorizedIds.join(', ')}`);
    }

    // Delete in transaction
    const result = await db.$transaction(async (tx) => {
      await tx.listWish.deleteMany({ where: { wishId: { in: wishIds } } });
      await tx.reservation.deleteMany({ where: { wishId: { in: wishIds } } });
      const deleteResult = await tx.wish.deleteMany({
        where: { id: { in: wishIds }, ownerId: userId },
      });
      return deleteResult;
    });

    // Clean up images (outside transaction)
    for (const wish of userWishes) {
      if (wish.localImagePath) {
        try {
          await imageProcessor.deleteImage(wish.localImagePath);
        } catch (error) {
          console.error('Failed to delete local image file during bulk wish deletion:', {
            wishId: wish.id,
            localImagePath: wish.localImagePath,
            error,
          });
          // Continue to next image
        }
      }
    }

    return { deleted: result.count };
  }

  /**
   * Remove multiple wishes from all lists (bulk operation)
   */
  async removeWishesFromLists(wishIds: string[], userId: string): Promise<{ removed: number }> {
    // Verify user owns all wishes
    const userWishes = await db.wish.findMany({
      where: { id: { in: wishIds }, ownerId: userId },
      select: { id: true },
    });

    const ownedWishIds = userWishes.map((w) => w.id);
    const unauthorizedIds = wishIds.filter((id) => !ownedWishIds.includes(id));

    if (unauthorizedIds.length > 0) {
      throw new ForbiddenError(`Cannot remove wishes you don't own: ${unauthorizedIds.join(', ')}`);
    }

    // Remove from all lists in transaction
    const result = await db.$transaction(async (tx) => {
      return tx.listWish.deleteMany({ where: { wishId: { in: wishIds } } });
    });

    return { removed: result.count };
  }

  /**
   * Get all lists that contain a wish (filtered to user's own lists)
   */
  async getWishLists(wishId: string, userId: string) {
    // Verify user owns the wish
    await permissionService.require(userId, 'view', { type: 'wish', id: wishId });

    // Verify wish exists
    const wish = await db.wish.findUnique({
      where: { id: wishId },
      select: { id: true, ownerId: true },
    });

    if (!wish) {
      throw new NotFoundError('Wish not found');
    }

    // Get all lists this wish belongs to (filtered to user's own lists)
    const listWishes = await db.listWish.findMany({
      where: {
        wishId,
        list: {
          ownerId: userId,
        },
      },
      include: {
        list: {
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
          },
        },
      },
      orderBy: {
        addedAt: 'desc',
      },
    });

    // Extract just the list data
    return listWishes.map((lw) => lw.list);
  }

  /**
   * Update which lists a wish belongs to (complete replacement)
   */
  async updateWishListMemberships(
    wishId: string,
    listIds: string[],
    userId: string
  ): Promise<{ success: boolean }> {
    // Deduplicate list IDs
    const uniqueListIds = [...new Set(listIds)];

    // Verify user owns the wish
    await permissionService.require(userId, 'edit', { type: 'wish', id: wishId });

    // Verify wish exists
    const wish = await db.wish.findUnique({
      where: { id: wishId },
      select: { id: true, ownerId: true },
    });

    if (!wish) {
      throw new NotFoundError('Wish not found');
    }

    // Verify user owns all target lists
    if (uniqueListIds.length > 0) {
      const targetLists = await db.list.findMany({
        where: { id: { in: uniqueListIds } },
        select: { id: true, ownerId: true },
      });

      // Check if all requested lists exist
      if (targetLists.length !== uniqueListIds.length) {
        const foundIds = targetLists.map((l) => l.id);
        const missingIds = uniqueListIds.filter((id) => !foundIds.includes(id));
        throw new NotFoundError(`Lists not found: ${missingIds.join(', ')}`);
      }

      // Check if user owns all target lists
      const unauthorizedLists = targetLists.filter((list) => list.ownerId !== userId);
      if (unauthorizedLists.length > 0) {
        throw new ForbiddenError(
          `Cannot add wish to lists you don't own: ${unauthorizedLists.map((l) => l.id).join(', ')}`
        );
      }
    }

    // Transactionally update list memberships
    await db.$transaction(async (tx) => {
      // Get current list memberships
      const currentMemberships = await tx.listWish.findMany({
        where: { wishId },
        select: { listId: true },
      });

      const currentListIds = currentMemberships.map((m) => m.listId);

      // Calculate diff
      const toRemove = currentListIds.filter((id) => !uniqueListIds.includes(id));
      const toAdd = uniqueListIds.filter((id) => !currentListIds.includes(id));

      // Remove wish from lists no longer selected
      if (toRemove.length > 0) {
        await tx.listWish.deleteMany({
          where: {
            wishId,
            listId: { in: toRemove },
          },
        });
      }

      // Add wish to newly selected lists
      if (toAdd.length > 0) {
        await tx.listWish.createMany({
          data: toAdd.map((listId) => ({
            wishId,
            listId,
          })),
        });
      }
    });

    return { success: true };
  }

  /**
   * Get a single wish by ID
   */
  async getWish(wishId: string, userId?: string): Promise<Wish & { isOwner: boolean }> {
    const wish = await db.wish.findUnique({
      where: { id: wishId },
      include: {
        user: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
      },
    });

    if (!wish) {
      throw new NotFoundError('Wish not found');
    }

    return {
      ...wish,
      isOwner: userId === wish.ownerId,
    };
  }

  /**
   * Get paginated wishes for a user (updated with filtering support)
   * Maintains backward compatibility while adding filter support
   */
  async getUserWishes(
    userId: string,
    options: Partial<WishQueryOptions>
  ): Promise<PaginatedResult<Wish>> {
    // If no advanced query params provided, use simple pagination
    if (!this.hasAdvancedQueryParams(options)) {
      // Original simple implementation for backward compatibility
      const limit = options.limit || 20;
      const where: Prisma.WishWhereInput = {
        ownerId: userId,
      };

      if (options.cursor) {
        where.id = { lt: options.cursor };
      }

      const wishes = await db.wish.findMany({
        where,
        take: limit + 1,
        orderBy: { createdAt: 'desc' },
      });

      const total = await db.wish.count({
        where: { ownerId: userId },
      });

      let hasMore = false;
      if (wishes.length > limit) {
        hasMore = true;
        wishes.pop();
      }

      const nextCursor = wishes.length > 0 ? wishes[wishes.length - 1].id : undefined;

      return {
        items: wishes,
        nextCursor,
        hasMore,
        total,
      };
    }

    // Use advanced filtering for complex queries
    return this.getFilteredUserWishes(userId, options as WishQueryValidatedParams);
  }

  /**
   * Get count of wishes for a user
   */
  async getWishesCount(userId: string): Promise<{ count: number }> {
    const count = await db.wish.count({
      where: { ownerId: userId },
    });
    return { count };
  }

  /**
   * Get filtered and sorted wishes for a user with advanced query options
   */
  async getFilteredUserWishes(
    userId: string,
    queryParams: WishQueryValidatedParams
  ): Promise<PaginatedResult<Wish>> {
    const {
      cursor,
      limit: _limit = 20,
      sortBy = 'wishLevel',
      sortOrder = 'desc',
      ...filters
    } = queryParams;

    // Validate and sanitize parameters
    const validatedParams = this.validateQueryParams(queryParams);

    // Build where clause with filters
    const where = this.buildWhereClause(userId, filters);

    // Add cursor for pagination
    if (cursor) {
      where.id = {
        lt: cursor,
      };
    }

    // Build order by clause
    const orderBy = this.buildOrderByClause({ sortBy, sortOrder });

    // Use performance monitoring for the query
    return this.withPerformanceMonitoring('getFilteredUserWishes', async () => {
      try {
        // Get wishes with filters and sorting
        const wishes = await db.wish.findMany({
          where,
          take: validatedParams.limit + 1, // Take one extra to determine hasMore
          orderBy,
        });

        // Get total count for filtered results
        const total = await db.wish.count({
          where: { ...where, id: undefined }, // Remove cursor from count query
        });

        // Determine if there are more results
        let hasMore = false;
        if (wishes.length > validatedParams.limit) {
          hasMore = true;
          wishes.pop(); // Remove the extra item
        }

        // Get next cursor
        const nextCursor = wishes.length > 0 ? wishes[wishes.length - 1].id : undefined;

        return {
          items: wishes,
          nextCursor,
          hasMore,
          total,
        };
      } catch (error) {
        logger.error(
          {
            error,
            userId,
            filters,
            pagination: { cursor, limit: _limit },
          },
          'Failed to fetch filtered wishes'
        );
        throw new Error('Failed to fetch wishes');
      }
    });
  }

  /**
   * Get price range statistics for user's wishes (for slider bounds)
   */
  async getWishPriceRange(userId: string): Promise<{ min: number; max: number } | null> {
    return this.withPerformanceMonitoring('getWishPriceRange', async () => {
      try {
        const result = await db.wish.aggregate({
          where: {
            ownerId: userId,
            price: { not: null },
          },
          _min: {
            price: true,
          },
          _max: {
            price: true,
          },
        });

        if (result._min.price === null || result._max.price === null) {
          return null; // No wishes with prices
        }

        return {
          min: result._min.price,
          max: result._max.price,
        };
      } catch (error) {
        logger.error(
          {
            error,
            userId,
          },
          'Failed to get price range'
        );
        throw new Error('Failed to get price range');
      }
    });
  }

  /**
   * Get wish level statistics for user's wishes
   */
  async getWishLevelStats(userId: string): Promise<{
    hasLevels: boolean;
    distribution: Array<{ level: number; count: number }>;
  }> {
    return this.withPerformanceMonitoring('getWishLevelStats', async () => {
      try {
        // Get count of wishes with levels
        const withLevelsCount = await db.wish.count({
          where: {
            ownerId: userId,
          },
        });

        if (withLevelsCount === 0) {
          return { hasLevels: false, distribution: [] };
        }

        // Get distribution of wish levels
        const distribution = await db.wish.groupBy({
          by: ['wishLevel'],
          where: {
            ownerId: userId,
          },
          _count: {
            id: true,
          },
          orderBy: {
            wishLevel: 'desc',
          },
        });

        return {
          hasLevels: true,
          distribution: distribution.map((item) => ({
            level: item.wishLevel,
            count: item._count.id,
          })),
        };
      } catch (error) {
        logger.error(
          {
            error,
            userId,
          },
          'Failed to get wish level statistics'
        );
        throw new Error('Failed to get wish level statistics');
      }
    });
  }

  /**
   * Build Prisma where clause from filter parameters
   */
  private buildWhereClause(userId: string, filters: WishFilters): Prisma.WishWhereInput {
    const where: Prisma.WishWhereInput = {
      ownerId: userId,
    };

    // Price range filtering
    if (filters.priceMin !== undefined || filters.priceMax !== undefined) {
      where.price = {};
      if (filters.priceMin !== undefined) {
        where.price.gte = filters.priceMin;
      }
      if (filters.priceMax !== undefined) {
        where.price.lte = filters.priceMax;
      }
    }

    // Wish level range filtering
    if (filters.wishLevelMin !== undefined || filters.wishLevelMax !== undefined) {
      where.wishLevel = {};
      if (filters.wishLevelMin !== undefined) {
        where.wishLevel.gte = filters.wishLevelMin;
      }
      if (filters.wishLevelMax !== undefined) {
        where.wishLevel.lte = filters.wishLevelMax;
      }
    }

    // Boolean filters for presence of fields
    if (filters.hasPrice !== undefined) {
      where.price = filters.hasPrice ? { not: null } : null;
    }

    if (filters.hasWishLevel !== undefined) {
      where.wishLevel = filters.hasWishLevel ? { gte: 1 } : undefined;
    }

    return where;
  }

  /**
   * Build Prisma orderBy clause from sort parameters
   */
  private buildOrderByClause(sortOptions: WishSortOptions): Prisma.WishOrderByWithRelationInput[] {
    const { sortBy, sortOrder } = sortOptions;

    // Handle special case for price sorting (null values sort as -$1)
    if (sortBy === 'price') {
      return [
        {
          price: {
            sort: sortOrder,
            nulls: sortOrder === 'desc' ? 'last' : 'first',
          },
        },
        // Secondary sort by createdAt for consistency
        {
          createdAt: 'desc',
        },
      ];
    }

    // Handle wishLevel sorting (now that default is 1, no special null handling needed)
    if (sortBy === 'wishLevel') {
      return [
        {
          wishLevel: sortOrder,
        },
        // Secondary sort by createdAt for consistency
        {
          createdAt: 'desc',
        },
      ];
    }

    // Standard sorting for other fields
    return [
      {
        [sortBy]: sortOrder,
      },
      // Secondary sort by createdAt for consistency
      {
        createdAt: 'desc',
      },
    ];
  }

  /**
   * Validate and sanitize query parameters for security and performance
   */
  private validateQueryParams(params: WishQueryValidatedParams): WishQueryValidatedParams {
    // Ensure reasonable limits for performance
    const limit = Math.min(params.limit || 20, 100);

    // Sanitize price ranges to prevent extreme queries
    const priceMin = params.priceMin !== undefined ? Math.max(0, params.priceMin) : undefined;
    const priceMax =
      params.priceMax !== undefined ? Math.min(999999.99, params.priceMax) : undefined;

    // Ensure price range is valid
    if (priceMin !== undefined && priceMax !== undefined && priceMin > priceMax) {
      throw new ValidationError('priceMin cannot be greater than priceMax', 'priceMin');
    }

    // Ensure wish level range is valid
    if (
      params.wishLevelMin !== undefined &&
      params.wishLevelMax !== undefined &&
      params.wishLevelMin > params.wishLevelMax
    ) {
      throw new ValidationError('wishLevelMin cannot be greater than wishLevelMax', 'wishLevelMin');
    }

    return {
      ...params,
      limit,
      priceMin,
      priceMax,
    };
  }

  /**
   * Monitor query performance and log slow queries
   */
  private async withPerformanceMonitoring<T>(
    operation: string,
    queryFn: () => Promise<T>
  ): Promise<T> {
    const startTime = Date.now();

    try {
      const result = await queryFn();
      const duration = Date.now() - startTime;

      // Log slow queries (> 1 second) for optimization
      if (duration > 1000) {
        logger.warn(
          {
            operation,
            duration,
            durationMs: duration,
          },
          `Slow wish query detected: ${operation} took ${duration}ms`
        );
      }

      return result;
    } catch (error) {
      const duration = Date.now() - startTime;
      logger.error(
        {
          error,
          operation,
          duration,
          durationMs: duration,
        },
        `Wish query failed: ${operation} after ${duration}ms`
      );
      throw error;
    }
  }

  /**
   * Helper method to detect if advanced query parameters are being used
   */
  private hasAdvancedQueryParams(options: Record<string, unknown>): boolean {
    const advancedParams = [
      'sortBy',
      'sortOrder',
      'priceMin',
      'priceMax',
      'wishLevelMin',
      'wishLevelMax',
      'hasPrice',
      'hasWishLevel',
    ];

    return advancedParams.some((param) => options[param] !== undefined);
  }
}

// Export singleton instance
export const wishService = new WishService();
