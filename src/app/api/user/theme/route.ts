import { z } from 'zod';

import { NextRequest, NextResponse } from 'next/server';

import { getCurrentUser } from '@/lib/auth-utils';
import { getUserFriendlyError } from '@/lib/errors';
import { db } from '@/lib/db';
import { logger } from '@/lib/services/logger';

const themeSchema = z.object({
  theme: z.enum(['light', 'dark', 'system']),
});

export async function POST(request: NextRequest) {
  try {
    const user = await getCurrentUser();

    if (!user?.id) {
      return NextResponse.json(
        { error: getUserFriendlyError('UNAUTHORIZED'), code: 'UNAUTHORIZED' },
        { status: 401 }
      );
    }

    const body = (await request.json()) as unknown;
    const result = themeSchema.safeParse(body);

    if (!result.success) {
      return NextResponse.json(
        {
          error: getUserFriendlyError('VALIDATION_ERROR', 'Invalid theme value'),
          code: 'VALIDATION_ERROR',
        },
        { status: 400 }
      );
    }

    const { theme } = result.data;

    // Update user's theme preference
    await db.user.update({
      where: { id: user.id },
      data: { themePreference: theme },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    logger.error({ error: error }, 'Failed to update theme preference');
    return NextResponse.json(
      { error: getUserFriendlyError('INTERNAL_ERROR'), code: 'INTERNAL_ERROR' },
      { status: 500 }
    );
  }
}
