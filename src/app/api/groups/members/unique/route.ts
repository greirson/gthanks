import { NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/auth-utils';
// eslint-disable-next-line local-rules/no-direct-db-import -- Read-only complex aggregation query using groupBy, distinct, and multiple transformations. This analytics-style query is better suited for direct database access than service layer abstraction.
import { db } from '@/lib/db';
import { getUserFriendlyError } from '@/lib/errors';
import { logger } from '@/lib/services/logger';

export async function GET() {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json(
        { error: getUserFriendlyError('UNAUTHORIZED'), code: 'UNAUTHORIZED' },
        { status: 401 }
      );
    }

    // Get all groups the user is a member of
    const userGroups = await db.userGroup.findMany({
      where: { userId: user.id },
      select: { groupId: true },
    });

    const groupIds = userGroups.map((ug: { groupId: string }) => ug.groupId);

    if (groupIds.length === 0) {
      return NextResponse.json({ members: [] });
    }

    // Get all unique members from those groups
    const groupMembers = await db.userGroup.findMany({
      where: {
        groupId: { in: groupIds },
      },
      select: {
        user: {
          select: {
            id: true,
            name: true,
            email: true,
            image: true,
          },
        },
      },
      distinct: ['userId'],
    });

    // Transform and deduplicate members
    const uniqueMembers = groupMembers.map((gm: any) => ({
      id: gm.user.id,
      name: gm.user.name,
      email: gm.user.email,
      avatarUrl: gm.user.image,
    }));

    // Count how many groups each member is in (for display purposes)
    const memberGroupCounts = await db.userGroup.groupBy({
      by: ['userId'],
      where: {
        groupId: { in: groupIds },
      },
      _count: {
        groupId: true,
      },
    });

    // Create a map of user ID to group count
    const countMap = new Map(
      memberGroupCounts.map((item: any) => [item.userId, item._count.groupId])
    );

    // Enhance members with group count
    const membersWithCount = uniqueMembers.map((member: any) => ({
      ...member,
      groupCount: countMap.get(member.id) || 0,
    }));

    // Sort by name for better UX
    membersWithCount.sort((a: any, b: any) => {
      const nameA = a.name || a.email;
      const nameB = b.name || b.email;
      return nameA.localeCompare(nameB);
    });

    return NextResponse.json({ members: membersWithCount });
  } catch (error) {
    logger.error({ error: error }, 'Error fetching unique members');
    return NextResponse.json(
      { error: 'Something went wrong. Please try again', code: 'INTERNAL_ERROR' },
      { status: 500 }
    );
  }
}
