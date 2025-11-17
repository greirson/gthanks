# gthanks - Production Wishlist Coordination Platform

## Mission

Simple way to organize wishes, share with friends and family, and prevent duplicate gifts through simple wishlist coordination.

## Core User Flow

Sign Up → Create Wish → Set Priority → Add to List → Share with Group → Reserve Gift

## Quick Start

**Technology Stack & Development:**
@.claude/guides/tech-stack.md

**Primary Deployment (Docker):**
@docs/DOCKER_DEPLOYMENT.md

**Alternative Deployment (Vercel):**
@docs/VERCEL_DEPLOYMENT.md

## Architecture Overview

@.claude/guides/architecture.md

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
   - ✅ Good: `https://gthanks.app/greir` (clear, shareable, copyable)
   - ❌ Bad: `/greir` (confusing, looks broken, "where's the rest?")

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
   <a
     href="/path"
     className="transition-opacity duration-75"
   >
     {fullUrl || '/path'}
   </a>
   ```

### Language Guidelines

1. **Plain English** - No technical terms
   - ✅ "Share with family" ❌ "Configure access control"
   - ✅ "Copy link" ❌ "Copy URL to clipboard"
   - ✅ "Hidden from list owner" ❌ "Obfuscated via permission layer"

2. **Action-Oriented** - Tell users what will happen
   - ✅ "Anyone with this link can view your list"
   - ❌ "Public visibility enabled"

3. **Error Messages** - Explain the problem AND the solution
   - ✅ "We couldn't load that page. Try refreshing, or go back to your lists."
   - ❌ "404: Resource not found"

### Form Design

1. **Labels** - Descriptive, not database field names
   - ✅ "What do you want?" (wish title)
   - ❌ "Title" or "Wish Name"

2. **Placeholders** - Examples, not instructions
   - ✅ placeholder="New bike, red color"
   - ❌ placeholder="Enter wish description"

3. **Validation** - Friendly, helpful feedback
   - ✅ "Username must be at least 3 letters (you entered 2)"
   - ❌ "Invalid input: min length 3"

### Sharing & Links

1. **Shareable URLs** - Must work when pasted in texts, emails, Facebook
   - Full URL with protocol (https://)
   - One-click copy to clipboard
   - Visual confirmation (checkmark, "Copied!" message)

2. **Share Instructions** - Step-by-step for non-technical users
   - "Tap 'Copy Link' → paste in text message → send to family"
   - Not just "Share via link"

3. **Password-Protected Lists** - Clear two-step process
   - "Step 1: Copy the link"
   - "Step 2: Share this password: ****"
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
   - ✅ "Share with family"
   - ❌ "Configure list sharing settings for family members"

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

The service layer is **MANDATORY** for security-critical operations:

### DO ✅
- Use existing services for ALL write operations and bulk operations (MANDATORY)
- Use permissionService for ALL authorization checks (MANDATORY - security requirement)
- Write direct Prisma queries for simple reads (user's own data after auth)
- Fix critical bugs in existing services

### DON'T ❌
- Create NEW service files (src/lib/services/*)
- Bypass services for bulk operations (security risk)
- Manually check permissions - ALWAYS use permissionService
- Refactor existing services unless fixing critical bugs

### Permission Checks (ALWAYS Use permissionService)

```typescript
// ✅ Correct
await permissionService.require(userId, 'edit', { type: 'wish', id: wishId });

// ❌ NEVER do this
const wish = await db.wish.findFirst({ where: { id: wishId, ownerId: userId } });
if (!wish) throw new ForbiddenError('...');
```

**Why:**
- Permission logic is complex (owners, admins, group members, public/password lists)
- Manual checks bypass business rules and create security holes
- Centralized logic is easier to audit and update

### ESLint Enforcement

```bash
pnpm lint:service-layer  # Check service layer compliance
```

Build fails if service layer violations are detected (configured as errors, not warnings).

**Full Service Layer Details:**
@.claude/guides/architecture.md

## Development Workflow

**Testing Strategy:**
@.claude/guides/testing.md

**E2E Test Execution:**
@.claude/commands/testing/run-e2e.md

## Component Guidelines

@.claude/guides/components.md

## API Development

@.claude/guides/api.md

## Monitoring & Observability

@.claude/guides/monitoring.md

## Deployment

**Primary: Docker Deployment (Recommended)**
@docs/DOCKER_DEPLOYMENT.md

**Alternative: Vercel Deployment**
@docs/VERCEL_DEPLOYMENT.md

## Database Management

**PostgreSQL Setup:**
@docs/POSTGRESQL_SETUP.md

**Database Migration (SQLite → PostgreSQL):**
@docs/DATABASE_MIGRATION.md

**Rate Limiting:**
@docs/RATE_LIMITING.md

## Success Criteria

- [ ] User can sign up in < 30 seconds
- [ ] Create wishlist in < 2 minutes
- [ ] Share with family group instantly
- [ ] Zero duplicate gifts at events
- [ ] Works on phone and desktop
- [ ] Works on mobile (iPhone SE 375px viewport minimum)
- [ ] No horizontal scrolling on 375px width
- [ ] All interactions work via touch (44x44px minimum targets)
- [ ] Deploys with one command (Docker)
- [ ] 80% test coverage for critical paths
- [ ] Production monitoring enabled (Sentry)

## AI Team Configuration

### Detected Technology Stack (Production)

- **Frontend**: Next.js 14.2.3 with React 18 and TypeScript 5
- **Database**: Prisma 5.x ORM with SQLite/PostgreSQL
- **Authentication**: NextAuth.js v4 with magic links + OAuth
- **UI**: Radix UI + Tailwind CSS
- **Data Fetching**: TanStack React Query 5.80
- **Email**: Nodemailer (simple HTML) + Resend
- **Images**: Sharp for processing
- **Testing**: Jest (unit/integration) + Playwright (E2E)
- **Monitoring**: Sentry (error tracking + performance)
- **Rate Limiting**: rate-limiter-flexible (single-instance) / Valkey (distributed)

### AI Team Specialist Assignments

| Task                          | Agent                    | Notes                                      |
| ----------------------------- | ------------------------ | ------------------------------------------ |
| **React/Next.js Development** | react-nextjs-expert      | App Router, Server Components, React Query |
| **Database Design**           | Use general development  | Prisma schema (17 models)                  |
| **Authentication**            | Use general development  | NextAuth.js setup, OAuth providers         |
| **API Routes**                | Use general development  | RESTful endpoints with service layer       |
| **UI Implementation**         | tailwind-frontend-expert | Radix UI + Tailwind, mobile responsive     |
| **Testing**                   | Use general development  | 80% coverage target (critical paths)       |
| **Code Review**               | code-reviewer            | Security, service layer compliance         |
| **Documentation**             | documentation-specialist | Deployment guides, API documentation       |

### Development Patterns

- **Service Layer**: MANDATORY for write operations, bulk operations, and permission checks
- **Permission Checks**: ALWAYS use permissionService (centralized authorization)
- **Data Fetching**: Server Components (default) + React Query (interactivity)
- **Testing**: Unit (Jest) + Integration (Jest + Prisma) + E2E (Playwright)
- **Mobile-First**: All UI must work on 375px minimum viewport
- **UX**: "Grandma Test" - if grandma wouldn't understand, it's too technical

### Security Requirements

- **Service Layer Compliance**: ESLint rules enforce service usage (build-blocking errors)
- **Permission Service**: Centralized authorization for ALL permission checks
- **Rate Limiting**: Multi-tiered (anonymous by IP, authenticated by user ID)
- **Error Tracking**: Sentry for production monitoring
- **Deployment**: Docker-first (SQLite for dev, PostgreSQL + Valkey for production)
