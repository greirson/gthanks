import { type ClassValue, clsx } from 'clsx';
import { randomBytes } from 'crypto';
import { twMerge } from 'tailwind-merge';

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

/**
 * Generate a cryptographically secure random token
 * @param bytes Number of bytes (default: 32 for 256-bit security)
 * @returns Base64URL encoded token
 */
export function generateSecureToken(bytes: number = 32): string {
  return randomBytes(bytes).toString('base64url');
}

/**
 * Truncates base64 data URIs for console/log readability
 * @param value Any value that might contain base64 data
 * @param maxLength Maximum length before truncation (default: 50)
 * @returns Truncated value or original if not base64 data
 */
export function truncateBase64(value: unknown, maxLength: number = 50): unknown {
  if (typeof value === 'string' && value.startsWith('data:image/') && value.length > maxLength) {
    const truncated = value.substring(0, maxLength);
    return `${truncated}...[TRUNCATED ${value.length - maxLength} chars]`;
  }
  return value;
}

/**
 * Creates a JSON-safe copy of an object with base64 data truncated
 * @param obj Object to process
 * @returns Object with truncated base64 data
 */
export function sanitizeForLogging(obj: unknown): unknown {
  if (obj === null || obj === undefined) {
    return obj;
  }

  if (typeof obj === 'string') {
    return truncateBase64(obj);
  }

  if (Array.isArray(obj)) {
    return obj.map(sanitizeForLogging);
  }

  if (typeof obj === 'object') {
    const sanitized: Record<string, unknown> = {};
    for (const [key, value] of Object.entries(obj)) {
      sanitized[key] = sanitizeForLogging(value);
    }
    return sanitized;
  }

  return obj;
}
