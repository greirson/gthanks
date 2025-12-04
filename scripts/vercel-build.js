#!/usr/bin/env node

/**
 * Vercel Build Script
 *
 * Handles the SQLite to PostgreSQL provider switch for Vercel deployments.
 * This is necessary because Prisma requires the provider to match DATABASE_URL
 * and we use SQLite locally but PostgreSQL in production.
 */

const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

const SCHEMA_PATH = path.join(__dirname, '..', 'prisma', 'schema.prisma');

function log(message) {
  console.log(`[vercel-build] ${message}`);
}

function updateSchemaProvider(provider) {
  log(`Updating schema.prisma provider to: ${provider}`);

  let schema = fs.readFileSync(SCHEMA_PATH, 'utf-8');

  if (provider === 'postgresql') {
    schema = schema.replace(/provider\s*=\s*"sqlite"/, 'provider = "postgresql"');
  } else if (provider === 'sqlite') {
    schema = schema.replace(/provider\s*=\s*"postgresql"/, 'provider = "sqlite"');
  }

  fs.writeFileSync(SCHEMA_PATH, schema);
  log(`Schema updated successfully`);
}

function detectDatabaseProvider() {
  const databaseUrl = process.env.DATABASE_URL || '';

  if (databaseUrl.startsWith('file:')) {
    return 'sqlite';
  } else if (/^postgres(ql)?:\/\//.test(databaseUrl)) {
    return 'postgresql';
  }

  // Default to postgresql for Vercel deployments
  log('DATABASE_URL not set or unknown format, defaulting to postgresql');
  return 'postgresql';
}

function main() {
  log('Starting Vercel build process...');

  // Detect and set database provider
  const provider = detectDatabaseProvider();
  log(`Detected database provider: ${provider}`);

  // Update schema if needed
  const schema = fs.readFileSync(SCHEMA_PATH, 'utf-8');
  const currentProvider = schema.match(/provider\s*=\s*"(sqlite|postgresql)"/)?.[1];

  if (currentProvider !== provider) {
    log(`Switching provider from ${currentProvider} to ${provider}`);
    updateSchemaProvider(provider);
  } else {
    log(`Provider already set to ${provider}, no change needed`);
  }

  // Generate Prisma client
  log('Generating Prisma client...');
  execSync('npx prisma generate', { stdio: 'inherit' });

  // Run Next.js build
  log('Running Next.js build...');
  execSync('next build', { stdio: 'inherit' });

  log('Build completed successfully!');
}

try {
  main();
} catch (error) {
  console.error('[vercel-build] Build failed:', error.message);
  process.exit(1);
}
