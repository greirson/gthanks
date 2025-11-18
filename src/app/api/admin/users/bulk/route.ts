import { z } from 'zod';

import { NextRequest, NextResponse } from 'next/server';

import { getCurrentAdmin } from '@/lib/auth-admin';
import { getUserFriendlyError } from '@/lib/errors';
import { AdminService } from '@/lib/services/admin-service';
import type { BulkUserRequest } from '@/types/admin-api';
import { logger } from '@/lib/services/logger';
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

    const body = (await request.json()) as BulkUserRequest;
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

    // Create audit log - not async for MVP
    AdminService.createAuditLog(
      admin.id,
      'BULK_OPERATION',
      'USER',
      null,
      undefined,
      undefined,
      {
        action,
        userIds, // Add the list of user IDs for audit trail
        totalUsers: userIds.length,
        successful: result.success.length,
        failed: result.failed.length,
        results: result, // Add the detailed results object
        metadata,
      },
      request.headers.get('x-forwarded-for') || undefined,
      request.headers.get('user-agent') || undefined
    );

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
