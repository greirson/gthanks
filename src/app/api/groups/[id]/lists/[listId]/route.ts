import { NextRequest, NextResponse } from 'next/server';

import { getCurrentUser } from '@/lib/auth-utils';
import { AppError } from '@/lib/errors';
import { groupService } from '@/lib/services/group/group.service';
import { permissionService } from '@/lib/services/permission-service';

interface RouteParams {
  params: {
    id: string;
    listId: string;
  };
}

// DELETE /api/groups/[id]/lists/[listId] - Remove list from group
export async function DELETE(request: NextRequest, { params }: RouteParams) {
  try {
    const user = await getCurrentUser();

    if (!user) {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
    }

    // Check if user can manage group lists (admin only)
    await permissionService.require(user.id, 'admin', { type: 'group', id: params.id });

    await groupService.removeListFromGroup(params.id, params.listId, user.id);

    return NextResponse.json({ success: true });
  } catch (error) {
    if (error instanceof AppError) {
      return NextResponse.json(
        { error: error.message, code: error.code },
        { status: error.statusCode }
      );
    }

    return NextResponse.json({ error: 'Failed to remove list from group' }, { status: 500 });
  }
}
