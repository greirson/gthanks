import { NextResponse } from 'next/server';
import { signupRestrictionService } from '@/lib/services/signup-restriction.service';

/**
 * GET /api/settings/signups-disabled
 *
 * Returns whether signups are globally disabled.
 * This is a public endpoint (no authentication required).
 */
export function GET() {
  return NextResponse.json({
    disabled: signupRestrictionService.isSignupsDisabled(),
  });
}
