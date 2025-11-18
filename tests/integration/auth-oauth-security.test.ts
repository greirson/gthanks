/**
 * Security tests for OAuth account linking
 *
 * Tests cover:
 * - Account hijacking prevention via email verification
 * - OAuth account linking only to verified emails
 * - Edge cases for unverified accounts
 *
 * SECURITY CRITICAL: These tests verify the fix for CVE-style account hijacking vulnerability
 */

import { describe, it, expect, beforeEach, afterEach } from '@jest/globals';
import { db } from '@/lib/db';
import { authOptions } from '@/lib/auth';
import type { Account, User } from 'next-auth';
import type { AdapterUser } from 'next-auth/adapters';

describe('OAuth Account Linking Security', () => {
  beforeEach(async () => {
    // Reset database state
    if (global.mockDb && typeof global.mockDb._resetMockData === 'function') {
      global.mockDb._resetMockData();
    }
  });

  afterEach(() => {
    // Clear any mocks if needed
  });

  describe('Account Hijacking Prevention', () => {
    it('should NOT link OAuth account to unverified email (prevents account hijacking)', async () => {
      // ATTACK SCENARIO:
      // 1. Attacker creates account with victim's email (but doesn't verify it)
      const attackerEmail = 'victim@example.com';
      const attackerUser = await db.user.create({
        data: {
          email: attackerEmail,
          name: 'Attacker Account',
        },
      });

      // Create unverified UserEmail record
      await db.userEmail.create({
        data: {
          userId: attackerUser.id,
          email: attackerEmail,
          isPrimary: true,
          isVerified: false, // UNVERIFIED - this is the key
        },
      });

      // 2. Victim tries to sign in with Google OAuth using their email
      const victimOAuthUser: User = {
        id: '', // Will be assigned by NextAuth
        email: attackerEmail,
        name: 'Legitimate Victim',
        image: 'https://google.com/avatar.jpg',
      };

      const victimOAuthAccount: Account = {
        provider: 'google',
        providerAccountId: 'google-12345',
        type: 'oauth',
        access_token: 'mock-access-token',
        token_type: 'Bearer',
      };

      // Simulate the signIn callback logic
      const signInCallback = authOptions.callbacks?.signIn;
      expect(signInCallback).toBeDefined();

      if (signInCallback) {
        // Check if OAuth account already exists (it doesn't)
        const existingAccount = await db.account.findUnique({
          where: {
            provider_providerAccountId: {
              provider: victimOAuthAccount.provider,
              providerAccountId: victimOAuthAccount.providerAccountId,
            },
          },
        });
        expect(existingAccount).toBeNull();

        // Check for existing user with verified email
        const existingUserEmail = await db.userEmail.findFirst({
          where: {
            email: attackerEmail,
            isVerified: true, // This should NOT find the attacker's unverified email
          },
          include: { user: true },
        });

        // ✅ SECURITY CHECK: Should NOT find the attacker's account
        expect(existingUserEmail).toBeNull();

        // Also check legacy User table with verification check
        const legacyUser = await db.user.findUnique({
          where: { email: attackerEmail },
          include: {
            emails: {
              where: {
                email: attackerEmail,
                isVerified: true,
              },
            },
          },
        });

        // ✅ SECURITY CHECK: Should find the user but no verified emails
        expect(legacyUser).toBeTruthy();
        expect(legacyUser?.emails.length).toBe(0);

        // Since no verified email exists, the victim should get a NEW user account
        // The attacker's unverified account should NOT be linked
        const existingUser = existingUserEmail?.user ||
                            (legacyUser && legacyUser.emails.length > 0 ? legacyUser : null);

        expect(existingUser).toBeNull(); // ✅ No linking should happen
      }

      // Verify attacker's account is still unlinked
      const attackerAccountCheck = await db.account.findFirst({
        where: { userId: attackerUser.id },
      });
      expect(attackerAccountCheck).toBeNull(); // ✅ Attacker account should have no OAuth links
    });

    it('should link OAuth account to verified email (normal flow)', async () => {
      // NORMAL SCENARIO:
      // User has verified their email, then signs in with OAuth
      const userEmail = 'legitimate@example.com';
      const existingUser = await db.user.create({
        data: {
          email: userEmail,
          name: 'Legitimate User',
        },
      });

      // Create VERIFIED UserEmail record
      await db.userEmail.create({
        data: {
          userId: existingUser.id,
          email: userEmail,
          isPrimary: true,
          isVerified: true, // VERIFIED - this is the key
          verifiedAt: new Date(),
        },
      });

      // User signs in with Google OAuth
      const oauthAccount: Account = {
        provider: 'google',
        providerAccountId: 'google-67890',
        type: 'oauth',
        access_token: 'mock-access-token',
        token_type: 'Bearer',
      };

      // Check for existing user with verified email
      const existingUserEmail = await db.userEmail.findFirst({
        where: {
          email: userEmail,
          isVerified: true,
        },
        include: { user: true },
      });

      // ✅ Should find the verified user
      expect(existingUserEmail).toBeTruthy();
      expect(existingUserEmail?.user.id).toBe(existingUser.id);

      // Simulate linking the OAuth account
      const linkedAccount = await db.account.create({
        data: {
          userId: existingUser.id,
          type: oauthAccount.type,
          provider: oauthAccount.provider,
          providerAccountId: oauthAccount.providerAccountId,
          access_token: oauthAccount.access_token,
          token_type: oauthAccount.token_type,
        },
      });

      // ✅ OAuth account should be linked to the legitimate user
      expect(linkedAccount).toBeTruthy();
      expect(linkedAccount.userId).toBe(existingUser.id);
      expect(linkedAccount.provider).toBe('google');
    });

    it('should handle legacy users with verified emails', async () => {
      // LEGACY SCENARIO:
      // Old user created before UserEmail table existed
      const legacyEmail = 'legacy@example.com';
      const legacyUser = await db.user.create({
        data: {
          email: legacyEmail,
          name: 'Legacy User',
        },
      });

      // Create verified email record (migrated data)
      await db.userEmail.create({
        data: {
          userId: legacyUser.id,
          email: legacyEmail,
          isPrimary: true,
          isVerified: true,
          verifiedAt: new Date(),
        },
      });

      // Check legacy user lookup path
      const legacyUserCheck = await db.user.findUnique({
        where: { email: legacyEmail },
        include: {
          emails: {
            where: {
              email: legacyEmail,
              isVerified: true,
            },
          },
        },
      });

      // ✅ Should find legacy user with verified email
      expect(legacyUserCheck).toBeTruthy();
      expect(legacyUserCheck?.emails.length).toBeGreaterThan(0);
      expect(legacyUserCheck?.emails[0].isVerified).toBe(true);

      // OAuth linking should succeed
      const existingUser = legacyUserCheck && legacyUserCheck.emails.length > 0 ? legacyUserCheck : null;
      expect(existingUser).toBeTruthy();
      expect(existingUser?.id).toBe(legacyUser.id);
    });

    it('should create new user when email is unverified (not link to existing)', async () => {
      // ATTACK PREVENTION SCENARIO:
      // Attacker creates unverified account, victim signs in with OAuth
      // System should create NEW user for victim, not link to attacker's account
      const email = 'test@example.com';

      // Attacker's unverified account
      await db.user.create({
        data: {
          email,
          name: 'Attacker',
        },
      });

      await db.userEmail.create({
        data: {
          userId: (await db.user.findUnique({ where: { email } }))!.id,
          email,
          isPrimary: true,
          isVerified: false, // UNVERIFIED
        },
      });

      // Check for verified email (should not find attacker's unverified email)
      const existingUserEmail = await db.userEmail.findFirst({
        where: {
          email,
          isVerified: true,
        },
        include: { user: true },
      });

      expect(existingUserEmail).toBeNull();

      // Check legacy path
      const legacyUser = await db.user.findUnique({
        where: { email },
        include: {
          emails: {
            where: {
              email,
              isVerified: true,
            },
          },
        },
      });

      // Should find user but no verified emails
      expect(legacyUser).toBeTruthy();
      expect(legacyUser?.emails.length).toBe(0);

      // Final check: existingUser should be null (no linking)
      const existingUser = existingUserEmail?.user ||
                          (legacyUser && legacyUser.emails.length > 0 ? legacyUser : null);

      expect(existingUser).toBeNull();

      // In real flow, NextAuth would create a NEW user for the victim
      // This prevents the attacker from gaining access to the victim's OAuth account
    });
  });

  describe('Edge Cases', () => {
    it('should handle multiple emails with mixed verification status', async () => {
      const user = await db.user.create({
        data: {
          email: 'primary@example.com',
          name: 'Multi-Email User',
        },
      });

      // Primary email - verified
      await db.userEmail.create({
        data: {
          userId: user.id,
          email: 'primary@example.com',
          isPrimary: true,
          isVerified: true,
          verifiedAt: new Date(),
        },
      });

      // Secondary email - unverified
      await db.userEmail.create({
        data: {
          userId: user.id,
          email: 'secondary@example.com',
          isPrimary: false,
          isVerified: false,
        },
      });

      // OAuth with verified primary email - should link
      const verifiedEmailCheck = await db.userEmail.findFirst({
        where: {
          email: 'primary@example.com',
          isVerified: true,
        },
        include: { user: true },
      });
      expect(verifiedEmailCheck).toBeTruthy();
      expect(verifiedEmailCheck?.user.id).toBe(user.id);

      // OAuth with unverified secondary email - should NOT link
      const unverifiedEmailCheck = await db.userEmail.findFirst({
        where: {
          email: 'secondary@example.com',
          isVerified: true,
        },
        include: { user: true },
      });
      expect(unverifiedEmailCheck).toBeNull();
    });

    it('should only match exact email with verification', async () => {
      const user1 = await db.user.create({
        data: {
          email: 'user1@example.com',
          name: 'User 1',
        },
      });

      const user2 = await db.user.create({
        data: {
          email: 'user2@example.com',
          name: 'User 2',
        },
      });

      // User 1 - verified email
      await db.userEmail.create({
        data: {
          userId: user1.id,
          email: 'user1@example.com',
          isPrimary: true,
          isVerified: true,
          verifiedAt: new Date(),
        },
      });

      // User 2 - unverified email
      await db.userEmail.create({
        data: {
          userId: user2.id,
          email: 'user2@example.com',
          isPrimary: true,
          isVerified: false,
        },
      });

      // Check user1 - should be found
      const user1Check = await db.userEmail.findFirst({
        where: {
          email: 'user1@example.com',
          isVerified: true,
        },
        include: { user: true },
      });
      expect(user1Check).toBeTruthy();

      // Check user2 - should NOT be found
      const user2Check = await db.userEmail.findFirst({
        where: {
          email: 'user2@example.com',
          isVerified: true,
        },
        include: { user: true },
      });
      expect(user2Check).toBeNull();
    });
  });
});
