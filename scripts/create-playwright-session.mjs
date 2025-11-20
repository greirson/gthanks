import { db } from '../src/lib/db.js';
import { createId } from '@paralleldrive/cuid2';
import { EncryptJWT } from 'jose';
import { hkdfSync } from 'crypto';

async function createTestSession() {
  try {
    const email = 'test-playwright@example.com';

    // Check if user exists
    let user = await db.user.findUnique({
      where: { email },
    });

    // If not, create user
    if (!user) {
      const userId = createId();
      user = await db.user.create({
        data: {
          id: userId,
          email,
          name: 'Playwright Test User',
          emailVerified: new Date(),
          isOnboardingComplete: true,
          username: 'playwrighttest',
        },
      });

      // Create UserEmail record
      await db.userEmail.create({
        data: {
          userId: user.id,
          email: user.email,
          isPrimary: true,
          isVerified: true,
          verifiedAt: new Date(),
        },
      });

      console.log('Created new test user:', email);
    } else {
      console.log('Using existing test user:', email);
    }

    // Create session token
    const secret = process.env.NEXTAUTH_SECRET;
    if (!secret) {
      throw new Error('NEXTAUTH_SECRET not set');
    }

    const derivedKey = hkdfSync('sha256', secret, '', 'NextAuth.js Generated Encryption Key', 32);
    const encryptionKey = new Uint8Array(derivedKey);

    const sessionToken = await new EncryptJWT({
      id: user.id,
      email: user.email,
      name: user.name,
      sub: user.id,
    })
      .setProtectedHeader({ alg: 'dir', enc: 'A256GCM' })
      .setIssuedAt()
      .setExpirationTime('30d')
      .encrypt(encryptionKey);

    const expiresAt = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);

    console.log(JSON.stringify({
      name: 'next-auth.session-token',
      value: sessionToken,
      domain: 'localhost',
      path: '/',
      expires: Math.floor(expiresAt.getTime() / 1000),
      httpOnly: true,
      secure: false,
      sameSite: 'Lax',
      userId: user.id,
      email: user.email,
    }));

    await db.$disconnect();
  } catch (error) {
    console.error('Error:', error);
    await db.$disconnect();
    process.exit(1);
  }
}

createTestSession();
