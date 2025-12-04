import { PrismaClient } from '@prisma/client';
import { ensureDatabaseInitialized } from './db-init';
import { resolveDatabaseUrl } from './utils/db-path';

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined;
  dbInitPromise: Promise<void> | undefined;
};

/**
 * Creates a PrismaClient instance with proper configuration.
 * Only called when the database is actually accessed, not at import time.
 */
function createPrismaClient(): PrismaClient {
  return new PrismaClient({
    datasources: {
      db: {
        url: resolveDatabaseUrl(process.env.DATABASE_URL),
      },
    },
    log: process.env.NODE_ENV === 'development' ? ['query', 'error', 'warn'] : ['error'],
  });
}

/**
 * Gets or creates the PrismaClient singleton.
 * Uses lazy initialization to avoid creating the client during build phase.
 */
function getPrismaClient(): PrismaClient {
  if (!globalForPrisma.prisma) {
    globalForPrisma.prisma = createPrismaClient();

    // Trigger database initialization in the background (non-blocking)
    if (typeof window === 'undefined') {
      globalForPrisma.dbInitPromise = ensureDatabaseInitialized().catch((error) => {
        console.error('[DB] Failed to auto-initialize database:', error);
      });
    }
  }
  return globalForPrisma.prisma;
}

/**
 * Lazy-initialized Prisma Client using Proxy pattern.
 *
 * This ensures PrismaClient is NOT instantiated at module import time,
 * which is critical for Next.js builds where routes are statically analyzed.
 * The actual client is only created when a database operation is performed.
 */
export const db = new Proxy({} as PrismaClient, {
  get(_target, prop: string | symbol) {
    const client = getPrismaClient();
    const value = client[prop as keyof PrismaClient];
    // Bind methods to the client instance
    if (typeof value === 'function') {
      return value.bind(client);
    }
    return value;
  },
});

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
