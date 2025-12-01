import { createEncryptedPrismaAdapter } from '@/lib/auth/encrypted-prisma-adapter';

import { type Account, type NextAuthOptions, type User as NextAuthUser } from 'next-auth';
import { type AdapterUser } from 'next-auth/adapters';
import AppleProvider from 'next-auth/providers/apple';
import EmailProvider from 'next-auth/providers/email';
import FacebookProvider from 'next-auth/providers/facebook';
import GoogleProvider from 'next-auth/providers/google';

import { getAppleClientSecret } from '@/lib/auth/apple-client-secret-generator';
// OIDC provider not available in NextAuth v4.24 - using custom provider

import { db } from '@/lib/db';
import { createEmailService } from '@/lib/email';
import { logger } from '@/lib/services/logger';
import {
  RegenerationReason,
  cleanupExpiredSessions,
  enforceMaxSessions,
  regenerateSession,
} from '@/lib/services/session-service';
import { signupRestrictionService } from '@/lib/services/signup-restriction.service';
import { UserProfileService } from '@/lib/services/user-profile';
import { sanitizeRedirectUrl } from '@/lib/utils/url-validation';

const authOptions: NextAuthOptions = {
  adapter: createEncryptedPrismaAdapter(),
  providers: [
    EmailProvider({
      from: process.env.EMAIL_FROM || 'noreply@localhost',
      maxAge: 15 * 60, // 15 minutes
      // Server config is required by EmailProvider constructor even when using
      // custom sendVerificationRequest. These values are not used for sending
      // but must be present to prevent initialization errors.
      server: {
        host: process.env.SMTP_HOST || 'localhost',
        port: Number(process.env.SMTP_PORT) || 587,
        auth: {
          user: process.env.SMTP_USER || '',
          pass: process.env.SMTP_PASS || '',
        },
      },
      sendVerificationRequest: async ({ identifier: email, url, provider: _provider }) => {
        const emailService = createEmailService();

        await emailService.send({
          to: email,
          subject: 'Sign in to gThanks',
          html: `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <meta name="color-scheme" content="light dark">
  <meta name="supported-color-schemes" content="light dark">
  <title>Sign in to gThanks</title>
</head>
<body style="margin: 0; padding: 0; background-color: #f3f4f6; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;">
  <div style="max-width: 480px; margin: 0 auto; padding: 40px 20px;">
    <div style="background-color: #ffffff; border-radius: 12px; padding: 40px 32px; text-align: center; box-shadow: 0 1px 3px rgba(0,0,0,0.1);">
      <div style="margin-bottom: 24px;">
        <span style="font-size: 28px; font-weight: 700; color: #111827;">gThanks</span>
      </div>
      <h1 style="margin: 0 0 12px; font-size: 22px; font-weight: 600; color: #111827;">Sign in to your account</h1>
      <p style="margin: 0 0 28px; font-size: 15px; color: #6b7280; line-height: 1.5;">Click the button below to securely sign in. No password needed!</p>
      <a href="${url}" style="display: inline-block; background-color: #2563eb; color: #ffffff; text-decoration: none; padding: 14px 32px; border-radius: 8px; font-weight: 600; font-size: 16px;">Sign In</a>
      <p style="margin: 28px 0 0; font-size: 13px; color: #9ca3af; line-height: 1.5;">This link expires in 15 minutes.<br>If you didn't request this, you can safely ignore this email.</p>
    </div>
    <p style="margin: 20px 0 0; text-align: center; font-size: 12px; color: #9ca3af;">gThanks &ndash; Wishlist coordination for families</p>
  </div>
</body>
</html>`,
        });
      },
    }),
    ...(process.env.GOOGLE_CLIENT_ID
      ? [
          GoogleProvider({
            clientId: process.env.GOOGLE_CLIENT_ID,
            clientSecret: process.env.GOOGLE_CLIENT_SECRET || '',
          }),
        ]
      : []),
    ...(process.env.FACEBOOK_CLIENT_ID
      ? [
          FacebookProvider({
            clientId: process.env.FACEBOOK_CLIENT_ID,
            clientSecret: process.env.FACEBOOK_CLIENT_SECRET || '',
          }),
        ]
      : []),
    ...(process.env.APPLE_CLIENT_ID
      ? [
          AppleProvider({
            clientId: process.env.APPLE_CLIENT_ID,
            clientSecret: getAppleClientSecret() || '',
          }),
        ]
      : []),
    // Generic OAuth provider support (OIDC discovery)
    ...(process.env.OAUTH_CLIENT_ID && process.env.OAUTH_CLIENT_SECRET && process.env.OAUTH_ISSUER
      ? [
          {
            id: 'oauth',
            name: process.env.OAUTH_NAME || 'OAuth',
            type: 'oauth' as const,
            clientId: process.env.OAUTH_CLIENT_ID,
            clientSecret: process.env.OAUTH_CLIENT_SECRET,
            wellKnown: `${process.env.OAUTH_ISSUER}/.well-known/openid-configuration`,
            authorization: {
              params: {
                scope: process.env.OAUTH_SCOPE || 'openid email profile',
                response_mode: 'form_post',
              },
            },
            profile(profile: Record<string, unknown>) {
              return {
                id: String(profile.sub),
                name: String(profile.name ?? profile.preferred_username ?? profile.email),
                email: String(profile.email),
                image: (profile.picture ?? profile.avatar_url ?? '') as string,
              };
            },
          },
        ]
      : []),
  ],
  session: {
    strategy: 'jwt',
    maxAge: 30 * 24 * 60 * 60, // 30 days
  },
  callbacks: {
    redirect: ({ url, baseUrl }) => {
      // Allow gthanks-extension:// scheme for Safari extension OAuth
      // This enables ASWebAuthenticationSession to complete the OAuth flow
      // Only the exact callback path is allowed, not arbitrary extension URLs
      if (url.startsWith('gthanks-extension://auth/callback')) {
        return url;
      }

      // Use secure URL validation to prevent open redirect attacks
      const sanitizedUrl = sanitizeRedirectUrl(url, baseUrl, '/wishes');
      return sanitizedUrl;
    },
    jwt: async ({ token, user }) => {
      // Initial sign in - user object is available
      if (user) {
        token.id = user.id;
        token.email = user.email;
        token.name = user.name;
      }

      // Always fetch fresh user data from database to ensure we have latest admin status
      // This is crucial for first-user admin assignment to work properly
      if (token.id) {
        const dbUser = await db.user.findUnique({
          where: { id: token.id },
          select: {
            name: true,
            email: true,
            avatarUrl: true,
            role: true,
            isAdmin: true,
            isOnboardingComplete: true,
            themePreference: true,
            username: true,
            canUseVanityUrls: true,
            showPublicProfile: true,
            emails: {
              where: { isPrimary: true, isVerified: true },
              select: { email: true },
              take: 1,
            },
          },
        });

        if (dbUser) {
          token.name = dbUser.name;
          // Use primary email from UserEmail table if available, fallback to User.email
          token.email = dbUser.emails[0]?.email || dbUser.email;
          token.avatarUrl = dbUser.avatarUrl;
          token.role = dbUser.role || 'user';
          token.isAdmin = dbUser.isAdmin || false;
          token.isOnboardingComplete = dbUser.isOnboardingComplete || false;
          token.themePreference = dbUser.themePreference || 'system';
          token.username = dbUser.username;
          token.canUseVanityUrls = dbUser.canUseVanityUrls;
          token.showPublicProfile = dbUser.showPublicProfile;
        }
      }

      return token;
    },
    session: ({ session, token }) => {
      // Map JWT token data to session
      if (token && session.user) {
        session.user.id = token.id || '';
        session.user.email = token.email || '';
        session.user.name = token.name as string | null;
        session.user.avatarUrl = token.avatarUrl as string | null;
        session.user.role = token.role || 'user';
        session.user.isAdmin = token.isAdmin || false;
        session.user.isOnboardingComplete = token.isOnboardingComplete || false;
        session.user.themePreference = token.themePreference || 'system';
        session.user.username = token.username as string | null;
        session.user.canUseVanityUrls = token.canUseVanityUrls || false;
        session.user.showPublicProfile = token.showPublicProfile || false;
      }

      return session;
    },
    signIn: async ({
      user,
      account,
    }: {
      user: NextAuthUser | AdapterUser;
      account: Account | null;
    }) => {
      // For new users, registration is always enabled in MVP
      if (!user.id) {
        // This is a new user registration attempt - always allowed in MVP
      } else {
        // For existing users, ensure backward compatibility by marking onboarding complete
        // if they already have a name but isOnboardingComplete is false
        const existingUser = await db.user.findUnique({
          where: { id: user.id },
          select: { name: true, isOnboardingComplete: true },
        });

        if (existingUser?.name && !existingUser.isOnboardingComplete) {
          await db.user.update({
            where: { id: user.id },
            data: { isOnboardingComplete: true },
          });
        }
      }

      // Handle email provider (magic links)
      if (account?.provider === 'email') {
        // For magic links, allow both new and existing users (MVP: registration always enabled)
        if (user.email) {
          const userEmail = await db.userEmail.findFirst({
            where: {
              email: user.email,
              isVerified: true,
            },
            include: { user: true },
          });

          // If email exists in UserEmail and is verified, allow sign in
          if (userEmail) {
            // Update user.id to match the UserEmail's userId for proper session creation
            user.id = userEmail.userId;
            return true;
          }

          // For backward compatibility: check if email exists in User table
          const legacyUser = await db.user.findUnique({
            where: { email: user.email },
          });

          if (legacyUser) {
            // This is an existing user without UserEmail records
            // Allow sign in for backward compatibility
            user.id = legacyUser.id;
            return true;
          }

          // New user - check if signup is allowed
          if (!signupRestrictionService.isSignupAllowed(user.email)) {
            signupRestrictionService.logSignupDenial(user.email, 'email');
            const errorCode = signupRestrictionService.getErrorCode();
            return `/auth/error?error=${errorCode}`;
          }

          // Signup allowed - NextAuth's PrismaAdapter will create the user
          // The UserEmail record will be created in the events.signIn callback
          return true;
        }

        // No email provided - should not happen with email provider
        return `${process.env.NEXTAUTH_URL || 'http://localhost:3000'}/auth/error?error=EmailRequired`;
      }

      // Handle OAuth providers
      if (
        account?.provider &&
        ['google', 'facebook', 'apple', 'oauth'].includes(account.provider)
      ) {
        // OAuth providers must provide an email
        if (!user.email) {
          return `/auth/error?error=EmailRequired&provider=${account.provider}`;
        }

        try {
          // CRITICAL: First check if this OAuth account is already linked to any user
          // This prevents account hijacking attempts
          const existingAccount = await db.account.findUnique({
            where: {
              provider_providerAccountId: {
                provider: account.provider,
                providerAccountId: account.providerAccountId,
              },
            },
            include: { user: true },
          });

          if (existingAccount) {
            // OAuth account already exists - this is a normal sign-in
            return true;
          }

          // OAuth account doesn't exist yet - check if we should link it to an existing user
          // SECURITY: Only link to verified emails to prevent account hijacking
          // Attack scenario: Attacker creates account with victim@example.com (unverified),
          // then victim signs in with OAuth using same email. Without this check, victim's
          // OAuth would link to attacker's account, giving attacker access.
          const existingUserEmail = await db.userEmail.findFirst({
            where: {
              email: user.email,
              isVerified: true, // CRITICAL: Only match verified emails
            },
            include: { user: true },
          });

          // Also check legacy User table for backward compatibility
          // For legacy users, we need to verify their email is verified in UserEmail table
          let existingUser = existingUserEmail?.user;

          if (!existingUser) {
            const legacyUser = await db.user.findUnique({
              where: { email: user.email },
              include: {
                emails: {
                  where: {
                    email: user.email,
                    isVerified: true,
                  },
                },
              },
            });

            // Only use legacy user if their email is verified (has verified UserEmail record)
            if (legacyUser && legacyUser.emails.length > 0) {
              existingUser = legacyUser;
            }
          }

          if (existingUser) {
            // User exists with this email - link the OAuth account
            try {
              // Import encryption utilities for manual account creation
              const { encryptToken } = await import('@/lib/crypto/oauth-encryption');

              // Encrypt tokens before storage
              let encryptedAccessToken: string | null = null;
              let encryptedRefreshToken: string | null = null;
              let tokenIv: string | null = null;

              if (account.access_token) {
                try {
                  const encrypted = encryptToken(account.access_token);
                  encryptedAccessToken = encrypted.encrypted;
                  tokenIv = encrypted.iv;
                } catch (encryptError) {
                  logger.error(
                    'Failed to encrypt access token during manual account linking',
                    encryptError
                  );
                  // Continue with plaintext on encryption failure
                }
              }

              if (account.refresh_token && tokenIv) {
                try {
                  const encrypted = encryptToken(account.refresh_token);
                  encryptedRefreshToken = encrypted.encrypted;
                } catch (encryptError) {
                  logger.error(
                    'Failed to encrypt refresh token during manual account linking',
                    encryptError
                  );
                  // Continue with plaintext on encryption failure
                }
              }

              await db.account.create({
                data: {
                  userId: existingUser.id,
                  type: account.type,
                  provider: account.provider,
                  providerAccountId: account.providerAccountId,
                  access_token: account.access_token,
                  refresh_token: account.refresh_token ?? null,
                  expires_at: account.expires_at ?? null,
                  token_type: account.token_type ?? null,
                  scope: account.scope ?? null,
                  id_token: account.id_token ?? null,
                  session_state: account.session_state ?? null,
                  encryptedAccessToken,
                  encryptedRefreshToken,
                  tokenIv,
                },
              });

              // Ensure UserEmail record exists for this OAuth email
              await db.userEmail.upsert({
                where: {
                  email: user.email,
                },
                update: {
                  isVerified: true,
                  verifiedAt: new Date(),
                },
                create: {
                  userId: existingUser.id,
                  email: user.email,
                  isPrimary: !existingUserEmail, // Set as primary if this is their first email
                  isVerified: true,
                  verifiedAt: new Date(),
                },
              });

              return true;
            } catch (linkError) {
              // Log OAuth link errors
              logger.error('Failed to link OAuth account', linkError, {
                provider: account.provider,
                userId: existingUser.id,
              });
              return '/auth/error?error=AccountLinkFailed';
            }
          }

          // New user - check if signup is allowed
          if (!signupRestrictionService.isSignupAllowed(user.email)) {
            signupRestrictionService.logSignupDenial(user.email, account.provider);
            const errorCode = signupRestrictionService.getErrorCode();
            return `/auth/error?error=${errorCode}`;
          }

          // Signup allowed - NextAuth's PrismaAdapter will handle user creation
          // The UserEmail record will be created in the events.signIn callback
          return true;
        } catch (error) {
          // Log database errors during OAuth sign-in
          logger.error('Database error during OAuth sign-in', error, {
            provider: account?.provider,
            hasEmail: !!user.email,
          });
          return '/auth/error?error=DatabaseError';
        }
      }

      // Deny unknown providers
      return false;
    },
  },
  events: {
    signIn: async ({ user, account, profile, isNewUser }) => {
      // Regenerate session on every successful login for security
      if (user.id) {
        try {
          // Clean up any expired sessions first
          await cleanupExpiredSessions();

          // Regenerate session to prevent fixation attacks
          await regenerateSession(user.id, RegenerationReason.LOGIN);

          // Enforce maximum concurrent sessions
          await enforceMaxSessions(user.id, 5);

          logger.info({ userId: user.id, isNewUser }, 'User signed in with session regeneration');
        } catch (error) {
          logger.error('Failed to regenerate session on sign-in', error, {
            userId: user.id,
          });
          // Don't fail sign-in if session regeneration fails
        }
      }

      // Auto-admin: Make the first user an admin if no admins exist
      if (isNewUser && user.id) {
        try {
          // Use a transaction with isolation to prevent race conditions
          await db.$transaction(
            async (tx) => {
              // Check if any admin exists (more reliable than user count)
              const adminExists = await tx.user.findFirst({
                where: {
                  OR: [{ isAdmin: true }, { role: 'admin' }],
                },
                select: { id: true },
              });

              // If no admin exists, make this user an admin
              if (!adminExists) {
                await tx.user.update({
                  where: { id: user.id },
                  data: {
                    isAdmin: true,
                    role: 'admin',
                  },
                });

                logger.info(
                  { userId: user.id },
                  'First user automatically made admin (no existing admins)'
                );

                // Force token refresh by updating user's session version
                // This ensures the JWT gets regenerated with admin privileges
                await tx.user.update({
                  where: { id: user.id },
                  data: {
                    // Touch the updatedAt field to signal token refresh needed
                    updatedAt: new Date(),
                  },
                });
              }
            },
            {
              // Use serializable isolation to prevent concurrent admin creation
              isolationLevel: 'Serializable',
            }
          );
        } catch (error) {
          logger.error('Failed to auto-assign admin role to first user', error, {
            userId: user.id,
          });
          // Don't fail sign-in if admin assignment fails
        }
      }

      // For new email provider users, create UserEmail record
      if (account?.provider === 'email' && isNewUser && user.id && user.email) {
        try {
          await db.userEmail.upsert({
            where: {
              email: user.email,
            },
            update: {
              isVerified: true,
              verifiedAt: new Date(),
            },
            create: {
              userId: user.id,
              email: user.email,
              isPrimary: true, // First email is always primary
              isVerified: true, // Magic link emails are pre-verified
              verifiedAt: new Date(),
            },
          });

          logger.info(
            { userId: user.id, email: user.email, provider: 'email' },
            'Created UserEmail record for new email user'
          );
        } catch (error) {
          logger.error('Failed to create UserEmail record for email user', error, {
            userId: user.id,
            email: user.email,
          });
          // Don't fail the sign-in if UserEmail creation fails
        }
      }

      // After successful OAuth sign-in, import profile data and create UserEmail record
      if (account?.provider && account.provider !== 'email' && profile && user.id) {
        try {
          await UserProfileService.importOAuthProfile(user.id, account.provider, profile);
        } catch (error) {
          // Log profile import errors
          logger.error('Failed to import OAuth profile data', error, {
            provider: account.provider,
            userId: user.id,
          });
          // Don't fail the sign-in if profile import fails
        }

        // For new OAuth users, create UserEmail record
        if (isNewUser && user.email) {
          try {
            await db.userEmail.upsert({
              where: {
                email: user.email,
              },
              update: {
                isVerified: true,
                verifiedAt: new Date(),
              },
              create: {
                userId: user.id,
                email: user.email,
                isPrimary: true, // First email is always primary
                isVerified: true, // OAuth emails are pre-verified
                verifiedAt: new Date(),
              },
            });

            logger.info(
              { userId: user.id, email: user.email, provider: account.provider },
              'Created UserEmail record for new OAuth user'
            );
          } catch (error) {
            logger.error('Failed to create UserEmail record for OAuth user', error, {
              provider: account.provider,
              userId: user.id,
              email: user.email,
            });
            // Don't fail the sign-in if UserEmail creation fails
          }
        }
      }
    },
    signOut: ({ session }) => {
      // Log sign-out event
      if (session?.user?.id) {
        logger.info({ userId: session.user.id }, 'User signed out');
      }
    },
  },
  pages: {
    signIn: '/auth/login',
    error: '/auth/error',
    verifyRequest: '/auth/verify-request',
  },
  // Cookie configuration for localhost development
  // __Host- and __Secure- prefixes require HTTPS, which breaks on localhost
  cookies: {
    sessionToken: {
      name: `${process.env.NODE_ENV === 'production' ? '__Secure-' : ''}next-auth.session-token`,
      options: {
        httpOnly: true,
        sameSite: 'lax',
        path: '/',
        secure: process.env.NODE_ENV === 'production',
      },
    },
    callbackUrl: {
      name: `${process.env.NODE_ENV === 'production' ? '__Secure-' : ''}next-auth.callback-url`,
      options: {
        sameSite: 'lax',
        path: '/',
        secure: process.env.NODE_ENV === 'production',
      },
    },
    csrfToken: {
      name: `${process.env.NODE_ENV === 'production' ? '__Host-' : ''}next-auth.csrf-token`,
      options: {
        httpOnly: true,
        sameSite: 'lax',
        path: '/',
        secure: process.env.NODE_ENV === 'production',
      },
    },
  },
};

export { authOptions };
