/**
 * Expired Token Cleanup Cron Endpoint
 *
 * Protected endpoint called by external cron scheduler to clean up expired tokens.
 * Requires CRON_SECRET environment variable for authorization.
 */

import { timingSafeEqual } from 'crypto';

import { NextRequest, NextResponse } from 'next/server';

import { cleanupExpiredTokens } from '@/lib/cron/cleanup-expired-tokens';
import { logger } from '@/lib/services/logger';

/**
 * Performs constant-time string comparison to prevent timing attacks.
 * Returns false for different length strings without leaking length info.
 */
function secureCompare(a: string, b: string): boolean {
  // Handle different lengths safely (timingSafeEqual requires same length)
  if (a.length !== b.length) {
    // Still do a comparison to avoid timing leak on length check
    timingSafeEqual(Buffer.from(a), Buffer.from(a));
    return false;
  }
  return timingSafeEqual(Buffer.from(a), Buffer.from(b));
}

export async function GET(request: NextRequest) {
  // Verify cron secret to prevent unauthorized access
  const authHeader = request.headers.get('authorization');
  const expectedAuth = `Bearer ${process.env.CRON_SECRET}`;

  if (!process.env.CRON_SECRET) {
    logger.error('CRON_SECRET environment variable not set');
    return NextResponse.json({ error: 'Server configuration error' }, { status: 500 });
  }

  if (!authHeader || !secureCompare(authHeader, expectedAuth)) {
    logger.warn('Unauthorized cron request attempt:', {
      hasAuth: !!authHeader,
      ip: request.headers.get('x-forwarded-for') || 'unknown',
    });
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const result = await cleanupExpiredTokens();
    return NextResponse.json(result);
  } catch (error) {
    logger.error('Cron job failed:', error);
    return NextResponse.json({ error: 'Cleanup failed', details: String(error) }, { status: 500 });
  }
}
