import { PrismaClient } from '@prisma/client';
import { ensureDatabaseInitialized } from './db-init';

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined;
  dbInitPromise: Promise<void> | undefined;
};

// Initialize database on first import
if (!globalForPrisma.dbInitPromise && typeof window === 'undefined') {
  globalForPrisma.dbInitPromise = ensureDatabaseInitialized().catch((error) => {
    console.error('[DB] Failed to auto-initialize database:', error);
    // Don't throw here - let the actual database operations fail with proper error messages
  });
}

export const db =
  globalForPrisma.prisma ??
  new PrismaClient({
    datasources: {
      db: {
        url: process.env.DATABASE_URL,
      },
    },
    log: process.env.NODE_ENV === 'development' ? ['query', 'error', 'warn'] : ['error'],
  });

if (process.env.NODE_ENV !== 'production') {
  globalForPrisma.prisma = db;
}

/**
 * Ensures database is initialized before performing operations.
 * This is a wrapper that can be used for critical operations.
 */
export async function withDatabaseReady<T>(operation: () => Promise<T>): Promise<T> {
  await ensureDatabaseInitialized();
  return operation();
}

export async function checkDatabaseHealth() {
  try {
    // Ensure database is initialized before health check
    await ensureDatabaseInitialized();
    await db.$queryRaw`SELECT 1`;
    return { status: 'healthy', service: 'database' };
  } catch (error) {
    return {
      status: 'unhealthy',
      service: 'database',
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}
