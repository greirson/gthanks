/**
 * Test Script for Expired Token Cleanup Cron
 *
 * Usage:
 *   npx tsx scripts/test-cleanup-cron.ts
 *
 * This script:
 * 1. Creates test expired tokens
 * 2. Runs the cleanup function
 * 3. Verifies tokens were deleted
 */

import { db } from '../src/lib/db';
import { cleanupExpiredTokens } from '../src/lib/cron/cleanup-expired-tokens';

async function main() {
  console.log('🧪 Testing Expired Token Cleanup Cron\n');

  // Step 1: Create test expired tokens
  console.log('📝 Creating test expired tokens...');
  const oneDayAgo = new Date(Date.now() - 86400000); // 1 day ago
  const oneHourAgo = new Date(Date.now() - 3600000); // 1 hour ago

  const [expiredMagicLink, expiredVerificationToken] = await Promise.all([
    db.magicLink.create({
      data: {
        email: 'test-cleanup@example.com',
        token: `test-magic-link-${Date.now()}`,
        expiresAt: oneDayAgo,
        createdAt: new Date(Date.now() - 86400000 - 60000), // 1 day + 1 minute ago
      },
    }),
    db.verificationToken.create({
      data: {
        identifier: 'test-cleanup@example.com',
        token: `test-verification-${Date.now()}`,
        expires: oneHourAgo,
        createdAt: new Date(Date.now() - 3600000 - 60000), // 1 hour + 1 minute ago
      },
    }),
  ]);

  console.log(`✅ Created expired MagicLink: ${expiredMagicLink.token}`);
  console.log(`✅ Created expired VerificationToken: ${expiredVerificationToken.token}\n`);

  // Step 2: Create non-expired tokens (should NOT be deleted)
  console.log('📝 Creating valid (non-expired) tokens...');
  const tomorrow = new Date(Date.now() + 86400000); // 1 day from now

  const [validMagicLink, validVerificationToken] = await Promise.all([
    db.magicLink.create({
      data: {
        email: 'valid@example.com',
        token: `valid-magic-link-${Date.now()}`,
        expiresAt: tomorrow,
        createdAt: new Date(),
      },
    }),
    db.verificationToken.create({
      data: {
        identifier: 'valid@example.com',
        token: `valid-verification-${Date.now()}`,
        expires: tomorrow,
        createdAt: new Date(),
      },
    }),
  ]);

  console.log(`✅ Created valid MagicLink: ${validMagicLink.token}`);
  console.log(`✅ Created valid VerificationToken: ${validVerificationToken.token}\n`);

  // Step 3: Run cleanup
  console.log('🧹 Running cleanup function...');
  const result = await cleanupExpiredTokens();
  console.log(`✅ Cleanup completed:`, result);
  console.log();

  // Step 4: Verify expired tokens were deleted
  console.log('🔍 Verifying cleanup results...');
  const [deletedMagicLink, deletedVerificationToken, keptMagicLink, keptVerificationToken] =
    await Promise.all([
      db.magicLink.findUnique({ where: { token: expiredMagicLink.token } }),
      db.verificationToken.findUnique({
        where: {
          identifier_token: {
            identifier: expiredVerificationToken.identifier,
            token: expiredVerificationToken.token,
          },
        },
      }),
      db.magicLink.findUnique({ where: { token: validMagicLink.token } }),
      db.verificationToken.findUnique({
        where: {
          identifier_token: {
            identifier: validVerificationToken.identifier,
            token: validVerificationToken.token,
          },
        },
      }),
    ]);

  // Assert deleted
  if (deletedMagicLink === null && deletedVerificationToken === null) {
    console.log('✅ Expired tokens were successfully deleted');
  } else {
    console.error('❌ ERROR: Expired tokens were NOT deleted!');
    process.exit(1);
  }

  // Assert kept
  if (keptMagicLink && keptVerificationToken) {
    console.log('✅ Valid tokens were preserved');
  } else {
    console.error('❌ ERROR: Valid tokens were deleted!');
    process.exit(1);
  }

  // Cleanup test data
  console.log('\n🧹 Cleaning up test data...');
  await Promise.all([
    db.magicLink.delete({ where: { id: validMagicLink.id } }),
    db.verificationToken.delete({
      where: {
        identifier_token: {
          identifier: validVerificationToken.identifier,
          token: validVerificationToken.token,
        },
      },
    }),
  ]);

  console.log('\n✅ All tests passed! Cron cleanup works correctly.\n');
}

main()
  .catch((error) => {
    console.error('❌ Test failed:', error);
    process.exit(1);
  })
  .finally(async () => {
    await db.$disconnect();
  });
