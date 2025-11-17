#!/usr/bin/env node

/**
 * Ensures database is initialized before starting the application.
 * This is a Node.js wrapper that handles database initialization for development.
 */

const { execSync } = require('child_process');
const path = require('path');
const fs = require('fs');

// Load environment variables
try {
  require('dotenv').config();
} catch (e) {
  // dotenv might not be available in all environments
}

const DATABASE_URL = process.env.DATABASE_URL || 'file:./prisma/dev2.db';

async function ensureDatabase() {
  console.log('[DB] Checking database initialization...');

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

  // Run database push to ensure tables exist
  try {
    console.log('[DB] Ensuring database tables exist...');
    execSync('npx prisma db push --skip-generate --accept-data-loss', {
      stdio: 'pipe',
      env: { ...process.env, DATABASE_URL },
    });
    console.log('[DB] Database ready!');
  } catch (error) {
    // Check if it's just because tables already exist (which is fine)
    const errorStr = error.toString();
    if (errorStr.includes('already in sync') || errorStr.includes('No changes')) {
      console.log('[DB] Database already up to date!');
    } else {
      console.warn('[DB] Warning during database sync:', error.message || 'Unknown error');
      console.log('[DB] The application will attempt to initialize on first request.');
    }
  }
}

// Run the initialization
ensureDatabase().catch((error) => {
  console.error('[DB] Fatal error during database initialization:', error);
  process.exit(1);
});
