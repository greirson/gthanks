import { z } from 'zod';

import { db } from '@/lib/db';

// Type for Prisma transaction client
type PrismaTransactionClient = Omit<
  typeof db,
  '$connect' | '$disconnect' | '$on' | '$transaction' | '$use' | '$extends'
>;

// Types for admin operations
export interface AdminStats {
  totalUsers: number;
  totalWishes: number;
  totalLists: number;
  totalGroups: number;
  activeUsers: number;
  recentSignups: number;
  pendingModeration: number;
}

export interface UserSearchFilters {
  search?: string;
  role?: string;
  suspended?: boolean;
  limit?: number;
  offset?: number;
}

// Validation schemas
export const UserUpdateSchema = z.object({
  name: z.string().optional(),
  email: z.string().email().optional(),
  role: z.enum(['user', 'admin', 'suspended']).optional(),
  suspensionReason: z.string().optional(),
});

/**
 * Require admin user (throws if not admin)
 */
export async function requireAdminUser(userId: string): Promise<void> {
  const user = await db.user.findUnique({
    where: { id: userId },
    select: { isAdmin: true, role: true, suspendedAt: true },
  });

  if (!user) {
    throw new Error('User not found');
  }

  if (user.suspendedAt) {
    throw new Error('User account is suspended');
  }

  if (!user.isAdmin || user.role !== 'admin') {
    throw new Error('Admin access required');
  }
}

export class AdminService {
  /**
   * Check if user is admin
   */
  static async isAdmin(userId: string): Promise<boolean> {
    const user = await db.user.findUnique({
      where: { id: userId },
      select: { isAdmin: true, role: true },
    });

    return user?.isAdmin === true && user?.role === 'admin';
  }

  /**
   * Get admin dashboard statistics
   */
  static async getDashboardStats(): Promise<AdminStats> {
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    const [totalUsers, totalWishes, totalLists, totalGroups, recentSignups] = await Promise.all([
      db.user.count(),
      db.wish.count(),
      db.list.count(),
      db.group.count(),
      db.user.count({
        where: {
          createdAt: {
            gte: thirtyDaysAgo,
          },
        },
      }),
    ]);

    // Count active users (logged in within 30 days)
    const activeUsers = await db.user.count({
      where: {
        lastLoginAt: {
          gte: thirtyDaysAgo,
        },
      },
    });

    return {
      totalUsers,
      totalWishes,
      totalLists,
      totalGroups,
      activeUsers,
      recentSignups,
      pendingModeration: 0, // MVP: No moderation queue
    };
  }

  /**
   * Search and filter users
   */
  static async searchUsers(filters: UserSearchFilters) {
    const { search = '', role, suspended, limit = 50, offset = 0 } = filters;

    const where: Record<string, unknown> = {};

    if (search) {
      where.OR = [
        { name: { contains: search, mode: 'insensitive' } },
        { email: { contains: search, mode: 'insensitive' } },
      ];
    }

    if (role) {
      where.role = role;
    }

    if (suspended !== undefined) {
      if (suspended) {
        where.suspendedAt = { not: null };
      } else {
        where.suspendedAt = null;
      }
    }

    const [users, total] = await Promise.all([
      db.user.findMany({
        where,
        select: {
          id: true,
          email: true,
          name: true,
          avatarUrl: true,
          role: true,
          isAdmin: true,
          createdAt: true,
          lastLoginAt: true,
          suspendedAt: true,
          suspensionReason: true,
          username: true,
          usernameSetAt: true,
          canUseVanityUrls: true,
          showPublicProfile: true,
          _count: {
            select: {
              wishes: true,
              lists: true,
              groupsJoined: true,
            },
          },
        },
        orderBy: { createdAt: 'desc' },
        take: limit,
        skip: offset,
      }),
      db.user.count({ where }),
    ]);

    return {
      users,
      total,
      hasMore: offset + limit < total,
    };
  }

  /**
   * Get user details for admin view
   */
  static async getUserDetails(userId: string) {
    const user = await db.user.findUnique({
      where: { id: userId },
      include: {
        wishes: {
          select: {
            id: true,
            title: true,
            createdAt: true,
          },
          orderBy: { createdAt: 'desc' },
          take: 5,
        },
        lists: {
          select: {
            id: true,
            name: true,
            createdAt: true,
            _count: {
              select: {
                wishes: true,
              },
            },
          },
          orderBy: { createdAt: 'desc' },
          take: 5,
        },
        groupsJoined: {
          include: {
            group: {
              select: {
                id: true,
                name: true,
              },
            },
          },
        },
        sessions: {
          select: {
            id: true,
            expires: true,
          },
          orderBy: { expires: 'desc' },
          take: 3,
        },
        accounts: {
          select: {
            id: true,
            provider: true,
            type: true,
          },
        },
        _count: {
          select: {
            wishes: true,
            lists: true,
            groupsJoined: true,
          },
        },
      },
    });

    if (!user) {
      throw new Error('User not found');
    }

    return user;
  }

  /**
   * Update user (admin action)
   */
  static async updateUser(
    userId: string,
    adminId: string,
    data: z.infer<typeof UserUpdateSchema>,
    tx?: PrismaTransactionClient
  ) {
    const validatedData = UserUpdateSchema.parse(data);
    const prismaClient = tx || db;

    // Get current user data for audit log
    const currentUser = await prismaClient.user.findUnique({
      where: { id: userId },
      select: {
        email: true,
        name: true,
        role: true,
        suspendedAt: true,
        suspensionReason: true,
      },
    });

    if (!currentUser) {
      throw new Error('User not found');
    }

    // Prepare update data
    const updateData: Record<string, unknown> = {
      ...validatedData,
    };

    // Handle suspension logic
    if (validatedData.role === 'suspended') {
      updateData.suspendedAt = new Date();
      updateData.suspensionReason = validatedData.suspensionReason || 'Suspended by admin';
      updateData.isAdmin = false;
    } else if (currentUser.suspendedAt && validatedData.role) {
      // Clear suspension when role is changed to user or admin
      updateData.suspendedAt = null;
      updateData.suspensionReason = null;
    }

    // Set admin flag based on role
    if (validatedData.role) {
      updateData.isAdmin = validatedData.role === 'admin';
    }

    // Update user and create audit log
    const updatedUser = await prismaClient.user.update({
      where: { id: userId },
      data: updateData,
    });

    // Log the update (synchronous in MVP) - only if not in transaction
    if (!tx) {
      this.createAuditLog(adminId, 'UPDATE', 'USER', userId, currentUser, validatedData);
    }

    return updatedUser;
  }

  /**
   * Suspend user
   */
  static async suspendUser(
    userId: string,
    adminId: string,
    reason: string,
    tx?: PrismaTransactionClient
  ) {
    return this.updateUser(
      userId,
      adminId,
      {
        role: 'suspended',
        suspensionReason: reason,
      },
      tx
    );
  }

  /**
   * Unsuspend user
   */
  static async unsuspendUser(userId: string, adminId: string, tx?: PrismaTransactionClient) {
    return this.updateUser(
      userId,
      adminId,
      {
        role: 'user',
      },
      tx
    );
  }

  /**
   * Create audit log entry
   */
  static createAuditLog(
    _userId: string | null,
    _action: string,
    _entityType: string,
    _entityId: string | null,
    _oldValues?: Record<string, unknown>,
    _newValues?: Record<string, unknown>,
    _metadata?: Record<string, unknown>,
    _ipAddress?: string,
    _userAgent?: string
  ) {
    // MVP: Audit logging removed, return minimal response
    return {
      id: 'mock-audit-log',
      userId: _userId,
      action: _action,
      entityType: _entityType,
      entityId: _entityId,
      oldValues: null,
      newValues: null,
      metadata: null,
      ipAddress: _ipAddress || null,
      userAgent: _userAgent || null,
      createdAt: new Date(),
    };
  }
}
