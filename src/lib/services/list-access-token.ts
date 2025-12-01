/**
 * List Access Token Service
 *
 * Manages HMAC-signed cookies for password-protected list access.
 * Uses a single cookie with a map of unlocked lists.
 *
 * Cookie format:
 * {
 *   "v": 1,
 *   "lists": {
 *     "listId": { "exp": 1735689600, "pwv": "a1b2c3d4" }
 *   }
 * }:sig:hmac_signature
 */

import crypto from 'crypto';
import { logger } from './logger';

const COOKIE_NAME = 'gthanks_list_access';
const COOKIE_VERSION = 1;
const ACCESS_TTL_SECONDS = 86400; // 24 hours
const SIGNATURE_SEPARATOR = ':sig:';

interface ListAccessEntry {
  exp: number; // Unix timestamp
  pwv: string; // Password version (8 chars)
}

interface ListAccessData {
  v: number;
  lists: Record<string, ListAccessEntry>;
}

class ListAccessTokenService {
  /**
   * Get the signing key derived from NEXTAUTH_SECRET
   */
  private getSigningKey(): Buffer {
    const secret = process.env.NEXTAUTH_SECRET;
    if (!secret) {
      throw new Error('NEXTAUTH_SECRET not configured');
    }
    return crypto
      .createHash('sha256')
      .update(secret + '_list_access')
      .digest();
  }

  /**
   * Generate password version from stored Argon2 hash
   * Returns first 8 characters of SHA256(storedHash)
   */
  getPasswordVersion(storedHash: string | null): string {
    if (!storedHash) {
      return 'none';
    }
    return crypto.createHash('sha256').update(storedHash).digest('hex').substring(0, 8);
  }

  /**
   * Create HMAC signature for data
   */
  private sign(data: string): string {
    return crypto.createHmac('sha256', this.getSigningKey()).update(data).digest('base64url');
  }

  /**
   * Verify signature using timing-safe comparison
   */
  private verifySignature(data: string, signature: string): boolean {
    try {
      const expected = this.sign(data);
      // Ensure both buffers are the same length for timing-safe comparison
      const expectedBuffer = Buffer.from(expected);
      const signatureBuffer = Buffer.from(signature);
      if (expectedBuffer.length !== signatureBuffer.length) {
        return false;
      }
      return crypto.timingSafeEqual(expectedBuffer, signatureBuffer);
    } catch (error) {
      logger.debug('[ListAccessToken] Signature verification error:', error);
      return false;
    }
  }

  /**
   * Parse and verify cookie - returns null if invalid
   */
  parseCookie(cookieValue: string | undefined): ListAccessData | null {
    if (!cookieValue) {
      return null;
    }

    const separatorIndex = cookieValue.lastIndexOf(SIGNATURE_SEPARATOR);
    if (separatorIndex === -1) {
      logger.debug('[ListAccessToken] Cookie missing signature separator');
      return null;
    }

    const data = cookieValue.substring(0, separatorIndex);
    const signature = cookieValue.substring(separatorIndex + SIGNATURE_SEPARATOR.length);

    if (!this.verifySignature(data, signature)) {
      logger.warn('[ListAccessToken] Invalid cookie signature');
      return null;
    }

    try {
      const parsed = JSON.parse(data) as ListAccessData;

      // Validate structure
      if (typeof parsed.v !== 'number' || typeof parsed.lists !== 'object') {
        logger.warn('[ListAccessToken] Invalid cookie structure');
        return null;
      }

      // Check version compatibility
      if (parsed.v !== COOKIE_VERSION) {
        logger.debug('[ListAccessToken] Cookie version mismatch, got:', parsed.v);
        return null;
      }

      return parsed;
    } catch (error) {
      logger.debug('[ListAccessToken] Failed to parse cookie JSON:', error);
      return null;
    }
  }

  /**
   * Create signed cookie value from data
   */
  createCookieValue(data: ListAccessData): string {
    const jsonData = JSON.stringify(data);
    const signature = this.sign(jsonData);
    return `${jsonData}${SIGNATURE_SEPARATOR}${signature}`;
  }

  /**
   * Check if cookie has valid access for a specific list
   */
  hasValidAccess(
    cookieValue: string | undefined,
    listId: string,
    currentPasswordHash: string | null
  ): boolean {
    const data = this.parseCookie(cookieValue);
    if (!data) {
      return false;
    }

    const entry = data.lists[listId];
    if (!entry) {
      logger.debug('[ListAccessToken] No entry for list:', listId);
      return false;
    }

    // Check expiration
    const now = Math.floor(Date.now() / 1000);
    if (entry.exp < now) {
      logger.debug('[ListAccessToken] Access expired for list:', listId);
      return false;
    }

    // Check password version matches current password
    const currentPwv = this.getPasswordVersion(currentPasswordHash);
    if (entry.pwv !== currentPwv) {
      logger.debug('[ListAccessToken] Password version mismatch for list:', listId);
      return false;
    }

    return true;
  }

  /**
   * Add list access to cookie, returns new cookie value
   * Also cleans up expired entries
   */
  addListAccess(
    existingCookie: string | undefined,
    listId: string,
    passwordHash: string | null
  ): string {
    const now = Math.floor(Date.now() / 1000);
    const exp = now + ACCESS_TTL_SECONDS;
    const pwv = this.getPasswordVersion(passwordHash);

    // Parse existing cookie or create new data structure
    let data = this.parseCookie(existingCookie);
    if (!data) {
      data = {
        v: COOKIE_VERSION,
        lists: {},
      };
    }

    // Clean up expired entries
    const cleanedLists: Record<string, ListAccessEntry> = {};
    for (const [id, entry] of Object.entries(data.lists)) {
      if (entry.exp >= now) {
        cleanedLists[id] = entry;
      } else {
        logger.debug('[ListAccessToken] Cleaning up expired entry for list:', id);
      }
    }

    // Add new list access
    cleanedLists[listId] = { exp, pwv };

    data.lists = cleanedLists;

    logger.debug(
      '[ListAccessToken] Added access for list:',
      listId,
      'expires:',
      new Date(exp * 1000).toISOString()
    );

    return this.createCookieValue(data);
  }

  /**
   * Get cookie name
   */
  getCookieName(): string {
    return COOKIE_NAME;
  }

  /**
   * Get cookie configuration for NextResponse.cookies.set()
   */
  getCookieConfig(value: string): {
    name: string;
    value: string;
    httpOnly: boolean;
    secure: boolean;
    sameSite: 'lax';
    path: string;
    maxAge: number;
  } {
    return {
      name: COOKIE_NAME,
      value,
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      path: '/',
      maxAge: ACCESS_TTL_SECONDS,
    };
  }
}

export const listAccessTokenService = new ListAccessTokenService();
export type { ListAccessData, ListAccessEntry };
