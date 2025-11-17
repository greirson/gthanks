/**
 * Session Management Service
 *
 * Provides secure session regeneration to prevent session fixation attacks
 * and enhance authentication security.
 */
import { randomUUID } from 'crypto';

import { db } from '@/lib/db';
import { logger, logSecurityEvent } from '@/lib/services/logger';

/**
 * Session regeneration reasons for audit logging
 */
export enum RegenerationReason {
  LOGIN = 'login',
  LOGOUT = 'logout',
  PRIVILEGE_ESCALATION = 'privilege_escalation',
  ROLE_CHANGE = 'role_change',
  SECURITY_CHECK = 'security_check',
  MANUAL = 'manual',
  EXPIRED = 'expired',
}

/**
 * Regenerate session token for a user
 * This should be called on:
 * - Successful login
 * - Role/privilege changes
 * - After password changes
 * - Periodic rotation for long-lived sessions
 */
export async function regenerateSession(
  userId: string,
  reason: RegenerationReason = RegenerationReason.SECURITY_CHECK
): Promise<string | null> {
  try {
    const newSessionToken = randomUUID();
    const expiryDate = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000); // 30 days

    // Find existing session
    const existingSession = await db.session.findFirst({
      where: { userId },
      orderBy: { expires: 'desc' },
    });

    if (!existingSession) {
      logger.warn({ userId, reason }, 'No existing session found for regeneration');
      return null;
    }

    // Create new session with regenerated token
    const newSession = await db.session.create({
      data: {
        sessionToken: newSessionToken,
        userId,
        expires: expiryDate,
      },
    });

    // Delete old session
    await db.session.delete({
      where: { id: existingSession.id },
    });

    // Log security event
    logSecurityEvent('session_regenerated', {
      userId,
      reason,
      oldSessionId: existingSession.id,
      newSessionId: newSession.id,
    });

    logger.info(
      {
        userId,
        reason,
        oldSessionId: existingSession.id,
        newSessionId: newSession.id,
      },
      'Session regenerated successfully'
    );

    return newSessionToken;
  } catch (error) {
    logger.error({ error, userId, reason }, 'Failed to regenerate session');
    return null;
  }
}

/**
 * Regenerate all sessions for a user
 * Used for security-critical operations like password changes
 */
export async function regenerateAllUserSessions(
  userId: string,
  reason: RegenerationReason = RegenerationReason.SECURITY_CHECK
): Promise<void> {
  try {
    // Delete all existing sessions
    const deleted = await db.session.deleteMany({
      where: { userId },
    });

    logSecurityEvent('all_sessions_invalidated', {
      userId,
      reason,
      sessionsDeleted: deleted.count,
    });

    logger.info(
      { userId, reason, sessionsDeleted: deleted.count },
      'All user sessions invalidated'
    );
  } catch (error) {
    logger.error({ error, userId, reason }, 'Failed to invalidate all user sessions');
    throw error;
  }
}

/**
 * Check if session needs rotation based on age
 */
export async function checkSessionRotation(sessionToken: string): Promise<boolean> {
  try {
    const session = await db.session.findUnique({
      where: { sessionToken },
      include: { user: true },
    });

    if (!session) {
      return false;
    }

    // Calculate session age
    const sessionAge = Date.now() - session.expires.getTime() + 30 * 24 * 60 * 60 * 1000;
    const maxAge = 7 * 24 * 60 * 60 * 1000; // 7 days

    if (sessionAge > maxAge) {
      logger.info(
        {
          sessionId: session.id,
          userId: session.userId,
          sessionAge: Math.floor(sessionAge / (1000 * 60 * 60 * 24)), // days
        },
        'Session needs rotation due to age'
      );
      return true;
    }

    return false;
  } catch (error) {
    logger.error({ error, sessionToken }, 'Failed to check session rotation');
    return false;
  }
}

/**
 * Validate session and check for security issues
 */
export async function validateSession(sessionToken: string): Promise<{
  valid: boolean;
  needsRotation: boolean;
  userId?: string;
}> {
  try {
    const session = await db.session.findUnique({
      where: { sessionToken },
      include: { user: true },
    });

    if (!session) {
      return { valid: false, needsRotation: false };
    }

    // Check if expired
    if (session.expires < new Date()) {
      logger.warn({ sessionId: session.id, userId: session.userId }, 'Expired session detected');

      // Clean up expired session
      await db.session.delete({ where: { id: session.id } });

      return { valid: false, needsRotation: false };
    }

    // Check if needs rotation
    const needsRotation = await checkSessionRotation(sessionToken);

    return {
      valid: true,
      needsRotation,
      userId: session.userId,
    };
  } catch (error) {
    logger.error({ error }, 'Session validation failed');
    return { valid: false, needsRotation: false };
  }
}

/**
 * Clean up expired sessions (should be run periodically)
 */
export async function cleanupExpiredSessions(): Promise<number> {
  try {
    const result = await db.session.deleteMany({
      where: {
        expires: {
          lt: new Date(),
        },
      },
    });

    if (result.count > 0) {
      logger.info({ sessionsDeleted: result.count }, 'Expired sessions cleaned up');
    }

    return result.count;
  } catch (error) {
    logger.error({ error }, 'Failed to cleanup expired sessions');
    return 0;
  }
}

/**
 * Get active session count for a user
 */
export async function getUserSessionCount(userId: string): Promise<number> {
  try {
    return await db.session.count({
      where: {
        userId,
        expires: {
          gt: new Date(),
        },
      },
    });
  } catch (error) {
    logger.error({ error, userId }, 'Failed to get user session count');
    return 0;
  }
}

/**
 * Enforce maximum concurrent sessions per user
 */
export async function enforceMaxSessions(userId: string, maxSessions: number = 5): Promise<void> {
  try {
    const sessions = await db.session.findMany({
      where: {
        userId,
        expires: {
          gt: new Date(),
        },
      },
      orderBy: {
        expires: 'asc', // Oldest first
      },
    });

    if (sessions.length > maxSessions) {
      const sessionsToDelete = sessions.slice(0, sessions.length - maxSessions);

      await db.session.deleteMany({
        where: {
          id: {
            in: sessionsToDelete.map((s) => s.id),
          },
        },
      });

      logSecurityEvent('max_sessions_enforced', {
        userId,
        totalSessions: sessions.length,
        maxAllowed: maxSessions,
        sessionsRemoved: sessionsToDelete.length,
      });
    }
  } catch (error) {
    logger.error({ error, userId }, 'Failed to enforce max sessions');
  }
}
