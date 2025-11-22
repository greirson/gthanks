import nodemailer from 'nodemailer';
import type { Transporter } from 'nodemailer';
import { Resend } from 'resend';

interface EmailOptions {
  to: string;
  subject: string;
  html: string;
}

interface EmailService {
  send(options: EmailOptions): Promise<void>;
  verify?(): Promise<boolean>;
}

class ConsoleEmailService implements EmailService {
  send(options: EmailOptions): Promise<void> {
    // Extract the actual URL from the HTML for console display
    const urlMatch = options.html.match(/href="([^"]+)"/);
    const url = urlMatch
      ? urlMatch[1]
          .replace(/&amp;/g, '&')
          .replace(/&#x2F;/g, '/')
          .replace(/&#x3D;/g, '=')
      : 'URL not found';

    console.warn('=== EMAIL SENT ===');
    console.warn('To:', options.to);
    console.warn('Subject:', options.subject);
    console.warn('Sign-in URL:', url);
    console.warn('=================');
    return Promise.resolve();
  }
}

class SMTPEmailService implements EmailService {
  private transporter: Transporter;

  constructor() {
    if (!process.env.SMTP_HOST || !process.env.SMTP_PORT) {
      throw new Error('SMTP configuration missing: SMTP_HOST and SMTP_PORT are required');
    }

    const secure = process.env.SMTP_SECURE === 'true' || process.env.SMTP_PORT === '465';

    this.transporter = nodemailer.createTransport({
      host: process.env.SMTP_HOST,
      port: parseInt(process.env.SMTP_PORT, 10),
      secure,
      auth:
        process.env.SMTP_USER && process.env.SMTP_PASS
          ? {
              user: process.env.SMTP_USER,
              pass: process.env.SMTP_PASS,
            }
          : undefined,
    });
  }

  async send(options: EmailOptions): Promise<void> {
    try {
      const from = process.env.EMAIL_FROM || 'noreply@localhost';

      const info = await this.transporter.sendMail({
        from,
        to: options.to,
        subject: options.subject,
        html: options.html,
      });

      // eslint-disable-next-line no-console
      console.log('Email sent successfully:', (info as { messageId?: string }).messageId);
    } catch (error) {
      console.error('Failed to send email:', error);
      throw new Error(
        `Failed to send email: ${error instanceof Error ? error.message : 'Unknown error'}`
      );
    }
  }

  async verify(): Promise<boolean> {
    try {
      await this.transporter.verify();
      // eslint-disable-next-line no-console
      console.log('SMTP connection verified successfully');
      return true;
    } catch (error) {
      console.error('SMTP verification failed:', error);
      return false;
    }
  }
}

class ResendEmailService implements EmailService {
  private resend: Resend;
  private from: string;

  constructor() {
    const apiKey = process.env.RESEND_API_KEY;
    if (!apiKey) {
      throw new Error('Resend configuration missing: RESEND_API_KEY is required');
    }

    this.resend = new Resend(apiKey);
    this.from = process.env.EMAIL_FROM || 'noreply@localhost';
  }

  async send(options: EmailOptions): Promise<void> {
    try {
      // eslint-disable-next-line no-console
      console.log('Sending email via Resend:', {
        from: this.from,
        to: options.to,
        subject: options.subject,
        htmlLength: options.html?.length || 0,
      });

      const { data, error } = await this.resend.emails.send({
        from: this.from,
        to: options.to,
        subject: options.subject,
        html: options.html,
      });

      if (error) {
        console.error('Resend API error:', error);
        throw new Error(`Resend API error: ${JSON.stringify(error)}`);
      }

      // eslint-disable-next-line no-console
      console.log('Email sent successfully via Resend:', data?.id);
    } catch (error) {
      console.error('Failed to send email via Resend:', error);
      throw new Error(
        `Failed to send email via Resend: ${error instanceof Error ? error.message : JSON.stringify(error)}`
      );
    }
  }

  async verify(): Promise<boolean> {
    try {
      // Test the API key by attempting to get domains
      const { error } = await this.resend.domains.list();

      if (error) {
        console.error('Resend verification failed:', error);
        return false;
      }

      // eslint-disable-next-line no-console
      console.log('Resend API key verified successfully');
      return true;
    } catch (error) {
      console.error('Resend verification failed:', error);
      return false;
    }
  }
}

export function createEmailService(): EmailService {
  const provider = process.env.EMAIL_PROVIDER || 'console';

  switch (provider) {
    case 'console':
      return new ConsoleEmailService();
    case 'smtp':
      return new SMTPEmailService();
    case 'resend':
      return new ResendEmailService();
    default:
      console.warn(`Unknown email provider: ${provider}, falling back to console`);
      return new ConsoleEmailService();
  }
}

export interface ListInvitationEmailData {
  inviterName: string;
  listName: string;
  listDescription?: string;
  acceptUrl: string;
  isExistingUser: boolean;
}

export async function sendMagicLink(email: string, token: string, baseUrl?: string) {
  const emailService = createEmailService();
  // Use provided baseUrl or fall back to environment variable
  const url = baseUrl || process.env.NEXTAUTH_URL || 'http://localhost:3000';
  const loginUrl = `${url}/api/auth/verify?token=${token}`;

  await emailService.send({
    to: email,
    subject: 'Sign in to gthanks',
    html: `
      <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto;">
        <h1>Sign in to gthanks</h1>
        <p>Click the link below to sign in to your account:</p>
        <a href="${loginUrl}" style="display: inline-block; padding: 12px 24px; background: #000; color: #fff; text-decoration: none; border-radius: 6px;">
          Sign In
        </a>
        <p style="color: #666; font-size: 14px; margin-top: 20px;">
          This link will expire in 15 minutes. If you didn't request this, please ignore this email.
        </p>
      </div>
    `,
  });
}

export async function sendListInvitation(
  email: string,
  data: ListInvitationEmailData
): Promise<void> {
  const emailService = createEmailService();

  const subject = data.isExistingUser
    ? `${data.inviterName} invited you to co-manage their list on GThanks`
    : `${data.inviterName} invited you to co-manage a list on GThanks`;

  const html = data.isExistingUser
    ? createExistingUserInvitationTemplate(data)
    : createNewUserInvitationTemplate(data);

  try {
    await emailService.send({
      to: email,
      subject,
      html,
    });
  } catch (error) {
    throw new Error(
      `Failed to send list invitation email: ${error instanceof Error ? error.message : 'Unknown error'}`
    );
  }
}

function createExistingUserInvitationTemplate(data: ListInvitationEmailData): string {
  return `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>List Co-Manager Invitation</title>
    </head>
    <body style="margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; line-height: 1.6; color: #333;">
      <div style="max-width: 600px; margin: 0 auto; padding: 40px 20px; background-color: #ffffff;">
        <!-- Header -->
        <div style="text-align: center; margin-bottom: 40px;">
          <h1 style="margin: 0; color: #1a1a1a; font-size: 28px; font-weight: 600;">GThanks</h1>
          <p style="margin: 8px 0 0; color: #666; font-size: 16px;">Wishlist Co-Manager Invitation</p>
        </div>

        <!-- Main Content -->
        <div style="background-color: #f8f9fa; border-radius: 12px; padding: 32px; margin-bottom: 32px;">
          <h2 style="margin: 0 0 16px; color: #1a1a1a; font-size: 24px; font-weight: 600;">You're Invited!</h2>
          
          <p style="margin: 0 0 16px; color: #333; font-size: 16px;">
            <strong>${data.inviterName}</strong> has invited you to co-manage their wishlist:
          </p>
          
          <div style="background-color: #ffffff; border-radius: 8px; padding: 20px; margin: 20px 0; border-left: 4px solid #007bff;">
            <h3 style="margin: 0 0 8px; color: #1a1a1a; font-size: 18px; font-weight: 600;">${data.listName}</h3>
            ${data.listDescription ? `<p style="margin: 0; color: #666; font-size: 14px;">${data.listDescription}</p>` : ''}
          </div>

          <p style="margin: 16px 0; color: #333; font-size: 16px;">
            As a co-manager, you'll be able to help organize and manage wishes in this list.
          </p>
        </div>

        <!-- Call to Action -->
        <div style="text-align: center; margin: 32px 0;">
          <a href="${data.acceptUrl}" 
             style="display: inline-block; background-color: #007bff; color: #ffffff; text-decoration: none; padding: 14px 28px; border-radius: 8px; font-weight: 600; font-size: 16px; border: none; cursor: pointer;">
            Accept Invitation
          </a>
        </div>

        <!-- Footer -->
        <div style="border-top: 1px solid #e9ecef; padding-top: 24px; text-align: center;">
          <p style="margin: 0 0 8px; color: #666; font-size: 14px;">
            This invitation expires in 7 days
          </p>
          <p style="margin: 0; color: #999; font-size: 12px;">
            If you didn't expect this invitation, please ignore this email.
          </p>
        </div>
      </div>
    </body>
    </html>
  `;
}

function createNewUserInvitationTemplate(data: ListInvitationEmailData): string {
  return `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>List Co-Manager Invitation</title>
    </head>
    <body style="margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; line-height: 1.6; color: #333;">
      <div style="max-width: 600px; margin: 0 auto; padding: 40px 20px; background-color: #ffffff;">
        <!-- Header -->
        <div style="text-align: center; margin-bottom: 40px;">
          <h1 style="margin: 0; color: #1a1a1a; font-size: 28px; font-weight: 600;">GThanks</h1>
          <p style="margin: 8px 0 0; color: #666; font-size: 16px;">You've been invited to join!</p>
        </div>

        <!-- Main Content -->
        <div style="background-color: #f8f9fa; border-radius: 12px; padding: 32px; margin-bottom: 32px;">
          <h2 style="margin: 0 0 16px; color: #1a1a1a; font-size: 24px; font-weight: 600;">Welcome to GThanks!</h2>
          
          <p style="margin: 0 0 16px; color: #333; font-size: 16px;">
            <strong>${data.inviterName}</strong> has invited you to co-manage their wishlist on GThanks:
          </p>
          
          <div style="background-color: #ffffff; border-radius: 8px; padding: 20px; margin: 20px 0; border-left: 4px solid #007bff;">
            <h3 style="margin: 0 0 8px; color: #1a1a1a; font-size: 18px; font-weight: 600;">${data.listName}</h3>
            ${data.listDescription ? `<p style="margin: 0; color: #666; font-size: 14px;">${data.listDescription}</p>` : ''}
          </div>

          <div style="background-color: #e3f2fd; border-radius: 8px; padding: 20px; margin: 20px 0;">
            <h4 style="margin: 0 0 12px; color: #1565c0; font-size: 16px; font-weight: 600;">What is GThanks?</h4>
            <p style="margin: 0; color: #1565c0; font-size: 14px;">
              GThanks helps families coordinate wishlists to prevent duplicate gifts. As a co-manager, you'll help organize and manage wishes in this shared list.
            </p>
          </div>
        </div>

        <!-- Call to Action -->
        <div style="text-align: center; margin: 32px 0;">
          <a href="${data.acceptUrl}" 
             style="display: inline-block; background-color: #007bff; color: #ffffff; text-decoration: none; padding: 14px 28px; border-radius: 8px; font-weight: 600; font-size: 16px; border: none; cursor: pointer;">
            Sign Up & Accept Invitation
          </a>
          <p style="margin: 12px 0 0; color: #666; font-size: 14px;">
            You'll create your account and accept the invitation in one step
          </p>
        </div>

        <!-- Footer -->
        <div style="border-top: 1px solid #e9ecef; padding-top: 24px; text-align: center;">
          <p style="margin: 0 0 8px; color: #666; font-size: 14px;">
            This invitation expires in 7 days
          </p>
          <p style="margin: 0; color: #999; font-size: 12px;">
            If you didn't expect this invitation, please ignore this email.
          </p>
        </div>
      </div>
    </body>
    </html>
  `;
}

export async function sendReservationConfirmation(data: {
  to: string;
  userName: string;
  wishTitle: string;
  ownerName: string;
  productUrl?: string;
}) {
  const emailService = createEmailService();

  const { getReservationConfirmationEmail } = await import('./templates/reservation-confirmation');
  const text = getReservationConfirmationEmail({
    userName: data.userName,
    wishTitle: data.wishTitle,
    ownerName: data.ownerName,
    productUrl: data.productUrl,
  });

  await emailService.send({
    to: data.to,
    subject: `You reserved "${data.wishTitle}"`,
    html: text.replace(/\n/g, '<br>'),
  });
}

// Export for testing and verification
export async function verifyEmailConfiguration(): Promise<{
  provider: string;
  configured: boolean;
  verified: boolean;
  error?: string;
}> {
  const provider = process.env.EMAIL_PROVIDER || 'console';

  try {
    const emailService = createEmailService();
    const verified = emailService.verify ? await emailService.verify() : true;

    return {
      provider,
      configured: true,
      verified,
    };
  } catch (error) {
    return {
      provider,
      configured: false,
      verified: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}
