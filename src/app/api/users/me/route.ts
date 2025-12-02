import { NextRequest, NextResponse } from 'next/server';

import { getCurrentUserOrToken } from '@/lib/auth-utils';
import { getUserFriendlyError } from '@/lib/errors';
import { logger } from '@/lib/services/logger';
import { UserProfileService } from '@/lib/services/user-profile';

/**
 * @swagger
 * /api/users/me:
 *   get:
 *     summary: Get current authenticated user
 *     description: |
 *       Returns the current user's basic information.
 *       Supports both session authentication (web) and Bearer token authentication (API/extensions).
 *     tags:
 *       - Users
 *     security:
 *       - bearerAuth: []
 *       - sessionAuth: []
 *     responses:
 *       200:
 *         description: Current user information
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 id:
 *                   type: string
 *                   description: User ID
 *                 name:
 *                   type: string
 *                   nullable: true
 *                   description: User display name
 *                 email:
 *                   type: string
 *                   format: email
 *                   nullable: true
 *                   description: User email address
 *                 username:
 *                   type: string
 *                   nullable: true
 *                   description: User's unique username
 *                 avatarUrl:
 *                   type: string
 *                   nullable: true
 *                   description: URL to user's avatar image
 *               required:
 *                 - id
 *       401:
 *         description: Unauthorized - No valid session or token
 *       500:
 *         description: Internal server error
 */
export async function GET(request: NextRequest) {
  try {
    const auth = await getCurrentUserOrToken(request);

    if (!auth) {
      return NextResponse.json(
        { error: getUserFriendlyError('UNAUTHORIZED'), code: 'UNAUTHORIZED' },
        { status: 401 }
      );
    }

    // Fetch user profile using service layer
    const profile = await UserProfileService.getProfile(auth.userId);

    if (!profile) {
      // User was deleted after token was issued
      return NextResponse.json(
        { error: getUserFriendlyError('NOT_FOUND'), code: 'USER_NOT_FOUND' },
        { status: 404 }
      );
    }

    return NextResponse.json({
      id: profile.id,
      name: profile.name,
      email: profile.email,
      username: profile.username,
      avatarUrl: profile.avatarUrl,
    });
  } catch (error) {
    logger.error({ error }, 'Get current user error');
    return NextResponse.json(
      { error: getUserFriendlyError('INTERNAL_ERROR'), code: 'INTERNAL_ERROR' },
      { status: 500 }
    );
  }
}
