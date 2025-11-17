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
import { ForbiddenError } from '@/lib/errors';
import { wishService } from '@/lib/services/wish-service';
import type { CurrentUser } from '@/lib/test-utils/mock-types';

import { POST } from './remove-from-lists/route';

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

describe('POST /api/wishes/bulk/remove-from-lists', () => {
  beforeEach(() => {
    jest.clearAllMocks();
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
    expect(data.error).toBe('Please sign in to continue');
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
    expect(data.error).toBe('Please check your information and try again');
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
    expect(data.error).toBe('Please check your information and try again');
  });

  it('prevents users from removing wishes they do not own', async () => {
    const userId = 'user-1';
    const wishIds = ['wish-1', 'wish-2', 'wish-3'];

    mockGetCurrentUser.mockResolvedValueOnce(createMockUser(userId));

    // Mock service throwing ForbiddenError
    mockWishService.removeWishesFromLists.mockRejectedValueOnce(
      new ForbiddenError("Cannot remove wishes you don't own: wish-3")
    );

    const request = new NextRequest('http://localhost:3000/api/wishes/bulk/remove-from-lists', {
      method: 'POST',
    });
    // Mock the json() method
    request.json = jest.fn().mockResolvedValue({ wishIds });

    const response = await POST(request);
    const data = (await response.json()) as { error: string; code: string };

    expect(response.status).toBe(403);
    expect(data.error).toBe("You don't have permission to do that");
  });

  it('allows users to remove their wishes from all lists at once', async () => {
    const userId = 'user-1';
    const wishIds = ['wish-1', 'wish-2', 'wish-3'];

    mockGetCurrentUser.mockResolvedValueOnce(createMockUser(userId));

    // Mock service returning successful removal
    mockWishService.removeWishesFromLists.mockResolvedValueOnce({
      removed: 7,
    });

    const request = new NextRequest('http://localhost:3000/api/wishes/bulk/remove-from-lists', {
      method: 'POST',
    });
    // Mock the json() method
    request.json = jest.fn().mockResolvedValue({ wishIds });

    const response = await POST(request);
    const data = (await response.json()) as { removed: number };

    expect(response.status).toBe(200);
    expect(data.removed).toBe(7);

    // Verify service was called correctly
    expect(mockWishService.removeWishesFromLists).toHaveBeenCalledWith(wishIds, userId);
  });

  it('gracefully handles removal requests for wishes not in any lists', async () => {
    const userId = 'user-1';
    const wishIds = ['wish-1', 'wish-2'];

    mockGetCurrentUser.mockResolvedValueOnce(createMockUser(userId));

    // Mock service returning no removals
    mockWishService.removeWishesFromLists.mockResolvedValueOnce({
      removed: 0,
    });

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

    // Mock service throwing generic error
    mockWishService.removeWishesFromLists.mockRejectedValueOnce(new Error('Database error'));

    const request = new NextRequest('http://localhost:3000/api/wishes/bulk/remove-from-lists', {
      method: 'POST',
    });
    // Mock the json() method
    request.json = jest.fn().mockResolvedValue({ wishIds });

    const response = await POST(request);
    const data = (await response.json()) as { error: string };

    expect(response.status).toBe(500);
    expect(data.error).toBe('Something went wrong. Please try again');
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

    expect(response.status).toBe(500);
    expect(data.error).toBe('Something went wrong. Please try again');
  });
});
