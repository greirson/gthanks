# High-Risk E2E Tests

This directory contains comprehensive end-to-end tests for critical high-risk areas of the gthanks application.

## Test File: `high-risk.spec.ts`

### Purpose

Tests the application's behavior under challenging conditions:

- **Performance**: Bulk operations with 50+ items
- **Validation**: Comprehensive form error handling
- **Responsiveness**: Mobile layout across different viewports

### Test Coverage

#### 1. Bulk Operations Performance Test

**Scenario**: Create, select, and delete 50 wishes

**Steps**:

1. Create 50 test wishes in the database (in batches of 10)
2. Navigate to wishes page and verify page loads
3. Enter selection mode
4. Select all 50 wishes using bulk select
5. Bulk delete all 50 wishes
6. Verify operation completes successfully

**Assertions**:

- Page loads with all 50 wishes visible
- Bulk selection completes without UI freeze
- Total operation time < 15 seconds (performance threshold)
- All wishes removed from database
- Success message displayed to user
- UI remains responsive throughout

**Performance Metrics Tracked**:

- Wish creation time
- Page navigation time
- Selection time
- Deletion time
- Total operation time

#### 2. Form Validation Error Display Test

**Scenario**: Comprehensive validation testing across all forms

**Forms Tested**:

##### Wish Creation Form

- Submit empty form → "Title required" error
- Clear title field after entry → Validation triggers
- Enter invalid price (text) → Number validation

##### List Creation Form

- Submit empty name → "Name required" error
- Enter special characters → Validation or acceptance

##### Email Invitation Form

- Enter invalid email → "Invalid email" error
- Enter valid email → Error clears, form submits

**Assertions**:

- Error messages display immediately
- Validation triggers on field blur
- Invalid inputs blocked or sanitized
- Valid inputs clear error states
- Forms remain usable after errors

#### 3. Mobile Responsive Layout Test

**Scenario**: iPhone SE responsive testing (portrait and landscape)

**Portrait Mode (375x667)**:

- Navigation menu accessible
- Wish cards display without overflow
- Form inputs usable (no text cutoff)
- Buttons meet 44px minimum touch target
- Wish creation succeeds on mobile

**Landscape Mode (667x375)**:

- Layout adapts correctly
- No horizontal overflow
- All content accessible
- Navigation still works
- Touch targets properly spaced

**Additional Tests**:

- Scroll behavior
- Touch target spacing
- Content visibility in both orientations

### Running the Tests

```bash
# Run all high-risk tests
pnpm test:e2e tests/e2e/edge-cases/high-risk.spec.ts

# Run in headed mode (see browser)
pnpm test:e2e:headed tests/e2e/edge-cases/high-risk.spec.ts

# Run in debug mode
pnpm test:e2e:debug tests/e2e/edge-cases/high-risk.spec.ts

# Run specific test by name
pnpm test:e2e tests/e2e/edge-cases/high-risk.spec.ts -g "Bulk Operations"

# Run only on Chromium
pnpm test:e2e:chromium tests/e2e/edge-cases/high-risk.spec.ts
```

### Test Configuration

- **Timeout**: 60 seconds (extended for bulk operations)
- **Browsers**: Chromium, Firefox, WebKit
- **Retries**: 2 attempts on failure
- **Screenshots**: Captured on failure
- **Video**: Recorded on failure

### Performance Benchmarks

Expected performance metrics (on reasonable hardware):

| Operation                | Expected Time    | Maximum Time   |
| ------------------------ | ---------------- | -------------- |
| Create 50 wishes         | < 5 seconds      | 10 seconds     |
| Page load with 50 items  | < 3 seconds      | 5 seconds      |
| Select all 50 items      | < 1 second       | 2 seconds      |
| Bulk delete 50 items     | < 5 seconds      | 10 seconds     |
| **Total bulk operation** | **< 10 seconds** | **15 seconds** |

### Known Limitations

1. **Database Performance**: Tests create real database records, so performance depends on database speed
2. **Network Latency**: Tests run against localhost, production may be slower
3. **Browser Variations**: Some operations may be faster/slower in different browsers
4. **Mobile Emulation**: Uses viewport emulation, not real mobile devices

### Debugging Failed Tests

If tests fail, check:

1. **Screenshots**: Located in `playwright-report/`
2. **Videos**: Recorded for failed tests in `test-results/`
3. **Console Logs**: Performance metrics logged during test execution
4. **Database State**: Tests include cleanup, but verify manually if needed

```bash
# View test report
pnpm test:e2e:report

# Clean up test database manually
pnpm db:push --force-reset  # WARNING: Only in dev!
```

### Adding New Tests

When adding new high-risk tests, consider:

1. **Performance Impact**: Will this test stress the system?
2. **Cleanup**: Does it properly clean up test data?
3. **Assertions**: Are performance thresholds realistic?
4. **Flakiness**: Can this test pass reliably on different systems?

### Example: Adding a New Test

```typescript
test('New high-risk scenario', async ({ page }) => {
  // 1. Setup
  const user = await createAndLoginUser(page, {
    email: `test-${Date.now()}@example.com`,
    name: 'Test User',
  });
  testUsers.push(user); // Important: Track for cleanup

  // 2. Perform operations
  // ... test steps ...

  // 3. Assertions
  expect(something).toBe(expected);

  // 4. Cleanup happens automatically in afterEach
});
```

### Related Documentation

- [E2E Test Helpers](../helpers/README.md)
- [Playwright Configuration](../../../playwright.config.ts)
- [MVP Development Guidelines](../../../CLAUDE.md)

## Maintenance

These tests should be reviewed and updated when:

- UI components change significantly
- Performance requirements change
- New bulk operations are added
- Mobile layout is redesigned

Last Updated: November 10, 2025
