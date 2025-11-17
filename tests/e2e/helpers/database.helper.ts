/**
 * Database helpers for Playwright E2E tests
 * Provides utilities for seeding test data and database cleanup
 */

import { db } from '@/lib/db';
import { createId } from '@paralleldrive/cuid2';

/**
 * Alias for backward compatibility with existing code
 * @deprecated Use createWish instead
 */
export async function createTestWish(
  userId: string,
  data: {
    title: string;
    notes?: string;
    url?: string;
    price?: number;
    wishLevel?: number;
  }
) {
  const wish = await db.wish.create({
    data: {
      id: createId(),
      title: data.title,
      notes: data.notes,
      url: data.url,
      price: data.price,
      wishLevel: data.wishLevel || 2,
      ownerId: userId,
    },
  });

  return wish;
}

/**
 * Create a test wish for a user
 * Preferred function name for consistency
 */
export async function createWish(
  userId: string,
  data: {
    title: string;
    notes?: string;
    url?: string;
    price?: number;
    currency?: string;
    wishLevel?: number;
    quantity?: number;
    size?: string;
    color?: string;
  }
) {
  const wish = await db.wish.create({
    data: {
      id: createId(),
      title: data.title,
      notes: data.notes,
      url: data.url,
      price: data.price,
      currency: data.currency || 'USD',
      wishLevel: data.wishLevel || 1,
      quantity: data.quantity || 1,
      size: data.size,
      color: data.color,
      ownerId: userId,
    },
  });

  return wish;
}

/**
 * Alias for backward compatibility with existing code
 * @deprecated Use createList instead
 */
export async function createTestList(
  userId: string,
  data: {
    name: string;
    description?: string;
    visibility?: string;
  }
) {
  const list = await db.list.create({
    data: {
      id: createId(),
      name: data.name,
      description: data.description,
      visibility: data.visibility || 'private',
      ownerId: userId,
    },
  });

  return list;
}

/**
 * Create a test list for a user
 * Preferred function name for consistency
 */
export async function createList(
  userId: string,
  data: {
    name: string;
    description?: string;
    visibility?: string;
  }
) {
  const list = await db.list.create({
    data: {
      id: createId(),
      name: data.name,
      description: data.description,
      visibility: data.visibility || 'private',
      ownerId: userId,
    },
  });

  return list;
}

/**
 * Add a wish to a list
 */
export async function addWishToList(wishId: string, listId: string, wishLevel?: number) {
  const listWish = await db.listWish.create({
    data: {
      wishId,
      listId,
      wishLevel: wishLevel || 1,
    },
  });

  return listWish;
}

/**
 * Alias for backward compatibility with existing code
 * @deprecated Use createGroup instead
 */
export async function createTestGroup(data: { name: string; description?: string }) {
  const group = await db.group.create({
    data: {
      id: createId(),
      name: data.name,
      description: data.description,
      visibility: 'private',
    },
  });

  return group;
}

/**
 * Create a test group
 * Preferred function name for consistency
 */
export async function createGroup(
  userId: string,
  data: { name: string; description?: string; avatarUrl?: string }
) {
  const group = await db.group.create({
    data: {
      id: createId(),
      name: data.name,
      description: data.description,
      avatarUrl: data.avatarUrl,
      visibility: 'private',
    },
  });

  // Add the creator as admin
  await db.userGroup.create({
    data: {
      userId,
      groupId: group.id,
      role: 'admin',
    },
  });

  return group;
}

/**
 * Add a user to a group
 */
export async function addUserToGroup(
  userId: string,
  groupId: string,
  role: 'admin' | 'member' = 'member'
) {
  const userGroup = await db.userGroup.create({
    data: {
      userId,
      groupId,
      role,
    },
  });

  return userGroup;
}

/**
 * Share a list with a group
 */
export async function shareListWithGroup(listId: string, groupId: string, sharedBy: string) {
  const listGroup = await db.listGroup.create({
    data: {
      listId,
      groupId,
      sharedBy,
    },
  });

  return listGroup;
}

/**
 * Create a complete test scenario with users, list, group, and wishes
 */
export async function createCompleteTestScenario() {
  const timestamp = Date.now();
  const random = Math.random().toString(36).substring(7);

  // Create users
  const owner = await db.user.create({
    data: {
      id: createId(),
      email: `owner-${timestamp}-${random}@test.com`,
      name: 'List Owner',
      emailVerified: new Date(),
      isOnboardingComplete: true,
    },
  });

  const reserver = await db.user.create({
    data: {
      id: createId(),
      email: `reserver-${timestamp}-${random}@test.com`,
      name: 'Gift Reserver',
      emailVerified: new Date(),
      isOnboardingComplete: true,
    },
  });

  const otherUser = await db.user.create({
    data: {
      id: createId(),
      email: `other-${timestamp}-${random}@test.com`,
      name: 'Other User',
      emailVerified: new Date(),
      isOnboardingComplete: true,
    },
  });

  // Create UserEmail records
  await Promise.all([
    db.userEmail.create({
      data: {
        userId: owner.id,
        email: owner.email,
        isPrimary: true,
        isVerified: true,
        verifiedAt: new Date(),
      },
    }),
    db.userEmail.create({
      data: {
        userId: reserver.id,
        email: reserver.email,
        isPrimary: true,
        isVerified: true,
        verifiedAt: new Date(),
      },
    }),
    db.userEmail.create({
      data: {
        userId: otherUser.id,
        email: otherUser.email,
        isPrimary: true,
        isVerified: true,
        verifiedAt: new Date(),
      },
    }),
  ]);

  // Create group
  const group = await createTestGroup({
    name: 'Test Family Group',
    description: 'Family group for testing',
  });

  // Add all users to group
  await addUserToGroup(owner.id, group.id, 'admin');
  await addUserToGroup(reserver.id, group.id, 'member');
  await addUserToGroup(otherUser.id, group.id, 'member');

  // Create list
  const list = await createTestList(owner.id, {
    name: 'Birthday Wishlist',
    description: 'My birthday wishes',
    visibility: 'private',
  });

  // Share list with group
  await shareListWithGroup(list.id, group.id, owner.id);

  // Create wishes
  const wish1 = await createTestWish(owner.id, {
    title: 'Wireless Headphones',
    notes: 'Noise-cancelling headphones for work',
    url: 'https://example.com/headphones',
    price: 199.99,
    wishLevel: 3,
  });

  const wish2 = await createTestWish(owner.id, {
    title: 'Programming Book',
    notes: 'Clean Code by Robert Martin',
    url: 'https://example.com/book',
    price: 39.99,
    wishLevel: 2,
  });

  // Add wishes to list
  await addWishToList(wish1.id, list.id);
  await addWishToList(wish2.id, list.id);

  return {
    owner,
    reserver,
    otherUser,
    group,
    list,
    wishes: [wish1, wish2],
  };
}

/**
 * Clean up a specific reservation
 */
export async function cleanupReservation(wishId: string) {
  await db.reservation.deleteMany({
    where: { wishId },
  });
}

/**
 * Get reservation by wish ID
 */
export async function getReservationByWishId(wishId: string) {
  return await db.reservation.findFirst({
    where: { wishId },
  });
}

/**
 * Count reservations for a wish
 */
export async function countReservationsForWish(wishId: string) {
  return await db.reservation.count({
    where: { wishId },
  });
}

/**
 * Seed comprehensive test data including users, wishes, lists, and groups
 * Returns all created entities for use in tests
 *
 * @returns Object containing all seeded test data
 */
export async function seedTestData() {
  return await createCompleteTestScenario();
}

/**
 * Clean up all test data from the database
 * Removes ALL records - use only in test environments
 *
 * WARNING: This will delete ALL data in the database!
 */
export async function cleanupTestData(userIds?: string[]): Promise<void> {
  if (userIds && userIds.length > 0) {
    // Delete specific users and their data
    await db.reservation.deleteMany({
      where: {
        wish: {
          ownerId: { in: userIds },
        },
      },
    });

    await db.listWish.deleteMany({
      where: {
        list: {
          ownerId: { in: userIds },
        },
      },
    });

    await db.listAdmin.deleteMany({
      where: {
        userId: { in: userIds },
      },
    });

    await db.listInvitation.deleteMany({
      where: {
        invitedBy: { in: userIds },
      },
    });

    await db.listGroup.deleteMany({
      where: {
        list: {
          ownerId: { in: userIds },
        },
      },
    });

    await db.userGroup.deleteMany({
      where: {
        userId: { in: userIds },
      },
    });

    await db.groupInvitation.deleteMany({
      where: {
        invitedBy: { in: userIds },
      },
    });

    await db.wish.deleteMany({
      where: {
        ownerId: { in: userIds },
      },
    });

    await db.list.deleteMany({
      where: {
        ownerId: { in: userIds },
      },
    });

    await db.session.deleteMany({
      where: {
        userId: { in: userIds },
      },
    });

    await db.account.deleteMany({
      where: {
        userId: { in: userIds },
      },
    });

    await db.userPreference.deleteMany({
      where: {
        userId: { in: userIds },
      },
    });

    await db.userEmail.deleteMany({
      where: {
        userId: { in: userIds },
      },
    });

    await db.user.deleteMany({
      where: {
        id: { in: userIds },
      },
    });
  } else {
    // Delete ALL data (use with caution!)
    await db.reservation.deleteMany({});
    await db.listWish.deleteMany({});
    await db.listAdmin.deleteMany({});
    await db.listInvitation.deleteMany({});
    await db.listGroup.deleteMany({});
    await db.userGroup.deleteMany({});
    await db.groupInvitation.deleteMany({});
    await db.wish.deleteMany({});
    await db.list.deleteMany({});
    await db.group.deleteMany({});
    await db.session.deleteMany({});
    await db.account.deleteMany({});
    await db.verificationToken.deleteMany({});
    await db.magicLink.deleteMany({});
    await db.userPreference.deleteMany({});
    await db.userEmail.deleteMany({});
    await db.user.deleteMany({});
  }
}

/**
 * Full database reset
 * Combines cleanup and optionally seeds fresh data
 *
 * @param seedAfter - If true, seeds fresh test data after cleanup
 * @returns Seeded data if seedAfter is true, undefined otherwise
 */
export async function resetDatabase(seedAfter: boolean = false) {
  await cleanupTestData();

  if (seedAfter) {
    return await seedTestData();
  }
}

/**
 * Create a reservation for a wish
 *
 * @param wishId - ID of the wish to reserve
 * @param reserverEmail - Email of the person reserving (optional)
 * @param reserverName - Name of the person reserving (optional)
 * @returns The created reservation
 */
export async function createReservation(
  wishId: string,
  reserverEmail?: string,
  reserverName?: string
) {
  return await db.reservation.create({
    data: {
      id: createId(),
      wishId,
      reserverEmail,
      reserverName,
      accessToken: reserverEmail ? undefined : createId(),
    },
  });
}

/**
 * Get all wishes for a user
 *
 * @param userId - ID of the user
 * @returns Array of wishes owned by the user
 */
export async function getUserWishes(userId: string) {
  return await db.wish.findMany({
    where: { ownerId: userId },
    orderBy: { createdAt: 'desc' },
  });
}

/**
 * Get all lists for a user
 *
 * @param userId - ID of the user
 * @returns Array of lists owned by the user
 */
export async function getUserLists(userId: string) {
  return await db.list.findMany({
    where: { ownerId: userId },
    orderBy: { createdAt: 'desc' },
  });
}

/**
 * Get all groups a user belongs to
 *
 * @param userId - ID of the user
 * @returns Array of groups the user is a member of
 */
export async function getUserGroups(userId: string) {
  return await db.userGroup.findMany({
    where: { userId },
    include: {
      group: true,
    },
    orderBy: { joinedAt: 'desc' },
  });
}

/**
 * Count total records in database (useful for debugging)
 *
 * @returns Object with counts of all major entities
 */
export async function getDatabaseCounts() {
  const [users, wishes, lists, groups, reservations, sessions] = await Promise.all([
    db.user.count(),
    db.wish.count(),
    db.list.count(),
    db.group.count(),
    db.reservation.count(),
    db.session.count(),
  ]);

  return {
    users,
    wishes,
    lists,
    groups,
    reservations,
    sessions,
  };
}

/**
 * Create a group invitation
 *
 * @param data - Invitation data (groupId, email, invitedBy)
 * @returns The created invitation with token
 */
export async function createGroupInvitation(data: {
  groupId: string;
  email: string;
  invitedBy: string;
}) {
  const token = createId();
  const expiresAt = new Date();
  expiresAt.setDate(expiresAt.getDate() + 7); // 7 days

  const invitation = await db.groupInvitation.create({
    data: {
      id: createId(),
      groupId: data.groupId,
      email: data.email,
      token,
      invitedBy: data.invitedBy,
      expiresAt,
    },
  });

  return invitation;
}

/**
 * Get pending invitations for an email address
 *
 * @param email - Email address to check
 * @returns Array of pending invitations
 */
export async function getPendingInvitations(email: string) {
  return await db.groupInvitation.findMany({
    where: {
      email,
      acceptedAt: null,
      expiresAt: {
        gt: new Date(),
      },
    },
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
}

/**
 * Check if a user is a member of a group
 *
 * @param userId - User ID
 * @param groupId - Group ID
 * @returns True if user is a member
 */
export async function isGroupMember(userId: string, groupId: string): Promise<boolean> {
  const membership = await db.userGroup.findUnique({
    where: {
      userId_groupId: {
        userId,
        groupId,
      },
    },
  });

  return !!membership;
}

/**
 * Get group by ID with members and lists
 *
 * @param groupId - Group ID
 * @returns Group with members and shared lists
 */
export async function getGroup(groupId: string) {
  return await db.group.findUnique({
    where: { id: groupId },
    include: {
      members: {
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
      },
      lists: {
        include: {
          list: {
            include: {
              wishes: {
                include: {
                  wish: true,
                },
              },
            },
          },
        },
      },
    },
  });
}

/**
 * Get list by ID with wishes
 *
 * @param listId - List ID
 * @returns List with wishes
 */
export async function getList(listId: string) {
  return await db.list.findUnique({
    where: { id: listId },
    include: {
      wishes: {
        include: {
          wish: {
            include: {
              reservations: true,
            },
          },
        },
      },
      owner: {
        select: {
          id: true,
          name: true,
          email: true,
        },
      },
    },
  });
}
