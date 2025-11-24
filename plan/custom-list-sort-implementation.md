# Custom Drag-and-Drop Sort for Lists - Implementation Plan

## Task Checklist

### Phase 1: Database Schema
- [x] Add `sortOrder Float?` field to ListWish model in prisma/schema.prisma
- [x] Add `@@index([listId, sortOrder])` for efficient queries
- [x] Run `pnpm prisma generate`
- [x] Run `pnpm db:push` to apply schema changes
- [ ] Verify schema in Prisma Studio

### Phase 2: Backend - Service Layer
- [x] Add `updateWishSortOrder()` method to list-service.ts (single wish update)
- [x] Add `initializeCustomSort()` method to list-service.ts (first-time setup)
- [x] Modify `getList()` to order by sortOrder (with addedAt fallback)
- [x] Add conflict detection logic (check list.updatedAt)
- [ ] Write unit tests for service methods

### Phase 3: Backend - API Routes
- [x] Create `PATCH /api/lists/[listId]/wishes/[wishId]/route.ts`
- [x] Add `sortOrder` field validation (Zod schema)
- [x] Implement permission check via permissionService
- [x] Add conflict detection (409 response if stale)
- [ ] Write integration tests for API route

### Phase 4: Frontend - API Client
- [x] Add `updateWishSortOrder()` method to src/lib/api/lists.ts
- [x] Add Zod schema for response validation
- [ ] Test API client method

### Phase 5: Frontend - Hooks & Utilities
- [x] Add `'custom'` to SortOption type in useWishFilters.ts
- [x] Add `case 'custom'` to sorting logic
- [x] Create `calculateNewSortOrder()` utility (fractional indexing)
- [x] Create `shouldRenumberList()` utility (precision check)

### Phase 6: Frontend - Sortable Components
- [x] Create `SortableWishGrid.tsx` (wraps WishGrid with DndContext)
- [x] Create `SortableWishList.tsx` (wraps WishList with DndContext)
- [x] Create `SortableWishCard.tsx` (individual draggable card)
- [x] Add drag handle UI (GripVertical icon)
- [x] Implement optimistic UI updates
- [x] Add error handling with rollback

### Phase 7: Frontend - UI Integration
- [x] Modify `WishesDisplay.tsx` to conditionally use sortable components
- [x] Add "Custom Order" option to WishFilterPanel.tsx
- [x] Add "Custom Order" option to MobileFilterSheet.tsx
- [x] Add `onReorder` handler in list-detail-view.tsx
- [x] Auto-switch to "Custom" sort after drag
- [x] Show/hide "Custom Order" based on whether custom sort exists

### Phase 8: Testing
- [ ] Write unit tests for fractional indexing utilities
- [ ] Write unit tests for list-service methods
- [ ] Write integration tests for API routes
- [SKIP] Write E2E test: owner can drag to reorder
- [SKIP] Write E2E test: non-owner cannot see drag handles
- [SKIP] Write E2E test: mobile drag works on 375px viewport
- [SKIP] Write E2E test: order persists after reload
- [SKIP] Write E2E test: concurrent editing shows conflict

### Phase 9: Edge Cases & Polish
- [ ] Handle precision limit (renumber when gap < 0.001)
- [ ] Handle new wish insertion (calculate sortOrder for end of list)
- [ ] Add loading states during drag operations
- [ ] Add success/error toast notifications
- [ ] Test with 100+ wish list (performance)
- [ ] Test keyboard accessibility (arrow keys, Space/Enter)
- [ ] Test screen reader announcements

### Phase 10: Documentation & Rollout
- [ ] Update API documentation
- [ ] Add JSDoc comments to new methods
- [ ] Update CLAUDE.md if needed
- [ ] Test database migration on staging
- [ ] Deploy to production
- [ ] Monitor error rates and performance

---

## Executive Summary

### Problem
List owners and co-managers need the ability to manually reorder wishes in their lists, preserving custom priority beyond algorithmic sorting.

### Solution
Implement drag-and-drop custom sorting using **fractional indexing** for efficient, conflict-resistant reordering with auto-save on drop.

### Key Technical Decisions

| Decision | Choice | Rationale |
|----------|--------|-----------|
| **Order Storage** | `sortOrder Float?` in ListWish | Nullable for backward compatibility, Float for fractional indexing |
| **Update Strategy** | Single-wish update | Only update moved item (not all wishes), better performance |
| **API Endpoint** | `PATCH /api/lists/[listId]/wishes/[wishId]` | RESTful, simple payload, fast |
| **Indexing Strategy** | Fractional indexing | Industry-proven (Figma, Linear, Notion), avoids renumbering |
| **Concurrent Editing** | Optimistic lock via `updatedAt` check | Detect conflicts, return 409, force refresh |
| **Save Strategy** | Auto-save on drop | User requirement, feasible with fractional indexing |
| **New Wish Placement** | End of list (`MAX(sortOrder) + 1.0`) | User requirement, clear behavior |
| **Sort Persistence** | Keep `sortOrder` when switching sorts | UX: custom order available when returning to "Custom" |

---

## Critical Improvements from Original Plan

### 1. Fractional Indexing vs. Sequential Integers

**Original Plan (REJECTED)**:
```typescript
// BAD: Update ALL wishes on every drag
sortOrder: Int
Values: 0, 1, 2, 3, 4, 5...
Move wish 5 to position 2 → Renumber wishes 2, 3, 4, 5 (4 UPDATEs)
```

**Improved Plan (APPROVED)**:
```typescript
// GOOD: Update ONLY moved wish
sortOrder: Float
Values: 1.0, 2.0, 3.0, 4.0, 5.0...
Move wish 5.0 to position 2 → Update only wish to 1.5 (1 UPDATE)
```

**Benefits**:
- 50x fewer database writes (1 UPDATE vs 50 UPDATEs on 50-wish list)
- No cascading renumbering
- Better concurrent editing (smaller conflict surface)
- Proven industry pattern (Figma, Linear, Notion)

### 2. Single-Wish API vs. Bulk Update

**Original Plan (REJECTED)**:
```typescript
// BAD: Large payload, slow transaction
POST /api/lists/[listId]/wishes/reorder
{
  updates: [
    { wishId: "1", sortOrder: 0 },
    { wishId: "2", sortOrder: 1 },
    // ... 50 more items
  ]
}
```

**Improved Plan (APPROVED)**:
```typescript
// GOOD: Small payload, fast update
PATCH /api/lists/[listId]/wishes/[wishId]
{
  sortOrder: 1.5
}
```

**Benefits**:
- Tiny payload (one wish ID, one float)
- Simple validation
- Fast database write (1 UPDATE)
- RESTful convention
- Better for concurrent editing

### 3. Conflict Detection

**Original Plan (MISSING)**:
- No version tracking
- No conflict detection
- "last-write-wins" with silent overwrites

**Improved Plan (ADDED)**:
```typescript
// Check if list was modified since client loaded
const list = await db.list.findUnique({
  where: { id: listId },
  select: { updatedAt: true }
});

if (req.headers.get('If-Unmodified-Since')) {
  const clientTime = new Date(req.headers.get('If-Unmodified-Since'));
  if (list.updatedAt > clientTime) {
    return NextResponse.json(
      { error: 'List was modified by another user. Please refresh.' },
      { status: 409 }
    );
  }
}
```

**Benefits**:
- Prevents silent overwrites
- Clear error message to user
- Industry-standard HTTP 409 Conflict

---

## Database Schema Changes

### Prisma Schema Modification

**File**: `prisma/schema.prisma`

**Current ListWish model** (lines 146-157):
```prisma
model ListWish {
  listId    String
  wishId    String
  wishLevel Int      @default(1)
  addedAt   DateTime @default(now())
  wish      Wish     @relation(fields: [wishId], references: [id], onDelete: Cascade)
  list      List     @relation(fields: [listId], references: [id], onDelete: Cascade)

  @@id([listId, wishId])
  @@index([wishId])
  @@index([listId])
}
```

**Modified ListWish model** (ADD sortOrder):
```prisma
model ListWish {
  listId    String
  wishId    String
  wishLevel Int      @default(1)
  addedAt   DateTime @default(now())
  sortOrder Float?                       // ADD: Nullable for backward compatibility
  wish      Wish     @relation(fields: [wishId], references: [id], onDelete: Cascade)
  list      List     @relation(fields: [listId], references: [id], onDelete: Cascade)

  @@id([listId, wishId])
  @@index([wishId])
  @@index([listId])
  @@index([listId, sortOrder])           // ADD: Efficient custom sort queries
}
```

**Why Float instead of Int?**
- Fractional indexing requires decimal precision
- Moving between 1.0 and 2.0 → insert at 1.5
- Moving between 1.0 and 1.5 → insert at 1.25
- Allows infinite subdivision (until precision limit)

**Why nullable?**
- Backward compatibility: existing lists have `sortOrder = null`
- Null means "not using custom sort yet"
- Non-null means "custom sort is active"
- Query optimization: `WHERE sortOrder IS NOT NULL` to find custom-sorted lists

**Index strategy**:
- Composite index `[listId, sortOrder]` for efficient `ORDER BY sortOrder` queries
- Covers common query: `SELECT * FROM ListWish WHERE listId = ? ORDER BY sortOrder ASC`

---

## Backend Implementation

### 1. Fractional Indexing Utility

**Create file**: `src/lib/utils/fractional-indexing.ts`

```typescript
/**
 * Calculate new sortOrder when moving a wish between two positions
 * using fractional indexing (avoids renumbering all wishes).
 *
 * @param prevOrder - sortOrder of the wish before the target position (null if first)
 * @param nextOrder - sortOrder of the wish after the target position (null if last)
 * @returns New sortOrder for the moved wish
 *
 * Examples:
 * - Moving to first position: calculateNewSortOrder(null, 1.0) → 0.0
 * - Moving between items: calculateNewSortOrder(1.0, 2.0) → 1.5
 * - Moving to last position: calculateNewSortOrder(5.0, null) → 6.0
 */
export function calculateNewSortOrder(
  prevOrder: number | null,
  nextOrder: number | null
): number {
  // First position (before all items)
  if (prevOrder === null && nextOrder === null) {
    return 1.0; // Default first item
  }

  // Before first item
  if (prevOrder === null) {
    return nextOrder! - 1.0;
  }

  // After last item
  if (nextOrder === null) {
    return prevOrder + 1.0;
  }

  // Between two items (fractional indexing)
  return (prevOrder + nextOrder) / 2.0;
}

/**
 * Check if the gap between two sortOrder values is too small
 * and requires renumbering the entire list.
 *
 * JavaScript floating-point precision: ~15-17 significant digits
 * We use 0.000001 (1e-6) as threshold to avoid precision issues.
 *
 * @param prevOrder - Previous sortOrder
 * @param nextOrder - Next sortOrder
 * @returns True if gap is too small and renumbering is needed
 */
export function shouldRenumberList(
  prevOrder: number,
  nextOrder: number
): boolean {
  const gap = Math.abs(nextOrder - prevOrder);
  return gap < 0.000001; // 1e-6 threshold
}

/**
 * Renumber all wishes in a list with gaps of 10.0
 * This is called when fractional indexing runs out of precision.
 *
 * @param listId - List to renumber
 * @param db - Prisma client
 * @returns Number of wishes renumbered
 */
export async function renumberListWishes(
  listId: string,
  db: PrismaClient
): Promise<number> {
  // Fetch wishes in current custom sort order
  const wishes = await db.listWish.findMany({
    where: { listId, sortOrder: { not: null } },
    orderBy: { sortOrder: 'asc' },
  });

  if (wishes.length === 0) {
    return 0;
  }

  // Renumber with gaps: 0, 10, 20, 30...
  await db.$transaction(
    wishes.map((lw, index) =>
      db.listWish.update({
        where: {
          listId_wishId: {
            listId: lw.listId,
            wishId: lw.wishId,
          },
        },
        data: {
          sortOrder: index * 10.0,
        },
      })
    )
  );

  return wishes.length;
}
```

### 2. Service Layer Methods

**File**: `src/lib/services/list-service.ts`

**Add method: Update single wish sortOrder**

```typescript
import {
  calculateNewSortOrder,
  shouldRenumberList,
  renumberListWishes
} from '@/lib/utils/fractional-indexing';

/**
 * Update the sortOrder of a single wish in a list.
 * Uses fractional indexing to avoid renumbering all wishes.
 *
 * @param listId - List containing the wish
 * @param wishId - Wish to reorder
 * @param newSortOrder - New sortOrder value (calculated via fractional indexing)
 * @param userId - User performing the action
 * @param clientLastFetchedAt - Optional: when client loaded the list (for conflict detection)
 * @returns Updated ListWish
 * @throws ForbiddenError if user lacks edit permission
 * @throws NotFoundError if list or wish not found
 * @throws ConflictError if list was modified since clientLastFetchedAt
 */
async updateWishSortOrder(
  listId: string,
  wishId: string,
  newSortOrder: number,
  userId: string,
  clientLastFetchedAt?: Date
): Promise<ListWish> {
  // 1. Permission check (MANDATORY)
  await permissionService.require(userId, 'edit', {
    type: 'list',
    id: listId,
  });

  // 2. Verify list exists and check for conflicts
  const list = await db.list.findUnique({
    where: { id: listId },
    select: { id: true, updatedAt: true },
  });

  if (!list) {
    throw new NotFoundError('List not found');
  }

  // Conflict detection: list was modified since client loaded it
  if (clientLastFetchedAt && list.updatedAt > clientLastFetchedAt) {
    throw new ConflictError(
      'List was modified by another user. Please refresh and try again.'
    );
  }

  // 3. Verify wish belongs to this list
  const existingListWish = await db.listWish.findUnique({
    where: {
      listId_wishId: {
        listId,
        wishId,
      },
    },
  });

  if (!existingListWish) {
    throw new NotFoundError('Wish not found in this list');
  }

  // 4. Update sortOrder
  const updated = await db.listWish.update({
    where: {
      listId_wishId: {
        listId,
        wishId,
      },
    },
    data: {
      sortOrder: newSortOrder,
    },
    include: {
      wish: true,
    },
  });

  return updated;
}
```

**Add method: Initialize custom sort (first time)**

```typescript
/**
 * Initialize custom sort for a list by assigning sortOrder values
 * to all wishes based on their current display order.
 *
 * Called when user first activates "Custom Order" sort.
 *
 * @param listId - List to initialize
 * @param userId - User performing the action
 * @returns Number of wishes initialized
 * @throws ForbiddenError if user lacks edit permission
 */
async initializeCustomSort(
  listId: string,
  userId: string
): Promise<{ initialized: number }> {
  // 1. Permission check
  await permissionService.require(userId, 'edit', {
    type: 'list',
    id: listId,
  });

  // 2. Check if already initialized
  const hasCustomSort = await db.listWish.count({
    where: {
      listId,
      sortOrder: { not: null },
    },
  });

  if (hasCustomSort > 0) {
    return { initialized: 0 }; // Already initialized
  }

  // 3. Fetch wishes in current default order
  const wishes = await db.listWish.findMany({
    where: { listId },
    orderBy: { addedAt: 'desc' }, // Default sort
  });

  if (wishes.length === 0) {
    return { initialized: 0 };
  }

  // 4. Assign sortOrder with gaps: 0, 10, 20, 30...
  await db.$transaction(
    wishes.map((lw, index) =>
      db.listWish.update({
        where: {
          listId_wishId: {
            listId: lw.listId,
            wishId: lw.wishId,
          },
        },
        data: {
          sortOrder: index * 10.0,
        },
      })
    )
  );

  return { initialized: wishes.length };
}
```

**Modify method: getList() to support custom sorting**

**Current code** (line 349-356):
```typescript
listWishes: {
  include: {
    wish: true,
  },
  orderBy: {
    addedAt: 'desc',
  },
},
```

**Modified code**:
```typescript
listWishes: {
  include: {
    wish: true,
  },
  orderBy: [
    { sortOrder: 'asc' },   // Primary: custom order (nulls last in Postgres/SQLite)
    { addedAt: 'desc' },    // Fallback: for wishes without custom sort
  ],
},
```

**Why two orderBy clauses?**
- Wishes with `sortOrder = null` use `addedAt` order
- Wishes with `sortOrder = 1.5, 2.0, 3.5...` use custom order
- Database handles nulls automatically (nulls last in most databases)

### 3. API Route

**Create file**: `src/app/api/lists/[listId]/wishes/[wishId]/route.ts`

```typescript
import { NextRequest, NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/auth';
import { listService } from '@/lib/services/list-service';
import {
  ForbiddenError,
  NotFoundError,
  ValidationError,
  ConflictError
} from '@/lib/errors';
import { z } from 'zod';

const updateWishSchema = z.object({
  sortOrder: z.number().finite(), // Finite = no Infinity/NaN
});

/**
 * PATCH /api/lists/[listId]/wishes/[wishId]
 *
 * Update a wish's sortOrder in a list (for custom drag-and-drop sorting).
 *
 * Request body:
 * {
 *   "sortOrder": 1.5
 * }
 *
 * Headers:
 * - If-Unmodified-Since: ISO 8601 timestamp (optional, for conflict detection)
 *
 * Response:
 * - 200: { wish: ListWish }
 * - 400: Invalid sortOrder
 * - 401: Not authenticated
 * - 403: Not authorized (not owner/admin)
 * - 404: List or wish not found
 * - 409: Conflict (list modified by another user)
 */
export async function PATCH(
  req: NextRequest,
  { params }: { params: { listId: string; wishId: string } }
) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const body = await req.json();
    const { sortOrder } = updateWishSchema.parse(body);

    // Optional: conflict detection via If-Unmodified-Since header
    let clientLastFetchedAt: Date | undefined;
    const ifUnmodifiedSince = req.headers.get('If-Unmodified-Since');
    if (ifUnmodifiedSince) {
      clientLastFetchedAt = new Date(ifUnmodifiedSince);
    }

    const updated = await listService.updateWishSortOrder(
      params.listId,
      params.wishId,
      sortOrder,
      user.id,
      clientLastFetchedAt
    );

    return NextResponse.json({ wish: updated });
  } catch (error) {
    if (error instanceof ForbiddenError) {
      return NextResponse.json(
        { error: error.message },
        { status: 403 }
      );
    }
    if (error instanceof NotFoundError) {
      return NextResponse.json(
        { error: error.message },
        { status: 404 }
      );
    }
    if (error instanceof ValidationError || error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Invalid sortOrder value' },
        { status: 400 }
      );
    }
    if (error instanceof ConflictError) {
      return NextResponse.json(
        { error: error.message },
        { status: 409 }
      );
    }
    console.error('Update wish sortOrder error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
```

**Create file**: `src/app/api/lists/[listId]/wishes/initialize-custom-sort/route.ts`

```typescript
import { NextRequest, NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/auth';
import { listService } from '@/lib/services/list-service';
import { ForbiddenError } from '@/lib/errors';

/**
 * POST /api/lists/[listId]/wishes/initialize-custom-sort
 *
 * Initialize custom sort for a list (assigns sortOrder to all wishes).
 * Called when user first switches to "Custom Order" sort.
 *
 * Response:
 * - 200: { initialized: number }
 * - 401: Not authenticated
 * - 403: Not authorized
 */
export async function POST(
  req: NextRequest,
  { params }: { params: { listId: string } }
) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const result = await listService.initializeCustomSort(
      params.listId,
      user.id
    );

    return NextResponse.json(result);
  } catch (error) {
    if (error instanceof ForbiddenError) {
      return NextResponse.json(
        { error: error.message },
        { status: 403 }
      );
    }
    console.error('Initialize custom sort error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
```

### 4. API Client

**File**: `src/lib/api/lists.ts`

**Add methods**:

```typescript
/**
 * Update a wish's sortOrder in a list (drag-and-drop sorting).
 *
 * @param listId - List ID
 * @param wishId - Wish ID
 * @param sortOrder - New sortOrder value (from fractional indexing calculation)
 * @param clientLastFetchedAt - Optional: when client loaded the list (for conflict detection)
 * @returns Updated ListWish
 */
updateWishSortOrder: async (
  listId: string,
  wishId: string,
  sortOrder: number,
  clientLastFetchedAt?: Date
): Promise<ListWish> => {
  const headers: HeadersInit = {
    'Content-Type': 'application/json',
  };

  if (clientLastFetchedAt) {
    headers['If-Unmodified-Since'] = clientLastFetchedAt.toISOString();
  }

  return apiRequest(
    `PATCH`,
    `/api/lists/${listId}/wishes/${wishId}`,
    { sortOrder },
    z.object({
      wish: ListWishSchema,
    }),
    { headers }
  ).then(res => res.wish);
},

/**
 * Initialize custom sort for a list (first-time setup).
 * Assigns sortOrder values to all wishes based on current order.
 *
 * @param listId - List ID
 * @returns Number of wishes initialized
 */
initializeCustomSort: async (
  listId: string
): Promise<{ initialized: number }> => {
  return apiPost(
    `/api/lists/${listId}/wishes/initialize-custom-sort`,
    {},
    z.object({ initialized: z.number() })
  );
},
```

---

## Frontend Implementation

### 1. Hooks & Filters

**File**: `src/components/wishes/hooks/useWishFilters.ts`

**Modify SortOption type** (line 20):

```typescript
export type SortOption =
  | 'custom'          // ADD THIS FIRST
  | 'featured'
  | 'wishLevel-high'
  | 'wishLevel-low'
  | 'price-high'
  | 'price-low';
```

**Add sort case** (line 229):

```typescript
result.sort((a, b) => {
  switch (filterState.sort) {
    case 'custom': {
      // Sort by sortOrder (ascending), fallback to addedAt (descending) for nulls
      const aOrder = a.sortOrder ?? Number.MAX_SAFE_INTEGER;
      const bOrder = b.sortOrder ?? Number.MAX_SAFE_INTEGER;

      if (aOrder !== bOrder) {
        return aOrder - bOrder;
      }

      // Fallback to addedAt for wishes without sortOrder
      return new Date(b.addedAt).getTime() - new Date(a.addedAt).getTime();
    }
    case 'featured': {
      // Existing featured algorithm
      // ...
    }
    // ... rest of cases
  }
});
```

### 2. Sortable Components

**Create file**: `src/components/wishes/SortableWishGrid.tsx`

```typescript
'use client';

import { useState } from 'react';
import {
  DndContext,
  DragEndEvent,
  closestCenter,
  PointerSensor,
  KeyboardSensor,
  useSensor,
  useSensors,
  DragStartEvent,
} from '@dnd-kit/core';
import {
  SortableContext,
  rectSwappingStrategy,
  arrayMove,
} from '@dnd-kit/sortable';
import { WishGrid, type WishGridProps } from './wish-grid';
import { Wish } from '@/types/wish';
import { calculateNewSortOrder } from '@/lib/utils/fractional-indexing';

interface SortableWishGridProps extends Omit<WishGridProps, 'wishes'> {
  wishes: Wish[];
  onReorder: (wishId: string, newSortOrder: number) => Promise<void>;
  canEdit: boolean;
}

export function SortableWishGrid({
  wishes,
  onReorder,
  canEdit,
  ...gridProps
}: SortableWishGridProps) {
  const [activeId, setActiveId] = useState<string | null>(null);

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 8, // Prevent accidental drags (8px threshold)
      },
    }),
    useSensor(KeyboardSensor) // Accessibility: arrow keys for reordering
  );

  const handleDragStart = (event: DragStartEvent) => {
    setActiveId(event.active.id as string);
  };

  const handleDragEnd = async (event: DragEndEvent) => {
    const { active, over } = event;
    setActiveId(null);

    if (!over || active.id === over.id) {
      return; // No change
    }

    const oldIndex = wishes.findIndex((w) => w.id === active.id);
    const newIndex = wishes.findIndex((w) => w.id === over.id);

    if (oldIndex === -1 || newIndex === -1) {
      return;
    }

    // Calculate new sortOrder using fractional indexing
    const prevWish = newIndex > 0 ? wishes[newIndex - 1] : null;
    const nextWish = newIndex < wishes.length - 1 ? wishes[newIndex + 1] : null;

    const prevOrder = prevWish?.sortOrder ?? null;
    const nextOrder = nextWish?.sortOrder ?? null;

    const newSortOrder = calculateNewSortOrder(prevOrder, nextOrder);

    // Call parent handler (will update via API)
    await onReorder(active.id as string, newSortOrder);
  };

  if (!canEdit) {
    // Non-editable: render regular grid
    return <WishGrid wishes={wishes} {...gridProps} />;
  }

  return (
    <DndContext
      sensors={sensors}
      collisionDetection={closestCenter}
      onDragStart={handleDragStart}
      onDragEnd={handleDragEnd}
    >
      <SortableContext
        items={wishes.map((w) => w.id)}
        strategy={rectSwappingStrategy}
      >
        <WishGrid
          wishes={wishes}
          sortable={true}
          activeId={activeId}
          {...gridProps}
        />
      </SortableContext>
    </DndContext>
  );
}
```

**Create file**: `src/components/wishes/SortableWishList.tsx`

Similar to `SortableWishGrid.tsx`, but use `verticalListSortingStrategy` instead of `rectSwappingStrategy`.

**Create file**: `src/components/wishes/SortableWishCard.tsx`

```typescript
'use client';

import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { WishCard, type WishCardProps } from './wish-card';
import { GripVertical } from 'lucide-react';

interface SortableWishCardProps extends WishCardProps {
  sortable?: boolean;
}

export function SortableWishCard({
  wish,
  sortable = false,
  ...cardProps
}: SortableWishCardProps) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({
    id: wish.id,
    disabled: !sortable,
  });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  };

  return (
    <div ref={setNodeRef} style={style} className="relative">
      {/* Drag handle (only visible when sortable) */}
      {sortable && (
        <div
          className="absolute left-2 top-2 z-10
                     cursor-grab active:cursor-grabbing
                     min-w-[44px] min-h-[44px]
                     md:min-w-0 md:min-h-0
                     flex items-center justify-center
                     rounded bg-background/80 backdrop-blur-sm
                     border border-border
                     hover:bg-accent hover:text-accent-foreground
                     transition-colors"
          {...attributes}
          {...listeners}
          aria-label="Drag to reorder wish"
        >
          <GripVertical className="h-5 w-5 md:h-4 md:w-4 text-muted-foreground" />
        </div>
      )}

      {/* Actual wish card */}
      <WishCard wish={wish} {...cardProps} />
    </div>
  );
}
```

### 3. UI Integration

**File**: `src/components/wishes/wishes-display.tsx`

**Modify to conditionally use sortable components**:

```typescript
import { SortableWishGrid } from './SortableWishGrid';
import { SortableWishList } from './SortableWishList';

interface WishesDisplayProps {
  wishes: Wish[];
  viewMode: WishViewMode;
  sortMode: SortOption;
  canEdit: boolean;
  onReorder?: (wishId: string, newSortOrder: number) => Promise<void>;
  // ... other props
}

export function WishesDisplay({
  wishes,
  viewMode,
  sortMode,
  canEdit,
  onReorder,
  ...props
}: WishesDisplayProps) {
  const useSortable = canEdit && sortMode === 'custom' && onReorder;

  if (viewMode === 'grid') {
    return useSortable ? (
      <SortableWishGrid
        wishes={wishes}
        onReorder={onReorder!}
        canEdit={canEdit}
        {...props}
      />
    ) : (
      <WishGrid wishes={wishes} {...props} />
    );
  }

  return useSortable ? (
    <SortableWishList
      wishes={wishes}
      onReorder={onReorder!}
      canEdit={canEdit}
      {...props}
    />
  ) : (
    <WishList wishes={wishes} {...props} />
  );
}
```

**File**: `src/components/lists/list-detail-view.tsx`

**Add reorder handler**:

```typescript
import { useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { listsApi } from '@/lib/api/lists';
import { toast } from '@/components/ui/use-toast';
import { calculateNewSortOrder, shouldRenumberList } from '@/lib/utils/fractional-indexing';

export function ListDetailView({ list, canEdit, ... }) {
  const queryClient = useQueryClient();
  const [listLastFetchedAt] = useState(new Date()); // Track when list was loaded

  const handleReorder = async (wishId: string, newSortOrder: number) => {
    // 1. Optimistic update (immediate UI feedback)
    const previousData = queryClient.getQueryData(['lists', list.id]);

    queryClient.setQueryData(['lists', list.id], (oldData: any) => {
      if (!oldData) return oldData;

      return {
        ...oldData,
        listWishes: oldData.listWishes.map((lw: any) =>
          lw.wishId === wishId
            ? { ...lw, wish: { ...lw.wish, sortOrder: newSortOrder } }
            : lw
        ),
      };
    });

    // 2. Auto-switch to "Custom" sort if not already active
    if (filterState.sort !== 'custom') {
      setFilterState((prev) => ({ ...prev, sort: 'custom' }));
    }

    // 3. Call API
    try {
      await listsApi.updateWishSortOrder(
        list.id,
        wishId,
        newSortOrder,
        listLastFetchedAt
      );

      toast({
        title: 'Order updated',
        description: 'Your custom list order has been saved.',
      });
    } catch (error) {
      // 4. Rollback on error
      queryClient.setQueryData(['lists', list.id], previousData);

      if (error.status === 409) {
        // Conflict: list was modified by another user
        toast({
          title: 'Conflict detected',
          description: 'Another user modified this list. Refreshing...',
          variant: 'destructive',
        });
        // Refetch list to get latest data
        queryClient.invalidateQueries(['lists', list.id]);
      } else {
        toast({
          title: 'Failed to update order',
          description: 'Please try again.',
          variant: 'destructive',
        });
      }
    }
  };

  return (
    <div>
      {/* ... other UI */}

      <WishesDisplay
        wishes={wishes}
        viewMode={viewMode}
        sortMode={filterState.sort}
        canEdit={canEdit}
        onReorder={handleReorder}
        // ... other props
      />
    </div>
  );
}
```

**File**: `src/components/wishes/filters/WishFilterPanel.tsx`

**Add "Custom Order" option**:

```typescript
const sortOptions = [
  // Only show "Custom Order" if list has custom sort enabled
  ...(hasCustomSort ? [{ value: 'custom', label: 'Custom Order' }] : []),
  { value: 'featured', label: 'Featured' },
  { value: 'wishLevel-high', label: 'Priority (High to Low)' },
  { value: 'wishLevel-low', label: 'Priority (Low to High)' },
  { value: 'price-high', label: 'Price (High to Low)' },
  { value: 'price-low', label: 'Price (Low to High)' },
];

// Detect if list has custom sort
const hasCustomSort = wishes.some((w) => w.sortOrder !== null);

// If user selects "Custom" for first time, initialize custom sort
const handleSortChange = async (newSort: SortOption) => {
  if (newSort === 'custom' && !hasCustomSort && canEdit) {
    // Initialize custom sort
    try {
      await listsApi.initializeCustomSort(listId);
      // Refetch list to get sortOrder values
      queryClient.invalidateQueries(['lists', listId]);
    } catch (error) {
      toast({
        title: 'Failed to enable custom sort',
        description: 'Please try again.',
        variant: 'destructive',
      });
      return;
    }
  }

  setFilterState((prev) => ({ ...prev, sort: newSort }));
};
```

---

## Edge Cases & Special Scenarios

### 1. Precision Limit (Fractional Indexing)

**Problem**: After many subdivisions, floats lose precision.

**Example**:
```
Start: 1.0, 2.0
Move between: 1.5
Move between 1.0 and 1.5: 1.25
Move between 1.0 and 1.25: 1.125
... (after ~50 subdivisions)
Move between 1.000000000000001 and 1.000000000000002: ???
```

**Solution**: Detect when gap is too small, renumber entire list.

```typescript
const prevOrder = prevWish?.sortOrder ?? null;
const nextOrder = nextWish?.sortOrder ?? null;

// Check if renumbering is needed
if (prevOrder !== null && nextOrder !== null) {
  if (shouldRenumberList(prevOrder, nextOrder)) {
    // Gap too small, renumber entire list
    await renumberListWishes(listId, db);

    // Refetch wishes with new sortOrder values
    const updatedWishes = await db.listWish.findMany({
      where: { listId },
      orderBy: { sortOrder: 'asc' },
    });

    // Recalculate newSortOrder with renumbered values
    const newPrevOrder = updatedWishes[newIndex - 1]?.sortOrder ?? null;
    const newNextOrder = updatedWishes[newIndex + 1]?.sortOrder ?? null;
    newSortOrder = calculateNewSortOrder(newPrevOrder, newNextOrder);
  }
}
```

**Frequency**: Rare (requires ~1000 moves in same area). Renumbering is acceptable.

### 2. New Wish Insertion

**Problem**: Where to place a newly added wish?

**Solution**: Add to end with `MAX(sortOrder) + 1.0`

```typescript
// In addWishToList()
async addWishToList(listId: string, wishId: string, userId: string) {
  // ... permission checks ...

  // Calculate sortOrder for new wish
  const maxSortOrder = await db.listWish.aggregate({
    where: { listId, sortOrder: { not: null } },
    _max: { sortOrder: true },
  });

  const newSortOrder = maxSortOrder._max.sortOrder !== null
    ? maxSortOrder._max.sortOrder + 1.0
    : null; // No custom sort yet, leave as null

  await db.listWish.create({
    data: {
      listId,
      wishId,
      sortOrder: newSortOrder,
      // ... other fields
    },
  });
}
```

**Edge case**: What if custom sort doesn't exist yet?
- Leave `sortOrder = null`
- Wish uses default sort (addedAt DESC)
- When user enables custom sort, all wishes get sortOrder values

### 3. Concurrent Editing by Multiple Admins

**Scenario**:
1. Admin A loads list at 10:00:00 (list.updatedAt = 10:00:00)
2. Admin B loads list at 10:00:05 (list.updatedAt = 10:00:00)
3. Admin A drags wish X at 10:00:10 (list.updatedAt = 10:00:10)
4. Admin B drags wish Y at 10:00:15 (client thinks list.updatedAt = 10:00:00)

**Conflict detection**:
```typescript
// Admin B's request includes header:
// If-Unmodified-Since: 2024-01-15T10:00:00Z

// Server checks:
const list = await db.list.findUnique({ where: { id } });
// list.updatedAt = 2024-01-15T10:00:10Z (Admin A's update)

if (clientLastFetchedAt < list.updatedAt) {
  // Conflict detected!
  return 409 Conflict response
}
```

**Client handling**:
```typescript
try {
  await listsApi.updateWishSortOrder(listId, wishId, newSortOrder, clientLastFetchedAt);
} catch (error) {
  if (error.status === 409) {
    // Show toast: "Another user modified this list"
    // Refetch list with latest data
    queryClient.invalidateQueries(['lists', listId]);
  }
}
```

**Why this is acceptable**:
- Fractional indexing only updates 1 wish (small conflict surface)
- If Admin A moved wish X and Admin B moved wish Y, both moves can succeed (different wishes)
- Only conflicts if both admins move the same wish simultaneously (rare)

### 4. Sort Mode Persistence

**Scenario**: User sets custom order, switches to "Priority" sort, then back to "Custom".

**Expected behavior**: Custom order is preserved.

**Implementation**:
- `sortOrder` values stay in database when switching sorts
- `sortOrder !== null` indicates "custom sort exists"
- Show "Custom Order" option in dropdown only if `wishes.some(w => w.sortOrder !== null)`
- Switching to "Custom" just changes the `orderBy` clause, doesn't modify data

**Code**:
```typescript
// Client-side sorting logic
case 'custom':
  return (a.sortOrder ?? 999) - (b.sortOrder ?? 999);

case 'wishLevel-high':
  return (b.wishLevel ?? 1) - (a.wishLevel ?? 1);

// sortOrder values are ignored when other sorts are active
// But they're still in the database, so switching back to "Custom" restores order
```

### 5. Deleting a Wish

**Problem**: Does deleting a wish affect other sortOrder values?

**Solution**: No. Fractional indexing has gaps, deleting one item doesn't affect others.

**Example**:
```
Before delete: [A=1.0, B=2.0, C=3.0, D=4.0]
Delete B
After delete: [A=1.0, C=3.0, D=4.0]  ← No renumbering needed!
```

**Code**: No special handling needed, just `CASCADE DELETE` in Prisma schema.

### 6. First-Time Custom Sort Activation

**UX Flow**:
1. User opens list (all wishes have `sortOrder = null`)
2. User selects "Custom Order" from dropdown
3. System checks: `hasCustomSort = wishes.some(w => w.sortOrder !== null)`
4. If `false`, call `POST /api/lists/[listId]/wishes/initialize-custom-sort`
5. Backend assigns `sortOrder = 0, 10, 20, 30...` based on current order
6. Refetch list to get updated sortOrder values
7. User can now drag to reorder

**Implementation** (see WishFilterPanel section above).

---

## Testing Strategy

### Unit Tests

**File**: `tests/unit/lib/utils/fractional-indexing.test.ts`

```typescript
import {
  calculateNewSortOrder,
  shouldRenumberList
} from '@/lib/utils/fractional-indexing';

describe('calculateNewSortOrder', () => {
  it('returns 1.0 for first item in empty list', () => {
    expect(calculateNewSortOrder(null, null)).toBe(1.0);
  });

  it('returns prevOrder - 1.0 when inserting before first item', () => {
    expect(calculateNewSortOrder(null, 5.0)).toBe(4.0);
  });

  it('returns prevOrder + 1.0 when appending after last item', () => {
    expect(calculateNewSortOrder(10.0, null)).toBe(11.0);
  });

  it('returns midpoint when inserting between two items', () => {
    expect(calculateNewSortOrder(1.0, 2.0)).toBe(1.5);
    expect(calculateNewSortOrder(1.0, 1.5)).toBe(1.25);
    expect(calculateNewSortOrder(1.0, 1.25)).toBe(1.125);
  });
});

describe('shouldRenumberList', () => {
  it('returns false for normal gaps', () => {
    expect(shouldRenumberList(1.0, 2.0)).toBe(false);
    expect(shouldRenumberList(1.0, 1.5)).toBe(false);
    expect(shouldRenumberList(1.0, 1.001)).toBe(false);
  });

  it('returns true when gap is too small', () => {
    expect(shouldRenumberList(1.0, 1.0000001)).toBe(true);
    expect(shouldRenumberList(1.0, 1.0000009)).toBe(true);
  });
});
```

**File**: `tests/unit/lib/services/list-service.test.ts`

```typescript
import { listService } from '@/lib/services/list-service';
import { permissionService } from '@/lib/services/permission-service';
import { ForbiddenError, ConflictError } from '@/lib/errors';

jest.mock('@/lib/db');
jest.mock('@/lib/services/permission-service');

describe('listService.updateWishSortOrder', () => {
  it('updates sortOrder for list owner', async () => {
    // Mock permission check to pass
    (permissionService.require as jest.Mock).mockResolvedValue(undefined);

    // Mock database calls
    const mockList = { id: 'list1', updatedAt: new Date('2024-01-15T10:00:00Z') };
    const mockListWish = { listId: 'list1', wishId: 'wish1', sortOrder: 1.0 };

    (db.list.findUnique as jest.Mock).mockResolvedValue(mockList);
    (db.listWish.findUnique as jest.Mock).mockResolvedValue(mockListWish);
    (db.listWish.update as jest.Mock).mockResolvedValue({
      ...mockListWish,
      sortOrder: 2.5,
    });

    const result = await listService.updateWishSortOrder(
      'list1',
      'wish1',
      2.5,
      'user1'
    );

    expect(result.sortOrder).toBe(2.5);
    expect(permissionService.require).toHaveBeenCalledWith('user1', 'edit', {
      type: 'list',
      id: 'list1',
    });
  });

  it('throws ForbiddenError for non-owner', async () => {
    (permissionService.require as jest.Mock).mockRejectedValue(
      new ForbiddenError('Not authorized')
    );

    await expect(
      listService.updateWishSortOrder('list1', 'wish1', 2.5, 'user2')
    ).rejects.toThrow(ForbiddenError);
  });

  it('throws ConflictError when list was modified', async () => {
    (permissionService.require as jest.Mock).mockResolvedValue(undefined);

    const mockList = { id: 'list1', updatedAt: new Date('2024-01-15T10:05:00Z') };
    (db.list.findUnique as jest.Mock).mockResolvedValue(mockList);

    const clientTime = new Date('2024-01-15T10:00:00Z');

    await expect(
      listService.updateWishSortOrder('list1', 'wish1', 2.5, 'user1', clientTime)
    ).rejects.toThrow(ConflictError);
  });
});
```

### Integration Tests

**File**: `tests/integration/api/lists/reorder.test.ts`

```typescript
import { testRequest } from '@/tests/helpers';
import { db } from '@/lib/db';
import { createTestUser, createTestList, createTestWish } from '@/tests/fixtures';

describe('PATCH /api/lists/[listId]/wishes/[wishId]', () => {
  let user: any;
  let list: any;
  let wish: any;

  beforeEach(async () => {
    user = await createTestUser();
    list = await createTestList({ ownerId: user.id });
    wish = await createTestWish({ ownerId: user.id });

    // Add wish to list
    await db.listWish.create({
      data: {
        listId: list.id,
        wishId: wish.id,
        sortOrder: 1.0,
      },
    });
  });

  afterEach(async () => {
    await db.listWish.deleteMany();
    await db.wish.deleteMany();
    await db.list.deleteMany();
    await db.user.deleteMany();
  });

  it('updates sortOrder successfully', async () => {
    const response = await testRequest
      .patch(`/api/lists/${list.id}/wishes/${wish.id}`)
      .auth(user.id)
      .send({ sortOrder: 2.5 });

    expect(response.status).toBe(200);
    expect(response.body.wish.sortOrder).toBe(2.5);

    // Verify in database
    const dbListWish = await db.listWish.findUnique({
      where: {
        listId_wishId: {
          listId: list.id,
          wishId: wish.id,
        },
      },
    });
    expect(dbListWish.sortOrder).toBe(2.5);
  });

  it('returns 401 for unauthenticated user', async () => {
    const response = await testRequest
      .patch(`/api/lists/${list.id}/wishes/${wish.id}`)
      .send({ sortOrder: 2.5 });

    expect(response.status).toBe(401);
  });

  it('returns 403 for non-owner/non-admin', async () => {
    const otherUser = await createTestUser({ email: 'other@example.com' });

    const response = await testRequest
      .patch(`/api/lists/${list.id}/wishes/${wish.id}`)
      .auth(otherUser.id)
      .send({ sortOrder: 2.5 });

    expect(response.status).toBe(403);
  });

  it('returns 409 for stale client data', async () => {
    // Simulate list being modified after client loaded it
    await db.list.update({
      where: { id: list.id },
      data: { updatedAt: new Date() },
    });

    const staleTime = new Date(Date.now() - 60000); // 1 minute ago

    const response = await testRequest
      .patch(`/api/lists/${list.id}/wishes/${wish.id}`)
      .auth(user.id)
      .set('If-Unmodified-Since', staleTime.toISOString())
      .send({ sortOrder: 2.5 });

    expect(response.status).toBe(409);
    expect(response.body.error).toContain('modified by another user');
  });
});
```

### E2E Tests

**File**: `tests/e2e/list-custom-sort.spec.ts`

```typescript
import { test, expect } from '@playwright/test';
import { loginAsUser, createTestList, addWishesToList } from './helpers';

test.describe('Custom List Sort', () => {
  test('owner can drag wishes to reorder', async ({ page }) => {
    // Setup: Create list with 3 wishes
    const user = await createTestUser({ email: 'owner@example.com' });
    const list = await createTestList({ ownerId: user.id });
    const wishes = await addWishesToList(list.id, 3);

    // Login and navigate to list
    await loginAsUser(page, user.email);
    await page.goto(`/lists/${list.id}`);

    // Switch to "Custom Order" sort
    await page.selectOption('[data-testid="sort-dropdown"]', 'custom');

    // Wait for initialization
    await page.waitForResponse((res) =>
      res.url().includes('initialize-custom-sort') && res.status() === 200
    );

    // Drag first wish to third position
    const firstWish = page.locator(`[data-testid="wish-card-${wishes[0].id}"]`);
    const thirdWish = page.locator(`[data-testid="wish-card-${wishes[2].id}"]`);

    await firstWish.hover();
    await page.mouse.down();
    await thirdWish.hover();
    await page.mouse.up();

    // Wait for API call
    await page.waitForResponse((res) =>
      res.url().includes(`/wishes/${wishes[0].id}`) && res.status() === 200
    );

    // Verify order changed in UI
    const wishCards = page.locator('[data-testid^="wish-card-"]');
    await expect(wishCards.nth(0)).toHaveAttribute('data-testid', `wish-card-${wishes[1].id}`);
    await expect(wishCards.nth(1)).toHaveAttribute('data-testid', `wish-card-${wishes[2].id}`);
    await expect(wishCards.nth(2)).toHaveAttribute('data-testid', `wish-card-${wishes[0].id}`);

    // Reload page and verify order persists
    await page.reload();
    await page.selectOption('[data-testid="sort-dropdown"]', 'custom');

    await expect(wishCards.nth(0)).toHaveAttribute('data-testid', `wish-card-${wishes[1].id}`);
    await expect(wishCards.nth(2)).toHaveAttribute('data-testid', `wish-card-${wishes[0].id}`);
  });

  test('non-owner cannot see drag handles', async ({ page }) => {
    // Setup: Create list and share with viewer
    const owner = await createTestUser({ email: 'owner@example.com' });
    const viewer = await createTestUser({ email: 'viewer@example.com' });
    const list = await createTestList({ ownerId: owner.id, visibility: 'public' });
    await addWishesToList(list.id, 3);

    // Login as viewer
    await loginAsUser(page, viewer.email);
    await page.goto(`/lists/${list.id}`);

    // Try to select "Custom Order" (should not be available)
    const sortDropdown = page.locator('[data-testid="sort-dropdown"]');
    const customOption = sortDropdown.locator('option[value="custom"]');
    await expect(customOption).not.toBeVisible();

    // Verify no drag handles
    const dragHandles = page.locator('[aria-label="Drag to reorder wish"]');
    await expect(dragHandles).toHaveCount(0);
  });

  test('mobile drag works on 375px viewport', async ({ page }) => {
    // Set mobile viewport (iPhone SE)
    await page.setViewportSize({ width: 375, height: 667 });

    // Setup
    const user = await createTestUser({ email: 'mobile@example.com' });
    const list = await createTestList({ ownerId: user.id });
    const wishes = await addWishesToList(list.id, 3);

    await loginAsUser(page, user.email);
    await page.goto(`/lists/${list.id}`);
    await page.selectOption('[data-testid="sort-dropdown"]', 'custom');
    await page.waitForResponse((res) => res.url().includes('initialize-custom-sort'));

    // Touch drag (simulate touch events)
    const firstWish = page.locator(`[data-testid="wish-card-${wishes[0].id}"]`);
    const dragHandle = firstWish.locator('[aria-label="Drag to reorder wish"]');

    // Verify drag handle is touch-friendly (44x44px minimum)
    const handleBox = await dragHandle.boundingBox();
    expect(handleBox.width).toBeGreaterThanOrEqual(44);
    expect(handleBox.height).toBeGreaterThanOrEqual(44);

    // Perform touch drag
    await dragHandle.dispatchEvent('touchstart', { touches: [{ clientX: 100, clientY: 100 }] });
    await dragHandle.dispatchEvent('touchmove', { touches: [{ clientX: 100, clientY: 300 }] });
    await dragHandle.dispatchEvent('touchend');

    // Wait for API call
    await page.waitForResponse((res) => res.url().includes('/wishes/'));

    // Verify toast notification
    await expect(page.locator('text=Order updated')).toBeVisible();
  });

  test('concurrent editing shows conflict warning', async ({ page, context }) => {
    // Setup
    const user = await createTestUser({ email: 'admin@example.com' });
    const list = await createTestList({ ownerId: user.id });
    const wishes = await addWishesToList(list.id, 3);

    // Open list in two tabs (simulate two admins)
    const page1 = page;
    const page2 = await context.newPage();

    await loginAsUser(page1, user.email);
    await loginAsUser(page2, user.email);

    await page1.goto(`/lists/${list.id}`);
    await page2.goto(`/lists/${list.id}`);

    await page1.selectOption('[data-testid="sort-dropdown"]', 'custom');
    await page2.selectOption('[data-testid="sort-dropdown"]', 'custom');

    // Page 1: Drag wish
    const wish1Page1 = page1.locator(`[data-testid="wish-card-${wishes[0].id}"]`);
    await wish1Page1.hover();
    await page1.mouse.down();
    await page1.locator(`[data-testid="wish-card-${wishes[2].id}"]`).hover();
    await page1.mouse.up();

    await page1.waitForResponse((res) => res.url().includes('/wishes/'));

    // Page 2: Try to drag (should get conflict)
    const wish2Page2 = page2.locator(`[data-testid="wish-card-${wishes[1].id}"]`);
    await wish2Page2.hover();
    await page2.mouse.down();
    await page2.locator(`[data-testid="wish-card-${wishes[2].id}"]`).hover();
    await page2.mouse.up();

    // Verify conflict toast
    await expect(page2.locator('text=Conflict detected')).toBeVisible();
    await expect(page2.locator('text=Another user modified this list')).toBeVisible();
  });
});
```

---

## Security Considerations

### 1. Permission Checks (MANDATORY)

All sortOrder updates MUST go through `permissionService.require()`:

```typescript
await permissionService.require(userId, 'edit', {
  type: 'list',
  id: listId,
});
```

**Who can reorder**:
- List owner
- Co-managers (ListAdmin)

**Who CANNOT reorder**:
- Group members (view-only)
- Public viewers
- Password-protected viewers

### 2. Input Validation

Validate `sortOrder` to prevent invalid values:

```typescript
const updateWishSchema = z.object({
  sortOrder: z.number().finite(), // Reject Infinity, -Infinity, NaN
});
```

**Malicious inputs to reject**:
- `Infinity` / `-Infinity`
- `NaN`
- Non-numeric values
- Negative numbers (optional, depends on requirements)

### 3. Rate Limiting

Inherit global rate limiting from middleware:
- 100 requests per minute per user
- Prevents spam dragging attacks

### 4. SQL Injection Prevention

Prisma automatically parameterizes queries, no manual escaping needed.

### 5. Authorization Bypass Prevention

**DO NOT** allow client to specify `listId` in request body:

```typescript
// BAD: Client could specify any listId
PATCH /api/lists/wishes/[wishId]
{ listId: 'hacked-list-id', sortOrder: 1.5 }

// GOOD: listId comes from URL (validated by server)
PATCH /api/lists/[listId]/wishes/[wishId]
{ sortOrder: 1.5 }
```

---

## Performance Considerations

### 1. Database Query Optimization

**Index usage**:
```sql
-- Query: Get wishes in custom sort order
SELECT * FROM ListWish
WHERE listId = 'list123'
ORDER BY sortOrder ASC;

-- Index: [listId, sortOrder]
-- Query plan: Index seek (fast)
```

**Without index**: Table scan + sort (slow)
**With index**: Index seek (fast)

### 2. Update Performance

**Sequential integers (BAD)**:
- Move 1 wish → Update 50 wishes
- 50 database UPDATEs
- Transaction time: ~500ms

**Fractional indexing (GOOD)**:
- Move 1 wish → Update 1 wish
- 1 database UPDATE
- Transaction time: ~10ms

**50x performance improvement**

### 3. Client-Side Sorting

Sorting happens in-memory (JavaScript):
```typescript
wishes.sort((a, b) => (a.sortOrder ?? 999) - (b.sortOrder ?? 999));
```

**Performance**: O(n log n) where n = number of wishes
- 10 wishes: ~33 operations
- 100 wishes: ~664 operations
- 1000 wishes: ~9965 operations

**Acceptable for up to 1000 wishes per list**

### 4. Optimistic UI Updates

**No loading spinners** - instant feedback:
1. User drags wish
2. UI updates immediately (optimistic)
3. API call happens in background
4. If error, rollback and show toast

**Perceived latency**: 0ms (user sees change instantly)

---

## Rollout Plan

### Phase 1: Database Migration (Non-Breaking)

```bash
# 1. Update schema
# Edit prisma/schema.prisma

# 2. Generate client
pnpm prisma generate

# 3. Push to database
pnpm db:push

# 4. Verify
pnpm prisma studio
# Check that ListWish has sortOrder field
```

**Backward compatible**: Existing lists have `sortOrder = null`

### Phase 2: Backend Deployment

1. Deploy service layer methods
2. Deploy API routes
3. Test with Postman/curl
4. Verify permission checks work

### Phase 3: Frontend Deployment

1. Deploy sortable components
2. Deploy UI integration
3. Test in staging environment
4. Fix any bugs

### Phase 4: Testing

1. Run unit tests: `pnpm test`
2. Run integration tests: `pnpm test:integration`
3. Run E2E tests: `pnpm test:e2e`
4. Manual testing on real devices

### Phase 5: Production Rollout

1. Deploy to production
2. Monitor error rates (Sentry)
3. Monitor performance (response times)
4. Watch for conflicts (409 responses)
5. Gather user feedback

### Phase 6: Optional Feature Flag

Add environment variable to enable/disable:

```env
ENABLE_CUSTOM_SORT=true
```

**Use case**: If critical bug found, disable feature without rollback.

---

## Monitoring & Metrics

### Key Metrics to Track

1. **API Performance**
   - `PATCH /api/lists/[listId]/wishes/[wishId]` response time
   - Target: p95 < 100ms

2. **Error Rates**
   - 403 Forbidden (permission issues)
   - 409 Conflict (concurrent editing)
   - 500 Internal Error

3. **Usage Statistics**
   - % of lists using custom sort
   - Average drags per user per session
   - Renumbering frequency (precision limit hits)

4. **User Behavior**
   - Time to first drag
   - Completion rate (users who save custom order)
   - Abandonment rate (users who start dragging but cancel)

### Sentry Alerts

```typescript
// Track renumbering events (should be rare)
if (shouldRenumberList(prevOrder, nextOrder)) {
  Sentry.captureMessage('List renumbered due to precision limit', {
    level: 'info',
    tags: { listId },
  });
}

// Track conflicts
catch (error) {
  if (error instanceof ConflictError) {
    Sentry.captureException(error, {
      level: 'warning',
      tags: { listId, userId },
    });
  }
}
```

---

## Known Limitations

1. **Floating-point precision**: After ~1000 subdivisions in same area, renumbering required
2. **Concurrent editing**: Last-write-wins within same wish (acceptable trade-off)
3. **Mobile performance**: Drag-and-drop on very slow devices (<2015) may lag
4. **Screen reader support**: May require additional ARIA live region announcements

---

## Future Enhancements

1. **Batch reordering**: Allow sorting multiple wishes at once
2. **Undo/redo**: Add undo stack for accidental drags
3. **Keyboard shortcuts**: `Ctrl+Up` / `Ctrl+Down` to reorder without mouse
4. **Sort templates**: Save custom orders as templates for other lists
5. **Collaborative sorting**: Real-time updates when multiple admins sort simultaneously

---

## References

- **Fractional Indexing**: https://www.figma.com/blog/realtime-editing-of-ordered-sequences/
- **@dnd-kit Documentation**: https://docs.dndkit.com/
- **Prisma Float Type**: https://www.prisma.io/docs/reference/api-reference/prisma-schema-reference#float
- **HTTP 409 Conflict**: https://developer.mozilla.org/en-US/docs/Web/HTTP/Status/409

---

## Changelog

- **2025-11-23**: Initial plan created with fractional indexing approach
- **2025-11-23**: Added conflict detection and precision limit handling
- **2025-11-23**: Added comprehensive testing strategy and E2E tests

---

**Status**: Ready for implementation
**Estimated Effort**: 2-3 days (1 developer)
**Risk Level**: Low (proven pattern, clear requirements, good test coverage)
