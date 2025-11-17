/**
 * Generate a NextAuth session token for manual Playwright testing
 * Usage: pnpm tsx scripts/generate-test-session.ts <email>
 */

import { EncryptJWT } from 'jose';
import { hkdfSync } from 'crypto';
import { db } from '@/lib/db';

async function generateSessionToken(email: string) {
  // Find user
  const user = await db.user.findUnique({
    where: { email },
    select: {
      id: true,
      email: true,
      name: true,
      isAdmin: true,
      role: true,
      isOnboardingComplete: true,
    },
  });

  if (!user) {
    console.error(`❌ User not found: ${email}`);
    process.exit(1);
  }

  // Generate NextAuth session token
  const secret = process.env.NEXTAUTH_SECRET;
  if (!secret) {
    console.error('❌ NEXTAUTH_SECRET not set in environment');
    process.exit(1);
  }

  const derivedKey = hkdfSync('sha256', secret, '', 'NextAuth.js Generated Encryption Key', 32);
  const encryptionKey = new Uint8Array(derivedKey);

  const sessionToken = await new EncryptJWT({
    id: user.id,
    email: user.email,
    name: user.name,
    isAdmin: user.isAdmin,
    role: user.role,
    isOnboardingComplete: user.isOnboardingComplete,
    sub: user.id,
  })
    .setProtectedHeader({ alg: 'dir', enc: 'A256GCM' })
    .setIssuedAt()
    .setExpirationTime('7d')
    .encrypt(encryptionKey);

  // Output session info
  console.log('\n✅ Session Token Generated');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log(`User: ${user.name} (${user.email})`);
  console.log(`User ID: ${user.id}`);
  console.log('\nSession Cookie:');
  console.log(`  Name:  next-auth.session-token`);
  console.log(`  Value: ${sessionToken}`);
  console.log('\nTo use in browser console:');
  console.log(`  document.cookie = "next-auth.session-token=${sessionToken}; path=/; max-age=604800"`);
  console.log('\nThen refresh the page.\n');
}

const email = process.argv[2];
if (!email) {
  console.error('Usage: pnpm tsx scripts/generate-test-session.ts <email>');
  console.error('Example: pnpm tsx scripts/generate-test-session.ts bork@fds.fo');
  process.exit(1);
}

generateSessionToken(email)
  .catch((error) => {
    console.error('Error:', error);
    process.exit(1);
  })
  .finally(() => {
    process.exit(0);
  });
