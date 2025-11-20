import { randomUUID } from 'crypto';
import { fileTypeFromBuffer } from 'file-type';
import fs from 'fs/promises';
import path from 'path';

import { db } from '@/lib/db';

import { logger } from './logger';

// Dynamic Sharp import to reduce initial bundle size
async function getSharp() {
  const sharp = (await import('sharp')).default;
  return sharp;
}

// SSRF Protection: Private IP ranges to block
const PRIVATE_IP_RANGES = [
  /^127\./, // 127.0.0.0/8 (loopback)
  /^10\./, // 10.0.0.0/8 (private)
  /^172\.(1[6-9]|2[0-9]|3[0-1])\./, // 172.16.0.0/12 (private)
  /^192\.168\./, // 192.168.0.0/16 (private)
  /^169\.254\./, // 169.254.0.0/16 (link-local)
  /^0\./, // 0.0.0.0/8 (this network)
  /^224\./, // 224.0.0.0/4 (multicast)
  /^240\./, // 240.0.0.0/4 (reserved)
];

const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB
const TIMEOUT_MS = 10000; // 10 seconds
const MAX_DIMENSION = 1200;
const WEBP_QUALITY = 80;

interface ProcessImageResult {
  success: boolean;
  localPath?: string;
  responsiveImages?: {
    webp: { [key: string]: string };
    avif: { [key: string]: string };
  };
  error?: string;
}

export class ImageProcessor {
  private uploadsDir: string;

  constructor() {
    // Use STORAGE_PATH env var if set, otherwise fallback to default path for backward compatibility
    this.uploadsDir =
      process.env.STORAGE_PATH || path.join(process.cwd(), 'public', 'uploads', 'items');
  }

  /**
   * Process an image from a URL: download, validate, resize, convert to WebP, and store locally
   */
  async processImageFromUrl(wishId: string, imageUrl: string): Promise<ProcessImageResult> {
    try {
      // Update status to PROCESSING
      await db.wish.update({
        where: { id: wishId },
        data: { imageStatus: 'PROCESSING' },
      });

      // Validate and fetch the image
      const imageBuffer = await this.fetchImage(imageUrl);

      // Process and save the image with responsive formats
      const result = await this.processImageFromBuffer(imageBuffer);

      // Update database with success
      await db.wish.update({
        where: { id: wishId },
        data: {
          localImagePath: result.localPath,
          imageStatus: 'COMPLETED',
        },
      });

      return { success: true, ...result };
    } catch (error) {
      logger.error(`Failed to process image for wish ${wishId}:`, error, {
        wishId,
        imageUrl,
      });

      // Update database with failure
      await db.wish.update({
        where: { id: wishId },
        data: { imageStatus: 'FAILED' },
      });

      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  }

  /**
   * Fetch image from URL with SSRF protection and validation
   */
  private async fetchImage(imageUrl: string): Promise<Buffer> {
    // Validate URL format
    let url: URL;
    try {
      url = new URL(imageUrl);
    } catch {
      throw new Error('Invalid URL format');
    }

    // Only allow HTTP/HTTPS
    if (!['http:', 'https:'].includes(url.protocol)) {
      throw new Error('Only HTTP and HTTPS protocols are allowed');
    }

    // SSRF Protection: Check if hostname resolves to private IP
    await this.validateHostname(url.hostname);

    // Create fetch with timeout and headers
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), TIMEOUT_MS);

    try {
      const response = await fetch(imageUrl, {
        signal: controller.signal,
        headers: {
          'User-Agent':
            'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        },
        redirect: 'follow', // Allow redirects (limited by fetch default)
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      // Check content length
      const contentLength = response.headers.get('content-length');
      if (contentLength && parseInt(contentLength) > MAX_FILE_SIZE) {
        throw new Error(`File too large: ${contentLength} bytes`);
      }

      // Get the response as buffer with size limit
      const buffer = await response.arrayBuffer();
      if (buffer.byteLength > MAX_FILE_SIZE) {
        throw new Error(`File too large: ${buffer.byteLength} bytes`);
      }

      return Buffer.from(buffer);
    } finally {
      clearTimeout(timeoutId);
    }
  }

  /**
   * Validate hostname doesn't resolve to private IPs (SSRF protection)
   */
  private async validateHostname(hostname: string): Promise<void> {
    try {
      // Use DNS lookup to resolve hostname to IP
      const { lookup } = await import('dns/promises');
      const { address } = await lookup(hostname);

      // Check if resolved IP is in private ranges
      for (const range of PRIVATE_IP_RANGES) {
        if (range.test(address)) {
          throw new Error(`Private IP address not allowed: ${address}`);
        }
      }
    } catch (error) {
      if (error instanceof Error && error.message.includes('Private IP')) {
        throw error;
      }
      // DNS lookup failed - this might be expected for some domains
      logger.warn(`DNS lookup failed for ${hostname}`, {
        hostname,
        error: error instanceof Error ? error.message : String(error),
      });
    }
  }

  /**
   * Process image buffer: validate, resize, convert to WebP, and save to uploads directory
   * This is the core processing method that can be used for both URL downloads and direct uploads
   */
  async processImageFromBuffer(buffer: Buffer): Promise<{
    localPath: string;
    responsiveImages: {
      webp: { [key: string]: string };
      avif: { [key: string]: string };
    };
  }> {
    // Validate file type using magic bytes
    const fileType = await fileTypeFromBuffer(buffer);
    if (
      !fileType ||
      !['image/jpeg', 'image/png', 'image/gif', 'image/webp'].includes(fileType.mime)
    ) {
      throw new Error(`Unsupported file type: ${fileType?.mime || 'unknown'}`);
    }

    // Generate unique filename base
    const filenameBase = randomUUID();

    // Ensure uploads directory exists
    await fs.mkdir(this.uploadsDir, { recursive: true });

    // Get image metadata for validation
    const sharp = await getSharp();
    await sharp(buffer).metadata();

    // Generate responsive images in multiple formats
    const responsiveImages = {
      webp: {} as { [key: string]: string },
      avif: {} as { [key: string]: string },
    };

    // Generate single optimized WebP image for speed and storage efficiency
    // This reduces processing time and avoids duplicate files
    const mainFilename = `${filenameBase}.webp`;
    const mainPath = path.join(this.uploadsDir, mainFilename);

    await sharp(buffer)
      .resize(MAX_DIMENSION, null, {
        fit: 'inside',
        withoutEnlargement: true,
      })
      .webp({ quality: WEBP_QUALITY, effort: 3 }) // Reduced effort for speed
      .toFile(mainPath);

    const localPath = `/api/images/${mainFilename}`;

    return {
      localPath,
      responsiveImages,
    };
  }

  /**
   * Delete a locally stored image file
   */
  async deleteImage(localPath: string): Promise<void> {
    try {
      // Support both legacy /uploads/items/ paths and new /api/images/ paths
      if (localPath.startsWith('/api/images/')) {
        // Extract filename from /api/images/{filename}
        const filename = path.basename(localPath);
        const filepath = path.join(this.uploadsDir, filename);
        await fs.unlink(filepath);
      } else if (localPath.startsWith('/uploads/items/')) {
        // Legacy path format
        const filepath = path.join(process.cwd(), 'public', localPath);
        await fs.unlink(filepath);
      } else {
        throw new Error('Invalid image path');
      }
    } catch (error) {
      logger.error(`Failed to delete image ${localPath}:`, error, {
        localPath,
      });
      // Don't throw - file might already be deleted
    }
  }
}

export const imageProcessor = new ImageProcessor();
