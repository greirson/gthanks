import { execSync } from 'child_process';
import * as fs from 'fs';
import * as path from 'path';
import { PrismaClient } from '@prisma/client';

/**
 * Database initialization status tracking
 */
let initializationPromise: Promise<void> | null = null;
let isInitialized = false;

/**
 * Ensures the database is properly initialized with all required tables.
 * This function is idempotent and thread-safe, using a singleton pattern
 * to prevent multiple concurrent initialization attempts.
 *
 * @returns Promise that resolves when database is ready
 */
export async function ensureDatabaseInitialized(): Promise<void> {
  // Return immediately if already initialized
  if (isInitialized) {
    return;
  }

  // Return existing initialization promise if in progress
  if (initializationPromise) {
    return initializationPromise;
  }

  // Start new initialization
  initializationPromise = performDatabaseInitialization();

  try {
    await initializationPromise;
    isInitialized = true;
  } finally {
    initializationPromise = null;
  }
}

/**
 * Performs the actual database initialization
 */
async function performDatabaseInitialization(): Promise<void> {
  const databaseUrl = process.env.DATABASE_URL || 'file:./data/gthanks.db';
  const forceInit = process.env.DB_FORCE_INIT === 'true';

  // Determine database type
  const isSQLite = databaseUrl.startsWith('file:');
  // These will be used when we add specific handling for each DB type
  const _isPostgreSQL =
    databaseUrl.includes('postgresql://') || databaseUrl.includes('postgres://');
  const _isMySQL = databaseUrl.includes('mysql://');

  // For production databases, only initialize if explicitly requested
  if (!isSQLite && !forceInit) {
    // Check if tables exist by trying a simple query
    try {
      const { db } = await import('./db');
      await db.user.findFirst();
      // Tables exist, no initialization needed
      return;
    } catch {
      // If tables don't exist and force init is not set, log and continue
      // This allows the app to start and initialization can be triggered via the endpoint
      // eslint-disable-next-line no-console
      console.log(
        '[DB Init] Database tables not found. Run "pnpm db:push" to initialize the database.'
      );
      return;
    }
  }

  // Validate DATABASE_URL format based on database type
  if (isSQLite) {
    const sqliteUrlPattern = /^file:([a-zA-Z0-9._\-\/]+)$/;
    if (!sqliteUrlPattern.test(databaseUrl)) {
      throw new Error(
        'Invalid DATABASE_URL format. SQLite URLs must match pattern: file:./path/to/db.db'
      );
    }
  }

  try {
    // Check if database tables exist by trying to query the User table
    // Use a temporary PrismaClient to avoid circular dependency
    const tempDb = new PrismaClient();
    try {
      await tempDb.user.findFirst();
      // Database tables already exist
      return;
    } finally {
      await tempDb.$disconnect();
    }
  } catch (error: unknown) {
    // Check if error is because tables don't exist
    const err = error as { code?: string; message?: string };
    if (
      err?.code === 'P2021' ||
      err?.message?.includes('does not exist') ||
      err?.message?.includes('relation') ||
      err?.message?.includes('table')
    ) {
      // Database tables do not exist, initializing...
      // eslint-disable-next-line no-console
      console.log('[DB Init] Database tables do not exist, initializing...');

      // For SQLite, ensure data directory exists
      if (isSQLite) {
        const dbPath = databaseUrl.replace('file:', '');
        const dbDir = path.dirname(path.resolve(dbPath));

        if (!fs.existsSync(dbDir)) {
          // eslint-disable-next-line no-console
          console.log('[DB Init] Creating database directory...');
          fs.mkdirSync(dbDir, { recursive: true });
        }
      }

      // Generate Prisma client if not exists
      const prismaClientPath = path.join(process.cwd(), 'node_modules', '.prisma', 'client');

      if (!fs.existsSync(prismaClientPath)) {
        // Generating Prisma client...
        try {
          execSync('npx prisma generate', {
            stdio: process.env.NODE_ENV === 'development' ? 'inherit' : 'pipe',
            cwd: process.cwd(),
          });
        } catch (genError) {
          console.error('[DB Init] Failed to generate Prisma client:', genError);
          throw new Error(
            'Failed to generate Prisma client. Please run "pnpm db:generate" manually.'
          );
        }
      }

      // Push database schema
      // Creating database tables...
      try {
        execSync('npx prisma db push --skip-generate', {
          stdio: process.env.NODE_ENV === 'development' ? 'inherit' : 'pipe',
          env: { ...process.env },
          cwd: process.cwd(),
        });
        // Database initialization complete
      } catch (pushError) {
        console.error('[DB Init] Failed to create database tables:', pushError);
        throw new Error('Failed to initialize database. Please run "pnpm db:push" manually.');
      }

      // Verify initialization was successful
      try {
        // Create a temporary client for verification
        const verifyDb = new PrismaClient();
        try {
          await verifyDb.user.findFirst();
          // Database verification successful
        } finally {
          await verifyDb.$disconnect();
        }
      } catch (verifyError) {
        console.error('[DB Init] Database verification failed:', verifyError);
        throw new Error('Database initialization appeared to succeed but verification failed');
      }
    } else {
      // Some other database error - don't try to initialize
      console.error('[DB Init] Unexpected database error:', error);
      throw error;
    }
  }
}

/**
 * Checks if the database has been initialized with tables
 * @returns true if tables exist, false otherwise
 */
export async function isDatabaseReady(): Promise<boolean> {
  try {
    // Use a temporary PrismaClient to avoid circular dependency
    const tempDb = new PrismaClient();
    try {
      await tempDb.user.findFirst();
      return true;
    } finally {
      await tempDb.$disconnect();
    }
  } catch {
    return false;
  }
}

/**
 * Resets the initialization state (mainly for testing)
 */
export function resetInitializationState(): void {
  isInitialized = false;
  initializationPromise = null;
}
