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
  console.log('[DB] Checking database initialization...');
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

  // Run database migrations to ensure schema is up to date
  try {
    console.log('[DB] Applying pending migrations...');
    execSync('npx prisma migrate deploy', {
      stdio: 'pipe',
      env: { ...process.env, DATABASE_URL },
    });
    console.log('[DB] Database ready!');
  } catch (error) {
    // Check if it's just because migrations are already applied (which is fine)
    const errorStr = error.toString();
    if (errorStr.includes('No pending migrations') || errorStr.includes('already applied')) {
      console.log('[DB] Database already up to date!');
    } else {
      console.warn('[DB] Warning during migration:', error.message || 'Unknown error');
      console.log('[DB] The application will attempt to initialize on first request.');
    }
  }
}

// Run the initialization
ensureDatabase().catch((error) => {
  console.error('[DB] Fatal error during database initialization:', error);
  process.exit(1);
});
