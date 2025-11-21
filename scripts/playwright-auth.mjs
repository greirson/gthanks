#!/usr/bin/env node
/**
 * Playwright Authentication Setup Script
 *
 * This script automates the authentication flow for Playwright MCP by:
 * 1. Starting a dedicated dev server
 * 2. Launching a browser to the login page
 * 3. Monitoring server logs for the magic link
 * 4. Automatically navigating to the magic link
 * 5. Verifying session cookie creation
 * 6. Cleaning up all processes
 */

import { chromium } from '@playwright/test';
import { spawn, exec } from 'child_process';
import { mkdir, cp, rm } from 'fs/promises';
import { existsSync } from 'fs';

// Configuration
const LOGIN_URL = 'http://localhost:3000/auth/login';
const PROFILE_DIR_TEMP = '.playwright-profile-temp';
const PROFILE_DIR_FINAL = '.playwright-profile';
const TEST_EMAIL = 'test-playwright@example.com'; // Test email for authentication
const TIMEOUT_MS = 5 * 60 * 1000; // 5 minutes
const SERVER_READY_TIMEOUT = 30000; // 30 seconds
const MAGIC_LINK_REGEX = /http:\/\/localhost:3000\/api\/auth\/callback\/email[^\s\n]*/;

// Helper functions
const sleep = (ms) => new Promise(resolve => setTimeout(resolve, ms));

async function waitForServer(url, timeout) {
  const start = Date.now();
  console.log(`Waiting for server to be ready at ${url}...`);

  while (Date.now() - start < timeout) {
    try {
      const response = await fetch(url);
      if (response.ok || response.status === 404) {
        // 404 is fine - server is responding
        return;
      }
    } catch (e) {
      // Server not ready yet
    }
    await sleep(1000);
  }
  throw new Error(`Server failed to start within ${timeout / 1000} seconds`);
}

function checkPortInUse(port) {
  return new Promise((resolve) => {
    exec(`lsof -ti:${port}`, (error, stdout) => {
      // Error is expected when no process is found (port is free)
      if (error) {
        resolve(null);
        return;
      }
      resolve(stdout.trim() || null);
    });
  });
}

// Main authentication flow
(async () => {
  let serverProcess;
  let browser;
  let magicLink = null;

  try {
    console.log('');
    console.log('='.repeat(50));
    console.log('Playwright Authentication Setup');
    console.log('='.repeat(50));
    console.log('');

    // Phase 1: Prepare profile directories
    // Clean up any leftover temp profile from previous run
    if (existsSync(PROFILE_DIR_TEMP)) {
      await rm(PROFILE_DIR_TEMP, { recursive: true, force: true });
      console.log(`🧹 Cleaned up old temporary profile`);
    }

    // Create fresh temp profile directory
    await mkdir(PROFILE_DIR_TEMP, { recursive: true });
    console.log(`✅ Created temporary profile: ${PROFILE_DIR_TEMP}/`);

    // Check if final profile exists (info only, we'll replace it later)
    if (existsSync(PROFILE_DIR_FINAL)) {
      console.log(`ℹ️  Final profile exists: ${PROFILE_DIR_FINAL}/ (will be updated)`);
    }

    // Phase 2: Check if port 3000 is in use
    const existingPid = await checkPortInUse(3000);
    if (existingPid) {
      console.error('');
      console.error(`❌ Port 3000 is already in use by process ${existingPid}.`);
      console.error('   Please stop this process and run the script again.');
      console.error('');
      console.error('   Find the process with: lsof -i :3000');
      console.error(`   Stop it with: kill ${existingPid}`);
      console.error('');
      throw new Error('Port 3000 is unavailable.');
    }

    // Phase 3: Start dev server with log capture
    console.log('');
    console.log('Starting dev server...');
    console.log('-'.repeat(50));

    // Create a promise that resolves when magic link is found or rejects on errors
    const serverPromise = new Promise((resolve, reject) => {
      serverProcess = spawn('pnpm', ['dev'], {
        stdio: ['ignore', 'pipe', 'pipe'],
        env: process.env
      });

      // Monitor server logs for magic link
      serverProcess.stdout.on('data', (data) => {
        const output = data.toString();
        process.stdout.write(output); // Echo to user

        // Capture magic link when it appears
        const match = output.match(MAGIC_LINK_REGEX);
        if (match && !magicLink) {
          magicLink = match[0];
          console.log('');
          console.log('='.repeat(50));
          console.log('✅ Magic Link Captured!');
          console.log('='.repeat(50));
          console.log('');
          resolve(magicLink);
        }
      });

      serverProcess.stderr.on('data', (data) => {
        const output = data.toString();
        process.stderr.write(output); // Echo to user

        // Also check stderr for magic link (email mock outputs here)
        const match = output.match(MAGIC_LINK_REGEX);
        if (match && !magicLink) {
          magicLink = match[0];
          console.log('');
          console.log('='.repeat(50));
          console.log('✅ Magic Link Captured!');
          console.log('='.repeat(50));
          console.log('');
          resolve(magicLink);
        }
      });

      serverProcess.on('error', (error) => {
        reject(new Error(`Failed to start dev server: ${error.message}`));
      });

      serverProcess.on('exit', (code) => {
        if (code !== 0 && code !== null && !magicLink) {
          reject(new Error(`Dev server exited unexpectedly with code ${code}`));
        }
      });
    });

    // Wait for server to be ready
    await waitForServer('http://localhost:3000', SERVER_READY_TIMEOUT);
    console.log('');
    console.log('✅ Dev server is ready!');

    // Phase 4: Launch browser using Playwright API
    console.log('');
    console.log('='.repeat(50));
    console.log('Launching Browser');
    console.log('='.repeat(50));
    console.log('');

    try {
      browser = await chromium.launchPersistentContext(PROFILE_DIR_TEMP, {
        headless: false,
        viewport: { width: 1280, height: 720 },
        args: ['--disable-blink-features=AutomationControlled'],
      });

      console.log('✅ Browser launched successfully (using temporary profile)');
    } catch (error) {
      if (error.message.includes('Executable doesn\'t exist')) {
        console.error('');
        console.error('❌ Chromium not installed');
        console.error('');
        console.error('Run: npx playwright install chromium');
        console.error('');
        throw new Error('Playwright Chromium not installed');
      }
      throw error;
    }

    // Create new page and navigate to login
    const page = await browser.newPage();
    await page.goto(LOGIN_URL);

    console.log(`✅ Navigated to: ${LOGIN_URL}`);
    console.log('');

    // Phase 4.5: Automate form filling and submission
    console.log('Automating login form...');

    try {
      // Wait for email input to be visible
      await page.waitForSelector('#email-input', { state: 'visible', timeout: 10000 });

      // Fill in the email
      await page.fill('#email-input', TEST_EMAIL);
      console.log(`✅ Filled email: ${TEST_EMAIL}`);

      // Click the "Send Login Link" button
      await page.click('button:has-text("Send Login Link")');
      console.log('✅ Clicked "Send Login Link" button');
      console.log('');
      console.log('Waiting for magic link to appear in server logs...');
      console.log('');
    } catch (formError) {
      console.error('❌ Failed to automate form');
      console.error('   Error:', formError.message);
      console.error('');
      console.error('Manual fallback:');
      console.error(`  1. Enter email: ${TEST_EMAIL}`);
      console.error('  2. Click "Send Login Link"');
      console.error('');
    }

    // Phase 5: Wait for magic link to appear (with timeout)
    magicLink = await Promise.race([
      serverPromise,
      sleep(TIMEOUT_MS).then(() =>
        Promise.reject(new Error('Magic link not found in server logs. Did you click "Send Magic Link"?'))
      )
    ]);

    // Give user a moment to see the confirmation
    await sleep(2000);

    // Phase 6: Navigate to magic link
    console.log('Navigating to magic link...');
    console.log('');

    try {
      await page.goto(magicLink, { waitUntil: 'networkidle', timeout: 30000 });
      console.log('✅ Magic link navigation completed');
    } catch (error) {
      console.warn('Navigation timeout (this is often okay if redirect happened)');
    }

    // Wait a bit for cookies to be set
    await sleep(3000);

    // Phase 7: Verify session cookie
    console.log('');
    console.log('Verifying session cookie...');

    const cookies = await browser.cookies();
    const sessionCookie = cookies.find(c =>
      c.name === 'next-auth.session-token' ||
      c.name === '__Secure-next-auth.session-token'
    );

    if (!sessionCookie) {
      console.error('');
      console.error('❌ Session cookie not found');
      console.error('');
      console.error('Available cookies:', cookies.map(c => c.name).join(', '));
      console.error('');
      throw new Error('Authentication may have failed - session cookie not created');
    }

    console.log('✅ Session cookie verified!');
    console.log('');

    // Phase 7.5: Copy authenticated profile to final location
    console.log('='.repeat(50));
    console.log('Finalizing Profile');
    console.log('='.repeat(50));
    console.log('');
    console.log('Copying authenticated profile to final location...');

    try {
      // Close browser first to release temp profile lock
      if (browser) {
        await browser.close();
        browser = null; // Prevent double-close in finally block
        console.log('✅ Browser closed');
      }

      // Wait a moment for file handles to be released
      await sleep(1000);

      // Remove old final profile if exists
      if (existsSync(PROFILE_DIR_FINAL)) {
        await rm(PROFILE_DIR_FINAL, { recursive: true, force: true });
        console.log('🧹 Removed old profile');
      }

      // Copy temp profile to final location
      await cp(PROFILE_DIR_TEMP, PROFILE_DIR_FINAL, { recursive: true });
      console.log('✅ Profile copied successfully');
      console.log('');

    } catch (copyError) {
      console.error('');
      console.error('⚠️  Warning: Could not copy profile');
      console.error('   Error:', copyError.message);
      console.error('');
      console.error('Manual fix required:');
      console.error(`   mv ${PROFILE_DIR_TEMP} ${PROFILE_DIR_FINAL}`);
      console.error('');
      // Don't throw - authentication succeeded, just copy failed
    }

    console.log('='.repeat(50));
    console.log('🎉 Authentication Complete!');
    console.log('='.repeat(50));
    console.log('');
    console.log('Next steps:');
    console.log('  1. ⚠️  MUST restart Claude Code to reload MCP configuration');
    console.log('  2. Playwright MCP will use the new authenticated session');
    console.log('');
    console.log('⚠️  IMPORTANT: Do not use Playwright MCP until Claude Code is restarted!');
    console.log('');
    console.log('Test with:');
    console.log('  mcp__playwright__browser_navigate {"url": "http://localhost:3000/lists"}');
    console.log('');
    console.log('Note: The dev server has been stopped.');
    console.log('      Restart it with: pnpm dev');
    console.log('');

  } catch (error) {
    console.error('');
    console.error('='.repeat(50));
    console.error('❌ Authentication Failed');
    console.error('='.repeat(50));
    console.error('');
    console.error('Error:', error.message);
    console.error('');

    // Provide specific troubleshooting advice
    if (error.message.includes('Chromium')) {
      console.error('Fix: Install Playwright browsers');
      console.error('  npx playwright install chromium');
    } else if (error.message.includes('Server failed to start')) {
      console.error('Fix: Check if port 3000 is available');
      console.error('  lsof -i :3000');
    } else if (error.message.includes('Magic link not found')) {
      console.error('Troubleshooting:');
      console.error('  - Did you enter an email address?');
      console.error('  - Did you click "Send Magic Link"?');
      console.error('  - Check server logs above for errors');
    } else if (error.message.includes('session cookie')) {
      console.error('Troubleshooting:');
      console.error('  - Verify you saw a success page after clicking magic link');
      console.error('  - Try running the script again');
    }

    console.error('');
    console.error('For more help, check the server logs above');
    console.error('');

    process.exit(1);

  } finally {
    // Phase 8: Cleanup
    console.log('Cleaning up...');

    if (browser) {
      try {
        await browser.close();
        console.log('✅ Browser closed');
      } catch (e) {
        console.warn('Warning: Could not close browser:', e.message);
      }
    }

    if (serverProcess) {
      try {
        serverProcess.kill('SIGTERM');
        // Give it a moment to shut down gracefully
        await sleep(2000);
        // Force kill if still running
        serverProcess.kill('SIGKILL');
        console.log('✅ Dev server stopped');
      } catch (e) {
        console.warn('Warning: Could not stop dev server:', e.message);
      }
    }

    // Clean up temporary profile
    if (existsSync(PROFILE_DIR_TEMP)) {
      try {
        await rm(PROFILE_DIR_TEMP, { recursive: true, force: true });
        console.log('✅ Temporary profile cleaned up');
      } catch (e) {
        console.warn('Warning: Could not remove temp profile:', e.message);
        console.warn(`   You may want to manually remove: ${PROFILE_DIR_TEMP}`);
      }
    }

    console.log('');
  }
})();
