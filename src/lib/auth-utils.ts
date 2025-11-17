import { getServerSession } from 'next-auth';

import { authOptions } from '@/lib/auth';
import { resolveAvatarUrlSync } from '@/lib/avatar-utils';
import { db } from '@/lib/db';

export async function getSession() {
  return await getServerSession(authOptions);
}

export async function getCurrentUser() {
  const session = await getSession();
  if (session?.user) {
    // Fetch user from database to get proper avatarUrl instead of using OAuth image data URI
    const dbUser = await db.user.findUnique({
      where: { id: session.user.id },
      select: {
        id: true,
        name: true,
        email: true,
        avatarUrl: true,
        role: true,
        isAdmin: true,
        createdAt: true,
        lastLoginAt: true,
        username: true,
        canUseVanityUrls: true,
        showPublicProfile: true,
        usernameSetAt: true,
      },
    });

    if (dbUser) {
      // Return user data with proper avatarUrl from database, not session.user.image
      return {
        id: dbUser.id,
        name: dbUser.name || null,
        email: dbUser.email || null,
        image: session.user.image || null, // Keep OAuth image for reference if needed
        avatarUrl: resolveAvatarUrlSync(dbUser), // Resolve avatar from avatarUrl/avatarData
        role: dbUser.role || 'user',
        isAdmin: dbUser.isAdmin || false,
        createdAt: dbUser.createdAt || new Date(),
        lastLoginAt: dbUser.lastLoginAt || null,
        username: dbUser.username,
        canUseVanityUrls: dbUser.canUseVanityUrls,
        showPublicProfile: dbUser.showPublicProfile,
        usernameSetAt: dbUser.usernameSetAt,
        authMethod: 'session' as const,
      };
    }
  }

  return null;
}

export async function requireAuth() {
  const user = await getCurrentUser();
  if (!user) {
    throw new Error('Authentication required');
  }
  return user;
}
