import { redirect } from 'next/navigation';

import { getCurrentUser } from '@/lib/auth-utils';
import { db } from '@/lib/db';
import { AdminService } from '@/lib/services/admin-service';
import { auditService } from '@/lib/services/audit-service';
import { AuditActions } from '@/lib/schemas/audit-log';

/**
 * Admin authentication and authorization utilities
 */

export interface AdminUser {
  id: string;
  email: string;
  name: string | null;
  avatarUrl: string | null;
  role: string;
  isAdmin: boolean;
  createdAt: Date;
  lastLoginAt: Date | null;
}

/**
 * Get current admin user or null if not admin
 */
export async function getCurrentAdmin(): Promise<AdminUser | null> {
  const user = await getCurrentUser();

  if (!user) {
    return null;
  }

  // Check if user is admin
  const isAdmin = await AdminService.isAdmin(user.id);

  if (!isAdmin) {
    return null;
  }

  // Update last login timestamp
  await db.user.update({
    where: { id: user.id },
    data: { lastLoginAt: new Date() },
  });

  if (!user.email) {
    throw new Error('User email is required for admin access');
  }

  return {
    id: user.id,
    email: user.email,
    name: user.name,
    avatarUrl: user.avatarUrl,
    role: user.role || 'user',
    isAdmin: user.isAdmin || false,
    createdAt: user.createdAt,
    lastLoginAt: user.lastLoginAt,
  };
}

/**
 * Require admin authentication - redirect to login if not admin
 */
export async function requireAdmin(): Promise<AdminUser> {
  const admin = await getCurrentAdmin();

  if (!admin) {
    redirect('/auth/login?message=Admin access required');
  }

  return admin;
}

/**
 * Check if user has admin permissions (for API routes)
 */
export async function verifyAdmin(userId?: string): Promise<boolean> {
  let actualUserId = userId;
  if (!actualUserId) {
    const user = await getCurrentUser();
    if (!user) {
      return false;
    }
    actualUserId = user.id;
  }

  // actualUserId is guaranteed to be non-null here
  return AdminService.isAdmin(actualUserId);
}

/**
 * Middleware function to check admin access for API routes
 */
export async function withAdminAuth<T>(handler: (admin: AdminUser) => Promise<T>): Promise<T> {
  const admin = await getCurrentAdmin();

  if (!admin) {
    throw new Error('Admin access required');
  }

  return handler(admin);
}

/**
 * Get admin session info for enhanced security
 */
export async function getAdminSessionInfo() {
  const admin = await getCurrentAdmin();

  if (!admin) {
    return null;
  }

  // Audit logs not implemented in MVP
  const recentActions: Array<{ action: string; entityType: string; createdAt: Date }> = [];

  // Get active sessions count
  const activeSessions = await db.session.count({
    where: {
      userId: admin.id,
      expires: {
        gt: new Date(),
      },
    },
  });

  return {
    admin,
    recentActions,
    activeSessions,
  };
}

/**
 * Admin-specific logout (clear all sessions)
 */
export async function adminLogout(adminId: string): Promise<void> {
  // Clear all sessions for security
  await db.session.deleteMany({
    where: { userId: adminId },
  });

  // Fire-and-forget audit log - NO await
  auditService.log({
    actorId: adminId,
    actorType: 'user',
    category: 'admin',
    action: AuditActions.ADMIN_LOGOUT,
    resourceType: 'session',
    resourceId: adminId,
    details: { allSessions: true },
  });
}

/**
 * Validate admin action with optional confirmation
 */
export async function validateAdminAction(
  adminId: string,
  action: string,
  entityType: string,
  entityId: string,
  requireConfirmation = false
): Promise<boolean> {
  // Check if admin is still valid
  const isValid = await AdminService.isAdmin(adminId);

  if (!isValid) {
    throw new Error('Admin access revoked');
  }

  // Fire-and-forget audit log - NO await
  auditService.log({
    actorId: adminId,
    actorType: 'user',
    category: 'admin',
    action: AuditActions.ADMIN_ACTION_ATTEMPTED,
    resourceType: entityType.toLowerCase(),
    resourceId: entityId,
    details: { action, requireConfirmation },
  });

  // For destructive actions, we might want additional checks here
  const destructiveActions = ['DELETE', 'SUSPEND', 'REMOVE'];

  if (destructiveActions.includes(action) && requireConfirmation) {
    // In a real implementation, you might check for a confirmation token
    // For now, we'll assume confirmation is handled at the UI level
    return true;
  }

  return true;
}
