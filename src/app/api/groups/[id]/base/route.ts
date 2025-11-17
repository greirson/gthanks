import { NextRequest, NextResponse } from 'next/server';

import { getCurrentUser } from '@/lib/auth-utils';
import { AppError } from '@/lib/errors';
import { groupService } from '@/lib/services/group/group.service';
import { serializePrismaResponse } from '@/lib/utils/date-serialization';

interface RouteParams {
  params: {
    id: string;
  };
}

// GET /api/groups/[id]/base - Get lightweight group info
export async function GET(request: NextRequest, { params }: RouteParams) {
  try {
    const user = await getCurrentUser();

    if (!user) {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
    }

    const group = await groupService.getGroupBaseInfo(params.id, user.id);

    return NextResponse.json(serializePrismaResponse(group));
  } catch (error) {
    if (error instanceof AppError) {
      return NextResponse.json(
        { error: error.message, code: error.code },
        { status: error.statusCode }
      );
    }

    return NextResponse.json({ error: 'Failed to fetch group base info' }, { status: 500 });
  }
}
