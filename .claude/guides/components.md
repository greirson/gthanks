# Component Architecture & UI Patterns

## Component Organization

```
src/components/
├── ui/                     # Radix UI primitive wrappers
│   ├── button.tsx, dialog.tsx, dropdown-menu.tsx
│   ├── form.tsx, input.tsx, label.tsx, select.tsx
│   └── toast.tsx, ...
├── wishes/                 # WishCard, WishForm, WishList, WishPriorityBadge
├── lists/                  # ListCard, ListForm, ListShareDialog, ListVisibilityBadge
├── groups/                 # GroupCard, GroupForm, GroupMemberList, GroupInviteDialog
├── admin/                  # UserTable, AdminNav
└── common/                 # Header, Nav, Footer, LoadingSpinner, ErrorBoundary
```

## UI Components (Radix UI)

| Component     | Purpose             | Key Features                      |
| ------------- | ------------------- | --------------------------------- |
| Dialog        | Modals and overlays | Focus trap, ESC to close          |
| Dropdown Menu | Action menus        | Keyboard navigation, nested menus |
| Toast         | Notifications       | Auto-dismiss, swipe to dismiss    |
| Select        | Dropdowns           | Searchable, keyboard navigation   |
| Checkbox      | Multiple choice     | Indeterminate state               |
| Radio Group   | Single choice       | Keyboard navigation               |
| Switch        | Toggle settings     | Accessible label association      |
| Tabs          | Content switching   | Keyboard navigation               |
| Avatar        | User images         | Fallback initials                 |

**Why Radix:** Unstyled primitives, WAI-ARIA compliant, composable, keyboard accessible.

## Tailwind CSS Patterns

**Utility-first:** Use Tailwind classes directly, avoid custom CSS.

**Responsive (mobile-first):**

- Base: 375px (iPhone SE)
- `sm:` 640px, `md:` 768px, `lg:` 1024px

**Dark mode:** Use `dark:` prefix with next-themes.

**Composition:** Extract repeated patterns into components, not custom CSS classes.

## Form Handling

- Use `react-hook-form` with `zodResolver` for type-safe forms
- Define schemas in `lib/schemas/`
- Show inline validation errors with `aria-describedby`

## Accessibility Rules

1. **Semantic HTML** - Use `nav`, `button`, `ul/li`, not generic `div`
2. **ARIA labels** - Add `aria-label` to icon-only buttons
3. **Keyboard navigation** - All interactive elements must be focusable
4. **Focus management** - Auto-focus first element in modals
5. **Touch targets** - Minimum 44x44px

## Component Best Practices

1. **Single responsibility** - Split complex components
2. **Composition over props** - Prefer children over config props
3. **Server Components default** - Use Client Components only when interactive
4. **TypeScript props** - Always type component props with interfaces
5. **Test IDs** - Add `data-testid` for E2E tests
