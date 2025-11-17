/**
 * Expired Token Cleanup Cron Job
 *
 * Deletes expired MagicLink and VerificationToken records to prevent:
 * - Security risks from expired tokens remaining in database
 * - Database bloat from accumulating old records
 *
 * Runs daily via Vercel Cron Jobs
 */

import { db } from '@/lib/db';
import { logger } from '@/lib/services/logger';

export async function cleanupExpiredTokens() {
  const now = new Date();

  try {
    const [magicLinks, verificationTokens] = await Promise.all([
      db.magicLink.deleteMany({
        where: { expiresAt: { lt: now } },
      }),
      db.verificationToken.deleteMany({
        where: { expires: { lt: now } },
      }),
    ]);

    logger.info(
      'Cleaned up expired tokens:',
      `MagicLinks: ${magicLinks.count}, VerificationTokens: ${verificationTokens.count}`
    );

    return {
      success: true,
      deletedMagicLinks: magicLinks.count,
      deletedVerificationTokens: verificationTokens.count,
    };
  } catch (error) {
    logger.error('Failed to cleanup expired tokens:', error);
    throw error;
  }
}
