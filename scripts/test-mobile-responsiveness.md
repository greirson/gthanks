# Mobile Responsiveness Test Checklist

**Test Date:** _________
**Tester:** _________
**App Version:** _________

## Setup

- [ ] Dev server running on http://localhost:3000
- [ ] Browser DevTools opened (Cmd+Opt+I / F12)
- [ ] Device toolbar enabled (Cmd+Shift+M / Ctrl+Shift+M)

---

## iPhone SE (375px) - CRITICAL MINIMUM VIEWPORT

### Navigation

- [ ] Hamburger menu button visible (not desktop nav)
- [ ] Hamburger button ≥ 44x44px (use DevTools inspector)
  - **Actual size:** ______ x ______ px
- [ ] Click hamburger - menu opens smoothly
- [ ] Mobile menu items visible and readable
- [ ] Click menu item - navigates correctly
- [ ] Click X button - menu closes
- [ ] Press Escape key - menu closes
- [ ] No horizontal scrolling on any page

**Issues found:**

---

### Mobile Menu Accessibility

- [ ] Menu button has `aria-label` (Open/Close menu)
- [ ] Menu button has `aria-expanded` (true/false)
- [ ] Mobile menu has `id="mobile-menu"`
- [ ] Menu items have `role="menuitem"`
- [ ] Active page has `aria-current="page"`

**ARIA Labels found:**
- Menu button (closed): _______________
- Menu button (opened): _______________
- aria-expanded: _______________

**Issues found:**

---

### Wish Cards (/wishes page)

- [ ] Wish cards stack vertically (one per row)
- [ ] Card dropdown button (⋮) ≥ 44x44px
  - **Actual size:** ______ x ______ px
- [ ] Dropdown opens on tap
- [ ] All dropdown menu items tappable
- [ ] Images scale correctly (no overflow)
- [ ] Text readable (no text overflow or truncation issues)
- [ ] Priority stars visible and clear
- [ ] Card spacing adequate (not cramped)

**Issues found:**

---

### List Cards (/lists page)

- [ ] List cards stack vertically
- [ ] Share button tappable (≥ 44x44px)
  - **Actual size:** ______ x ______ px
- [ ] Dropdown button ≥ 44x44px
  - **Actual size:** ______ x ______ px
- [ ] Card content doesn't overflow
- [ ] Member avatars visible
- [ ] Card titles readable

**Issues found:**

---

### Forms (e.g., /wishes/new)

- [ ] Input fields full-width on mobile
- [ ] Labels visible above inputs
- [ ] Text inputs ≥ 44px height
  - **Actual size:** ______ px
- [ ] Buttons ≥ 44x44px
  - **Submit button size:** ______ x ______ px
- [ ] Error messages visible and readable
- [ ] Can scroll to see all form fields
- [ ] Keyboard doesn't obscure submit button (test on actual device)

**Issues found:**

---

### Touch Targets (Use DevTools Inspector)

**Test Method:**
1. Right-click element → Inspect
2. Check computed height/width in DevTools
3. Verify ≥ 44x44px

- [ ] All buttons ≥ 44x44px
- [ ] All icon buttons ≥ 44x44px
- [ ] Checkboxes have large click area
- [ ] Radio buttons ≥ 44x44px click area
- [ ] Dropdown triggers ≥ 44x44px
- [ ] Close buttons (X) ≥ 44x44px

**Failed elements:**

| Element | Actual Size | Expected Size |
|---------|-------------|---------------|
|         |             | 44x44px       |

---

### Horizontal Scroll Test

**Test Method:**
1. Open DevTools Console
2. Run: `document.documentElement.scrollWidth`
3. Run: `document.documentElement.clientWidth`
4. Compare: scrollWidth should ≤ clientWidth

**Pages to test:**

| Page | scrollWidth | clientWidth | Pass/Fail |
|------|-------------|-------------|-----------|
| /wishes | _____ px | _____ px | ☐ Pass ☐ Fail |
| /lists | _____ px | _____ px | ☐ Pass ☐ Fail |
| /groups | _____ px | _____ px | ☐ Pass ☐ Fail |
| /wishes/new | _____ px | _____ px | ☐ Pass ☐ Fail |

**Issues found:**

---

## iPhone 12 Pro (390px)

- [ ] All above tests pass
- [ ] Layout adjusts appropriately for wider viewport
- [ ] No regressions from iPhone SE
- [ ] No horizontal scroll

**Issues found:**

---

## Pixel 5 (393px)

- [ ] All above tests pass
- [ ] Layout works on Android viewport
- [ ] No horizontal scroll

**Issues found:**

---

## iPad Mini (768px) - Tablet Breakpoint

- [ ] Desktop navigation visible (not hamburger)
- [ ] Mobile menu button hidden
- [ ] Wish cards display in grid (2-3 columns)
- [ ] List cards display in grid
- [ ] All touch targets still ≥ 44x44px
- [ ] Hover states work on touchscreen (if testing on actual device)

**Issues found:**

---

## Accessibility - Screen Reader Testing (Optional)

**VoiceOver on iOS:**
1. Enable: Settings > Accessibility > VoiceOver

- [ ] Navigate to mobile menu button
- [ ] VoiceOver announces "Open menu, button"
- [ ] Tap to open menu
- [ ] VoiceOver announces "Close menu, button, expanded"
- [ ] Navigate through menu items
- [ ] Each item announced correctly

**NVDA/JAWS on Desktop:**

- [ ] Navigate with Tab key
- [ ] All interactive elements reachable
- [ ] Screen reader announces element roles
- [ ] Form labels properly associated

**Issues found:**

---

## Real Device Testing (Highly Recommended)

**iPhone SE (Physical Device):**

- [ ] App loads correctly
- [ ] Touch interactions work smoothly
- [ ] No mis-taps on small elements
- [ ] Keyboard interactions work
- [ ] Pinch-to-zoom disabled (intentional)
- [ ] No layout shifts on orientation change

**Android Device:**

- [ ] App loads correctly
- [ ] Touch interactions work
- [ ] Back button behavior (browser back)
- [ ] Chrome mobile rendering correct

**Issues found:**

---

## Performance on Mobile

- [ ] Pages load in < 3 seconds on 3G
- [ ] No layout shift during load (CLS)
- [ ] Images lazy-load properly
- [ ] Smooth scrolling (no jank)
- [ ] Animations perform well (60fps)

**Performance issues:**

---

## Summary

**Total Issues Found:** _____

**Critical Issues (blocking):** _____

**Minor Issues (nice-to-fix):** _____

**Overall Status:**
☐ PASS - All critical tests passed
☐ FAIL - Critical issues found
☐ PARTIAL - Some issues, but usable

**Recommendations:**

---

## Sign-off

**Tested by:** ___________________
**Date:** ___________________
**Status:** ☐ Approved ☐ Needs Fixes
