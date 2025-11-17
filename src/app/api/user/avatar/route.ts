import { fileTypeFromBuffer } from 'file-type';
import { NextRequest, NextResponse } from 'next/server';

import { getCurrentUser } from '@/lib/auth-utils';
import { getUserFriendlyError } from '@/lib/errors';
import { db } from '@/lib/db';
import { imageProcessor } from '@/lib/services/image-processor';
import { logger } from '@/lib/services/logger';

const MAX_AVATAR_SIZE = 2 * 1024 * 1024; // 2MB

export async function POST(request: NextRequest) {
  try {
    // Image uploads always enabled in MVP for avatars
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json(
        { error: getUserFriendlyError('UNAUTHORIZED'), code: 'UNAUTHORIZED' },
        { status: 401 }
      );
    }

    const formData = await request.formData();
    const avatarFile = formData.get('avatar') as File;

    if (!avatarFile) {
      return NextResponse.json(
        {
          error: getUserFriendlyError('VALIDATION_ERROR', 'No file provided'),
          code: 'VALIDATION_ERROR',
        },
        { status: 400 }
      );
    }

    // Convert file to buffer for validation
    const arrayBuffer = await avatarFile.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    // Validate file size (2MB max) - check actual buffer size, not client-provided size
    if (buffer.length > MAX_AVATAR_SIZE) {
      return NextResponse.json(
        {
          error: getUserFriendlyError('VALIDATION_ERROR', 'Avatar image too large. Maximum size is 2MB.'),
          code: 'VALIDATION_ERROR',
        },
        { status: 400 }
      );
    }

    // Security: Validate file type using magic bytes (not client MIME type)
    const fileType = await fileTypeFromBuffer(buffer);
    const allowedTypes = ['image/jpeg', 'image/png', 'image/gif', 'image/webp'];

    if (!fileType || !allowedTypes.includes(fileType.mime)) {
      return NextResponse.json(
        {
          error: getUserFriendlyError('VALIDATION_ERROR', 'Invalid file type. Only JPEG, PNG, GIF, and WebP images are allowed.'),
          code: 'VALIDATION_ERROR',
        },
        { status: 400 }
      );
    }

    // Process image using imageProcessor service (provides additional validation)
    // Note: imageProcessor uses MAX_DIMENSION=1200 and WEBP_QUALITY=80 from its constants
    const result = await imageProcessor.processImageFromBuffer(buffer);

    // Update user avatar with the file path (not base64)
    await db.user.update({
      where: { id: user.id },
      data: {
        avatarUrl: result.localPath,
        image: result.localPath, // For NextAuth compatibility
      },
    });

    return NextResponse.json({ avatarUrl: result.localPath });
  } catch (error) {
    logger.error({ error: error }, 'Avatar upload error');

    if (error instanceof Error && error.message.includes('Unsupported file type')) {
      return NextResponse.json(
        {
          error: getUserFriendlyError('VALIDATION_ERROR', 'Invalid file type. Only JPEG, PNG, GIF, and WebP images are allowed.'),
          code: 'VALIDATION_ERROR',
        },
        { status: 400 }
      );
    }

    return NextResponse.json(
      {
        error: getUserFriendlyError('INTERNAL_ERROR', 'Failed to process avatar upload'),
        code: 'INTERNAL_ERROR',
      },
      { status: 500 }
    );
  }
}

/**
 * GET /api/user/avatar - Serves user avatar images
 *
 * @description Serves the current user's avatar image with proper Content-Type headers.
 * Supports both session-based and API key authentication.
 */
export async function GET(request: NextRequest) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json(
        { error: getUserFriendlyError('UNAUTHORIZED'), code: 'UNAUTHORIZED' },
        { status: 401 }
      );
    }

    // Fetch user's avatar URL
    const userData = await db.user.findUnique({
      where: { id: user.id },
      select: {
        avatarUrl: true,
      },
    });

    if (!userData) {
      return NextResponse.json(
        { error: getUserFriendlyError('NOT_FOUND', 'User not found'), code: 'NOT_FOUND' },
        { status: 404 }
      );
    }

    // If user has an avatarUrl that points to a file, serve it
    if (
      userData.avatarUrl &&
      (userData.avatarUrl.startsWith('/uploads/') || userData.avatarUrl.startsWith('/api/images/'))
    ) {
      // For MVP, redirect to the static file
      // In production, you might want to serve the file directly
      return NextResponse.redirect(new URL(userData.avatarUrl, request.url));
    }

    // Support legacy base64 avatars for backward compatibility
    if (userData.avatarUrl && userData.avatarUrl.startsWith('data:image/')) {
      // Return the base64 data URL directly
      return new NextResponse(userData.avatarUrl, {
        headers: { 'Content-Type': 'text/plain' },
      });
    }

    // If no avatar URL, return 404
    return NextResponse.json(
      { error: getUserFriendlyError('NOT_FOUND', 'Avatar not found'), code: 'NOT_FOUND' },
      { status: 404 }
    );
  } catch (error) {
    logger.error({ error: error }, 'Avatar serving error');
    return NextResponse.json(
      { error: getUserFriendlyError('INTERNAL_ERROR'), code: 'INTERNAL_ERROR' },
      { status: 500 }
    );
  }
}
