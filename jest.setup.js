// Optional: configure or set up a testing framework before each test.
// If you delete this file, remove `setupFilesAfterEnv` from `jest.config.js`
// Used for __tests__/testing-library.js
// Learn more: https://github.com/testing-library/jest-dom
import '@testing-library/jest-dom';

// Set test environment variables
process.env.NEXTAUTH_SECRET = process.env.NEXTAUTH_SECRET || 'test-secret-for-jest-tests-32chars';
// Add TextEncoder/TextDecoder polyfills for jose browser version
import { TextDecoder, TextEncoder } from 'util';

global.TextEncoder = TextEncoder;
global.TextDecoder = TextDecoder;

// Mock @prisma/client Prisma namespace FIRST (before any Prisma usage)
// This ensures instanceof checks work correctly in service layer
class PrismaClientKnownRequestError extends Error {
  constructor(message, { code, clientVersion, meta }) {
    super(message);
    this.name = 'PrismaClientKnownRequestError';
    this.code = code;
    this.clientVersion = clientVersion || '5.22.0';
    this.meta = meta || {};
  }
}

jest.mock('@prisma/client', () => {
  const actual = jest.requireActual('@prisma/client');
  return {
    ...actual,
    Prisma: {
      ...actual.Prisma,
      PrismaClientKnownRequestError,
    },
  };
});

// Add setImmediate polyfill for Node.js compatibility
if (typeof global.setImmediate === 'undefined') {
  global.setImmediate = (callback, ...args) => {
    return setTimeout(() => callback(...args), 0);
  };
}

// Mock Prisma client early to prevent browser environment errors in tests
// Create a simple in-memory store for tests
const mockDataStore = {
  users: new Map(),
  groups: new Map(),
  userGroups: new Map(),
  lists: new Map(),
  listGroups: new Map(),
  listAdmins: new Map(),
  groupInvitations: new Map(),
  wishes: new Map(),
  reservations: new Map(),
  auditLogs: new Map(),
  apiKeys: new Map(),
  accounts: new Map(),
  systemConfiguration: new Map(),
  emailTemplates: new Map(),
  emailLogs: new Map(),
  deadLetterEmails: new Map(),
  personalAccessTokens: new Map(),
};

const mockDb = {
  user: {
    findUnique: jest.fn().mockImplementation((args) => {
      let user = null;
      if (args.where.id) {
        user = mockDataStore.users.get(args.where.id);
      } else if (args.where.email) {
        user = Array.from(mockDataStore.users.values()).find((u) => u.email === args.where.email);
      }

      if (!user) {
        return Promise.resolve(null);
      }

      // Handle select clause
      if (args.select) {
        const selectedUser = {};
        Object.keys(args.select).forEach((key) => {
          if (args.select[key] && user[key] !== undefined) {
            selectedUser[key] = user[key];
          }
        });
        return Promise.resolve(selectedUser);
      }

      return Promise.resolve(user);
    }),
    findMany: jest.fn().mockImplementation((args) => {
      let users = Array.from(mockDataStore.users.values());

      // Apply ordering
      if (args?.orderBy) {
        if (args.orderBy.createdAt) {
          users.sort((a, b) => {
            const aTime = new Date(a.createdAt).getTime();
            const bTime = new Date(b.createdAt).getTime();
            return args.orderBy.createdAt === 'asc' ? aTime - bTime : bTime - aTime;
          });
        }
      }

      return Promise.resolve(users);
    }),
    create: jest.fn().mockImplementation((data) => {
      const id =
        data.data.id || `user-${Date.now()}-${Math.random().toString(36).substring(2, 11)}`;
      const user = {
        id,
        email: data.data.email || 'test@example.com',
        name: data.data.name !== undefined ? data.data.name : 'Test User',
        emailVerified: data.data.emailVerified !== undefined ? data.data.emailVerified : null,
        image: data.data.image !== undefined ? data.data.image : null,
        avatarUrl: data.data.avatarUrl !== undefined ? data.data.avatarUrl : null,
        role: data.data.role || 'user',
        isAdmin: data.data.isAdmin || false,
        username: data.data.username !== undefined ? data.data.username : null,
        usernameSetAt: data.data.usernameSetAt !== undefined ? data.data.usernameSetAt : null,
        canUseVanityUrls:
          data.data.canUseVanityUrls !== undefined ? data.data.canUseVanityUrls : true,
        suspendedAt: data.data.suspendedAt !== undefined ? data.data.suspendedAt : null,
        createdAt: new Date(),
        updatedAt: new Date(),
      };
      mockDataStore.users.set(id, user);
      return Promise.resolve(user);
    }),
    update: jest.fn().mockImplementation((args) => {
      const existing = mockDataStore.users.get(args.where.id);
      if (!existing) return Promise.resolve(null);

      // Check for unique username constraint
      if (args.data.username !== undefined && args.data.username !== null) {
        const duplicateUsername = Array.from(mockDataStore.users.values()).find(
          (u) =>
            u.id !== args.where.id && u.username?.toLowerCase() === args.data.username.toLowerCase()
        );
        if (duplicateUsername) {
          // Create a proper Prisma unique constraint error using the mocked class
          const error = new PrismaClientKnownRequestError(
            'Unique constraint failed on the fields: (`username`)',
            {
              code: 'P2002',
              clientVersion: '5.22.0',
              meta: { target: ['username'] },
            }
          );
          return Promise.reject(error);
        }
      }

      const updated = {
        ...existing,
        ...args.data,
        updatedAt: new Date(),
      };
      mockDataStore.users.set(args.where.id, updated);
      return Promise.resolve(updated);
    }),
    delete: jest.fn().mockImplementation((args) => {
      const deleted = mockDataStore.users.get(args.where.id);
      mockDataStore.users.delete(args.where.id);
      return Promise.resolve(deleted || {});
    }),
    deleteMany: jest.fn().mockImplementation((args) => {
      let count = 0;
      if (!args?.where) {
        count = mockDataStore.users.size;
        mockDataStore.users.clear();
      } else {
        const toDelete = [];
        for (const [key, user] of mockDataStore.users.entries()) {
          let shouldDelete = true;

          if (args.where.id) {
            shouldDelete = shouldDelete && user.id === args.where.id;
          }

          if (args.where.email?.startsWith) {
            shouldDelete = shouldDelete && user.email.startsWith(args.where.email.startsWith);
          }

          if (shouldDelete) {
            toDelete.push(key);
          }
        }
        toDelete.forEach((key) => mockDataStore.users.delete(key));
        count = toDelete.length;
      }
      return Promise.resolve({ count });
    }),
    count: jest.fn().mockImplementation((args) => {
      if (!args?.where) {
        return Promise.resolve(mockDataStore.users.size);
      }

      let count = 0;
      for (const user of mockDataStore.users.values()) {
        let matches = true;

        if (args.where.OR) {
          // Handle OR conditions (e.g., isAdmin: true OR role: 'admin')
          const orMatch = args.where.OR.some((condition) => {
            if (condition.isAdmin !== undefined) {
              return user.isAdmin === condition.isAdmin;
            }
            if (condition.role !== undefined) {
              return user.role === condition.role;
            }
            return false;
          });
          matches = matches && orMatch;
        }

        if (args.where.isAdmin !== undefined) {
          matches = matches && user.isAdmin === args.where.isAdmin;
        }

        if (args.where.role !== undefined) {
          matches = matches && user.role === args.where.role;
        }

        if (matches) {
          count++;
        }
      }

      return Promise.resolve(count);
    }),
  },
  group: {
    findMany: jest.fn().mockImplementation((args) => {
      let groups = Array.from(mockDataStore.groups.values());
      if (args?.where) {
        // Simple filtering - can be extended as needed
        if (args.where.id) {
          groups = groups.filter((g) => g.id === args.where.id);
        }
      }
      return Promise.resolve(groups);
    }),
    create: jest.fn().mockImplementation((data) => {
      const id = `group-${Date.now()}-${Math.random().toString(36).substring(2, 11)}`;
      const group = {
        id,
        name: data.data.name,
        description: data.data.description,
        visibility: data.data.visibility || 'private',
        avatarUrl: data.data.avatarUrl,
        createdAt: new Date(),
        updatedAt: new Date(),
        _count: {
          members: 1,
          lists: 0,
        },
      };
      mockDataStore.groups.set(id, group);
      return Promise.resolve(group);
    }),
    findUnique: jest.fn().mockImplementation((args) => {
      const group = mockDataStore.groups.get(args.where.id);
      if (!group) return Promise.resolve(null);

      // Handle includes
      if (args.include) {
        const result = { ...group };

        // Include members
        if (args.include.members) {
          const groupMembers = Array.from(mockDataStore.userGroups.values()).filter(
            (ug) => ug.groupId === group.id
          );

          result.members = groupMembers.map((membership) => {
            const memberData = { ...membership };

            // Include user data if requested
            if (args.include.members.include?.user) {
              const user = mockDataStore.users.get(membership.userId);
              if (user) {
                memberData.user = {
                  id: user.id,
                  name: user.name,
                  email: user.email,
                  avatarUrl: user.avatarUrl,
                };
              }
            }
            return memberData;
          });
        }

        // Include lists (empty for now)
        if (args.include.lists) {
          result.lists = [];
        }

        // Include invitations (empty for now)
        if (args.include.invitations) {
          result.invitations = [];
        }

        // Include _count
        if (args.include._count) {
          result._count = {
            members: result.members?.length || 0,
            lists: 0,
          };
        }

        return Promise.resolve(result);
      }

      return Promise.resolve(group);
    }),
    update: jest.fn().mockImplementation((args) => {
      const existing = mockDataStore.groups.get(args.where.id);
      if (!existing) return Promise.resolve(null);
      const updated = {
        ...existing,
        ...args.data,
        updatedAt: new Date(),
      };
      mockDataStore.groups.set(args.where.id, updated);
      return Promise.resolve(updated);
    }),
    delete: jest.fn().mockImplementation((args) => {
      const deleted = mockDataStore.groups.get(args.where.id);
      mockDataStore.groups.delete(args.where.id);
      return Promise.resolve(deleted || {});
    }),
    count: jest.fn().mockResolvedValue(0),
    deleteMany: jest.fn().mockImplementation((args) => {
      let count = 0;
      if (!args?.where) {
        count = mockDataStore.groups.size;
        mockDataStore.groups.clear();
      } else {
        const toDelete = [];
        for (const [key, group] of mockDataStore.groups.entries()) {
          if (args.where.id && group.id === args.where.id) {
            toDelete.push(key);
          }
        }
        toDelete.forEach((key) => mockDataStore.groups.delete(key));
        count = toDelete.length;
      }
      return Promise.resolve({ count });
    }),
  },
  userGroup: {
    create: jest.fn().mockImplementation((data) => {
      const key = `${data.data.userId}_${data.data.groupId}`;
      const userGroup = {
        userId: data.data.userId,
        groupId: data.data.groupId,
        role: data.data.role,
        joinedAt: new Date(),
      };
      mockDataStore.userGroups.set(key, userGroup);
      return Promise.resolve(userGroup);
    }),
    findMany: jest.fn().mockImplementation((args) => {
      let userGroups = Array.from(mockDataStore.userGroups.values());
      if (args?.where) {
        if (args.where.groupId) {
          userGroups = userGroups.filter((ug) => ug.groupId === args.where.groupId);
        }
        if (args.where.userId) {
          userGroups = userGroups.filter((ug) => ug.userId === args.where.userId);
        }
        // Handle complex user email filter
        if (args.where.user?.email?.in) {
          const emailsToFind = args.where.user.email.in;
          userGroups = userGroups.filter((ug) => {
            const user = mockDataStore.users.get(ug.userId);
            return user && emailsToFind.includes(user.email);
          });
        }
      }

      // Handle select clause for nested user data
      if (args?.select?.user) {
        userGroups = userGroups.map((ug) => {
          const user = mockDataStore.users.get(ug.userId);
          if (!user) return ug;

          // Build selected user object
          const selectedUser = {};
          if (args.select.user.select) {
            Object.keys(args.select.user.select).forEach((key) => {
              if (args.select.user.select[key] && user[key] !== undefined) {
                selectedUser[key] = user[key];
              }
            });
          } else {
            // If no nested select, include full user
            Object.assign(selectedUser, user);
          }

          return {
            ...ug,
            user: selectedUser,
          };
        });
      }

      // Handle include for user details
      if (args?.include?.user) {
        userGroups = userGroups.map((ug) => ({
          ...ug,
          user: mockDataStore.users.get(ug.userId) || null,
        }));
      }

      return Promise.resolve(userGroups);
    }),
    findUnique: jest.fn().mockImplementation((args) => {
      if (args.where.userId_groupId) {
        const key = `${args.where.userId_groupId.userId}_${args.where.userId_groupId.groupId}`;
        const userGroup = mockDataStore.userGroups.get(key);
        return Promise.resolve(userGroup || null);
      }
      return Promise.resolve(null);
    }),
    update: jest.fn().mockImplementation((args) => {
      if (args.where.userId_groupId) {
        const key = `${args.where.userId_groupId.userId}_${args.where.userId_groupId.groupId}`;
        const existing = mockDataStore.userGroups.get(key);
        if (!existing) return Promise.resolve(null);
        const updated = { ...existing, ...args.data };
        mockDataStore.userGroups.set(key, updated);
        return Promise.resolve(updated);
      }
      return Promise.resolve(null);
    }),
    delete: jest.fn().mockImplementation((args) => {
      if (args.where.userId_groupId) {
        const key = `${args.where.userId_groupId.userId}_${args.where.userId_groupId.groupId}`;
        const deleted = mockDataStore.userGroups.get(key);
        mockDataStore.userGroups.delete(key);
        return Promise.resolve(deleted || {});
      }
      return Promise.resolve({});
    }),
    deleteMany: jest.fn().mockImplementation((args) => {
      let count = 0;
      if (args?.where?.groupId) {
        for (const [key, userGroup] of mockDataStore.userGroups.entries()) {
          if (userGroup.groupId === args.where.groupId) {
            mockDataStore.userGroups.delete(key);
            count++;
          }
        }
      }
      return Promise.resolve({ count });
    }),
    count: jest.fn().mockResolvedValue(0),
  },
  groupInvitation: {
    create: jest.fn().mockImplementation((data) => {
      const id = `invitation-${Date.now()}-${Math.random().toString(36).substring(2, 11)}`;
      const invitation = {
        id,
        email: data.data.email,
        groupId: data.data.group?.connect?.id || data.data.groupId,
        invitedBy: data.data.inviter?.connect?.id || data.data.invitedBy,
        token: data.data.token || `token-${id}`,
        status: data.data.status || 'PENDING',
        expiresAt: data.data.expiresAt || new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
        emailStatus: data.data.emailStatus || null,
        emailSentAt: data.data.emailSentAt || null,
        emailAttempts: data.data.emailAttempts || 0,
        lastEmailError: data.data.lastEmailError || null,
        reminderSentAt: data.data.reminderSentAt || null,
        reminderCount: data.data.reminderCount || 0,
        createdAt: new Date(),
        updatedAt: new Date(),
      };
      mockDataStore.groupInvitations.set(id, invitation);
      return Promise.resolve(invitation);
    }),
    findMany: jest.fn().mockImplementation(() => {
      return Promise.resolve(Array.from(mockDataStore.groupInvitations.values()));
    }),
    findUnique: jest.fn().mockImplementation((args) => {
      const invitation = mockDataStore.groupInvitations.get(args.where.id);
      if (!invitation) return Promise.resolve(null);

      // Handle includes
      if (args.include) {
        const result = { ...invitation };

        if (args.include.emailLogs) {
          const emailLogs = Array.from(mockDataStore.emailLogs.values()).filter(
            (log) => log.invitationId === invitation.id
          );
          result.emailLogs = emailLogs;
        }

        return Promise.resolve(result);
      }

      return Promise.resolve(invitation);
    }),
    update: jest.fn().mockImplementation((args) => {
      const existing = mockDataStore.groupInvitations.get(args.where.id);
      if (!existing) return Promise.resolve(null);
      const updated = {
        ...existing,
        ...args.data,
        updatedAt: new Date(),
      };
      mockDataStore.groupInvitations.set(args.where.id, updated);
      return Promise.resolve(updated);
    }),
    delete: jest.fn().mockImplementation((args) => {
      const deleted = mockDataStore.groupInvitations.get(args.where.id);
      mockDataStore.groupInvitations.delete(args.where.id);
      return Promise.resolve(deleted || {});
    }),
    deleteMany: jest.fn().mockImplementation((args) => {
      let count = 0;
      if (!args?.where) {
        count = mockDataStore.groupInvitations.size;
        mockDataStore.groupInvitations.clear();
      }
      return Promise.resolve({ count });
    }),
  },
  list: {
    findMany: jest.fn().mockImplementation((args) => {
      mockDataStore.lists = mockDataStore.lists || new Map();
      let lists = Array.from(mockDataStore.lists.values());
      if (args?.where) {
        if (args.where.ownerId) {
          lists = lists.filter((l) => l.ownerId === args.where.ownerId);
        }
      }
      return Promise.resolve(lists);
    }),
    findFirst: jest.fn().mockImplementation((args) => {
      mockDataStore.lists = mockDataStore.lists || new Map();
      let lists = Array.from(mockDataStore.lists.values());

      if (args?.where) {
        // Filter by slug
        if (args.where.slug) {
          const slug =
            typeof args.where.slug === 'string' ? args.where.slug.toLowerCase() : args.where.slug;
          lists = lists.filter((l) => l.slug?.toLowerCase() === slug);
        }

        // Filter by owner username (supports both 'owner' and 'user' relation names)
        const usernameFilter = args.where.owner?.username || args.where.user?.username;
        if (usernameFilter) {
          const username =
            typeof usernameFilter === 'string' ? usernameFilter.toLowerCase() : usernameFilter;
          lists = lists.filter((l) => {
            const owner = mockDataStore.users.get(l.ownerId);
            return owner?.username?.toLowerCase() === username;
          });
        }

        // Filter by visibility (NOT private)
        if (args.where.visibility?.not) {
          lists = lists.filter((l) => l.visibility !== args.where.visibility.not);
        }

        // Filter by hideFromProfile
        if (args.where.hideFromProfile === false) {
          lists = lists.filter((l) => !l.hideFromProfile);
        }
      }

      const list = lists[0] || null;

      if (!list) return Promise.resolve(null);

      // Handle includes
      if (args.include) {
        const result = { ...list };

        if (args.include.owner) {
          const owner = mockDataStore.users.get(list.ownerId);
          if (owner && args.include.owner.select) {
            const selectedOwner = {};
            Object.keys(args.include.owner.select).forEach((key) => {
              if (args.include.owner.select[key] && owner[key] !== undefined) {
                selectedOwner[key] = owner[key];
              }
            });
            result.owner = selectedOwner;
          } else {
            result.owner = owner || null;
          }
        }

        return Promise.resolve(result);
      }

      return Promise.resolve(list);
    }),
    findUnique: jest.fn().mockImplementation((args) => {
      mockDataStore.lists = mockDataStore.lists || new Map();
      let list = null;

      if (args.where.id) {
        list = mockDataStore.lists.get(args.where.id);
      } else if (args.where.shareToken) {
        list = Array.from(mockDataStore.lists.values()).find(
          (l) => l.shareToken === args.where.shareToken
        );
      }

      if (!list) return Promise.resolve(null);

      // Handle includes
      if (args.include) {
        const result = { ...list };

        // Handle both 'user' (Prisma relation name) and 'owner' (legacy) for backward compatibility
        if (args.include.user || args.include.owner) {
          const userOrOwner = mockDataStore.users.get(list.ownerId);
          const includeConfig = args.include.user || args.include.owner;
          if (userOrOwner && includeConfig.select) {
            const selectedUser = {};
            Object.keys(includeConfig.select).forEach((key) => {
              if (includeConfig.select[key] && userOrOwner[key] !== undefined) {
                selectedUser[key] = userOrOwner[key];
              }
            });
            if (args.include.user) result.user = selectedUser;
            if (args.include.owner) result.owner = selectedUser;
          } else {
            if (args.include.user) result.user = userOrOwner || null;
            if (args.include.owner) result.owner = userOrOwner || null;
          }
        }

        if (args.include._count) {
          mockDataStore.listWishes = mockDataStore.listWishes || new Map();
          mockDataStore.listAdmins = mockDataStore.listAdmins || new Map();
          const wishes = Array.from(mockDataStore.listWishes.values()).filter(
            (lw) => lw.listId === list.id
          );
          const admins = Array.from(mockDataStore.listAdmins.values()).filter(
            (la) => la.listId === list.id
          );
          result._count = {
            listWishes: wishes.length,
            listAdmins: admins.length,
            wishes: wishes.length, // Legacy
            admins: admins.length, // Legacy
          };
        }

        // Handle both 'listWishes' (Prisma relation name) and 'wishes' (legacy) for backward compatibility
        if (args.include.listWishes || args.include.wishes) {
          mockDataStore.listWishes = mockDataStore.listWishes || new Map();
          mockDataStore.wishes = mockDataStore.wishes || new Map();
          const listWishes = Array.from(mockDataStore.listWishes.values()).filter(
            (lw) => lw.listId === list.id
          );
          const wishesData = listWishes.map((lw) => {
            const wish = mockDataStore.wishes.get(lw.wishId);
            return {
              ...lw,
              wish: wish || null,
            };
          });

          // Apply orderBy if specified
          const includeConfig = args.include.listWishes || args.include.wishes;
          if (includeConfig.orderBy?.addedAt) {
            wishesData.sort((a, b) => {
              if (includeConfig.orderBy.addedAt === 'desc') {
                return new Date(b.addedAt).getTime() - new Date(a.addedAt).getTime();
              }
              return new Date(a.addedAt).getTime() - new Date(b.addedAt).getTime();
            });
          }

          if (args.include.listWishes) result.listWishes = wishesData;
          if (args.include.wishes) result.wishes = wishesData;
        }

        // IMPORTANT: Keep password field for service layer (password verification needs it)
        // The service layer will handle excluding it from the HTTP response
        return Promise.resolve(result);
      }

      // Return full list with password field for service layer
      return Promise.resolve(list);
    }),
    create: jest.fn().mockImplementation((data) => {
      const id =
        data.data.id || `list-${Date.now()}-${Math.random().toString(36).substring(2, 11)}`;
      const list = {
        id,
        name: data.data.name,
        description: data.data.description || null,
        visibility: data.data.visibility || 'private',
        password: data.data.password || null,
        shareToken: data.data.shareToken || null,
        slug: data.data.slug !== undefined ? data.data.slug : null,
        hideFromProfile:
          data.data.hideFromProfile !== undefined ? data.data.hideFromProfile : false,
        ownerId: data.data.ownerId,
        createdAt: new Date(),
        updatedAt: new Date(),
      };
      mockDataStore.lists = mockDataStore.lists || new Map();
      mockDataStore.lists.set(id, list);

      // Handle includes
      if (data.include?.owner) {
        const owner = mockDataStore.users.get(list.ownerId);
        return Promise.resolve({ ...list, owner: owner || null });
      }

      // Return list with password field preserved for service layer
      return Promise.resolve(list);
    }),
    update: jest.fn().mockImplementation((args) => {
      mockDataStore.lists = mockDataStore.lists || new Map();
      const existing = mockDataStore.lists.get(args.where.id);
      if (!existing) return Promise.resolve(null);

      // Check for unique slug constraint (per owner)
      if (args.data.slug !== undefined && args.data.slug !== null) {
        const duplicateSlug = Array.from(mockDataStore.lists.values()).find(
          (l) =>
            l.id !== args.where.id &&
            l.ownerId === existing.ownerId &&
            l.slug?.toLowerCase() === args.data.slug.toLowerCase()
        );
        if (duplicateSlug) {
          // Create a proper Prisma unique constraint error using the mocked class
          const error = new PrismaClientKnownRequestError(
            'Unique constraint failed on the fields: (`slug`,`ownerId`)',
            {
              code: 'P2002',
              clientVersion: '5.22.0',
              meta: { target: ['slug', 'ownerId'] },
            }
          );
          return Promise.reject(error);
        }
      }

      const updated = {
        ...existing,
        ...args.data,
        updatedAt: new Date(),
      };
      mockDataStore.lists.set(args.where.id, updated);
      // Return list with password field preserved for service layer
      return Promise.resolve(updated);
    }),
    delete: jest.fn().mockImplementation((args) => {
      mockDataStore.lists = mockDataStore.lists || new Map();
      const deleted = mockDataStore.lists.get(args.where.id);
      mockDataStore.lists.delete(args.where.id);
      return Promise.resolve(deleted || {});
    }),
  },
  listAdmin: {
    findMany: jest.fn().mockImplementation((args) => {
      let admins = Array.from(mockDataStore.listAdmins.values());
      if (args?.where) {
        if (args.where.listId) {
          admins = admins.filter((admin) => admin.listId === args.where.listId);
        }
        if (args.where.userId) {
          admins = admins.filter((admin) => admin.userId === args.where.userId);
        }
        if (args.where.listId_userId) {
          admins = admins.filter(
            (admin) =>
              admin.listId === args.where.listId_userId.listId &&
              admin.userId === args.where.listId_userId.userId
          );
        }
      }

      // Handle includes
      if (args?.include?.user) {
        admins = admins.map((admin) => ({
          ...admin,
          user: mockDataStore.users.get(admin.userId) || null,
        }));
      }

      // Handle orderBy
      if (args?.orderBy?.addedAt) {
        admins.sort((a, b) => {
          if (args.orderBy.addedAt === 'desc') {
            return new Date(b.addedAt).getTime() - new Date(a.addedAt).getTime();
          }
          return new Date(a.addedAt).getTime() - new Date(b.addedAt).getTime();
        });
      }

      return Promise.resolve(admins);
    }),
    findUnique: jest.fn().mockImplementation((args) => {
      if (args.where.listId_userId) {
        const key = `${args.where.listId_userId.listId}_${args.where.listId_userId.userId}`;
        const admin = mockDataStore.listAdmins.get(key);
        return Promise.resolve(admin || null);
      }
      return Promise.resolve(null);
    }),
    create: jest.fn().mockImplementation((data) => {
      const key = `${data.data.listId}_${data.data.userId}`;
      const admin = {
        listId: data.data.listId,
        userId: data.data.userId,
        addedBy: data.data.addedBy,
        addedAt: new Date(),
      };
      mockDataStore.listAdmins.set(key, admin);
      return Promise.resolve(admin);
    }),
    delete: jest.fn().mockImplementation((args) => {
      if (args.where.listId_userId) {
        const key = `${args.where.listId_userId.listId}_${args.where.listId_userId.userId}`;
        const deleted = mockDataStore.listAdmins.get(key);
        mockDataStore.listAdmins.delete(key);
        return Promise.resolve(deleted || {});
      }
      return Promise.resolve({});
    }),
    deleteMany: jest.fn().mockImplementation((args) => {
      let count = 0;
      if (args?.where?.listId) {
        for (const [key, admin] of mockDataStore.listAdmins.entries()) {
          if (admin.listId === args.where.listId) {
            mockDataStore.listAdmins.delete(key);
            count++;
          }
        }
      }
      return Promise.resolve({ count });
    }),
  },
  listGroup: {
    create: jest.fn().mockImplementation((data) =>
      Promise.resolve({
        listId: data.data.listId,
        groupId: data.data.groupId,
        sharedBy: data.data.sharedBy,
        sharedAt: new Date(),
      })
    ),
    createMany: jest.fn().mockResolvedValue({ count: 0 }),
    findMany: jest.fn().mockResolvedValue([]),
    findUnique: jest.fn().mockResolvedValue(null),
    delete: jest.fn().mockResolvedValue({}),
    deleteMany: jest.fn().mockResolvedValue({ count: 0 }),
    count: jest.fn().mockResolvedValue(0),
  },
  wish: {
    create: jest.fn().mockImplementation((data) => {
      const id =
        data.data.id || `wish-${Date.now()}-${Math.random().toString(36).substring(2, 11)}`;
      const wish = {
        id,
        title: data.data.title,
        notes: data.data.notes || null,
        url: data.data.url || null,
        price: data.data.price || null,
        wishLevel: data.data.wishLevel || 1,
        ownerId: data.data.ownerId,
        imageUrl: data.data.imageUrl || null,
        createdAt: new Date(),
        updatedAt: new Date(),
      };
      mockDataStore.wishes = mockDataStore.wishes || new Map();
      mockDataStore.wishes.set(id, wish);
      return Promise.resolve(wish);
    }),
    findUnique: jest.fn().mockImplementation((args) => {
      mockDataStore.wishes = mockDataStore.wishes || new Map();
      const wish = mockDataStore.wishes.get(args.where.id);

      if (!wish) return Promise.resolve(null);

      // Handle includes
      if (args.include?.reservation) {
        mockDataStore.reservations = mockDataStore.reservations || new Map();
        const reservation = Array.from(mockDataStore.reservations.values()).find(
          (r) => r.wishId === wish.id
        );
        return Promise.resolve({ ...wish, reservation: reservation || null });
      }

      return Promise.resolve(wish);
    }),
    findMany: jest.fn().mockImplementation((args) => {
      mockDataStore.wishes = mockDataStore.wishes || new Map();
      let wishes = Array.from(mockDataStore.wishes.values());
      if (args?.where) {
        if (args.where.ownerId) {
          wishes = wishes.filter((w) => w.ownerId === args.where.ownerId);
        }
      }

      // Handle includes
      if (args.include?.reservation) {
        mockDataStore.reservations = mockDataStore.reservations || new Map();
        wishes = wishes.map((w) => {
          const reservation = Array.from(mockDataStore.reservations.values()).find(
            (r) => r.wishId === w.id
          );
          return { ...w, reservation: reservation || null };
        });
      }

      return Promise.resolve(wishes);
    }),
    update: jest.fn().mockImplementation((args) => {
      mockDataStore.wishes = mockDataStore.wishes || new Map();
      const existing = mockDataStore.wishes.get(args.where.id);
      if (!existing) return Promise.resolve(null);
      const updated = {
        ...existing,
        ...args.data,
        updatedAt: new Date(),
      };
      mockDataStore.wishes.set(args.where.id, updated);
      return Promise.resolve(updated);
    }),
    delete: jest.fn().mockImplementation((args) => {
      mockDataStore.wishes = mockDataStore.wishes || new Map();
      const deleted = mockDataStore.wishes.get(args.where.id);
      mockDataStore.wishes.delete(args.where.id);

      // Cascade delete: Remove all reservations for this wish
      mockDataStore.reservations = mockDataStore.reservations || new Map();
      for (const [key, reservation] of mockDataStore.reservations.entries()) {
        if (reservation.wishId === args.where.id) {
          mockDataStore.reservations.delete(key);
        }
      }

      return Promise.resolve(deleted || {});
    }),
    deleteMany: jest.fn().mockImplementation((args) => {
      mockDataStore.wishes = mockDataStore.wishes || new Map();
      let count = 0;
      if (!args?.where) {
        count = mockDataStore.wishes.size;
        mockDataStore.wishes.clear();
      } else {
        const toDelete = [];
        for (const [key, wish] of mockDataStore.wishes.entries()) {
          if (args.where.id && wish.id === args.where.id) {
            toDelete.push(key);
          }
          if (args.where.ownerId && wish.ownerId === args.where.ownerId) {
            toDelete.push(key);
          }
        }
        toDelete.forEach((key) => mockDataStore.wishes.delete(key));
        count = toDelete.length;
      }
      return Promise.resolve({ count });
    }),
    count: jest.fn().mockImplementation((args) => {
      mockDataStore.wishes = mockDataStore.wishes || new Map();
      let wishes = Array.from(mockDataStore.wishes.values());
      if (args?.where) {
        if (args.where.ownerId) {
          wishes = wishes.filter((w) => w.ownerId === args.where.ownerId);
        }
      }
      return Promise.resolve(wishes.length);
    }),
    aggregate: jest.fn().mockResolvedValue({}),
    groupBy: jest.fn().mockResolvedValue([]),
  },
  reservation: {
    create: jest.fn().mockImplementation((data) => {
      const id =
        data.data.id || `reservation-${Date.now()}-${Math.random().toString(36).substring(2, 11)}`;
      const reservation = {
        id,
        wishId: data.data.wishId,
        userId: data.data.userId || null,
        reserverName: data.data.reserverName || null,
        reserverEmail: data.data.reserverEmail || null,
        accessToken: data.data.accessToken || null,
        reservedAt: new Date(),
        notes: data.data.notes || null,
      };
      mockDataStore.reservations = mockDataStore.reservations || new Map();
      mockDataStore.reservations.set(id, reservation);

      // Handle includes
      if (data.include?.wish) {
        mockDataStore.wishes = mockDataStore.wishes || new Map();
        const wish = mockDataStore.wishes.get(reservation.wishId);
        return Promise.resolve({ ...reservation, wish: wish || null });
      }

      return Promise.resolve(reservation);
    }),
    findUnique: jest.fn().mockImplementation((args) => {
      mockDataStore.reservations = mockDataStore.reservations || new Map();
      let reservation = null;

      if (args.where.id) {
        reservation = mockDataStore.reservations.get(args.where.id);
      } else if (args.where.wishId) {
        reservation = Array.from(mockDataStore.reservations.values()).find(
          (r) => r.wishId === args.where.wishId
        );
      } else if (args.where.accessToken) {
        reservation = Array.from(mockDataStore.reservations.values()).find(
          (r) => r.accessToken === args.where.accessToken
        );
      }

      if (!reservation) return Promise.resolve(null);

      // Handle includes
      if (args.include?.wish) {
        mockDataStore.wishes = mockDataStore.wishes || new Map();
        const wish = mockDataStore.wishes.get(reservation.wishId);
        return Promise.resolve({ ...reservation, wish: wish || null });
      }

      return Promise.resolve(reservation);
    }),
    findFirst: jest.fn().mockImplementation((args) => {
      mockDataStore.reservations = mockDataStore.reservations || new Map();
      let reservations = Array.from(mockDataStore.reservations.values());

      if (args?.where) {
        if (args.where.wishId) {
          reservations = reservations.filter((r) => r.wishId === args.where.wishId);
        }
        if (args.where.userId) {
          reservations = reservations.filter((r) => r.userId === args.where.userId);
        }
        if (args.where.accessToken) {
          reservations = reservations.filter((r) => r.accessToken === args.where.accessToken);
        }
      }

      const reservation = reservations[0] || null;

      if (!reservation) return Promise.resolve(null);

      // Handle includes
      if (args.include?.wish) {
        mockDataStore.wishes = mockDataStore.wishes || new Map();
        const wish = mockDataStore.wishes.get(reservation.wishId);
        return Promise.resolve({ ...reservation, wish: wish || null });
      }

      return Promise.resolve(reservation);
    }),
    findMany: jest.fn().mockImplementation((args = {}) => {
      mockDataStore.reservations = mockDataStore.reservations || new Map();
      let reservations = Array.from(mockDataStore.reservations.values());

      if (args.where) {
        if (args.where.userId) {
          reservations = reservations.filter((r) => r.userId === args.where.userId);
        }
        if (args.where.wishId) {
          reservations = reservations.filter((r) => r.wishId === args.where.wishId);
        }
      }

      // Handle includes
      if (args.include?.wish) {
        mockDataStore.wishes = mockDataStore.wishes || new Map();
        reservations = reservations.map((r) => {
          const wish = mockDataStore.wishes.get(r.wishId);
          return { ...r, wish: wish || null };
        });
      }

      return Promise.resolve(reservations);
    }),
    update: jest.fn().mockImplementation((args) => {
      mockDataStore.reservations = mockDataStore.reservations || new Map();
      const existing = mockDataStore.reservations.get(args.where.id);
      if (!existing) return Promise.resolve(null);
      const updated = {
        ...existing,
        ...args.data,
      };
      mockDataStore.reservations.set(args.where.id, updated);
      return Promise.resolve(updated);
    }),
    delete: jest.fn().mockImplementation((args) => {
      mockDataStore.reservations = mockDataStore.reservations || new Map();
      const deleted = mockDataStore.reservations.get(args.where.id);
      mockDataStore.reservations.delete(args.where.id);
      return Promise.resolve(deleted || {});
    }),
    deleteMany: jest.fn().mockImplementation((args) => {
      mockDataStore.reservations = mockDataStore.reservations || new Map();
      let count = 0;
      if (!args?.where) {
        count = mockDataStore.reservations.size;
        mockDataStore.reservations.clear();
      } else {
        const toDelete = [];
        for (const [key, reservation] of mockDataStore.reservations.entries()) {
          let shouldDelete = false;

          // Handle id.in pattern (e.g., { id: { in: ['id1', 'id2'] } })
          if (args.where.id?.in) {
            shouldDelete = args.where.id.in.includes(reservation.id);
          } else if (args.where.wishId) {
            shouldDelete = reservation.wishId === args.where.wishId;
          } else if (args.where.userId) {
            shouldDelete = reservation.userId === args.where.userId;
          }

          if (shouldDelete) {
            toDelete.push(key);
          }
        }
        toDelete.forEach((key) => mockDataStore.reservations.delete(key));
        count = toDelete.length;
      }
      return Promise.resolve({ count });
    }),
    count: jest.fn().mockImplementation((args) => {
      mockDataStore.reservations = mockDataStore.reservations || new Map();
      let reservations = Array.from(mockDataStore.reservations.values());
      if (args?.where) {
        if (args.where.userId) {
          reservations = reservations.filter((r) => r.userId === args.where.userId);
        }
        if (args.where.wishId) {
          reservations = reservations.filter((r) => r.wishId === args.where.wishId);
        }
      }
      return Promise.resolve(reservations.length);
    }),
  },
  auditLog: {
    create: jest.fn().mockImplementation((args) => {
      const id = args.data.id || `audit-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
      const log = {
        id,
        timestamp: args.data.timestamp || new Date(),
        actorId: args.data.actorId || null,
        actorName: args.data.actorName || null,
        actorType: args.data.actorType,
        category: args.data.category,
        action: args.data.action,
        resourceType: args.data.resourceType || null,
        resourceId: args.data.resourceId || null,
        resourceName: args.data.resourceName || null,
        details: args.data.details || null,
        ipAddress: args.data.ipAddress || null,
        userAgent: args.data.userAgent || null,
      };
      mockDataStore.auditLogs.set(id, log);
      return Promise.resolve(log);
    }),
    findMany: jest.fn().mockImplementation((args) => {
      let logs = Array.from(mockDataStore.auditLogs.values());

      // Apply where filters
      if (args?.where) {
        if (args.where.action) {
          logs = logs.filter((log) => log.action === args.where.action);
        }
        if (args.where.category) {
          logs = logs.filter((log) => log.category === args.where.category);
        }
        if (args.where.actorId) {
          logs = logs.filter((log) => log.actorId === args.where.actorId);
        }
        if (args.where.timestamp?.lt) {
          const cutoff = new Date(args.where.timestamp.lt);
          logs = logs.filter((log) => new Date(log.timestamp) < cutoff);
        }
        if (args.where.timestamp?.lte) {
          const cutoff = new Date(args.where.timestamp.lte);
          logs = logs.filter((log) => new Date(log.timestamp) <= cutoff);
        }
        if (args.where.timestamp?.gt) {
          const cutoff = new Date(args.where.timestamp.gt);
          logs = logs.filter((log) => new Date(log.timestamp) > cutoff);
        }
        if (args.where.timestamp?.gte) {
          const cutoff = new Date(args.where.timestamp.gte);
          logs = logs.filter((log) => new Date(log.timestamp) >= cutoff);
        }
        if (args.where.id?.in) {
          logs = logs.filter((log) => args.where.id.in.includes(log.id));
        }
        // Handle OR conditions for search
        if (args.where.OR) {
          logs = logs.filter((log) => {
            return args.where.OR.some((condition) => {
              if (condition.action?.contains) {
                return log.action?.includes(condition.action.contains);
              }
              if (condition.resourceName?.contains) {
                return log.resourceName?.includes(condition.resourceName.contains);
              }
              if (condition.actorName?.contains) {
                return log.actorName?.includes(condition.actorName.contains);
              }
              return false;
            });
          });
        }
      }

      // Apply orderBy
      if (args?.orderBy) {
        const key = Object.keys(args.orderBy)[0];
        const direction = args.orderBy[key];
        logs.sort((a, b) => {
          if (direction === 'asc') {
            return new Date(a[key]) - new Date(b[key]);
          } else {
            return new Date(b[key]) - new Date(a[key]);
          }
        });
      }

      // Apply skip
      if (args?.skip) {
        logs = logs.slice(args.skip);
      }

      // Apply take
      if (args?.take) {
        logs = logs.slice(0, args.take);
      }

      // Apply select
      if (args?.select) {
        logs = logs.map((log) => {
          const selected = {};
          Object.keys(args.select).forEach((key) => {
            if (args.select[key]) {
              selected[key] = log[key];
            }
          });
          return selected;
        });
      }

      return Promise.resolve(logs);
    }),
    findFirst: jest.fn().mockImplementation((args) => {
      let logs = Array.from(mockDataStore.auditLogs.values());

      // Apply where filters
      if (args?.where) {
        if (args.where.action) {
          logs = logs.filter((log) => log.action === args.where.action);
        }
        if (args.where.category) {
          logs = logs.filter((log) => log.category === args.where.category);
        }
      }

      // Apply orderBy
      if (args?.orderBy) {
        const key = Object.keys(args.orderBy)[0];
        const direction = args.orderBy[key];
        logs.sort((a, b) => {
          if (direction === 'asc') {
            return new Date(a[key]) - new Date(b[key]);
          } else {
            return new Date(b[key]) - new Date(a[key]);
          }
        });
      }

      return Promise.resolve(logs[0] || null);
    }),
    findUnique: jest.fn().mockImplementation((args) => {
      if (args?.where?.id) {
        return Promise.resolve(mockDataStore.auditLogs.get(args.where.id) || null);
      }
      return Promise.resolve(null);
    }),
    count: jest.fn().mockImplementation((args) => {
      let logs = Array.from(mockDataStore.auditLogs.values());

      // Apply where filters
      if (args?.where) {
        if (args.where.timestamp?.lt) {
          const cutoff = new Date(args.where.timestamp.lt);
          logs = logs.filter((log) => new Date(log.timestamp) < cutoff);
        }
      }

      return Promise.resolve(logs.length);
    }),
    deleteMany: jest.fn().mockImplementation((args) => {
      let count = 0;

      if (!args?.where || Object.keys(args.where).length === 0) {
        // Delete all
        count = mockDataStore.auditLogs.size;
        mockDataStore.auditLogs.clear();
      } else {
        // Delete matching entries
        const toDelete = [];
        for (const [id, log] of mockDataStore.auditLogs.entries()) {
          let shouldDelete = true;

          if (args.where.timestamp?.lt) {
            const cutoff = new Date(args.where.timestamp.lt);
            shouldDelete = shouldDelete && new Date(log.timestamp) < cutoff;
          }

          if (args.where.id?.in) {
            shouldDelete = shouldDelete && args.where.id.in.includes(id);
          }

          if (shouldDelete) {
            toDelete.push(id);
          }
        }

        toDelete.forEach((id) => {
          mockDataStore.auditLogs.delete(id);
          count++;
        });
      }

      return Promise.resolve({ count });
    }),
    update: jest.fn(),
    delete: jest.fn(),
  },
  auditLogSettings: {
    findFirst: jest.fn().mockImplementation(() => {
      // Return default settings
      return Promise.resolve({
        id: 'default',
        authEnabled: true,
        userManagementEnabled: true,
        contentEnabled: true,
        adminEnabled: true,
        updatedAt: new Date(),
      });
    }),
    create: jest.fn().mockImplementation((args) => {
      return Promise.resolve({
        id: args.data.id || 'default',
        authEnabled: args.data.authEnabled ?? true,
        userManagementEnabled: args.data.userManagementEnabled ?? true,
        contentEnabled: args.data.contentEnabled ?? true,
        adminEnabled: args.data.adminEnabled ?? true,
        updatedAt: new Date(),
      });
    }),
    upsert: jest.fn().mockImplementation((args) => {
      return Promise.resolve({
        id: args.where.id || 'default',
        authEnabled: args.update?.authEnabled ?? args.create?.authEnabled ?? true,
        userManagementEnabled:
          args.update?.userManagementEnabled ?? args.create?.userManagementEnabled ?? true,
        contentEnabled: args.update?.contentEnabled ?? args.create?.contentEnabled ?? true,
        adminEnabled: args.update?.adminEnabled ?? args.create?.adminEnabled ?? true,
        updatedAt: new Date(),
      });
    }),
    update: jest.fn(),
  },
  apiKey: {
    create: jest.fn(),
    findUnique: jest.fn(),
    findMany: jest.fn(),
    update: jest.fn(),
    delete: jest.fn(),
  },
  account: {
    create: jest.fn().mockImplementation((data) => {
      const id = `account-${Date.now()}-${Math.random().toString(36).substring(2, 11)}`;
      const account = {
        id,
        userId: data.data.userId,
        type: data.data.type,
        provider: data.data.provider,
        providerAccountId: data.data.providerAccountId,
        refresh_token: data.data.refresh_token || null,
        access_token: data.data.access_token || null,
        expires_at: data.data.expires_at || null,
        token_type: data.data.token_type || null,
        scope: data.data.scope || null,
        id_token: data.data.id_token || null,
        session_state: data.data.session_state || null,
      };
      mockDataStore.accounts.set(id, account);
      return Promise.resolve(account);
    }),
    findUnique: jest.fn().mockImplementation((args) => {
      if (args.where.provider_providerAccountId) {
        const { provider, providerAccountId } = args.where.provider_providerAccountId;
        const account = Array.from(mockDataStore.accounts.values()).find(
          (a) => a.provider === provider && a.providerAccountId === providerAccountId
        );
        if (account && args.include?.user) {
          const user = mockDataStore.users.get(account.userId);
          return Promise.resolve({ ...account, user });
        }
        return Promise.resolve(account || null);
      }
      if (args.where.id) {
        return Promise.resolve(mockDataStore.accounts.get(args.where.id) || null);
      }
      return Promise.resolve(null);
    }),
    findMany: jest.fn().mockImplementation(() => {
      return Promise.resolve(Array.from(mockDataStore.accounts.values()));
    }),
    update: jest.fn(),
    delete: jest.fn(),
  },
  verificationToken: {
    create: jest.fn().mockImplementation((data) => {
      const token = {
        identifier: data.data.identifier,
        token: data.data.token,
        expires: data.data.expires,
        createdAt: new Date(),
      };
      const key = `${token.identifier}_${token.token}`;
      mockDataStore.verificationTokens = mockDataStore.verificationTokens || new Map();
      mockDataStore.verificationTokens.set(key, token);
      return Promise.resolve(token);
    }),
    findUnique: jest.fn().mockImplementation((args) => {
      mockDataStore.verificationTokens = mockDataStore.verificationTokens || new Map();
      if (args.where.token) {
        const token = Array.from(mockDataStore.verificationTokens.values()).find(
          (t) => t.token === args.where.token
        );
        return Promise.resolve(token || null);
      }
      if (args.where.identifier_token) {
        const key = `${args.where.identifier_token.identifier}_${args.where.identifier_token.token}`;
        const token = mockDataStore.verificationTokens.get(key);
        return Promise.resolve(token || null);
      }
      return Promise.resolve(null);
    }),
    delete: jest.fn().mockImplementation((args) => {
      mockDataStore.verificationTokens = mockDataStore.verificationTokens || new Map();
      if (args.where.identifier_token) {
        const key = `${args.where.identifier_token.identifier}_${args.where.identifier_token.token}`;
        const deleted = mockDataStore.verificationTokens.get(key);
        mockDataStore.verificationTokens.delete(key);
        return Promise.resolve(deleted || {});
      }
      return Promise.resolve({});
    }),
    deleteMany: jest.fn().mockImplementation((args) => {
      mockDataStore.verificationTokens = mockDataStore.verificationTokens || new Map();
      let count = 0;

      if (args?.where) {
        const tokensToDelete = [];

        for (const [key, token] of mockDataStore.verificationTokens.entries()) {
          let shouldDelete = true;

          // Check identifier startsWith filter
          if (args.where.identifier?.startsWith) {
            shouldDelete =
              shouldDelete && token.identifier.startsWith(args.where.identifier.startsWith);
          }

          // Check expires lt filter
          if (args.where.expires?.lt) {
            shouldDelete =
              shouldDelete && new Date(token.expires) < new Date(args.where.expires.lt);
          }

          if (shouldDelete) {
            tokensToDelete.push(key);
          }
        }

        tokensToDelete.forEach((key) => {
          mockDataStore.verificationTokens.delete(key);
          count++;
        });
      }

      return Promise.resolve({ count });
    }),
    count: jest.fn().mockImplementation((args) => {
      mockDataStore.verificationTokens = mockDataStore.verificationTokens || new Map();
      if (!args?.where) {
        return Promise.resolve(mockDataStore.verificationTokens.size);
      }

      let count = 0;
      for (const token of mockDataStore.verificationTokens.values()) {
        let matches = true;

        if (args.where.identifier?.startsWith) {
          matches = matches && token.identifier.startsWith(args.where.identifier.startsWith);
        }

        if (matches) {
          count++;
        }
      }

      return Promise.resolve(count);
    }),
  },
  magicLink: {
    create: jest.fn().mockImplementation((data) => {
      const magicLink = {
        id: `magiclink-${Date.now()}-${Math.random().toString(36).substring(2, 11)}`,
        email: data.data.email,
        token: data.data.token,
        expiresAt: data.data.expiresAt,
        createdAt: data.data.createdAt || new Date(),
      };
      mockDataStore.magicLinks = mockDataStore.magicLinks || new Map();
      mockDataStore.magicLinks.set(magicLink.token, magicLink);
      return Promise.resolve(magicLink);
    }),
    findUnique: jest.fn().mockImplementation((args) => {
      mockDataStore.magicLinks = mockDataStore.magicLinks || new Map();
      if (args.where.token) {
        const magicLink = mockDataStore.magicLinks.get(args.where.token);
        return Promise.resolve(magicLink || null);
      }
      return Promise.resolve(null);
    }),
    delete: jest.fn().mockImplementation((args) => {
      mockDataStore.magicLinks = mockDataStore.magicLinks || new Map();
      const deleted = mockDataStore.magicLinks.get(args.where.token);
      mockDataStore.magicLinks.delete(args.where.token);
      return Promise.resolve(deleted || {});
    }),
    deleteMany: jest.fn().mockImplementation((args) => {
      mockDataStore.magicLinks = mockDataStore.magicLinks || new Map();
      let count = 0;

      if (args?.where) {
        const linksToDelete = [];

        for (const [token, magicLink] of mockDataStore.magicLinks.entries()) {
          let shouldDelete = true;

          // Check email startsWith filter
          if (args.where.email?.startsWith) {
            shouldDelete = shouldDelete && magicLink.email.startsWith(args.where.email.startsWith);
          }

          // Check expiresAt lt filter
          if (args.where.expiresAt?.lt) {
            shouldDelete =
              shouldDelete && new Date(magicLink.expiresAt) < new Date(args.where.expiresAt.lt);
          }

          if (shouldDelete) {
            linksToDelete.push(token);
          }
        }

        linksToDelete.forEach((token) => {
          mockDataStore.magicLinks.delete(token);
          count++;
        });
      }

      return Promise.resolve({ count });
    }),
    count: jest.fn().mockImplementation((args) => {
      mockDataStore.magicLinks = mockDataStore.magicLinks || new Map();
      if (!args?.where) {
        return Promise.resolve(mockDataStore.magicLinks.size);
      }

      let count = 0;
      for (const magicLink of mockDataStore.magicLinks.values()) {
        let matches = true;

        if (args.where.email?.startsWith) {
          matches = matches && magicLink.email.startsWith(args.where.email.startsWith);
        }

        if (matches) {
          count++;
        }
      }

      return Promise.resolve(count);
    }),
  },
  session: {
    create: jest.fn().mockImplementation((data) => {
      const session = {
        id: `session-${Date.now()}-${Math.random().toString(36).substring(2, 11)}`,
        sessionToken: data.data.sessionToken,
        userId: data.data.userId,
        expires: data.data.expires,
      };
      mockDataStore.sessions = mockDataStore.sessions || new Map();
      mockDataStore.sessions.set(session.sessionToken, session);
      return Promise.resolve(session);
    }),
    findUnique: jest.fn().mockImplementation((args) => {
      mockDataStore.sessions = mockDataStore.sessions || new Map();
      let session = null;

      if (args.where.sessionToken) {
        session = mockDataStore.sessions.get(args.where.sessionToken);
      } else if (args.where.id) {
        session = Array.from(mockDataStore.sessions.values()).find((s) => s.id === args.where.id);
      }

      if (!session) return Promise.resolve(null);

      // Handle includes
      if (args.include?.user) {
        const user = mockDataStore.users.get(session.userId);
        return Promise.resolve({ ...session, user: user || null });
      }

      return Promise.resolve(session);
    }),
    findMany: jest.fn().mockImplementation((args) => {
      mockDataStore.sessions = mockDataStore.sessions || new Map();
      let sessions = Array.from(mockDataStore.sessions.values());
      if (args?.where) {
        if (args.where.userId) {
          sessions = sessions.filter((s) => s.userId === args.where.userId);
        }
        if (args.where.expires?.lt) {
          sessions = sessions.filter((s) => new Date(s.expires) < new Date(args.where.expires.lt));
        }
      }
      return Promise.resolve(sessions);
    }),
    update: jest.fn().mockImplementation((args) => {
      mockDataStore.sessions = mockDataStore.sessions || new Map();
      const existing = mockDataStore.sessions.get(args.where.sessionToken);
      if (!existing) return Promise.resolve(null);
      const updated = { ...existing, ...args.data };
      mockDataStore.sessions.set(args.where.sessionToken, updated);
      return Promise.resolve(updated);
    }),
    delete: jest.fn().mockImplementation((args) => {
      mockDataStore.sessions = mockDataStore.sessions || new Map();
      const deleted = mockDataStore.sessions.get(args.where.sessionToken);
      mockDataStore.sessions.delete(args.where.sessionToken);
      return Promise.resolve(deleted || {});
    }),
    deleteMany: jest.fn().mockImplementation((args) => {
      mockDataStore.sessions = mockDataStore.sessions || new Map();
      let count = 0;
      if (args?.where) {
        const toDelete = [];
        for (const [key, session] of mockDataStore.sessions.entries()) {
          let shouldDelete = false;
          if (args.where.userId && session.userId === args.where.userId) {
            shouldDelete = true;
          }
          if (
            args.where.expires?.lt &&
            new Date(session.expires) < new Date(args.where.expires.lt)
          ) {
            shouldDelete = true;
          }
          if (shouldDelete) {
            toDelete.push(key);
          }
        }
        toDelete.forEach((key) => mockDataStore.sessions.delete(key));
        count = toDelete.length;
      }
      return Promise.resolve({ count });
    }),
  },
  systemConfiguration: {
    findMany: jest.fn().mockResolvedValue([]),
    findUnique: jest.fn(),
    create: jest.fn(),
    update: jest.fn(),
    delete: jest.fn(),
  },
  emailTemplate: {
    findMany: jest.fn().mockImplementation((args) => {
      let templates = Array.from(mockDataStore.emailTemplates.values());
      if (args?.where) {
        if (args.where.type) {
          templates = templates.filter((t) => t.type === args.where.type);
        }
        if (args.where.isActive !== undefined) {
          templates = templates.filter((t) => t.isActive === args.where.isActive);
        }
        if (args.where.name) {
          templates = templates.filter((t) => t.name === args.where.name);
        }
      }
      return Promise.resolve(templates);
    }),
    findUnique: jest.fn().mockImplementation((args) => {
      if (args.where.id) {
        const template = mockDataStore.emailTemplates.get(args.where.id);
        return Promise.resolve(template || null);
      }
      if (args.where.name) {
        const template = Array.from(mockDataStore.emailTemplates.values()).find(
          (t) => t.name === args.where.name
        );
        return Promise.resolve(template || null);
      }
      return Promise.resolve(null);
    }),
    findFirst: jest.fn().mockImplementation((args) => {
      let templates = Array.from(mockDataStore.emailTemplates.values());

      if (args?.where) {
        if (args.where.id) {
          templates = templates.filter((t) => t.id === args.where.id);
        }
        if (args.where.type) {
          templates = templates.filter((t) => t.type === args.where.type);
        }
        if (args.where.isActive !== undefined) {
          templates = templates.filter((t) => t.isActive === args.where.isActive);
        }
        if (args.where.isDefault !== undefined) {
          templates = templates.filter((t) => t.isDefault === args.where.isDefault);
        }
        if (args.where.name) {
          templates = templates.filter((t) => t.name === args.where.name);
        }
      }

      // Handle orderBy
      if (args?.orderBy?.createdAt) {
        templates.sort((a, b) => {
          if (args.orderBy.createdAt === 'desc') {
            return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
          }
          return new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime();
        });
      }

      return Promise.resolve(templates[0] || null);
    }),
    create: jest.fn().mockImplementation((data) => {
      // Check for unique name constraint
      const existingByName = Array.from(mockDataStore.emailTemplates.values()).find(
        (t) => t.name === data.data.name
      );
      if (existingByName) {
        const error = new Error('Unique constraint failed on the fields: (`name`)');
        error.code = 'P2002';
        error.meta = { target: ['name'] };
        return Promise.reject(error);
      }

      const id = `template-${Date.now()}-${Math.random().toString(36).substring(2, 11)}`;
      const template = {
        id,
        name: data.data.name,
        type: data.data.type,
        subject: data.data.subject,
        bodyHtml: data.data.bodyHtml,
        bodyText: data.data.bodyText || null,
        variables: data.data.variables || '[]',
        isActive: data.data.isActive !== undefined ? data.data.isActive : true,
        isDefault: data.data.isDefault !== undefined ? data.data.isDefault : false,
        createdAt: new Date(),
        updatedAt: new Date(),
        createdBy: data.data.createdBy,
        updatedBy: data.data.updatedBy || null,
      };
      mockDataStore.emailTemplates.set(id, template);

      // Handle includes
      if (data.include) {
        const result = { ...template };

        if (data.include.creator) {
          const creator = mockDataStore.users.get(template.createdBy);
          result.creator = creator || null;
        }

        if (data.include.updater) {
          const updater = template.updatedBy ? mockDataStore.users.get(template.updatedBy) : null;
          result.updater = updater;
        }

        return Promise.resolve(result);
      }

      return Promise.resolve(template);
    }),
    update: jest.fn().mockImplementation((args) => {
      const existing = mockDataStore.emailTemplates.get(args.where.id);
      if (!existing) return Promise.resolve(null);
      const updated = {
        ...existing,
        ...args.data,
        updatedAt: new Date(),
      };
      mockDataStore.emailTemplates.set(args.where.id, updated);
      return Promise.resolve(updated);
    }),
    delete: jest.fn().mockImplementation((args) => {
      const deleted = mockDataStore.emailTemplates.get(args.where.id);
      mockDataStore.emailTemplates.delete(args.where.id);
      return Promise.resolve(deleted || {});
    }),
    deleteMany: jest.fn().mockImplementation((args) => {
      let count = 0;
      if (!args?.where) {
        count = mockDataStore.emailTemplates.size;
        mockDataStore.emailTemplates.clear();
      }
      return Promise.resolve({ count });
    }),
    updateMany: jest.fn().mockImplementation((args) => {
      let count = 0;
      const toUpdate = [];

      // Find templates to update
      for (const [key, template] of mockDataStore.emailTemplates.entries()) {
        let shouldUpdate = false;

        if (!args?.where) {
          shouldUpdate = true;
        } else {
          if (args.where.type && template.type === args.where.type) shouldUpdate = true;
          if (args.where.isActive !== undefined && template.isActive === args.where.isActive)
            shouldUpdate = true;
          if (args.where.isDefault !== undefined && template.isDefault === args.where.isDefault)
            shouldUpdate = true;
          if (args.where.name && template.name === args.where.name) shouldUpdate = true;
          if (args.where.id && template.id === args.where.id) shouldUpdate = true;
        }

        if (shouldUpdate) {
          toUpdate.push(key);
        }
      }

      // Apply updates
      if (args?.data) {
        toUpdate.forEach((key) => {
          const existing = mockDataStore.emailTemplates.get(key);
          if (existing) {
            const updated = {
              ...existing,
              ...args.data,
              updatedAt: new Date(),
            };
            mockDataStore.emailTemplates.set(key, updated);
            count++;
          }
        });
      }

      return Promise.resolve({ count });
    }),
    count: jest.fn().mockImplementation((args) => {
      let templates = Array.from(mockDataStore.emailTemplates.values());

      if (args?.where) {
        if (args.where.type) {
          templates = templates.filter((t) => t.type === args.where.type);
        }
        if (args.where.isActive !== undefined) {
          templates = templates.filter((t) => t.isActive === args.where.isActive);
        }
        if (args.where.isDefault !== undefined) {
          templates = templates.filter((t) => t.isDefault === args.where.isDefault);
        }
        if (args.where.name) {
          templates = templates.filter((t) => t.name === args.where.name);
        }
      }

      return Promise.resolve(templates.length);
    }),
  },
  emailLog: {
    findMany: jest.fn().mockImplementation((args) => {
      let logs = Array.from(mockDataStore.emailLogs.values());
      if (args?.where) {
        if (args.where.templateId) {
          logs = logs.filter((l) => l.templateId === args.where.templateId);
        }
        if (args.where.recipient) {
          if (args.where.recipient.contains) {
            logs = logs.filter((l) => l.recipient.includes(args.where.recipient.contains));
          } else {
            logs = logs.filter((l) => l.recipient === args.where.recipient);
          }
        }
        if (args.where.status) {
          logs = logs.filter((l) => l.status === args.where.status);
        }
        if (args.where.attempts) {
          if (typeof args.where.attempts === 'number') {
            logs = logs.filter((l) => l.attempts === args.where.attempts);
          } else if (args.where.attempts.lt !== undefined) {
            logs = logs.filter((l) => l.attempts < args.where.attempts.lt);
          } else if (args.where.attempts.lte !== undefined) {
            logs = logs.filter((l) => l.attempts <= args.where.attempts.lte);
          } else if (args.where.attempts.gt !== undefined) {
            logs = logs.filter((l) => l.attempts > args.where.attempts.gt);
          } else if (args.where.attempts.gte !== undefined) {
            logs = logs.filter((l) => l.attempts >= args.where.attempts.gte);
          }
        }
        if (args.where.retryAfter) {
          if (args.where.retryAfter.lte !== undefined) {
            logs = logs.filter(
              (l) => l.retryAfter && new Date(l.retryAfter) <= new Date(args.where.retryAfter.lte)
            );
          } else if (args.where.retryAfter.gte !== undefined) {
            logs = logs.filter(
              (l) => l.retryAfter && new Date(l.retryAfter) >= new Date(args.where.retryAfter.gte)
            );
          } else if (args.where.retryAfter.lt !== undefined) {
            logs = logs.filter(
              (l) => l.retryAfter && new Date(l.retryAfter) < new Date(args.where.retryAfter.lt)
            );
          } else if (args.where.retryAfter.gt !== undefined) {
            logs = logs.filter(
              (l) => l.retryAfter && new Date(l.retryAfter) > new Date(args.where.retryAfter.gt)
            );
          }
        }
        if (args.where.OR) {
          // Handle OR conditions
          logs = logs.filter((l) => {
            return args.where.OR.some((condition) => {
              if (condition.templateId && l.templateId === condition.templateId) return true;
              if (
                condition.recipient?.contains &&
                l.recipient.includes(condition.recipient.contains)
              )
                return true;
              return false;
            });
          });
        }
      }
      return Promise.resolve(logs);
    }),
    findUnique: jest.fn().mockImplementation((args) => {
      const log = mockDataStore.emailLogs.get(args.where.id);
      return Promise.resolve(log || null);
    }),
    create: jest.fn().mockImplementation((data) => {
      const id = `log-${Date.now()}-${Math.random().toString(36).substring(2, 11)}`;
      const log = {
        id,
        templateId: data.data.templateId,
        recipient: data.data.recipient,
        cc: data.data.cc || null,
        bcc: data.data.bcc || null,
        subject: data.data.subject,
        bodyHtml: data.data.bodyHtml,
        bodyText: data.data.bodyText || null,
        status: data.data.status || 'PENDING',
        attempts: data.data.attempts || 0,
        sentAt: data.data.sentAt || null,
        lastAttemptAt: data.data.lastAttemptAt || null,
        nextRetryAt: data.data.nextRetryAt || null,
        retryAfter: data.data.retryAfter || null,
        errorMessage: data.data.errorMessage || null,
        messageId: data.data.messageId || null,
        metadata: data.data.metadata || null,
        invitationId: data.data.invitationId || null,
        createdAt: new Date(),
        updatedAt: new Date(),
      };
      mockDataStore.emailLogs.set(id, log);

      // Handle includes
      if (data.include) {
        const result = { ...log };

        if (data.include?.invitation && log.invitationId) {
          const invitation = mockDataStore.groupInvitations.get(log.invitationId);
          // @ts-expect-error - Dynamic property based on Prisma include
          result.invitation = invitation || null;
        }

        return Promise.resolve(result);
      }

      return Promise.resolve(log);
    }),
    update: jest.fn().mockImplementation((args) => {
      const existing = mockDataStore.emailLogs.get(args.where.id);
      if (!existing) return Promise.resolve(null);
      const updated = {
        ...existing,
        ...args.data,
        updatedAt: new Date(),
      };
      mockDataStore.emailLogs.set(args.where.id, updated);
      return Promise.resolve(updated);
    }),
    delete: jest.fn().mockImplementation((args) => {
      const deleted = mockDataStore.emailLogs.get(args.where.id);
      mockDataStore.emailLogs.delete(args.where.id);
      return Promise.resolve(deleted || {});
    }),
    deleteMany: jest.fn().mockImplementation((args) => {
      let count = 0;
      if (!args?.where) {
        count = mockDataStore.emailLogs.size;
        mockDataStore.emailLogs.clear();
      } else {
        const toDelete = [];
        for (const [key, log] of mockDataStore.emailLogs.entries()) {
          let shouldDelete = false;

          if (args.where.OR) {
            shouldDelete = args.where.OR.some((condition) => {
              if (condition.templateId && log.templateId === condition.templateId) return true;
              if (
                condition.recipient?.contains &&
                log.recipient.includes(condition.recipient.contains)
              )
                return true;
              return false;
            });
          } else {
            if (args.where.templateId && log.templateId === args.where.templateId)
              shouldDelete = true;
            if (
              args.where.recipient?.contains &&
              log.recipient.includes(args.where.recipient.contains)
            )
              shouldDelete = true;
          }

          if (shouldDelete) {
            toDelete.push(key);
          }
        }

        toDelete.forEach((key) => mockDataStore.emailLogs.delete(key));
        count = toDelete.length;
      }
      return Promise.resolve({ count });
    }),
  },
  deadLetterEmail: {
    create: jest.fn().mockImplementation((data) => {
      const id = `dead-letter-${Date.now()}-${Math.random().toString(36).substring(2, 11)}`;
      const deadLetterEmail = {
        id,
        templateId: data.data.templateId || null,
        recipient: data.data.recipient,
        cc: data.data.cc || null,
        bcc: data.data.bcc || null,
        subject: data.data.subject,
        bodyHtml: data.data.bodyHtml,
        bodyText: data.data.bodyText || null,
        variables: data.data.variables || null,
        attachments: data.data.attachments || null,
        metadata: data.data.metadata || null,
        error: data.data.error,
        attempts: data.data.attempts || 1,
        lastAttemptAt: data.data.lastAttemptAt || new Date(),
        originalEmailId: data.data.originalEmailId || null,
        priority: data.data.priority || 'normal',
        createdAt: new Date(),
        updatedAt: new Date(),
      };
      mockDataStore.deadLetterEmails.set(id, deadLetterEmail);
      return Promise.resolve(deadLetterEmail);
    }),
    findMany: jest.fn().mockImplementation((args) => {
      let emails = Array.from(mockDataStore.deadLetterEmails.values());
      if (args?.where) {
        if (args.where.templateId) {
          emails = emails.filter((e) => e.templateId === args.where.templateId);
        }
        if (args.where.recipient) {
          emails = emails.filter((e) => e.recipient === args.where.recipient);
        }
        if (args.where.priority) {
          emails = emails.filter((e) => e.priority === args.where.priority);
        }
      }
      return Promise.resolve(emails);
    }),
    findUnique: jest.fn().mockImplementation((args) => {
      const email = mockDataStore.deadLetterEmails.get(args.where.id);
      return Promise.resolve(email || null);
    }),
    findFirst: jest.fn().mockImplementation((args) => {
      const emails = Array.from(mockDataStore.deadLetterEmails.values());
      if (args?.orderBy?.createdAt === 'asc') {
        emails.sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime());
      }
      return Promise.resolve(emails[0] || null);
    }),
    update: jest.fn().mockImplementation((args) => {
      const existing = mockDataStore.deadLetterEmails.get(args.where.id);
      if (!existing) return Promise.resolve(null);
      const updated = {
        ...existing,
        ...args.data,
        updatedAt: new Date(),
      };
      mockDataStore.deadLetterEmails.set(args.where.id, updated);
      return Promise.resolve(updated);
    }),
    delete: jest.fn().mockImplementation((args) => {
      const deleted = mockDataStore.deadLetterEmails.get(args.where.id);
      mockDataStore.deadLetterEmails.delete(args.where.id);
      return Promise.resolve(deleted || {});
    }),
    deleteMany: jest.fn().mockImplementation((args) => {
      let count = 0;
      if (!args?.where) {
        count = mockDataStore.deadLetterEmails.size;
        mockDataStore.deadLetterEmails.clear();
      } else {
        const toDelete = [];
        for (const [key, email] of mockDataStore.deadLetterEmails.entries()) {
          let shouldDelete = false;
          if (args.where.id && email.id === args.where.id) shouldDelete = true;
          if (
            args.where.createdAt?.lt &&
            new Date(email.createdAt) < new Date(args.where.createdAt.lt)
          )
            shouldDelete = true;
          if (shouldDelete) {
            toDelete.push(key);
          }
        }
        toDelete.forEach((key) => mockDataStore.deadLetterEmails.delete(key));
        count = toDelete.length;
      }
      return Promise.resolve({ count });
    }),
    count: jest.fn().mockImplementation((args) => {
      let emails = Array.from(mockDataStore.deadLetterEmails.values());
      if (args?.where) {
        if (args.where.createdAt?.gte) {
          emails = emails.filter(
            (e) => new Date(e.createdAt) >= new Date(args.where.createdAt.gte)
          );
        }
      }
      return Promise.resolve(emails.length);
    }),
    groupBy: jest.fn().mockImplementation((args) => {
      const emails = Array.from(mockDataStore.deadLetterEmails.values());
      if (args.by.includes('priority')) {
        const grouped = emails.reduce((acc, email) => {
          const key = email.priority;
          if (!acc[key]) acc[key] = { priority: key, _count: 0 };
          acc[key]._count++;
          return acc;
        }, {});
        return Promise.resolve(Object.values(grouped));
      }
      if (args.by.includes('templateId')) {
        const grouped = emails.reduce((acc, email) => {
          const key = email.templateId;
          if (key && !acc[key]) acc[key] = { templateId: key, _count: 0 };
          if (key) acc[key]._count++;
          return acc;
        }, {});
        return Promise.resolve(Object.values(grouped));
      }
      return Promise.resolve([]);
    }),
  },
  personalAccessToken: {
    create: jest.fn().mockImplementation((data) => {
      const id = data.data.id || `pat-${Date.now()}-${Math.random().toString(36).substring(2, 11)}`;
      const token = {
        id,
        userId: data.data.userId,
        name: data.data.name,
        deviceType: data.data.deviceType || null,
        accessTokenHash: data.data.accessTokenHash,
        refreshTokenHash: data.data.refreshTokenHash || null,
        tokenPrefix: data.data.tokenPrefix,
        expiresAt: data.data.expiresAt,
        refreshExpiresAt: data.data.refreshExpiresAt || null,
        createdIp: data.data.createdIp || null,
        lastUsedAt: null,
        lastUsedIp: null,
        revokedAt: null,
        createdAt: new Date(),
        updatedAt: new Date(),
      };
      mockDataStore.personalAccessTokens.set(id, token);
      return Promise.resolve(token);
    }),
    findUnique: jest.fn().mockImplementation((args) => {
      let token = null;
      if (args.where.id) {
        token = mockDataStore.personalAccessTokens.get(args.where.id);
      } else if (args.where.tokenPrefix) {
        token = Array.from(mockDataStore.personalAccessTokens.values()).find(
          (t) => t.tokenPrefix === args.where.tokenPrefix
        );
      }

      if (!token) return Promise.resolve(null);

      // Handle include for user
      if (args.include?.user) {
        const user = mockDataStore.users.get(token.userId);
        if (user) {
          token = { ...token, user };
        }
      }

      // Handle select clause
      if (args.select) {
        const selected = {};
        Object.keys(args.select).forEach((key) => {
          if (args.select[key] && token[key] !== undefined) {
            selected[key] = token[key];
          }
        });
        return Promise.resolve(selected);
      }

      return Promise.resolve(token);
    }),
    findMany: jest.fn().mockImplementation((args) => {
      let tokens = Array.from(mockDataStore.personalAccessTokens.values());

      // Apply where filters
      if (args?.where) {
        if (args.where.userId) {
          tokens = tokens.filter((t) => t.userId === args.where.userId);
        }
        if (args.where.revokedAt === null) {
          tokens = tokens.filter((t) => t.revokedAt === null);
        }
        if (args.where.refreshExpiresAt?.gt) {
          const compareDate = args.where.refreshExpiresAt.gt;
          tokens = tokens.filter((t) => t.refreshExpiresAt && t.refreshExpiresAt > compareDate);
        }
        if (args.where.refreshTokenHash?.not === null) {
          tokens = tokens.filter((t) => t.refreshTokenHash !== null);
        }
      }

      // Handle include for user
      if (args?.include?.user) {
        tokens = tokens.map((token) => {
          const user = mockDataStore.users.get(token.userId);
          return user ? { ...token, user } : token;
        });
      }

      // Handle select clause
      if (args?.select) {
        tokens = tokens.map((token) => {
          const selected = {};
          Object.keys(args.select).forEach((key) => {
            if (args.select[key] && token[key] !== undefined) {
              selected[key] = token[key];
            }
          });
          return selected;
        });
      }

      // Apply ordering
      if (args?.orderBy?.createdAt) {
        tokens.sort((a, b) => {
          const aTime = new Date(a.createdAt).getTime();
          const bTime = new Date(b.createdAt).getTime();
          return args.orderBy.createdAt === 'asc' ? aTime - bTime : bTime - aTime;
        });
      }

      return Promise.resolve(tokens);
    }),
    update: jest.fn().mockImplementation((args) => {
      const token = mockDataStore.personalAccessTokens.get(args.where.id);
      if (!token) return Promise.resolve(null);

      const updated = { ...token, ...args.data, updatedAt: new Date() };
      mockDataStore.personalAccessTokens.set(args.where.id, updated);
      return Promise.resolve(updated);
    }),
    updateMany: jest.fn().mockImplementation((args) => {
      let count = 0;
      mockDataStore.personalAccessTokens.forEach((token, id) => {
        let matches = true;
        if (args.where?.userId && token.userId !== args.where.userId) {
          matches = false;
        }
        if (args.where?.revokedAt === null && token.revokedAt !== null) {
          matches = false;
        }
        if (matches) {
          const updated = { ...token, ...args.data, updatedAt: new Date() };
          mockDataStore.personalAccessTokens.set(id, updated);
          count++;
        }
      });
      return Promise.resolve({ count });
    }),
    delete: jest.fn().mockImplementation((args) => {
      const token = mockDataStore.personalAccessTokens.get(args.where.id);
      if (token) {
        mockDataStore.personalAccessTokens.delete(args.where.id);
      }
      return Promise.resolve(token);
    }),
    deleteMany: jest.fn().mockImplementation((args) => {
      let count = 0;
      if (!args || !args.where || Object.keys(args.where).length === 0) {
        count = mockDataStore.personalAccessTokens.size;
        mockDataStore.personalAccessTokens.clear();
      } else {
        const toDelete = [];
        mockDataStore.personalAccessTokens.forEach((token, id) => {
          let matches = true;
          if (args.where.userId && token.userId !== args.where.userId) {
            matches = false;
          }
          if (matches) {
            toDelete.push(id);
          }
        });
        toDelete.forEach((id) => {
          mockDataStore.personalAccessTokens.delete(id);
          count++;
        });
      }
      return Promise.resolve({ count });
    }),
  },
  $connect: jest.fn().mockResolvedValue(undefined),
  $disconnect: jest.fn().mockResolvedValue(undefined),
  $executeRawUnsafe: jest.fn().mockResolvedValue(undefined),
  $transaction: jest.fn((fn) => {
    // For transactions, execute the function with the mock db
    if (typeof fn === 'function') {
      return fn(mockDb);
    }
    // For array transactions, just resolve
    return Promise.resolve();
  }),
  // Helper to reset all data stores
  _resetMockData: () => {
    mockDataStore.users.clear();
    mockDataStore.groups.clear();
    mockDataStore.userGroups.clear();
    mockDataStore.lists.clear();
    mockDataStore.listGroups.clear();
    mockDataStore.listAdmins.clear();
    mockDataStore.groupInvitations.clear();
    mockDataStore.wishes.clear();
    mockDataStore.reservations.clear();
    mockDataStore.auditLogs.clear();
    mockDataStore.apiKeys.clear();
    mockDataStore.accounts.clear();
    mockDataStore.systemConfiguration.clear();
    mockDataStore.emailTemplates.clear();
    mockDataStore.emailLogs.clear();
    mockDataStore.deadLetterEmails.clear();
    mockDataStore.personalAccessTokens.clear();
    if (mockDataStore.verificationTokens) mockDataStore.verificationTokens.clear();
    if (mockDataStore.magicLinks) mockDataStore.magicLinks.clear();
    if (mockDataStore.sessions) mockDataStore.sessions.clear();
  },
};

// Export the mock DB and data store for use in tests
global.mockDb = mockDb;
global.mockDataStore = mockDataStore;

// Ensure the global mock has the data store accessible for factory methods
global.mockDb._resetMockData = mockDb._resetMockData;

jest.mock('@/lib/db', () => ({
  db: mockDb,
}));

// Mock permission service to prevent db access
jest.mock('@/lib/services/permission-service', () => {
  const mockPermissionService = {
    can: jest.fn().mockResolvedValue({ allowed: true }),
    require: jest.fn().mockResolvedValue(undefined),
    checkGroupPermission: jest.fn().mockResolvedValue({ allowed: true }),
    checkListPermission: jest.fn().mockResolvedValue({ allowed: true }),
    checkWishPermission: jest.fn().mockResolvedValue({ allowed: true }),
    checkReservationPermission: jest.fn().mockResolvedValue({ allowed: true }),
  };

  return {
    PermissionService: jest.fn().mockImplementation(() => mockPermissionService),
    permissionService: mockPermissionService,
  };
});

// Note: Group service mock removed to allow integration tests to use real implementation

// Polyfill for File API - Always override to ensure consistency
global.File = class File {
  constructor(bits, name, options = {}) {
    // Define properties explicitly to ensure they're enumerable and accessible
    Object.defineProperty(this, 'name', {
      value: name,
      writable: false,
      enumerable: true,
      configurable: false,
    });

    Object.defineProperty(this, 'type', {
      value: options.type || '',
      writable: false,
      enumerable: true,
      configurable: false,
    });

    Object.defineProperty(this, 'lastModified', {
      value: options.lastModified || Date.now(),
      writable: false,
      enumerable: true,
      configurable: false,
    });

    // Calculate size
    const calculatedSize = bits.reduce((acc, bit) => {
      if (typeof bit === 'string') return acc + bit.length;
      if (bit instanceof ArrayBuffer) return acc + bit.byteLength;
      if (bit instanceof Uint8Array) return acc + bit.byteLength;
      return acc;
    }, 0);

    Object.defineProperty(this, 'size', {
      value: calculatedSize,
      writable: false,
      enumerable: true,
      configurable: false,
    });

    // Store bits for internal use
    Object.defineProperty(this, '_bits', {
      value: bits,
      writable: false,
      enumerable: false,
      configurable: false,
    });
  }

  async arrayBuffer() {
    const encoder = new TextEncoder();
    const parts = this._bits.map((bit) => {
      if (typeof bit === 'string') return encoder.encode(bit);
      if (bit instanceof ArrayBuffer) return new Uint8Array(bit);
      if (bit instanceof Uint8Array) return bit;
      return new Uint8Array();
    });

    const totalLength = parts.reduce((acc, part) => acc + part.byteLength, 0);
    const result = new Uint8Array(totalLength);
    let offset = 0;

    for (const part of parts) {
      result.set(part, offset);
      offset += part.byteLength;
    }

    return result.buffer;
  }

  async text() {
    const buffer = await this.arrayBuffer();
    const decoder = new TextDecoder();
    return decoder.decode(buffer);
  }

  slice(start = 0, end = this.size, contentType = '') {
    return new File(this._bits.slice(start, end), this.name, { type: contentType });
  }
};

// Polyfill for Blob if needed
if (typeof global.Blob === 'undefined') {
  global.Blob = class Blob {
    constructor(parts = [], options = {}) {
      this.type = options.type || '';
      this._parts = parts;
      this.size = parts.reduce((acc, part) => {
        if (typeof part === 'string') return acc + part.length;
        if (part instanceof ArrayBuffer) return acc + part.byteLength;
        if (part instanceof Uint8Array) return acc + part.byteLength;
        return acc;
      }, 0);
    }

    async arrayBuffer() {
      const encoder = new TextEncoder();
      const parts = this._parts.map((part) => {
        if (typeof part === 'string') return encoder.encode(part);
        if (part instanceof ArrayBuffer) return new Uint8Array(part);
        if (part instanceof Uint8Array) return part;
        return new Uint8Array();
      });

      const totalLength = parts.reduce((acc, part) => acc + part.byteLength, 0);
      const result = new Uint8Array(totalLength);
      let offset = 0;

      for (const part of parts) {
        result.set(part, offset);
        offset += part.byteLength;
      }

      return result.buffer;
    }

    async text() {
      const decoder = new TextDecoder();
      const buffer = await this.arrayBuffer();
      return decoder.decode(buffer);
    }

    slice(start = 0, end = this.size, contentType = '') {
      return new Blob(this._parts.slice(start, end), { type: contentType || this.type });
    }
  };
}

// Polyfill for FormData - Always override to ensure our implementation is used
global.FormData = class FormData {
  constructor() {
    this._data = new Map();
  }

  append(key, value) {
    if (!this._data.has(key)) {
      this._data.set(key, []);
    }
    // Store the original value directly to preserve object properties
    this._data.get(key).push(value);
  }

  get(key) {
    const values = this._data.get(key);
    const result = values ? values[0] : null;
    // Return the original object directly to preserve all properties
    return result;
  }

  getAll(key) {
    return this._data.get(key) || [];
  }

  has(key) {
    return this._data.has(key);
  }

  delete(key) {
    this._data.delete(key);
  }

  forEach(callback) {
    for (const [key, values] of this._data) {
      for (const value of values) {
        callback(value, key, this);
      }
    }
  }

  *entries() {
    for (const [key, values] of this._data) {
      for (const value of values) {
        yield [key, value];
      }
    }
  }

  *keys() {
    for (const key of this._data.keys()) {
      yield key;
    }
  }

  *values() {
    for (const values of this._data.values()) {
      for (const value of values) {
        yield value;
      }
    }
  }

  [Symbol.iterator]() {
    return this.entries();
  }
};

// Polyfill for Next.js API routes testing
if (typeof global.Request === 'undefined') {
  global.Request = class Request {
    constructor(url, options = {}) {
      this.url = url;
      this.method = options.method || 'GET';
      this.headers = new Map();
      this.body = options.body;
    }

    async json() {
      if (typeof this.body === 'string') {
        try {
          return JSON.parse(this.body);
        } catch (e) {
          throw new SyntaxError('Unexpected token in JSON');
        }
      }
      if (this.body) {
        return this.body;
      }
      throw new Error('No body to parse');
    }

    async text() {
      return typeof this.body === 'string' ? this.body : JSON.stringify(this.body || '');
    }

    async formData() {
      // If body is already FormData, return it directly
      if (this.body instanceof FormData) {
        return this.body;
      }

      // For other cases, return empty FormData
      return new FormData();
    }
  };
}

if (typeof global.Response === 'undefined') {
  global.Response = class Response {
    constructor(body, init = {}) {
      this.body = body;
      this.status = init.status || 200;
      const headersMap = new Map();
      if (init.headers) {
        Object.entries(init.headers).forEach(([key, value]) => {
          headersMap.set(key.toLowerCase(), value);
        });
      }
      // Create headers object with get method
      this.headers = {
        get: (key) => headersMap.get(key.toLowerCase()),
        set: (key, value) => headersMap.set(key.toLowerCase(), value),
      };
    }

    async json() {
      if (typeof this.body === 'string') {
        try {
          return JSON.parse(this.body);
        } catch (e) {
          throw new SyntaxError('Unexpected token in JSON');
        }
      }
      return this.body;
    }

    async arrayBuffer() {
      if (this.body instanceof ArrayBuffer) {
        return this.body;
      }
      if (this.body instanceof Buffer) {
        return this.body.buffer.slice(
          this.body.byteOffset,
          this.body.byteOffset + this.body.byteLength
        );
      }
      if (typeof this.body === 'string') {
        return new TextEncoder().encode(this.body).buffer;
      }
      return new ArrayBuffer(0);
    }
  };
}

if (typeof global.Headers === 'undefined') {
  global.Headers = Map;
}

// Mock Next.js server components
jest.mock('next/server', () => {
  class MockNextResponse extends global.Response {
    static json(body, init) {
      // Validate and fix status code if needed
      const validStatus =
        init?.status && typeof init.status === 'number' && init.status >= 200 && init.status <= 599
          ? init.status
          : 200;

      const response = new MockNextResponse(JSON.stringify(body), {
        ...init,
        status: validStatus,
        headers: {
          ...init?.headers,
          'content-type': 'application/json',
        },
      });
      response.json = async () => body;
      return response;
    }

    constructor(body, init) {
      // Validate and fix status code if needed
      const validStatus =
        init?.status && typeof init.status === 'number' && init.status >= 200 && init.status <= 599
          ? init.status
          : 200;

      const validInit = {
        ...init,
        status: validStatus,
      };

      super(body, validInit);
    }
  }

  return {
    NextRequest: global.Request,
    NextResponse: MockNextResponse,
  };
});

// Mock next-auth
jest.mock('next-auth', () => ({
  getServerSession: jest.fn(() => Promise.resolve(null)),
}));

// Mock next-auth/next
jest.mock('next-auth/next', () => ({
  getServerSession: jest.fn(() => Promise.resolve(null)),
}));

// Mock the auth module
jest.mock('@/lib/auth', () => ({
  authOptions: {},
}));

// Mock Next.js headers function
jest.mock('next/headers', () => ({
  headers: jest.fn(() => {
    // Return a mock headers object that can be set by tests
    return global.mockHeaders || new Map();
  }),
}));

// Mock Next.js router
jest.mock('next/navigation', () => ({
  useRouter() {
    return {
      push: jest.fn(),
      replace: jest.fn(),
      prefetch: jest.fn(),
      back: jest.fn(),
    };
  },
  useSearchParams() {
    return new URLSearchParams();
  },
  usePathname() {
    return '';
  },
}));

// Mock Next.js Image component
jest.mock('next/image', () => ({
  __esModule: true,
  default: (props) => {
    // eslint-disable-next-line jsx-a11y/alt-text, @next/next/no-img-element
    return <img {...props} />;
  },
}));

// Mock ResizeObserver
global.ResizeObserver = class ResizeObserver {
  constructor(callback) {
    this.callback = callback;
  }
  observe() {
    // Mock implementation
  }
  unobserve() {
    // Mock implementation
  }
  disconnect() {
    // Mock implementation
  }
};

// Mock avatar utils
jest.mock('@/lib/avatar-utils', () => ({
  resolveAvatarUrlSync: jest.fn((user) => {
    if (user?.avatarUrl?.startsWith('avatar:') && user.avatarData) {
      return `/api/user/avatar/${user.id}`;
    }
    if (user?.avatarUrl && !user.avatarUrl.startsWith('avatar:')) {
      return user.avatarUrl;
    }
    return null;
  }),
  resolveGroupAvatarUrlSync: jest.fn((group) => {
    if (group?.avatarUrl?.startsWith('avatar:') && group.avatarData) {
      return `/api/groups/${group.id}/avatar`;
    }
    if (group?.avatarUrl && !group.avatarUrl.startsWith('avatar:')) {
      return group.avatarUrl;
    }
    return null;
  }),
}));

// date-fns is mocked via __mocks__/date-fns.ts

// Mock auth-utils to work with test context headers for integration tests
jest.mock('@/lib/auth-utils', () => ({
  getCurrentUser: jest.fn().mockImplementation(async () => {
    // Check for test headers set by testContext.setCurrentUser()
    const { headers } = await import('next/headers');
    const headersList = headers();

    const userId = headersList.get('X-Test-User-Id');
    const userEmail = headersList.get('X-Test-User-Email');

    if (userId && userEmail) {
      return {
        id: userId,
        email: userEmail,
        name: 'Test User',
        image: null,
        avatarUrl: null,
        role: 'user',
        isAdmin: false,
        createdAt: new Date(),
        lastLoginAt: null,
        authMethod: 'session',
      };
    }

    return null;
  }),
  requireAuth: jest.fn().mockImplementation(async () => {
    const { getCurrentUser } = await import('@/lib/auth-utils');
    const user = await getCurrentUser();
    if (!user) {
      throw new Error('Authentication required');
    }
    return user;
  }),
}));

// Add listWish mock to mockDb
mockDb.listWish = {
  create: jest.fn().mockImplementation((data) => {
    const key = `${data.data.listId}_${data.data.wishId}`;
    const listWish = {
      listId: data.data.listId,
      wishId: data.data.wishId,
      addedAt: new Date(),
    };
    mockDataStore.listWishes = mockDataStore.listWishes || new Map();
    mockDataStore.listWishes.set(key, listWish);
    return Promise.resolve(listWish);
  }),
  findMany: jest.fn().mockImplementation((args) => {
    const listWishes = mockDataStore.listWishes || new Map();
    let results = Array.from(listWishes.values());
    if (args?.where) {
      if (args.where.listId) {
        results = results.filter((lw) => lw.listId === args.where.listId);
      }
      if (args.where.wishId) {
        results = results.filter((lw) => lw.wishId === args.where.wishId);
      }
    }
    return Promise.resolve(results);
  }),
  delete: jest.fn().mockImplementation((args) => {
    const listWishes = mockDataStore.listWishes || new Map();
    if (args.where.listId_wishId) {
      const key = `${args.where.listId_wishId.listId}_${args.where.listId_wishId.wishId}`;
      const deleted = listWishes.get(key);
      listWishes.delete(key);
      return Promise.resolve(deleted || {});
    }
    return Promise.resolve({});
  }),
  deleteMany: jest.fn().mockImplementation((args) => {
    const listWishes = mockDataStore.listWishes || new Map();
    let count = 0;
    if (args?.where?.listId) {
      for (const [key, lw] of listWishes.entries()) {
        if (lw.listId === args.where.listId) {
          listWishes.delete(key);
          count++;
        }
      }
    }
    return Promise.resolve({ count });
  }),
};

// Also ensure listWishes is cleared on reset
const originalReset = mockDb._resetMockData;
mockDb._resetMockData = () => {
  originalReset();
  mockDataStore.listWishes = new Map();
};
