---
description: Run E2E tests with automatic Zen debugging and fix suggestions
argument-hint: [smoke|failed|test-file-path]
allowed-tools: Bash(pnpm:*), Bash(pkill:*), Bash(ls:*), Read, Grep, Glob, mcp__zen__debug
---

# E2E Test Runner with Zen Debugging

You are an expert E2E test automation specialist with automatic debugging capabilities.

## Mission

Run Playwright E2E tests, automatically analyze failures using Zen debugging tools, and provide actionable fix suggestions.

## Input Analysis

**Arguments received:** `$ARGUMENTS`

**Determine test mode:**

- If empty or "all" → Run full test suite
- If "smoke" → Run smoke tests only
- If "failed" → Run previously failed tests (--last-failed)
- If path-like (contains "/" or ".spec.ts") → Run specific test file
- Otherwise → Run full suite

## Phase 1: Pre-flight Checks

### 1.1 Verify Playwright Installation

```bash
pnpm exec playwright --version
```

If Playwright is not installed or browsers are missing, run:

```bash
pnpm exec playwright install chromium
```

### 1.2 Stop Development Server

**Important:** Stop dev server to prevent SQLite database locks.

```bash
pkill -f "next dev" || echo "No dev server running"
```

### 1.3 Verify Test Database Configuration

```bash
cat .env.test 2>/dev/null || cat .env.local 2>/dev/null | grep -E "(DATABASE_URL|NEXTAUTH)" || echo "Check .env configuration"
```

### 1.4 List Available Tests (for context)

```bash
ls -la tests/e2e/*.spec.ts tests/e2e/core/*.spec.ts tests/e2e/groups/*.spec.ts 2>/dev/null | head -20
```

✅ **Pre-flight complete**

---

## Phase 2: Test Execution

### 2.1 Determine Command Based on Arguments

**Test command to run:**

- **Full suite**: `pnpm exec playwright test`
- **Smoke tests**: `pnpm exec playwright test smoke.spec.ts`
- **Failed tests**: `pnpm exec playwright test --last-failed`
- **Specific file**: `pnpm exec playwright test $ARGUMENTS`

### 2.2 Execute Tests

Run the appropriate command with:

- `--reporter=line` for concise output
- Default timeout and retries from playwright.config.ts

**Execute now:**

```bash
# Run the test command determined above
```

⚠️ **Capture the full output** - we need it for analysis.

---

## Phase 3: Result Analysis

### 3.1 Parse Test Results

From the test output, identify:

- **Total tests**: X tests total
- **Passed**: Y tests passed ✅
- **Failed**: Z tests failed ❌
- **Duration**: Test run time

### 3.2 Extract Failure Details

For each failed test, extract:

1. **Test file path** (e.g., `tests/e2e/core/auth.spec.ts`)
2. **Test name** (e.g., `"should login with magic link"`)
3. **Error message** (the actual failure reason)
4. **Stack trace** (relevant lines only)
5. **Screenshot path** (if available in test-results/)

### 3.3 Group Failures by Pattern

Categorize failures into patterns:

**Authentication Patterns:**

- Session cookie issues
- Redirect to /login unexpectedly
- NextAuth configuration problems

**Database Patterns:**

- Database locked errors
- Missing test data (forgot cleanDatabase)
- Foreign key constraint failures

**Selector Patterns:**

- Element not found (data-testid missing)
- Timeout waiting for element
- Wrong selector (CSS class changed)

**Configuration Patterns:**

- Missing environment variables
- Playwright config issues
- Base URL problems

---

## Phase 4: Automatic Zen Debugging

For each failed test or failure pattern:

### 4.1 Invoke Zen Debug

Use `mcp__zen__debug` to analyze each failure:

**For each failure, provide Zen with:**

```json
{
  "step": "Analyze E2E test failure: [test name]",
  "step_number": 1,
  "total_steps": 1,
  "next_step_required": false,
  "findings": "Test failed with: [error message]. Stack trace: [relevant trace lines]",
  "hypothesis": "[Initial hypothesis based on error pattern]",
  "relevant_files": [
    "/Users/greir/projects/gthanks-dev/tests/e2e/[failed-test-file]",
    "/Users/greir/projects/gthanks-dev/tests/e2e/helpers/auth.helper.ts",
    "/Users/greir/projects/gthanks-dev/tests/e2e/helpers/database.helper.ts"
  ],
  "files_checked": [],
  "confidence": "medium",
  "model": "gpt-5-pro"
}
```

### 4.2 Read Necessary Files for Context

Before invoking Zen, read:

- The failed test file
- Relevant helpers (auth.helper.ts, database.helper.ts)
- Playwright config if configuration-related

### 4.3 Process Zen Analysis

For each Zen debug session:

1. **Invoke the tool** with full context
2. **Capture root cause analysis** from Zen
3. **Extract fix suggestions** from Zen's recommendations
4. **Assess fix complexity** (simple/medium/complex)
5. **Move to next failure**

---

## Phase 5: Generate Report

### 5.1 Summary Header

```
🧪 E2E Test Run Complete
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Test Mode: [full/smoke/failed/specific]
Total: X tests
✅ Passed: Y tests
❌ Failed: Z tests
⏱️  Duration: [time]
```

### 5.2 Failure Analysis with Zen Results

For each failure, present:

```
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
❌ Failure X/Z: [test-file]
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Test: [test name]
Error: [error message]

🔍 Zen Analysis:
Root Cause: [Zen's root cause finding]
Confidence: [Zen's confidence level]

💡 Fix Suggestion:
File: [file to modify]:[line number]
Change: [specific code change needed]
Complexity: [simple/medium/complex]

[Code example if applicable]
```

### 5.3 Prioritized Fix List

```
📋 Fix Priority (Highest Impact First)
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

1. [HIGH] Fix [pattern name]
   Impact: Affects X tests
   Files: [list of files]
   Complexity: [simple/medium/complex]
   Fix: [one-line summary]

2. [MEDIUM] Fix [pattern name]
   Impact: Affects Y tests
   Files: [list of files]
   Complexity: [simple/medium/complex]
   Fix: [one-line summary]

3. [LOW] Individual test fixes
   [List remaining individual test fixes]
```

### 5.4 Actionable Next Steps

```
✅ Next Steps
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

1. Review the fix suggestions above
2. Apply HIGH priority fixes first (biggest impact)
3. Re-run tests: /test-e2e failed
4. Address remaining failures if any

Would you like me to implement these fixes?
```

### 5.5 Helpful Commands

```
Useful Commands:
- Run failed tests again: /test-e2e failed
- Run specific test: /test-e2e [path]
- Debug in UI mode: pnpm exec playwright test --ui
- View test report: pnpm exec playwright show-report
```

---

## Error Handling

### If Playwright Not Installed

```
⚠️  Playwright not found. Installing...
pnpm exec playwright install chromium
```

### If All Tests Pass

```
🎉 All tests passed! ✅

Total: X tests
Duration: [time]

No issues found. Great work!
```

### If No Failures to Analyze

```
ℹ️  No failed tests to analyze.

This means either:
- All tests passed ✅
- The test run was cancelled
- No tests matched the criteria

Try:
- /test-e2e (run full suite)
- /test-e2e smoke (run smoke tests)
```

---

## Best Practices Applied

✅ **Automatic Zen integration** - No manual debugging needed
✅ **Pattern recognition** - Groups related failures
✅ **Prioritized fixes** - Highest impact first
✅ **Clear reporting** - Easy to understand results
✅ **Actionable suggestions** - Specific code changes
✅ **Multiple test modes** - Flexible execution
✅ **Pre-flight checks** - Prevents common issues

---

## Usage Examples

```bash
# Run all E2E tests
/test-e2e

# Run smoke tests only
/test-e2e smoke

# Re-run failed tests
/test-e2e failed

# Run specific test file
/test-e2e tests/e2e/core/auth.spec.ts

# Run tests in a folder
/test-e2e tests/e2e/core/
```

---

**Ready to run tests! Proceeding with Phase 1...**
