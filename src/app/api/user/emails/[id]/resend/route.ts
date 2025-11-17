import { NextRequest, NextResponse } from 'next/server';

import { getCurrentUser } from '@/lib/auth-utils';
import { db } from '@/lib/db';
import { resendVerificationEmail } from '@/lib/email-verification';
import { getClientIdentifier, getRateLimitHeaders, rateLimiter } from '@/lib/rate-limiter';

export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  // 1. Rate limiting
  const identifier = getClientIdentifier(req);
  const rateLimitResult = rateLimiter.check('email-resend', identifier);

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

  // 3. Verify ownership
  const userEmail = await db.userEmail.findUnique({
    where: { id: params.id },
  });

  if (!userEmail || userEmail.userId !== user.id) {
    return NextResponse.json({ error: 'Email not found or unauthorized' }, { status: 403 });
  }

  // 4. Resend verification
  const result = await resendVerificationEmail(params.id);

  if (!result.success) {
    return NextResponse.json(
      { error: result.reason || 'Failed to resend verification email' },
      { status: 400 }
    );
  }

  return NextResponse.json(
    { success: true, message: 'Verification email sent' },
    { headers: getRateLimitHeaders(rateLimitResult) }
  );
}
