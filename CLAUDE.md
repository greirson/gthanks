# gthanks - Production Wishlist Coordination Platform

## Mission

Simple way to organize wishes, share with friends and family, and prevent duplicate gifts through simple wishlist coordination.

## Quick Start

@.claude/guides/tech-stack.md
@docs/DOCKER_DEPLOYMENT.md

## Mobile-First Requirements

**CRITICAL**: This app must work flawlessly on mobile devices. Mobile is not an afterthought.

### Minimum Viewport Support

- **Smallest supported**: iPhone SE (375x667px)
- **Target**: Most users will be on mobile (primary use case)

### Mobile UI Requirements

1. **Touch Targets**: All buttons/links minimum 44x44px (Apple HIG standard)
2. **Navigation**: Hamburger menu or mobile-friendly nav on smaller screens
3. **No Horizontal Scroll**: All content must fit within viewport width
4. **Data Attributes**: All `data-testid` must work on mobile layouts
5. **Loading States**: Proper loading indicators for slow connections
6. **Spacing**: Adequate padding/margin for touch interactions
7. **Form Inputs**: Large, easy-to-tap fields on mobile

### Responsive Breakpoints (Tailwind)

- `375px` - iPhone SE (minimum)
- `640px` - `sm` breakpoint (small phones)
- `768px` - `md` breakpoint (tablets, landscape)
- `1024px` - `lg` breakpoint (desktop)

### Mobile-Specific Components

- Mobile navigation menu (hamburger/slide-out)
- Touch-friendly wish cards (tap targets, swipe support)
- Mobile-optimized forms (full-width inputs, large buttons)
- Mobile share functionality (native share API when available)
- Bottom navigation or sticky menu for quick actions

### Testing Checklist

- All E2E tests must pass on mobile viewports (375px, 768px)
- Manual testing on actual iOS/Android devices before release
- Check responsive behavior at all breakpoints
- Verify no content overflow or horizontal scrolling
- Test touch interactions (tap, hold, swipe) work as expected
- Verify form submission works on mobile keyboards

## UX Principles for Non-Technical Users

**CRITICAL**: This app is designed for families—grandmas, aunts, uncles, kids. Technical jargon and developer patterns are forbidden in user-facing UI.

### Core Principle: Grandma Test

If your grandma wouldn't understand it, it's too technical. Every UI element must pass the "grandma test."

### URL Display Rules

1. **Always Show Full URLs** - Non-technical users need complete, copyable links
   - Good: `https://gthanks.app/greir` (clear, shareable, copyable)
   - Bad: `/greir` (confusing, looks broken, "where's the rest?")

2. **Implementation Pattern** - Use progressive enhancement to avoid hydration errors:

   ```typescript
   const [fullUrl, setFullUrl] = useState<string | null>(null);

   useEffect(() => {
     if (typeof window !== 'undefined') {
       setFullUrl(`${window.location.origin}/path`);
     }
   }, []);

   const displayUrl = fullUrl || '/path'; // Fallback for SSR
   ```

3. **Visual Transition** - Use subtle fade to minimize flash:
   ```tsx
   <a href="/path" className="transition-opacity duration-75">
     {fullUrl || '/path'}
   </a>
   ```

### Language Guidelines

1. **Plain English** - No technical terms
   - "Share with family" not "Configure access control"
   - "Copy link" not "Copy URL to clipboard"
   - "Hidden from list owner" not "Obfuscated via permission layer"

2. **Action-Oriented** - Tell users what will happen
   - "Anyone with this link can view your list"
   - Not "Public visibility enabled"

3. **Error Messages** - Explain the problem AND the solution
   - "We couldn't load that page. Try refreshing, or go back to your lists."
   - Not "404: Resource not found"

### Form Design

1. **Labels** - Descriptive, not database field names
   - "What do you want?" (wish title)
   - Not "Title" or "Wish Name"

2. **Placeholders** - Examples, not instructions
   - placeholder="New bike, red color"
   - Not placeholder="Enter wish description"

3. **Validation** - Friendly, helpful feedback
   - "Username must be at least 3 letters (you entered 2)"
   - Not "Invalid input: min length 3"

### Sharing & Links

1. **Shareable URLs** - Must work when pasted in texts, emails, Facebook
   - Full URL with protocol (https://)
   - One-click copy to clipboard
   - Visual confirmation (checkmark, "Copied!" message)

2. **Share Instructions** - Step-by-step for non-technical users
   - "Tap 'Copy Link' -> paste in text message -> send to family"
   - Not just "Share via link"

3. **Password-Protected Lists** - Clear two-step process
   - "Step 1: Copy the link"
   - "Step 2: Share this password: \*\*\*\*"
   - Not: "Share credentials with authorized users"

### Visual Feedback

1. **Loading States** - Always show progress
   - Spinning icons for actions
   - Skeleton loaders for page loads
   - "Saving..." text with animations

2. **Success States** - Celebrate completions
   - Green checkmarks
   - "Done!" or "Saved!" messages
   - Brief toast notifications (2-3 seconds)

3. **Error States** - No technical stack traces
   - Friendly icons (sad face, alert triangle)
   - Plain language explanation
   - Actionable next step

### Mobile-First Language

1. **Touch-Friendly Labels** - Large enough to read and tap
   - 16px minimum font size
   - 44x44px minimum touch targets
   - High contrast text

2. **Short Copy** - Mobile screens are small
   - "Share with family"
   - Not "Configure list sharing settings for family members"

3. **Progressive Disclosure** - Don't overwhelm
   - Show essential info first
   - Hide advanced features behind "Show more" toggles
   - One primary action per screen

### UX Testing Checklist

- [ ] Would my grandma understand this label?
- [ ] Can I copy/paste this URL and it works?
- [ ] Does the error message tell me what to do next?
- [ ] Are all URLs shown in full (not relative paths)?
- [ ] Is the language action-oriented and friendly?
- [ ] Would this work if sent via text message?
- [ ] Are technical terms replaced with plain English?
- [ ] Do forms use examples instead of instructions?

## Service Layer Policy

The service layer is **MANDATORY** for security-critical operations.

**DO**: Use existing services for ALL write operations and bulk operations. Use permissionService for ALL authorization checks. Write direct Prisma queries only for simple reads of user's own data after auth.

**DON'T**: Create NEW service files. Bypass services for bulk operations (security risk). Manually check permissions - ALWAYS use permissionService.

Permission logic is complex (owners, admins, group members, public/password lists). Manual checks bypass business rules and create security holes. Run `pnpm lint:service-layer` to check compliance. Build fails on violations.

Details: @.claude/guides/architecture.md

## API Response Schema Validation

**CRITICAL**: All API endpoints MUST return data that matches the Zod schema expected by the frontend. This is a recurring issue causing runtime validation errors. Before implementing ANY API endpoint: check frontend schema expectations, match service layer return type with full relations, verify Prisma `include` clauses for nested data, and test in browser for Zod errors. TypeScript structural typing allows incomplete data to pass type checks - only Zod catches missing relations at runtime.

Details: @.claude/guides/api.md

## Git Hooks

**Pre-Commit**: lint-staged (ESLint + Prettier), typecheck, lint. Commit blocked if any check fails.

**Pre-Push**: typecheck, lint, test (unit suite). Push blocked if any check fails.

**Commit Format**: Conventional Commits - `<type>(<scope>): <subject>` (feat, fix, docs, style, refactor, test, chore, perf, ci, build, revert)

**Bypass** (emergency only): `git commit --no-verify` or `git push --no-verify`

## Working Directory

**CRITICAL**: All commands must be run from project root, not from subdirectories. Running from `prisma/` causes database files in wrong locations, paths resolving incorrectly, and seeds writing to wrong directory. The pnpm scripts include safety guards that error if run from wrong directory.

## Guides

@.claude/guides/architecture.md | @.claude/guides/api.md | @.claude/guides/components.md
@.claude/guides/testing.md | @.claude/guides/monitoring.md
@.claude/commands/testing/run-e2e.md

## Database & Deployment

@docs/DOCKER_DEPLOYMENT.md
@docs/POSTGRESQL_SETUP.md | @docs/DATABASE_MIGRATION.md | @docs/RATE_LIMITING.md

## AI Team Configuration

**Important: USE subagents when available for the task.**

| Task                | Agent                    |
| ------------------- | ------------------------ |
| Next.js Development | react-nextjs-expert      |
| UI/Styling          | tailwind-frontend-expert |
| Backend Services    | backend-developer        |
| API Design          | api-architect            |
| Code Review         | code-reviewer            |
| Performance         | performance-optimizer    |
| Documentation       | documentation-specialist |
| Testing             | Use general development  |
