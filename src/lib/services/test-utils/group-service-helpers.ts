import '@testing-library/jest-dom';

import { GroupService } from '../group/group.service';

export interface MockDb {
  group: {
    findMany: jest.Mock;
    create: jest.Mock;
    findUnique: jest.Mock;
    update: jest.Mock;
    delete: jest.Mock;
    count: jest.Mock;
  };
  user: {
    findUnique: jest.Mock;
    findMany: jest.Mock;
  };
  userGroup: {
    create: jest.Mock;
    findMany: jest.Mock;
    findUnique: jest.Mock;
    update: jest.Mock;
    delete: jest.Mock;
    deleteMany: jest.Mock;
    count: jest.Mock;
  };
  groupInvitation: {
    create: jest.Mock;
    findMany: jest.Mock;
    findUnique: jest.Mock;
    update: jest.Mock;
    delete: jest.Mock;
    deleteMany: jest.Mock;
  };
  list: {
    findMany: jest.Mock;
    findUnique: jest.Mock;
    count: jest.Mock;
  };
  listGroup: {
    create: jest.Mock;
    createMany: jest.Mock;
    findMany: jest.Mock;
    findUnique: jest.Mock;
    delete: jest.Mock;
    deleteMany: jest.Mock;
    count: jest.Mock;
  };
  $transaction: jest.Mock;
}

export const createMockDb = (): MockDb => ({
  group: {
    findMany: jest.fn(),
    create: jest.fn(),
    findUnique: jest.fn(),
    update: jest.fn(),
    delete: jest.fn(),
    count: jest.fn(),
  },
  user: {
    findUnique: jest.fn(),
    findMany: jest.fn(),
  },
  userGroup: {
    create: jest.fn(),
    findMany: jest.fn(),
    findUnique: jest.fn(),
    update: jest.fn(),
    delete: jest.fn(),
    deleteMany: jest.fn(),
    count: jest.fn(),
  },
  groupInvitation: {
    create: jest.fn(),
    findMany: jest.fn(),
    findUnique: jest.fn(),
    update: jest.fn(),
    delete: jest.fn(),
    deleteMany: jest.fn(),
  },
  list: {
    findMany: jest.fn(),
    findUnique: jest.fn(),
    count: jest.fn(),
  },
  listGroup: {
    create: jest.fn(),
    createMany: jest.fn(),
    findMany: jest.fn(),
    findUnique: jest.fn(),
    delete: jest.fn(),
    deleteMany: jest.fn(),
    count: jest.fn(),
  },
  $transaction: jest.fn(),
});

// Export singleton instance for tests that use the default service
export const groupService = new GroupService();

// Common test data
export const mockUser = {
  id: 'user-123',
  email: 'test@example.com',
  name: 'Test User',
  avatarUrl: null,
  avatarData: null,
};

export const mockGroup = {
  id: 'group-123',
  name: 'Test Group',
  description: 'Test group description',
  avatarUrl: null,
  avatarData: null,
  visibility: 'private' as const,
  createdAt: new Date('2024-01-01'),
  updatedAt: new Date('2024-01-15'),
};

export const mockGroupWithCounts = {
  ...mockGroup,
  _count: {
    members: 3,
    lists: 5,
  },
};

export const mockGroupMember = {
  userId: mockUser.id,
  groupId: mockGroup.id,
  role: 'admin' as const,
  joinedAt: new Date('2024-01-01'),
  invitedBy: null,
  user: mockUser,
};
