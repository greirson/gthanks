import { NextRequest, NextResponse } from 'next/server';

import { getCurrentUser } from '@/lib/auth-utils';
import { getClientIdentifier, getRateLimitHeaders, rateLimiter } from '@/lib/rate-limiter';
import { userService } from '@/lib/services/user-service';
import { logger } from '@/lib/services/logger';

export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    // 1. Rate limiting
    const identifier = getClientIdentifier(req);
    const rateLimitResult = await rateLimiter.check('email-resend', identifier);

    if (!rateLimitResult.allowed) {
      return NextResponse.json(
        { error: 'Too many resend requests. Please try again later.' },
        { status: 429, headers: getRateLimitHeaders(rateLimitResult) }
      );
    }

    // 2. Authentication
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // 3. Use service layer to resend verification email
    await userService.resendVerificationEmail(user.id, params.id);

    return NextResponse.json(
      { success: true, message: 'Verification email sent' },
      { headers: getRateLimitHeaders(rateLimitResult) }
    );
  } catch (error) {
    logger.error({ error: error }, 'Resend verification email error');
    return NextResponse.json(
      { error: 'Failed to resend verification email' },
      { status: 500 }
    );
  }
}
