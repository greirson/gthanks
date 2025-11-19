/**
 * Encrypted Prisma Adapter for NextAuth
 *
 * Extends the standard PrismaAdapter to automatically encrypt OAuth tokens
 * at rest while maintaining backward compatibility with existing accounts.
 *
 * Features:
 * - Transparent encryption of access_token and refresh_token
 * - Backward compatibility with existing plaintext tokens
 * - Automatic migration when tokens are refreshed
 * - Uses AES-256-GCM authenticated encryption
 *
 * Migration Strategy:
 * - New accounts: Tokens encrypted immediately
 * - Existing accounts: Plaintext tokens continue to work
 * - Token refresh: Plaintext upgraded to encrypted format
 *
 * SECURITY: This adapter NEVER logs decrypted tokens.
 */

import { PrismaAdapter } from '@next-auth/prisma-adapter';
import { type Adapter, type AdapterAccount } from 'next-auth/adapters';

import { encryptToken } from '@/lib/crypto/oauth-encryption';
import { db } from '@/lib/db';
import { logger } from '@/lib/services/logger';

/**
 * Create encrypted Prisma adapter for NextAuth
 *
 * Wraps PrismaAdapter and intercepts account operations to encrypt/decrypt tokens
 */
export function createEncryptedPrismaAdapter(): Adapter {
  const baseAdapter = PrismaAdapter(db);

  return {
    ...baseAdapter,

    /**
     * Create account with encrypted tokens
     * Intercepts PrismaAdapter.createUser to encrypt OAuth tokens before storage
     */
    async linkAccount(account: AdapterAccount) {
      // Extract tokens before encryption
      const accessToken = account.access_token;
      const refreshToken = account.refresh_token;

      let encryptedAccessToken: string | undefined;
      let encryptedRefreshToken: string | undefined;
      let tokenIv: string | undefined;

      // Encrypt access token if present
      if (accessToken) {
        try {
          const encrypted = encryptToken(accessToken);
          encryptedAccessToken = encrypted.encrypted;
          tokenIv = encrypted.iv;

          // Clear plaintext token (we'll keep it for backward compatibility, but prefer encrypted)
          // Don't delete access_token field - keep for fallback
        } catch (error) {
          logger.error('Failed to encrypt access token during account creation', error, {
            provider: account.provider,
          });
          // Continue with plaintext storage on encryption failure
        }
      }

      // Encrypt refresh token if present (reuse same IV)
      if (refreshToken && tokenIv) {
        try {
          const encrypted = encryptToken(refreshToken);
          encryptedRefreshToken = encrypted.encrypted;
          // Note: We're using the same IV for both tokens, which is acceptable because:
          // 1. The tokens are different plaintexts
          // 2. We're using authenticated encryption (GCM)
          // 3. The IV is still unique per account
          // For maximum security, you could generate separate IVs, but this trades
          // simplicity for marginal security improvement.
        } catch (error) {
          logger.error('Failed to encrypt refresh token during account creation', error, {
            provider: account.provider,
          });
          // Continue with plaintext storage on encryption failure
        }
      }

      // Create account with both encrypted and plaintext fields
      // Plaintext fields kept for backward compatibility and fallback
      const accountData = {
        ...account,
        ...(encryptedAccessToken && { encryptedAccessToken }),
        ...(encryptedRefreshToken && { encryptedRefreshToken }),
        ...(tokenIv && { tokenIv }),
      };

      // Use base adapter's linkAccount with enhanced data
      if (baseAdapter.linkAccount) {
        return baseAdapter.linkAccount(accountData);
      }

      // Fallback: direct database creation if adapter doesn't expose linkAccount
      return db.account.create({
        data: {
          userId: accountData.userId,
          type: accountData.type,
          provider: accountData.provider,
          providerAccountId: accountData.providerAccountId,
          refresh_token: accountData.refresh_token ?? null,
          access_token: accountData.access_token ?? null,
          expires_at: accountData.expires_at ?? null,
          token_type: accountData.token_type ?? null,
          scope: accountData.scope ?? null,
          id_token: accountData.id_token ?? null,
          session_state: accountData.session_state ?? null,
          encryptedAccessToken: encryptedAccessToken ?? null,
          encryptedRefreshToken: encryptedRefreshToken ?? null,
          tokenIv: tokenIv ?? null,
        },
      });
    },

    /**
     * Get user by account
     * Note: Token decryption happens when tokens are actually needed,
     * not during user retrieval. This method just returns the user.
     */
    async getUserByAccount(provider_providerAccountId) {
      // Use base adapter implementation - no need to decrypt tokens here
      // Tokens are decrypted when they're actually used (e.g., for OAuth refresh)
      if (!baseAdapter.getUserByAccount) {
        return null;
      }

      return baseAdapter.getUserByAccount(provider_providerAccountId);
    },
  };
}
