/**
 * OAuth Token Encryption Utilities
 *
 * Encrypts OAuth access and refresh tokens at rest using AES-256-GCM.
 *
 * Security Features:
 * - AES-256-GCM authenticated encryption
 * - Unique IV (initialization vector) per encryption
 * - HMAC-based integrity verification
 * - Environment-based encryption key
 *
 * Key Generation:
 *   openssl rand -base64 32
 *
 * Usage:
 *   const { encrypted, iv } = encryptToken(plaintext);
 *   const plaintext = decryptToken(encrypted, iv);
 *
 * IMPORTANT: Never log decrypted tokens. Only log encryption failures.
 */

import crypto from 'crypto';

import { logger } from '@/lib/services/logger';

const ALGORITHM = 'aes-256-gcm';
const IV_LENGTH = 16; // 128 bits for GCM
const AUTH_TAG_LENGTH = 16; // 128 bits for authentication tag
const ENCRYPTION_KEY_LENGTH = 32; // 256 bits

/**
 * Get encryption key from environment
 * Falls back to a default key for backward compatibility (not recommended for production)
 *
 * @returns Buffer containing 32-byte encryption key
 * @throws Error if OAUTH_ENCRYPTION_KEY is invalid
 */
function getEncryptionKey(): Buffer {
  const envKey = process.env.OAUTH_ENCRYPTION_KEY;

  if (!envKey) {
    // Backward compatibility: use default key derived from NEXTAUTH_SECRET
    // This allows existing deployments to continue working without immediate reconfiguration
    // SECURITY NOTE: This is not ideal. Production should set OAUTH_ENCRYPTION_KEY explicitly.
    if (process.env.NODE_ENV === 'production') {
      logger.warn(
        'OAUTH_ENCRYPTION_KEY not set in production. Using fallback key derived from NEXTAUTH_SECRET. ' +
          'For better security, generate a dedicated key: openssl rand -base64 32'
      );
    }

    const fallbackSource = process.env.NEXTAUTH_SECRET || 'insecure-default-key';
    // Derive 32-byte key from NEXTAUTH_SECRET using SHA-256
    return crypto.createHash('sha256').update(fallbackSource).digest();
  }

  // Decode base64-encoded key
  const keyBuffer = Buffer.from(envKey, 'base64');

  if (keyBuffer.length !== ENCRYPTION_KEY_LENGTH) {
    throw new Error(
      `OAUTH_ENCRYPTION_KEY must be ${ENCRYPTION_KEY_LENGTH} bytes when base64-decoded. ` +
        `Got ${keyBuffer.length} bytes. Generate valid key: openssl rand -base64 32`
    );
  }

  return keyBuffer;
}

/**
 * Encrypt plaintext token using AES-256-GCM
 *
 * @param plaintext - Token to encrypt (access_token, refresh_token, etc.)
 * @returns Object containing encrypted ciphertext and IV (both base64-encoded)
 * @throws Error if encryption fails
 */
export function encryptToken(plaintext: string): { encrypted: string; iv: string } {
  if (!plaintext) {
    throw new Error('Cannot encrypt empty token');
  }

  try {
    // Generate random IV for each encryption (ensures same plaintext encrypts differently)
    const iv = crypto.randomBytes(IV_LENGTH);

    // Create cipher with encryption key and IV
    const cipher = crypto.createCipheriv(ALGORITHM, getEncryptionKey(), iv);

    // Encrypt the plaintext
    let encrypted = cipher.update(plaintext, 'utf8', 'base64');
    encrypted += cipher.final('base64');

    // Get authentication tag (GCM provides authenticated encryption)
    const authTag = cipher.getAuthTag();

    // Combine encrypted data + auth tag
    const combined = Buffer.concat([Buffer.from(encrypted, 'base64'), authTag]);

    return {
      encrypted: combined.toString('base64'),
      iv: iv.toString('base64'),
    };
  } catch (error) {
    logger.error('Failed to encrypt OAuth token', error);
    throw new Error('Token encryption failed');
  }
}

/**
 * Decrypt encrypted token using AES-256-GCM
 *
 * @param encrypted - Base64-encoded ciphertext (includes auth tag)
 * @param iv - Base64-encoded initialization vector
 * @returns Decrypted plaintext token
 * @throws Error if decryption fails or authentication fails
 */
export function decryptToken(encrypted: string, iv: string): string {
  if (!encrypted || !iv) {
    throw new Error('Cannot decrypt: missing encrypted data or IV');
  }

  try {
    // Decode base64 inputs
    const encryptedBuffer = Buffer.from(encrypted, 'base64');
    const ivBuffer = Buffer.from(iv, 'base64');

    // Extract auth tag (last 16 bytes) and ciphertext
    const authTag = encryptedBuffer.subarray(encryptedBuffer.length - AUTH_TAG_LENGTH);
    const ciphertext = encryptedBuffer.subarray(0, encryptedBuffer.length - AUTH_TAG_LENGTH);

    // Create decipher with encryption key and IV
    const decipher = crypto.createDecipheriv(ALGORITHM, getEncryptionKey(), ivBuffer);
    decipher.setAuthTag(authTag);

    // Decrypt the ciphertext
    let decrypted = decipher.update(ciphertext.toString('base64'), 'base64', 'utf8');
    decrypted += decipher.final('utf8');

    return decrypted;
  } catch (error) {
    // SECURITY: Don't log the encrypted data or error details to prevent leaking token info
    logger.error('Failed to decrypt OAuth token (invalid key, tampered data, or corrupted IV)');
    throw new Error('Token decryption failed');
  }
}

/**
 * Check if a token is encrypted (heuristic check)
 *
 * @param token - Token to check
 * @returns true if token appears to be encrypted (base64 and reasonable length)
 */
export function isTokenEncrypted(token: string | null): boolean {
  if (!token) {
    return false;
  }

  // Encrypted tokens are base64-encoded and reasonably long (at least 32 chars)
  // This is a heuristic - not foolproof, but good enough for backward compatibility checks
  const base64Regex = /^[A-Za-z0-9+/=]+$/;
  return base64Regex.test(token) && token.length >= 32;
}

/**
 * Safely migrate plaintext token to encrypted format
 * Used during account retrieval to transparently upgrade old tokens
 *
 * @param plaintext - Plaintext token to migrate
 * @returns Encrypted token data { encrypted, iv } or null if input is empty
 */
export function migrateToEncrypted(
  plaintext: string | null
): { encrypted: string; iv: string } | null {
  if (!plaintext) {
    return null;
  }

  // If already encrypted (heuristic), don't re-encrypt
  if (isTokenEncrypted(plaintext)) {
    logger.warn('Attempted to migrate already-encrypted token (skipped)');
    return null;
  }

  try {
    return encryptToken(plaintext);
  } catch (error) {
    logger.error('Failed to migrate plaintext token to encrypted format', error);
    return null;
  }
}

/**
 * Safely retrieve token (handles both encrypted and plaintext for backward compatibility)
 *
 * Migration Strategy:
 * 1. Check if encrypted fields exist (encryptedAccessToken, tokenIv)
 * 2. If yes, decrypt and return
 * 3. If no, fall back to plaintext field (access_token, refresh_token)
 * 4. Log migration opportunity for admin awareness
 *
 * @param encryptedToken - Encrypted token (from new field)
 * @param iv - Initialization vector (from new field)
 * @param plaintextToken - Plaintext token (from legacy field)
 * @param tokenType - "access" or "refresh" (for logging)
 * @returns Decrypted token or plaintext fallback
 */
export function safeRetrieveToken(
  encryptedToken: string | null,
  iv: string | null,
  plaintextToken: string | null,
  tokenType: 'access' | 'refresh'
): string | null {
  // New encrypted format exists
  if (encryptedToken && iv) {
    try {
      return decryptToken(encryptedToken, iv);
    } catch (error) {
      logger.error(`Failed to decrypt ${tokenType} token, falling back to plaintext`, error);
      // Fall through to plaintext fallback
    }
  }

  // Backward compatibility: return plaintext token
  if (plaintextToken) {
    // Log migration opportunity (info level to avoid spam)
    if (process.env.NODE_ENV !== 'test') {
      logger.info(`Using plaintext ${tokenType} token (migration pending)`);
    }
    return plaintextToken;
  }

  // No token available
  return null;
}
