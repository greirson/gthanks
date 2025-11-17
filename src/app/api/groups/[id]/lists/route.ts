import { z } from 'zod';

import { NextRequest, NextResponse } from 'next/server';

import { getCurrentUser } from '@/lib/auth-utils';
import { AppError, getUserFriendlyError } from '@/lib/errors';
import { groupService } from '@/lib/services/group/group.service';
import { permissionService } from '@/lib/services/permission-service';
import { serializePrismaResponse } from '@/lib/utils/date-serialization';
import { GroupShareListsSchema } from '@/lib/validators/group';
import { logger } from '@/lib/services/logger';

interface RouteParams {
  params: {
    id: string;
  };
}

// GET /api/groups/[id]/lists - Get lists shared with group
export async function GET(request: NextRequest, { params }: RouteParams) {
  try {
    const user = await getCurrentUser();

    if (!user) {
      return NextResponse.json(
        { error: getUserFriendlyError('UNAUTHORIZED'), code: 'UNAUTHORIZED' },
        { status: 401 }
      );
    }

    // Check if user has access to view group lists
    await permissionService.require(user.id, 'view', { type: 'group', id: params.id });

    const { searchParams } = new URL(request.url);
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '20');
    const search = searchParams.get('search') || undefined;

    const result = await groupService.getGroupLists(params.id, {
      page,
      limit,
      search,
    });

    return NextResponse.json(serializePrismaResponse(result));
  } catch (error) {
    if (error instanceof AppError) {
      return NextResponse.json(
        { error: getUserFriendlyError(error.code, error.message), code: error.code },
        { status: error.statusCode }
      );
    }

    return NextResponse.json(
      { error: 'Something went wrong. Please try again', code: 'INTERNAL_ERROR' },
      { status: 500 }
    );
  }
}

// POST /api/groups/[id]/lists - Share lists with group
export async function POST(request: NextRequest, { params }: RouteParams) {
  try {
    const user = await getCurrentUser();

    if (!user) {
      return NextResponse.json(
        { error: getUserFriendlyError('UNAUTHORIZED'), code: 'UNAUTHORIZED' },
        { status: 401 }
      );
    }

    // Check if user can share lists with group
    await permissionService.require(user.id, 'share', { type: 'group', id: params.id });

    const body = (await request.json()) as unknown;
    const data = GroupShareListsSchema.parse(body);

    await groupService.shareLists(params.id, data, user.id);

    return NextResponse.json({ success: true }, { status: 201 });
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

    if (error instanceof AppError) {
      return NextResponse.json(
        { error: getUserFriendlyError(error.code, error.message), code: error.code },
        { status: error.statusCode }
      );
    }

    logger.error({ error: error }, 'Failed to share lists');
    return NextResponse.json(
      { error: 'Something went wrong. Please try again', code: 'INTERNAL_ERROR' },
      { status: 500 }
    );
  }
}
