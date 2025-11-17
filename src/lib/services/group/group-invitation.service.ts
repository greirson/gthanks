import crypto from 'crypto';

import { db } from '@/lib/db';
import { ForbiddenError, NotFoundError, ValidationError } from '@/lib/errors';
import { GroupInvitationDetails } from '@/lib/services/group-types';
import { permissionService } from '@/lib/services/permission-service';
import { GroupInviteInput } from '@/lib/validators/group';

import { createEmailService } from '../../email';
import { logger } from '../logger';

export class GroupInvitationService {
  private db: typeof db;

  constructor(database?: typeof db) {
    this.db = database || db;
  }

  /**
   * Invite users to group
   */
  async inviteUsers(groupId: string, data: GroupInviteInput, userId: string): Promise<{ sent: number; skipped: string[] }> {
    // Check permissions
    await permissionService.require(userId, 'invite', { type: 'group', id: groupId });

    // Verify inviter exists
    const inviter = await this.db.user.findUnique({
      where: { id: userId },
    });
    if (!inviter) {
      throw new NotFoundError('Inviter user not found');
    }

    // Verify group exists
    const group = await this.db.group.findUnique({
      where: { id: groupId },
    });
    if (!group) {
      throw new NotFoundError('Group not found');
    }

    // Check existing members and invitations in bulk
    // Step 1: Find which emails belong to existing users
    const existingUsers = await this.db.user.findMany({
      where: {
        email: {
          in: data.emails,
        },
      },
    });
    const existingUserIds = existingUsers.map((u) => u.id);

    // Step 2: Check which existing users are already members
    const existingMembers = await this.db.userGroup.findMany({
      where: {
        groupId: groupId,
        userId: {
          in: existingUserIds,
        },
      },
      include: {
        user: true,
      },
    });
    const existingMemberEmails = new Set(existingMembers.map((m) => m.user.email));

    const existingInvitations = await this.db.groupInvitation.findMany({
      where: {
        groupId: groupId,
        email: {
          in: data.emails,
        },
        acceptedAt: null,
      },
    });
    const existingInvitationEmails = new Set(existingInvitations.map((i) => i.email));

    const skipped: string[] = [];
    let sent = 0;

    await this.db.$transaction(async (tx) => {
      for (const email of data.emails) {
        if (existingMemberEmails.has(email) || existingInvitationEmails.has(email)) {
          skipped.push(email);
          continue; // Skip already existing members or invited users
        }

        // Create invitation (expires in 7 days)
        const token = crypto.randomBytes(32).toString('hex');
        const expiresAt = new Date();
        expiresAt.setDate(expiresAt.getDate() + 7);

        await tx.groupInvitation.create({
          data: {
            groupId: groupId,
            email,
            token,
            invitedBy: userId,
            expiresAt,
          },
        });

        // Send invitation email
        try {
          const emailService = createEmailService();

          await emailService.send({
            to: email,
            subject: `Invitation to join ${group.name}`,
            html: `<p>You've been invited to join ${group.name} by ${inviter.name || inviter.email}.</p>
                   <p><a href="${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/invitations/accept/${token}">Accept Invitation</a></p>`,
          });

          sent++;
          // Email sent successfully
        } catch (error) {
          // Log error but don't fail the invitation creation
          logger.error({ error, email, groupId: group.id }, 'Error sending invitation email');
        }
      }
    });

    return { sent, skipped };
  }

  /**
   * Accept group invitation
   */
  async acceptInvitation(token: string, userEmail: string): Promise<{ id: string; name: string }> {
    const invitation = await this.db.groupInvitation.findUnique({
      where: { token },
      include: {
        group: true,
      },
    });

    if (!invitation) {
      throw new NotFoundError('Invitation not found or expired');
    }

    if (invitation.email !== userEmail) {
      throw new ForbiddenError('This invitation is not for your email address');
    }

    if (invitation.acceptedAt) {
      throw new ValidationError('This invitation has already been accepted');
    }

    // Find or create user
    const user = await this.db.user.findUnique({
      where: { email: userEmail },
    });

    if (!user) {
      throw new NotFoundError('User account not found. Please create an account first.');
    }

    // Accept invitation
    await this.db.$transaction(async (tx) => {
      // Add user to group
      await tx.userGroup.create({
        data: {
          userId: user.id,
          groupId: invitation.groupId,
          role: 'member',
          invitedBy: invitation.invitedBy,
        },
      });

      // Mark invitation as accepted
      await tx.groupInvitation.update({
        where: { id: invitation.id },
        data: {
          acceptedAt: new Date(),
        },
      });
    });

    return invitation.group;
  }

  /**
   * Get group invitations
   */
  async getGroupInvitations(groupId: string): Promise<GroupInvitationDetails[]> {
    const invitations = await this.db.groupInvitation.findMany({
      where: {
        groupId: groupId,
        acceptedAt: null,
      },
      include: {
        inviter: true,
        group: {
          select: {
            id: true,
            name: true,
            description: true,
          },
        },
      },
    });

    // Map to match the expected type
    return invitations.map((inv) => ({
      ...inv,
      status: 'pending' as const,
    })) as unknown as GroupInvitationDetails[];
  }

  /**
   * Respond to invitation (accept/decline)
   */
  async respondToInvitation(
    invitationId: string,
    action: 'accept' | 'decline',
    userId: string
  ): Promise<{ success: boolean; message: string }> {
    if (action === 'accept') {
      // Get user email for acceptInvitation method
      const user = await this.db.user.findUnique({
        where: { id: userId },
      });

      if (!user) {
        throw new NotFoundError('User not found');
      }

      // Get invitation token
      const invitation = await this.db.groupInvitation.findUnique({
        where: { id: invitationId },
      });

      if (!invitation) {
        throw new NotFoundError('Invitation not found');
      }

      // Get full invitation details to get the token
      const fullInvitation = await this.db.groupInvitation.findUnique({
        where: { token: invitationId },
        include: { group: true },
      });
      if (!fullInvitation) {
        // If not found by ID as token, need to fetch the actual invitation
        const invitations = await this.db.groupInvitation.findMany({
          where: {
            groupId: invitation.groupId,
            acceptedAt: null,
          },
        });
        const targetInvitation = invitations.find((inv) => inv.id === invitationId);

        if (!targetInvitation) {
          throw new NotFoundError('Invitation not found');
        }

        await this.acceptInvitation(targetInvitation.token, user.email);
      }

      return { success: true, message: 'Invitation accepted' };
    } else {
      // Decline invitation - just delete it
      await this.db.groupInvitation.delete({
        where: { id: invitationId },
      });
      return { success: true, message: 'Invitation declined' };
    }
  }

  /**
   * Cancel invitation
   */
  async cancelInvitation(invitationId: string, userId: string): Promise<void> {
    // First, get the invitation to find the group ID
    const invitation = await this.db.groupInvitation.findUnique({
      where: { id: invitationId },
    });

    if (!invitation) {
      throw new NotFoundError('Invitation not found');
    }

    // Check permission to manage invitations
    const permission = await permissionService.can(userId, 'admin', {
      type: 'group',
      id: invitation.groupId,
    });
    if (!permission.allowed) {
      throw new ForbiddenError(
        permission.reason || 'You do not have permission to cancel invitations for this group'
      );
    }

    await this.db.groupInvitation.delete({
      where: { id: invitationId },
    });
  }

  /**
   * Resend invitation email
   */
  async resendInvitationEmail(invitationId: string): Promise<boolean> {
    const invitation = await this.db.groupInvitation.findUnique({
      where: { id: invitationId },
      include: {
        group: true,
        inviter: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
      },
    });

    if (!invitation) {
      throw new NotFoundError('Invitation not found');
    }

    if (invitation.acceptedAt) {
      throw new ValidationError('Cannot resend email for accepted invitations');
    }

    const emailService = createEmailService();

    try {
      await emailService.send({
        to: invitation.email,
        subject: `Reminder: Invitation to join ${invitation.group.name}`,
        html: `
          <p>You've been invited to join ${invitation.group.name} by ${invitation.inviter.name || invitation.inviter.email}.</p>
          <p><a href="${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/invitations/accept/${invitation.token}">Accept Invitation</a></p>
          <p><a href="${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/invitations/decline/${invitation.token}">Decline Invitation</a></p>
        `,
      });
      // Email resent successfully
      logger.info({ invitationId: invitation.id }, 'Resent invitation email');
      return true;
    } catch (error) {
      logger.error({ error, invitationId: invitation.id }, 'Failed to resend invitation email');
      return false;
    }
  }
}
