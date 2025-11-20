import { NextRequest } from 'next/server';

import { getCurrentUser } from '@/lib/auth-utils';
import { db } from '@/lib/db';

import { POST } from './route';

// Mock dependencies
jest.mock('@/lib/auth-utils');
jest.mock('sharp', () => jest.fn());
jest.mock('@/lib/services/wish-service', () => ({
  wishService: {
    deleteWishes: jest.fn(),
  },
}));
jest.mock('@/lib/db', () => ({
  db: {
    wish: {
      findMany: jest.fn(),
      deleteMany: jest.fn(),
    },
    listWish: {
      deleteMany: jest.fn(),
    },
    $transaction: jest.fn(),
  },
}));

const mockGetCurrentUser = jest.mocked(getCurrentUser);
const mockDb = jest.mocked(db);

// Import mocked wishService
import { wishService } from '@/lib/services/wish-service';
const mockWishService = wishService as jest.Mocked<typeof wishService>;

// Create explicit mock functions to avoid unbound method errors
const mockWishFindMany = jest.fn();
const mockDbTransaction = jest.fn();

describe('Bulk Wish Deletion API', () => {
  const mockUser = {
    id: 'user123',
    email: 'test@example.com',
    name: 'Test User',
    image: null,
    avatarUrl: null,
    role: 'user',
    isAdmin: false,
    createdAt: new Date('2024-01-01'),
    lastLoginAt: new Date('2024-01-01'),
    authMethod: 'session' as const,
    username: null,
    usernameSetAt: null,
    canUseVanityUrls: true,
    showPublicProfile: false,
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('Successful bulk deletion', () => {
    it('allows users to delete multiple wishes they own in a single operation', async () => {
      mockGetCurrentUser.mockResolvedValue(mockUser);
      mockWishService.deleteWishes.mockResolvedValue({ deleted: 2 });

      const wishIds = [
        '00000000-0000-0000-0000-000000000001',
        '00000000-0000-0000-0000-000000000002',
      ];
      const request = new NextRequest('http://localhost:3000/api/wishes/bulk/delete', {
        method: 'POST',
      });
      // Mock the json() method
      request.json = jest.fn().mockResolvedValue({ wishIds });

      const response = await POST(request);
      const data = (await response.json()) as { deleted: number };

      // Test business behavior: Users can successfully delete their own wishes
      expect(response.status).toBe(200);
      expect(data).toEqual({ deleted: 2 });
      expect(mockWishService.deleteWishes).toHaveBeenCalledWith(wishIds, mockUser.id);
    });
  });

  describe('Ownership verification', () => {
    it('prevents users from deleting wishes they do not own', async () => {
      mockGetCurrentUser.mockResolvedValue(mockUser);

      const wishIds = [
        '00000000-0000-0000-0000-000000000001',
        '00000000-0000-0000-0000-000000000002',
        '00000000-0000-0000-0000-000000000003',
      ];
      const request = new NextRequest('http://localhost:3000/api/wishes/bulk/delete', {
        method: 'POST',
      });
      // Mock the json() method
      request.json = jest.fn().mockResolvedValue({ wishIds });

      // Mock wishService to throw ForbiddenError
      const { ForbiddenError } = require('@/lib/errors');
      mockWishService.deleteWishes.mockRejectedValue(
        new ForbiddenError("Cannot delete wishes you don't own: wish3")
      );

      const response = await POST(request);
      const data = (await response.json()) as { error: string; code: string };

      // Test business behavior: The API protects users' wishes from unauthorized deletion
      expect(response.status).toBe(403);
      expect(data.error).toBe("You don't have permission to do that");
      expect(data.code).toBe('FORBIDDEN');
    });
  });
});
