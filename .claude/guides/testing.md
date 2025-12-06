# Testing Strategy

## Overview

Testing pyramid with 80% coverage target for critical paths:

- **E2E Tests** (Playwright) - Complete user flows in real browser
- **Integration Tests** (Jest + Prisma) - Multiple components with real database
- **Unit Tests** (Jest) - Individual functions, components, utilities

## Commands

| Command                 | Description                        |
| ----------------------- | ---------------------------------- |
| `pnpm test`             | Run unit tests                     |
| `pnpm test:watch`       | Unit tests in watch mode           |
| `pnpm test:coverage`    | Generate coverage report           |
| `pnpm test:integration` | Run integration tests              |
| `pnpm test:all`         | Run all tests (unit + integration) |
| `pnpm test:e2e`         | Run all E2E tests                  |
| `pnpm test:e2e:ui`      | Playwright UI mode                 |
| `pnpm test:e2e:headed`  | Run with browser visible           |
| `pnpm test:e2e:debug`   | Debug mode                         |
| `pnpm test:e2e:report`  | View test report                   |

## Test Organization

```
tests/
├── unit/                   # Unit tests
│   ├── lib/services/       # Service layer tests
│   ├── lib/utils/          # Utility function tests
│   ├── components/         # Component tests
│   └── hooks/              # Custom hook tests
├── integration/            # Integration tests
│   ├── api/                # API route tests
│   └── services/           # Service integration tests
├── e2e/                    # E2E tests
│   ├── auth/               # Authentication flows
│   ├── wishes/             # Wish management
│   ├── lists/              # List management
│   ├── groups/             # Group management
│   └── admin/              # Admin functions
├── fixtures/               # Test data factories
├── helpers/                # Test utilities
└── setup/                  # Jest/Playwright setup
```

## Coverage Requirements

**Minimum Targets:**

- Service layer: 80%
- Utility functions: 80%
- API routes: 70%
- Components: 60%
- Overall: 70%

**Must be 100%:**

- Permission checks (`permissionService`)
- Authentication logic
- Reservation system
- Bulk delete operations

## Best Practices

1. **Descriptive test names** - `it('throws ForbiddenError when user is not list owner')`
2. **Arrange-Act-Assert pattern** - Structure tests clearly
3. **Mock external dependencies** - Email, image processing, external APIs
4. **Clean up after tests** - Always reset database state in `afterEach`
5. **Use test fixtures** - Create reusable test data factories in `tests/fixtures/`
6. **Test error cases** - Don't just test happy paths
