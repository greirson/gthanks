import { fileTypeFromBuffer } from 'file-type';
import { NextRequest, NextResponse } from 'next/server';

import { getCurrentUser } from '@/lib/auth-utils';
// eslint-disable-next-line local-rules/no-direct-db-import -- Avatar file operations require direct db access for metadata; read-only queries with no business logic
import { db } from '@/lib/db';
import { getUserFriendlyError } from '@/lib/errors';
import { groupService } from '@/lib/services/group/group.service';
import { imageProcessor } from '@/lib/services/image-processor';
import { logger } from '@/lib/services/logger';

const MAX_AVATAR_SIZE = 2 * 1024 * 1024; // 2MB

export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json(
        { error: getUserFriendlyError('UNAUTHORIZED'), code: 'UNAUTHORIZED' },
        { status: 401 }
      );
    }

    // Check permissions
    await groupService.requireAdmin(params.id, user.id);

    // Process image
    const formData = await req.formData();
    const file = formData.get('avatar') as File;

    if (!file) {
      return NextResponse.json(
        { error: getUserFriendlyError('VALIDATION_ERROR', 'No file provided'), code: 'VALIDATION_ERROR' },
        { status: 400 }
      );
    }

    // Convert file to buffer for validation
    const arrayBuffer = await file.arrayBuffer();
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
          error: getUserFriendlyError(
            'VALIDATION_ERROR',
            'Invalid file type. Only JPEG, PNG, GIF, and WebP images are allowed.'
          ),
          code: 'VALIDATION_ERROR',
        },
        { status: 400 }
      );
    }

    // Process image using imageProcessor service (provides additional validation)
    // Note: imageProcessor uses MAX_DIMENSION=1200 and WEBP_QUALITY=80 from its constants
    const result = await imageProcessor.processImageFromBuffer(buffer);

    // Update group avatar with the file path (not base64)
    await db.group.update({
      where: { id: params.id },
      data: {
        avatarUrl: result.localPath,
      },
    });

    return NextResponse.json({ avatarUrl: result.localPath });
  } catch (error) {
    logger.error({ error: error }, 'Avatar upload error');

    if (error instanceof Error && error.message.includes('Unsupported file type')) {
      return NextResponse.json(
        {
          error: getUserFriendlyError(
            'VALIDATION_ERROR',
            'Invalid file type. Only JPEG, PNG, GIF, and WebP images are allowed.'
          ),
          code: 'VALIDATION_ERROR',
        },
        { status: 400 }
      );
    }

    return NextResponse.json(
      { error: 'Something went wrong. Please try again', code: 'INTERNAL_ERROR' },
      { status: 500 }
    );
  }
}

export async function GET(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json(
        { error: getUserFriendlyError('UNAUTHORIZED'), code: 'UNAUTHORIZED' },
        { status: 401 }
      );
    }

    // Check if user is a member of the group
    const membership = await db.userGroup.findUnique({
      where: {
        userId_groupId: {
          userId: user.id,
          groupId: params.id,
        },
      },
    });

    if (!membership) {
      return NextResponse.json(
        {
          error: getUserFriendlyError('FORBIDDEN', 'You must be a member of this group'),
          code: 'FORBIDDEN',
        },
        { status: 403 }
      );
    }

    // Fetch group's avatar URL
    const group = await db.group.findUnique({
      where: { id: params.id },
      select: {
        avatarUrl: true,
      },
    });

    if (!group) {
      return NextResponse.json(
        { error: getUserFriendlyError('NOT_FOUND', 'Group not found'), code: 'NOT_FOUND' },
        { status: 404 }
      );
    }

    // If group has an avatarUrl that points to a file, serve it
    if (
      group.avatarUrl &&
      (group.avatarUrl.startsWith('/uploads/') || group.avatarUrl.startsWith('/api/images/'))
    ) {
      // For MVP, redirect to the static file
      // In production, you might want to serve the file directly
      return NextResponse.redirect(new URL(group.avatarUrl, req.url));
    }

    // Support legacy base64 avatars for backward compatibility
    if (group.avatarUrl && group.avatarUrl.startsWith('data:image/')) {
      // Return the base64 data URL directly
      return new NextResponse(group.avatarUrl, {
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
      { error: 'Something went wrong. Please try again', code: 'INTERNAL_ERROR' },
      { status: 500 }
    );
  }
}

/**
 * DELETE /api/groups/[id]/avatar - Removes the group's avatar
 *
 * @description Deletes the group's avatar file from the filesystem and sets avatarUrl to null.
 * Only group admins can delete the group avatar.
 */
export async function DELETE(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json(
        { error: getUserFriendlyError('UNAUTHORIZED'), code: 'UNAUTHORIZED' },
        { status: 401 }
      );
    }

    const groupId = params.id;

    // Check permissions - user must be group admin
    try {
      await groupService.requireAdmin(groupId, user.id);
    } catch {
      return NextResponse.json(
        {
          error: getUserFriendlyError('FORBIDDEN', 'You must be a group admin to remove the photo'),
          code: 'FORBIDDEN',
        },
        { status: 403 }
      );
    }

    // Get current avatar URL from database
    const group = await db.group.findUnique({
      where: { id: groupId },
      select: { avatarUrl: true },
    });

    if (!group) {
      return NextResponse.json(
        { error: getUserFriendlyError('NOT_FOUND', 'Group not found'), code: 'NOT_FOUND' },
        { status: 404 }
      );
    }

    // Delete file if it exists (only if it's a local upload, not a data URL)
    if (group.avatarUrl && group.avatarUrl.startsWith('/api/images/')) {
      try {
        await imageProcessor.deleteImage(group.avatarUrl);
      } catch (error) {
        // File might already be deleted, log but continue anyway
        logger.warn({ error: error, avatarUrl: group.avatarUrl }, 'Failed to delete group avatar file');
      }
    }

    // Set avatarUrl to null in database
    await db.group.update({
      where: { id: groupId },
      data: { avatarUrl: null },
    });

    // Return 204 No Content
    return new NextResponse(null, { status: 204 });
  } catch (error) {
    logger.error({ error: error }, 'Error deleting group avatar');
    return NextResponse.json(
      { error: getUserFriendlyError('INTERNAL_ERROR', 'Failed to delete avatar'), code: 'INTERNAL_ERROR' },
      { status: 500 }
    );
  }
}
