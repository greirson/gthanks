import { z } from 'zod';

import { NextRequest, NextResponse } from 'next/server';

import { metadataExtractor } from '@/lib/scraping/metadata-extractor';
import { rateLimiter, getClientIdentifier, getRateLimitHeaders } from '@/lib/rate-limiter';

const MetadataRequestSchema = z.object({
  url: z.string().url(),
});

/**
 * Extracts metadata from web URLs for wishlist items
 *
 * @description Fetches and parses metadata including title, description, images, and pricing from provided URLs using web scraping
 * @param {NextRequest} request - The incoming HTTP request object with URL data in JSON body
 * @returns {Promise<NextResponse>} JSON response with extracted metadata or error
 *
 * @throws {400} Bad Request - Invalid URL format or validation errors
 * @throws {404} Not Found - Failed to extract metadata from the provided URL
 * @throws {500} Internal Server Error - Metadata extraction service errors
 *
 * @example
 * // Extract metadata from product URL
 * POST /api/metadata
 * {
 *   "url": "https://example.com/product/123"
 * }
 * // Returns: { title: "Product Name", description: "...", image: "...", price: "..." }
 *
 * @public No authentication required - utility endpoint for URL metadata extraction
 * @see {@link MetadataRequestSchema} for request validation
 * @see {@link metadataExtractor.extract} for extraction logic
 */
export async function POST(request: NextRequest) {
  try {
    // Apply rate limit (IP-based for anonymous endpoint)
    const ip = getClientIdentifier(request);
    const rateLimitResult = await rateLimiter.check('metadata-extract', ip);

    if (!rateLimitResult.allowed) {
      return NextResponse.json(
        {
          error: 'Too many requests. Please wait a moment and try again',
          code: 'RATE_LIMIT_EXCEEDED',
          retryAfter: rateLimitResult.retryAfter,
        },
        {
          status: 429,
          headers: getRateLimitHeaders(rateLimitResult),
        }
      );
    }

    const body = (await request.json()) as unknown;
    const { url } = MetadataRequestSchema.parse(body);

    const result = await metadataExtractor.extractWithDetails(url);

    // Handle successful extraction
    if (result.success && result.data) {
      const metadata = result.data;

      // Transform price to number for API consistency
      let price: number | undefined = undefined;

      if (metadata.price !== null && metadata.price !== undefined) {
        if (typeof metadata.price === 'object' && 'amount' in metadata.price) {
          price = metadata.price.amount !== undefined ? metadata.price.amount : undefined;
        } else if (typeof metadata.price === 'number') {
          price = metadata.price;
        }
      }

      const transformedMetadata = {
        ...metadata,
        price,
      };

      return NextResponse.json({
        success: true,
        data: transformedMetadata,
        ...(result.warning && { warning: result.warning }), // Include warning if present
      });
    }

    // Handle extraction failure with detailed error info
    if (result.error) {
      const { type, message, url: failedUrl, partial } = result.error;

      // Return structured error response
      return NextResponse.json(
        {
          success: false,
          error: {
            type,
            message,
            url: failedUrl,
            partial,
          },
        },
        {
          // Use 200 status for all metadata extraction errors (graceful degradation)
          // All error types allow the wish to be created with fallback data
          status: 200,
        }
      );
    }

    // Fallback for unexpected cases
    return NextResponse.json(
      {
        success: false,
        error: { type: 'parse_error', message: 'Failed to extract metadata', url },
      },
      { status: 500 }
    );
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { success: false, error: { type: 'invalid_url', message: 'Invalid URL provided' } },
        { status: 400 }
      );
    }

    return NextResponse.json(
      {
        success: false,
        error: {
          type: 'network_error',
          message: error instanceof Error ? error.message : 'Failed to process request',
        },
      },
      { status: 500 }
    );
  }
}
