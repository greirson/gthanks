import { z } from 'zod';

import { NextRequest, NextResponse } from 'next/server';

import { getCurrentAdmin } from '@/lib/auth-admin';
import { getUserFriendlyError } from '@/lib/errors';
import { AdminService } from '@/lib/services/admin-service';
import { auditService } from '@/lib/services/audit-service';
import { AuditActions } from '@/lib/schemas/audit-log';
import { logger } from '@/lib/services/logger';
// eslint-disable-next-line local-rules/no-direct-db-import -- Bulk operations require direct transaction access; uses AdminService for business logic
import { db as prisma } from '@/lib/db';

const BulkOperationSchema = z.object({
  userIds: z
    .array(z.string())
    .min(1)
    .max(200, { message: 'Cannot process more than 200 users at once' }),
  action: z.enum(['suspend', 'reactivate', 'delete']),
  metadata: z
    .object({
      reason: z.string().optional(),
    })
    .optional(),
});

export async function POST(request: NextRequest) {
  try {
    // Verify admin access
    const admin = await getCurrentAdmin();
    if (!admin) {
      return NextResponse.json(
        { error: getUserFriendlyError('UNAUTHORIZED'), code: 'UNAUTHORIZED' },
        { status: 401 }
      );
    }

    const body: unknown = await request.json();
    const { userIds, action, metadata } = BulkOperationSchema.parse(body);

    // Prevent admin from modifying themselves
    if (userIds.includes(admin.id)) {
      return NextResponse.json(
        {
          error: getUserFriendlyError(
            'VALIDATION_ERROR',
            'Cannot perform bulk operations on your own account'
          ),
          code: 'VALIDATION_ERROR',
        },
        { status: 400 }
      );
    }

    // Use atomic transaction to ensure all operations succeed or fail together
    const result = await prisma.$transaction(async (tx) => {
      const results = {
        success: [] as string[],
        failed: [] as { userId: string; error: string }[],
      };

      // Process each user operation within the transaction
      for (const userId of userIds) {
        try {
          // Perform operations directly with transaction context
          switch (action) {
            case 'suspend':
              await AdminService.suspendUser(
                userId,
                admin.id,
                metadata?.reason || 'Bulk suspension by admin',
                tx
              );
              break;

            case 'reactivate':
              await AdminService.unsuspendUser(userId, admin.id, tx);
              break;

            case 'delete':
              // For now, we'll suspend instead of delete
              await AdminService.suspendUser(
                userId,
                admin.id,
                metadata?.reason || 'Account deleted by admin',
                tx
              );
              break;

            default:
              throw new Error('Unknown action');
          }
          results.success.push(userId);
        } catch (error) {
          results.failed.push({
            userId,
            error: error instanceof Error ? error.message : 'Operation failed',
          });
          // Throw to rollback entire transaction if any operation fails
          throw error;
        }
      }

      return results;
    });

    // Fire-and-forget audit log - NO await
    auditService.log({
      actorId: admin.id,
      actorName: admin.name || admin.email,
      actorType: 'user',
      category: 'admin',
      action: AuditActions.BULK_USER_OPERATION,
      resourceType: 'user',
      details: {
        action,
        userIds,
        totalUsers: userIds.length,
        successful: result.success.length,
        failed: result.failed.length,
        metadata,
      },
      ipAddress: request.headers.get('x-forwarded-for')?.split(',')[0] || undefined,
      userAgent: request.headers.get('user-agent')?.slice(0, 500) || undefined,
    });

    return NextResponse.json({
      message: `Bulk ${action} completed`,
      results: result,
    });
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

    logger.error({ error: error }, 'Admin bulk operation error');
    return NextResponse.json(
      { error: 'Something went wrong. Please try again', code: 'INTERNAL_ERROR' },
      { status: 500 }
    );
  }
}
