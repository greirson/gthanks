/**
 * Authentication helpers for Playwright E2E tests
 * Provides utilities for user login, registration, and session management
 */

import { Page } from '@playwright/test';
import { db } from '@/lib/db';
import { createId } from '@paralleldrive/cuid2';
import { EncryptJWT } from 'jose';
import { hkdfSync } from 'crypto';

/**
 * User data structure for test users
 */
export interface TestUser {
  id: string;
  email: string;
  name: string;
  password?: string;
  isAdmin?: boolean;
  role?: string;
}

/**
 * Login existing user by creating a direct session (bypasses magic link)
 * This is faster for E2E tests than waiting for emails
 *
 * @param page - Playwright page instance
 * @param email - User email address
 * @returns The logged-in user data
 */
export async function loginAsUser(page: Page, email: string): Promise<TestUser> {
  // Find the user in the database
  const user = await db.user.findUnique({
    where: { email },
    select: {
      id: true,
      email: true,
      name: true,
      isAdmin: true,
      role: true,
    },
  });

  if (!user) {
    throw new Error(
      `User with email ${email} not found. Create user first with createAndLoginUser()`
    );
  }

  // Create a JWE token for the user (NextAuth uses encrypted JWT strategy)
  // Derive encryption key using HKDF (same as NextAuth does internally)
  const secret = process.env.NEXTAUTH_SECRET;
  if (!secret) {
    throw new Error('NEXTAUTH_SECRET environment variable is not set for E2E tests.');
  }
  const derivedKey = hkdfSync('sha256', secret, '', 'NextAuth.js Generated Encryption Key', 32);
  const encryptionKey = new Uint8Array(derivedKey);

  const sessionToken = await new EncryptJWT({
    // Core fields
    id: user.id,
    email: user.email,
    name: user.name,
    sub: user.id,

    // CRITICAL: Fields that NextAuth's JWT/session callbacks expect
    role: user.role || 'user',
    isAdmin: user.isAdmin || false,
    isOnboardingComplete: true,  // CRITICAL: Must be true to avoid redirects
    themePreference: 'system',
    username: null,
    canUseVanityUrls: false,
    showPublicProfile: false,
  })
    .setProtectedHeader({ alg: 'dir', enc: 'A256GCM' })
    .setIssuedAt()
    .setExpirationTime('30d')
    .setJti(createId())  // Add unique token ID
    .encrypt(encryptionKey);

  // Set the session cookie in the browser
  const expiresAt = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000); // 30 days
  await page.context().addCookies([
    {
      name: 'next-auth.session-token',
      value: sessionToken,
      domain: 'localhost',  // Always use localhost for E2E tests
      path: '/',
      expires: Math.floor(expiresAt.getTime() / 1000),
      httpOnly: true,
      secure: false,
      sameSite: 'Lax',
    },
  ]);

  return {
    id: user.id,
    email: user.email,
    name: user.name || '',
    isAdmin: user.isAdmin,
    role: user.role,
  };
}

/**
 * Create a new test user and login
 *
 * @param page - Playwright page instance
 * @param userData - User data (email, name, etc.)
 * @returns The created and logged-in user
 */
export async function createAndLoginUser(
  page: Page,
  userData: Partial<TestUser> & { email: string; name: string }
): Promise<TestUser> {
  const userId = createId();

  // Create the user in the database
  const user = await db.user.create({
    data: {
      id: userId,
      email: userData.email,
      name: userData.name,
      emailVerified: new Date(),
      isOnboardingComplete: true,
      isAdmin: userData.isAdmin || false,
      role: userData.role || 'user',
    },
  });

  // Create a verified UserEmail record (for multi-email support)
  await db.userEmail.create({
    data: {
      userId: user.id,
      email: user.email,
      isPrimary: true,
      isVerified: true,
      verifiedAt: new Date(),
    },
  });

  // Login the newly created user
  return await loginAsUser(page, userData.email);
}

/**
 * Create multiple test users for testing scenarios
 * Returns users with different roles (owner, member, admin)
 *
 * @returns Object containing test users
 */
export async function createTestUsers(): Promise<{
  owner: TestUser;
  member: TestUser;
  admin: TestUser;
  giver: TestUser;
}> {
  const timestamp = Date.now();
  const random = Math.random().toString(36).substring(7);

  const owner = await db.user.create({
    data: {
      id: createId(),
      email: `owner-${timestamp}-${random}@test.com`,
      name: 'List Owner',
      emailVerified: new Date(),
      isOnboardingComplete: true,
      role: 'user',
      isAdmin: false,
    },
  });

  const member = await db.user.create({
    data: {
      id: createId(),
      email: `member-${timestamp}-${random}@test.com`,
      name: 'Group Member',
      emailVerified: new Date(),
      isOnboardingComplete: true,
      role: 'user',
      isAdmin: false,
    },
  });

  const admin = await db.user.create({
    data: {
      id: createId(),
      email: `admin-${timestamp}-${random}@test.com`,
      name: 'Admin User',
      emailVerified: new Date(),
      isOnboardingComplete: true,
      role: 'admin',
      isAdmin: true,
    },
  });

  const giver = await db.user.create({
    data: {
      id: createId(),
      email: `giver-${timestamp}-${random}@test.com`,
      name: 'Gift Giver',
      emailVerified: new Date(),
      isOnboardingComplete: true,
      role: 'user',
      isAdmin: false,
    },
  });

  // Create UserEmail records for each user
  await Promise.all([
    db.userEmail.create({
      data: {
        userId: owner.id,
        email: owner.email,
        isPrimary: true,
        isVerified: true,
        verifiedAt: new Date(),
      },
    }),
    db.userEmail.create({
      data: {
        userId: member.id,
        email: member.email,
        isPrimary: true,
        isVerified: true,
        verifiedAt: new Date(),
      },
    }),
    db.userEmail.create({
      data: {
        userId: admin.id,
        email: admin.email,
        isPrimary: true,
        isVerified: true,
        verifiedAt: new Date(),
      },
    }),
    db.userEmail.create({
      data: {
        userId: giver.id,
        email: giver.email,
        isPrimary: true,
        isVerified: true,
        verifiedAt: new Date(),
      },
    }),
  ]);

  return {
    owner: {
      id: owner.id,
      email: owner.email,
      name: owner.name || '',
      isAdmin: owner.isAdmin,
      role: owner.role,
    },
    member: {
      id: member.id,
      email: member.email,
      name: member.name || '',
      isAdmin: member.isAdmin,
      role: member.role,
    },
    admin: {
      id: admin.id,
      email: admin.email,
      name: admin.name || '',
      isAdmin: admin.isAdmin,
      role: admin.role,
    },
    giver: {
      id: giver.id,
      email: giver.email,
      name: giver.name || '',
      isAdmin: giver.isAdmin,
      role: giver.role,
    },
  };
}

/**
 * Logout the current user by clearing session cookies
 *
 * @param page - Playwright page instance
 */
export async function logout(page: Page): Promise<void> {
  // Navigate to the home page first to ensure we're on the right domain
  await page.goto('/');

  // Clear all cookies
  await page.context().clearCookies();

  // Optionally navigate to login page to confirm logout
  await page.goto('/auth/login');
}

/**
 * Check if user is currently logged in
 *
 * @param page - Playwright page instance
 * @returns True if user is logged in
 */
export async function isLoggedIn(page: Page): Promise<boolean> {
  const cookies = await page.context().cookies();
  return cookies.some(
    (cookie) =>
      cookie.name === 'next-auth.session-token' ||
      cookie.name === '__Secure-next-auth.session-token'
  );
}

/**
 * Get current session from cookies
 *
 * @param page - Playwright page instance
 * @returns Session token if logged in, null otherwise
 */
export async function getSessionToken(page: Page): Promise<string | null> {
  const cookies = await page.context().cookies();
  const sessionCookie = cookies.find(
    (cookie) =>
      cookie.name === 'next-auth.session-token' ||
      cookie.name === '__Secure-next-auth.session-token'
  );
  return sessionCookie?.value || null;
}

/**
 * Wait for authentication to complete
 * Useful after login actions to ensure session is established
 *
 * @param page - Playwright page instance
 * @param timeoutMs - Timeout in milliseconds (default: 5000)
 */
export async function waitForAuth(page: Page, timeoutMs: number = 5000): Promise<void> {
  await page.waitForFunction(
    () => {
      // Check if session cookie exists
      return document.cookie.includes('next-auth.session-token');
    },
    { timeout: timeoutMs }
  );
}
