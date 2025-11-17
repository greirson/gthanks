/**
 * CommonJS version for next.config.js compatibility
 * NOTE: Wish images are now processed server-side and served locally.
 * These patterns are kept minimal and only for other parts of the app that may need external images.
 */

// Next.js image remote patterns - minimal set for non-wish images
const ALLOWED_IMAGE_REMOTE_PATTERNS = [
  // Keep basic patterns for potential user avatars or other app images
  { protocol: 'https', hostname: 'images.unsplash.com' },
  { protocol: 'https', hostname: 'cdn.pixabay.com' },
];

module.exports = {
  ALLOWED_IMAGE_REMOTE_PATTERNS,
};
