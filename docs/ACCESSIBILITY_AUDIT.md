# Accessibility Audit Guide - Reservations Feature

## Overview

This guide provides a comprehensive accessibility audit framework for the gthanks reservations feature. All components must pass both **WCAG 2.1 AA compliance** and the **"Grandma Test"** (non-technical user clarity).

**Audit Frequency:**
- Before each release (manual testing)
- On every commit (automated axe-core)
- Monthly comprehensive audit (full screen reader testing)

**Pass Criteria:**
- Zero critical WCAG violations
- All features keyboard accessible
- Clear, non-technical language
- Touch targets meet minimum size (44x44px)
- Screen reader compatible

---

## Testing Methodology

### 1. Automated Testing

Run automated accessibility checks first to catch low-hanging fruit:

```bash
# Install axe DevTools browser extension
# Chrome: https://chrome.google.com/webstore/detail/axe-devtools-web-accessib/lhdoppojpmngadmnindnejefpokejbdd
# Firefox: https://addons.mozilla.org/en-US/firefox/addon/axe-devtools/

# Install axe-core for automated tests (already in project)
pnpm add -D @axe-core/playwright

# Run Playwright with accessibility checks
pnpm test:e2e tests/e2e/reservations/accessibility.spec.ts
```

### 2. Manual Testing

**Keyboard Navigation:**
1. Disconnect mouse/trackpad
2. Navigate using only keyboard:
   - `Tab` to move forward
   - `Shift+Tab` to move backward
   - `Enter` to activate buttons
   - `Space` to toggle checkboxes
   - Arrow keys for lists/menus
3. Verify all interactive elements are reachable
4. Verify focus indicators are visible

**Screen Reader Testing:**
1. **macOS**: Enable VoiceOver (`Cmd+F5`)
2. **Windows**: Install NVDA (free)
3. **Mobile**: Enable TalkBack (Android) or VoiceOver (iOS)
4. Navigate through all features
5. Verify announcements are clear and helpful

**Visual Testing:**
1. Zoom to 200% (minimum)
2. Test with Windows High Contrast Mode
3. Test with Dark Mode enabled
4. Check color contrast ratios

### 3. Mobile Testing

Test on real devices:
- **Minimum viewport**: iPhone SE (375px width)
- Touch target size: 44x44px minimum
- Swipe gestures work
- Modals are fully visible

---

## Tools & Setup

### Required Tools

| Tool                  | Purpose                        | Download                                  |
| --------------------- | ------------------------------ | ----------------------------------------- |
| **axe DevTools**      | Automated WCAG scanning        | Browser extension (Chrome/Firefox/Edge)   |
| **NVDA**              | Windows screen reader          | https://www.nvaccess.org/download/        |
| **VoiceOver**         | macOS screen reader            | Built-in (Cmd+F5)                         |
| **TalkBack**          | Android screen reader          | Built-in (Settings > Accessibility)       |
| **Lighthouse**        | Accessibility score            | Built-in Chrome DevTools                  |
| **Color Contrast**    | Contrast ratio checker         | https://colorcontra.st                    |
| **HeadingsMap**       | Heading structure verification | Browser extension                         |
| **WAVE**              | Visual accessibility inspector | https://wave.webaim.org/extension/        |
| **Accessibility Insights** | Guided manual testing    | https://accessibilityinsights.io/         |

### Browser Setup

**Chrome DevTools:**
```
1. Open DevTools (F12)
2. Go to Lighthouse tab
3. Select "Accessibility" category
4. Generate report
```

**Firefox Accessibility Inspector:**
```
1. Open DevTools (F12)
2. Go to Accessibility tab
3. Enable "Check for issues"
4. Inspect element tree
```

---

## WCAG 2.1 AA Requirements

### Perceivable

#### 1.1 Text Alternatives
- [ ] All images have `alt` text
- [ ] Decorative images use `alt=""` or `aria-hidden="true"`
- [ ] Icons have accessible names (`aria-label` or text)

#### 1.3 Adaptable
- [ ] Semantic HTML structure (`<nav>`, `<main>`, `<section>`)
- [ ] Proper heading hierarchy (h1 > h2 > h3)
- [ ] Tables use `<th>` and `scope` attributes
- [ ] Lists use `<ul>`, `<ol>`, `<li>`

#### 1.4 Distinguishable
- [ ] **Color contrast**: 4.5:1 for normal text, 3:1 for large text
- [ ] **Focus indicators**: Visible on all interactive elements
- [ ] **No information by color alone**: Use icons + text
- [ ] **Text resize**: Page usable at 200% zoom
- [ ] **Touch targets**: Minimum 44x44px

### Operable

#### 2.1 Keyboard Accessible
- [ ] All functionality available via keyboard
- [ ] No keyboard traps (can Tab out of all elements)
- [ ] Logical tab order
- [ ] Skip links for main content

#### 2.2 Enough Time
- [ ] No time limits on actions
- [ ] Dismissible notifications

#### 2.4 Navigable
- [ ] Descriptive page titles (`<title>`)
- [ ] Breadcrumbs for navigation
- [ ] Clear focus order
- [ ] Descriptive link text (no "click here")

### Understandable

#### 3.1 Readable
- [ ] Language declared (`<html lang="en">`)
- [ ] Plain English (no jargon)
- [ ] Clear instructions

#### 3.2 Predictable
- [ ] Consistent navigation
- [ ] No unexpected context changes
- [ ] Consistent labeling

#### 3.3 Input Assistance
- [ ] Labels for all form fields
- [ ] Error identification (what went wrong)
- [ ] Error suggestions (how to fix it)
- [ ] Error prevention (confirmation dialogs)

### Robust

#### 4.1 Compatible
- [ ] Valid HTML (no duplicate IDs)
- [ ] Proper ARIA usage
- [ ] Name, Role, Value for custom controls

---

## Grandma Test Principles

### Language Guidelines

**DO:**
- Use conversational language: "You've reserved 3 gifts"
- Action-oriented copy: "Mark as purchased"
- Clear instructions: "Click the date to change when you bought it"
- Friendly errors: "We couldn't save that. Try again?"

**DON'T:**
- Technical jargon: ~~"Reservation entity updated"~~
- Passive voice: ~~"Purchase recorded"~~
- Cryptic labels: ~~"Tx date"~~
- Developer speak: ~~"Error 422: Validation failed"~~

### Visual Clarity

**DO:**
- Use icons + text labels
- Show examples in placeholders
- Progress indicators for loading
- Success confirmations (green checkmark)

**DON'T:**
- Icon-only buttons (without accessible text)
- Abbreviations without expansion
- Ambiguous states ("Pending" vs "Processing")

### Error Messages

**Good Example:**
```
Title: "Oops! Couldn't save that"
Message: "Make sure the purchase date isn't in the future."
Action: [Try Again] [Cancel]
```

**Bad Example:**
```
Title: "Error"
Message: "Invalid date format"
Action: [OK]
```

---

## Feature-Specific Audits

### 1. Breadcrumbs Navigation

**Location:** `src/components/reservations/Breadcrumbs.tsx`

**Visual Structure:**
```
Lists > Birthday List > Reserved Gifts
       ➜             ➜
```

#### Audit Checklist

- [ ] **Semantic HTML**: Uses `<nav aria-label="Breadcrumb">`
- [ ] **Screen reader text**: ArrowRight icon has `aria-hidden="true"`
- [ ] **Link accessibility**: Each crumb is a focusable `<a>` or `<Link>`
- [ ] **Current page**: Last crumb uses `aria-current="page"`
- [ ] **Keyboard navigation**: Tab moves through crumbs sequentially
- [ ] **Touch targets**: Minimum 44x44px tap area
- [ ] **Color contrast**: Text meets 4.5:1 ratio

#### Test Script

**Screen Reader Test:**
```
Expected announcement: "Breadcrumb navigation, Lists link, Birthday List link, Reserved Gifts current page"
```

**Keyboard Test:**
```
1. Tab to first breadcrumb
2. Press Enter → navigates to Lists
3. Shift+Tab back
4. Tab through all crumbs
```

#### Common Issues

| Issue                       | Fix                                            |
| --------------------------- | ---------------------------------------------- |
| Icon read as "image"        | Add `aria-hidden="true"` to ArrowRight         |
| Links not focusable         | Ensure `href` attribute exists                 |
| Current page is a link      | Remove link, add `aria-current="page"`         |
| No breadcrumb landmark      | Wrap in `<nav aria-label="Breadcrumb">`        |
| Poor contrast on separators | Use CSS to increase color contrast             |

#### Example Fix

```tsx
// ✅ Accessible breadcrumbs
<nav aria-label="Breadcrumb">
  <ol className="flex items-center gap-2">
    <li>
      <Link href="/lists" className="text-blue-600 hover:underline">
        Lists
      </Link>
    </li>
    <li aria-hidden="true" className="text-gray-400">
      <ArrowRight className="h-4 w-4" />
    </li>
    <li>
      <Link href={`/lists/${listId}`} className="text-blue-600 hover:underline">
        {listName}
      </Link>
    </li>
    <li aria-hidden="true" className="text-gray-400">
      <ArrowRight className="h-4 w-4" />
    </li>
    <li aria-current="page" className="text-gray-900 font-medium">
      Reserved Gifts
    </li>
  </ol>
</nav>
```

---

### 2. Reservation Checkboxes

**Location:** `src/components/reservations/ReservationCheckbox.tsx`

**Conditional Rendering:**
- Read-only mode: Hidden (no checkbox)
- Bulk actions enabled: Visible checkbox

#### Audit Checklist

- [ ] **Hidden vs disabled**: Hidden reservations don't render checkbox (not `disabled`)
- [ ] **Label association**: `<label htmlFor={id}>` matches checkbox `id`
- [ ] **Accessible name**: Clear label text (e.g., "Select Red Bike")
- [ ] **Checked state**: `aria-checked` reflects state
- [ ] **Keyboard interaction**: Space toggles, Enter activates
- [ ] **Focus indicator**: Visible outline on focus
- [ ] **Touch target**: 44x44px minimum (including label)

#### Test Script

**Screen Reader Test:**
```
Expected: "Select Red Bike, checkbox, not checked"
After toggle: "Select Red Bike, checkbox, checked"
```

**Keyboard Test:**
```
1. Tab to checkbox
2. Press Space → toggles checked state
3. Tab away → focus moves to next element
```

#### Common Issues

| Issue                        | Fix                                     |
| ---------------------------- | --------------------------------------- |
| Checkbox announced as "undefined" | Add `aria-label` or visible `<label>` |
| Space key doesn't toggle     | Use native `<input type="checkbox">`    |
| Focus indicator missing      | Add CSS: `focus:ring-2 focus:ring-blue-500` |
| Touch target too small       | Increase padding, use `p-2` or larger   |
| Disabled instead of hidden   | Use conditional rendering, not `disabled` |

#### Example Fix

```tsx
// ✅ Accessible checkbox
{canSelect && (
  <div className="flex items-center p-2">
    <input
      type="checkbox"
      id={`reservation-${reservation.id}`}
      checked={isSelected}
      onChange={(e) => onToggle(reservation.id, e.target.checked)}
      className="h-5 w-5 rounded border-gray-300 focus:ring-2 focus:ring-blue-500"
      aria-label={`Select ${reservation.wish.title}`}
    />
    <label htmlFor={`reservation-${reservation.id}`} className="sr-only">
      Select {reservation.wish.title}
    </label>
  </div>
)}
```

---

### 3. Bulk Actions Bar

**Location:** `src/components/reservations/BulkActionsBar.tsx`

**Features:**
- Selected count display
- "Mark as Purchased" button
- "Remove Reservations" button
- Keyboard shortcuts (optional)

#### Audit Checklist

- [ ] **Live region**: Selected count uses `aria-live="polite"`
- [ ] **Button labels**: Descriptive text (not icon-only)
- [ ] **Disabled state**: `aria-disabled="true"` when no selection
- [ ] **Keyboard shortcuts**: Documented and accessible
- [ ] **Focus management**: Focus moves to action result
- [ ] **Touch targets**: Buttons meet 44x44px minimum
- [ ] **Color contrast**: Disabled state still readable (3:1 ratio)

#### Test Script

**Screen Reader Test:**
```
Select 1 item: "1 gift selected"
Select 2 items: "2 gifts selected"
Click "Mark as Purchased": "Marked 2 gifts as purchased"
```

**Keyboard Test:**
```
1. Tab to "Mark as Purchased" button
2. Press Enter → Opens purchase date dialog
3. Dialog receives focus
4. After action: Focus returns to table or toast
```

#### Common Issues

| Issue                          | Fix                                        |
| ------------------------------ | ------------------------------------------ |
| Count updates not announced    | Use `aria-live="polite"` on count element  |
| Buttons active when no selection | Disable buttons, add `aria-disabled="true"` |
| Icon-only buttons              | Add `aria-label` or visible text           |
| Focus lost after action        | Manually set focus to toast or table       |
| Disabled buttons too faint     | Ensure 3:1 contrast ratio for disabled state |

#### Example Fix

```tsx
// ✅ Accessible bulk actions bar
<div className="sticky bottom-0 border-t bg-white p-4 shadow-lg">
  <div className="flex items-center justify-between">
    <div aria-live="polite" aria-atomic="true">
      <span className="font-medium">
        {selectedCount} {selectedCount === 1 ? 'gift' : 'gifts'} selected
      </span>
    </div>
    <div className="flex gap-2">
      <Button
        onClick={handleMarkAsPurchased}
        disabled={selectedCount === 0}
        aria-disabled={selectedCount === 0}
        aria-label={`Mark ${selectedCount} selected gifts as purchased`}
      >
        <ShoppingBag className="mr-2 h-4 w-4" aria-hidden="true" />
        Mark as Purchased
      </Button>
      <Button
        variant="destructive"
        onClick={handleRemove}
        disabled={selectedCount === 0}
        aria-disabled={selectedCount === 0}
        aria-label={`Remove ${selectedCount} selected reservations`}
      >
        <Trash className="mr-2 h-4 w-4" aria-hidden="true" />
        Remove
      </Button>
    </div>
  </div>
</div>
```

---

### 4. Filter Panel (Desktop) / Sheet (Mobile)

**Location:** `src/components/reservations/FilterPanel.tsx`

**Responsive Behavior:**
- Desktop (≥768px): Sidebar panel
- Mobile (<768px): Bottom sheet

#### Audit Checklist

- [ ] **Landmark role**: Panel uses `<aside>` or `role="complementary"`
- [ ] **Heading structure**: Filter sections use proper headings (h3)
- [ ] **Checkbox groups**: Use `<fieldset>` and `<legend>`
- [ ] **Mobile sheet**: Focusable close button
- [ ] **Keyboard navigation**: Tab through filters, Space toggles
- [ ] **Focus trap**: Sheet traps focus when open (mobile)
- [ ] **Screen reader**: Clear filter labels and counts
- [ ] **Touch targets**: 44x44px on mobile

#### Test Script

**Desktop - Screen Reader Test:**
```
Expected: "Filter panel, complementary landmark"
Navigate: "Purchase Status heading level 3, All Gifts checkbox not checked"
```

**Mobile - Keyboard Test:**
```
1. Open filter sheet
2. Tab → Focus moves to close button
3. Tab → Focus moves to first filter
4. Tab through all filters
5. Shift+Tab does not escape sheet (trapped)
6. Esc key closes sheet
7. Focus returns to "Filters" button
```

#### Common Issues

| Issue                         | Fix                                          |
| ----------------------------- | -------------------------------------------- |
| Sheet focus not trapped       | Use Radix UI Sheet with `trapFocus` prop     |
| No heading for filter section | Add `<h3>` for each section                  |
| Checkbox group unclear        | Wrap in `<fieldset><legend>Status</legend>`  |
| Close button missing label    | Add `aria-label="Close filters"`             |
| Mobile sheet behind content   | Ensure `z-index` and `inert` attribute       |

#### Example Fix

```tsx
// ✅ Accessible filter panel
<aside className="hidden md:block" role="complementary" aria-label="Filter reservations">
  <div className="space-y-6">
    <fieldset>
      <legend className="text-sm font-medium">Purchase Status</legend>
      <div className="mt-2 space-y-2">
        <label className="flex items-center gap-2">
          <input
            type="checkbox"
            checked={filters.showAll}
            onChange={() => onFilterChange('showAll', !filters.showAll)}
            className="h-4 w-4 rounded border-gray-300 focus:ring-2 focus:ring-blue-500"
          />
          <span>All Gifts</span>
        </label>
        {/* More checkboxes... */}
      </div>
    </fieldset>
  </div>
</aside>

{/* Mobile sheet */}
<Sheet open={isOpen} onOpenChange={setIsOpen}>
  <SheetContent side="bottom">
    <SheetHeader>
      <SheetTitle>Filter Reservations</SheetTitle>
      <SheetClose aria-label="Close filters" />
    </SheetHeader>
    {/* Same filter content */}
  </SheetContent>
</Sheet>
```

---

### 5. Empty State

**Location:** `src/components/reservations/EmptyReservationsState.tsx`

**Purpose:** Educational, not error

#### Audit Checklist

- [ ] **Semantic structure**: Uses `<section>` with heading
- [ ] **Informative heading**: "No Reserved Gifts Yet" (clear, non-technical)
- [ ] **Descriptive text**: Plain English explanation
- [ ] **Image alt text**: Decorative image uses `alt=""` or `aria-hidden="true"`
- [ ] **Call to action**: Clear next step ("Browse Wishlists")
- [ ] **Color contrast**: Text meets 4.5:1 ratio
- [ ] **Not an error**: Neutral tone, no red/warning colors

#### Test Script

**Screen Reader Test:**
```
Expected: "No Reserved Gifts Yet, heading level 2. When you reserve a gift..."
Navigate: "Browse Wishlists, button"
```

**Grandma Test:**
```
Question: "What should I do next?"
Answer from UI: "Browse wishlists to reserve gifts for your family"
Pass: ✅ Clear next action
```

#### Common Issues

| Issue                       | Fix                                         |
| --------------------------- | ------------------------------------------- |
| Technical jargon            | Use plain English ("reserved" not "allocated") |
| Error tone (red text)       | Use neutral gray, not warning colors        |
| No next action              | Add CTA button or link                      |
| Image read as "graphic"     | Add `aria-hidden="true"` to decorative SVG  |
| Poor visual hierarchy       | Use proper heading levels (h2)              |

#### Example Fix

```tsx
// ✅ Accessible empty state
<section className="flex flex-col items-center justify-center py-12 text-center">
  <div className="mb-4">
    <Gift className="h-16 w-16 text-gray-400" aria-hidden="true" />
  </div>
  <h2 className="mb-2 text-xl font-semibold text-gray-900">
    No Reserved Gifts Yet
  </h2>
  <p className="mb-6 max-w-md text-gray-600">
    When you reserve a gift for someone in your family, it will show up here.
    They won't see that you've reserved it – it's your secret!
  </p>
  <Button asChild>
    <Link href="/lists">
      Browse Wishlists
    </Link>
  </Button>
</section>
```

---

### 6. Purchase Date Picker Dialog

**Location:** Component using Radix UI Dialog + Calendar

**Workflow:**
1. User clicks "Mark as Purchased"
2. Dialog opens with date picker
3. User selects date
4. Confirms action

#### Audit Checklist

- [ ] **Dialog role**: Uses `role="dialog"` and `aria-labelledby`
- [ ] **Focus management**: Focus moves to dialog on open
- [ ] **Focus trap**: Tab cycles within dialog
- [ ] **Keyboard close**: Esc key closes dialog
- [ ] **Calendar keyboard nav**: Arrow keys navigate dates
- [ ] **Date format**: Clear format shown (MM/DD/YYYY)
- [ ] **Confirmation**: "Confirm" button has clear label
- [ ] **Cancel action**: Easy to dismiss without saving
- [ ] **Touch targets**: Calendar dates are 44x44px

#### Test Script

**Keyboard Test:**
```
1. Tab to "Mark as Purchased" button
2. Press Enter → Dialog opens
3. Focus is on calendar (today's date highlighted)
4. Arrow keys navigate dates
5. Enter selects date
6. Tab to "Confirm" button
7. Enter saves and closes dialog
8. Focus returns to table
```

**Screen Reader Test:**
```
Expected: "Mark as Purchased dialog. Select purchase date. Calendar, January 2025..."
Navigate dates: "Monday, January 15, 2025, button"
Confirm: "Confirm purchase, button"
```

#### Common Issues

| Issue                        | Fix                                           |
| ---------------------------- | --------------------------------------------- |
| Focus not trapped in dialog  | Use Radix UI Dialog (handles automatically)   |
| Calendar not keyboard accessible | Use react-day-picker with keyboard support |
| No date format hint          | Add placeholder: "MM/DD/YYYY"                 |
| Calendar dates too small     | Increase size with CSS: `min-w-[44px] min-h-[44px]` |
| Esc key doesn't close        | Ensure `onEscapeKeyDown` handler              |

#### Example Fix

```tsx
// ✅ Accessible purchase date dialog
<Dialog open={isOpen} onOpenChange={setIsOpen}>
  <DialogContent aria-labelledby="purchase-dialog-title">
    <DialogHeader>
      <DialogTitle id="purchase-dialog-title">
        Mark as Purchased
      </DialogTitle>
      <DialogDescription>
        Select the date you bought this gift. This helps you track your purchases.
      </DialogDescription>
    </DialogHeader>

    <div className="py-4">
      <label htmlFor="purchase-date" className="mb-2 block text-sm font-medium">
        Purchase Date
      </label>
      <Calendar
        mode="single"
        selected={selectedDate}
        onSelect={setSelectedDate}
        initialFocus
        className="rounded-md border"
        modifiersClassNames={{
          selected: 'bg-blue-600 text-white',
          today: 'font-bold',
        }}
        // Keyboard navigation built-in
      />
    </div>

    <DialogFooter>
      <Button variant="outline" onClick={() => setIsOpen(false)}>
        Cancel
      </Button>
      <Button onClick={handleConfirm} disabled={!selectedDate}>
        Confirm Purchase
      </Button>
    </DialogFooter>
  </DialogContent>
</Dialog>
```

---

### 7. Action Dialog (Remove Reservations)

**Location:** `src/components/reservations/RemoveOptionsDialog.tsx`

**Workflow:**
1. User selects reservations
2. Clicks "Remove"
3. Dialog asks: Keep wish on list or remove both?
4. User confirms action

#### Audit Checklist

- [ ] **Dialog role**: `role="alertdialog"` (destructive action)
- [ ] **Accessible name**: Clear title ("Remove Reservations?")
- [ ] **Description**: Explains consequences clearly
- [ ] **Radio group**: Options use `<fieldset>` and `<legend>`
- [ ] **Keyboard navigation**: Arrow keys select options
- [ ] **Default selection**: One option pre-selected
- [ ] **Confirmation focus**: Focus on "Cancel" (safer default)
- [ ] **Destructive styling**: Red/warning color for Remove button
- [ ] **Touch targets**: 44x44px for radio buttons and labels

#### Test Script

**Screen Reader Test:**
```
Expected: "Remove Reservations? Alert dialog. You're about to remove 2 reservations..."
Navigate: "Remove reservation only, radio button, checked"
Tab: "Keep wish on list, radio button, not checked"
Tab: "Cancel button"
Tab: "Remove Reservations button"
```

**Keyboard Test:**
```
1. Dialog opens → Focus on first radio button
2. Arrow Down → Selects "Remove both"
3. Tab → Focus moves to "Cancel"
4. Tab → Focus moves to "Remove Reservations"
5. Enter → Confirms action
6. Dialog closes → Focus returns to table
```

**Grandma Test:**
```
Question: "What's the difference between the two options?"
Answer from UI: Clear labels and descriptions for each
Pass: ✅ if non-technical user understands consequences
```

#### Common Issues

| Issue                           | Fix                                            |
| ------------------------------- | ---------------------------------------------- |
| Options not in radio group      | Wrap in `<RadioGroup>` from Radix UI           |
| No description of consequences  | Add clear explanation for each option          |
| Focus on dangerous button       | Default focus to "Cancel" for safety           |
| Technical jargon                | Use plain English ("remove" not "delete entity") |
| Radio labels unclear            | Use descriptive labels with context            |

#### Example Fix

```tsx
// ✅ Accessible remove options dialog
<AlertDialog open={isOpen} onOpenChange={setIsOpen}>
  <AlertDialogContent aria-describedby="remove-dialog-description">
    <AlertDialogHeader>
      <AlertDialogTitle>Remove Reservations?</AlertDialogTitle>
      <AlertDialogDescription id="remove-dialog-description">
        You're about to remove {selectedCount} {selectedCount === 1 ? 'reservation' : 'reservations'}.
        What would you like to do?
      </AlertDialogDescription>
    </AlertDialogHeader>

    <RadioGroup value={option} onValueChange={setOption}>
      <fieldset>
        <legend className="sr-only">Remove options</legend>
        <div className="space-y-3">
          <label className="flex items-start gap-3 p-3 border rounded cursor-pointer hover:bg-gray-50">
            <RadioGroupItem value="reservation-only" id="option-reservation" />
            <div className="flex-1">
              <div className="font-medium">Remove reservation only</div>
              <div className="text-sm text-gray-600">
                The gift stays on the list for someone else to reserve
              </div>
            </div>
          </label>

          <label className="flex items-start gap-3 p-3 border rounded cursor-pointer hover:bg-gray-50">
            <RadioGroupItem value="both" id="option-both" />
            <div className="flex-1">
              <div className="font-medium">Remove both reservation and wish</div>
              <div className="text-sm text-gray-600">
                The gift is completely removed from the list
              </div>
            </div>
          </label>
        </div>
      </fieldset>
    </RadioGroup>

    <AlertDialogFooter>
      <AlertDialogCancel>Cancel</AlertDialogCancel>
      <AlertDialogAction
        onClick={handleConfirm}
        className="bg-red-600 hover:bg-red-700"
      >
        Remove {selectedCount === 1 ? 'Reservation' : 'Reservations'}
      </AlertDialogAction>
    </AlertDialogFooter>
  </AlertDialogContent>
</AlertDialog>
```

---

### 8. Virtual Scrolling Table

**Location:** Using `@tanstack/react-virtual`

**Challenge:** Virtualization can break screen reader announcements

#### Audit Checklist

- [ ] **Table semantics**: Uses `<table>`, `<thead>`, `<tbody>`, `<tr>`, `<td>`
- [ ] **Row count announcement**: Screen reader knows total rows
- [ ] **Column headers**: `<th scope="col">` for each column
- [ ] **Keyboard navigation**: Arrow keys navigate cells
- [ ] **Focus restoration**: Focus restored after scroll
- [ ] **Live region**: Row updates announced
- [ ] **Loading state**: "Loading more items" announced
- [ ] **Empty rows**: Not announced (use `aria-hidden="true"`)

#### Test Script

**Screen Reader Test:**
```
Expected: "Table with 42 rows and 5 columns"
Navigate: "Gift column header, sorted ascending"
Navigate: "Red Bike, row 1 of 42"
Scroll: "Loading more items..." (if applicable)
```

**Keyboard Test:**
```
1. Tab into table
2. Arrow Down → Moves to next row
3. Arrow Up → Moves to previous row
4. Arrow Right → Moves to next column (optional)
5. Home → First row
6. End → Last row
7. Page Down → Scroll down (should maintain focus)
```

#### Common Issues

| Issue                           | Fix                                           |
| ------------------------------- | --------------------------------------------- |
| Screen reader lost in virtual rows | Add `aria-rowcount` and `aria-rowindex`    |
| Empty spacer rows announced     | Use `aria-hidden="true"` on empty rows        |
| Focus lost on scroll            | Manually restore focus after virtual update   |
| No column headers               | Ensure `<thead>` with `<th scope="col">`      |
| Keyboard navigation broken      | Use `onKeyDown` to handle arrow keys          |

#### Example Fix

```tsx
// ✅ Accessible virtual scrolling table
<table
  className="min-w-full"
  role="table"
  aria-rowcount={totalRows}
  aria-colcount={5}
>
  <thead>
    <tr>
      <th scope="col" className="px-4 py-2 text-left">
        <span className="sr-only">Select</span>
      </th>
      <th scope="col" className="px-4 py-2 text-left">
        Gift
      </th>
      <th scope="col" className="px-4 py-2 text-left">
        For
      </th>
      <th scope="col" className="px-4 py-2 text-left">
        Status
      </th>
      <th scope="col" className="px-4 py-2 text-left">
        Actions
      </th>
    </tr>
  </thead>
  <tbody>
    {/* Top spacer for virtual scrolling */}
    {paddingTop > 0 && (
      <tr aria-hidden="true">
        <td style={{ height: `${paddingTop}px` }} />
      </tr>
    )}

    {virtualRows.map((virtualRow) => {
      const reservation = reservations[virtualRow.index];
      return (
        <tr
          key={reservation.id}
          aria-rowindex={virtualRow.index + 1}
          ref={virtualRow.measureElement}
        >
          <td className="px-4 py-2">
            <input
              type="checkbox"
              aria-label={`Select ${reservation.wish.title}`}
              checked={isSelected(reservation.id)}
              onChange={(e) => onToggle(reservation.id, e.target.checked)}
            />
          </td>
          <td className="px-4 py-2">{reservation.wish.title}</td>
          <td className="px-4 py-2">{reservation.listOwnerName}</td>
          <td className="px-4 py-2">
            <span className={statusColor(reservation.status)}>
              {reservation.status}
            </span>
          </td>
          <td className="px-4 py-2">
            <Button
              size="sm"
              aria-label={`Actions for ${reservation.wish.title}`}
            >
              Actions
            </Button>
          </td>
        </tr>
      );
    })}

    {/* Bottom spacer */}
    {paddingBottom > 0 && (
      <tr aria-hidden="true">
        <td style={{ height: `${paddingBottom}px` }} />
      </tr>
    )}
  </tbody>
</table>
```

---

## Common Accessibility Issues

### Issue 1: Poor Color Contrast

**Symptom:** Text difficult to read, especially for low vision users

**Test:**
```bash
# Use axe DevTools or manual contrast checker
https://colorcontra.st

# Example:
Foreground: #999999 (gray-400)
Background: #FFFFFF (white)
Ratio: 2.85:1 ❌ FAIL (need 4.5:1)
```

**Fix:**
```tsx
// ❌ Bad - Insufficient contrast
<p className="text-gray-400">Reserved on Jan 15</p>

// ✅ Good - Meets 4.5:1 ratio
<p className="text-gray-700">Reserved on Jan 15</p>
```

### Issue 2: Keyboard Trap

**Symptom:** User can Tab into element but can't Tab out

**Test:**
1. Tab into modal/dialog
2. Try to Tab back out
3. If stuck → keyboard trap

**Fix:**
```tsx
// ❌ Bad - Manual focus management without trap
<div onKeyDown={(e) => { /* focus logic */ }}>

// ✅ Good - Use Radix UI primitives with built-in trap
<Dialog>
  <DialogContent> {/* Handles focus trap automatically */}
    ...
  </DialogContent>
</Dialog>
```

### Issue 3: Missing Focus Indicators

**Symptom:** No visual feedback when element is focused via keyboard

**Test:**
1. Tab through page
2. Check if focused element has visible outline/ring

**Fix:**
```tsx
// ❌ Bad - Removes focus indicator
<button className="focus:outline-none">Click me</button>

// ✅ Good - Visible focus indicator
<button className="focus:ring-2 focus:ring-blue-500 focus:ring-offset-2">
  Click me
</button>
```

### Issue 4: Icon-Only Buttons

**Symptom:** Screen reader announces "button" with no context

**Test:**
1. Use screen reader
2. Navigate to icon button
3. Listen to announcement

**Fix:**
```tsx
// ❌ Bad - No accessible text
<button>
  <Trash className="h-4 w-4" />
</button>

// ✅ Good - aria-label provides context
<button aria-label="Remove reservation">
  <Trash className="h-4 w-4" aria-hidden="true" />
</button>

// ✅ Better - Visible text + icon
<button>
  <Trash className="mr-2 h-4 w-4" aria-hidden="true" />
  Remove
</button>
```

### Issue 5: Unclear Error Messages

**Symptom:** User doesn't know what went wrong or how to fix it

**Grandma Test Fail:**
```
❌ "Validation error"
❌ "Invalid input"
❌ "Error 400"
```

**Fix:**
```tsx
// ❌ Bad - Technical error
<p className="text-red-600">Invalid date format</p>

// ✅ Good - Clear explanation + solution
<div role="alert" className="rounded border border-red-300 bg-red-50 p-3">
  <p className="font-medium text-red-800">
    We couldn't save that purchase date
  </p>
  <p className="text-sm text-red-700">
    Make sure the date isn't in the future. Try selecting today's date or earlier.
  </p>
</div>
```

### Issue 6: Missing Live Regions

**Symptom:** Dynamic content updates not announced to screen readers

**Test:**
1. Use screen reader
2. Trigger dynamic content change (e.g., selected count)
3. Check if announced

**Fix:**
```tsx
// ❌ Bad - Updates silently
<span>{selectedCount} selected</span>

// ✅ Good - Announces changes
<span aria-live="polite" aria-atomic="true">
  {selectedCount} {selectedCount === 1 ? 'gift' : 'gifts'} selected
</span>
```

---

## Remediation Priority

### Critical (Fix Immediately)

- Keyboard traps
- Missing form labels
- Insufficient color contrast (< 3:1)
- Non-keyboard accessible functionality
- Missing alt text on meaningful images

### High (Fix This Sprint)

- Missing focus indicators
- Poor error messages
- Icon-only buttons without labels
- Missing live regions for dynamic content
- Improper heading hierarchy

### Medium (Fix Next Sprint)

- Inconsistent tab order
- Missing landmarks
- Unclear link text ("click here")
- Touch targets < 44x44px
- No skip links

### Low (Fix When Possible)

- Redundant ARIA attributes
- Over-announced elements
- Minor contrast issues (3:1-4.5:1)
- Non-semantic HTML

---

## Pass/Fail Criteria

### Must Pass (Zero Tolerance)

| Criterion                    | Test Method           | Pass Criteria               |
| ---------------------------- | --------------------- | --------------------------- |
| **Keyboard navigation**      | Manual keyboard test  | All features accessible     |
| **Color contrast**           | axe DevTools          | 4.5:1 for text, 3:1 for UI  |
| **Screen reader**            | NVDA/VoiceOver        | All content announced       |
| **Form labels**              | axe DevTools          | All inputs have labels      |
| **Touch targets**            | Manual mobile test    | Minimum 44x44px             |
| **Focus indicators**         | Manual keyboard test  | Visible on all elements     |
| **Error messages**           | Grandma Test          | Non-technical language      |

### Should Pass (Fix Before Release)

| Criterion                 | Test Method      | Pass Criteria                 |
| ------------------------- | ---------------- | ----------------------------- |
| **Heading hierarchy**     | HeadingsMap      | No skipped levels (h1→h2→h3)  |
| **Landmarks**             | axe DevTools     | Main, nav, aside present      |
| **Live regions**          | Screen reader    | Updates announced             |
| **ARIA usage**            | axe DevTools     | Valid ARIA attributes         |
| **Language clarity**      | Grandma Test     | Plain English, no jargon      |

---

## Automated Testing Integration

### Playwright Accessibility Tests

Create `tests/e2e/reservations/accessibility.spec.ts`:

```typescript
import { test, expect } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';

test.describe('Reservations Accessibility', () => {
  test('should not have any automatically detectable accessibility issues', async ({ page }) => {
    await page.goto('/reservations');

    const accessibilityScanResults = await new AxeBuilder({ page })
      .withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa'])
      .analyze();

    expect(accessibilityScanResults.violations).toEqual([]);
  });

  test('keyboard navigation through filters', async ({ page }) => {
    await page.goto('/reservations');

    // Tab to first filter
    await page.keyboard.press('Tab');
    await page.keyboard.press('Tab'); // Navigate to filter

    // Check focus is visible
    const focused = await page.evaluate(() => document.activeElement?.tagName);
    expect(['INPUT', 'BUTTON']).toContain(focused);
  });

  test('bulk actions announce selected count', async ({ page }) => {
    await page.goto('/reservations');

    // Select a reservation
    await page.click('[data-testid="checkbox-reservation-1"]');

    // Check live region updates
    const liveRegion = page.locator('[aria-live="polite"]');
    await expect(liveRegion).toContainText('1 gift selected');
  });
});
```

### CI/CD Integration

Add to `.github/workflows/test.yml`:

```yaml
- name: Run accessibility tests
  run: pnpm test:e2e tests/e2e/reservations/accessibility.spec.ts

- name: Upload accessibility report
  if: failure()
  uses: actions/upload-artifact@v3
  with:
    name: accessibility-violations
    path: playwright-report/
```

---

## Continuous Improvement

### Monthly Accessibility Audit

1. Run full automated scan (axe DevTools)
2. Manual keyboard testing (15 minutes)
3. Screen reader testing (30 minutes)
4. Mobile device testing (15 minutes)
5. Document findings in GitHub issues
6. Prioritize and assign fixes

### Accessibility Champion

Assign one team member per sprint to:
- Review PRs for accessibility
- Run axe DevTools on new features
- Update this guide with new patterns
- Advocate for accessible design

---

## Resources

**Tools:**
- [axe DevTools](https://www.deque.com/axe/devtools/)
- [NVDA Screen Reader](https://www.nvaccess.org/)
- [WebAIM Contrast Checker](https://webaim.org/resources/contrastchecker/)
- [WAVE Browser Extension](https://wave.webaim.org/extension/)

**Guidelines:**
- [WCAG 2.1 Quick Reference](https://www.w3.org/WAI/WCAG21/quickref/)
- [Inclusive Components](https://inclusive-components.design/)
- [A11y Project Checklist](https://www.a11yproject.com/checklist/)

**Testing:**
- [Accessibility Insights](https://accessibilityinsights.io/)
- [Lighthouse](https://developer.chrome.com/docs/lighthouse/)
- [Pa11y](https://pa11y.org/)

---

**Last Updated:** 2025-11-22
**Next Review:** Monthly (after each sprint)
