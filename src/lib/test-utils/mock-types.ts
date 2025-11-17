/**
 * Type-safe mock helpers for tests
 * This module provides properly typed mocks to avoid using 'any' in tests
 */
import type { PrismaClient } from '@prisma/client';

import type { getCurrentUser } from '@/lib/auth-utils';

// Type for getCurrentUser return value
export type CurrentUser = Awaited<ReturnType<typeof getCurrentUser>>;

// Type for getCurrentUser function
export type GetCurrentUserType = typeof getCurrentUser;

// Type for Prisma transaction callback
export type PrismaTransactionCallback<T> = (tx: PrismaClient) => Promise<T>;

// Helper to create a properly typed mock getCurrentUser
export function createMockGetCurrentUser() {
  return jest.fn<ReturnType<GetCurrentUserType>, Parameters<GetCurrentUserType>>();
}

// Helper to create a properly typed mock user
export function createMockUser(
  idOrOverrides?: string | Partial<NonNullable<CurrentUser>>
): NonNullable<CurrentUser> {
  const overrides = typeof idOrOverrides === 'string' ? { id: idOrOverrides } : idOrOverrides;
  return {
    id: 'user-123',
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
    ...overrides,
  };
}

// Helper to create a mock Prisma transaction
export function createMockTransaction<T>(mockDb: PrismaClient) {
  return (callback: PrismaTransactionCallback<T>) => callback(mockDb);
}
