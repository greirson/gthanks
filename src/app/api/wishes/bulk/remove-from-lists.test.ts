import type { PrismaClient, Wish } from '@prisma/client';

import { NextRequest } from 'next/server';

import { getCurrentUser } from '@/lib/auth-utils';
import { db } from '@/lib/db';
import type { CurrentUser, PrismaTransactionCallback } from '@/lib/test-utils/mock-types';

import { POST } from './remove-from-lists/route';

// Mock dependencies
jest.mock('@/lib/auth-utils');
jest.mock('@/lib/services/wish-service', () => ({
  wishService: {
    removeWishesFromLists: jest.fn(),
  },
}));
jest.mock('@/lib/db', () => ({
  db: {
    $transaction: jest.fn(),
    wish: {
      findMany: jest.fn(),
    },
    listWish: {
      deleteMany: jest.fn(),
    },
    list: {
      updateMany: jest.fn(),
    },
  },
}));

const mockGetCurrentUser = jest.mocked(getCurrentUser);
const mockDb = jest.mocked(db);

// Create explicit mock functions to avoid unbound method errors
const mockWishFindMany = jest.fn();
const mockDbTransaction = jest.fn();
const mockListWishDeleteMany = jest.fn();

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

describe('POST /api/wishes/bulk/remove-from-lists', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockDb.wish.findMany = mockWishFindMany;
    mockDb.$transaction = mockDbTransaction;
    mockDb.listWish.deleteMany = mockListWishDeleteMany;
  });

  it('prevents anonymous users from removing wishes from lists', async () => {
    mockGetCurrentUser.mockResolvedValueOnce(null);

    const request = new NextRequest('http://localhost:3000/api/wishes/bulk/remove-from-lists', {
      method: 'POST',
    });
    // Mock the json() method
    request.json = jest.fn().mockResolvedValue({ wishIds: ['1', '2', '3'] });

    const response = await POST(request);
    const data = (await response.json()) as { error: string };

    expect(response.status).toBe(401);
    expect(data.error).toBe('Unauthorized');
  });

  it('requires users to specify which wishes to remove', async () => {
    mockGetCurrentUser.mockResolvedValueOnce(createMockUser('user-1'));

    const request = new NextRequest('http://localhost:3000/api/wishes/bulk/remove-from-lists', {
      method: 'POST',
    });
    // Mock the json() method
    request.json = jest.fn().mockResolvedValue({ notWishIds: ['1', '2', '3'] });

    const response = await POST(request);
    const data = (await response.json()) as { error: string };

    expect(response.status).toBe(400);
    expect(data.error).toBe('wishIds array is required');
  });

  it('prevents users from submitting empty bulk removal requests', async () => {
    mockGetCurrentUser.mockResolvedValueOnce(createMockUser('user-1'));

    const request = new NextRequest('http://localhost:3000/api/wishes/bulk/remove-from-lists', {
      method: 'POST',
    });
    // Mock the json() method
    request.json = jest.fn().mockResolvedValue({ wishIds: [] });

    const response = await POST(request);
    const data = (await response.json()) as { error: string };

    expect(response.status).toBe(400);
    expect(data.error).toBe('wishIds cannot be empty');
  });

  it('prevents users from removing wishes they do not own', async () => {
    const userId = 'user-1';
    const wishIds = ['wish-1', 'wish-2', 'wish-3'];

    mockGetCurrentUser.mockResolvedValueOnce(createMockUser(userId));

    // Mock that only 2 of 3 wishes belong to the user
    mockWishFindMany.mockResolvedValueOnce([
      createMockWish('wish-1', userId),
      createMockWish('wish-2', userId),
    ]);

    const request = new NextRequest('http://localhost:3000/api/wishes/bulk/remove-from-lists', {
      method: 'POST',
    });
    // Mock the json() method
    request.json = jest.fn().mockResolvedValue({ wishIds });

    const response = await POST(request);
    const data = (await response.json()) as { error: string; unauthorized: string[] };

    expect(response.status).toBe(403);
    expect(data.error).toBe('You do not have permission to remove some of these wishes');
    expect(data.unauthorized).toEqual(['wish-3']);
  });

  it('allows users to remove their wishes from all lists at once', async () => {
    const userId = 'user-1';
    const wishIds = ['wish-1', 'wish-2', 'wish-3'];

    mockGetCurrentUser.mockResolvedValueOnce(createMockUser(userId));

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

    // Mock successful removals
    mockDb.listWish.deleteMany.mockResolvedValueOnce({ count: 7 });

    const request = new NextRequest('http://localhost:3000/api/wishes/bulk/remove-from-lists', {
      method: 'POST',
    });
    // Mock the json() method
    request.json = jest.fn().mockResolvedValue({ wishIds });

    const response = await POST(request);
    const data = (await response.json()) as { removed: number; errors?: unknown };

    expect(response.status).toBe(200);
    expect(data.removed).toBe(7);
    expect(data.errors).toBeUndefined();

    // Verify transaction was used
    expect(mockDbTransaction).toHaveBeenCalled();

    // Verify wishes were removed from all lists
    expect(mockListWishDeleteMany).toHaveBeenCalledWith({
      where: {
        wishId: { in: wishIds },
      },
    });
  });

  it('gracefully handles removal requests for wishes not in any lists', async () => {
    const userId = 'user-1';
    const wishIds = ['wish-1', 'wish-2'];

    mockGetCurrentUser.mockResolvedValueOnce(createMockUser(userId));

    // Mock that all wishes belong to the user
    mockWishFindMany.mockResolvedValueOnce([
      createMockWish('wish-1', userId),
      createMockWish('wish-2', userId),
    ]);

    // Mock transaction to execute the callback
    mockDbTransaction.mockImplementationOnce(async <T>(callback: PrismaTransactionCallback<T>) => {
      return callback(mockDb as unknown as PrismaClient);
    });

    // Mock that no wishes were in any lists
    mockDb.listWish.deleteMany.mockResolvedValueOnce({ count: 0 });

    const request = new NextRequest('http://localhost:3000/api/wishes/bulk/remove-from-lists', {
      method: 'POST',
    });
    // Mock the json() method
    request.json = jest.fn().mockResolvedValue({ wishIds });

    const response = await POST(request);
    const data = (await response.json()) as { removed: number; message: string };

    expect(response.status).toBe(200);
    expect(data.removed).toBe(0);
    expect(data.message).toBe('No wishes were found in any lists');
  });

  it('provides error feedback when bulk removal encounters database issues', async () => {
    const userId = 'user-1';
    const wishIds = ['wish-1', 'wish-2'];

    mockGetCurrentUser.mockResolvedValueOnce(createMockUser(userId));

    // Mock that all wishes belong to the user
    mockWishFindMany.mockResolvedValueOnce([
      createMockWish('wish-1', userId),
      createMockWish('wish-2', userId),
    ]);

    // Mock transaction to throw an error
    mockDb.$transaction.mockRejectedValueOnce(new Error('Database error'));

    const request = new NextRequest('http://localhost:3000/api/wishes/bulk/remove-from-lists', {
      method: 'POST',
    });
    // Mock the json() method
    request.json = jest.fn().mockResolvedValue({ wishIds });

    const response = await POST(request);
    const data = (await response.json()) as { error: string };

    expect(response.status).toBe(500);
    expect(data.error).toBe('Failed to remove wishes from lists');
  });

  it('rejects malformed bulk removal requests', async () => {
    mockGetCurrentUser.mockResolvedValueOnce(createMockUser('user-1'));

    const request = new NextRequest('http://localhost:3000/api/wishes/bulk/remove-from-lists', {
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
