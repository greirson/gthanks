import { NextRequest, NextResponse } from 'next/server';

import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { listInvitationService } from '@/lib/services/list-invitation.service';
import { logger } from '@/lib/services/logger';

export async function POST(_request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);

    // Only allow admin users to run cleanup
    if (!session?.user?.isAdmin) {
      return NextResponse.json({ error: 'Admin access required' }, { status: 403 });
    }

    const result = await listInvitationService.cleanupExpiredInvitations();

    return NextResponse.json({
      message: 'Cleanup completed successfully',
      deletedCount: result.deletedCount,
    });
  } catch (error) {
    logger.error({ error: error }, 'Error cleaning up expired invitations');
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
