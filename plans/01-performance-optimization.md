# Performance Optimization Implementation Plan

**Expected Impact:**
- API calls: -70%
- Page load time: -40%
- Database queries: -60%
- Bundle size: -25%
- Time to Interactive: -35%

---

## Phase 1: React Query Optimization

### 1.1 Update Query Client Configuration

**File:** `src/lib/query-client.ts`

**Current:**
```typescript
staleTime: 1000 * 30  // 30 seconds
```

**Change to:**
```typescript
export const QUERY_STALE_TIMES = {
  userProfile: 1000 * 60 * 5,    // 5 minutes
  listMetadata: 1000 * 60 * 5,   // 5 minutes
  wishes: 1000 * 60 * 2,         // 2 minutes
  lists: 1000 * 60 * 2,          // 2 minutes
  invitations: 1000 * 30,        // 30 seconds
  currentUser: 1000 * 60 * 5,    // 5 minutes
} as const;

function makeQueryClient() {
  return new QueryClient({
    defaultOptions: {
      queries: {
        staleTime: 1000 * 60 * 2,        // Default: 2 minutes
        gcTime: 1000 * 60 * 10,          // Garbage collect after 10 minutes
        retry: 1,
        refetchOnWindowFocus: false,
        refetchOnMount: false,           // Only refetch if stale
      },
    },
  });
}
```

### 1.2 Create Query Key Factory

**New file:** `src/lib/query-keys.ts`

```typescript
export const queryKeys = {
  wishes: {
    all: ['wishes'] as const,
    byOwner: (ownerId: string) => [...queryKeys.wishes.all, 'owner', ownerId] as const,
    detail: (wishId: string) => [...queryKeys.wishes.all, wishId] as const,
  },
  lists: {
    all: ['lists'] as const,
    detail: (listId: string) => [...queryKeys.lists.all, listId] as const,
    byOwner: (ownerId: string) => [...queryKeys.lists.all, 'owner', ownerId] as const,
  },
  users: {
    all: ['users'] as const,
    detail: (userId: string) => [...queryKeys.users.all, userId] as const,
    profile: (userId: string) => [...queryKeys.users.detail(userId), 'profile'] as const,
  },
} as const;
```

### 1.3 Update Wish Query Hook

**File:** `src/components/wishes/hooks/useWishFilters.ts`

**Current:**
```typescript
queryKey: ['wishes']
staleTime: 0
refetchOnMount: true
refetchOnWindowFocus: true
```

**Change to:**
```typescript
import { queryKeys, QUERY_STALE_TIMES } from '@/lib/query-client';

queryKey: queryKeys.wishes.byOwner(userId)
staleTime: QUERY_STALE_TIMES.wishes
// Remove refetchOnMount and refetchOnWindowFocus overrides
```

### 1.4 Update System Config Hook

**File:** `src/hooks/use-system-config.ts`

**Current:**
```typescript
queryKey: ['system-config', 'public']
staleTime: 5 * 60 * 1000
```

**Change to:**
```typescript
import { QUERY_STALE_TIMES } from '@/lib/query-client';

queryKey: ['system-config', 'public']
staleTime: QUERY_STALE_TIMES.listMetadata  // 5 minutes (already good)
```

---

## Phase 2: Database Query Optimization

### 2.1 Add Permission Cache

**New file:** `src/lib/cache/permission-cache.ts`

```typescript
import { LRUCache } from 'lru-cache';

interface PermissionCacheKey {
  userId: string;
  action: string;
  resourceType: string;
  resourceId: string;
}

interface PermissionCacheValue {
  allowed: boolean;
  reason?: string;
  cachedAt: number;
}

class PermissionCache {
  private cache: LRUCache<string, PermissionCacheValue>;

  constructor() {
    this.cache = new LRUCache<string, PermissionCacheValue>({
      max: 10000,
      ttl: 1000 * 60,  // 60 seconds
      updateAgeOnGet: true,
      allowStale: false,
    });
  }

  private getCacheKey(params: PermissionCacheKey): string {
    return `${params.userId}:${params.action}:${params.resourceType}:${params.resourceId}`;
  }

  get(params: PermissionCacheKey): PermissionCacheValue | undefined {
    return this.cache.get(this.getCacheKey(params));
  }

  set(params: PermissionCacheKey, value: Omit<PermissionCacheValue, 'cachedAt'>): void {
    this.cache.set(this.getCacheKey(params), {
      ...value,
      cachedAt: Date.now(),
    });
  }

  invalidate(resourceType: string, resourceId: string): void {
    for (const key of this.cache.keys()) {
      if (key.includes(`${resourceType}:${resourceId}`)) {
        this.cache.delete(key);
      }
    }
  }

  invalidateUser(userId: string): void {
    for (const key of this.cache.keys()) {
      if (key.startsWith(`${userId}:`)) {
        this.cache.delete(key);
      }
    }
  }

  clear(): void {
    this.cache.clear();
  }
}

export const permissionCache = new PermissionCache();
```

**Install dependency:**
```bash
pnpm add lru-cache
```

### 2.2 Update Permission Service

**File:** `src/lib/services/permission-service.ts`

**Add cache to can() method:**

```typescript
import { permissionCache } from '@/lib/cache/permission-cache';

async can(userId: string | undefined, action: Action, resource: Resource, context?: { password?: string }): Promise<PermissionResult> {
  // Skip cache for anonymous or password-protected
  if (!userId || context?.password) {
    return this.checkPermissionUncached(userId, action, resource, context);
  }

  // Check cache
  const cacheKey = {
    userId,
    action,
    resourceType: resource.type,
    resourceId: 'id' in resource ? resource.id : 'global',
  };

  const cached = permissionCache.get(cacheKey);
  if (cached) {
    return { allowed: cached.allowed, reason: cached.reason };
  }

  // Cache miss - check permission
  const result = await this.checkPermissionUncached(userId, action, resource, context);

  // Cache the result
  permissionCache.set(cacheKey, result);

  return result;
}

// Rename existing can() method to:
private async checkPermissionUncached(userId: string | undefined, action: Action, resource: Resource, context?: { password?: string }): Promise<PermissionResult> {
  // ... existing logic ...
}
```

### 2.3 Invalidate Cache on Mutations

**File:** `src/lib/services/list-service.ts`

**Add to share methods:**
```typescript
import { permissionCache } from '@/lib/cache/permission-cache';

async shareListWithGroup(listId: string, groupId: string, userId: string) {
  // ... existing logic ...

  // Invalidate permission cache
  permissionCache.invalidate('list', listId);

  return result;
}
```

**File:** `src/lib/services/group/group-membership.service.ts`

**Add to role change methods:**
```typescript
import { permissionCache } from '@/lib/cache/permission-cache';

async updateMemberRole(groupId: string, targetUserId: string, newRole: string) {
  // ... existing logic ...

  // Invalidate all permissions for this user
  permissionCache.invalidateUser(targetUserId);

  return result;
}
```

### 2.4 Add Composite Indexes

**File:** `prisma/schema.prisma`

**Add to List model (line ~143):**
```prisma
model List {
  // ... existing fields ...

  // Existing indexes:
  @@index([ownerId])
  @@index([slug])
  @@index([shareToken])
  @@index([createdAt])
  @@index([ownerId, visibility])
  @@index([ownerId, hideFromProfile])
  @@unique([ownerId, slug])

  // NEW: Add composite indexes
  @@index([id, ownerId])        // Fast ownership checks
  @@index([id, visibility])     // Fast visibility checks
}
```

**Add to Wish model (line ~202):**
```prisma
model Wish {
  // ... existing fields ...

  // Existing indexes:
  @@index([ownerId])
  @@index([wishLevel])
  @@index([price])
  @@index([imageStatus])
  @@index([ownerId, wishLevel])
  @@index([ownerId, createdAt])

  // NEW: Add composite indexes
  @@index([id, ownerId])        // Fast ownership checks
}
```

**Add to UserGroup model (line ~255):**
```prisma
model UserGroup {
  // ... existing fields ...

  // Existing indexes:
  @@index([userId])
  @@index([groupId])
  @@index([role])
  @@index([userId, groupId])

  // NEW: Add composite index
  @@index([userId, groupId, role])  // Fast role-based checks
}
```

**Add to ListAdmin model (line ~171):**
```prisma
model ListAdmin {
  // ... existing fields ...

  // Existing indexes:
  @@index([userId])
  @@index([listId])

  // NEW: Add reverse lookup
  @@index([userId, listId])
}
```

**Apply migration:**
```bash
pnpm prisma db push
```

---

## Phase 3: Image Optimization

### 3.1 Update Next.js Image Config

**File:** `next.config.js`

**Add to images config:**
```javascript
images: {
  remotePatterns: ALLOWED_IMAGE_REMOTE_PATTERNS,
  formats: ['image/avif', 'image/webp'],
  deviceSizes: [375, 640, 750, 828, 1080, 1200, 1920],
  imageSizes: [16, 32, 48, 64, 96, 128, 256, 384],
}
```

### 3.2 Update WishCard Image Component

**File:** `src/components/wishes/wish-card-unified.tsx`

**Find image rendering (around line 150-200) and update:**

```typescript
{hasImage && (
  <div className={cn('relative overflow-hidden', imageAspect)}>
    <Image
      src={imageSrc}
      alt={wish.title}
      fill
      sizes={variant === 'comfortable'
        ? '(max-width: 767px) 100vw, (max-width: 1023px) 50vw, 33vw'
        : '(max-width: 640px) 50vw, (max-width: 1024px) 33vw, 25vw'
      }
      className="object-cover"
      loading={priority ? 'eager' : 'lazy'}
      priority={priority}
      quality={85}
    />

    {isProcessing && (
      <div className="absolute inset-0 flex items-center justify-center bg-black/50">
        <div className="flex items-center gap-2 rounded-lg bg-white/90 px-3 py-2">
          <Clock className="h-4 w-4 animate-spin text-blue-600" />
          <span className="text-sm font-medium">Optimizing...</span>
        </div>
      </div>
    )}
  </div>
)}
```

**Add priority prop to WishCard:**
```typescript
interface WishCardProps {
  wish: Wish;
  variant?: 'comfortable' | 'compact' | 'list';
  priority?: boolean;  // NEW: for above-fold images
  // ... other props
}

export function WishCard({ wish, variant = 'comfortable', priority = false, ... }: WishCardProps) {
  // ... existing code
}
```

### 3.3 Add Blur Placeholder Utility

**New file:** `src/lib/utils/image-blur.ts`

```typescript
/**
 * Static blur placeholder for all images
 * Faster than generating per-image blur, sufficient for MVP
 */
export const BLUR_DATA_URL =
  'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mN8/5+hHgAHggJ/PchI7wAAAABJRU5ErkJggg==';
```

**Update WishCard to use blur:**
```typescript
import { BLUR_DATA_URL } from '@/lib/utils/image-blur';

<Image
  src={imageSrc}
  alt={wish.title}
  fill
  sizes={...}
  className="object-cover"
  loading={priority ? 'eager' : 'lazy'}
  priority={priority}
  quality={85}
  placeholder="blur"
  blurDataURL={BLUR_DATA_URL}
/>
```

### 3.4 Update Wishes Page to Mark Priority Images

**File:** `src/app/(app)/wishes/page.tsx` or similar wish list view

**Mark first 3-6 wishes as priority:**
```typescript
<WishGrid>
  {wishes.map((wish, index) => (
    <WishCard
      key={wish.id}
      wish={wish}
      priority={index < 3}  // First 3 cards are priority
      variant="comfortable"
    />
  ))}
</WishGrid>
```

---

## Phase 4: Bundle Optimization

### 4.1 Add Bundle Analyzer

**Install:**
```bash
pnpm add -D @next/bundle-analyzer
```

**File:** `next.config.js`

```javascript
const withBundleAnalyzer = require('@next/bundle-analyzer')({
  enabled: process.env.ANALYZE === 'true',
});

module.exports = withBundleAnalyzer({
  // ... existing config
});
```

**Run analysis:**
```bash
ANALYZE=true pnpm build
```

### 4.2 Dynamic Import Heavy Components

**File:** `src/components/wishes/wish-list.tsx` or pages using modals

**Before:**
```typescript
import { WishFormDialog } from '@/components/wishes/wish-form-dialog';
```

**After:**
```typescript
import dynamic from 'next/dynamic';

const WishFormDialog = dynamic(
  () => import('@/components/wishes/wish-form-dialog').then(mod => mod.WishFormDialog),
  {
    loading: () => (
      <div className="flex items-center justify-center p-8">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-gray-300 border-t-blue-600" />
      </div>
    ),
    ssr: false,
  }
);
```

**Apply to:**
- `WishFormDialog`
- `ListFormDialog`
- `ListSharingDialog`
- `ManageGiftCardsDialog`
- `GroupFormDialog`
- `GroupInviteDialog`

### 4.3 Optimize Icon Imports

**Current:** Multiple components import from `lucide-react`

**No changes needed** - Tree-shaking already works with named imports from `lucide-react`

**Monitor bundle:** If icon bundle exceeds 50KB after analysis, consider:
```typescript
// Create icon proxy file
// src/lib/icons.ts
export { Gift, Users, Lock, Heart, Github, Shield } from 'lucide-react';

// Then import from proxy
import { Gift } from '@/lib/icons';
```

### 4.4 Memoize Expensive Components

**File:** `src/components/wishes/wish-card-unified.tsx`

**Wrap with memo:**
```typescript
import { memo } from 'react';

export const WishCard = memo(function WishCard({ wish, variant, priority, ... }: WishCardProps) {
  // ... existing code
}, (prevProps, nextProps) => {
  // Custom comparison - only re-render if wish data changed
  return (
    prevProps.wish.id === nextProps.wish.id &&
    prevProps.wish.updatedAt === nextProps.wish.updatedAt &&
    prevProps.variant === nextProps.variant &&
    prevProps.priority === nextProps.priority
  );
});
```

**Apply memo to:**
- `ListCard` (`src/components/lists/list-card.tsx`)
- `GiftCardDesktopRow` (`src/components/lists/GiftCardDesktopRow.tsx`)
- `GiftCardMobileCard` (`src/components/lists/GiftCardMobileCard.tsx`)

---

## Testing Commands

```bash
# Performance testing
pnpm build
pnpm start
npx lighthouse http://localhost:3000/wishes --view

# Bundle analysis
ANALYZE=true pnpm build

# Database verification
pnpm prisma studio

# Verify indexes created
pnpm prisma db push
```

---

## Dependencies to Install

```bash
pnpm add lru-cache
pnpm add -D @next/bundle-analyzer @types/lru-cache
```

---

## Implementation Order

1. **Phase 1** (React Query) - Immediate API call reduction
2. **Phase 2.1-2.3** (Permission Cache) - Database query reduction
3. **Phase 3** (Image Optimization) - Page load improvement
4. **Phase 2.4** (Database Indexes) - Query speed improvement
5. **Phase 4** (Bundle Optimization) - Time to Interactive improvement

Each phase is independent and can be deployed separately.
