# Mobile Testing Checklist - Reservations Feature

## Overview

This checklist ensures the reservations feature works flawlessly on mobile devices, meeting the mobile-first requirements for gthanks. All items must pass before merging to main.

**Critical Viewports:**
- **375px** - iPhone SE (minimum supported)
- **768px** - iPad / Tablet
- **1024px** - Desktop

**Test URL:** `/profile/reservations`

---

## Pre-Test Setup

### 1. Test Environment

```bash
# Start dev server
pnpm dev

# Open browser console (F12)
# Set device emulation to "Responsive"
# Test each viewport width manually
```

### 2. Test Data Requirements

- [ ] At least 50 reservations in database (for virtual scrolling test)
- [ ] Mix of statuses: active, purchased, cancelled
- [ ] Mix of priority levels: 1, 2, 3
- [ ] At least 10 reservations from different lists/owners

### 3. Browser DevTools Setup

```
1. Open DevTools (F12)
2. Toggle Device Toolbar (Ctrl+Shift+M / Cmd+Shift+M)
3. Select "Responsive" mode
4. Set viewport width manually
5. Disable browser cache (Network tab → Disable cache)
6. Enable paint flashing (Rendering tab → Paint flashing)
```

---

## 375px Viewport (iPhone SE) - Critical Tests

### Layout & Structure

- [ ] **No horizontal scrolling** at any point
  - Test: Scroll down entire page, verify no horizontal scrollbar
  - Test: Click all interactive elements, verify nothing triggers horizontal scroll
  - Expected: Page width exactly 375px, no overflow

- [ ] **Page header is responsive**
  - Test: Check "Reservations" heading is visible
  - Test: Verify filter toggle button is visible in top-right
  - Expected: All text fits within viewport, no wrapping issues

### Filter Panel (Mobile Bottom Sheet)

- [ ] **Filter panel is hidden by default**
  - Test: Page loads with filter panel closed
  - Expected: Full list visible, no overlay

- [ ] **Filter toggle button is visible and accessible**
  - Test: Locate filter button (top-right or floating action button)
  - Measure: Button is at least 44x44px
  - Expected: Clear icon (funnel/filter), easy to tap

- [ ] **Filter panel slides in from bottom**
  - Test: Tap filter button
  - Expected: Panel animates up from bottom with smooth transition
  - Check: No jank or frame drops during animation

- [ ] **Filter panel overlay dims background**
  - Test: When filter panel open, verify dark overlay behind it
  - Expected: 50% opacity black overlay, tappable to close

- [ ] **Filter panel is scrollable if content overflows**
  - Test: Open all filter sections (Status, Priority, Lists)
  - Expected: Panel content scrolls independently of background

- [ ] **Close button is accessible**
  - Test: Tap "X" or "Close" button in filter panel
  - Measure: Button is at least 44x44px
  - Expected: Panel slides down and closes

- [ ] **Tap outside closes filter panel**
  - Test: Open filter panel, tap dimmed background
  - Expected: Panel closes smoothly

### Search Input

- [ ] **Search input is at least 44px tall**
  - Measure: Input height = 44px minimum
  - Expected: Easy to tap on mobile

- [ ] **Search icon is visible**
  - Test: Verify search icon (magnifying glass) on left side
  - Expected: Icon clearly visible, proper alignment

- [ ] **Placeholder text is readable**
  - Test: Read placeholder "Search by wish or list..."
  - Expected: Text not cut off, proper contrast

- [ ] **Keyboard opens correctly**
  - Test: Tap search input on real device
  - Expected: Keyboard slides up, input stays visible (not hidden behind keyboard)

- [ ] **Clear button appears when typing**
  - Test: Type "bike" in search
  - Expected: X button appears on right side to clear input

### View Toggle

- [ ] **View toggle is visible**
  - Test: Locate grid/list toggle buttons
  - Expected: Both icons visible, clear which is active

- [ ] **Toggle buttons are at least 44x44px**
  - Measure: Each button is 44x44px minimum
  - Expected: Easy to tap without mis-taps

- [ ] **Active state is visually clear**
  - Test: Toggle between grid and list view
  - Expected: Active button has distinct background/border

### Selection Mode

- [ ] **Checkbox is at least 24x24px**
  - Measure: Checkbox size = 24x24px minimum
  - Expected: Checkbox has 10px padding around it for larger tap target (total 44x44px)

- [ ] **"Select" button is accessible**
  - Measure: Button is at least 44x44px
  - Expected: Clear label, easy to tap

- [ ] **Selection mode activates**
  - Test: Tap "Select" button
  - Expected: Checkboxes appear on all reservation cards

- [ ] **Checkboxes are tappable**
  - Test: Tap checkbox on first 3 cards
  - Expected: Cards highlight, count updates

### Bulk Actions Bar

- [ ] **Bulk actions bar appears at bottom**
  - Test: Select 2+ reservations
  - Expected: Fixed bar appears at bottom of screen

- [ ] **Bulk actions bar doesn't cover content**
  - Test: Scroll to bottom of list
  - Expected: Last reservation visible above bulk actions bar

- [ ] **Action buttons are accessible**
  - Test: Verify "Mark Purchased", "Cancel", etc. buttons
  - Measure: Each button at least 44x44px
  - Expected: All buttons fit in bar without wrapping

- [ ] **Selected count is visible**
  - Test: Select 5 reservations
  - Expected: "5 selected" text clearly visible

- [ ] **Cancel selection works**
  - Test: Tap "Cancel" or "X" in bulk actions bar
  - Expected: Selection mode exits, checkboxes disappear

### Grid View

- [ ] **Cards are single column**
  - Test: Switch to grid view
  - Expected: 1 card per row on 375px width

- [ ] **Cards don't overflow horizontally**
  - Measure: Card width < 375px (accounting for padding)
  - Expected: No horizontal scroll

- [ ] **Card content is readable**
  - Test: Read wish title, list name, price on cards
  - Expected: Text not truncated excessively, important info visible

- [ ] **Card tap targets work**
  - Test: Tap card to view details
  - Test: Tap action buttons (Edit, Delete) on card
  - Expected: All interactions work without mis-taps

### List View

- [ ] **Rows are single column**
  - Test: Switch to list view
  - Expected: Each row displays key info, no overflow

- [ ] **Text truncation is appropriate**
  - Test: Long wish titles
  - Expected: Title truncates with "..." but first 20+ chars visible

- [ ] **Row actions are accessible**
  - Test: Tap menu icon (3 dots) on row
  - Expected: Dropdown menu appears with actions

### Virtual Scrolling

- [ ] **Scrolling is smooth (no jank)**
  - Test: Flick scroll quickly through 50+ reservations
  - Check: DevTools Performance tab shows 60fps
  - Expected: No stuttering, consistent frame rate

- [ ] **Items load as you scroll**
  - Test: Scroll to bottom quickly
  - Expected: New items appear, no long blank areas

- [ ] **Scroll position maintains when scrolling back**
  - Test: Scroll to middle, scroll up, scroll back down
  - Expected: Items re-appear instantly, no re-fetching

- [ ] **Overscan works (items render slightly off-screen)**
  - Test: Scroll slowly and watch items appear
  - Expected: Items render ~1-2 screens before visible (smooth experience)

### Dialogs & Modals

- [ ] **Edit dialog is readable**
  - Test: Tap "Edit" on a reservation
  - Expected: Dialog fits on screen, all fields visible

- [ ] **Form inputs are accessible**
  - Test: Tap each input in edit dialog
  - Measure: Inputs are at least 44px tall
  - Expected: Easy to tap, keyboard doesn't hide inputs

- [ ] **Buttons in dialogs are accessible**
  - Test: Tap "Save", "Cancel" buttons
  - Measure: Buttons at least 44x44px
  - Expected: Easy to tap without mis-taps

- [ ] **Dialogs close properly**
  - Test: Tap outside dialog, tap "X" button, tap "Cancel"
  - Expected: All methods close dialog smoothly

### Performance

- [ ] **Page loads in under 2 seconds**
  - Test: Hard refresh (Ctrl+Shift+R)
  - Measure: DevTools Network tab → Load time
  - Expected: < 2s on 3G connection

- [ ] **Images load progressively**
  - Test: Watch wish images load
  - Expected: Placeholder → blurred → sharp (or skeleton → image)

- [ ] **No memory leaks**
  - Test: Scroll for 2 minutes continuously
  - Check: DevTools Memory tab → Heap size
  - Expected: Memory usage stabilizes, doesn't grow unbounded

---

## 768px Viewport (iPad) - Tablet Tests

### Layout Changes

- [ ] **Mobile filter toggle hidden**
  - Test: Check top-right corner
  - Expected: No filter toggle button (desktop panel appears instead)

- [ ] **Desktop filter panel appears on left**
  - Test: Verify left sidebar with filters
  - Expected: Panel is visible, ~280px wide

- [ ] **Filter panel is not collapsible on tablet**
  - Test: Look for collapse button
  - Expected: Panel always visible (no toggle)

### Grid View

- [ ] **Grid shows 2 columns**
  - Test: Switch to grid view
  - Expected: 2 cards per row

- [ ] **Cards are evenly spaced**
  - Measure: Gap between columns is consistent
  - Expected: Equal margins, no awkward spacing

- [ ] **Cards don't overflow**
  - Test: Check horizontal scroll
  - Expected: No overflow, cards fit perfectly in 2 columns

### Touch Targets

- [ ] **Touch targets still comfortable**
  - Measure: Buttons still 44x44px minimum
  - Expected: Tablet users can tap easily (not too small)

### List View

- [ ] **More columns visible in list view**
  - Test: Switch to list view
  - Expected: Additional columns like "Date Added", "Notes" visible

- [ ] **Table scrolls horizontally if needed**
  - Test: Check if table is wider than viewport
  - Expected: Horizontal scroll only if table exceeds 768px

---

## 1024px Viewport (Desktop) - Full Tests

### Layout

- [ ] **Filter panel on left (280px wide)**
  - Measure: Panel width = 280px
  - Expected: Fixed width, doesn't collapse

- [ ] **Main content area uses remaining space**
  - Measure: Content area = viewport width - 280px
  - Expected: No wasted space, efficient layout

### Grid View

- [ ] **Grid shows 3-4 columns**
  - Test: Switch to grid view
  - Expected: 3 columns at 1024px, 4 columns at 1280px+

- [ ] **Cards are compact but readable**
  - Test: Read card content
  - Expected: All key info visible, not cramped

### Desktop Controls

- [ ] **All desktop controls visible**
  - Test: Verify filter panel, search, view toggle, bulk actions
  - Expected: Everything visible simultaneously

- [ ] **Keyboard navigation works**
  - Test: Tab through inputs, filters, buttons
  - Expected: Focus ring visible, logical tab order

- [ ] **Hover states work**
  - Test: Hover over cards, buttons, filters
  - Expected: Visual feedback (color change, shadow, etc.)

---

## Cross-Viewport Tests

### Responsive Transitions

- [ ] **Smooth transition when resizing**
  - Test: Resize browser from 375px → 768px → 1024px
  - Expected: Layout adapts smoothly, no sudden jumps

- [ ] **Filter panel transitions correctly**
  - Test: Resize from 375px to 768px while filter panel open
  - Expected: Mobile bottom sheet → desktop left panel smoothly

- [ ] **Grid columns adjust responsively**
  - Test: Resize viewport width slowly from 375px to 1280px
  - Expected: Columns increase (1 → 2 → 3 → 4) at correct breakpoints

### Common Elements

- [ ] **No horizontal scroll at any breakpoint**
  - Test: 375px, 400px, 640px, 768px, 1024px, 1280px
  - Expected: Zero horizontal scroll at every tested width

- [ ] **Text is always readable**
  - Test: Check font sizes at all breakpoints
  - Expected: Minimum 14px body text, 16px headings

- [ ] **Images scale properly**
  - Test: Wish images in cards
  - Expected: Images maintain aspect ratio, no distortion

---

## Browser/Device Testing Matrix

### Required Tests (Before Merge)

| Device/Browser       | Viewport | Pass/Fail | Notes |
| -------------------- | -------- | --------- | ----- |
| Chrome DevTools      | 375px    | ⬜        |       |
| Chrome DevTools      | 768px    | ⬜        |       |
| Chrome DevTools      | 1024px   | ⬜        |       |
| iPhone SE (real)     | 375px    | ⬜        |       |
| iPad (real)          | 768px    | ⬜        |       |
| Safari iOS (iPhone)  | 375px    | ⬜        |       |
| Chrome Android       | 375px    | ⬜        |       |

### Optional Tests (Nice to Have)

| Device/Browser    | Viewport | Pass/Fail | Notes |
| ----------------- | -------- | --------- | ----- |
| Firefox DevTools  | 375px    | ⬜        |       |
| Safari macOS      | 1024px   | ⬜        |       |
| Edge              | 1024px   | ⬜        |       |
| Samsung Internet  | 375px    | ⬜        |       |

---

## Common Issues & Troubleshooting

### Issue: Horizontal Scroll Appears

**Symptoms:**
- Content overflows viewport width
- Horizontal scrollbar visible
- Cards or text cut off

**Check:**
1. Inspect element with horizontal overflow using DevTools
2. Look for fixed widths (e.g., `width: 400px` on mobile)
3. Check for large images without `max-width: 100%`
4. Verify padding/margin doesn't exceed viewport

**Fix:**
```css
/* Ensure container doesn't exceed viewport */
.container {
  max-width: 100%;
  overflow-x: hidden;
}

/* Images should scale */
img {
  max-width: 100%;
  height: auto;
}
```

### Issue: Touch Targets Too Small

**Symptoms:**
- Hard to tap buttons on mobile
- Mis-taps common
- Users complain about UI being "fiddly"

**Check:**
1. Measure button/link dimensions in DevTools
2. Check if clickable area includes padding
3. Verify minimum 44x44px per Apple HIG

**Fix:**
```css
/* Ensure minimum touch target */
.button {
  min-width: 44px;
  min-height: 44px;
  padding: 12px; /* Increases tap area */
}
```

### Issue: Virtual Scrolling Jank

**Symptoms:**
- Stuttering when scrolling
- Frame drops visible
- Blank areas during fast scroll

**Check:**
1. DevTools Performance tab → Record scrolling
2. Check for layout thrashing
3. Verify overscan settings in virtual scroller

**Fix:**
```typescript
// Increase overscan to render more items off-screen
<VirtualScroller
  overscan={5} // Render 5 items above/below viewport
/>
```

### Issue: Filter Panel Doesn't Slide Smoothly

**Symptoms:**
- Panel appears instantly (no animation)
- Jerky motion when opening/closing
- Overlay doesn't dim smoothly

**Check:**
1. Verify CSS transitions are applied
2. Check for `will-change` property
3. Test on real device (not just emulator)

**Fix:**
```css
/* Smooth slide-in transition */
.filter-panel {
  transition: transform 0.3s ease-out;
  will-change: transform;
}

/* Smooth overlay fade */
.overlay {
  transition: opacity 0.3s ease-out;
}
```

### Issue: Keyboard Covers Input on Mobile

**Symptoms:**
- Input field hidden behind keyboard
- Can't see what you're typing
- Form submit button not visible

**Check:**
1. Test on real device (not DevTools)
2. Verify viewport meta tag includes `viewport-fit=cover`
3. Check if page scrolls when input focused

**Fix:**
```typescript
// Scroll input into view when focused
inputRef.current?.scrollIntoView({ behavior: 'smooth', block: 'center' });
```

---

## Screenshot Checklist

Take screenshots at each viewport for documentation:

### 375px (iPhone SE)

- [ ] `/screenshots/mobile-375-default.png` - Default page state
- [ ] `/screenshots/mobile-375-filter-open.png` - Filter panel open
- [ ] `/screenshots/mobile-375-grid-view.png` - Grid view
- [ ] `/screenshots/mobile-375-list-view.png` - List view
- [ ] `/screenshots/mobile-375-selection-mode.png` - Bulk selection active
- [ ] `/screenshots/mobile-375-edit-dialog.png` - Edit reservation dialog

### 768px (iPad)

- [ ] `/screenshots/tablet-768-default.png` - Default page state
- [ ] `/screenshots/tablet-768-grid-view.png` - Grid view (2 columns)
- [ ] `/screenshots/tablet-768-list-view.png` - List view

### 1024px (Desktop)

- [ ] `/screenshots/desktop-1024-default.png` - Default page state
- [ ] `/screenshots/desktop-1024-grid-view.png` - Grid view (3-4 columns)
- [ ] `/screenshots/desktop-1024-filters-applied.png` - Filters active

---

## Performance Benchmarks

### Load Time Targets

| Metric               | Target | Actual | Pass/Fail |
| -------------------- | ------ | ------ | --------- |
| First Contentful Paint (FCP) | < 1.5s | | ⬜ |
| Largest Contentful Paint (LCP) | < 2.5s | | ⬜ |
| Time to Interactive (TTI) | < 3s | | ⬜ |
| Cumulative Layout Shift (CLS) | < 0.1 | | ⬜ |

### Scrolling Performance

| Metric | Target | Actual | Pass/Fail |
| ------ | ------ | ------ | --------- |
| Frame rate during scroll | 60fps | | ⬜ |
| Scroll responsiveness | < 100ms | | ⬜ |
| Memory usage (after 2min scroll) | < 100MB increase | | ⬜ |

---

## Accessibility Checks

### Screen Reader

- [ ] **Filter button has aria-label**
  - Test: Inspect filter toggle button
  - Expected: `aria-label="Open filters"` or similar

- [ ] **Search input has label**
  - Test: Inspect search input
  - Expected: `<label>` element or `aria-label`

- [ ] **Card actions have labels**
  - Test: Inspect icon-only buttons
  - Expected: `aria-label` on all icon buttons

### Keyboard Navigation

- [ ] **Tab order is logical**
  - Test: Tab through page
  - Expected: Search → Filters → Cards in reading order

- [ ] **Focus indicators visible**
  - Test: Tab to each interactive element
  - Expected: Clear focus ring on all elements

- [ ] **Enter/Space activate buttons**
  - Test: Focus button, press Enter or Space
  - Expected: Button activates (same as click)

---

## Final Approval Checklist

Before merging to main:

- [ ] All 375px tests pass
- [ ] All 768px tests pass
- [ ] All 1024px tests pass
- [ ] No horizontal scroll at any viewport
- [ ] All touch targets meet 44x44px minimum
- [ ] Virtual scrolling is smooth (60fps)
- [ ] Real device testing completed (iPhone + Android)
- [ ] Screenshots captured and documented
- [ ] Performance benchmarks met
- [ ] Accessibility checks pass
- [ ] Code review completed
- [ ] E2E tests pass for reservations feature

**Tested by:** _______________
**Date:** _______________
**Approved by:** _______________

---

## Resources

- [Apple Human Interface Guidelines - Touch Targets](https://developer.apple.com/design/human-interface-guidelines/ios/visual-design/adaptivity-and-layout/)
- [Material Design - Touch Targets](https://m2.material.io/design/usability/accessibility.html#layout-and-typography)
- [Web Content Accessibility Guidelines (WCAG)](https://www.w3.org/WAI/WCAG21/quickref/)
- [Chrome DevTools - Device Mode](https://developer.chrome.com/docs/devtools/device-mode/)
- [Lighthouse Performance Scoring](https://web.dev/performance-scoring/)

---

**Last Updated:** 2025-11-22
**Version:** 1.0
**Status:** Ready for use ✅
