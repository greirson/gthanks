import crypto from 'crypto';

import { db } from '@/lib/db';
import { ForbiddenError, NotFoundError, ValidationError } from '@/lib/errors';
import { permissionService } from '@/lib/services/permission-service';

import { sendListInvitation } from '../email';
import { logger } from './logger';

export interface ListInvitationDetails {
  id: string;
  listId: string;
  email: string;
  token: string;
  invitedBy: string;
  createdAt: Date;
  expiresAt: Date;
  acceptedAt: Date | null;
  inviter: {
    id: string;
    name: string | null;
    email: string;
  };
  list: {
    id: string;
    name: string;
    description: string | null;
  };
  status: 'pending' | 'accepted' | 'expired';
}

export class ListInvitationService {
  private db: typeof db;

  constructor(database?: typeof db) {
    this.db = database || db;
  }

  /**
   * Create invitation for list co-manager
   * If user already exists, add them directly as co-manager
   */
  async createInvitation(
    listId: string,
    email: string,
    invitedBy: string
  ): Promise<{ directlyAdded: boolean }> {
    // Check permissions - only list owners can invite co-managers
    await permissionService.require(invitedBy, 'admin', { type: 'list', id: listId });

    // Verify inviter exists
    const inviter = await this.db.user.findUnique({
      where: { id: invitedBy },
    });
    if (!inviter) {
      throw new NotFoundError('Inviter user not found');
    }

    // Verify list exists
    const list = await this.db.list.findUnique({
      where: { id: listId },
    });
    if (!list) {
      throw new NotFoundError('List not found');
    }

    // Check if user already exists
    const existingUser = await this.db.user.findUnique({
      where: { email },
    });

    if (existingUser) {
      // Check if already a co-manager
      const existingAdmin = await this.db.listAdmin.findUnique({
        where: {
          listId_userId: {
            listId,
            userId: existingUser.id,
          },
        },
      });

      if (existingAdmin) {
        throw new ValidationError('User is already a co-manager of this list');
      }

      // Add directly as co-manager
      await this.db.listAdmin.create({
        data: {
          listId,
          userId: existingUser.id,
          addedBy: invitedBy,
        },
      });

      return { directlyAdded: true };
    }

    // Check for existing pending invitation
    const existingInvitation = await this.db.listInvitation.findUnique({
      where: {
        listId_email: {
          listId,
          email,
        },
      },
    });

    if (existingInvitation && !existingInvitation.acceptedAt) {
      // Update existing invitation with new expiry
      const expiresAt = new Date();
      expiresAt.setDate(expiresAt.getDate() + 7);

      await this.db.listInvitation.update({
        where: { id: existingInvitation.id },
        data: {
          expiresAt,
          invitedBy, // Update inviter if different
        },
      });

      // Resend invitation email
      try {
        const baseUrl = process.env.NEXTAUTH_URL || 'http://localhost:3000';
        const acceptUrl = `${baseUrl}/invitations/list/${existingInvitation.token}`;

        // Check if user exists to determine email template
        const existingUser = await this.db.user.findUnique({
          where: { email },
        });

        await sendListInvitation(email, {
          inviterName: inviter.name || inviter.email,
          listName: list.name,
          listDescription: list.description || undefined,
          acceptUrl,
          isExistingUser: !!existingUser,
        });
      } catch (error) {
        logger.error({ error, email, listId }, 'Error sending list invitation email');
      }

      return { directlyAdded: false };
    }

    // Create new invitation
    const token = crypto.randomBytes(32).toString('base64url');
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + 7);

    await this.db.listInvitation.create({
      data: {
        listId,
        email,
        token,
        invitedBy,
        expiresAt,
      },
    });

    // Send invitation email
    try {
      const baseUrl = process.env.NEXTAUTH_URL || 'http://localhost:3000';
      const acceptUrl = `${baseUrl}/invitations/list/${token}`;

      await sendListInvitation(email, {
        inviterName: inviter.name || inviter.email,
        listName: list.name,
        listDescription: list.description || undefined,
        acceptUrl,
        isExistingUser: false, // New invitation is always for non-existing users
      });
    } catch (error) {
      logger.error({ error, email, listId }, 'Error sending list invitation email');
    }

    return { directlyAdded: false };
  }

  /**
   * Validate invitation token
   */
  async validateInvitation(token: string): Promise<ListInvitationDetails | null> {
    const invitation = await this.db.listInvitation.findUnique({
      where: { token },
      include: {
        inviter: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
        list: {
          select: {
            id: true,
            name: true,
            description: true,
          },
        },
      },
    });

    if (!invitation) {
      return null;
    }

    const now = new Date();
    const status = invitation.acceptedAt
      ? ('accepted' as const)
      : invitation.expiresAt < now
        ? ('expired' as const)
        : ('pending' as const);

    return {
      ...invitation,
      status,
    };
  }

  /**
   * Accept invitation and add user as co-manager
   */
  async acceptInvitation(
    token: string,
    userId: string
  ): Promise<{ listId: string; listName: string }> {
    const user = await this.db.user.findUnique({
      where: { id: userId },
    });

    if (!user) {
      throw new NotFoundError('User not found');
    }

    const invitation = await this.db.listInvitation.findUnique({
      where: { token },
      include: {
        list: true,
      },
    });

    if (!invitation) {
      throw new NotFoundError('Invitation not found');
    }

    if (invitation.email !== user.email) {
      throw new ForbiddenError('This invitation is not for your email address');
    }

    if (invitation.acceptedAt) {
      throw new ValidationError('This invitation has already been accepted');
    }

    const now = new Date();
    if (invitation.expiresAt < now) {
      throw new ValidationError('This invitation has expired');
    }

    // Check if already a co-manager (edge case)
    const existingAdmin = await this.db.listAdmin.findUnique({
      where: {
        listId_userId: {
          listId: invitation.listId,
          userId,
        },
      },
    });

    if (existingAdmin) {
      // Mark invitation as accepted anyway
      await this.db.listInvitation.update({
        where: { id: invitation.id },
        data: { acceptedAt: now },
      });
      return { listId: invitation.listId, listName: invitation.list.name };
    }

    // Accept invitation in transaction
    await this.db.$transaction(async (tx) => {
      // Add user as co-manager
      await tx.listAdmin.create({
        data: {
          listId: invitation.listId,
          userId,
          addedBy: invitation.invitedBy,
        },
      });

      // Mark invitation as accepted
      await tx.listInvitation.update({
        where: { id: invitation.id },
        data: { acceptedAt: now },
      });
    });

    return { listId: invitation.listId, listName: invitation.list.name };
  }

  /**
   * Get invitation by token
   */
  async getInvitationByToken(token: string): Promise<ListInvitationDetails | null> {
    return this.validateInvitation(token);
  }

  /**
   * Get pending invitations for a list
   */
  async getListInvitations(listId: string, userId: string): Promise<ListInvitationDetails[]> {
    // Check permissions - only list owners can view invitations
    await permissionService.require(userId, 'admin', { type: 'list', id: listId });

    const invitations = await this.db.listInvitation.findMany({
      where: {
        listId,
        acceptedAt: null,
      },
      include: {
        inviter: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
        list: {
          select: {
            id: true,
            name: true,
            description: true,
          },
        },
      },
      orderBy: {
        createdAt: 'desc',
      },
    });

    const now = new Date();
    return invitations.map((invitation) => ({
      ...invitation,
      status: invitation.expiresAt < now ? ('expired' as const) : ('pending' as const),
    }));
  }

  /**
   * Cancel invitation
   */
  async cancelInvitation(invitationId: string, userId: string): Promise<void> {
    const invitation = await this.db.listInvitation.findUnique({
      where: { id: invitationId },
    });

    if (!invitation) {
      throw new NotFoundError('Invitation not found');
    }

    // Check permissions - only list owners can cancel invitations
    await permissionService.require(userId, 'admin', { type: 'list', id: invitation.listId });

    await this.db.listInvitation.delete({
      where: { id: invitationId },
    });
  }

  /**
   * Cleanup expired invitations
   * Should be called periodically (e.g., daily cron job)
   */
  async cleanupExpiredInvitations(): Promise<{ deletedCount: number }> {
    const now = new Date();

    const result = await this.db.listInvitation.deleteMany({
      where: {
        expiresAt: {
          lt: now,
        },
        acceptedAt: null,
      },
    });

    if (result.count > 0) {
      logger.info({ deletedCount: result.count }, 'Cleaned up expired list invitations');
    }

    return { deletedCount: result.count };
  }

  /**
   * Get pending invitations for a user by email
   * Used when user signs up to automatically show pending invitations
   */
  async getPendingInvitationsForUser(email: string): Promise<ListInvitationDetails[]> {
    const now = new Date();

    const invitations = await this.db.listInvitation.findMany({
      where: {
        email,
        acceptedAt: null,
        expiresAt: {
          gt: now,
        },
      },
      include: {
        inviter: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
        list: {
          select: {
            id: true,
            name: true,
            description: true,
          },
        },
      },
      orderBy: {
        createdAt: 'desc',
      },
    });

    return invitations.map((invitation) => ({
      ...invitation,
      status: 'pending' as const,
    }));
  }

  /**
   * Remove co-manager from list
   */
  async removeCoManager(listId: string, targetUserId: string, userId: string): Promise<void> {
    // Check permissions - only list owners can remove co-managers
    await permissionService.require(userId, 'admin', { type: 'list', id: listId });

    // Verify list exists
    const list = await this.db.list.findUnique({
      where: { id: listId },
      select: { id: true, name: true, ownerId: true },
    });

    if (!list) {
      throw new NotFoundError('List not found');
    }

    // Prevent owner from removing themselves
    if (targetUserId === userId) {
      throw new ValidationError('Cannot remove yourself from the list');
    }

    // Check if target user is actually a co-manager
    const existingAdmin = await this.db.listAdmin.findUnique({
      where: {
        listId_userId: {
          listId,
          userId: targetUserId,
        },
      },
    });

    if (!existingAdmin) {
      throw new NotFoundError('User is not a co-manager of this list');
    }

    // Remove user as co-manager
    await this.db.listAdmin.delete({
      where: {
        listId_userId: {
          listId,
          userId: targetUserId,
        },
      },
    });
  }

  /**
   * Get all co-managers for a list with details
   */
  async getListCoManagers(
    listId: string,
    userId: string
  ): Promise<
    Array<{
      userId: string;
      user: {
        id: string;
        name: string | null;
        email: string;
        image: string | null;
      };
      addedAt: Date;
      addedBy: {
        id: string;
        name: string | null;
      };
    }>
  > {
    // Check permission to view list (any access allows viewing admins)
    await permissionService.require(userId, 'view', { type: 'list', id: listId });

    // Retrieve all co-managers with user details and metadata
    const admins = await this.db.listAdmin.findMany({
      where: { listId },
      include: {
        user: {
          select: {
            id: true,
            name: true,
            email: true,
            image: true,
          },
        },
      },
      orderBy: { addedAt: 'asc' },
    });

    // Get the addedBy user details for each admin
    const adminUserIds = admins.map((admin) => admin.addedBy);
    const addedByUsers = await this.db.user.findMany({
      where: { id: { in: adminUserIds } },
      select: { id: true, name: true },
    });

    // Create a map for quick lookup
    const addedByUsersMap = new Map(addedByUsers.map((user) => [user.id, user]));

    // Transform the response to match the required format
    return admins.map((admin) => ({
      userId: admin.userId,
      user: admin.user,
      addedAt: admin.addedAt,
      addedBy: addedByUsersMap.get(admin.addedBy) || { id: admin.addedBy, name: null },
    }));
  }
}

// Export singleton instance
export const listInvitationService = new ListInvitationService();
