import { NextRequest, NextResponse } from 'next/server';

import { getCurrentUser } from '@/lib/auth-utils';
import { getUserFriendlyError } from '@/lib/errors';
// eslint-disable-next-line local-rules/no-direct-db-import -- Avatar file serving requires direct db query; read-only operation with no business logic
import { db } from '@/lib/db';
import { logger } from '@/lib/services/logger';

/**
 * GET /api/user/avatar/[userId] - Serves user avatar images by user ID
 *
 * @description Serves a specific user's avatar image with proper Content-Type headers.
 * Requires authentication to prevent unauthorized avatar access.
 */
export async function GET(request: NextRequest, { params }: { params: { userId: string } }) {
  try {
    // Check authentication
    const currentUser = await getCurrentUser();
    if (!currentUser) {
      return NextResponse.json(
        { error: getUserFriendlyError('UNAUTHORIZED'), code: 'UNAUTHORIZED' },
        { status: 401 }
      );
    }

    const { userId } = params;

    // Fetch user's avatar URL
    const user = await db.user.findUnique({
      where: { id: userId },
      select: {
        avatarUrl: true,
      },
    });

    if (!user) {
      return NextResponse.json(
        { error: getUserFriendlyError('NOT_FOUND', 'User not found'), code: 'NOT_FOUND' },
        { status: 404 }
      );
    }

    // If user has an avatarUrl that points to a file, serve it
    if (user.avatarUrl && user.avatarUrl.startsWith('/uploads/')) {
      // For MVP, redirect to the static file
      // In production, you might want to serve the file directly
      return NextResponse.redirect(new URL(user.avatarUrl, request.url));
    }

    // No avatar found
    return NextResponse.json(
      { error: getUserFriendlyError('NOT_FOUND', 'No avatar found'), code: 'NOT_FOUND' },
      { status: 404 }
    );
  } catch (error) {
    logger.error({ error: error }, 'Avatar fetch error');
    return NextResponse.json(
      { error: getUserFriendlyError('INTERNAL_ERROR'), code: 'INTERNAL_ERROR' },
      { status: 500 }
    );
  }
}
