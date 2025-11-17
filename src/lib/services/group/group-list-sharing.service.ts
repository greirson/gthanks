import { db } from '@/lib/db';
import { ForbiddenError } from '@/lib/errors';
import { ListWithOwner } from '@/lib/services/group-types';
import { permissionService } from '@/lib/services/permission-service';
import { GroupShareListsInput } from '@/lib/validators/group';

export class GroupListSharingService {
  private db: typeof db;

  constructor(database?: typeof db) {
    this.db = database || db;
  }

  /**
   * Share lists with group
   */
  async shareLists(groupId: string, data: GroupShareListsInput, userId: string): Promise<void> {
    // Check group permissions - members can now share their lists
    await permissionService.require(userId, 'share', { type: 'group', id: groupId });

    // Check permissions for all lists in bulk (only owner can share their lists)
    const userLists = await this.db.list.findMany({
      where: {
        id: {
          in: data.listIds,
        },
        ownerId: userId,
      },
    });
    const allowedListIds = new Set(userLists.map((l) => l.id));

    for (const listId of data.listIds) {
      if (!allowedListIds.has(listId)) {
        throw new ForbiddenError(`You do not have permission to share list ${listId}`);
      }
    }

    // Find already shared lists in bulk
    const existingShares = await this.db.listGroup.findMany({
      where: {
        groupId: groupId,
        listId: {
          in: data.listIds,
        },
      },
    });
    const existingSharedListIds = new Set(existingShares.map((s) => s.listId));

    // Create only the new shares
    const listsToShare = data.listIds
      .filter((id) => !existingSharedListIds.has(id))
      .map((listId) => ({
        listId,
        groupId,
        sharedBy: userId,
      }));

    if (listsToShare.length > 0) {
      await this.db.listGroup.createMany({
        data: listsToShare,
      });
    }
  }

  /**
   * Remove lists from group
   */
  async removeLists(groupId: string, listIds: string[], userId: string): Promise<void> {
    // Check group permissions
    await permissionService.require(userId, 'admin', { type: 'group', id: groupId });

    await this.db.listGroup.deleteMany({
      where: {
        groupId: groupId,
        listId: {
          in: listIds,
        },
      },
    });
  }

  /**
   * Remove list from group
   */
  async removeListFromGroup(groupId: string, listId: string, userId: string): Promise<void> {
    // Check permission to manage group lists
    const permission = await permissionService.can(userId, 'admin', { type: 'group', id: groupId });
    if (!permission.allowed) {
      throw new ForbiddenError(
        permission.reason || 'You do not have permission to remove lists from this group'
      );
    }

    await this.db.listGroup.delete({
      where: {
        listId_groupId: {
          listId: listId,
          groupId: groupId,
        },
      },
    });
  }

  /**
   * Get lists shared with group
   */
  async getGroupLists(
    groupId: string,
    options?: { page?: number; limit?: number; search?: string }
  ): Promise<{ lists: ListWithOwner[]; hasMore: boolean }> {
    const page = options?.page || 1;
    const limit = options?.limit || 20;

    const listGroups = await this.db.listGroup.findMany({
      where: {
        groupId: groupId,
        ...(options?.search && {
          list: {
            name: {
              contains: options.search,
            },
          },
        }),
      } as any,
      include: {
        list: {
          include: {
            owner: true,
            _count: {
              select: {
                wishes: true,
                admins: true,
              },
            },
          },
        },
      },
      skip: (page - 1) * limit,
      take: limit + 1,
      orderBy: {
        sharedAt: 'desc',
      },
    });

    const hasMore = listGroups.length > limit;
    if (hasMore) {
      listGroups.pop();
    }

    const lists = listGroups.map((lg) => lg.list as ListWithOwner);

    return {
      lists,
      hasMore,
    };
  }

  /**
   * Search for lists available to share with the group
   */
  async searchAvailableLists(
    groupId: string,
    userId: string,
    searchTerm: string,
    limit: number,
    offset: number
  ): Promise<ListWithOwner[]> {
    // Get lists already shared with the group
    const { lists: sharedLists } = await this.getGroupLists(groupId);
    const sharedListIds = sharedLists.map((list) => list.id);

    // Use the searchListsForGroup method directly
    const result = await this.searchListsForGroup(
      groupId,
      {
        query: searchTerm,
        limit,
        offset,
        excludeListIds: sharedListIds,
      },
      userId
    );

    return result.lists;
  }

  /**
   * Search for lists available to share with a group
   * Excludes lists already shared with the group
   */
  async searchListsForGroup(
    groupId: string,
    options: { query: string; limit?: number; offset?: number; excludeListIds?: string[] },
    userId: string
  ): Promise<{
    lists: ListWithOwner[];
    hasMore: boolean;
    total: number;
  }> {
    const { ValidationError } = await import('@/lib/errors');

    // Check permission - only group admins can search
    await permissionService.require(userId, 'admin', { type: 'group', id: groupId });

    const query = options.query.trim();
    if (!query) {
      throw new ValidationError('Search query is required');
    }

    const limit = Math.min(options.limit || 20, 100);
    const offset = options.offset || 0;

    // Get lists already shared with this group to exclude them
    const sharedLists = await this.db.listGroup.findMany({
      where: { groupId },
      select: { listId: true },
    });
    const sharedListIds = sharedLists.map((lg) => lg.listId);
    const excludeListIds = [...sharedListIds, ...(options.excludeListIds || [])];

    // Build the where clause with proper filtering
    const whereClause = {
      AND: [
        // Search term matching (case-insensitive on name or description)
        {
          OR: [{ name: { contains: query } }, { description: { contains: query } }],
        },
        // Access control: user's own lists, public lists, or lists from groups user belongs to
        {
          OR: [
            { ownerId: userId },
            { visibility: 'public' },
            {
              groups: {
                some: {
                  group: {
                    members: {
                      some: { userId },
                    },
                  },
                },
              },
            },
          ],
        },
        // Exclude already shared lists - filter at database level
        ...(excludeListIds.length > 0
          ? [
              {
                id: {
                  notIn: excludeListIds,
                },
              },
            ]
          : []),
      ],
    };

    // Search for lists accessible to the user
    const lists = await this.db.list.findMany({
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
        _count: {
          select: {
            wishes: true,
            admins: true,
          },
        },
      },
      orderBy: { updatedAt: 'desc' },
      take: limit + 1, // Take one extra to check if there are more
      skip: offset,
    });

    // Check if there are more results
    const hasMore = lists.length > limit;
    const resultLists = hasMore ? lists.slice(0, limit) : lists;

    return {
      lists: resultLists as ListWithOwner[],
      hasMore,
      total: resultLists.length,
    };
  }

  /**
   * Search for lists shared with a group
   */
  async searchGroupLists(
    groupId: string,
    options: { query: string; limit: number; offset: number }
  ): Promise<{
    lists: ListWithOwner[];
    pagination: {
      offset: number;
      limit: number;
      total: number;
      hasMore: boolean;
    };
  }> {
    const { query, limit, offset } = options;

    const [listGroups, total] = await Promise.all([
      this.db.listGroup.findMany({
        where: {
          groupId,
          list: {
            OR: [{ name: { contains: query } }, { description: { contains: query } }],
          },
        },
        include: {
          list: {
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
          },
        },
        orderBy: { sharedAt: 'desc' },
        take: limit,
        skip: offset,
      }),
      this.db.listGroup.count({
        where: {
          groupId,
          list: {
            OR: [{ name: { contains: query } }, { description: { contains: query } }],
          },
        },
      }),
    ]);

    const lists = listGroups.map((lg) => lg.list);
    const hasMore = offset + lists.length < total;

    return {
      lists: lists as ListWithOwner[],
      pagination: {
        offset,
        limit,
        total,
        hasMore,
      },
    };
  }
}
