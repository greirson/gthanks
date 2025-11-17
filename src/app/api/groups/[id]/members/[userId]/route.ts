import { z } from 'zod';

import { NextRequest, NextResponse } from 'next/server';

import { getCurrentUser } from '@/lib/auth-utils';
import { AppError } from '@/lib/errors';
import { groupService } from '@/lib/services/group/group.service';
import { permissionService } from '@/lib/services/permission-service';

const UpdateMemberRoleSchema = z.object({
  role: z.enum(['member', 'admin']),
});

interface RouteParams {
  params: {
    id: string;
    userId: string;
  };
}

export async function PATCH(request: NextRequest, { params }: RouteParams) {
  try {
    const user = await getCurrentUser();

    if (!user) {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
    }

    await permissionService.require(user.id, 'admin', { type: 'group', id: params.id });

    const body = (await request.json()) as unknown;
    const { role } = UpdateMemberRoleSchema.parse(body);

    await groupService.updateMemberRole(params.id, { userId: params.userId, role }, user.id);

    return NextResponse.json({ success: true });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: error.errors[0].message }, { status: 400 });
    }

    if (error instanceof AppError) {
      return NextResponse.json(
        { error: error.message, code: error.code },
        { status: error.statusCode }
      );
    }

    return NextResponse.json({ error: 'Failed to update member role' }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest, { params }: RouteParams) {
  try {
    const user = await getCurrentUser();

    if (!user) {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
    }

    // Check if user is removing themselves or is an admin
    if (user.id !== params.userId) {
      await permissionService.require(user.id, 'admin', { type: 'group', id: params.id });
    } else {
      // If removing themselves, just verify they're a member
      await permissionService.require(user.id, 'view', { type: 'group', id: params.id });
    }

    await groupService.removeMember(params.id, params.userId, user.id);

    return NextResponse.json({ success: true });
  } catch (error) {
    if (error instanceof AppError) {
      return NextResponse.json(
        { error: error.message, code: error.code },
        { status: error.statusCode }
      );
    }

    return NextResponse.json({ error: 'Failed to remove member' }, { status: 500 });
  }
}
