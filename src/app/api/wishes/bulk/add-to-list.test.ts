import type { List, ListWish, PrismaClient, Wish } from '@prisma/client';

import { NextRequest } from 'next/server';

import { getCurrentUser } from '@/lib/auth-utils';
import { db } from '@/lib/db';
import type { CurrentUser, PrismaTransactionCallback } from '@/lib/test-utils/mock-types';

import { POST } from './add-to-list/route';

// Mock dependencies
jest.mock('@/lib/auth-utils');
jest.mock('@/lib/services/wish-service', () => ({
  wishService: {
    addWishesToList: jest.fn(),
  },
}));
jest.mock('@/lib/db', () => ({
  db: {
    $transaction: jest.fn(),
    wish: {
      findMany: jest.fn(),
    },
    list: {
      findUnique: jest.fn(),
    },
    listWish: {
      findMany: jest.fn(),
      createMany: jest.fn(),
    },
  },
}));

const mockGetCurrentUser = jest.mocked(getCurrentUser);
const mockDb = jest.mocked(db);

// Create explicit mock functions to avoid unbound method errors
const mockWishFindMany = jest.fn();
const mockListFindUnique = jest.fn();
const mockDbTransaction = jest.fn();
const mockListWishCreateMany = jest.fn();

// Helper function to create a mock user
const createMockUser = (id: string): NonNullable<CurrentUser> => ({
  id,
  name: 'Test User',
  email: 'test@example.com',
  image: null,
  avatarUrl: null,
  role: 'user',
  isAdmin: false,
  createdAt: new Date(),
  lastLoginAt: null,
  authMethod: 'session',
  username: null,
  usernameSetAt: null,
  canUseVanityUrls: true,
  showPublicProfile: false,
});

// Helper function to create a mock list
const createMockList = (id: string, ownerId: string): List => ({
  id,
  name: 'Test List',
  description: null,
  ownerId,
  visibility: 'private',
  password: null,
  shareToken: null,
  slug: null,
  hideFromProfile: false,
  createdAt: new Date(),
  updatedAt: new Date(),
});

// Helper function to create a mock wish
const createMockWish = (id: string, ownerId: string): Wish => ({
  id,
  title: `Wish ${id}`,
  notes: null,
  url: null,
  price: null,
  currency: null,
  imageUrl: null,
  sourceImageUrl: null,
  localImagePath: null,
  imageStatus: 'PENDING',
  quantity: 1,
  size: null,
  color: null,
  wishLevel: 1,
  ownerId,
  createdAt: new Date(),
  updatedAt: new Date(),
});

// Helper function to create a mock list wish
const createMockListWish = (wishId: string, listId: string): ListWish => ({
  listId,
  wishId,
  wishLevel: 1,
  addedAt: new Date(),
});

describe('POST /api/wishes/bulk/add-to-list', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockDb.wish.findMany = mockWishFindMany;
    mockDb.list.findUnique = mockListFindUnique;
    mockDb.$transaction = mockDbTransaction;
    mockDb.listWish.createMany = mockListWishCreateMany;
  });

  it('prevents anonymous users from adding wishes to lists', async () => {
    mockGetCurrentUser.mockResolvedValueOnce(null);

    const request = new NextRequest('http://localhost:3000/api/wishes/bulk/add-to-list', {
      method: 'POST',
    });
    // Mock the json() method
    request.json = jest.fn().mockResolvedValue({ wishIds: ['1', '2', '3'], listId: 'list-1' });

    const response = await POST(request);
    const data = (await response.json()) as { error: string };

    expect(response.status).toBe(401);
    expect(data.error).toBe('Unauthorized');
  });

  it('requires users to specify both wishes and target list', async () => {
    mockGetCurrentUser.mockResolvedValueOnce(createMockUser('user-1'));

    const request = new NextRequest('http://localhost:3000/api/wishes/bulk/add-to-list', {
      method: 'POST',
    });
    // Mock the json() method
    request.json = jest.fn().mockResolvedValue({ wishIds: ['1', '2', '3'] });

    const response = await POST(request);
    const data = (await response.json()) as { error: string };

    expect(response.status).toBe(400);
    expect(data.error).toBe('wishIds array and listId are required');
  });

  it('prevents users from submitting empty bulk addition requests', async () => {
    mockGetCurrentUser.mockResolvedValueOnce(createMockUser('user-1'));

    const request = new NextRequest('http://localhost:3000/api/wishes/bulk/add-to-list', {
      method: 'POST',
    });
    // Mock the json() method
    request.json = jest.fn().mockResolvedValue({ wishIds: [], listId: 'list-1' });

    const response = await POST(request);
    const data = (await response.json()) as { error: string };

    expect(response.status).toBe(400);
    expect(data.error).toBe('wishIds cannot be empty');
  });

  it('prevents users from adding wishes to lists they do not own', async () => {
    const userId = 'user-1';
    const listId = 'list-1';
    const wishIds = ['wish-1', 'wish-2'];

    mockGetCurrentUser.mockResolvedValueOnce(createMockUser(userId));

    // Mock that list doesn't exist or user doesn't own it
    mockListFindUnique.mockResolvedValueOnce(null);
    // Also need to mock findFirst since the route uses that
    mockDb.list.findFirst = jest.fn().mockResolvedValueOnce(null);

    const request = new NextRequest('http://localhost:3000/api/wishes/bulk/add-to-list', {
      method: 'POST',
    });
    // Mock the json() method
    request.json = jest.fn().mockResolvedValue({ wishIds, listId });

    const response = await POST(request);
    const data = (await response.json()) as { error: string };

    expect(response.status).toBe(404);
    expect(data.error).toBe('List not found or you do not have permission');
  });

  it('prevents users from adding wishes they do not own to their lists', async () => {
    const userId = 'user-1';
    const listId = 'list-1';
    const wishIds = ['wish-1', 'wish-2', 'wish-3'];

    mockGetCurrentUser.mockResolvedValueOnce(createMockUser(userId));

    // Mock that list exists and user owns it
    mockListFindUnique.mockResolvedValueOnce(createMockList(listId, userId));
    // Also need to mock findFirst since the route uses that
    mockDb.list.findFirst = jest.fn().mockResolvedValueOnce(createMockList(listId, userId));

    // Mock that only 2 of 3 wishes belong to the user
    mockWishFindMany.mockResolvedValueOnce([
      createMockWish('wish-1', userId),
      createMockWish('wish-2', userId),
    ]);

    const request = new NextRequest('http://localhost:3000/api/wishes/bulk/add-to-list', {
      method: 'POST',
    });
    // Mock the json() method
    request.json = jest.fn().mockResolvedValue({ wishIds, listId });

    const response = await POST(request);
    const data = (await response.json()) as { error: string; unauthorized: string[] };

    expect(response.status).toBe(403);
    expect(data.error).toBe('You do not have permission to add some of these wishes');
    expect(data.unauthorized).toEqual(['wish-3']);
  });

  it('avoids duplicate entries when adding wishes already in a list', async () => {
    const userId = 'user-1';
    const listId = 'list-1';
    const wishIds = ['wish-1', 'wish-2', 'wish-3'];

    mockGetCurrentUser.mockResolvedValueOnce(createMockUser(userId));

    // Mock that list exists and user owns it
    mockListFindUnique.mockResolvedValueOnce(createMockList(listId, userId));
    // Also need to mock findFirst since the route uses that
    mockDb.list.findFirst = jest.fn().mockResolvedValueOnce(createMockList(listId, userId));

    // Mock that all wishes belong to the user
    mockWishFindMany.mockResolvedValueOnce([
      createMockWish('wish-1', userId),
      createMockWish('wish-2', userId),
      createMockWish('wish-3', userId),
    ]);

    // Mock transaction to execute the callback
    mockDbTransaction.mockImplementationOnce(async <T>(callback: PrismaTransactionCallback<T>) => {
      return callback(mockDb as unknown as PrismaClient);
    });

    // Mock that wish-1 is already in the list
    mockDb.listWish.findMany.mockResolvedValueOnce([createMockListWish('wish-1', listId)]);

    // Mock successful addition of new wishes
    mockDb.listWish.createMany.mockResolvedValueOnce({ count: 2 });

    const request = new NextRequest('http://localhost:3000/api/wishes/bulk/add-to-list', {
      method: 'POST',
    });
    // Mock the json() method
    request.json = jest.fn().mockResolvedValue({ wishIds, listId });

    const response = await POST(request);
    const data = (await response.json()) as { added: number; skipped: number; errors?: unknown };

    expect(response.status).toBe(200);
    expect(data.added).toBe(2);
    expect(data.skipped).toBe(1);
    expect(data.errors).toBeUndefined();

    // Verify createMany was called with only new wishes
    expect(mockListWishCreateMany).toHaveBeenCalledWith({
      data: [
        { wishId: 'wish-2', listId },
        { wishId: 'wish-3', listId },
      ],
    });
  });

  it('informs users when all selected wishes are already in the list', async () => {
    const userId = 'user-1';
    const listId = 'list-1';
    const wishIds = ['wish-1', 'wish-2'];

    mockGetCurrentUser.mockResolvedValueOnce(createMockUser(userId));

    // Mock that list exists and user owns it
    mockListFindUnique.mockResolvedValueOnce(createMockList(listId, userId));
    // Also need to mock findFirst since the route uses that
    mockDb.list.findFirst = jest.fn().mockResolvedValueOnce(createMockList(listId, userId));

    // Mock that all wishes belong to the user
    mockWishFindMany.mockResolvedValueOnce([
      createMockWish('wish-1', userId),
      createMockWish('wish-2', userId),
    ]);

    // Mock transaction to execute the callback
    mockDbTransaction.mockImplementationOnce(async <T>(callback: PrismaTransactionCallback<T>) => {
      return callback(mockDb as unknown as PrismaClient);
    });

    // Mock that all wishes are already in the list
    mockDb.listWish.findMany.mockResolvedValueOnce([
      createMockListWish('wish-1', listId),
      createMockListWish('wish-2', listId),
    ]);

    const request = new NextRequest('http://localhost:3000/api/wishes/bulk/add-to-list', {
      method: 'POST',
    });
    // Mock the json() method
    request.json = jest.fn().mockResolvedValue({ wishIds, listId });

    const response = await POST(request);
    const data = (await response.json()) as { added: number; skipped: number; message: string };

    expect(response.status).toBe(200);
    expect(data.added).toBe(0);
    expect(data.skipped).toBe(2);
    expect(data.message).toBe('All wishes are already in the list');
  });

  it('provides error feedback when bulk addition encounters database issues', async () => {
    const userId = 'user-1';
    const listId = 'list-1';
    const wishIds = ['wish-1', 'wish-2'];

    mockGetCurrentUser.mockResolvedValueOnce(createMockUser(userId));

    // Mock that list exists and user owns it
    mockListFindUnique.mockResolvedValueOnce(createMockList(listId, userId));
    // Also need to mock findFirst since the route uses that
    mockDb.list.findFirst = jest.fn().mockResolvedValueOnce(createMockList(listId, userId));

    // Mock that all wishes belong to the user
    mockWishFindMany.mockResolvedValueOnce([
      createMockWish('wish-1', userId),
      createMockWish('wish-2', userId),
    ]);

    // Mock transaction to throw an error
    mockDb.$transaction.mockRejectedValueOnce(new Error('Database error'));

    const request = new NextRequest('http://localhost:3000/api/wishes/bulk/add-to-list', {
      method: 'POST',
    });
    // Mock the json() method
    request.json = jest.fn().mockResolvedValue({ wishIds, listId });

    const response = await POST(request);
    const data = (await response.json()) as { error: string };

    expect(response.status).toBe(500);
    expect(data.error).toBe('Failed to add wishes to list');
  });

  it('rejects malformed bulk addition requests', async () => {
    mockGetCurrentUser.mockResolvedValueOnce(createMockUser('user-1'));

    const request = new NextRequest('http://localhost:3000/api/wishes/bulk/add-to-list', {
      method: 'POST',
    });
    // Mock the json() method to throw an error
    request.json = jest.fn().mockRejectedValue(new Error('Invalid JSON'));

    const response = await POST(request);
    const data = (await response.json()) as { error: string };

    expect(response.status).toBe(400);
    expect(data.error).toBe('Invalid request body');
  });
});
