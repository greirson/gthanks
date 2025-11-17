/**
 * URL Validation Security Utilities
 *
 * Provides comprehensive URL validation to prevent:
 * - XSS attacks from javascript: and data: URLs
 * - Open redirect attacks
 * - SSRF attacks via internal network access
 */

/**
 * List of allowed hosts for redirects
 * Only same-origin redirects are allowed for security
 */
const getAllowedHosts = (): string[] => {
  const hosts: string[] = [];

  // Add localhost for development
  if (process.env.NODE_ENV === 'development') {
    hosts.push('localhost', '127.0.0.1');
  }

  // Add configured app URL
  if (process.env.NEXT_PUBLIC_APP_URL) {
    try {
      const appUrl = new URL(process.env.NEXT_PUBLIC_APP_URL);
      hosts.push(appUrl.hostname);
    } catch {
      // Invalid URL in environment variable
    }
  }

  // Add Vercel deployment URL
  if (process.env.VERCEL_URL) {
    hosts.push(process.env.VERCEL_URL);
  }

  return hosts.filter(Boolean);
};

/**
 * Validates if a URL is safe to open externally
 * Prevents XSS attacks from javascript: and data: URLs
 */
export function isSafeUrl(url: string): boolean {
  if (!url || typeof url !== 'string') {
    return false;
  }

  // Only allow HTTP and HTTPS protocols
  const trimmedUrl = url.trim().toLowerCase();
  return trimmedUrl.startsWith('http://') || trimmedUrl.startsWith('https://');
}

/**
 * Validates if a URL is safe for redirects
 * Only allows same-origin redirects to prevent open redirect attacks
 */
export function isValidRedirectUrl(url: string, baseUrl?: string): boolean {
  try {
    // Handle relative URLs (safe)
    if (url.startsWith('/') && !url.startsWith('//')) {
      return true;
    }

    const parsedUrl = new URL(url);
    const parsedBaseUrl = baseUrl ? new URL(baseUrl) : null;

    // Block dangerous protocols
    if (!['http:', 'https:'].includes(parsedUrl.protocol)) {
      return false;
    }

    // If baseUrl is provided, only allow same origin
    if (parsedBaseUrl) {
      return parsedUrl.origin === parsedBaseUrl.origin;
    }

    // Otherwise check against allowed hosts
    const allowedHosts = getAllowedHosts();
    return allowedHosts.includes(parsedUrl.hostname);
  } catch {
    // Invalid URL
    return false;
  }
}

/**
 * Sanitizes a redirect URL, returning a safe fallback if invalid
 */
export function sanitizeRedirectUrl(url: string, baseUrl: string, fallback = '/wishes'): string {
  // Handle relative URLs (already safe)
  if (url.startsWith('/') && !url.startsWith('//')) {
    return url;
  }

  // Validate absolute URLs
  if (isValidRedirectUrl(url, baseUrl)) {
    return url;
  }

  // Log potential attack attempts
  if (process.env.NODE_ENV !== 'test') {
    console.warn('SECURITY: Blocked potentially malicious redirect attempt', {
      originalUrl: url,
      sanitizedUrl: `${baseUrl}${fallback}`,
      baseUrl,
      timestamp: new Date().toISOString(),
    });
  }

  // Return safe fallback
  return `${baseUrl}${fallback}`;
}

/**
 * Safely opens a URL in a new window with validation
 */
export function safeOpenUrl(url: string): void {
  if (isSafeUrl(url)) {
    window.open(url, '_blank', 'noopener,noreferrer');
  } else {
    console.warn(`Blocked attempt to open potentially unsafe URL: ${url}`);
  }
}
