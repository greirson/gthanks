import { Wish } from '@/lib/validators/api-responses/wishes';

/**
 * Type representing the minimal wish data needed for image utilities
 */
type WishImageData = Pick<Wish, 'imageStatus' | 'localImagePath' | 'imageUrl'>;

/**
 * Get the appropriate image source for a wish based on its processing status.
 *
 * Priority order:
 * 1. Show optimized local image if available (COMPLETED status)
 * 2. Show original image while processing (for immediate feedback)
 * 3. Return null if no image available
 *
 * @param wish - The wish object containing image status and paths
 * @returns The image source URL or null if no image is available
 */
export function getWishImageSrc(wish: WishImageData): string | null {
  // Priority 1: Show optimized local image if available
  if (wish.imageStatus === 'COMPLETED' && wish.localImagePath) {
    return wish.localImagePath;
  }
  // Priority 2: Show original image while processing (for immediate feedback)
  if ((wish.imageStatus === 'PROCESSING' || wish.imageStatus === 'PENDING') && wish.imageUrl) {
    return wish.imageUrl;
  }
  return null;
}

/**
 * Check if a wish's image is currently being processed.
 *
 * @param wish - The wish object to check
 * @returns True if the image is in PROCESSING or PENDING status
 */
export function isWishImageProcessing(wish: WishImageData): boolean {
  return wish.imageStatus === 'PROCESSING' || wish.imageStatus === 'PENDING';
}

/**
 * Check if a wish has an image that can be displayed.
 *
 * This includes:
 * - Completed optimized images (COMPLETED status with localImagePath)
 * - Original images while processing (PROCESSING/PENDING status with imageUrl)
 *
 * @param wish - The wish object to check
 * @returns True if the wish has a displayable image
 */
export function hasWishImage(wish: WishImageData): boolean {
  return (
    (wish.imageStatus === 'COMPLETED' && !!wish.localImagePath) ||
    (isWishImageProcessing(wish) && !!wish.imageUrl)
  );
}
