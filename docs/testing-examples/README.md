# E2E Test Examples

This directory contains example test files that serve as **templates and documentation** for writing E2E tests in the gthanks project.

## Purpose

These files demonstrate:

- ✅ Test structure and organization
- ✅ Common testing patterns
- ✅ Best practices for E2E testing with Playwright
- ✅ How to test different features (auth, reservations, groups, edge cases)

## Important Notes

⚠️ **These files are NOT executable tests** - they contain `test.skip()` placeholders that need to be implemented based on your actual application flow.

⚠️ **These files were moved from `tests/e2e/`** to avoid inflating test metrics and confusing CI/CD reporting.

## Example Files

| File                            | Purpose                                                                    |
| ------------------------------- | -------------------------------------------------------------------------- |
| `example-auth.spec.ts`          | Authentication flow examples (login, logout, OAuth, magic links)           |
| `example-edge-cases.spec.ts`    | Edge case and error handling examples (network failures, validation, etc.) |
| `example-group-sharing.spec.ts` | Group sharing feature examples (invitations, permissions, etc.)            |
| `example-reservation.spec.ts`   | Reservation feature examples (privacy, conflicts, persistence)             |

## How to Use These Examples

1. **Copy** the relevant example file from this directory
2. **Rename** it to match your feature (e.g., `auth.spec.ts`)
3. **Move** it to the appropriate `tests/e2e/` subdirectory
4. **Replace** `test.skip()` with `test()` and implement the actual test logic
5. **Update** selectors and assertions to match your UI

## Reference

For actual working tests, see:

- `tests/e2e/core/user-journey.spec.ts`
- `tests/e2e/groups/workflows.spec.ts`
- `tests/e2e/reservations/privacy.spec.ts`
- `tests/e2e/edge-cases/high-risk.spec.ts`

## Testing Guidelines

See the main project documentation at:

- `/docs/e2e-testing-guide.md` - Complete E2E testing guide
- `/docs/codebase-exploration.md` - Codebase structure and analysis
