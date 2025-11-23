# 3-Week Implementation Roadmap

**Status:** Actionable Tasks Only
**Created:** 2025-11-22
**Verified Against:** Codebase analysis (78 API routes, 14 service files)

---

## Week 1: Performance & Stability

### Day 1: Quick Wins + Database Optimization (3-4h)

**Tasks:**
- [ ] Disable auto-save in wish/list forms
- [ ] Reduce polling intervals: lists 60s→5min, wishes 30s→2min
- [ ] Add debouncing to search inputs (300ms)
- [ ] Add skeleton loaders to replace spinners
- [ ] Add composite indexes to Prisma schema

**Files to Modify:**
- `src/components/wishes/wish-form.tsx`
- `src/components/lists/list-form.tsx`
- Page components using React Query (search for `refetchInterval`)
- `src/components/filters/shared/searchUtils.ts` (add debounce)
- `prisma/schema.prisma`

**Database Indexes to Add:**
```prisma
model Wish {
  // Add composite index
  @@index([ownerId, wishLevel, createdAt])
}

model UserGroup {
  // Add composite index
  @@index([groupId, role, acceptedAt])
}

model ListAdmin {
  // Add index
  @@index([userId])
}

model ListGroup {
  // Add index
  @@index([groupId])
}
```

**Verification:**
```bash
pnpm db:push
pnpm dev
# Test forms no longer auto-save
# Verify polling intervals in Network tab
```

---

### Day 2: Permission Service Caching (3-4h)

⚠️ **CRITICAL:** Do NOT use Map on singleton service (causes memory leaks)

**Correct Implementation:**
Use React's `cache()` for request-scoped memoization:

**Files to Modify:**
- `src/lib/services/permission-service.ts`

**Implementation:**
```typescript
import { cache } from 'react';

// Create request-scoped cached version
export const checkPermissionCached = cache(async (userId: string, action: string, resourceType: string, resourceId: string) => {
  const service = new PermissionService();
  return service.can(userId, action, { type: resourceType, id: resourceId });
});

// Update API routes to use cached version
```

**Verification:**
```bash
pnpm test src/lib/services/permission-service.test.ts
pnpm dev
# Monitor logs for reduced database queries
```

---

### Day 3: Image Optimization Review (2h)

**Current State:**
- Sharp processing already implemented
- Server-side processing via `/api/upload/image`
- Serving via `/api/images/[filename]`
- Storage in `/uploads/` directory

**Tasks:**
- [ ] Review `next.config.js` for remotePatterns configuration (already uses modern pattern)
- [ ] Verify Sharp optimization settings in upload endpoint
- [ ] Add lazy loading attributes to image components
- [ ] Audit image sizes in production

**Files to Review:**
- `next.config.js:130` (verify `remotePatterns` in use, NOT deprecated `domains`)
- `src/app/api/upload/image/route.ts`
- `src/app/api/images/[filename]/route.ts`
- `src/components/ui/user-avatar.tsx`
- `src/components/wishes/wish-card-unified.tsx`

**Note:** Do NOT migrate to next/image - current Sharp implementation is production-ready.

**Verification:**
```bash
# Check Sharp settings
grep -A 10 "sharp(" src/app/api/upload/image/route.ts

# Verify remotePatterns (not domains)
grep "remotePatterns" next.config.js
```

---

### Day 4: Mobile UX Polish (3-4h)

**Tasks:**
- [ ] Audit all buttons for 44x44px minimum touch targets
- [ ] Update placeholder text to use examples (not instructions)
- [ ] Add loading states to all forms
- [ ] Fix toast z-index issues

**Files to Modify:**
- `src/components/ui/button.tsx`
- `src/components/wishes/wish-form.tsx`
- `src/components/lists/list-form.tsx`
- `src/components/groups/group-form.tsx`
- `src/components/ui/toast.tsx`

**Button Size Requirements:**
```typescript
// src/components/ui/button.tsx
size: {
  default: 'h-11 px-4 py-2', // 44px min height
  sm: 'h-11 px-3',           // Still 44px for mobile
  lg: 'h-12 px-8',           // 48px for primary
  icon: 'h-11 w-11',         // 44x44px square
}
```

**Placeholder Updates:**
```typescript
// Before: placeholder="Enter wish title"
// After: placeholder="New bike, red color"
```

**Verification:**
```bash
pnpm dev
# Test on Chrome DevTools → Device Toolbar
# iPhone SE (375px), iPad (768px), Desktop (1280px)
# Verify all touch targets ≥ 44px
```

---

## Week 2: Developer Experience & Code Quality

### Day 1-2: Auth Middleware Refactoring (6-8h)

**Current State:**
- 78 API routes total
- No centralized auth middleware

**Tasks:**
- [ ] Create `withAuth` higher-order function
- [ ] Migrate 10 pilot API routes
- [ ] Migrate remaining 68 API routes

**Files to Create:**
- `src/lib/api-utils.ts`

**Implementation:**
```typescript
// src/lib/api-utils.ts
import { auth } from '@/lib/auth';
import { NextResponse } from 'next/server';

type AuthOptions = {
  requireAuth?: boolean;
  requireAdmin?: boolean;
};

export function withAuth<T extends { params: any }>(
  handler: (req: Request, context: T, user: { id: string; email: string; isAdmin: boolean }) => Promise<Response>,
  options: AuthOptions = { requireAuth: true }
) {
  return async (req: Request, context: T) => {
    const session = await auth();

    if (options.requireAuth && !session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    if (options.requireAdmin && !session?.user?.isAdmin) {
      return NextResponse.json({ error: 'Forbidden - Admin access required' }, { status: 403 });
    }

    return handler(req, context, session?.user);
  };
}
```

**Migration Pattern:**
```typescript
// Before
export async function GET(req: Request) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
  // ... logic
}

// After
export const GET = withAuth(async (req, context, user) => {
  // ... logic
});
```

**Pilot Routes (10):**
- `src/app/api/wishes/route.ts` (GET, POST)
- `src/app/api/wishes/[id]/route.ts` (GET, PATCH, DELETE)
- `src/app/api/lists/route.ts` (GET, POST)
- `src/app/api/lists/[id]/route.ts` (GET, PATCH, DELETE)
- `src/app/api/admin/users/route.ts` (GET - requireAdmin)

**Verification:**
```bash
pnpm lint
pnpm typecheck
pnpm test:integration api/wishes
pnpm test:integration api/lists
```

---

### Day 3: Standardized Error Handling (4-5h)

**Tasks:**
- [ ] Enhance handleApiError utility
- [ ] Add error context logging
- [ ] Migrate 20 pilot API routes

**Files to Modify:**
- `src/lib/errors.ts`

**Implementation:**
```typescript
// src/lib/errors.ts
import * as Sentry from '@sentry/nextjs';
import { NextResponse } from 'next/server';

export class NotFoundError extends Error { statusCode = 404; }
export class ForbiddenError extends Error { statusCode = 403; }
export class ValidationError extends Error { statusCode = 400; }
export class UnauthorizedError extends Error { statusCode = 401; }
export class ConflictError extends Error { statusCode = 409; }
export class RateLimitError extends Error { statusCode = 429; }

type ErrorContext = {
  userId?: string;
  operation?: string;
  resourceType?: string;
  resourceId?: string;
  metadata?: Record<string, any>;
};

export function handleApiError(error: unknown, context?: ErrorContext): Response {
  // Known error types
  if (error instanceof ValidationError) {
    return NextResponse.json({ error: error.message }, { status: 400 });
  }
  if (error instanceof UnauthorizedError) {
    return NextResponse.json({ error: error.message }, { status: 401 });
  }
  if (error instanceof ForbiddenError) {
    return NextResponse.json({ error: error.message }, { status: 403 });
  }
  if (error instanceof NotFoundError) {
    return NextResponse.json({ error: error.message }, { status: 404 });
  }
  if (error instanceof ConflictError) {
    return NextResponse.json({ error: error.message }, { status: 409 });
  }
  if (error instanceof RateLimitError) {
    return NextResponse.json({ error: error.message }, { status: 429 });
  }

  // Unexpected errors
  console.error('Unexpected API error:', error, context);
  if (process.env.NODE_ENV === 'production') {
    Sentry.captureException(error, {
      contexts: { operation: context },
      tags: {
        operation: context?.operation,
        resourceType: context?.resourceType,
      },
    });
  }

  return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
}
```

**Usage in Service Layer:**
```typescript
// src/lib/services/wish-service.ts
export async function deleteWish(wishId: string, userId: string) {
  const wish = await db.wish.findUnique({ where: { id: wishId } });
  if (!wish) throw new NotFoundError('Wish not found');
  if (wish.ownerId !== userId) throw new ForbiddenError('Not authorized');

  await db.wish.delete({ where: { id: wishId } });
}

// API route
export const DELETE = withAuth(async (req, context, user) => {
  try {
    await wishService.deleteWish(context.params.id, user.id);
    return new NextResponse(null, { status: 204 });
  } catch (error) {
    return handleApiError(error, {
      userId: user.id,
      operation: 'deleteWish',
      resourceType: 'wish',
      resourceId: context.params.id,
    });
  }
});
```

**Verification:**
```bash
pnpm test src/lib/errors.test.ts
pnpm test:integration
```

---

### Day 4: Bundle Optimization (3-4h)

**Tasks:**
- [ ] Add dynamic imports for large form components
- [ ] Identify components that can be Server Components
- [ ] Configure bundle analyzer

**Files to Modify:**
- Components using large forms (wish-form.tsx, list-form.tsx, group-form.tsx)
- Parent components importing dialogs

**Dynamic Import Pattern:**
```typescript
import dynamic from 'next/dynamic';

const WishForm = dynamic(
  () => import('@/components/wishes/wish-form').then(mod => ({ default: mod.WishForm })),
  {
    loading: () => <FormSkeleton />,
    ssr: false,
  }
);
```

**Bundle Analyzer Setup:**
```bash
pnpm add -D @next/bundle-analyzer

# next.config.js
const withBundleAnalyzer = require('@next/bundle-analyzer')({
  enabled: process.env.ANALYZE === 'true',
});

module.exports = withBundleAnalyzer({
  // ... existing config
});
```

**Verification:**
```bash
ANALYZE=true pnpm build
# Review bundle sizes
```

---

### Day 5: Frontend Error Messages (2-3h)

**Tasks:**
- [ ] Create error code → user message mapping
- [ ] Update all toast notifications
- [ ] Update form error messages

**Files to Create:**
- `src/lib/error-messages.ts`

**Implementation:**
```typescript
// src/lib/error-messages.ts
export const ERROR_MESSAGES = {
  // Authentication
  UNAUTHORIZED: 'Please sign in to continue',
  SESSION_EXPIRED: 'Your session expired. Please sign in again',

  // Permissions
  FORBIDDEN: "You don't have permission to do that",
  NOT_LIST_OWNER: "You can't edit this list because you didn't create it",

  // Validation
  TITLE_REQUIRED: 'Please give your wish a name',
  TITLE_TOO_LONG: 'Wish name is too long (200 characters max)',
  INVALID_URL: "That link doesn't look right. Try copying it again",

  // Not Found
  WISH_NOT_FOUND: "We couldn't find that wish. It may have been deleted",
  LIST_NOT_FOUND: "This list doesn't exist or was deleted",

  // Rate Limiting
  RATE_LIMIT_EXCEEDED: 'Whoa, slow down! Please wait a moment and try again',

  // Generic
  SOMETHING_WENT_WRONG: 'Something went wrong. Please try again',
  NETWORK_ERROR: 'Connection problem. Check your internet and try again',
};

export function getUserFriendlyError(error: any, fallback = ERROR_MESSAGES.SOMETHING_WENT_WRONG): string {
  if (error.response?.data?.code) {
    return ERROR_MESSAGES[error.response.data.code] || fallback;
  }

  if (error.message) {
    if (error.message.includes('unauthorized')) return ERROR_MESSAGES.UNAUTHORIZED;
    if (error.message.includes('not found')) return ERROR_MESSAGES.WISH_NOT_FOUND;
    if (error.message.includes('rate limit')) return ERROR_MESSAGES.RATE_LIMIT_EXCEEDED;
  }

  return fallback;
}
```

**Files to Update:**
- `src/components/wishes/wish-form.tsx`
- `src/components/lists/list-form.tsx`
- `src/components/groups/group-form.tsx`
- All components using toast

**Usage:**
```typescript
import { getUserFriendlyError } from '@/lib/error-messages';

toast.error(getUserFriendlyError(error));
```

---

## Week 3: UX Polish & Completion

### Day 1-2: Complete API Refactoring (4-5h)

**Tasks:**
- [ ] Migrate remaining 48 API routes to handleApiError
- [ ] Add error context to all routes
- [ ] Run ESLint and fix warnings
- [ ] Run TypeScript type checking

**Files to Migrate:**
- Wishes: 15 routes remaining
- Lists: 11 routes remaining
- Groups: 9 routes remaining
- Admin: 11 routes remaining
- Other: 2 routes remaining

**Verification:**
```bash
pnpm lint:fix
pnpm typecheck
pnpm test:integration
pnpm build
```

---

### Day 3: Empty States Improvement (2h)

**Tasks:**
- [ ] Add helpful guidance to empty states
- [ ] Include 2-3 examples per empty state
- [ ] Add action buttons

**Files to Modify:**
- `src/components/wishes/empty-state-with-filters.tsx`
- `src/components/lists/empty-list-state.tsx`
- `src/components/groups/empty-state-quick-add.tsx`

**Pattern:**
```typescript
export function EmptyWishList({ onCreateWish }) {
  return (
    <div className="flex flex-col items-center justify-center py-12 text-center">
      <GiftIcon className="h-16 w-16 text-gray-300 mb-4" />
      <h3 className="text-lg font-semibold text-gray-900 mb-2">
        No wishes yet
      </h3>
      <p className="text-sm text-gray-600 mb-6 max-w-sm">
        Create your first wish! Think of something you'd like for your birthday, holiday, or just because.
      </p>
      <div className="space-y-2 text-left text-sm text-gray-500 mb-6">
        <p className="flex items-center">
          <CheckIcon className="h-4 w-4 mr-2 text-green-500" />
          Example: "Red mountain bike, 26 inch wheels"
        </p>
        <p className="flex items-center">
          <CheckIcon className="h-4 w-4 mr-2 text-green-500" />
          Example: "Kitchen mixer, KitchenAid brand"
        </p>
      </div>
      <Button onClick={onCreateWish}>
        <PlusIcon className="mr-2 h-4 w-4" />
        Create Your First Wish
      </Button>
    </div>
  );
}
```

---

### Day 4: Prefetching Strategy (2h)

**Tasks:**
- [ ] Add prefetch on hover for list cards
- [ ] Configure React Query staleTime/cacheTime

**Files to Modify:**
- `src/components/lists/list-card.tsx`
- Page components using React Query

**Implementation:**
```typescript
// src/components/lists/list-card.tsx
import { useQueryClient } from '@tanstack/react-query';

export function ListCard({ list }) {
  const queryClient = useQueryClient();

  const handleMouseEnter = () => {
    queryClient.prefetchQuery({
      queryKey: ['list', list.id],
      queryFn: () => fetch(`/api/lists/${list.id}`).then(r => r.json()),
    });

    queryClient.prefetchQuery({
      queryKey: ['wishes', 'list', list.id],
      queryFn: () => fetch(`/api/lists/${list.id}/wishes`).then(r => r.json()),
    });
  };

  return (
    <Link
      href={`/lists/${list.id}`}
      onMouseEnter={handleMouseEnter}
      onTouchStart={handleMouseEnter}
    >
      {/* Card content */}
    </Link>
  );
}
```

---

### Day 5: Success Animations (1h)

**Tasks:**
- [ ] Add copy action animation
- [ ] Add smooth selection transitions
- [ ] Polish loading states

**Files to Modify:**
- `src/components/ui/button.tsx`
- Card components with selection states

**Copy Animation Pattern:**
```typescript
const [copied, setCopied] = useState(false);

const handleCopy = () => {
  navigator.clipboard.writeText(url);
  setCopied(true);
  setTimeout(() => setCopied(false), 2000);
};

<Button onClick={handleCopy} className="transition-all">
  {copied ? (
    <>
      <CheckIcon className="mr-2 h-4 w-4 text-green-500 animate-in zoom-in" />
      Copied!
    </>
  ) : (
    <>
      <CopyIcon className="mr-2 h-4 w-4" />
      Copy Link
    </>
  )}
</Button>
```

**Selection Transition:**
```typescript
<Card
  className={cn(
    "transition-all duration-200",
    selected && "ring-2 ring-primary shadow-lg scale-[1.02]"
  )}
>
  {/* Content */}
</Card>
```

---

## Summary

**Total Effort:** 35-43 hours over 3 weeks

**Key Files Modified:**
- Forms: wish-form.tsx, list-form.tsx, group-form.tsx
- Services: permission-service.ts (caching)
- API utilities: api-utils.ts (withAuth), errors.ts (handleApiError)
- Error messages: error-messages.ts
- Components: 78 API routes, empty states, cards
- Config: prisma/schema.prisma (indexes)

**Critical Warnings:**
1. ⚠️ Do NOT use Map on singleton services (use React.cache)
2. ⚠️ Do NOT migrate to next/image domains (use remotePatterns)
3. ⚠️ Verify file paths against actual codebase structure

**Verification Commands:**
```bash
pnpm lint
pnpm typecheck
pnpm test
pnpm test:integration
pnpm build
```

**Next Steps:**
- Run code review before Week 1 starts
- Verify all file paths exist
- Test changes incrementally
- Monitor performance metrics in production
