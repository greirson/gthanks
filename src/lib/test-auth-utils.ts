import { getCurrentUser as originalGetCurrentUser } from './auth-utils';
import { db } from './db';

// Override getCurrentUser for integration tests
export async function getCurrentUser() {
  // Check if we're in test mode
  if (process.env.NODE_ENV === 'test') {
    // Check for test headers
    const { headers } = await import('next/headers');
    const headersList = headers();
    const testUserId = headersList.get('x-test-user-id');
    const testUserEmail = headersList.get('x-test-user-email');

    if (testUserId && testUserEmail) {
      // Fetch the test user from database
      const user = await db.user.findUnique({
        where: { id: testUserId },
        select: {
          id: true,
          name: true,
          email: true,
          avatarUrl: true,
          role: true,
          isAdmin: true,
          createdAt: true,
          lastLoginAt: true,
        },
      });

      if (user) {
        return {
          id: user.id,
          name: user.name || null,
          email: user.email || null,
          image: null,
          avatarUrl: user.avatarUrl,
          role: user.role || 'user',
          isAdmin: user.isAdmin || false,
          createdAt: user.createdAt || new Date(),
          lastLoginAt: user.lastLoginAt || null,
          authMethod: 'test' as const,
        };
      }
    }
  }

  // Fall back to original implementation
  return originalGetCurrentUser();
}
