#!/usr/bin/env node
// Interactive environment setup script - runs on first pnpm dev or explicit pnpm setup
// Creates .env.local with auto-generated secrets or guides manual setup

const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const readline = require('readline');

const envLocalPath = path.join(__dirname, '..', '.env.local');
const envExamplePath = path.join(__dirname, '..', '.env.local.example');

async function promptUser(question) {
  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout,
  });

  return new Promise((resolve) => {
    rl.question(question, (answer) => {
      rl.close();
      resolve(answer);
    });
  });
}

async function interactiveSetup() {
  console.log('\n🔧 First-Time Development Setup\n');
  console.log('gthanks needs a few environment variables to run.');
  console.log('This is a ONE-TIME setup for your local machine.\n');

  const choice = await promptUser(
    'How would you like to set up?\n' +
      '  1. Automatic (recommended - generates .env.local for you)\n' +
      "  2. Manual (I'll configure .env.local myself)\n" +
      'Choice (1 or 2): '
  );

  if (choice.trim() === '2') {
    console.log('\n📋 Manual Setup Instructions:\n');
    console.log('  1. Copy the template:');
    console.log('     cp .env.local.example .env.local\n');
    console.log('  2. Generate a secret:');
    console.log('     node scripts/generate-secret.js\n');
    console.log('  3. Edit .env.local and paste the secret:\n');
    console.log('     NEXTAUTH_SECRET=<paste-secret-here>\n');
    console.log('  4. Run: pnpm dev\n');
    process.exit(0);
  }

  // Automatic setup
  console.log('\n✨ Automatic Setup\n');

  // Check example exists
  if (!fs.existsSync(envExamplePath)) {
    console.error('❌ Error: .env.local.example not found');
    console.error('This file should be in the repository.\n');
    process.exit(1);
  }

  // Generate secret
  console.log('📝 Generating secure NEXTAUTH_SECRET...');
  const secret = crypto.randomBytes(32).toString('base64');

  // Read template
  let envContent = fs.readFileSync(envExamplePath, 'utf-8');

  // Replace placeholder
  envContent = envContent.replace(/^NEXTAUTH_SECRET=.*$/m, `NEXTAUTH_SECRET=${secret}`);

  // Write file
  fs.writeFileSync(envLocalPath, envContent);

  console.log('✅ Created .env.local with:\n');
  console.log('  • NEXTAUTH_SECRET (auto-generated)');
  console.log('  • DATABASE_URL (defaults to SQLite)');
  console.log('  • EMAIL_PROVIDER (defaults to console)');
  console.log('  • All optional features (commented out)\n');

  console.log('💡 What This Means:\n');
  console.log('  • Authentication: Sessions will be encrypted');
  console.log('  • Database: SQLite file at data/gthanks.db');
  console.log('  • Emails: Magic links will appear in your terminal');
  console.log('  • OAuth: Social login is disabled (optional)\n');

  console.log('🚀 Ready! Run: pnpm dev\n');
}

async function nonInteractiveSetup() {
  // For --non-interactive flag or when stdin is not a TTY
  console.log('📝 Creating .env.local (non-interactive mode)...');

  if (!fs.existsSync(envExamplePath)) {
    console.error('❌ .env.local.example not found');
    process.exit(1);
  }

  const secret = crypto.randomBytes(32).toString('base64');
  let envContent = fs.readFileSync(envExamplePath, 'utf-8');
  envContent = envContent.replace(/^NEXTAUTH_SECRET=.*$/m, `NEXTAUTH_SECRET=${secret}`);

  fs.writeFileSync(envLocalPath, envContent);
  console.log('✅ Created .env.local with auto-generated NEXTAUTH_SECRET\n');
}

async function main() {
  // Check if already exists
  if (fs.existsSync(envLocalPath)) {
    console.log('✓ .env.local already exists');

    // Verify NEXTAUTH_SECRET
    const envContent = fs.readFileSync(envLocalPath, 'utf-8');
    const hasSecret = envContent.match(/^NEXTAUTH_SECRET=.+$/m);

    if (!hasSecret) {
      console.warn('\n⚠️  WARNING: NEXTAUTH_SECRET is missing or empty\n');
      console.log('Fix it:');
      console.log('  node scripts/generate-secret.js\n');
      console.log('Then add to .env.local:\n');
      console.log('  NEXTAUTH_SECRET=<paste-secret-here>\n');
      process.exit(1);
    }

    console.log('✓ Environment is configured\n');
    process.exit(0);
  }

  // Check for non-interactive mode
  const isNonInteractive = process.argv.includes('--non-interactive') || !process.stdin.isTTY;

  if (isNonInteractive) {
    await nonInteractiveSetup();
  } else {
    await interactiveSetup();
  }
}

main().catch((error) => {
  console.error('Setup failed:', error.message);
  process.exit(1);
});
