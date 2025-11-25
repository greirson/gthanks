# Backend Maintainability: Execution Plan

## Current State (Verified 2025-11-22)

**Codebase Analysis:**

- **78 API routes** total across application
- **6 routes** use centralized error handling (`handleApiError`)
- **72 routes** use manual error handling (inconsistent patterns)
- **Service layer**: ✅ All routes properly use services (wish-service, list-service, etc.)
- **Permission checks**: ✅ All routes use `permissionService.require/can`
- **Auth pattern**: ✅ `getCurrentUser()` used in 52 routes (consistent)
- **lib/api-utils.ts**: ❌ Does not exist yet

**Files to Create:**

- `/src/lib/api-utils.ts` - Auth wrappers and centralized patterns

**Files to Modify:**

- 72 API route files (phased migration)

---

## Goal

Reduce API route code by ~60% through centralized auth/error handling.

**Impact:**

- Current: ~2,730 lines (78 routes × ~35 lines avg)
- Target: ~936 lines (78 routes × ~12 lines avg)
- Reduction: 1,794 lines (66%)
- New routes: 10-15 lines instead of 40-50

---

## Phase 1: Create Auth Wrapper Utilities

### Step 1.1: Create `/src/lib/api-utils.ts`

````typescript
import { NextRequest, NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/auth-utils';
import { UnauthorizedError, ForbiddenError, handleApiError } from '@/lib/errors';
import type { User } from '@/lib/auth-utils';

/**
 * Authenticated request context with guaranteed user
 */
export interface AuthenticatedContext {
  user: NonNullable<User>;
  request: NextRequest;
}

/**
 * Handler function that receives authenticated context
 */
export type AuthenticatedHandler<T = unknown> = (
  context: AuthenticatedContext,
  ...args: unknown[]
) => Promise<NextResponse<T>>;

/**
 * Options for withAuth decorator
 */
export interface WithAuthOptions {
  /**
   * Require admin role
   * @default false
   */
  requireAdmin?: boolean;

  /**
   * Context string for error logging
   * @example "POST /api/wishes"
   */
  context?: string;
}

/**
 * Higher-order function that wraps API route handlers with authentication
 *
 * @example
 * ```typescript
 * export const GET = withAuth(async ({ user, request }) => {
 *   const wishes = await wishService.getUserWishes(user.id);
 *   return NextResponse.json(wishes);
 * });
 * ```
 *
 * @example
 * ```typescript
 * // With admin requirement
 * export const POST = withAuth(
 *   async ({ user, request }) => {
 *     const users = await adminService.listUsers();
 *     return NextResponse.json(users);
 *   },
 *   { requireAdmin: true, context: 'POST /api/admin/users' }
 * );
 * ```
 */
export function withAuth<T = unknown>(
  handler: AuthenticatedHandler<T>,
  options: WithAuthOptions = {}
): (request: NextRequest, ...args: unknown[]) => Promise<NextResponse<T>> {
  return async (request: NextRequest, ...args: unknown[]) => {
    try {
      // Check authentication
      const user = await getCurrentUser();
      if (!user) {
        throw new UnauthorizedError('Authentication required');
      }

      // Check admin role if required
      if (options.requireAdmin && !user.isAdmin) {
        throw new ForbiddenError('Admin access required');
      }

      // Call handler with authenticated context
      return await handler({ user, request }, ...args);
    } catch (error) {
      return handleApiError(error, options.context);
    }
  };
}

/**
 * Handler with route parameters (e.g., /api/wishes/[wishId])
 */
export type AuthenticatedHandlerWithParams<T = unknown, P = Record<string, string>> = (
  context: AuthenticatedContext,
  params: { params: P }
) => Promise<NextResponse<T>>;

/**
 * Wrapper for routes with parameters
 *
 * @example
 * ```typescript
 * export const GET = withAuthParams<unknown, { wishId: string }>(
 *   async ({ user }, { params }) => {
 *     const wish = await wishService.getWish(params.wishId, user.id);
 *     return NextResponse.json(wish);
 *   }
 * );
 * ```
 */
export function withAuthParams<T = unknown, P = Record<string, string>>(
  handler: AuthenticatedHandlerWithParams<T, P>,
  options: WithAuthOptions = {}
): (request: NextRequest, context: { params: P }) => Promise<NextResponse<T>> {
  return async (request: NextRequest, context: { params: P }) => {
    try {
      const user = await getCurrentUser();
      if (!user) {
        throw new UnauthorizedError('Authentication required');
      }

      if (options.requireAdmin && !user.isAdmin) {
        throw new ForbiddenError('Admin access required');
      }

      return await handler({ user, request }, context);
    } catch (error) {
      return handleApiError(error, options.context);
    }
  };
}
````

### Step 1.2: Write Unit Tests

Create `/src/lib/__tests__/api-utils.test.ts`:

```typescript
import { withAuth, withAuthParams } from '@/lib/api-utils';
import { getCurrentUser } from '@/lib/auth-utils';
import { NextRequest, NextResponse } from 'next/server';

jest.mock('@/lib/auth-utils');

describe('withAuth', () => {
  it('returns 401 when user is not authenticated', async () => {
    (getCurrentUser as jest.Mock).mockResolvedValue(null);

    const handler = withAuth(async () => {
      return NextResponse.json({ success: true });
    });

    const response = await handler(new NextRequest('http://localhost/api/test'));
    expect(response.status).toBe(401);
  });

  it('calls handler with authenticated user', async () => {
    const mockUser = { id: 'user1', isAdmin: false };
    (getCurrentUser as jest.Mock).mockResolvedValue(mockUser);

    const handler = withAuth(async ({ user }) => {
      return NextResponse.json({ userId: user.id });
    });

    const response = await handler(new NextRequest('http://localhost/api/test'));
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.userId).toBe('user1');
  });

  it('returns 403 when requireAdmin is true and user is not admin', async () => {
    const mockUser = { id: 'user1', isAdmin: false };
    (getCurrentUser as jest.Mock).mockResolvedValue(mockUser);

    const handler = withAuth(async () => NextResponse.json({ success: true }), {
      requireAdmin: true,
    });

    const response = await handler(new NextRequest('http://localhost/api/test'));
    expect(response.status).toBe(403);
  });
});
```

---

## Phase 2: Pilot Migration (5 Routes)

### Batch 0: Pilot Routes

**Target routes:**

1. `/src/app/api/wishes/route.ts` - GET, POST
2. `/src/app/api/wishes/[wishId]/route.ts` - GET, PATCH, DELETE

### Migration Pattern

**BEFORE** (45 lines):

```typescript
export async function GET(request: NextRequest) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const searchParams = request.nextUrl.searchParams;
    const queryParams = WishQuerySchema.parse({
      cursor: searchParams.get('cursor') || undefined,
      limit: searchParams.get('limit') ? parseInt(searchParams.get('limit') || '20') : undefined,
    });

    const result = await wishService.getUserWishes(user.id, queryParams);
    return NextResponse.json(result);
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: 'Invalid parameters' }, { status: 400 });
    }
    return NextResponse.json({ error: 'Failed' }, { status: 500 });
  }
}
```

**AFTER** (10 lines):

```typescript
import { withAuth } from '@/lib/api-utils';

export const GET = withAuth(
  async ({ user, request }) => {
    const searchParams = request.nextUrl.searchParams;
    const queryParams = WishQuerySchema.parse({
      cursor: searchParams.get('cursor') || undefined,
      limit: searchParams.get('limit') ? parseInt(searchParams.get('limit') || '20') : undefined,
    });

    const result = await wishService.getUserWishes(user.id, queryParams);
    return NextResponse.json(result);
  },
  { context: 'GET /api/wishes' }
);
```

**Route with params - BEFORE** (40 lines):

```typescript
export async function GET(request: NextRequest, { params }: { params: { wishId: string } }) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const wish = await wishService.getWish(params.wishId, user.id);
    return NextResponse.json(wish);
  } catch (error) {
    if (error instanceof NotFoundError) {
      return NextResponse.json({ error: error.message }, { status: 404 });
    }
    return NextResponse.json({ error: 'Failed' }, { status: 500 });
  }
}
```

**Route with params - AFTER** (8 lines):

```typescript
export const GET = withAuthParams<unknown, { wishId: string }>(
  async ({ user }, { params }) => {
    const wish = await wishService.getWish(params.wishId, user.id);
    return NextResponse.json(wish);
  },
  { context: 'GET /api/wishes/[wishId]' }
);
```

### Validation Steps

After pilot migration:

```bash
# Type check
pnpm typecheck

# Lint
pnpm lint

# Run tests
pnpm test:integration

# Test manually
curl http://localhost:3000/api/wishes # Should return 401
curl -H "Cookie: ..." http://localhost:3000/api/wishes # Should return wishes
```

---

## Phase 3: Batch Rollout

### Batch 1: Wishes Routes (10 routes)

- `/src/app/api/wishes/route.ts` - GET, POST
- `/src/app/api/wishes/[wishId]/route.ts` - GET, PATCH, DELETE
- `/src/app/api/wishes/[wishId]/image/route.ts` - POST, DELETE
- `/src/app/api/wishes/bulk/delete/route.ts` - POST

### Batch 2: Lists Routes (13 routes)

- `/src/app/api/lists/route.ts` - GET, POST
- `/src/app/api/lists/[listId]/route.ts` - GET, PATCH, DELETE
- `/src/app/api/lists/[listId]/wishes/route.ts` - GET, POST
- `/src/app/api/lists/[listId]/wishes/[wishId]/route.ts` - DELETE
- `/src/app/api/lists/[listId]/wishes/bulk-remove/route.ts` - POST
- `/src/app/api/lists/[listId]/admins/route.ts` - GET, POST, DELETE
- `/src/app/api/lists/[listId]/groups/route.ts` - GET
- `/src/app/api/lists/[listId]/slug/route.ts` - PATCH
- `/src/app/api/lists/[listId]/password/route.ts` - POST

### Batch 3: Groups Routes (13 routes)

- `/src/app/api/groups/route.ts` - GET, POST
- `/src/app/api/groups/[id]/route.ts` - GET, PATCH, DELETE
- `/src/app/api/groups/[id]/members/route.ts` - GET
- `/src/app/api/groups/[id]/members/[userId]/route.ts` - DELETE
- `/src/app/api/groups/[id]/invitations/route.ts` - POST
- `/src/app/api/groups/[id]/invitations/[invitationId]/route.ts` - DELETE
- `/src/app/api/groups/[id]/invitations/accept/route.ts` - POST
- `/src/app/api/groups/[id]/lists/route.ts` - GET, POST
- `/src/app/api/groups/[id]/lists/[listId]/route.ts` - DELETE
- `/src/app/api/groups/[id]/image/route.ts` - POST, DELETE

### Batch 4: User Routes (15 routes)

- `/src/app/api/user/profile/route.ts` - GET, PATCH
- `/src/app/api/user/username/route.ts` - PATCH
- `/src/app/api/user/avatar/route.ts` - GET, POST, DELETE
- `/src/app/api/user/emails/route.ts` - GET, POST
- `/src/app/api/user/emails/[emailId]/route.ts` - DELETE
- `/src/app/api/user/emails/[emailId]/primary/route.ts` - POST
- `/src/app/api/user/emails/verify/route.ts` - POST
- `/src/app/api/user/emails/resend-verification/route.ts` - POST
- `/src/app/api/user/profile-settings/route.ts` - GET, PATCH
- `/src/app/api/user/preferences/route.ts` - GET, PATCH

### Batch 5: Admin Routes (10 routes)

- `/src/app/api/admin/users/route.ts` - GET
- `/src/app/api/admin/users/[userId]/route.ts` - GET, PATCH
- `/src/app/api/admin/users/[userId]/username/route.ts` - PATCH
- `/src/app/api/admin/users/[userId]/suspend/route.ts` - POST
- `/src/app/api/admin/users/[userId]/unsuspend/route.ts` - POST
- `/src/app/api/admin/users/bulk/route.ts` - POST
- `/src/app/api/admin/settings/route.ts` - GET, PATCH

### Batch 6: Remaining Routes (11 routes)

- `/src/app/api/reservations/route.ts` - POST
- `/src/app/api/reservations/[id]/route.ts` - DELETE
- `/src/app/api/reservations/verify/route.ts` - POST
- `/src/app/api/invitations/accept/route.ts` - POST
- `/src/app/api/metadata/route.ts` - POST
- Other misc routes

**Validation after each batch:**

```bash
pnpm typecheck
pnpm lint
pnpm test:integration
```

---

## Phase 4: Optional Rate Limiting Enhancement

**Current state:** Global rate limiting already handled by middleware (100 req/min per IP).

**If specific endpoint rate limits needed**, extend `/src/lib/api-utils.ts`:

```typescript
import { rateLimiter, getClientIdentifier } from '@/lib/rate-limiter';
import { AppError } from '@/lib/errors';

export type RateLimitCategory = 'image-upload' | 'metadata-extract' | 'email-add' | 'email-verify';

export interface WithAuthAndRateLimitOptions extends WithAuthOptions {
  rateLimit?: {
    category: RateLimitCategory;
    useUserId?: boolean;
  };
}

export function withAuthAndRateLimit<T = unknown>(
  handler: AuthenticatedHandler<T>,
  options: WithAuthAndRateLimitOptions = {}
): (request: NextRequest, ...args: unknown[]) => Promise<NextResponse<T>> {
  return async (request: NextRequest, ...args: unknown[]) => {
    try {
      const user = await getCurrentUser();
      if (!user) {
        throw new UnauthorizedError('Authentication required');
      }

      if (options.requireAdmin && !user.isAdmin) {
        throw new ForbiddenError('Admin access required');
      }

      // Apply rate limiting if configured
      if (options.rateLimit) {
        const identifier = options.rateLimit.useUserId ? user.id : getClientIdentifier(request);

        const result = await rateLimiter.check(options.rateLimit.category, identifier);

        if (!result.allowed) {
          throw new AppError(
            'Too many requests. Please wait a moment and try again',
            'RATE_LIMIT_EXCEEDED',
            429
          );
        }
      }

      return await handler({ user, request }, ...args);
    } catch (error) {
      return handleApiError(error, options.context);
    }
  };
}
```

**Usage:**

```typescript
export const POST = withAuthAndRateLimit(
  async ({ user, request }) => {
    const formData = await request.formData();
    const image = formData.get('image') as File;
    const result = await imageProcessor.processImage(image);
    return NextResponse.json({ url: result.localPath });
  },
  {
    rateLimit: { category: 'image-upload', useUserId: true },
    context: 'POST /api/upload/image',
  }
);
```

---

## Common Patterns Reference

### Pattern 1: Simple GET Route

```typescript
export const GET = withAuth(async ({ user }) => {
  const items = await service.getItems(user.id);
  return NextResponse.json(items);
});
```

### Pattern 2: POST with Validation

```typescript
export const POST = withAuth(
  async ({ user, request }) => {
    const body = await request.json();
    const validatedData = schema.parse(body);
    const item = await service.createItem(validatedData, user.id);
    return NextResponse.json(item, { status: 201 });
  },
  { context: 'POST /api/items' }
);
```

### Pattern 3: Route with Params

```typescript
export const GET = withAuthParams<unknown, { id: string }>(async ({ user }, { params }) => {
  const item = await service.getItem(params.id, user.id);
  return NextResponse.json(item);
});
```

### Pattern 4: Admin Route

```typescript
export const DELETE = withAuthParams<unknown, { userId: string }>(
  async ({ user }, { params }) => {
    await adminService.deleteUser(params.userId);
    return new NextResponse(null, { status: 204 });
  },
  { requireAdmin: true, context: 'DELETE /api/admin/users/[userId]' }
);
```

### Pattern 5: Query Parameters

```typescript
export const GET = withAuth(async ({ user, request }) => {
  const searchParams = request.nextUrl.searchParams;
  const page = parseInt(searchParams.get('page') || '1');
  const limit = parseInt(searchParams.get('limit') || '20');

  const result = await service.getItems(user.id, { page, limit });
  return NextResponse.json(result);
});
```

---

## Implementation Timeline

### Week 1: Foundation

- [ ] Create `src/lib/api-utils.ts`
- [ ] Implement `withAuth` and `withAuthParams`
- [ ] Write unit tests
- [ ] Update `.claude/guides/api.md` documentation

### Week 2: Pilot

- [ ] Migrate wishes routes (10 routes)
- [ ] Run integration tests
- [ ] Verify type safety
- [ ] Get team approval

### Weeks 3-4: Batch Rollout

- [ ] Batch 1: Lists routes (13)
- [ ] Batch 2: Groups routes (13)
- [ ] Batch 3: User routes (15)
- [ ] Batch 4: Admin routes (10)
- [ ] Batch 5: Remaining (11)
- [ ] Test after each batch

### Week 5: Validation

- [ ] Full integration test suite
- [ ] E2E test suite
- [ ] Security audit (auth checks, permission checks)
- [ ] Performance check (no regression)

---

## Success Metrics

**Quantitative:**

- Code reduction: 2,730 → 936 lines (66% reduction)
- New route length: 10-15 lines vs 40-50 lines
- Error response consistency: 100% of routes
- Type safety: Zero TypeScript errors

**Qualitative:**

- Single source of truth for auth/error handling
- Impossible to forget auth check
- Faster onboarding for new developers
- Easier to test individual handlers

---

## Rollback Plan

If issues found during rollout:

1. **Identify problematic routes**
2. **Revert those routes only** (keep working migrations)
3. **Fix issues in utilities**
4. **Re-apply to reverted routes**

**Emergency rollback:**

```bash
git revert <commit-hash>
git push origin main
```

---

## Security Checklist

Before marking complete:

- [ ] All routes use `withAuth` or `withAuthParams`
- [ ] Admin routes use `requireAdmin: true`
- [ ] Permission checks still use `permissionService` in services
- [ ] No auth bypass vulnerabilities introduced
- [ ] Error messages don't leak sensitive info
- [ ] Rate limiting still functional

---

## Notes

**What NOT to change:**

- ✅ Service layer (already excellent)
- ✅ Permission service (working correctly)
- ✅ Middleware rate limiting (already implemented)
- ✅ ESLint enforcement rules

**What TO change:**

- ❌ Manual auth checks in every route → `withAuth` wrapper
- ❌ Manual error handling → `handleApiError` centralized
- ❌ Inconsistent error messages → Standardized via wrapper

---

## References

**Key Files:**

- `/src/lib/api-utils.ts` - Auth wrappers (to create)
- `/src/lib/errors.ts` - Error handling utilities (existing)
- `/src/lib/auth-utils.ts` - `getCurrentUser()` (existing)
- `/src/middleware.ts` - Global rate limiting (existing)
- `/src/lib/services/permission-service.ts` - Authorization (existing)
