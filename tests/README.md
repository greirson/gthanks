# Integration Tests for gthanks MVP

## Overview

This directory contains integration tests for the critical paths of the gthanks application:
- **Authentication**: Magic link email flow, OAuth (if configured), session persistence
- **Reservations**: Core feature that prevents duplicate gifts

These tests follow MVP principles - focusing only on critical functionality that must work in production.

## Test Structure

```
tests/
├── integration/
│   ├── auth.test.ts          # Authentication critical paths
│   ├── reservations.test.ts  # Reservation system tests
│   └── test-helpers.ts       # Common test utilities
└── README.md                 # This file
```

## Running Tests

### Run All Integration Tests
```bash
pnpm test:integration
```

### Run Specific Test Suite
```bash
# Authentication tests only
pnpm test:integration auth

# Reservation tests only
pnpm test:integration reservations
```

### Watch Mode (for development)
```bash
pnpm test:integration:watch
```

### Run All Tests (unit + integration)
```bash
pnpm test:all
```

## What's Being Tested

### Authentication Tests (`auth.test.ts`)
✅ **Magic Link Flow**
- Sending magic link emails
- Creating user sessions with valid tokens
- Rejecting expired tokens
- Handling non-existent tokens

✅ **Session Persistence**
- Maintaining sessions across requests
- Cleaning up expired sessions

✅ **Protected Routes**
- Allowing authenticated users access
- Denying unauthenticated users
- Handling invalid session tokens

✅ **OAuth** (if configured)
- Account linking with OAuth providers

### Reservation Tests (`reservations.test.ts`)
✅ **Creating Reservations**
- Reserve wishes for gift giving
- Prevent duplicate reservations
- Anonymous reservations with access tokens
- Include wish details with reservations

✅ **Visibility Rules**
- Hide reservation details from wish owners
- Show details to the reserver
- Show reservation status to group members

✅ **Canceling Reservations**
- Users can cancel their own reservations
- Prevent canceling others' reservations
- Anonymous cancellation with access tokens

✅ **Edge Cases**
- Handle wish deletion with active reservations
- Manage concurrent reservation attempts
- Update timestamps correctly

## Test Environment

Tests use:
- **Mock Database**: In-memory mock implementation (see `jest.setup.js`)
- **Mock Email Service**: Captures emails for verification
- **Mock Authentication**: Simulates NextAuth sessions

## Environment Variables

Tests run with minimal configuration. OAuth tests are skipped if providers aren't configured:
- `GOOGLE_CLIENT_ID`
- `FACEBOOK_CLIENT_ID`
- `APPLE_CLIENT_ID`

## CI/CD Integration

### GitHub Actions Example
```yaml
name: Tests
on: [push, pull_request]

jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v2
      - uses: actions/setup-node@v2
        with:
          node-version: '20'
      - run: npm install -g pnpm
      - run: pnpm install
      - run: pnpm test:integration
```

### Pre-deployment Checklist
```bash
# Before deploying to production, ensure tests pass:
pnpm test:integration

# Expected output:
# PASS tests/integration/auth.test.ts
# PASS tests/integration/reservations.test.ts
# Test Suites: 2 passed, 2 total
# Tests: X passed, X total
```

## Test Utilities (`test-helpers.ts`)

Common utilities available for tests:

- `createMockRequest()` - Create mock Next.js requests
- `mockAuthenticatedUser()` - Set up authenticated user context
- `createTestScenario()` - Generate complete test data
- `TestContext` - Manage test state and cleanup
- `validateReservation()` - Validate reservation structure
- `simulateMagicLinkFlow()` - Test magic link authentication

## Troubleshooting

### Tests Failing
1. Ensure database mocks are reset: Tests automatically reset mock data
2. Check for async issues: Use `await` for all database operations
3. Verify mocks are properly configured in `jest.setup.js`

### Email Tests
- Email sends are mocked and captured
- Check `mockEmailSend.mock.calls` for sent emails
- Magic link URLs are extracted from email HTML

### Authentication Tests
- Use `mockAuthenticatedUser()` to set current user
- Use `clearAuth()` to reset authentication state
- Check `getCurrentUser` mock for proper user data

## MVP Testing Philosophy

These tests follow MVP principles:
- **Fast Execution**: Mock database, no real I/O
- **Critical Paths Only**: Auth and reservations are essential
- **Simple Assertions**: Basic checks, not exhaustive
- **No Coverage Requirements**: Quality over quantity
- **Happy Path Focus**: Edge cases are secondary

## Future Improvements (Post-MVP)

- [ ] E2E tests with Playwright
- [ ] Performance testing
- [ ] Load testing for reservations
- [ ] API contract testing
- [ ] Security testing
- [ ] Accessibility testing

## Questions or Issues?

For test-related questions:
1. Check test output for specific failures
2. Verify mock setup in `jest.setup.js`
3. Ensure test database is properly initialized
4. Review helper functions in `test-helpers.ts`
