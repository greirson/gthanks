#!/usr/bin/env node
// Pre-dev environment check - runs before starting dev server
// Automatically triggers setup on first run if .env.local is missing

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

const envLocalPath = path.join(__dirname, '..', '.env.local');

function checkEnvironment() {
  // Check 1: .env.local exists?
  if (!fs.existsSync(envLocalPath)) {
    console.log('\n⚠️  Environment not configured\n');

    // Auto-run setup in interactive mode
    if (process.stdin.isTTY) {
      try {
        execSync('node scripts/setup-env.js', { stdio: 'inherit' });
        // If setup succeeds, continue with the check
        if (!fs.existsSync(envLocalPath)) {
          console.error('❌ Setup did not create .env.local');
          process.exit(1);
        }
      } catch (error) {
        console.error('❌ Setup failed or was cancelled');
        process.exit(1);
      }
    } else {
      // Non-interactive (CI/CD)
      console.log('Non-interactive environment detected. Skipping setup.');
      console.log('\nFor CI/CD, ensure environment variables are set via platform:\n');
      console.log('  Required: NEXTAUTH_SECRET');
      console.log('  Optional: DATABASE_URL, EMAIL_PROVIDER, etc.\n');
      process.exit(1);
    }
  }

  // Check 2: NEXTAUTH_SECRET is set?
  require('dotenv').config({ path: envLocalPath });

  if (!process.env.NEXTAUTH_SECRET || process.env.NEXTAUTH_SECRET.trim() === '') {
    console.error('\n❌ NEXTAUTH_SECRET is missing or empty in .env.local\n');
    console.log('Fix it:');
    console.log('  1. Generate: node scripts/generate-secret.js');
    console.log('  2. Add to .env.local: NEXTAUTH_SECRET=<paste-here>\n');
    process.exit(1);
  }

  console.log('✓ Environment configured');
}

checkEnvironment();
