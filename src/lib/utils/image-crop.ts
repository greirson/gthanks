import { Area } from 'react-easy-crop';
import { orientation } from 'exifr';

/** Maximum dimension for output image (width or height) */
const MAX_OUTPUT_SIZE = 512;

/** JPEG quality for output (0-1, where 1 is highest quality) */
const JPEG_QUALITY = 0.85;

/**
 * Crops an image to the specified pixel area and returns a Blob and URL.
 *
 * Handles EXIF orientation (especially from iOS devices) and outputs a JPEG
 * at max 512x512px with 0.85 quality to optimize file size while maintaining
 * visual quality.
 *
 * @param imageSrc - Base64 data URL or File object of the source image
 * @param pixelCrop - The crop area in pixels (from react-easy-crop)
 * @param rotation - Rotation angle in degrees (default: 0)
 * @returns Promise resolving to an object with the cropped image Blob and object URL
 *
 * @example
 * ```typescript
 * const { file, url } = await getCroppedImg(
 *   base64Image,
 *   { x: 100, y: 100, width: 200, height: 200 },
 *   0
 * );
 * // Use file for upload, url for preview
 * ```
 */
export async function getCroppedImg(
  imageSrc: string | File,
  pixelCrop: Area,
  rotation = 0
): Promise<{ file: Blob; url: string }> {
  // Read EXIF orientation if source is a File
  let orientationValue = 1; // Default: normal orientation

  if (imageSrc instanceof File) {
    try {
      orientationValue = (await orientation(imageSrc)) || 1;
    } catch (error) {
      console.warn('Could not read EXIF orientation:', error);
      orientationValue = 1; // Fallback to normal
    }
  }

  // Convert File to data URL if needed
  const imageUrl = imageSrc instanceof File ? URL.createObjectURL(imageSrc) : imageSrc;

  return new Promise((resolve, reject) => {
    const image = new Image();
    image.src = imageUrl;
    image.onload = () => {
      const canvas = document.createElement('canvas');
      const ctx = canvas.getContext('2d');

      if (!ctx) {
        reject(new Error('Failed to get canvas context'));
        if (imageSrc instanceof File) {
          URL.revokeObjectURL(imageUrl);
        }
        return;
      }

      const maxSize = Math.max(image.width, image.height);
      const safeArea = 2 * ((maxSize / 2) * Math.sqrt(2));

      canvas.width = safeArea;
      canvas.height = safeArea;

      ctx.translate(safeArea / 2, safeArea / 2);

      // Apply EXIF orientation transformations
      switch (orientationValue) {
        case 2:
          ctx.transform(-1, 0, 0, 1, 0, 0);
          break;
        case 3:
          ctx.transform(-1, 0, 0, -1, 0, 0);
          break;
        case 4:
          ctx.transform(1, 0, 0, -1, 0, 0);
          break;
        case 5:
          ctx.transform(0, 1, 1, 0, 0, 0);
          break;
        case 6:
          ctx.transform(0, 1, -1, 0, 0, 0);
          break;
        case 7:
          ctx.transform(0, -1, -1, 0, 0, 0);
          break;
        case 8:
          ctx.transform(0, -1, 1, 0, 0, 0);
          break;
        default:
          // Normal orientation (1), no transformation needed
          break;
      }

      ctx.rotate((rotation * Math.PI) / 180);
      ctx.translate(-safeArea / 2, -safeArea / 2);

      ctx.drawImage(image, safeArea / 2 - image.width / 2, safeArea / 2 - image.height / 2);

      const data = ctx.getImageData(0, 0, safeArea, safeArea);

      canvas.width = pixelCrop.width;
      canvas.height = pixelCrop.height;

      ctx.putImageData(
        data,
        Math.round(0 - safeArea / 2 + image.width / 2 - pixelCrop.x),
        Math.round(0 - safeArea / 2 + image.height / 2 - pixelCrop.y)
      );

      // Calculate scaled dimensions if image is too large
      const scale = Math.min(1, MAX_OUTPUT_SIZE / Math.max(pixelCrop.width, pixelCrop.height));
      const outputWidth = Math.round(pixelCrop.width * scale);
      const outputHeight = Math.round(pixelCrop.height * scale);

      // Create output canvas with scaled dimensions
      const outputCanvas = document.createElement('canvas');
      outputCanvas.width = outputWidth;
      outputCanvas.height = outputHeight;
      const outputCtx = outputCanvas.getContext('2d');

      if (!outputCtx) {
        reject(new Error('Failed to get output canvas context'));
        if (imageSrc instanceof File) {
          URL.revokeObjectURL(imageUrl);
        }
        return;
      }

      // Scale the cropped image to fit output dimensions
      outputCtx.drawImage(
        canvas,
        0,
        0,
        pixelCrop.width,
        pixelCrop.height,
        0,
        0,
        outputWidth,
        outputHeight
      );

      outputCanvas.toBlob(
        (blob) => {
          if (!blob) {
            reject(new Error('Failed to create blob'));
            if (imageSrc instanceof File) {
              URL.revokeObjectURL(imageUrl);
            }
            return;
          }
          const url = URL.createObjectURL(blob);

          // Clean up object URL if we created one
          if (imageSrc instanceof File) {
            URL.revokeObjectURL(imageUrl);
          }

          resolve({ file: blob, url });
        },
        'image/jpeg',
        JPEG_QUALITY
      );
    };
    image.onerror = () => {
      if (imageSrc instanceof File) {
        URL.revokeObjectURL(imageUrl);
      }
      reject(new Error('Failed to load image'));
    };
  });
}
