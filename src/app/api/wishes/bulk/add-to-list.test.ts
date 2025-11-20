// Mock dependencies BEFORE imports
jest.mock('@/lib/auth-utils');
jest.mock('@/lib/services/wish-service');
jest.mock('@/lib/services/logger', () => ({
  logger: {
    error: jest.fn(),
  },
}));
jest.mock('@/lib/services/image-processor');

import { NextRequest } from 'next/server';

import { getCurrentUser } from '@/lib/auth-utils';
import { NotFoundError, ForbiddenError } from '@/lib/errors';
import { wishService } from '@/lib/services/wish-service';
import type { CurrentUser } from '@/lib/test-utils/mock-types';

import { POST } from './add-to-list/route';

const mockGetCurrentUser = jest.mocked(getCurrentUser);
const mockWishService = jest.mocked(wishService);

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

describe('POST /api/wishes/bulk/add-to-list', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('prevents anonymous users from adding wishes to lists', async () => {
    mockGetCurrentUser.mockResolvedValueOnce(null);

    const request = new NextRequest('http://localhost:3000/api/wishes/bulk/add-to-list', {
      method: 'POST',
    });
    // Mock the json() method
    request.json = jest.fn().mockResolvedValue({
      wishIds: [
        '00000000-0000-0000-0000-000000000001',
        '00000000-0000-0000-0000-000000000002',
        '00000000-0000-0000-0000-000000000003',
      ],
      listId: '00000000-0000-0000-0000-000000000011',
    });

    const response = await POST(request);
    const data = (await response.json()) as { error: string };

    expect(response.status).toBe(401);
    expect(data.error).toBe('Please sign in to continue');
  });

  it('requires users to specify both wishes and target list', async () => {
    mockGetCurrentUser.mockResolvedValueOnce(createMockUser('user-1'));

    const request = new NextRequest('http://localhost:3000/api/wishes/bulk/add-to-list', {
      method: 'POST',
    });
    // Mock the json() method
    request.json = jest.fn().mockResolvedValue({
      wishIds: [
        '00000000-0000-0000-0000-000000000001',
        '00000000-0000-0000-0000-000000000002',
        '00000000-0000-0000-0000-000000000003',
      ],
    });

    const response = await POST(request);
    const data = (await response.json()) as { error: string };

    expect(response.status).toBe(400);
    expect(data.error).toBe('Please check your information and try again');
  });

  it('prevents users from submitting empty bulk addition requests', async () => {
    mockGetCurrentUser.mockResolvedValueOnce(createMockUser('user-1'));

    const request = new NextRequest('http://localhost:3000/api/wishes/bulk/add-to-list', {
      method: 'POST',
    });
    // Mock the json() method
    request.json = jest
      .fn()
      .mockResolvedValue({ wishIds: [], listId: '00000000-0000-0000-0000-000000000011' });

    const response = await POST(request);
    const data = (await response.json()) as { error: string };

    expect(response.status).toBe(400);
    expect(data.error).toBe('Please check your information and try again');
  });

  it('prevents users from adding wishes to lists they do not own', async () => {
    const userId = 'user-1';
    const listId = '00000000-0000-0000-0000-000000000011';
    const wishIds = [
      '00000000-0000-0000-0000-000000000001',
      '00000000-0000-0000-0000-000000000002',
    ];

    mockGetCurrentUser.mockResolvedValueOnce(createMockUser(userId));

    // Mock service throwing NotFoundError
    mockWishService.addWishesToList.mockRejectedValueOnce(
      new NotFoundError('List not found or you do not have permission')
    );

    const request = new NextRequest('http://localhost:3000/api/wishes/bulk/add-to-list', {
      method: 'POST',
    });
    // Mock the json() method
    request.json = jest.fn().mockResolvedValue({ wishIds, listId });

    const response = await POST(request);
    const data = (await response.json()) as { error: string };

    expect(response.status).toBe(404);
    expect(data.error).toBe("We couldn't find what you're looking for");
  });

  it('prevents users from adding wishes they do not own to their lists', async () => {
    const userId = 'user-1';
    const listId = '00000000-0000-0000-0000-000000000011';
    const wishIds = [
      '00000000-0000-0000-0000-000000000001',
      '00000000-0000-0000-0000-000000000002',
      '00000000-0000-0000-0000-000000000003',
    ];

    mockGetCurrentUser.mockResolvedValueOnce(createMockUser(userId));

    // Mock service throwing ForbiddenError with unauthorized IDs
    const error = new ForbiddenError("Cannot add wishes you don't own: wish-3");
    (error as any).unauthorized = ['wish-3'];
    mockWishService.addWishesToList.mockRejectedValueOnce(error);

    const request = new NextRequest('http://localhost:3000/api/wishes/bulk/add-to-list', {
      method: 'POST',
    });
    // Mock the json() method
    request.json = jest.fn().mockResolvedValue({ wishIds, listId });

    const response = await POST(request);
    const data = (await response.json()) as { error: string; code: string };

    expect(response.status).toBe(403);
    expect(data.error).toBe("You don't have permission to do that");
  });

  it('avoids duplicate entries when adding wishes already in a list', async () => {
    const userId = 'user-1';
    const listId = '00000000-0000-0000-0000-000000000011';
    const wishIds = [
      '00000000-0000-0000-0000-000000000001',
      '00000000-0000-0000-0000-000000000002',
      '00000000-0000-0000-0000-000000000003',
    ];

    mockGetCurrentUser.mockResolvedValueOnce(createMockUser(userId));

    // Mock service returning result with some skipped
    mockWishService.addWishesToList.mockResolvedValueOnce({
      added: 2,
      skipped: 1,
    });

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

    // Verify service was called correctly
    expect(mockWishService.addWishesToList).toHaveBeenCalledWith(wishIds, listId, userId);
  });

  it('informs users when all selected wishes are already in the list', async () => {
    const userId = 'user-1';
    const listId = '00000000-0000-0000-0000-000000000011';
    const wishIds = [
      '00000000-0000-0000-0000-000000000001',
      '00000000-0000-0000-0000-000000000002',
    ];

    mockGetCurrentUser.mockResolvedValueOnce(createMockUser(userId));

    // Mock service returning all skipped
    mockWishService.addWishesToList.mockResolvedValueOnce({
      added: 0,
      skipped: 2,
    });

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
    const listId = '00000000-0000-0000-0000-000000000011';
    const wishIds = [
      '00000000-0000-0000-0000-000000000001',
      '00000000-0000-0000-0000-000000000002',
    ];

    mockGetCurrentUser.mockResolvedValueOnce(createMockUser(userId));

    // Mock service throwing generic error
    mockWishService.addWishesToList.mockRejectedValueOnce(new Error('Database error'));

    const request = new NextRequest('http://localhost:3000/api/wishes/bulk/add-to-list', {
      method: 'POST',
    });
    // Mock the json() method
    request.json = jest.fn().mockResolvedValue({ wishIds, listId });

    const response = await POST(request);
    const data = (await response.json()) as { error: string };

    expect(response.status).toBe(500);
    expect(data.error).toBe('Something went wrong. Please try again');
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

    expect(response.status).toBe(500);
    expect(data.error).toBe('Something went wrong. Please try again');
  });
});
