# Testing Strategy

## Overview

gthanks uses a comprehensive testing pyramid with 80% coverage target for critical paths:

```
       E2E Tests (Playwright)
      /                      \
     /   Integration Tests    \
    /    (Jest + Prisma)       \
   /____________________________\
          Unit Tests (Jest)
```

## Testing Layers

### Unit Tests (Jest)

**Purpose**: Test individual functions, components, and utilities in isolation

**Coverage Target**: 80% for:

- Service layer functions
- Utility functions
- Custom hooks
- Complex component logic

**Tools**:

- Jest 29
- @testing-library/react 16
- @testing-library/user-event 14
- @testing-library/jest-dom 6

**Commands**:

```bash
pnpm test                  # Run all unit tests
pnpm test:watch            # Watch mode
pnpm test:coverage         # Generate coverage report
```

**Example: Service Layer Test**

```typescript
// tests/unit/lib/services/wish-service.test.ts
import { wishService } from '@/lib/services/wish-service';
import { db } from '@/lib/db';

jest.mock('@/lib/db');

describe('wishService', () => {
  describe('createWish', () => {
    it('creates wish with valid data', async () => {
      const mockWish = { id: '123', title: 'Test', ownerId: 'user1' };
      (db.wish.create as jest.Mock).mockResolvedValue(mockWish);

      const result = await wishService.createWish({ title: 'Test' }, 'user1');

      expect(result).toEqual(mockWish);
      expect(db.wish.create).toHaveBeenCalledWith({
        data: expect.objectContaining({ title: 'Test', ownerId: 'user1' }),
      });
    });

    it('throws ValidationError for invalid data', async () => {
      await expect(wishService.createWish({ title: '' }, 'user1')).rejects.toThrow(
        'Title is required'
      );
    });
  });
});
```

**Example: Component Test**

```typescript
// tests/unit/components/wishes/WishCard.test.tsx
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { WishCard } from '@/components/wishes/WishCard';

describe('WishCard', () => {
  it('displays wish information', () => {
    const wish = {
      id: '1',
      title: 'Red Bike',
      price: 299.99,
      wishLevel: 3,
    };

    render(<WishCard wish={wish} />);

    expect(screen.getByText('Red Bike')).toBeInTheDocument();
    expect(screen.getByText('$299.99')).toBeInTheDocument();
  });

  it('calls onReserve when reserve button clicked', async () => {
    const onReserve = jest.fn();
    const wish = { id: '1', title: 'Test' };

    render(<WishCard wish={wish} onReserve={onReserve} />);

    await userEvent.click(screen.getByRole('button', { name: /reserve/i }));

    expect(onReserve).toHaveBeenCalledWith('1');
  });
});
```

### Integration Tests (Jest + Prisma)

**Purpose**: Test multiple components working together with real database

**Coverage Target**: Critical user flows:

- Authentication flow
- Wish CRUD operations
- List sharing
- Group management
- Reservation system

**Tools**:

- Jest 29
- Prisma Client (test database)
- In-memory SQLite

**Commands**:

```bash
pnpm test:integration       # Run integration tests
pnpm test:integration:watch # Watch mode
pnpm test:all               # Run all tests
```

**Example: API Route Integration Test**

```typescript
// tests/integration/api/wishes.test.ts
import { testRequest } from '@/tests/helpers';
import { db } from '@/lib/db';
import { createTestUser } from '@/tests/fixtures';

describe('POST /api/wishes', () => {
  let user: any;

  beforeEach(async () => {
    user = await createTestUser();
  });

  afterEach(async () => {
    await db.wish.deleteMany();
    await db.user.deleteMany();
  });

  it('creates wish for authenticated user', async () => {
    const response = await testRequest.post('/api/wishes').auth(user.id).send({
      title: 'New Bike',
      price: 299.99,
      wishLevel: 2,
    });

    expect(response.status).toBe(201);
    expect(response.body).toMatchObject({
      title: 'New Bike',
      price: 299.99,
      ownerId: user.id,
    });

    const dbWish = await db.wish.findFirst({
      where: { title: 'New Bike' },
    });
    expect(dbWish).toBeTruthy();
  });

  it('returns 401 for unauthenticated request', async () => {
    const response = await testRequest.post('/api/wishes').send({ title: 'Test' });

    expect(response.status).toBe(401);
  });
});
```

### E2E Tests (Playwright)

**Purpose**: Test complete user flows in real browser

**Coverage Target**: Critical user journeys:

- User signup and onboarding
- Creating and managing wishes
- Sharing lists with groups
- Reserving gifts
- Admin functions

**Tools**:

- Playwright 1.56
- Chromium, Firefox, WebKit

**Commands**:

```bash
pnpm test:e2e              # Run all E2E tests
pnpm test:e2e:ui           # Playwright UI mode
pnpm test:e2e:headed       # Run with browser visible
pnpm test:e2e:debug        # Debug mode
pnpm test:e2e:report       # View test report
```

**Example: E2E Test**

```typescript
// tests/e2e/wish-management.spec.ts
import { test, expect } from '@playwright/test';
import { loginAsUser } from './helpers/auth';

test.describe('Wish Management', () => {
  test('create, edit, and delete wish', async ({ page }) => {
    await loginAsUser(page, 'test@example.com');

    // Create wish
    await page.goto('/wishes');
    await page.click('text=Create Wish');
    await page.fill('[name="title"]', 'Red Bike');
    await page.fill('[name="price"]', '299.99');
    await page.selectOption('[name="wishLevel"]', '3');
    await page.click('text=Save');

    await expect(page.locator('text=Red Bike')).toBeVisible();

    // Edit wish
    await page.click('[data-testid="wish-menu-Red Bike"]');
    await page.click('text=Edit');
    await page.fill('[name="title"]', 'Blue Bike');
    await page.click('text=Save');

    await expect(page.locator('text=Blue Bike')).toBeVisible();
    await expect(page.locator('text=Red Bike')).not.toBeVisible();

    // Delete wish
    await page.click('[data-testid="wish-menu-Blue Bike"]');
    await page.click('text=Delete');
    await page.click('text=Confirm');

    await expect(page.locator('text=Blue Bike')).not.toBeVisible();
  });
});
```

## Test Organization

```
tests/
├── unit/                   # Unit tests
│   ├── lib/
│   │   ├── services/       # Service layer tests
│   │   └── utils/          # Utility function tests
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

## Testing Best Practices

### 1. Test Naming Convention

Use descriptive test names that explain behavior:

```typescript
// ✅ Good
it('throws ForbiddenError when user is not list owner');

// ❌ Bad
it('test update list');
```

### 2. Arrange-Act-Assert Pattern

Structure tests clearly:

```typescript
it('creates reservation for wish', async () => {
  // Arrange
  const wish = await createTestWish();
  const reserver = { name: 'John', email: 'john@example.com' };

  // Act
  const reservation = await reservationService.createReservation(wish.id, reserver);

  // Assert
  expect(reservation.wishId).toBe(wish.id);
  expect(reservation.reserverName).toBe('John');
});
```

### 3. Mock External Dependencies

Mock external services (email, image processing):

```typescript
jest.mock('@/lib/email', () => ({
  sendEmail: jest.fn().mockResolvedValue(true),
}));

jest.mock('@/lib/image', () => ({
  processImage: jest.fn().mockResolvedValue('/uploads/image.jpg'),
}));
```

### 4. Clean Up After Tests

Always clean up database state:

```typescript
afterEach(async () => {
  await db.wish.deleteMany();
  await db.list.deleteMany();
  await db.user.deleteMany();
});
```

### 5. Use Test Fixtures

Create reusable test data factories:

```typescript
// tests/fixtures/user.ts
export async function createTestUser(overrides = {}) {
  return db.user.create({
    data: {
      email: 'test@example.com',
      name: 'Test User',
      ...overrides,
    },
  });
}
```

### 6. Test Error Cases

Don't just test happy paths:

```typescript
describe('deleteWish', () => {
  it('deletes wish successfully', async () => {
    /* ... */
  });

  it('throws NotFoundError when wish does not exist', async () => {
    await expect(wishService.deleteWish('nonexistent', 'user1')).rejects.toThrow(NotFoundError);
  });

  it('throws ForbiddenError when user is not owner', async () => {
    const wish = await createTestWish({ ownerId: 'user1' });

    await expect(wishService.deleteWish(wish.id, 'user2')).rejects.toThrow(ForbiddenError);
  });
});
```

## Continuous Integration

Tests run automatically on:

- Pre-commit hooks (unit tests only)
- Pull request creation
- Merges to main branch

**CI Pipeline:**

1. Install dependencies
2. Run linting + type checking
3. Run unit tests
4. Run integration tests
5. Run E2E tests (critical paths only)
6. Generate coverage report

## Coverage Requirements

**Minimum Coverage Targets:**

- Service layer: 80%
- Utility functions: 80%
- API routes: 70%
- Components: 60%
- Overall: 70%

**Priority Areas (Must be 100%):**

- Permission checks (`permissionService`)
- Authentication logic
- Reservation system
- Bulk delete operations

## Debugging Tests

**Unit/Integration Tests:**

```bash
# Run specific test file
pnpm test wish-service.test.ts

# Run tests matching pattern
pnpm test --testNamePattern="creates wish"

# Debug with breakpoints
node --inspect-brk node_modules/.bin/jest --runInBand
```

**E2E Tests:**

```bash
# Run in headed mode (see browser)
pnpm test:e2e:headed

# Run in debug mode (pause on error)
pnpm test:e2e:debug

# Run specific test file
pnpm test:e2e tests/e2e/wishes/create.spec.ts
```

## Test Data Management

**In-Memory Database (Unit/Integration):**

- SQLite in-memory database
- Isolated per test suite
- Fast and disposable

**Test Database (E2E):**

- SQLite file database (`data/test.db`)
- Reset before each test run
- Seeded with minimal data

**Database Seeding:**

```typescript
// tests/setup/seed.ts
export async function seedTestDatabase() {
  const admin = await db.user.create({
    data: {
      email: 'admin@example.com',
      isAdmin: true,
    },
  });

  const user = await db.user.create({
    data: {
      email: 'user@example.com',
    },
  });

  return { admin, user };
}
```
