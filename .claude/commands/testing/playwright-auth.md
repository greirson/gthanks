# Playwright MCP Authentication Setup

**Automated authentication setup for Playwright MCP using a dedicated Node.js script.**

## What This Does

This command automates the complete Playwright authentication flow:
1. ✅ Starts dedicated dev server with log capture
2. ✅ Launches browser to login page
3. ✅ Monitors server logs for magic link
4. ✅ Automatically navigates to magic link
5. ✅ Verifies session cookie creation
6. ✅ Cleans up all processes

## Usage

```bash
/playwright-auth
```

## Implementation

The command delegates to a robust Node.js script that uses Playwright's API directly:

```bash
#!/bin/bash

echo ""
echo "================================================"
echo "Playwright MCP Authentication Setup"
echo "================================================"
echo ""

# Check if Playwright is installed
if ! npx playwright --version > /dev/null 2>&1; then
    echo "⚠️  Playwright not found. Installing..."
    npx playwright install chromium
    echo ""
fi

# Run the authentication script
node scripts/playwright-auth.mjs

# Check exit code
EXIT_CODE=$?

if [ $EXIT_CODE -eq 0 ]; then
    echo ""
    echo "✅ Authentication setup complete!"
    echo ""
    echo "⚠️  IMPORTANT: Restart Claude Code to reload MCP configuration"
    echo ""
else
    echo ""
    echo "❌ Authentication setup failed."
    echo "   See error details above for troubleshooting."
    echo ""
    echo "Common fixes:"
    echo "  - Install Chromium: npx playwright install chromium"
    echo "  - Check port 3000: lsof -i :3000"
    echo "  - Verify .env configuration"
    echo ""
fi
```

## What Happens

### During Execution

1. **Dev Server Start**: A dedicated dev server starts on port 3000
2. **Browser Launch**: Chromium opens to the login page
3. **Automated Login Form**:
   - The script automatically fills in the test email (`test-playwright@example.com`)
   - The script automatically clicks "Send Login Link"
   - Wait for magic link detection and automatic navigation
4. **Automatic Magic Link**: Script captures link from server logs
5. **Auto Navigation**: Browser navigates to the magic link
6. **Cookie Verification**: Session cookie is verified
7. **Cleanup**: Browser and server are stopped automatically

### After Completion

- Session profile saved to `.playwright-profile/`
- Playwright MCP can now access authenticated pages
- **You must restart Claude Code** to reload MCP with the new session

### Profile Management

The script uses a two-stage profile approach to avoid conflicts:

1. **Authentication Stage**: Uses temporary profile (`.playwright-profile-temp`)
   - Avoids conflicts with running MCP server
   - Safe to authenticate while MCP is active

2. **Finalization Stage**: Copies to final profile (`.playwright-profile`)
   - Atomic replacement of profile
   - MCP picks up new session on Claude Code restart

**Why this approach?**
- Chromium enforces singleton lock on profile directories
- MCP server and auth script cannot share same profile simultaneously
- Temporary profile isolates authentication from active MCP sessions

## Troubleshooting

### Browser doesn't open

```bash
npx playwright install chromium
```

### Port 3000 already in use

```bash
lsof -i :3000
kill -9 <PID>
```

### Magic link timeout

- Check that you entered an email address
- Make sure you clicked "Send Magic Link"
- Verify email configuration in `.env`

### Session cookie not found

- Ensure you saw the success page after clicking magic link
- Try running the command again
- Check that authentication completed without errors

### Script errors

Run the script directly for more detailed output:

```bash
node scripts/playwright-auth.mjs
```

## Architecture

This command uses a **two-script architecture**:

1. **Slash Command** (this file): Simple 30-line wrapper
2. **Node.js Script** (`scripts/playwright-auth.mjs`): Robust 300-line implementation

### Why Node.js Instead of Bash?

The previous bash-only approach had critical flaws:
- ❌ Silent browser launch failures (backgrounding with `&`)
- ❌ State loss across separate bash invocations
- ❌ Fragile log scraping with `tail | grep`
- ❌ No error handling or recovery

The Node.js approach provides:
- ✅ Direct Playwright API control with error handling
- ✅ Single-process state management
- ✅ Real-time log monitoring via stdout events
- ✅ Cookie verification via Playwright API
- ✅ Guaranteed cleanup with try/finally
- ✅ Clear error messages with fix suggestions

## Testing

Test the new authenticated session:

```bash
# In Playwright MCP
mcp__playwright__browser_navigate {"url": "http://localhost:3000/lists"}
```

You should see your authenticated lists page without being redirected to login.

## Security Notes

- Profile directory (`.playwright-profile/`) is gitignored
- Contains sensitive session cookies
- Only use for development/testing
- Re-authenticate periodically as sessions expire (typically 30 days)

## Manual Authentication (Alternative)

If you prefer manual authentication:

```bash
npx playwright open http://localhost:3000/auth/login --user-data-dir=.playwright-profile
```

Complete the login flow manually, then restart Claude Code.
