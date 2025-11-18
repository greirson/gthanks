import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';

import { getCurrentAdmin } from '@/lib/auth-admin';
import { userService } from '@/lib/services/user-service';
import { generateVerificationToken, sendVerificationEmail } from '@/lib/email-verification';
import { getUserFriendlyError } from '@/lib/errors';
import { logger } from '@/lib/services/logger';

interface RouteParams {
  params: {
    userId: string;
  };
}

const AddEmailSchema = z.object({
  email: z.string().email('Invalid email address'),
  sendVerification: z.boolean().default(true),
});

/**
 * GET /api/admin/users/[userId]/emails
 * List all emails for a user
 */
export async function GET(request: NextRequest, { params }: RouteParams) {
  try {
    // Check admin authorization
    const admin = await getCurrentAdmin();
    if (!admin) {
      return NextResponse.json(
        { error: getUserFriendlyError('UNAUTHORIZED'), code: 'UNAUTHORIZED' },
        { status: 401 }
      );
    }

    const { userId } = params;

    // Fetch all emails for user using service
    const emails = await userService.getUserEmails(userId);

    return NextResponse.json({ emails });
  } catch (error) {
    logger.error({ error: error }, 'Admin list emails error');
    return NextResponse.json(
      { error: 'Something went wrong. Please try again', code: 'INTERNAL_ERROR' },
      { status: 500 }
    );
  }
}

/**
 * POST /api/admin/users/[userId]/emails
 * Add email for a user
 */
export async function POST(request: NextRequest, { params }: RouteParams) {
  try {
    // Check admin authorization
    const admin = await getCurrentAdmin();
    if (!admin) {
      return NextResponse.json(
        { error: getUserFriendlyError('UNAUTHORIZED'), code: 'UNAUTHORIZED' },
        { status: 401 }
      );
    }

    const { userId } = params;
    const body = await request.json();

    // Validate input
    const { email, sendVerification } = AddEmailSchema.parse(body);

    // Check if user exists
    try {
      await userService.getUserById(userId);
    } catch (error) {
      return NextResponse.json(
        { error: getUserFriendlyError('NOT_FOUND', 'User not found'), code: 'NOT_FOUND' },
        { status: 404 }
      );
    }

    // Create email using service (but handle verification email separately for admin message)
    let newEmail;
    try {
      // Add email without sending verification (we'll send custom admin message)
      newEmail = await userService.addEmail(userId, email, false);
    } catch (error: any) {
      // Handle conflict error from service
      if (error.message?.includes('already in use')) {
        return NextResponse.json(
          {
            error: getUserFriendlyError('CONFLICT', 'Email already exists for this user'),
            code: 'CONFLICT',
          },
          { status: 409 }
        );
      }
      throw error;
    }

    // Optionally send verification email with custom admin message
    if (sendVerification) {
      try {
        const token = await generateVerificationToken(newEmail.id);
        await sendVerificationEmail(
          newEmail.email,
          token,
          'An admin has added this email to your account. Please verify to complete the setup:'
        );
      } catch (emailError) {
        logger.error({ error: emailError }, 'Failed to send verification email');
        // Continue - email was created successfully even if verification email failed
      }
    }

    return NextResponse.json(
      {
        email: newEmail,
        message: sendVerification
          ? 'Email added successfully. Verification email sent.'
          : 'Email added successfully.',
      },
      { status: 201 }
    );
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        {
          error: getUserFriendlyError('VALIDATION_ERROR', error.errors[0].message),
          code: 'VALIDATION_ERROR',
        },
        { status: 400 }
      );
    }

    logger.error({ error: error }, 'Admin add email error');
    return NextResponse.json(
      { error: 'Something went wrong. Please try again', code: 'INTERNAL_ERROR' },
      { status: 500 }
    );
  }
}
