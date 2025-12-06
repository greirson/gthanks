---
description: Run E2E tests with automatic Zen debugging and fix suggestions
argument-hint: [smoke|failed|test-file-path]
allowed-tools: Bash(pnpm:*), Bash(pkill:*), Bash(ls:*), Read, Grep, Glob, mcp__zen__debug
---

# E2E Test Runner with Zen Debugging

## Mission

Run Playwright E2E tests, automatically analyze failures using Zen debugging, and provide actionable fix suggestions.

## Input Analysis

**Arguments:** `$ARGUMENTS`

- Empty or "all" - Run full test suite
- "smoke" - Run smoke tests only
- "failed" - Run previously failed tests (--last-failed)
- Path-like (contains "/" or ".spec.ts") - Run specific test file

## Phase 1: Pre-flight Checks

1. Verify Playwright: `pnpm exec playwright --version`
2. Stop dev server: `pkill -f "next dev" || echo "No dev server running"`
3. Check env config: `cat .env.test 2>/dev/null | grep -E "(DATABASE_URL|NEXTAUTH)"`

## Phase 2: Test Execution

Run appropriate command based on arguments:

- Full suite: `pnpm exec playwright test --reporter=line`
- Smoke: `pnpm exec playwright test smoke.spec.ts`
- Failed: `pnpm exec playwright test --last-failed`
- Specific: `pnpm exec playwright test $ARGUMENTS`

## Phase 3: Result Analysis

Parse output to identify: total tests, passed, failed, duration. For failures, extract test file path, test name, error message, and stack trace.

Group failures by pattern: Authentication (session/redirect issues), Database (locks, missing data), Selector (element not found, timeouts), Configuration (env vars, base URL).

## Phase 4: Zen Debugging

For each failure, invoke `mcp__zen__debug` with:

- Error message and stack trace
- Relevant test files and helpers
- Initial hypothesis based on error pattern

Capture root cause analysis and fix suggestions from Zen.

## Phase 5: Report

Generate summary with: test mode, pass/fail counts, duration, failure analysis with Zen results, prioritized fix list (HIGH/MEDIUM/LOW), and next steps.

## Usage Examples

```bash
/test-e2e              # Run all E2E tests
/test-e2e smoke        # Run smoke tests only
/test-e2e failed       # Re-run failed tests
/test-e2e tests/e2e/core/auth.spec.ts  # Run specific test
```

## Helpful Commands

```bash
pnpm exec playwright test --ui        # Debug in UI mode
pnpm exec playwright show-report      # View test report
```
