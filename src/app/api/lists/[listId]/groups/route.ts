import { NextRequest, NextResponse } from 'next/server';

import { getCurrentUser } from '@/lib/auth-utils';
import { db } from '@/lib/db';
import { getUserFriendlyError } from '@/lib/errors';
import { permissionService } from '@/lib/services/permission-service';
import { logger } from '@/lib/services/logger';

interface RouteParams {
  params: {
    listId: string;
  };
}

// GET /api/lists/[listId]/groups - Get all groups that contain this list
export async function GET(request: NextRequest, { params }: RouteParams) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json(
        { error: getUserFriendlyError('UNAUTHORIZED'), code: 'UNAUTHORIZED' },
        { status: 401 }
      );
    }

    // Check if user can view the list
    const permission = await permissionService.can(user.id, 'view', {
      type: 'list',
      id: params.listId,
    });
    if (!permission.allowed) {
      return NextResponse.json(
        {
          error: getUserFriendlyError('FORBIDDEN', permission.reason),
          code: 'FORBIDDEN',
        },
        { status: 403 }
      );
    }

    // Get all groups that contain this list, where the current user is also a member
    const groups = await db.group.findMany({
      where: {
        lists: {
          some: {
            listId: params.listId,
          },
        },
        members: {
          some: {
            userId: user.id,
          },
        },
      },
      include: {
        _count: {
          select: {
            members: true,
            lists: true,
          },
        },
        members: {
          where: {
            userId: user.id,
          },
          select: {
            role: true,
          },
        },
      },
      orderBy: {
        name: 'asc',
      },
    });

    // Transform the data to match the expected format
    const transformedGroups = groups.map((group) => ({
      id: group.id,
      name: group.name,
      description: group.description,
      avatarUrl: group.avatarUrl,
      visibility: group.visibility,
      createdAt: group.createdAt.toISOString(),
      updatedAt: group.updatedAt.toISOString(),
      _count: group._count,
      currentUserRole: group.members[0]?.role || null,
    }));

    return NextResponse.json(transformedGroups);
  } catch (error) {
    logger.error({ error: error }, 'Error fetching groups for list');
    return NextResponse.json(
      { error: 'Something went wrong. Please try again', code: 'INTERNAL_ERROR' },
      { status: 500 }
    );
  }
}
