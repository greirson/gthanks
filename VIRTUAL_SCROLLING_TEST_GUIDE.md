# Virtual Scrolling Test Guide - Reservations

**Phase 7.3 of RESERVATIONS_REFACTOR.md**

This guide provides steps to test virtual scrolling with 50+ reservation items to ensure smooth performance and correct behavior.

## Prerequisites

- Development server running (`pnpm dev`)
- Access to reservation page at `/reservation` (requires authentication)
- Browser DevTools for performance monitoring

## Test Scenarios

### Scenario 1: Verify Virtual Scrolling Activation Threshold (50+ items)

**Setup:**
1. Create test data with varying reservation counts:
   - 25 reservations (should NOT activate virtual scrolling)
   - 50 reservations (should NOT activate virtual scrolling)
   - 51 reservations (SHOULD activate virtual scrolling)
   - 100 reservations (should activate virtual scrolling)

**Test:**
1. Navigate to `/reservation` page
2. Open browser DevTools → Elements tab
3. Inspect the reservations container
4. Look for:
   - Virtual scrolling: Container with `style="height: XXXpx; position: relative"`
   - Non-virtual: Regular grid/list layout

**Expected Results:**
- ✅ < 50 items: Regular layout (no virtual scrolling)
- ✅ ≥ 50 items: Virtual scrolling active (container has dynamic height)
- ✅ Smooth scrolling in both modes
- ✅ No layout shift during scroll

---

### Scenario 2: Performance with 100+ Reservations

**Setup:**
Create 150 test reservations across multiple owners

**Test:**
1. Navigate to `/reservation` page
2. Open DevTools → Performance tab
3. Start recording
4. Scroll from top to bottom
5. Stop recording

**Expected Results:**
- ✅ 60fps scrolling (no frame drops)
- ✅ Low memory usage (< 100MB increase during scroll)
- ✅ No janky scrolling animations
- ✅ Items render smoothly as they enter viewport

**Performance Metrics:**
- First Contentful Paint: < 2s
- Scroll FPS: ≥ 60fps
- Memory increase: < 100MB
- CPU usage: < 50% on mid-range devices

---

### Scenario 3: Fixed Heights (Grid 280px, List 80px)

**Setup:**
Create 60+ reservations with varying title lengths and image availability

**Test:**
1. Navigate to `/reservation` page
2. Switch to **Grid View**
3. Inspect card heights (should all be 280px)
4. Switch to **List View**
5. Inspect row heights (should all be 80px)

**Expected Results:**
- ✅ Grid: All cards exactly 280px height
- ✅ List: All rows exactly 80px height
- ✅ Long titles truncated with ellipsis (no height overflow)
- ✅ No layout shift when scrolling
- ✅ Purchased items same height as active items

---

### Scenario 4: Grouping with Virtual Scrolling

**Setup:**
Create 80 reservations across 5 different owners (16 per owner)

**Test:**
1. Navigate to `/reservation` page
2. Verify owner group headers are visible
3. Scroll through all groups
4. Check that purchased items appear at bottom of each group

**Expected Results:**
- ✅ Owner group headers remain visible
- ✅ Active reservations render first in each group
- ✅ Purchased items render at bottom of each group (grayed out)
- ✅ Smooth scrolling between groups
- ✅ No visual artifacts during scroll

---

### Scenario 5: Filter Changes with Virtual Scrolling

**Setup:**
Create 100 reservations with:
- Multiple owners
- Various dates
- Mix of active/purchased items

**Test:**
1. Navigate to `/reservation` page (100 items, virtual scrolling active)
2. Apply owner filter → reduces to 30 items
3. Verify virtual scrolling DEACTIVATES (< 50 items)
4. Clear filter → back to 100 items
5. Verify virtual scrolling REACTIVATES

**Expected Results:**
- ✅ Virtual scrolling toggles based on filtered count
- ✅ No flash of unstyled content during toggle
- ✅ Smooth transition between modes
- ✅ Scroll position resets to top when filters change

---

### Scenario 6: Selection Mode with Virtual Scrolling

**Setup:**
Create 100 reservations

**Test:**
1. Navigate to `/reservation` page
2. Enable selection mode
3. Scroll to middle of list
4. Select 5 items
5. Scroll to bottom
6. Select 5 more items
7. Verify selected count shows 10

**Expected Results:**
- ✅ Checkboxes render correctly in virtual scrolling
- ✅ Selection state persists for items scrolled out of view
- ✅ Selected count updates correctly
- ✅ Can select items across multiple scroll positions
- ✅ Bulk actions work with virtually scrolled items

---

### Scenario 7: Mobile Performance (375px viewport)

**Setup:**
- Create 100 reservations
- Set browser viewport to 375px width (iPhone SE)

**Test:**
1. Navigate to `/reservation` page
2. Test scrolling performance
3. Switch between grid/list views
4. Apply filters

**Expected Results:**
- ✅ 60fps scrolling on mobile viewport
- ✅ Touch scrolling feels smooth
- ✅ No horizontal overflow
- ✅ Grid view: 1 column on mobile (280px cards)
- ✅ List view: Compact rows (80px height)

---

## Creating Test Data

### Option 1: Manual Creation
Use the application UI to create reservations (time-consuming for 50+ items)

### Option 2: Database Seed Script
Create a seed script to generate test reservations:

```typescript
// scripts/seed-reservations.ts
import { db } from '@/lib/db';

async function seedReservations(count: number, userId: string) {
  for (let i = 0; i < count; i++) {
    const wish = await db.wish.create({
      data: {
        title: `Test Item ${i + 1}`,
        ownerId: 'owner-user-id',
        wishLevel: Math.floor(Math.random() * 3) + 1,
      }
    });

    await db.reservation.create({
      data: {
        wishId: wish.id,
        userId: userId,
        purchasedAt: i % 5 === 0 ? new Date() : null, // 20% purchased
      }
    });
  }
}

// Run: npx ts-node scripts/seed-reservations.ts
```

### Option 3: API Automation
Use browser console or Postman to create reservations via API

---

## Troubleshooting

### Issue: Virtual scrolling not activating
**Check:**
- Filtered reservation count (must be ≥ 50)
- Browser console for errors
- Component implementation in `reservations-display.tsx`

### Issue: Janky scrolling
**Check:**
- Fixed heights enforced (280px grid, 80px list)
- No dynamic height calculations during scroll
- CSS `contain: strict` applied to items

### Issue: Items not rendering
**Check:**
- `overscan: 5` in virtualizer config
- Parent container has defined height
- Scroll element ref is attached correctly

### Issue: Layout shift during scroll
**Check:**
- All cards have fixed height (no auto height)
- Images have `aspect-ratio` CSS
- Text truncation with ellipsis (no wrapping)

---

## Success Criteria

- [ ] Virtual scrolling activates at 50+ filtered items
- [ ] 60fps scrolling with 100+ reservations
- [ ] Fixed heights: Grid 280px, List 80px
- [ ] No layout shift during scroll
- [ ] Grouping works correctly with virtual scrolling
- [ ] Filter changes toggle virtual scrolling appropriately
- [ ] Selection mode works with virtual scrolling
- [ ] Mobile performance meets 60fps target
- [ ] Memory usage stays under 100MB increase
- [ ] No visual artifacts or flashing

---

## Performance Benchmarks

| Metric | Target | Notes |
|--------|--------|-------|
| Activation threshold | 50 items | Per spec |
| Scroll FPS | ≥60fps | Smooth scrolling |
| Memory increase | <100MB | During scroll |
| Fixed height (grid) | 280px | No variation |
| Fixed height (list) | 80px | No variation |
| Overscan items | 5 | Buffer for smooth scroll |
| Initial render | <2s | First contentful paint |

---

## Reporting Results

Document test results in the plan:
- Update PHASE 7.3 checkbox in `plans/RESERVATIONS_REFACTOR.md`
- Note any issues found
- Attach performance screenshots if needed
- Report FPS and memory metrics

**Reference:** PHASE 7.1 (lines 1467-1547) in RESERVATIONS_REFACTOR.md for implementation details.
