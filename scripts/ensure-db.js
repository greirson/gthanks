#!/usr/bin/env node

/**
 * Ensures database is initialized before starting the application.
 * This is a Node.js wrapper that handles database initialization for development.
 */

const { execSync } = require('child_process');
const path = require('path');
const fs = require('fs');
const { resolveDatabaseUrl } = require('../src/lib/utils/db-path');

// Load environment variables
try {
  require('dotenv').config();
} catch (e) {
  // dotenv might not be available in all environments
}

const DATABASE_URL = resolveDatabaseUrl(process.env.DATABASE_URL || 'file:./data/gthanks.db');

async function ensureDatabase() {
  console.log('🔍 Checking database...');
  console.log('[DB] Using database:', DATABASE_URL);

  // For SQLite, ensure the directory exists
  if (DATABASE_URL.startsWith('file:')) {
    const dbPath = DATABASE_URL.replace('file:', '');
    const dbDir = path.dirname(path.resolve(dbPath));

    if (!fs.existsSync(dbDir)) {
      console.log('[DB] Creating database directory...');
      fs.mkdirSync(dbDir, { recursive: true });
    }
  }

  // Check if Prisma client is generated
  const prismaClientPath = path.join(process.cwd(), 'node_modules', '.prisma', 'client');
  if (!fs.existsSync(prismaClientPath)) {
    console.log('[DB] Generating Prisma client...');
    try {
      execSync('npx prisma generate', { stdio: 'inherit' });
    } catch (error) {
      console.error('[DB] Failed to generate Prisma client:', error.message);
      process.exit(1);
    }
  }

  // Determine whether to use migrations or db:push
  const useMigrations = await shouldUseMigrations();

  if (useMigrations === 'legacy') {
    // Legacy database: created with db:push, no migration history
    console.log('[DB] WARNING: Database was created with db:push (no migration history).');
    console.log('[DB] To enable safe migrations, run this once:');
    console.log('[DB]   npx prisma migrate resolve --applied 0_baseline');
    console.log(
      '[DB]   npx prisma migrate resolve --applied 20251122_reservation_authentication_required'
    );
    console.log('[DB]   npx prisma migrate resolve --applied 20251202_add_personal_access_tokens');
    console.log('[DB] For now, using db:push for backwards compatibility.');
    console.log('');

    // Use db:push for legacy databases
    try {
      console.log('[DB] Syncing database schema with db:push...');
      execSync('npx prisma db push --skip-generate', {
        stdio: 'pipe',
        env: { ...process.env, DATABASE_URL },
      });
      console.log('✓ Database ready');
    } catch (error) {
      const errorStr = error.toString();
      if (errorStr.includes('already in sync') || errorStr.includes('No changes')) {
        console.log('✓ Database ready (already in sync)');
      } else {
        console.warn('[DB] Warning during sync:', error.message || 'Unknown error');
        console.log('[DB] The application will attempt to initialize on first request.');
      }
    }
  } else {
    // Use migrate deploy for new or migration-tracked databases
    try {
      console.log('[DB] Applying migrations with migrate deploy...');
      execSync('npx prisma migrate deploy', {
        stdio: 'inherit',
        env: { ...process.env, DATABASE_URL },
      });
      console.log('✓ Database ready (migrations applied)');
    } catch (error) {
      console.error('[DB] Failed to apply migrations:', error.message || 'Unknown error');
      console.log('[DB] The application will attempt to initialize on first request.');
    }
  }
}

/**
 * Determines whether to use migrations or legacy db:push
 * @returns {Promise<'migrations'|'legacy'>}
 */
async function shouldUseMigrations() {
  // Check if _prisma_migrations table exists and if database has tables
  const hasMigrationsTable = await checkMigrationsTable();
  const hasTables = await checkDatabaseTables();

  // Logic:
  // - If migrations table exists: use migrations
  // - If no migrations table AND database has tables: legacy (created with db:push)
  // - If empty database: use migrations
  if (hasMigrationsTable) {
    return 'migrations';
  } else if (hasTables) {
    return 'legacy';
  } else {
    return 'migrations';
  }
}

/**
 * Check if _prisma_migrations table exists in the database
 * @returns {Promise<boolean>}
 */
async function checkMigrationsTable() {
  try {
    if (DATABASE_URL.startsWith('file:')) {
      // SQLite
      const result = execSync('npx prisma db execute --stdin', {
        env: { ...process.env, DATABASE_URL },
        encoding: 'utf-8',
        input: `SELECT name FROM sqlite_master WHERE type='table' AND name='_prisma_migrations';`,
      });
      return result.includes('_prisma_migrations');
    } else if (/^postgres(ql)?:\/\//.test(DATABASE_URL)) {
      // PostgreSQL (supports both postgres:// and postgresql://)
      const result = execSync('npx prisma db execute --stdin', {
        env: { ...process.env, DATABASE_URL },
        encoding: 'utf-8',
        input: `SELECT tablename FROM pg_tables WHERE schemaname='public' AND tablename='_prisma_migrations';`,
      });
      return result.includes('_prisma_migrations');
    }
  } catch (error) {
    // If query fails, assume no migrations table
    return false;
  }
  return false;
}

/**
 * Check if database has any tables (excluding _prisma_migrations)
 * @returns {Promise<boolean>}
 */
async function checkDatabaseTables() {
  try {
    if (DATABASE_URL.startsWith('file:')) {
      // SQLite
      const result = execSync('npx prisma db execute --stdin', {
        env: { ...process.env, DATABASE_URL },
        encoding: 'utf-8',
        input: `SELECT COUNT(*) as count FROM sqlite_master WHERE type='table' AND name NOT LIKE 'sqlite_%' AND name != '_prisma_migrations';`,
      });
      // Parse result to check if count > 0
      const countMatch = result.match(/count\s*[|:]\s*(\d+)/i);
      return countMatch && parseInt(countMatch[1], 10) > 0;
    } else if (/^postgres(ql)?:\/\//.test(DATABASE_URL)) {
      // PostgreSQL (supports both postgres:// and postgresql://)
      const result = execSync('npx prisma db execute --stdin', {
        env: { ...process.env, DATABASE_URL },
        encoding: 'utf-8',
        input: `SELECT COUNT(*) as count FROM information_schema.tables WHERE table_schema='public' AND table_name != '_prisma_migrations';`,
      });
      const countMatch = result.match(/count\s*[|:]\s*(\d+)/i);
      return countMatch && parseInt(countMatch[1], 10) > 0;
    }
  } catch (error) {
    // If database doesn't exist or query fails, assume no tables
    return false;
  }
  return false;
}

// Run the initialization
ensureDatabase().catch((error) => {
  console.error('[DB] Fatal error during database initialization:', error);
  process.exit(1);
});
