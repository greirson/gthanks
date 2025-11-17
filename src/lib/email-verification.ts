import crypto from 'crypto';
import { db } from './db';
import { createEmailService } from './email';

/**
 * Email verification utilities for multiple email addresses feature
 *
 * Provides cryptographically secure token generation, verification,
 * and email sending for user email verification workflow.
 */

const VERIFICATION_TOKEN_BYTES = 32;
const TOKEN_EXPIRY_HOURS = 24; // 24 hours for MVP (can be made non-expiring if needed)

/**
 * Generate a cryptographically secure verification token
 *
 * @param emailId - The ID of the UserEmail record to generate token for
 * @returns The generated token string
 */
export async function generateVerificationToken(emailId: string): Promise<string> {
  // Generate cryptographically secure random token
  const token = crypto.randomBytes(VERIFICATION_TOKEN_BYTES).toString('hex');

  // Calculate expiry time (24 hours from now)
  const expiresAt = new Date();
  expiresAt.setHours(expiresAt.getHours() + TOKEN_EXPIRY_HOURS);

  try {
    // Store token in database
    await db.userEmail.update({
      where: { id: emailId },
      data: {
        verificationToken: token,
        tokenExpiresAt: expiresAt,
      },
    });

    return token;
  } catch (error) {
    throw new Error(
      `Failed to generate verification token: ${error instanceof Error ? error.message : 'Unknown error'}`
    );
  }
}

/**
 * Verify an email using the verification token
 *
 * @param token - The verification token from the email link
 * @returns The verified UserEmail record or null if invalid/expired
 */
export async function verifyEmailToken(token: string): Promise<{
  id: string;
  email: string;
  userId: string;
  isPrimary: boolean;
  isVerified: boolean;
  verifiedAt: Date | null;
} | null> {
  try {
    // Find the email by verification token
    const userEmail = await db.userEmail.findUnique({
      where: { verificationToken: token },
      select: {
        id: true,
        email: true,
        userId: true,
        isPrimary: true,
        isVerified: true,
        verifiedAt: true,
        tokenExpiresAt: true,
      },
    });

    // Token not found
    if (!userEmail) {
      return null;
    }

    // Check if token is expired
    if (userEmail.tokenExpiresAt && userEmail.tokenExpiresAt < new Date()) {
      return null;
    }

    // Already verified - return the record without updating
    if (userEmail.isVerified) {
      return userEmail;
    }

    // Mark email as verified and clear the token
    const verifiedEmail = await db.userEmail.update({
      where: { id: userEmail.id },
      data: {
        isVerified: true,
        verifiedAt: new Date(),
        verificationToken: null,
        tokenExpiresAt: null,
      },
      select: {
        id: true,
        email: true,
        userId: true,
        isPrimary: true,
        isVerified: true,
        verifiedAt: true,
      },
    });

    return verifiedEmail;
  } catch (error) {
    console.error('Error verifying email token:', error);
    return null;
  }
}

/**
 * Send verification email to the user
 *
 * @param email - The email address to send verification to
 * @param token - The verification token
 * @param customMessage - Optional custom message to display in the email (e.g., for email change flow)
 * @returns Promise that resolves when email is sent
 */
export async function sendVerificationEmail(
  email: string,
  token: string,
  customMessage?: string
): Promise<void> {
  const emailService = createEmailService();
  const baseUrl = process.env.NEXTAUTH_URL || 'http://localhost:3000';
  const verificationUrl = `${baseUrl}/api/user/emails/verify?token=${token}`;

  try {
    await emailService.send({
      to: email,
      subject: 'Verify your email address - GThanks',
      html: createVerificationEmailTemplate(email, verificationUrl, customMessage),
    });
  } catch (error) {
    throw new Error(
      `Failed to send verification email: ${error instanceof Error ? error.message : 'Unknown error'}`
    );
  }
}

/**
 * Check if an email is verified
 *
 * @param emailId - The ID of the UserEmail record
 * @returns true if verified, false otherwise
 */
export async function isEmailVerified(emailId: string): Promise<boolean> {
  try {
    const userEmail = await db.userEmail.findUnique({
      where: { id: emailId },
      select: { isVerified: true },
    });

    return userEmail?.isVerified ?? false;
  } catch (error) {
    console.error('Error checking email verification status:', error);
    return false;
  }
}

/**
 * Check if a verification email can be resent (rate limiting)
 *
 * For MVP: Simple check - can resend if no token was sent in last 5 minutes
 *
 * @param emailId - The ID of the UserEmail record
 * @returns true if verification can be resent, false if rate limited
 */
export async function canResendVerification(emailId: string): Promise<boolean> {
  try {
    const userEmail = await db.userEmail.findUnique({
      where: { id: emailId },
      select: {
        isVerified: true,
        tokenExpiresAt: true,
      },
    });

    // Already verified - no need to resend
    if (!userEmail || userEmail.isVerified) {
      return false;
    }

    // No token yet - can send
    if (!userEmail.tokenExpiresAt) {
      return true;
    }

    // Check if token was created less than 5 minutes ago
    // tokenExpiresAt is TOKEN_EXPIRY_HOURS in the future, so we need to calculate when it was created
    const tokenCreatedAt = new Date(userEmail.tokenExpiresAt);
    tokenCreatedAt.setHours(tokenCreatedAt.getHours() - TOKEN_EXPIRY_HOURS);

    const fiveMinutesAgo = new Date();
    fiveMinutesAgo.setMinutes(fiveMinutesAgo.getMinutes() - 5);

    // Can resend if token was created more than 5 minutes ago
    return tokenCreatedAt < fiveMinutesAgo;
  } catch (error) {
    console.error('Error checking resend eligibility:', error);
    return false;
  }
}

/**
 * Resend verification email for an email address
 *
 * @param emailId - The ID of the UserEmail record
 * @returns true if email was sent, false if rate limited or already verified
 */
export async function resendVerificationEmail(emailId: string): Promise<{
  success: boolean;
  reason?: string;
}> {
  try {
    // Check if already verified
    const userEmail = await db.userEmail.findUnique({
      where: { id: emailId },
      select: {
        email: true,
        isVerified: true,
      },
    });

    if (!userEmail) {
      return { success: false, reason: 'Email not found' };
    }

    if (userEmail.isVerified) {
      return { success: false, reason: 'Email already verified' };
    }

    // Check rate limiting
    const canResend = await canResendVerification(emailId);
    if (!canResend) {
      return { success: false, reason: 'Please wait before requesting another verification email' };
    }

    // Generate new token and send email
    const token = await generateVerificationToken(emailId);
    await sendVerificationEmail(userEmail.email, token);

    return { success: true };
  } catch (error) {
    console.error('Error resending verification email:', error);
    return {
      success: false,
      reason: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}

/**
 * Create HTML template for verification email
 */
function createVerificationEmailTemplate(
  email: string,
  verificationUrl: string,
  customMessage?: string
): string {
  // Default message or custom message (e.g., for email change flow)
  const message = customMessage || 'Please verify your email address to complete the setup:';

  return `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>Verify Your Email Address</title>
    </head>
    <body style="margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; line-height: 1.6; color: #333;">
      <div style="max-width: 600px; margin: 0 auto; padding: 40px 20px; background-color: #ffffff;">
        <!-- Header -->
        <div style="text-align: center; margin-bottom: 40px;">
          <h1 style="margin: 0; color: #1a1a1a; font-size: 28px; font-weight: 600;">GThanks</h1>
          <p style="margin: 8px 0 0; color: #666; font-size: 16px;">Email Verification</p>
        </div>

        <!-- Main Content -->
        <div style="background-color: #f8f9fa; border-radius: 12px; padding: 32px; margin-bottom: 32px;">
          <h2 style="margin: 0 0 16px; color: #1a1a1a; font-size: 24px; font-weight: 600;">Verify Your Email Address</h2>

          <p style="margin: 0 0 16px; color: #333; font-size: 16px;">
            ${message}
          </p>

          <div style="background-color: #ffffff; border-radius: 8px; padding: 20px; margin: 20px 0; border-left: 4px solid #007bff;">
            <p style="margin: 0; color: #666; font-size: 14px; word-break: break-all;">${email}</p>
          </div>

          <p style="margin: 16px 0; color: #333; font-size: 16px;">
            Click the button below to verify this email address:
          </p>
        </div>

        <!-- Call to Action -->
        <div style="text-align: center; margin: 32px 0;">
          <a href="${verificationUrl}"
             style="display: inline-block; background-color: #007bff; color: #ffffff; text-decoration: none; padding: 14px 28px; border-radius: 8px; font-weight: 600; font-size: 16px; border: none; cursor: pointer;">
            Verify Email Address
          </a>
        </div>

        <!-- Alternative Link -->
        <div style="margin: 24px 0; padding: 20px; background-color: #f8f9fa; border-radius: 8px;">
          <p style="margin: 0 0 8px; color: #666; font-size: 14px;">
            If the button doesn't work, copy and paste this link into your browser:
          </p>
          <p style="margin: 0; color: #007bff; font-size: 12px; word-break: break-all;">
            ${verificationUrl}
          </p>
        </div>

        <!-- Footer -->
        <div style="border-top: 1px solid #e9ecef; padding-top: 24px; text-align: center;">
          <p style="margin: 0 0 8px; color: #666; font-size: 14px;">
            This verification link expires in ${TOKEN_EXPIRY_HOURS} hours
          </p>
          <p style="margin: 0; color: #999; font-size: 12px;">
            If you didn't add this email address, please ignore this email.
          </p>
        </div>
      </div>
    </body>
    </html>
  `;
}
