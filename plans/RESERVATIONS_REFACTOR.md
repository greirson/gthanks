# Reservation Page Refactoring - Complete Implementation Plan

**Date Created:** 2025-11-22
**Date Analyzed:** 2025-11-22
**Status:** Analysis Complete - Critical Updates Applied
**Estimated Scope:** 12 new files, 7 updated files, 1 moved file, 1 deleted file
**Estimated Effort:** 30-40 hours (reflects complexity: error handling, accessibility, performance testing)

---

## IMPLEMENTATION PROGRESS

### PHASE 0: Pre-Migration (CRITICAL)
- [ ] 0.1 Check for duplicate reservations (SQL query)
- [ ] 0.2 Create cleanup script for duplicates (if found)
- [ ] 0.3 Run cleanup script (dry-run then live)
- [ ] 0.4 Create reservation-service.ts (BLOCKER FIX)
- [ ] 0.5 Verify no duplicates remain

### PHASE 1: Core Infrastructure
- [ ] 1.1 Database schema migration (purchasedAt, purchasedDate, unique constraint)
- [ ] 1.2 Update type definitions (ReservationWithWishSchema + bulk schemas)
- [ ] 1.3 Create mark as purchased API endpoint
- [ ] 1.4 Create bulk operations API endpoint
- [ ] 1.5 Update API client (3 new methods)

### PHASE 2: Filter System
- [ ] 2.1 Update useReservationFilters hook (purchaseStatus, expanded search, localStorage only)
- [ ] 2.2 Create desktop filter panel component
- [ ] 2.3 Create mobile filter sheet component

### PHASE 3: Display Components
- [ ] 3.1 Update reservation card (grid/list variants, breadcrumbs, conditional checkbox)
- [ ] 3.2 Create reservations display component (grouping, virtual scrolling)
- [ ] 3.3 Create empty state component
- [ ] 3.4 Create loading skeleton component

### PHASE 4: Bulk Actions
- [ ] 4.1 Create bulk actions bar component
- [ ] 4.2 Create bulk action dialogs (cancel + mark purchased)

### PHASE 5: Main View Component
- [ ] 5.1 Create reservations view component (main orchestration)
- [ ] 5.2 Move page to (auth) route group
- [ ] 5.3 Delete old page component

### PHASE 6: Dialogs & Confirmations
- [ ] 6.1 Create action dialog (RemoveOptionsDialog pattern)
- [ ] 6.2 Create purchase date picker dialog

### PHASE 7: Performance Optimizations
- [ ] 7.1 Install and configure @tanstack/react-virtual
- [ ] 7.2 Verify filter persistence configuration (localStorage, error handling)
- [ ] 7.3 Test virtual scrolling with 50+ items

### PHASE 8: Testing & Polish
- [ ] 8.1 Write E2E tests (grouping, filtering, bulk actions, virtual scrolling)
- [ ] 8.2 Write unit tests (service layer, filters, localStorage handling)
- [ ] 8.3 Write integration tests (cleanup script, API endpoints)
- [ ] 8.4 Mobile testing checklist (375px, 768px, 1024px)
- [ ] 8.5 Accessibility audit (Grandma test, WCAG compliance)

---

## 🔴 CRITICAL UPDATES FROM PARALLEL ANALYSIS

### Design Decisions Confirmed

✅ **Service Layer**: Create `reservation-service.ts` with `bulkCancel()` and `bulkMarkPurchased()` methods
✅ **Dialog Pattern**: Use RemoveOptionsDialog pattern (3 full-width option buttons with descriptions)
✅ **Purchased Items**: Checkboxes **hidden** when item already purchased (better accessibility than disabled state)
✅ **Virtual Scrolling**: Activate at **50+ filtered items** (not 100+)
✅ **Purchase Date**: Optional picker, pre-filled with today, checkbox "Use today's date" (checked)
✅ **Breadcrumbs**: `Owner → List` format with **Lucide ArrowRight icon** (not slash or unicode)
✅ **Database**: Add `@@unique([wishId, userId])` constraint (requires duplicate check first)
✅ **Filter Persistence**: **localStorage only** (no URL params, no search persistence)

### Critical Issues Found

**🚨 BLOCKER - Service Layer Missing**:
- File `src/lib/services/reservation-service.ts` is imported but **DOES NOT EXIST**
- Referenced in `src/app/api/reservations/route.ts` line 94
- **Must create before PHASE 1 API endpoints**

**⚠️ Database Pre-Migration Required**:
- Must check for duplicate `[wishId, userId]` reservations before adding unique constraint
- Need cleanup query for any duplicates found
- **Added new PHASE 0 for this critical step**

**⚠️ Type Schema Incomplete**:
- `ReservationWithWishSchema` missing `purchasedAt`, `purchasedDate` fields
- Missing `list.name` in wish object (needed for search)
- Missing 3 bulk operation schemas

**⚠️ Search Functionality Gap**:
- Current search only covers `title`, `owner.name`, `owner.email`
- Must add `wish.list.name` and `wish.url` to search scope
- **Updated PHASE 2.1 with search expansion requirements**

**⚠️ Filter Persistence Configuration**:
- Remove URL serialization (localStorage only per decision)
- Do NOT persist search queries (only filter selections)
- **Updated PHASE 2.1 and 7.2 accordingly**

### Updated File Count

| Category | Original | Updated | Notes |
|----------|----------|---------|-------|
| **New Files** | 11 | 12 | Added `reservation-service.ts` |
| **Updated Files** | 6 | 7 | Added `ReservationWithWishSchema` updates |
| **Moved Files** | 1 | 1 | No change |
| **Deleted Files** | 1 | 1 | No change |

### New Implementation Phase

**PHASE 0 (NEW)**: Pre-Migration Database Checks
- Check for duplicate reservations
- Clean up duplicates (keep most recent)
- Verify data integrity before adding unique constraint

---

## Executive Summary

This plan transforms the reservation page from a simple server component into a fully-featured, mobile-first experience matching the design patterns of wishes, lists, and groups pages.

### Key Design Decisions

1. **Always grouped display** with Owner → List breadcrumbs in each card
2. **Grid view** with prominent images, list view compact with checkboxes
3. **"Mark as Purchased"** feature moves items to bottom of group, with hide filter
4. **All Phase 1 features** are must-have (comprehensive implementation)
5. **Database**: Add `purchasedAt` date field, delete cancelled reservations entirely
6. **Empty state**: Educational message about reservations + how they work
7. **Virtual scrolling** for performance with 100+ items
8. **Grandma test** applies to all dialogs and messaging

### UX Requirements Summary

Based on user feedback sessions:

**Display & Organization:**
- Always grouped by Owner → List (no flat view toggle)
- Grid/List view toggle with visual differences
- Compact list view with checkboxes
- Grid view with prominent images

**Filtering & Search:**
1. Search by title (highest priority)
2. Filter by list owner
3. Filter by date reserved
4. Filter by purchased status
5. Filter by list name
- Search includes everything (title, owner, list name, URL)
- Highlight matched text within cards

**Actions & Interactions:**
- Bulk cancel and bulk mark as purchased
- Confirmation dialog: "Cancel or mark as purchased?" with descriptive text
- Purchased items moved to bottom of each owner group
- Filter toggle to hide purchased items

**Mobile Experience:**
- No bottom action bar
- Priority: Search > Filter > View toggle > Quick cancel > Bulk selection
- All touch targets minimum 44x44px

**Performance:**
- Virtual scrolling for 100+ reservations
- Filter persistence in localStorage

---

## Implementation Roadmap

```
PHASE 0: Pre-Migration (Database Integrity Checks)  🆕 CRITICAL
    └─> PHASE 1: Core Infrastructure (Database & Service Layer)
            └─> PHASE 2: Filter System
                    └─> PHASE 3: Display Components
                            └─> PHASE 4: Bulk Actions
                                    └─> PHASE 5: Main View Component
                                            └─> PHASE 6: Dialogs & Confirmations
                                                    └─> PHASE 7: Performance Optimizations
                                                            └─> PHASE 8: Testing & Polish
```

---

## PHASE 0: Pre-Migration (🆕 CRITICAL)

### 0.1 Check for Duplicate Reservations

**MUST RUN BEFORE DATABASE MIGRATION**

The unique constraint `@@unique([wishId, userId])` will fail if duplicate reservations exist.

**Check Query:**
```sql
-- Find any duplicate reservations
SELECT
  wishId,
  userId,
  COUNT(*) as duplicate_count,
  ARRAY_AGG(id ORDER BY reservedAt DESC) as reservation_ids
FROM reservations
GROUP BY wishId, userId
HAVING COUNT(*) > 1;
```

**If duplicates found:**
```typescript
// Script: scripts/cleanup-duplicate-reservations.ts
import { db } from '@/lib/db';

async function cleanupDuplicates(dryRun = false) {
  console.log(`Running cleanup ${dryRun ? '(DRY RUN)' : '(LIVE)'}`);

  // Find all duplicate groups
  const duplicates = await db.$queryRaw`
    SELECT wishId, userId, COUNT(*) as count
    FROM reservations
    GROUP BY wishId, userId
    HAVING COUNT(*) > 1
  `;

  let totalDeleted = 0;
  const errors: Array<{ wishId: string; userId: string; error: string }> = [];

  // Use transaction for atomic operation
  await db.$transaction(async (tx) => {
    for (const dup of duplicates) {
      try {
        // Keep the most recent reservation, delete rest
        const all = await tx.reservation.findMany({
          where: { wishId: dup.wishId, userId: dup.userId },
          orderBy: { reservedAt: 'desc' },
        });

        const [keep, ...toDelete] = all;

        console.log(`[${dup.wishId}/${dup.userId}] Keeping ${keep.id}, deleting ${toDelete.length} duplicates`);

        if (!dryRun) {
          await tx.reservation.deleteMany({
            where: { id: { in: toDelete.map(r => r.id) } },
          });
        }

        totalDeleted += toDelete.length;
      } catch (error) {
        errors.push({
          wishId: dup.wishId,
          userId: dup.userId,
          error: error.message,
        });
        console.error(`Error processing ${dup.wishId}/${dup.userId}:`, error);
        throw error; // Rollback transaction on any error
      }
    }
  });

  console.log(`\n✅ Cleanup complete!`);
  console.log(`   Total duplicates removed: ${totalDeleted}`);
  console.log(`   Errors: ${errors.length}`);

  if (errors.length > 0) {
    console.error('Errors encountered:', errors);
    process.exit(1);
  }
}

// Parse command line args
const dryRun = process.argv.includes('--dry-run');
cleanupDuplicates(dryRun).then(() => process.exit(0));
```

**Run cleanup:**
```bash
# First, run in dry-run mode to preview changes
npx ts-node scripts/cleanup-duplicate-reservations.ts --dry-run

# Then run live deletion
npx ts-node scripts/cleanup-duplicate-reservations.ts
```

**Verify:**
```sql
-- Should return 0 rows
SELECT wishId, userId, COUNT(*)
FROM reservations
GROUP BY wishId, userId
HAVING COUNT(*) > 1;
```

---

### 0.2 Create Reservation Service (🚨 BLOCKER FIX)

**File:** `src/lib/services/reservation-service.ts` (NEW)

This file is **currently missing** but imported in `src/app/api/reservations/route.ts`.

```typescript
import { db } from '@/lib/db';
import { permissionService } from '@/lib/services/permission-service';
import { ForbiddenError, NotFoundError } from '@/lib/errors';

interface BulkResult {
  succeeded: string[];
  failed: Array<{ id: string; reason: string }>;
  totalProcessed: number;
}

export const reservationService = {
  /**
   * Bulk cancel reservations with transaction safety
   * @throws ForbiddenError if user doesn't own all reservations
   * @returns Result with succeeded/failed lists for partial success handling
   */
  async bulkCancel(reservationIds: string[], userId: string): Promise<BulkResult> {
    // Verify all reservations belong to user
    const reservations = await db.reservation.findMany({
      where: { id: { in: reservationIds } },
      select: { id: true, userId: true },
    });

    const unauthorized = reservations.filter(r => r.userId !== userId);
    if (unauthorized.length > 0) {
      throw new ForbiddenError(
        `Cannot cancel ${unauthorized.length} reservation(s) belonging to other users`
      );
    }

    const succeeded: string[] = [];
    const failed: Array<{ id: string; reason: string }> = [];

    // Use transaction for atomic operation
    await db.$transaction(async (tx) => {
      for (const id of reservationIds) {
        try {
          await tx.reservation.delete({
            where: { id, userId }, // Double-check ownership
          });
          succeeded.push(id);
        } catch (error) {
          failed.push({
            id,
            reason: error.message || 'Unknown error',
          });
        }
      }
    });

    return {
      succeeded,
      failed,
      totalProcessed: reservationIds.length,
    };
  },

  /**
   * Bulk mark reservations as purchased with transaction safety
   * @throws ForbiddenError if user doesn't own all reservations
   * @returns Result with succeeded/failed lists for partial success handling
   */
  async bulkMarkPurchased(
    reservationIds: string[],
    userId: string,
    purchasedDate?: Date
  ): Promise<BulkResult> {
    // Verify ownership
    const reservations = await db.reservation.findMany({
      where: { id: { in: reservationIds } },
      select: { id: true, userId: true },
    });

    const unauthorized = reservations.filter(r => r.userId !== userId);
    if (unauthorized.length > 0) {
      throw new ForbiddenError(
        `Cannot mark ${unauthorized.length} reservation(s) as purchased (not yours)`
      );
    }

    const succeeded: string[] = [];
    const failed: Array<{ id: string; reason: string }> = [];

    // Use transaction for atomic operation
    await db.$transaction(async (tx) => {
      for (const id of reservationIds) {
        try {
          await tx.reservation.update({
            where: { id, userId },
            data: {
              purchasedAt: new Date(),
              purchasedDate: purchasedDate || new Date(),
            },
          });
          succeeded.push(id);
        } catch (error) {
          failed.push({
            id,
            reason: error.message || 'Unknown error',
          });
        }
      }
    });

    return {
      succeeded,
      failed,
      totalProcessed: reservationIds.length,
    };
  },
};
```

**Rate Limiting Note:** Bulk endpoints should use `bulkOperationLimiter` (10 operations/hour) to prevent abuse.

**Status:** Must be created before PHASE 1 API endpoints

---

## PHASE 1: Core Infrastructure

### 1.1 Database Schema Migration

**File:** `prisma/schema.prisma`

**Add to Reservation model:**

```prisma
model Reservation {
  id            String   @id @default(cuid())
  wishId        String
  userId        String
  reservedAt    DateTime @default(now())
  purchasedAt   DateTime? // NEW: When marked as purchased (for UI sorting)
  purchasedDate DateTime? // NEW: Actual purchase date (user input)

  wish Wish @relation(fields: [wishId], references: [id], onDelete: Cascade)
  user User @relation(fields: [userId], references: [id], onDelete: Cascade)

  @@unique([wishId, userId])
  @@index([userId])
  @@index([wishId])
  @@map("reservations")
}
```

**Run migrations:**
```bash
npx prisma db push
npx prisma generate
```

**Important Notes:**
- `purchasedAt`: Timestamp when user clicked "Mark as Purchased" (for sorting)
- `purchasedDate`: User-provided actual purchase date (optional, defaults to today)
- Cancelled reservations are DELETED from database (no status field)

---

### 1.2 Type Definitions Update

**File:** `src/lib/validators/api-responses/reservations.ts`

**Update ReservationSchema (line 6-11):**

```typescript
export const ReservationSchema = z.object({
  id: z.string(),
  wishId: z.string(),
  userId: z.string(),
  reservedAt: z.string().or(z.date()),
  purchasedAt: z.string().or(z.date()).nullable().optional(), // NEW
  purchasedDate: z.string().or(z.date()).nullable().optional(), // NEW
});
```

**Add bulk operation schemas (after line 118):**

```typescript
// Bulk cancel request
export const BulkCancelReservationsSchema = z.object({
  reservationIds: z.array(z.string()).min(1),
});

// Bulk mark as purchased request
export const BulkMarkPurchasedSchema = z.object({
  reservationIds: z.array(z.string()).min(1),
  purchasedDate: z.string().or(z.date()).optional(),
});

// Bulk operation response
export const BulkReservationResponseSchema = z.object({
  success: z.boolean(),
  cancelledCount: z.number().optional(),
  purchasedCount: z.number().optional(),
  message: z.string(),
});

// Export types
export type BulkCancelReservations = z.infer<typeof BulkCancelReservationsSchema>;
export type BulkMarkPurchased = z.infer<typeof BulkMarkPurchasedSchema>;
export type BulkReservationResponse = z.infer<typeof BulkReservationResponseSchema>;
```

---

### 1.3 Create Mark as Purchased API Endpoint

**File:** `src/app/api/reservations/[id]/purchased/route.ts` (NEW)

```typescript
import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { db } from '@/lib/db';
import { z } from 'zod';

const markPurchasedSchema = z.object({
  purchasedDate: z.string().or(z.date()).optional(),
});

export async function PATCH(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession();
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await req.json();
    const { purchasedDate } = markPurchasedSchema.parse(body);

    // Verify reservation belongs to user
    const reservation = await db.reservation.findUnique({
      where: { id: params.id },
    });

    if (!reservation) {
      return NextResponse.json({ error: 'Reservation not found' }, { status: 404 });
    }

    if (reservation.userId !== session.user.id) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    // Update reservation
    const updated = await db.reservation.update({
      where: { id: params.id },
      data: {
        purchasedAt: new Date(),
        purchasedDate: purchasedDate ? new Date(purchasedDate) : new Date(),
      },
    });

    return NextResponse.json(updated);
  } catch (error) {
    console.error('Mark as purchased error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
```

---

### 1.4 Create Bulk Operations API Endpoint

**File:** `src/app/api/reservations/bulk/route.ts` (NEW)

**🆕 USES RESERVATION SERVICE** (follows service layer architecture)

```typescript
import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { reservationService } from '@/lib/services/reservation-service';
import {
  BulkCancelReservationsSchema,
  BulkMarkPurchasedSchema,
} from '@/lib/validators/api-responses/reservations';
import { ForbiddenError } from '@/lib/errors';
import { bulkOperationLimiter } from '@/lib/rate-limiter'; // Rate limiting (10/hour)

export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession();
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Apply rate limiting (10 bulk operations per hour)
    const rateLimitKey = `bulk-reservation:${session.user.id}`;
    try {
      await bulkOperationLimiter.consume(rateLimitKey);
    } catch (error) {
      return NextResponse.json(
        { error: 'Too many bulk operations. Please try again later.' },
        { status: 429 }
      );
    }

    const body = await req.json();
    const { action } = body;

    if (action === 'cancel') {
      const { reservationIds } = BulkCancelReservationsSchema.parse(body);

      // Use service layer (handles ownership verification + transaction)
      const result = await reservationService.bulkCancel(
        reservationIds,
        session.user.id
      );

      return NextResponse.json({
        success: result.failed.length === 0,
        succeeded: result.succeeded,
        failed: result.failed,
        message: `${result.succeeded.length} of ${result.totalProcessed} reservation(s) cancelled`,
      });
    }

    if (action === 'markPurchased') {
      const { reservationIds, purchasedDate } = BulkMarkPurchasedSchema.parse(body);

      // Use service layer (handles ownership verification + transaction)
      const result = await reservationService.bulkMarkPurchased(
        reservationIds,
        session.user.id,
        purchasedDate ? new Date(purchasedDate) : undefined
      );

      return NextResponse.json({
        success: result.failed.length === 0,
        succeeded: result.succeeded,
        failed: result.failed,
        message: `${result.succeeded.length} of ${result.totalProcessed} reservation(s) marked as purchased`,
      });
    }

    return NextResponse.json({ error: 'Invalid action' }, { status: 400 });
  } catch (error) {
    if (error instanceof ForbiddenError) {
      return NextResponse.json({ error: error.message }, { status: 403 });
    }

    console.error('Bulk operation error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
```

**✅ Service Layer Compliance**: Uses `reservationService` for all database operations

---

### 1.5 Update API Client

**File:** `src/lib/api/reservations.ts`

**Add methods (after line 68):**

```typescript
// Mark as purchased
markAsPurchased: async (
  reservationId: string,
  purchasedDate?: Date | string
): Promise<ReservationWithWish> => {
  return apiPatch(
    `/api/reservations/${reservationId}/purchased`,
    { purchasedDate },
    ReservationWithWishSchema
  );
},

// Bulk cancel
bulkCancel: async (reservationIds: string[]): Promise<BulkReservationResponse> => {
  return apiPost(
    '/api/reservations/bulk',
    { action: 'cancel', reservationIds },
    BulkReservationResponseSchema
  );
},

// Bulk mark as purchased
bulkMarkAsPurchased: async (
  reservationIds: string[],
  purchasedDate?: Date | string
): Promise<BulkReservationResponse> => {
  return apiPost(
    '/api/reservations/bulk',
    { action: 'markPurchased', reservationIds, purchasedDate },
    BulkReservationResponseSchema
  );
},
```

**Note:** Ensure `apiPatch` is imported and `BulkReservationResponseSchema` is available.

---

## PHASE 2: Filter System

### 2.1 Filter Hook Update

**File:** `src/components/reservations/hooks/useReservationFilters.ts` (ALREADY CREATED - UPDATE)

**🆕 CRITICAL CHANGES:**
- Add `purchaseStatus` filter
- **Expand search scope** to include list.name and wish.url
- **Remove URL serialization** (localStorage only)

**Changes needed:**

1. Update `FilterState` type (around line 17):
```typescript
export interface FilterState {
  dateFilter: DateFilterOption;
  ownerIds: string[];
  purchaseStatus: 'all' | 'active' | 'purchased'; // NEW
  sort: SortOption;
  search: string;
  [key: string]: unknown;
}
```

2. Update `DEFAULT_FILTER_STATE` (around line 27):
```typescript
const DEFAULT_FILTER_STATE: FilterState = {
  dateFilter: 'all',
  ownerIds: [],
  purchaseStatus: 'all', // NEW
  sort: 'recent',
  search: '',
};
```

3. **Remove URL serialization + Add error handling** (around line 50):
```typescript
const [filterState, setFilterState] = useFilterPersistence({
  storageKey: 'reservation-filters',
  defaultState: DEFAULT_FILTER_STATE,
  // urlSerializer: { ... }, // REMOVED - localStorage only
  fallback: 'memory', // NEW: In-memory fallback if localStorage unavailable
  onError: (error) => {
    console.warn('Filter persistence failed, using in-memory state:', error);
  },
});
```

**localStorage Error Handling Note:**
The `useFilterPersistence` hook should gracefully handle:
- localStorage disabled (browser privacy settings)
- Quota exceeded errors (storage full)
- SecurityError (cross-origin restrictions)
- Fallback to in-memory state when localStorage unavailable

4. **Expand search scope** (around line 160):
```typescript
// BEFORE (only searches title, owner name, email):
filtered = applySearchFilter(
  filtered,
  filterState.search,
  (res) => [res.wish.title, res.wish.user.name || '', res.wish.user.email],
  'reservation'
);

// AFTER (includes list.name and wish.url):
filtered = applySearchFilter(
  filtered,
  filterState.search,
  (res) => [
    res.wish.title,
    res.wish.user.name || '',
    res.wish.user.email,
    res.wish.list?.name || '',  // NEW: Search by list name
    res.wish.url || '',          // NEW: Search by product URL
  ],
  'reservation'
);
```

**Search Performance & Debouncing:**
- Add 300ms debounce to `setSearchQuery` to prevent excessive re-renders
- For 500+ reservations, consider adding search performance warning
- Search executes client-side - acceptable for up to 1000 items
- Example debounce implementation:
```typescript
const [debouncedSearch] = useDebounce(filterState.search, 300);
// Use debouncedSearch in applySearchFilter instead of filterState.search
```

5. Add purchase status filter setter (after line 134):
```typescript
const setPurchaseStatus = useCallback(
  (purchaseStatus: 'all' | 'active' | 'purchased') => {
    setFilterState((prev) => ({ ...prev, purchaseStatus }));
  },
  [setFilterState]
);
```

6. Update filtered reservations logic (around line 175, after owner filter):
```typescript
// Apply purchase status filter
if (filterState.purchaseStatus !== 'all') {
  filtered = filtered.filter((res) => {
    const isPurchased = !!res.purchasedAt;
    return filterState.purchaseStatus === 'purchased' ? isPurchased : !isPurchased;
  });
}
```

7. Update return statement (around line 238):
```typescript
return {
  filterState,
  setDateFilter,
  setOwnerFilter,
  setPurchaseStatus, // NEW
  setSortOption,
  setSearchQuery,
  resetFilters,
  filteredReservations,
  activeFilterCount,
  uniqueOwners,
};
```

**⚠️ Type Dependency**: Requires `ReservationWithWishSchema` to include `list.name` (see PHASE 1.2)

---

### 2.2 Desktop Filter Panel

**File:** `src/components/reservations/filters/ReservationFilterPanel.tsx` (NEW)

**Features:**
- Search input (searches all fields: title, owner, list name, URL)
- Owner multi-select checkboxes (from `uniqueOwners`)
- Date filter radio buttons (all, this week, this month, older)
- Purchase status radio buttons (all, active only, purchased only)
- Sort dropdown (recent, oldest, title-asc, title-desc, owner-asc, owner-desc)
- Active filter count badge
- Reset filters button

**Pattern:** Follow `WishFilterPanel` structure from wishes page

---

### 2.3 Mobile Filter Sheet

**File:** `src/components/reservations/filters/MobileReservationFilterSheet.tsx` (NEW)

**Features:**
- Bottom sheet dialog (Sheet component from Radix UI)
- Same filters as desktop in mobile-friendly vertical layout
- Apply/Reset buttons at bottom
- Closes on apply

**Pattern:** Follow `MobileFilterSheet` structure from wishes page

---

## PHASE 3: Display Components

### 3.1 Reservation Card Component

**File:** `src/components/reservations/reservation-card.tsx` (UPDATE EXISTING)

**Current implementation:** Simple card with title, reserved date, product link, cancel button

**Grid View Updates:**
- Add prominent wish image (if available) at top
- Title (larger font)
- Owner name + list name (breadcrumb: **"John"** `<ArrowRight />` **"Birthday List"** using Lucide icon)
- Reserved date (relative: "2 days ago")
- Purchased badge (if `purchasedAt` exists): Green badge with "Purchased"
- Quick actions: Cancel icon button, Mark as Purchased icon button
- Checkbox for selection (top-left corner) - **hidden for purchased items** (not disabled)
- **If purchased**: Card opacity 50-60%, checkbox not rendered
- **Touch targets**: Minimum 44x44px with 8px spacing between interactive elements

**List View Design:**
- Compact horizontal row
- Structure: `[checkbox] [thumbnail] [title + breadcrumb] [reserved date] [purchased badge] [action buttons]`
- Breadcrumb: **"John"** `<ArrowRight className="h-3 w-3" />` **"Birthday List"** (Lucide icon)
- All elements aligned horizontally
- Minimum height: 60px for touch targets, 8px spacing between elements
- **If purchased**: Checkbox **not rendered**, row opacity 50-60%
- **Accessibility**: aria-label on breadcrumb reads "John's Birthday List"

**Props:**
```typescript
interface ReservationCardProps {
  reservation: ReservationWithWish;
  viewMode: 'grid' | 'list';
  isSelected: boolean;
  isPurchased: boolean; // !!reservation.purchasedAt
  onToggleSelect: (id: string) => void;
  onCancel: (reservation: ReservationWithWish) => void;
  onMarkPurchased: (reservation: ReservationWithWish) => void;
}
```

**Checkbox Implementation (Conditional Rendering):**
```typescript
{/* Only render checkbox for unpurchased items - better accessibility than disabled */}
{!isPurchased && (
  <Checkbox
    checked={isSelected}
    onCheckedChange={() => onToggleSelect(reservation.id)}
    aria-label={`Select ${reservation.wish.title}`}
    className="h-5 w-5" // 20px checkbox + 12px padding = 44px touch target
  />
)}

{/* Breadcrumb with Lucide ArrowRight icon */}
<div className="flex items-center gap-1" aria-label={`${reservation.wish.user.name}'s ${reservation.wish.list.name}`}>
  <span className="font-medium">{reservation.wish.user.name}</span>
  <ArrowRight className="h-3 w-3 text-muted-foreground" aria-hidden="true" />
  <span>{reservation.wish.list.name}</span>
</div>
```

**Why not `disabled`?**
- Screen readers announce "checkbox disabled" which confuses users
- Disabled checkboxes violate WCAG guidelines for purchased items
- Hiding checkbox is clearer: purchased = not selectable

---

### 3.2 Reservations Display Component

**File:** `src/components/reservations/reservations-display.tsx` (NEW)

**Responsibilities:**
- Render filtered reservations in grid or list view
- Group by Owner → List (hierarchical)
- Display breadcrumbs in each card instead of separate headers
- Move purchased items to bottom of each owner group
- Virtual scrolling with `@tanstack/react-virtual` for performance
- Handle empty groups gracefully

**Grouping Logic:**
```typescript
// 1. Group by owner first
const groupedByOwner = groupBy(reservations, (res) => res.wish.user.id);

// 2. Within each owner, separate active vs purchased
const processedGroups = Object.entries(groupedByOwner).map(([ownerId, items]) => {
  const active = items.filter(res => !res.purchasedAt);
  const purchased = items.filter(res => res.purchasedAt);
  return {
    ownerId,
    ownerName: items[0].wish.user.name || items[0].wish.user.email,
    activeItems: active,
    purchasedItems: purchased,
  };
});

// 3. Render active items first, then purchased items (de-emphasized)
```

**Display Structure:**
```
[Active reservations for Owner A]
[Active reservations for Owner A]
────────────────────────────────
[Purchased items for Owner A] (grayed out, at bottom)

[Active reservations for Owner B]
[Active reservations for Owner B]
────────────────────────────────
[Purchased items for Owner B] (grayed out, at bottom)
```

**Props:**
```typescript
interface ReservationsDisplayProps {
  reservations: ReservationWithWish[];
  viewMode: 'grid' | 'list';
  selectedIds: Set<string>;
  onToggleSelect: (id: string) => void;
  onCancel: (reservation: ReservationWithWish) => void;
  onMarkPurchased: (reservation: ReservationWithWish) => void;
}
```

---

### 3.3 Empty State Component

**File:** `src/components/reservations/empty-state.tsx` (NEW)

**Content:**
- Gift icon (from lucide-react)
- Heading: "You haven't reserved any gifts yet"
- Subtext: "Visit shared lists or groups to reserve items and coordinate gift-giving"
- Educational section:
  - **Heading:** "How Reservations Work"
  - **Bullet 1:** "Reservations are hidden from list owners to keep gifts a surprise"
  - **Bullet 2:** "Helps coordinate with others so no one buys the same gift"
  - **Bullet 3:** "Mark items as purchased to track what you've already bought"

**No action buttons** (user accesses lists via shared links or group membership)

**Props:**
```typescript
interface EmptyStateProps {
  hasActiveFilters?: boolean; // If true, show "No reservations match your filters" instead
}
```

---

### 3.4 Loading Skeleton

**File:** `src/components/reservations/reservation-skeleton.tsx` (NEW)

**Design:**
- Skeleton for grouped view
- Show 2-3 owner group sections
- Each group has:
  - Owner name skeleton (w-48 h-6)
  - 3-4 card/row skeletons
- Support both grid and list variants

**Props:**
```typescript
interface ReservationSkeletonProps {
  variant: 'grid' | 'list';
  count?: number; // Default 8
}
```

**Pattern:** Follow `WishesLoadingSkeleton` from wishes page

---

## PHASE 4: Bulk Actions

### 4.1 Bulk Actions Bar

**File:** `src/components/reservations/bulk-actions-bar.tsx` (NEW)

**Features:**
- Fixed at bottom of screen (z-40)
- Shows selected count: "X reservations selected"
- Buttons:
  - "Cancel Selected" (destructive variant)
  - "Mark as Purchased" (primary variant)
  - "Clear Selection" (ghost variant)
- On mobile: Replaces bottom action bar when selection mode active
- Minimum height: 60px for touch targets

**Pattern:** Follow `BulkActionsBar` from wishes page

**Props:**
```typescript
interface BulkActionsBarProps {
  selectedCount: number;
  onBulkCancel: () => void;
  onBulkMarkPurchased: () => void;
  onClearSelection: () => void;
}
```

---

### 4.2 Bulk Action Dialogs

**File:** `src/components/reservations/bulk-action-dialogs.tsx` (NEW)

**Dialog 1: Bulk Cancel Confirmation**
- Title: "Cancel X reservations?"
- Description: "These reservations will be removed and the items will become available to others."
- Buttons: "Cancel", "Remove Reservations" (destructive)

**Dialog 2: Bulk Mark as Purchased**
- Title: "Mark X reservations as purchased?"
- Description: "These items will be moved to the purchased section but remain visible."
- Optional: Purchase date picker (defaults to today)
- Buttons: "Cancel", "Mark as Purchased" (primary)

**Props:**
```typescript
interface BulkActionDialogsProps {
  cancelDialogOpen: boolean;
  purchaseDialogOpen: boolean;
  selectedCount: number;
  onCancelConfirm: () => void;
  onPurchaseConfirm: (purchasedDate?: Date) => void;
  onCancel: () => void;
}
```

---

## PHASE 5: Main View Component

### 5.1 Reservations View

**File:** `src/components/reservations/reservations-view.tsx` (NEW)

**State management:**
```typescript
const [selectedReservationIds, setSelectedReservationIds] = useState<Set<string>>(new Set());
const [isSelectionMode, setIsSelectionMode] = useState(false);
const [isDesktopFilterOpen, setIsDesktopFilterOpen] = useState(false);
const [isMobileFilterOpen, setIsMobileFilterOpen] = useState(false);
const [viewMode, setViewMode, isHydrated] = useViewPreference('viewMode.reservations', 'grid');
const [actioningReservation, setActioningReservation] = useState<ReservationWithWish | null>(null);
const [showCancelDialog, setShowCancelDialog] = useState(false);
const [showPurchaseDialog, setShowPurchaseDialog] = useState(false);
const [showBulkCancelDialog, setShowBulkCancelDialog] = useState(false);
const [showBulkPurchaseDialog, setShowBulkPurchaseDialog] = useState(false);
```

**Data fetching:**
```typescript
const { data: reservations, isLoading } = useReservationsQuery();
const currentReservations = reservations || [];
```

**Filtering:**
```typescript
const {
  filterState,
  setDateFilter,
  setOwnerFilter,
  setPurchaseStatus,
  setSortOption,
  setSearchQuery,
  resetFilters,
  filteredReservations,
  activeFilterCount,
  uniqueOwners,
} = useReservationFilters(currentReservations);
```

**Layout structure** (follow wishes/lists pattern):
```tsx
<div className="relative min-h-screen">
  {/* Mobile top menu */}
  <div className="sticky top-0 z-30 flex items-center justify-between border-b bg-background px-4 py-1.5 md:hidden">
    <div className="flex items-center gap-2">
      <Button variant="ghost" size="icon" onClick={() => setIsMobileFilterOpen(true)}>
        <Filter className="h-4 w-4" />
        {activeFilterCount > 0 && <Badge>{activeFilterCount}</Badge>}
      </Button>
      <Button variant="ghost" size="icon" onClick={toggleSelectionMode}>
        <CheckSquare className={cn('h-4 w-4', isSelectionMode && 'text-primary')} />
      </Button>
    </div>
    <ViewToggle viewMode={viewMode} onViewModeChange={setViewMode} />
  </div>

  {/* Desktop filter panel (sliding) */}
  <ReservationFilterPanel
    open={isDesktopFilterOpen}
    onOpenChange={setIsDesktopFilterOpen}
    filterState={filterState}
    uniqueOwners={uniqueOwners}
    // ... other filter props
  />

  {/* Main content */}
  <div className={cn('transition-all duration-300', isDesktopFilterOpen && 'lg:ml-80')}>
    <div className="container mx-auto px-4 py-8 pb-24 md:pb-0">
      {/* Desktop header */}
      <div className="mb-8 hidden flex-col gap-4 sm:flex sm:flex-row sm:items-center sm:justify-between md:flex">
        <div>
          <h1 className="text-2xl font-bold sm:text-3xl">My Reservations</h1>
          <p className="mt-2 text-sm text-muted-foreground sm:text-base">
            Track gifts you've reserved for others
          </p>
        </div>
      </div>

      {/* Desktop controls bar */}
      <div className="mb-6 hidden items-center justify-between md:flex">
        <Button
          variant="outline"
          size="sm"
          onClick={() => setIsDesktopFilterOpen(!isDesktopFilterOpen)}
        >
          <Filter className="mr-2 h-4 w-4" />
          Filters
          {activeFilterCount > 0 && <Badge>{activeFilterCount}</Badge>}
        </Button>
        <ViewToggle viewMode={viewMode} onViewModeChange={setViewMode} />
      </div>

      {/* Content */}
      {isLoading ? (
        <ReservationSkeleton variant={viewMode} count={8} />
      ) : filteredReservations.length === 0 ? (
        <EmptyState hasActiveFilters={activeFilterCount > 0} />
      ) : (
        <ReservationsDisplay
          reservations={filteredReservations}
          viewMode={viewMode}
          selectedIds={selectedReservationIds}
          onToggleSelect={toggleReservationSelection}
          onCancel={handleCancelClick}
          onMarkPurchased={handleMarkPurchasedClick}
        />
      )}
    </div>
  </div>

  {/* Mobile filter sheet */}
  <MobileReservationFilterSheet
    open={isMobileFilterOpen}
    onOpenChange={setIsMobileFilterOpen}
    filterState={filterState}
    uniqueOwners={uniqueOwners}
    // ... other filter props
  />

  {/* Bulk actions bar */}
  {isSelectionMode && selectedReservationIds.size > 0 && (
    <BulkActionsBar
      selectedCount={selectedReservationIds.size}
      onBulkCancel={() => setShowBulkCancelDialog(true)}
      onBulkMarkPurchased={() => setShowBulkPurchaseDialog(true)}
      onClearSelection={clearSelection}
    />
  )}

  {/* Dialogs */}
  {/* ... action dialogs, bulk dialogs */}
</div>
```

**Pattern:** Follow `WishesView` structure from wishes page

---

### 5.2 Page Component

**File:** `src/app/(auth)/reservation/page.tsx` (MOVE & UPDATE)

**Action:**
1. Move from `src/app/reservation/page.tsx` to `src/app/(auth)/reservation/page.tsx`
2. Delete old file after confirming new one works

**New content:**
```typescript
'use client';

import { ReservationsView } from '@/components/reservations/reservations-view';

export default function MyReservationsPage() {
  return <ReservationsView />;
}
```

**Note:** Moving to `(auth)` route group provides automatic authentication via layout middleware

---

## PHASE 6: Dialogs & Confirmations

### 6.1 Action Dialog - RemoveOptionsDialog Pattern

**File:** `src/components/reservations/action-dialog.tsx` (NEW)

**🆕 DESIGN UPDATE**: Uses **RemoveOptionsDialog pattern** (from existing codebase)

**Why this pattern:**
- Clearer for non-technical users ("Grandma test" compliant)
- Each option has icon + title + full description
- Matches existing wishes bulk action pattern
- Avoids confusing OR-logic in title

**Title:** "What would you like to do?"

**Description:** "Choose an action for this reservation"

**Options (full-width buttons):**

**Option 1: Keep Reservation** (ghost variant)
- Icon: `CheckCircle`
- Description: "No changes, keep this item reserved"
- Action: Closes dialog

**Option 2: Mark as Purchased** (default/primary variant)
- Icon: `ShoppingBag`
- Description: "Move to purchased section (can add purchase date)"
- Action: Opens purchase date picker dialog

**Option 3: Cancel Reservation** (destructive variant)
- Icon: `XCircle`
- Description: "Remove reservation, item becomes available to others"
- Action: Confirms cancellation

**Implementation:**
```typescript
import { RemoveOptionsDialog } from '@/components/ui/remove-options-dialog';
import { CheckCircle, ShoppingBag, XCircle } from 'lucide-react';

interface ActionDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  reservation: ReservationWithWish | null;
  onCancelConfirm: () => void;
  onMarkPurchasedClick: () => void; // Opens date picker
}

export function ActionDialog({
  open,
  onOpenChange,
  reservation,
  onCancelConfirm,
  onMarkPurchasedClick,
}: ActionDialogProps) {
  if (!reservation) return null;

  return (
    <RemoveOptionsDialog
      open={open}
      onOpenChange={onOpenChange}
      title="What would you like to do?"
      description={`Choose an action for "${reservation.wish.title}"`}
      options={[
        {
          label: "Keep Reservation",
          description: "No changes, keep this item reserved",
          icon: CheckCircle,
          variant: "ghost",
          onSelect: () => onOpenChange(false),
        },
        {
          label: "Mark as Purchased",
          description: "Move to purchased section (can add purchase date)",
          icon: ShoppingBag,
          variant: "default",
          onSelect: () => {
            onOpenChange(false);
            onMarkPurchasedClick();
          },
        },
        {
          label: "Cancel Reservation",
          description: "Remove reservation, item becomes available to others",
          icon: XCircle,
          variant: "destructive",
          onSelect: () => {
            onOpenChange(false);
            onCancelConfirm();
          },
        },
      ]}
    />
  );
}
```

**Props:**
```typescript
interface ActionDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  reservation: ReservationWithWish | null;
  onCancelConfirm: () => void;
  onMarkPurchasedClick: () => void; // Shows date picker
}
```

---

### 6.2 Purchase Date Picker Dialog

**When marking as purchased**, show optional date picker:

**Title:** "When did you purchase this?"

**Description:** "Optional - helps track your purchase history"

**Content:**
- Date picker **pre-filled with today's date** (✅ design decision confirmed)
- Checkbox: **"Use today's date"** (checked by default)
- Unchecking allows manual date selection

**Buttons:**
- "Cancel" (ghost)
- "Confirm" (primary)

**Pattern:** Use existing `Dialog` component with `DatePicker` from shadcn/ui

**Implementation:**
```typescript
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Calendar } from '@/components/ui/calendar';
import { Checkbox } from '@/components/ui/checkbox';
import { useState } from 'react';

interface PurchaseDatePickerProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onConfirm: (date: Date) => void;
}

export function PurchaseDatePicker({ open, onOpenChange, onConfirm }: PurchaseDatePickerProps) {
  const [selectedDate, setSelectedDate] = useState<Date>(new Date()); // Default: today
  const [useToday, setUseToday] = useState(true);

  const handleConfirm = () => {
    onConfirm(useToday ? new Date() : selectedDate);
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>When did you purchase this?</DialogTitle>
          <DialogDescription>
            Optional - helps track your purchase history
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div className="flex items-center space-x-2">
            <Checkbox
              id="use-today"
              checked={useToday}
              onCheckedChange={(checked) => setUseToday(!!checked)}
            />
            <label htmlFor="use-today" className="text-sm">
              Use today's date
            </label>
          </div>

          {!useToday && (
            <Calendar
              mode="single"
              selected={selectedDate}
              onSelect={(date) => date && setSelectedDate(date)}
              disabled={(date) => date > new Date()} // Can't select future dates
            />
          )}
        </div>

        <DialogFooter>
          <Button variant="ghost" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button onClick={handleConfirm}>
            Confirm
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
```

---

## PHASE 7: Performance Optimizations

### 7.1 Virtual Scrolling

**Library:** `@tanstack/react-virtual` (preferred) or `react-window`

**Implementation location:** `ReservationsDisplay` component

**Approach:**
```typescript
import { useVirtualizer } from '@tanstack/react-virtual';

// In component:
const parentRef = useRef<HTMLDivElement>(null);

const virtualizer = useVirtualizer({
  count: filteredReservations.length,
  getScrollElement: () => parentRef.current,
  estimateSize: () => (viewMode === 'grid' ? 250 : 80), // Estimate card height
  overscan: 5,
});

// Render:
<div ref={parentRef} className="h-[calc(100vh-200px)] overflow-auto">
  <div style={{ height: `${virtualizer.getTotalSize()}px`, position: 'relative' }}>
    {virtualizer.getVirtualItems().map((virtualRow) => {
      const reservation = filteredReservations[virtualRow.index];
      return (
        <div
          key={virtualRow.key}
          style={{
            position: 'absolute',
            top: 0,
            left: 0,
            width: '100%',
            transform: `translateY(${virtualRow.start}px)`,
          }}
        >
          <ReservationCard reservation={reservation} {...props} />
        </div>
      );
    })}
  </div>
</div>
```

**Threshold:** Virtual scrolling activates when `filteredReservations.length > 50` (✅ confirmed)

**Why 50 items:**
- Balances performance vs. simplicity
- Typical family/group has < 50 reservations
- Power users with 100+ items get smooth scrolling
- Prevents layout shift issues

**⚠️ CRITICAL LIMITATION - Dynamic Heights:**
Virtual scrolling works best with **fixed heights**. Our design has challenges:
- Purchased items have different opacity (same height, but visual difference)
- Card titles vary in length (1 line vs. 3 lines)
- Grid view images may not load uniformly

**Workaround Strategies:**
1. **Fixed Height Variants** (Recommended):
   - Grid: 280px fixed height for all cards
   - List: 80px fixed height for all rows
   - Truncate long titles with ellipsis

2. **Measure-then-render** (Complex):
   - Use `virtualizer.measureElement()` after render
   - Causes layout shift but accurate heights
   - Only for power users (100+ items)

3. **Disable for < 100 items** (Safest):
   - Only use virtual scrolling when absolutely necessary
   - Trade performance for perfect layout

**Implementation Decision:** Use fixed heights (option 1) for predictable UX

**Performance Testing Required:**
- Test with 50, 100, 500, 1000 reservations
- Verify no layout shift on scroll
- Check smooth scrolling on low-end devices (iPhone SE)

---

### 7.2 Filter Persistence

**Already handled** by `useFilterPersistence` hook in `useReservationFilters.ts`

**🆕 CONFIGURATION UPDATE:**

**Features:**
- Saves to **localStorage only** (no URL serialization - ✅ design decision)
- Storage key: `reservation-filters`
- Persists: date filter, owner selection, **purchase status**, sort option
- **Does NOT persist**: search queries (cleared on page load)
- Restores on page load

**Implementation (PHASE 2.1 - Updated):**
```typescript
const [filterState, setFilterState] = useFilterPersistence({
  storageKey: 'reservation-filters',
  defaultState: DEFAULT_FILTER_STATE,
  fallback: 'memory', // In-memory fallback if localStorage unavailable
  onError: (error) => {
    console.warn('Filter persistence failed, using in-memory state:', error);
  },
});
```

**Error Handling (useFilterPersistence hook should handle):**
```typescript
// Inside useFilterPersistence implementation
try {
  localStorage.setItem(storageKey, JSON.stringify(state));
} catch (error) {
  if (error.name === 'QuotaExceededError') {
    // Storage full - clear old data or use memory
    onError?.(new Error('localStorage quota exceeded'));
  } else if (error.name === 'SecurityError') {
    // localStorage disabled (private browsing)
    onError?.(new Error('localStorage disabled'));
  } else {
    onError?.(error);
  }
  // Fall back to in-memory state
  useFallbackState();
}
```

**Scenarios Handled:**
- localStorage disabled (browser privacy settings)
- Quota exceeded (storage full)
- SecurityError (cross-origin or private browsing)
- Automatic fallback to in-memory state

---

## PHASE 8: Testing & Polish

### 8.1 E2E Tests

**File:** `tests/e2e/reservations.spec.ts` (NEW or UPDATE existing)

**Test cases:**

```typescript
test.describe('My Reservations', () => {
  test('displays reservations grouped by owner', async ({ page }) => {
    // Setup: Create reservations for different owners
    // Verify: Grouped display shows owner headers
  });

  test('mark as purchased moves item to bottom', async ({ page }) => {
    // Setup: Create active reservation
    // Action: Click "Mark as Purchased"
    // Verify: Item moves to purchased section at bottom
  });

  test('bulk cancel removes multiple reservations', async ({ page }) => {
    // Setup: Create 3 reservations
    // Action: Select all, click bulk cancel, confirm
    // Verify: All removed from list
  });

  test('filter by owner shows only that owner\'s items', async ({ page }) => {
    // Setup: Reservations for Owner A and Owner B
    // Action: Filter by Owner A
    // Verify: Only Owner A's items shown
  });

  test('search finds reservation by title', async ({ page }) => {
    // Setup: Reservation with title "Red Bike"
    // Action: Search "bike"
    // Verify: Reservation appears, search term highlighted
  });

  test('grid/list view toggle persists', async ({ page }) => {
    // Action: Switch to list view
    // Action: Refresh page
    // Verify: Still in list view
  });

  test('virtual scrolling works with 100+ items', async ({ page }) => {
    // Setup: Create 150 reservations
    // Action: Scroll to bottom
    // Verify: Smooth scrolling, all items accessible
  });

  test('empty state shows educational message', async ({ page }) => {
    // Setup: No reservations
    // Verify: Educational content about how reservations work
  });

  test('purchased items do not show checkbox', async ({ page }) => {
    // Setup: Create 1 active, 1 purchased reservation
    // Verify: Active shows checkbox, purchased does not
    // Verify: Purchased item has 50-60% opacity
  });

  test('localStorage fallback works when disabled', async ({ page }) => {
    // Setup: Disable localStorage in browser
    // Action: Change filters
    // Verify: Filters work (in-memory), no error thrown
  });
});
```

---

### 8.2 Unit & Integration Tests

**New test files required:**

**File:** `tests/unit/lib/services/reservation-service.test.ts` (NEW)

```typescript
describe('reservationService', () => {
  describe('bulkCancel', () => {
    it('deletes all reservations in transaction', async () => {
      // Test transaction rollback on partial failure
    });

    it('returns succeeded/failed lists for partial success', async () => {
      // Test partial success handling
    });

    it('throws ForbiddenError for unauthorized reservations', async () => {
      // Test ownership verification
    });
  });

  describe('bulkMarkPurchased', () => {
    it('updates all reservations with purchasedAt timestamp', async () => {
      // Test bulk update
    });

    it('handles partial failures gracefully', async () => {
      // Test error recovery
    });
  });
});
```

**File:** `tests/integration/scripts/cleanup-duplicate-reservations.test.ts` (NEW)

```typescript
describe('Duplicate Cleanup Script', () => {
  it('keeps most recent reservation when duplicates exist', async () => {
    // Test duplicate detection and cleanup
  });

  it('runs in dry-run mode without deleting', async () => {
    // Test --dry-run flag
  });

  it('rolls back transaction on error', async () => {
    // Test transaction safety
  });
});
```

**File:** `tests/unit/hooks/useReservationFilters.test.ts` (UPDATE)

```typescript
describe('useReservationFilters - localStorage', () => {
  it('falls back to memory when localStorage disabled', () => {
    // Mock localStorage.setItem to throw SecurityError
    // Verify in-memory state works
  });

  it('handles quota exceeded gracefully', () => {
    // Mock localStorage.setItem to throw QuotaExceededError
    // Verify fallback to memory
  });

  it('debounces search input by 300ms', async () => {
    // Test debounce behavior
  });
});
```

**File:** `tests/e2e/performance/virtual-scrolling.spec.ts` (NEW)

```typescript
describe('Virtual Scrolling Performance', () => {
  test('renders 500 reservations smoothly', async ({ page }) => {
    // Setup: Create 500 reservations
    // Verify: Virtual scrolling active
    // Verify: Smooth scroll, no layout shift
  });

  test('fixed heights prevent layout jumps', async ({ page }) => {
    // Setup: Reservations with varying title lengths
    // Verify: All cards same height
    // Verify: No jump during scroll
  });
});
```

**Coverage Requirements:**
- Service layer: 100% (critical for security)
- Cleanup script: 100% (data integrity)
- localStorage handling: 100% (fallback paths)
- Virtual scrolling: 80% (edge cases)

---

### 8.3 Mobile Testing Checklist

**Viewport: 375px (iPhone SE)**

- [ ] Filter panel slides in/out smoothly from left (desktop) or bottom (mobile)
- [ ] Search input is at least 44px tall
- [ ] All buttons are at least 44x44px (touch targets)
- [ ] View toggle is visible and functional
- [ ] Selection mode checkbox is at least 24x24px with 10px padding
- [ ] Bulk actions bar appears at bottom when items selected
- [ ] Cards/rows don't overflow horizontally
- [ ] Virtual scrolling is smooth (no jank)
- [ ] Dialogs are readable and buttons accessible
- [ ] No horizontal scroll at any breakpoint

**Viewport: 768px (iPad)**

- [ ] Desktop filter panel appears on left
- [ ] Mobile top menu hidden
- [ ] Grid view shows 2 columns
- [ ] Touch targets still comfortable

**Viewport: 1024px (Desktop)**

- [ ] Filter panel slides in from left (80px wide)
- [ ] Grid view shows 3-4 columns
- [ ] All desktop controls visible

---

## File Checklist Summary

### New Files (12) 🆕 +1

1. **`src/lib/services/reservation-service.ts`** 🚨 BLOCKER FIX - Service layer for bulk operations
2. `src/app/api/reservations/[id]/purchased/route.ts` - Mark as purchased endpoint
3. `src/app/api/reservations/bulk/route.ts` - Bulk operations endpoint (uses service)
4. `src/components/reservations/filters/ReservationFilterPanel.tsx` - Desktop filter panel
5. `src/components/reservations/filters/MobileReservationFilterSheet.tsx` - Mobile filter sheet
6. `src/components/reservations/reservations-display.tsx` - Main display component
7. `src/components/reservations/empty-state.tsx` - Empty state component
8. `src/components/reservations/reservation-skeleton.tsx` - Loading skeleton
9. `src/components/reservations/bulk-actions-bar.tsx` - Bulk actions bar
10. `src/components/reservations/bulk-action-dialogs.tsx` - Bulk dialogs
11. `src/components/reservations/reservations-view.tsx` - Main view component
12. `src/components/reservations/action-dialog.tsx` - RemoveOptionsDialog pattern

### Updated Files (7) 🆕 +1

1. `prisma/schema.prisma` - Add `purchasedAt`, `purchasedDate`, `@@unique([wishId, userId])`
2. `src/app/api/reservations/route.ts` - GET endpoint (already updated)
3. **`src/lib/validators/api-responses/reservations.ts`** - Add purchased fields, bulk schemas, `list.name` in wish
4. `src/lib/api/reservations.ts` - Add `markAsPurchased`, `bulkCancel`, `bulkMarkAsPurchased`
5. `src/components/reservations/reservation-card.tsx` - Grid/list variants, Lucide arrow breadcrumbs, conditional checkbox rendering
6. `src/components/reservations/hooks/useReservationFilters.ts` - Add `purchaseStatus` filter, expand search, remove URL serialization

### Moved Files (1)

1. `src/app/reservation/page.tsx` → `src/app/(auth)/reservation/page.tsx`

### Deleted Files (1)

1. `src/components/reservation/BrowseListsButton.tsx` - No longer needed (no browse feature)

---

## Implementation Order

**Recommended sequence (9 phases):**

**0. Pre-Migration** (PHASE 0) 🆕 CRITICAL - Database integrity
   - Check for duplicate reservations (SQL query)
   - Clean up duplicates if found (keep most recent)
   - Create `reservation-service.ts` (BLOCKER FIX)
   - Verify data integrity

**1. Database & Service Layer** (PHASE 1) - Foundation
   - Update schema (purchasedAt, purchasedDate, unique constraint)
   - Run migrations: `pnpm db:push`
   - Create API endpoints (mark purchased, bulk operations)
   - Update type definitions (3 new bulk schemas, list.name in wish)
   - Update API client methods

**2. Filter System** (PHASE 2) - Core functionality
   - Update `useReservationFilters` hook (purchaseStatus, expanded search)
   - Remove URL serialization (localStorage only)
   - Create desktop filter panel
   - Create mobile filter sheet

**3. Display Components** (PHASE 3) - Visual layer
   - Update reservation card (grid/list variants, Lucide ArrowRight breadcrumbs, conditional checkbox rendering)
   - Add touch target spacing (8px minimum between interactive elements)
   - Create reservations display (grouping, collapsible sections)
   - Create empty state
   - Create loading skeleton

**4. Bulk Actions** (PHASE 4) - Batch operations
   - Bulk actions bar
   - Bulk action dialogs

**5. Main View** (PHASE 5) - Integration
   - Create main reservations view component
   - Move page to (auth) route group

**6. Dialogs** (PHASE 6) - User interactions
   - Action dialog (RemoveOptionsDialog pattern)
   - Purchase date picker (optional, defaults to today)

**7. Performance** (PHASE 7) - Optimization
   - Install `@tanstack/react-virtual`
   - Add virtual scrolling (threshold: 50+ items)
   - Verify filter persistence configuration

**8. Testing** (PHASE 8) - Quality assurance
   - Write E2E tests (grouping, filtering, bulk actions)
   - Mobile testing (375px, 768px, 1024px)
   - Virtual scrolling performance test (150 items)

---

## Success Criteria

**Functionality:**
- [ ] Users can view reservations grouped by owner
- [ ] Users can mark reservations as purchased
- [ ] Purchased items move to bottom of each owner group
- [ ] Users can filter by owner, date, purchase status
- [ ] Users can search across all fields (title, owner, list, URL)
- [ ] Users can toggle between grid and list views
- [ ] Users can bulk cancel reservations
- [ ] Users can bulk mark as purchased
- [ ] Virtual scrolling works smoothly with 100+ items

**UX (Grandma Test):**
- [ ] All dialogs use plain English (no tech jargon)
- [ ] Empty state is educational and helpful
- [ ] All actions have clear confirmation dialogs
- [ ] Purchased items are visually de-emphasized but still accessible

**Mobile:**
- [ ] All touch targets minimum 44x44px
- [ ] No horizontal scrolling at 375px width
- [ ] Filter sheet works smoothly
- [ ] Bulk actions bar appears correctly
- [ ] Virtual scrolling smooth on mobile

**Performance (Specific Criteria):**
- [ ] Page loads in < 2s (iPhone SE, 4G network, 50 reservations)
- [ ] Page loads in < 5s (iPhone SE, 3G network, 200 reservations)
- [ ] Filtering < 100ms (up to 200 reservations), < 500ms (1000+ reservations)
- [ ] Search debounce 300ms, results appear within 100ms after debounce
- [ ] Virtual scrolling smooth with 100+ items (60fps on iPhone SE)
- [ ] Virtual scrolling activates at 50+ filtered items (not 100+)
- [ ] No layout shift on hydration or scroll (Cumulative Layout Shift < 0.1)
- [ ] Fixed card heights: Grid 280px, List 80px (prevents layout jumps)

**Consistency:**
- [ ] Matches wishes/lists/groups design patterns
- [ ] Uses same filter panel structure
- [ ] Uses same view toggle component
- [ ] Uses same dialog components
- [ ] Follows mobile-first responsive patterns

---

## Known Limitations & Future Enhancements

**Current Limitations:**
- No "browse lists" feature (intentional - users access via shared links/groups only)
- No undo for bulk operations (confirmation dialog only)
- Purchased date is optional (defaults to today if not provided)
- Virtual scrolling may have issues with dynamic heights (use fixed heights)

**Future Enhancements (Phase 2):**
- Add "recently purchased" filter (last 30 days)
- Add "purchase history" separate page
- Add export to CSV functionality
- Add email reminders for unpurchased reservations
- Add collaborative notes on reservations
- Add gift wrapping tracking
- Add receipt upload for purchased items

---

## Dependencies

**npm packages needed:**
- `@tanstack/react-virtual` - Virtual scrolling (install: `pnpm add @tanstack/react-virtual`)

**Existing dependencies used:**
- `@tanstack/react-query` - Data fetching
- `react-hook-form` - Form handling
- `zod` - Schema validation
- `lucide-react` - Icons
- Radix UI components (Dialog, Sheet, etc.)
- Tailwind CSS - Styling

---

## Rollback Plan

If issues arise during implementation:

1. **Database rollback:**
   ```bash
   # Remove purchasedAt/purchasedDate fields
   npx prisma db push --force-reset
   ```

---

**Date Created:** 2025-11-22
**Date Analyzed:** 2025-11-22
**Status:** ✅ Critical Analysis Complete - Production-Ready Updates Applied
**Next Action:** Begin PHASE 0 (Pre-Migration Checks) 🚨 CRITICAL

**Total Estimated Effort:** 30-40 hours (9 phases including PHASE 0)
- Core implementation: 18-24h
- Error handling & accessibility: 6-8h
- Testing & performance validation: 6-8h

**Key Updates Applied:**
- ✅ Added PHASE 0 for database integrity checks (transaction safety, dry-run mode)
- ✅ Created reservation-service.ts specification (blocker fix + partial success handling)
- ✅ Updated dialog pattern to RemoveOptionsDialog (better UX)
- ✅ Confirmed breadcrumb format: Lucide ArrowRight icon (not unicode or slash)
- ✅ **Conditional rendering** for purchased checkboxes (not disabled - accessibility fix)
- ✅ Virtual scrolling threshold set to 50+ items with fixed heights (280px grid, 80px list)
- ✅ Filter persistence: localStorage only with error handling (fallback to memory)
- ✅ Expanded search scope (list.name + wish.url) with 300ms debounce
- ✅ Service layer architecture: transaction handling + rate limiting (10/hour)
- ✅ Touch target spacing: 8px minimum between interactive elements
- ✅ Comprehensive test coverage: unit, integration, E2E, performance tests
