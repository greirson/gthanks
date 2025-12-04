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
   <a href="/path" className="transition-opacity duration-75">
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

- Create NEW service files (src/lib/services/\*)
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

## API Response Schema Validation (MANDATORY)

**CRITICAL**: All API endpoints MUST return data that matches the Zod schema expected by the frontend.

### The Problem

This is a **recurring issue** that causes runtime Zod validation errors:

1. Frontend defines strict schema (e.g., `ReservationWithWish` with nested `wish` object)
2. Service layer returns incomplete data (e.g., bare `Reservation` without relations)
3. API route passes service result directly to frontend
4. Zod validation fails: `Expected object, received undefined`

### Prevention Checklist

Before implementing ANY API endpoint:

- [ ] **Check frontend schema** - What does the API client expect?

  ```typescript
  // src/lib/api/reservations.ts
  markAsPurchased: async (reservationId: string): Promise<ReservationWithWish> => {
    return apiPost(`/api/reservations/${reservationId}/purchased`, {}, ReservationWithWishSchema);
  };
  ```

- [ ] **Match service layer return type** - Does the service method return the full schema?

  ```typescript
  // ✅ Correct
  async markAsPurchased(...): Promise<ReservationWithWish> {
    return db.reservation.update({
      where: { id },
      data: { ... },
      include: { wish: { include: { user: true } } }  // ← Include relations!
    });
  }

  // ❌ Wrong - Returns bare Reservation
  async markAsPurchased(...): Promise<Reservation> {
    return db.reservation.update({
      where: { id },
      data: { ... }
      // Missing: include clause
    });
  }
  ```

- [ ] **Verify Prisma includes** - Are all nested relations included?
  - Check existing methods (e.g., `getUserReservations`) for the correct pattern
  - Prisma `update`, `create`, `findUnique` default to NO relations
  - You must explicitly `include` or `select` nested data

- [ ] **Test with actual data** - Don't rely on TypeScript alone
  - Zod validation catches what TypeScript misses
  - Run the endpoint in the browser and check console for Zod errors
  - Look for: `"API response validation failed: ZodError"`

### Common Patterns

**Lists with Wishes:**

```typescript
include: {
  listWishes: {
    include: {
      wish: {
        include: {
          user: true;
        }
      }
    }
  }
}
```

**Reservations with Wishes:**

```typescript
include: {
  wish: {
    include: {
      user: {
        select: {
          id: true,
          name: true,
          email: true,
        }
      }
    }
  }
}
```

**Users with Lists:**

```typescript
include: {
  lists: {
    include: {
      listWishes: true;
    }
  }
}
```

### How to Fix Validation Errors

When you see: `Expected object, received undefined` at path `["wish"]`

1. **Find the frontend schema** - Check the API client method's return type
2. **Find the service method** - Check what it returns
3. **Add missing `include`** - Replicate the pattern from similar methods (e.g., `getUserReservations`)
4. **Update return type** - Change `Promise<Reservation>` → `Promise<ReservationWithWish>`
5. **Test in browser** - Verify the Zod error is gone

### Why This Matters

- **Type Safety**: TypeScript doesn't catch missing Prisma relations
- **Runtime Errors**: Zod validation fails in production → user sees error
- **Data Integrity**: Incomplete responses break UI assumptions
- **Developer Experience**: Debugging Zod errors wastes time

**Remember:** TypeScript structural typing allows `Reservation` to satisfy `ReservationWithWish` even when `wish` is missing. Only Zod catches this at runtime.

## Development Workflow

**Testing Strategy:**
@.claude/guides/testing.md

**E2E Test Execution:**
@.claude/commands/testing/run-e2e.md

## Git Hooks (Pre-Commit & Pre-Push)

**IMPORTANT**: This project uses Husky to enforce code quality before commits and pushes.

### Pre-Commit Checks (Blocking)

Every commit runs these checks automatically:

1. **lint-staged** - Auto-fixes staged files (ESLint + Prettier)
2. **typecheck** - Full TypeScript type check
3. **lint** - Full ESLint check

If any check fails, the commit is blocked. Fix the issues before committing.

### Pre-Push Checks (Blocking)

Every push runs these additional checks:

1. **typecheck** - Full TypeScript type check
2. **lint** - Full ESLint check
3. **test** - Unit test suite

If any check fails, the push is blocked. Fix the issues before pushing.

### Commit Message Format

Commits must follow [Conventional Commits](https://www.conventionalcommits.org/):

```
<type>(<scope>): <subject>

Types: feat, fix, docs, style, refactor, test, chore, perf, ci, build, revert
```

Examples:

- `feat: add user authentication`
- `fix(api): resolve memory leak in group service`
- `docs: update README with setup instructions`

### Bypassing Hooks (Emergency Only)

```bash
git commit --no-verify  # Skip pre-commit hooks
git push --no-verify    # Skip pre-push hooks
```

Use sparingly - CI will still catch issues.

## Working Directory Convention (IMPORTANT)

**CRITICAL**: All commands must be run from the project root directory, not from subdirectories.

### Why This Matters

The codebase uses `process.cwd()` for path resolution, which assumes the project root as the working directory. Running commands from subdirectories (especially `prisma/`) will cause:

- Database files created in wrong locations
- Relative paths resolving incorrectly
- Seeds writing to `prisma/data/` instead of `data/`
- Configuration files not being found

### Correct Usage ✅

```bash
# Always run from project root
cd /path/to/gthanks
pnpm dev
pnpm db:push
pnpm seed
npx prisma studio
```

### Incorrect Usage ❌

```bash
# NEVER run commands from subdirectories
cd /path/to/gthanks/prisma
npx prisma db push     # Creates database in wrong location!
npx prisma studio      # May use wrong database file!
```

### Safety Measures

The project includes safety guards in package.json scripts that will error if run from wrong directory:

- `pnpm db:push` - Checks you're not in prisma/ subdirectory
- `pnpm db:studio` - Checks you're not in prisma/ subdirectory
- `pnpm db:generate` - Checks you're not in prisma/ subdirectory

Error message if run from wrong directory:

```
ERROR: Run from project root, not prisma/ subdirectory
```

### Database Path Resolution

- **Correct path**: `./data/gthanks.db` (relative to project root)
- **Wrong path**: `./prisma/data/gthanks.db` (if run from wrong directory)
- The seed scripts use `$(pwd)` to ensure absolute paths

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

## Prisma Schema Naming Conventions (MANDATORY)

**CRITICAL**: All Prisma models MUST follow these naming conventions to ensure predictable Prisma Client generation.

### Model Names

- **ALWAYS use PascalCase** for model names (e.g., `SiteSettings`, `UserEmail`, `ListWish`)
- **NEVER use snake_case** for model names (e.g., ~~`site_settings`~~, ~~`user_email`~~)

### Database Table Mapping

When the database table uses snake_case (common in PostgreSQL/SQLite):

```prisma
// ✅ Correct - PascalCase model with table mapping
model SiteSettings {
  id           String @id
  loginMessage String?

  @@map("site_settings")
}

// ❌ Wrong - snake_case model name
model site_settings {
  id           String @id
  loginMessage String?
}
```

### Relation Field Names

- **MUST use camelCase** (lowercase first letter, matching the target model name)
- Prisma Client will use these exact field names in TypeScript accessors

```prisma
// ✅ Correct - Relation field uses camelCase
model UserEmail {
  id     String @id
  userId String
  user   User   @relation(fields: [userId], references: [id])  // lowercase u

  @@map("user_emails")
}

// ❌ Wrong - PascalCase relation field
model UserEmail {
  id     String @id
  userId String
  User   User   @relation(fields: [userId], references: [id])  // Capital U (breaks TypeScript)
}
```

### Generated Prisma Client Behavior

Following these conventions ensures predictable client generation:

```typescript
// With camelCase relation field "user"
const email = await db.userEmail.findFirst({
  include: { user: true }  // ✅ Works - lowercase matches relation field
})

// With PascalCase relation field "User"
const email = await db.userEmail.findFirst({
  include: { user: true }  // ❌ Breaks - expects "User" not "user"
  include: { User: true }  // ✅ Works but doesn't match actual field name
})
```

### Real Examples from Schema

```prisma
// Single relations (foreign key) - camelCase
model Wish {
  id      String @id
  ownerId String
  user    User   @relation(fields: [ownerId], references: [id], onDelete: Cascade)  // lowercase
}

// Array relations (inverse) - camelCase
model List {
  id         String @id
  listAdmins ListAdmin[]    // camelCase
  listWishes ListWish[]     // camelCase
  user       User           // camelCase (relation from owner)
}
```

**TypeScript usage:**

```typescript
// ✅ Correct - matches camelCase field names
const list = await db.list.findUnique({
  where: { id: listId },
  include: {
    listAdmins: true, // array relation
    listWishes: true, // array relation
    user: true, // single relation
  },
});
```

### Why This Matters

1. **Consistency**: All relation fields follow camelCase convention
2. **Type Safety**: TypeScript expects field names exactly as declared in schema
3. **Developer Experience**: Lowercase first letter is JavaScript/TypeScript standard
4. **No Generated Accessors**: We use relation fields directly, no automatic transformation

### Validation

Before committing schema changes:

```bash
# Check all models use PascalCase
grep "^model [a-z]" prisma/schema.prisma
# Should return nothing (all models start with capital letter)

# Regenerate client after changes
pnpm prisma generate

# Verify no TypeScript errors
pnpm typecheck
```

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

## AI Team Configuration (autogenerated by team-configurator, 2025-12-01)

**Important: YOU MUST USE subagents when available for the task.**

### Detected Technology Stack

- **Frontend**: Next.js 14.2.3 (App Router) with React 18 and TypeScript 5
- **Database**: Prisma 5.15 ORM with SQLite (dev) / PostgreSQL (prod)
- **Authentication**: NextAuth.js 4.24.10 with magic links + OAuth (Google, Facebook, Apple)
- **UI Components**: Radix UI primitives with Tailwind CSS 3.3 (utility-first)
- **State Management**: TanStack React Query 5.80 for server state
- **Form Handling**: react-hook-form 7.58 + Zod 3.23 validation
- **Image Processing**: Sharp 0.34 for optimization and cropping
- **Email**: Nodemailer 6.9.16 + Resend 6.0
- **Testing**: Jest 29 (unit/integration) + Playwright 1.56 (E2E)
- **Monitoring**: Sentry (error tracking + performance)
- **Rate Limiting**: rate-limiter-flexible 8.1 (in-memory) / Valkey (distributed, future)
- **Drag & Drop**: @dnd-kit/core 6.3 + @dnd-kit/sortable 10.0
- **Date/Time**: date-fns 4.1.0 for timestamp formatting and manipulation

### AI Team Specialist Assignments

| Task                               | Agent                    | Notes                                                      |
| ---------------------------------- | ------------------------ | ---------------------------------------------------------- |
| **Next.js Development**            | react-nextjs-expert      | App Router, Server Components, Server Actions, React Query |
| **UI/Styling**                     | tailwind-frontend-expert | Radix UI + Tailwind, mobile-first (375px min), responsive  |
| **Backend Services**               | backend-developer        | Service layer, Prisma queries, fire-and-forget patterns    |
| **API Design**                     | api-architect            | RESTful endpoints, pagination, filtering, export formats   |
| **Code Review**                    | code-reviewer            | MANDATORY before merges, security, service layer checks    |
| **Performance Optimization**       | performance-optimizer    | Query optimization, bundle size, Core Web Vitals           |
| **Documentation**                  | documentation-specialist | API docs, deployment guides, architecture updates          |
| **Testing (Unit/Integration/E2E)** | Use general development  | Jest tests, Playwright E2E, 80% coverage target            |

### When to Use Each Agent

**react-nextjs-expert** - Use for:

- Implementing new pages or features with App Router
- Server Components vs Client Components decisions
- Data fetching patterns (Server Components, React Query, Server Actions)
- Next.js-specific optimizations (image, font, bundle)
- Metadata and SEO implementation
- Routing and navigation patterns
- Admin UI pages with polling and real-time updates

**tailwind-frontend-expert** - Use for:

- Responsive layouts and mobile-first design (375px minimum)
- Component styling with Tailwind utilities
- Radix UI integration and customization
- Touch-friendly UI (44x44px tap targets)
- Dark mode and theming
- Accessibility improvements (WCAG AA compliance)
- Data tables with sorting, filtering, and pagination

**backend-developer** - Use for:

- Service layer implementation following existing patterns
- Complex database queries with Prisma
- Fire-and-forget async operations (e.g., audit logging)
- Background job processing patterns
- Cron job implementations
- Data export functionality (CSV, JSON)

**api-architect** - Use for:

- Designing new API endpoints with proper RESTful conventions
- Pagination and filtering query parameter design
- API response schema design with Zod validation
- Rate limiting strategy for new endpoints
- Error response format consistency

**code-reviewer** - Use for:

- Pre-merge code reviews (MANDATORY)
- Security audits (permission checks, input validation)
- Service layer compliance verification
- API route security analysis
- Audit logging security review (sensitive data handling)
- Performance regression checks
- Test coverage validation

**performance-optimizer** - Use for:

- Slow page load investigations
- Database query optimization (N+1 queries)
- Bundle size reduction
- Core Web Vitals improvements (LCP, FID, CLS)
- Image optimization strategies
- Caching strategy reviews
- Large dataset pagination optimization

**documentation-specialist** - Use for:

- API documentation updates
- Architecture decision records
- Deployment guide improvements
- User guide creation
- README updates after major features
- Migration guides (e.g., SQLite to PostgreSQL)

### Audit Logging Implementation Guidance

**For the upcoming audit logging feature, use these agent assignments:**

| Component                       | Primary Agent            | Supporting Agent(s)            |
| ------------------------------- | ------------------------ | ------------------------------ |
| Prisma models (AuditLog, etc.)  | backend-developer        | -                              |
| Audit service (fire-and-forget) | backend-developer        | code-reviewer (security)       |
| API endpoints (query/export)    | api-architect            | backend-developer              |
| Admin UI table                  | tailwind-frontend-expert | react-nextjs-expert            |
| Filters & pagination            | react-nextjs-expert      | tailwind-frontend-expert       |
| Real-time polling               | react-nextjs-expert      | -                              |
| Event instrumentation           | backend-developer        | code-reviewer (security audit) |
| Cleanup cron job                | backend-developer        | -                              |

**Audit Service Patterns:**

- Use fire-and-forget pattern: `void auditService.log(...)` - no await
- Never block request response for logging
- Handle logging failures silently (log to console, don't throw)
- Use structured event types: `auth.login`, `user.update`, `content.delete`, `admin.suspend`
- Store IP address, user agent for security events
- Mask sensitive data (passwords, tokens) before logging

**Admin UI Patterns:**

- Data table with Radix UI primitives and Tailwind styling
- Server-side pagination for large datasets
- Debounced filters with URL state (searchParams)
- Real-time polling with React Query (30s-60s interval)
- Export to CSV/JSON for compliance needs
- Mobile-responsive but primarily desktop-focused (admin feature)

### Development Patterns (MANDATORY)

**Service Layer Architecture:**

- ALL write operations MUST use existing services (wish-service, list-service, reservation-service, etc.)
- ALL permission checks MUST use permissionService.require() or permissionService.can()
- NEVER bypass service layer for bulk operations (security risk)
- Direct Prisma queries OK only for simple reads of user's own data after auth
- ESLint enforces service layer compliance (build-blocking errors)
- NEW services should follow modular pattern (see group/ directory structure)

**Mobile-First Development:**

- Design for 375px viewport first (iPhone SE)
- All touch targets minimum 44x44px
- Test on mobile viewports: 375px, 640px, 768px
- No horizontal scrolling allowed
- Progressive disclosure for complex features
- Admin features may prioritize desktop but must remain functional on mobile

**UX "Grandma Test":**

- Use plain English, no technical jargon
- Show full URLs (https://gthanks.app/...), not relative paths
- Friendly error messages with actionable next steps
- Examples in placeholders, not instructions
- Action-oriented copy ("Share with family" not "Configure access control")
- Admin features exempt from "grandma test" (technical audience)

**Testing Requirements:**

- Unit tests for service layer (80% coverage target)
- Integration tests for API routes
- E2E tests for critical user flows (Playwright)
- Mobile viewport testing (375px, 768px)
- All tests must pass before merge

**Security Requirements:**

- Use permissionService for ALL authorization checks
- Rate limiting on all API endpoints (100 req/min baseline)
- Input validation with Zod schemas
- CSRF protection via NextAuth
- No secrets in code (use env vars)
- Sentry for production error monitoring
- Audit logs for security-sensitive operations (auth, admin actions)

### Example Usage Patterns

```bash
# React/Next.js feature development
"@react-nextjs-expert Please implement a Server Component for displaying user wishlists with pagination"

# Mobile-responsive UI work
"@tailwind-frontend-expert Create a mobile-first gift card table with drag-and-drop, minimum 375px viewport"

# Backend service implementation
"@backend-developer Implement the audit-service with fire-and-forget logging following existing service patterns"

# API design for new endpoints
"@api-architect Design the audit log query API with pagination, date range filters, and CSV export"

# Pre-merge security review
"@code-reviewer Review the new audit logging implementation for security issues and sensitive data handling"

# Performance investigation
"@performance-optimizer Analyze why the audit logs page is loading slowly, check for N+1 queries"

# Documentation after feature
"@documentation-specialist Update API docs to reflect the new audit logging endpoints"
```

### Quick Reference Commands

- Run E2E tests: `/test-e2e` or `pnpm test:e2e`
- Check service layer: `pnpm lint:service-layer`
- Review code: `@code-reviewer` before merging to main
- Optimize performance: `@performance-optimizer` when users report slowness
- Update docs: `@documentation-specialist` after major features

---

## Playwright MCP with Authentication

### Overview

The Playwright MCP is configured to maintain persistent authentication across sessions using a browser profile stored in `.playwright-profile/`. This enables Claude Code to access authenticated pages automatically.

### First-Time Setup

1. **Run the authentication command**:

   ```
   /playwright-auth
   ```

   This will:
   - Check if dev server is running (start it if not)
   - Open a browser with persistent profile
   - Navigate to the login page
   - Monitor logs for magic link
   - Automatically navigate to magic link
   - Verify session cookie is created

2. **Complete the login flow**:
   - Enter test email (e.g., `test@example.com`)
   - Click "Send Magic Link"
   - Wait for automatic navigation (or paste link if prompted)
   - Verify authentication success message

3. **Restart Claude Code** to reload MCP configuration

### Usage

After setup, Playwright MCP commands automatically use your authenticated session:

**Navigate to authenticated pages**:

```
mcp__playwright__browser_navigate {"url": "http://localhost:3000/lists"}
```

**Take screenshot of user dashboard**:

```
mcp__playwright__browser_take_screenshot {"filename": "dashboard.png"}
```

**Interact with authenticated elements**:

```
mcp__playwright__browser_click {"element": "Create New List", "ref": "..."}
```

**Get page snapshot**:

```
mcp__playwright__browser_snapshot
```

### How It Works

The `/playwright-auth` command:

1. **Pre-flight**: Checks profile directory and dev server status
2. **Server**: Starts dev server with log capture if not running
3. **Monitoring**: Tails server logs for magic link in background
4. **Browser**: Opens Playwright to `/auth/login` with persistent profile
5. **Extraction**: Captures magic link from server console output
6. **Navigation**: Automatically opens magic link in browser
7. **Verification**: Confirms NextAuth session token exists
8. **Cleanup**: Removes temp files and background processes

**Automatic Mode**: When command starts the dev server, magic link is captured automatically

**Manual Mode**: When server already running, paste magic link from console when prompted

### Troubleshooting

**Session Expired**:

```
/playwright-auth
```

Re-run the command to refresh authentication.

**Profile Corruption**:

```bash
rm -rf .playwright-profile/
```

Then run `/playwright-auth` to create fresh profile.

**Manual Mode**:
If automatic magic link detection fails:

1. Check dev server console for magic link
2. Copy the full URL: `http://localhost:3000/api/auth/callback/email?token=...&email=...`
3. Paste when prompted by the command

**Dev Server Not Running**:
The command will start it automatically. If it fails:

```bash
# Check port 3000 availability
lsof -i :3000

# Start manually
pnpm dev
```

**Cookie Not Found**:
Verify you completed the full login flow in the browser. You should see a success page after clicking the magic link.

**MCP Not Using Profile**:

- Verify `.mcp.json` contains playwright configuration
- Check that `.playwright-profile/` directory exists
- Restart Claude Code after configuration changes

### Security Notes

- `.playwright-profile/` is gitignored to prevent credential leaks
- Only the directory structure (`.gitkeep`) is tracked in git
- Profile contains sensitive session cookies - keep it secure
- Re-authenticate periodically as sessions expire (typically 30 days)

### Advanced: Multiple Profiles

For different environments (dev, staging, production):

**Update `.mcp.json`**:

```json
{
  "mcpServers": {
    "playwright-dev": {
      "command": "npx",
      "args": ["@playwright/mcp@latest", "--user-data-dir=.playwright-profile-dev"]
    },
    "playwright-staging": {
      "command": "npx",
      "args": ["@playwright/mcp@latest", "--user-data-dir=.playwright-profile-staging"]
    }
  }
}
```

**Create profiles manually**:

```bash
npx playwright open http://staging.example.com/auth/login --user-data-dir=.playwright-profile-staging
```

Then complete authentication in the opened browser.
