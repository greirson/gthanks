/**
 * Client-side image resizing utility to reduce upload size and server processing load
 * Particularly important for Raspberry Pi deployments with limited CPU resources
 */

interface ResizeOptions {
  maxWidth?: number;
  maxHeight?: number;
  quality?: number;
  outputFormat?: 'jpeg' | 'webp' | 'png';
}

const DEFAULT_OPTIONS: Required<ResizeOptions> = {
  maxWidth: 1920,
  maxHeight: 1920,
  quality: 0.8,
  outputFormat: 'jpeg',
};

/**
 * Resize an image file using Canvas API before upload
 * @param file The original image file
 * @param options Resize options
 * @returns Promise that resolves to the resized file
 */
export async function resizeImage(file: File, options: ResizeOptions = {}): Promise<File> {
  const opts = { ...DEFAULT_OPTIONS, ...options };

  return new Promise((resolve, reject) => {
    // Create an image element to load the file
    const img = new Image();

    img.onload = () => {
      try {
        // Calculate new dimensions while maintaining aspect ratio
        const { width: newWidth, height: newHeight } = calculateDimensions(
          img.width,
          img.height,
          opts.maxWidth,
          opts.maxHeight
        );

        // Skip resizing if image is already smaller than or equal to target dimensions
        if (img.width <= newWidth && img.height <= newHeight && opts.outputFormat === 'jpeg') {
          // Clean up blob URL before returning
          URL.revokeObjectURL(img.src);
          resolve(file);
          return;
        }

        // Create canvas and context
        const canvas = document.createElement('canvas');
        const ctx = canvas.getContext('2d');

        if (!ctx) {
          reject(new Error('Unable to get canvas context'));
          return;
        }

        // Set canvas dimensions
        canvas.width = newWidth;
        canvas.height = newHeight;

        // Enable image smoothing for better quality
        ctx.imageSmoothingEnabled = true;
        ctx.imageSmoothingQuality = 'high';

        // Draw the resized image
        ctx.drawImage(img, 0, 0, newWidth, newHeight);

        // Convert to blob
        canvas.toBlob(
          (blob) => {
            if (!blob) {
              // Clean up blob URL before rejecting
              URL.revokeObjectURL(img.src);
              reject(new Error('Failed to create image blob'));
              return;
            }

            // Create a new file with the resized image
            const resizedFile = new File([blob], file.name, {
              type: `image/${opts.outputFormat}`,
              lastModified: Date.now(),
            });

            // Clean up blob URL after successful conversion
            URL.revokeObjectURL(img.src);
            resolve(resizedFile);
          },
          `image/${opts.outputFormat}`,
          opts.quality
        );
      } catch (error) {
        // Clean up blob URL on error
        URL.revokeObjectURL(img.src);
        reject(error instanceof Error ? error : new Error('Failed to resize image'));
      }
    };

    img.onerror = () => {
      // Clean up blob URL on error
      URL.revokeObjectURL(img.src);
      reject(new Error('Failed to load image'));
    };

    // Load the image
    img.src = URL.createObjectURL(file);
  });
}

/**
 * Calculate new dimensions while maintaining aspect ratio
 */
function calculateDimensions(
  originalWidth: number,
  originalHeight: number,
  maxWidth: number,
  maxHeight: number
): { width: number; height: number } {
  let { width, height } = { width: originalWidth, height: originalHeight };

  // Calculate scaling factor
  const widthRatio = maxWidth / width;
  const heightRatio = maxHeight / height;
  const scalingFactor = Math.min(widthRatio, heightRatio, 1); // Don't upscale

  // Apply scaling
  width = Math.round(width * scalingFactor);
  height = Math.round(height * scalingFactor);

  return { width, height };
}

/**
 * Get image dimensions without loading the full image
 */
export function getImageDimensions(file: File): Promise<{ width: number; height: number }> {
  return new Promise((resolve, reject) => {
    const img = new Image();

    img.onload = () => {
      resolve({ width: img.width, height: img.height });
      URL.revokeObjectURL(img.src);
    };

    img.onerror = () => {
      reject(new Error('Failed to load image'));
      URL.revokeObjectURL(img.src);
    };

    img.src = URL.createObjectURL(file);
  });
}

/**
 * Check if client-side resizing is supported
 */
export function isResizeSupported(): boolean {
  try {
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');
    return !!(ctx && canvas.toBlob);
  } catch {
    return false;
  }
}
