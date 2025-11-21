import fs from 'fs/promises';
import path from 'path';

import { NextRequest, NextResponse } from 'next/server';
import { getUserFriendlyError } from '@/lib/errors';
import { logger } from '@/lib/services/logger';

interface RouteContext {
  params: {
    filename: string;
  };
}

export async function GET(request: NextRequest, { params }: RouteContext) {
  try {
    const { filename } = params;

    // Sanitize filename to prevent path traversal attacks
    if (!filename || filename.includes('..') || filename.includes('/') || filename.includes('\\')) {
      return NextResponse.json(
        { error: getUserFriendlyError('VALIDATION_ERROR'), code: 'INVALID_FILENAME' },
        { status: 400 }
      );
    }

    // Validate filename format (UUID + extension)
    const filenameRegex = /^[a-f0-9-]{36}\.(webp|jpg|jpeg|png|gif)$/i;
    if (!filenameRegex.test(filename)) {
      return NextResponse.json(
        { error: getUserFriendlyError('VALIDATION_ERROR'), code: 'INVALID_FILENAME_FORMAT' },
        { status: 400 }
      );
    }

    // Build the file path using STORAGE_PATH env var if set
    // Must match the path used by image-processor.ts
    const uploadsDir =
      process.env.STORAGE_PATH || path.join(process.cwd(), 'public', 'uploads', 'items');
    const filePath = path.join(uploadsDir, filename);

    // Read the file directly (no TOCTOU vulnerability)
    try {
      const fileBuffer = await fs.readFile(filePath);

      // Determine content type based on file extension
      const ext = path.extname(filename).toLowerCase();
      let contentType = 'image/jpeg'; // default

      switch (ext) {
        case '.webp':
          contentType = 'image/webp';
          break;
        case '.png':
          contentType = 'image/png';
          break;
        case '.gif':
          contentType = 'image/gif';
          break;
        case '.jpg':
        case '.jpeg':
          contentType = 'image/jpeg';
          break;
      }

      // Return the image with appropriate headers
      // Convert Buffer to Uint8Array for NextResponse
      return new NextResponse(new Uint8Array(fileBuffer), {
        status: 200,
        headers: {
          'Content-Type': contentType,
          'Cache-Control': 'public, max-age=31536000, immutable', // Cache for 1 year
          'Content-Length': fileBuffer.length.toString(),
        },
      });
    } catch {
      // File doesn't exist or can't be read
      return NextResponse.json(
        { error: getUserFriendlyError('NOT_FOUND'), code: 'IMAGE_NOT_FOUND' },
        { status: 404 }
      );
    }
  } catch (error) {
    logger.error({ error: error }, 'Image serving error');
    return NextResponse.json(
      { error: 'Internal server error', code: 'INTERNAL_ERROR' },
      { status: 500 }
    );
  }
}
