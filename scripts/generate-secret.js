#!/usr/bin/env node
// Generate a cryptographically secure NEXTAUTH_SECRET
// Used for encrypting session tokens and cookies

const crypto = require('crypto');

const secret = crypto.randomBytes(32).toString('base64');

// Check if outputting to terminal or pipe
if (process.stdout.isTTY) {
  console.log('\n🔐 Generated NEXTAUTH_SECRET:\n');
  console.log(secret);
  console.log('\nAdd this to your .env.local file:\n');
  console.log(`NEXTAUTH_SECRET=${secret}\n`);
} else {
  // Piped to file or variable
  console.log(secret);
}
