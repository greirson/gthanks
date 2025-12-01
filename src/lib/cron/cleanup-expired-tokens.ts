/**
 * Expired Token Cleanup Cron Job
 *
 * Deletes expired MagicLink, VerificationToken, and PersonalAccessToken records to prevent:
 * - Security risks from expired tokens remaining in database
 * - Database bloat from accumulating old records
 *
 * Runs daily via Vercel Cron Jobs
 */

import { db } from '@/lib/db';
import { logger } from '@/lib/services/logger';
import { tokenService } from '@/lib/services/token-service';

export async function cleanupExpiredTokens() {
  const now = new Date();

  try {
    const [magicLinks, verificationTokens, personalAccessTokens] = await Promise.all([
      db.magicLink.deleteMany({
        where: { expiresAt: { lt: now } },
      }),
      db.verificationToken.deleteMany({
        where: { expires: { lt: now } },
      }),
      tokenService.cleanupExpiredTokens(),
    ]);

    logger.info(
      {
        deletedMagicLinks: magicLinks.count,
        deletedVerificationTokens: verificationTokens.count,
        deletedPersonalAccessTokens: personalAccessTokens.deletedCount,
      },
      'Cleaned up expired tokens'
    );

    return {
      success: true,
      deletedMagicLinks: magicLinks.count,
      deletedVerificationTokens: verificationTokens.count,
      deletedPersonalAccessTokens: personalAccessTokens.deletedCount,
    };
  } catch (error) {
    logger.error('Failed to cleanup expired tokens:', error);
    throw error;
  }
}
