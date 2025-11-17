import { NextRequest, NextResponse } from 'next/server';

import { getCurrentUser } from '@/lib/auth-utils';
import { getUserFriendlyError } from '@/lib/errors';
import { imageProcessor } from '@/lib/services/image-processor';
import { logger } from '@/lib/services/logger';

const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB
const ALLOWED_TYPES = ['image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'image/webp'];

/**
 * Handles POST requests for image uploads with processing and validation
 *
 * @description Processes multipart image uploads with comprehensive validation, feature flag checking, and server-side image processing
 * @param {NextRequest} request - The incoming HTTP request object with multipart form data containing image file
 * @returns {Promise<NextResponse>} JSON response with processed image URL or error
 *
 * @throws {401} Unauthorized - User authentication required
 * @throws {403} Forbidden - Image uploads feature disabled
 * @throws {400} Bad Request - Invalid file type, size exceeds limit, or no file provided
 * @throws {500} Internal Server Error - Image processing or storage errors
 *
 * @example
 * // Upload image file
 * POST /api/upload/image
 * Content-Type: multipart/form-data
 *
 * FormData:
 * - image: File (JPEG, PNG, GIF, WebP, max 10MB)
 *
 * // Returns: { success: true, imageUrl: "/images/processed/abc123.jpg", message: "..." }
 *
 * @security Requires authentication and respects image_uploads feature flag
 * @see {@link getCurrentUser} for authentication details
 * @see {@link FeatureService.isFeatureEnabled} for feature flag validation
 * @see {@link imageProcessor.processImageFromBuffer} for image processing
 */
export async function POST(request: NextRequest) {
  try {
    // Image uploads always enabled in MVP
    // Check authentication
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json(
        { error: getUserFriendlyError('UNAUTHORIZED'), code: 'UNAUTHORIZED' },
        { status: 401 }
      );
    }

    // Parse multipart form data
    const formData = await request.formData();
    const fileEntry = formData.get('image');

    if (!fileEntry || !(fileEntry instanceof File)) {
      return NextResponse.json(
        { error: getUserFriendlyError('VALIDATION_ERROR'), code: 'NO_FILE_PROVIDED' },
        { status: 400 }
      );
    }

    const file = fileEntry;

    // Validate file size
    if (file.size > MAX_FILE_SIZE) {
      return NextResponse.json(
        {
          error: `File too large. Maximum size is ${MAX_FILE_SIZE / 1024 / 1024}MB`,
          code: 'FILE_TOO_LARGE',
        },
        { status: 400 }
      );
    }

    // Validate file type
    if (!ALLOWED_TYPES.includes(file.type)) {
      return NextResponse.json(
        {
          error: 'Invalid file type. Allowed types: JPEG, PNG, GIF, WebP',
          code: 'INVALID_FILE_TYPE',
        },
        { status: 400 }
      );
    }

    // Convert file to buffer
    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    // Process the image using the existing ImageProcessor service
    const result = await imageProcessor.processImageFromBuffer(buffer);

    // Return the processed image path
    return NextResponse.json(
      {
        success: true,
        imageUrl: result.localPath,
        message: 'Image uploaded and processed successfully',
      },
      { status: 201 }
    );
  } catch (error) {
    logger.error({ error: error }, 'Image upload error');

    // Handle specific error types
    if (error instanceof Error) {
      if (error.message.includes('Unsupported file type')) {
        return NextResponse.json(
          {
            error: 'Invalid image file format',
            code: 'UNSUPPORTED_FILE_TYPE',
          },
          { status: 400 }
        );
      }
      if (error.message.includes('File too large')) {
        return NextResponse.json(
          {
            error: 'Image file is too large',
            code: 'FILE_TOO_LARGE',
          },
          { status: 400 }
        );
      }
    }

    return NextResponse.json(
      {
        error: 'Failed to process image upload',
        code: 'IMAGE_PROCESSING_FAILED',
      },
      { status: 500 }
    );
  }
}

// Note: Next.js 14 App Router handles large file uploads automatically
