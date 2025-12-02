import { type NextRequest } from 'next/server';
import { getServerSession } from 'next-auth';

import { authOptions } from '@/lib/auth';
import { resolveAvatarUrlSync } from '@/lib/avatar-utils';
import { db } from '@/lib/db';
import { tokenService } from '@/lib/services/token-service';

/**
 * Result of dual authentication check (token or session)
 */
export interface AuthResult {
  /** User ID */
  userId: string;
  /** How the user was authenticated */
  authMethod: 'token' | 'session';
  /** Token record ID (only set when authMethod is 'token') */
  tokenId?: string;
  /** User's display name */
  name: string | null;
  /** User's email address */
  email: string | null;
}

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

/**
 * Extract client IP address from request headers
 */
function getClientIp(request: NextRequest): string | undefined {
  return (
    request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ||
    request.headers.get('x-real-ip') ||
    undefined
  );
}

/**
 * Authenticate via Bearer token or session
 *
 * Checks for Bearer token header first, validates via tokenService,
 * then falls back to session auth if no Bearer token present.
 *
 * IMPORTANT: If a Bearer token is present but invalid, returns null
 * (does NOT fall back to session auth - explicit token auth failed)
 *
 * @param request - NextRequest object with headers
 * @returns AuthResult with user info or null if not authenticated
 *
 * @example
 * export async function GET(request: NextRequest) {
 *   const auth = await getCurrentUserOrToken(request);
 *   if (!auth) {
 *     return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
 *   }
 *   // auth.userId, auth.authMethod, auth.tokenId (if token auth)
 * }
 */
export async function getCurrentUserOrToken(request: NextRequest): Promise<AuthResult | null> {
  // 1. Check for Bearer token
  const authHeader = request.headers.get('authorization');
  if (authHeader?.startsWith('Bearer gth_')) {
    const token = authHeader.slice(7); // Remove 'Bearer ' prefix
    const clientIp = getClientIp(request);

    const validated = await tokenService.validateAccessToken(token, clientIp);
    if (validated) {
      // Fetch minimal user info for the response
      const user = await db.user.findUnique({
        where: { id: validated.userId },
        select: {
          id: true,
          name: true,
          email: true,
        },
      });

      if (user) {
        return {
          userId: validated.userId,
          authMethod: 'token',
          tokenId: validated.tokenId,
          name: user.name,
          email: user.email,
        };
      }
    }
    // Invalid token - don't fall back to session (explicit token auth failed)
    return null;
  }

  // 2. Fall back to session auth
  const user = await getCurrentUser();
  if (user) {
    return {
      userId: user.id,
      authMethod: 'session',
      name: user.name,
      email: user.email,
    };
  }

  return null;
}
