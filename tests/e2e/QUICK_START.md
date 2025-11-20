# Playwright E2E Testing - Quick Start

## Installation Complete

Playwright has been successfully installed and configured for the gthanks project.

## Run Your First Test

```bash
# Run smoke tests (verifies basic functionality)
pnpm test:e2e smoke.spec.ts

# Run all E2E tests
pnpm test:e2e

# Run tests with UI (recommended for development)
pnpm test:e2e:ui
```

## Available Commands

```bash
pnpm test:e2e              # Run all E2E tests
pnpm test:e2e:ui           # Interactive UI mode
pnpm test:e2e:headed       # See the browser while tests run
pnpm test:e2e:debug        # Debug mode with breakpoints
pnpm test:e2e:report       # View last test report
pnpm test:e2e:chromium     # Run only Chromium tests
pnpm test:e2e:firefox      # Run only Firefox tests
pnpm test:e2e:webkit       # Run only WebKit tests
```

## Test Results

All smoke tests are passing:

- Homepage loads correctly
- Login page is accessible
- 404 handling works
- All tests pass in Chromium, Firefox, and WebKit

## Next Steps

1. Review example test files in:
   - `tests/e2e/core/example-auth.spec.ts`
   - `tests/e2e/reservations/example-reservation.spec.ts`
   - `tests/e2e/groups/example-group-sharing.spec.ts`
   - `tests/e2e/edge-cases/example-edge-cases.spec.ts`

2. Implement authentication helpers in `tests/e2e/helpers/auth.ts`

3. Add actual test implementations (currently marked as `.skip()`)

4. Focus on MVP critical paths:
   - Authentication flows
   - Wish creation and management
   - Gift reservations (hiding from list owners)
   - Group sharing functionality

## File Locations

- **Config**: `/Users/greir/projects/gthanks-dev/playwright.config.ts`
- **Tests**: `/Users/greir/projects/gthanks-dev/tests/e2e/`
- **Helpers**: `/Users/greir/projects/gthanks-dev/tests/e2e/helpers/`
- **Fixtures**: `/Users/greir/projects/gthanks-dev/tests/e2e/fixtures/`

## Tips

- Use `test.skip()` for tests not yet implemented
- Use data-testid attributes in your components for reliable selectors
- Leverage the helper functions for common operations
- Run tests in UI mode during development for better debugging

## Documentation

Full documentation is available in `tests/e2e/README.md`
