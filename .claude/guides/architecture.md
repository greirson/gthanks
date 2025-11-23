# Architecture & Design Patterns

## Database Schema

The gthanks platform uses **17 Prisma models** organized into logical domains:

### Core Domain Models

**User Management (2 models)**

- `User` - Main user account with OAuth, admin fields, vanity URLs, and theme preferences
- `UserEmail` - Multiple email support with verification tokens

**Authentication (4 models)**

- `Session` - NextAuth session management
- `Account` - OAuth provider accounts (Google, Facebook, Apple, OIDC)
- `VerificationToken` - Email verification tokens
- `MagicLink` - Passwordless magic link authentication

**Wish Management (2 models)**

- `Wish` - Individual wish items with metadata, priority levels, and image processing
- `UserPreference` - Per-user sorting, filtering, and notification preferences

**List Management (1 model)**

- `List` - Wish collections with visibility control (private, public, password, link, group)

**Group Management (1 model)**

- `Group` - Family/friend groups for coordinated gift giving

### Relationship Models

**List Relationships (3 models)**

- `ListWish` - Many-to-many between lists and wishes with priority levels
- `ListAdmin` - Co-admin permissions for lists
- `ListGroup` - Lists shared with groups

**Group Relationships (2 models)**

- `UserGroup` - Group memberships with roles (member, admin)
- `GroupInvitation` - Pending group invitations with expiration

**Other Relationships (2 models)**

- `ListInvitation` - Pending list invitations with expiration
- `Reservation` - Gift reservations (hidden from list owners)

### Database Design Principles

1. **Cascade Deletes** - All foreign keys use `onDelete: Cascade` to prevent orphaned records
2. **Comprehensive Indexing** - Strategic indexes on:
   - Foreign keys (userId, listId, groupId, wishId)
   - Lookup fields (email, token, shareToken, username)
   - Filter/sort combinations (ownerId + createdAt, ownerId + wishLevel)
   - Composite queries (groupId + role, listId + acceptedAt)
3. **Soft Deletes** - Not implemented (hard deletes via CASCADE for data minimization)
4. **Audit Fields** - All models have `createdAt`; most have `updatedAt`
5. **Naming Conventions** - MANDATORY Prisma schema rules (see below)

### Prisma Naming Conventions (MANDATORY)

**All Prisma models and relations MUST follow these conventions:**

#### Model Names

- **ALWAYS use PascalCase** (e.g., `SiteSettings`, `UserEmail`, `ListWish`)
- **NEVER use snake_case** (e.g., ~~`site_settings`~~, ~~`user_email`~~)
- Use `@@map("table_name")` when database table uses snake_case

```prisma
// ✅ Correct
model SiteSettings {
  id           String @id
  loginMessage String?
  @@map("site_settings")
}

// ❌ Wrong - breaks TypeScript client
model site_settings {
  id           String @id
  loginMessage String?
}
```

#### Relation Fields

- **MUST use camelCase** (lowercase first letter, matching the target model name)
- Prisma Client will use these exact field names in TypeScript accessors

```prisma
// ✅ Correct - relation field uses camelCase
model UserEmail {
  id     String @id
  userId String
  user   User   @relation(fields: [userId], references: [id])  // lowercase u
  @@map("user_emails")
}

// ❌ Wrong - PascalCase relation breaks TypeScript
model UserEmail {
  id     String @id
  userId String
  User   User   @relation(fields: [userId], references: [id])  // Capital U (breaks)
}
```

#### Generated Client Behavior

```typescript
// With camelCase relation field "user"
const email = await db.userEmail.findFirst({
  include: { user: true }  // ✅ Works - lowercase matches field name
})

// With PascalCase relation field "User"
const email = await db.userEmail.findFirst({
  include: { user: true }  // ❌ Breaks - expects "User" not "user"
  include: { User: true }  // ✅ Works but doesn't match actual field name
})
```

#### Real Examples from Schema

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

#### Why This Matters

1. **Consistency**: All relation fields follow camelCase convention
2. **Type Safety**: TypeScript expects field names exactly as declared in schema
3. **Developer Experience**: Lowercase first letter is JavaScript/TypeScript standard
4. **No Generated Accessors**: We use relation fields directly, no automatic transformation

#### Validation Commands

Before committing schema changes:

```bash
# Check all models use PascalCase
grep "^model [a-z]" prisma/schema.prisma
# Should return nothing (all models start with capital letter)

# Regenerate Prisma client
pnpm prisma generate

# Verify TypeScript compilation
pnpm typecheck
```

### Key Relationships

```
User
├── 1:N Wishes (creator)
├── 1:N Lists (owner)
├── N:M Lists (via ListAdmin - co-admin)
├── N:M Groups (via UserGroup - member)
├── 1:N GroupInvitations (inviter)
├── 1:N ListInvitations (inviter)
└── 1:1 UserPreference

List
├── N:M Wishes (via ListWish)
├── N:M Users (via ListAdmin - co-admins)
├── N:M Groups (via ListGroup - shared with)
└── 1:N ListInvitations

Group
├── N:M Users (via UserGroup)
├── N:M Lists (via ListGroup)
└── 1:N GroupInvitations

Wish
├── N:M Lists (via ListWish)
└── 1:N Reservations
```

## Project Structure

```
gthanks-dev/
├── src/
│   ├── app/                    # Next.js App Router
│   │   ├── api/                # API routes
│   │   │   ├── auth/           # NextAuth endpoints
│   │   │   ├── wishes/         # Wish CRUD endpoints
│   │   │   ├── lists/          # List CRUD endpoints
│   │   │   ├── groups/         # Group CRUD endpoints
│   │   │   ├── admin/          # Admin endpoints
│   │   │   └── reservations/   # Reservation endpoints
│   │   ├── (auth)/             # Auth pages (route group)
│   │   │   ├── login/
│   │   │   ├── setup/
│   │   │   └── verify/
│   │   ├── (admin)/            # Admin pages (route group)
│   │   │   └── users/
│   │   ├── wishes/             # Wish management pages
│   │   ├── lists/              # List management pages
│   │   ├── groups/             # Group management pages
│   │   ├── profile/            # User profile pages
│   │   └── layout.tsx          # Root layout
│   ├── components/             # React components
│   │   ├── ui/                 # Radix UI primitives
│   │   ├── wishes/             # Wish-specific components
│   │   ├── lists/              # List-specific components
│   │   ├── groups/             # Group-specific components
│   │   ├── admin/              # Admin components
│   │   └── common/             # Shared components
│   ├── lib/
│   │   ├── services/           # Domain services (see below)
│   │   ├── auth.ts             # NextAuth configuration
│   │   ├── db.ts               # Prisma client singleton
│   │   ├── email.ts            # Email sending utilities
│   │   ├── image.ts            # Image processing (Sharp)
│   │   ├── scraper.ts          # URL metadata extraction
│   │   ├── rate-limit.ts       # Rate limiting utilities
│   │   ├── errors.ts           # Custom error classes
│   │   └── utils.ts            # Shared utilities
│   ├── hooks/                  # Custom React hooks
│   ├── types/                  # TypeScript type definitions
│   └── middleware.ts           # Next.js middleware
├── prisma/
│   ├── schema.prisma           # Database schema (17 models)
│   └── seed.ts                 # Development seed data
├── tests/
│   ├── unit/                   # Jest unit tests
│   ├── integration/            # Integration tests
│   └── e2e/                    # Playwright E2E tests
├── .claude/                    # Claude Code configuration
│   ├── commands/               # Slash commands
│   └── guides/                 # Documentation (this file)
├── docs/                       # Deployment guides
├── public/                     # Static assets
├── data/                       # SQLite database (gitignored)
└── uploads/                    # User-uploaded images (gitignored)
```

## Service Layer Architecture

### Domain Services

The service layer follows **domain-driven design** principles with centralized permission checks:

```
src/lib/services/
├── admin-service.ts              # Admin user management
├── list-invitation.service.ts    # List invitation handling
├── list-service.ts               # List CRUD operations
├── permission-service.ts         # Authorization (MANDATORY)
├── reservation-service.ts        # Gift reservation logic
├── wish-service.ts               # Wish CRUD + bulk operations
└── group/                        # Modular group services
    ├── group.service.ts          # Main entry point
    ├── group-management.service.ts # CRUD operations
    ├── group-membership.service.ts # Member management
    ├── group-invitation.service.ts # Invitation handling
    └── group-list-sharing.service.ts # List sharing
```

### Service Design Principles

1. **Permission-First** - All write operations MUST use `permissionService`
2. **Transaction Safety** - Complex operations use Prisma transactions
3. **Single Responsibility** - Services split at 300-500 line threshold
4. **Centralized Logic** - Business rules in services, not API routes
5. **Bulk Operations** - All multi-record operations in services (security requirement)

### When to Use Services (MANDATORY)

Services MUST be used for:

1. **Bulk Operations** - Any API route that modifies multiple records

   ```typescript
   // ✅ Correct
   await wishService.deleteWishes(wishIds, userId);

   // ❌ Wrong
   await db.wish.deleteMany({ where: { id: { in: wishIds } } });
   ```

2. **Permission-Sensitive Operations** - Write operations requiring authorization

   ```typescript
   // ✅ Correct
   await wishService.updateWish(wishId, data, userId);

   // ❌ Wrong
   const wish = await db.wish.findFirst({ where: { id: wishId, ownerId: userId } });
   await db.wish.update({ where: { id: wishId }, data });
   ```

3. **Complex Transactions** - Multi-step database operations

   ```typescript
   // ✅ Correct
   await wishService.deleteWish(wishId, userId);
   // Handles: wish deletion, list associations, reservations, image cleanup

   // ❌ Wrong
   await db.$transaction([
     db.listWish.deleteMany({ where: { wishId } }),
     db.reservation.deleteMany({ where: { wishId } }),
     db.wish.delete({ where: { id: wishId } }),
   ]);
   ```

### When Direct Queries Are OK

Direct Prisma queries are acceptable for:

1. **Simple Reads** - Public data or data pre-filtered by auth

   ```typescript
   // OK: User's own data after auth check
   const wishes = await db.wish.findMany({
     where: { ownerId: user.id },
   });
   ```

2. **Aggregations** - Count, sum, etc. where no authorization logic needed

   ```typescript
   // OK: Simple count
   const count = await db.wish.count({
     where: { ownerId: user.id },
   });
   ```

3. **Lookups** - Finding records by ID for display (no mutation)
   ```typescript
   // OK: Read-only display
   const list = await db.list.findUnique({ where: { id } });
   ```

### Permission Service (MANDATORY)

All permission checks MUST use the centralized permission service:

```typescript
// ✅ Correct - Throws ForbiddenError if not allowed
await permissionService.require(userId, 'edit', {
  type: 'wish',
  id: wishId,
});

// ✅ Correct - Returns { allowed: boolean, reason?: string }
const { allowed } = await permissionService.can(userId, 'delete', {
  type: 'list',
  id: listId,
});

// ❌ NEVER do this - Bypasses permission logic
const wish = await db.wish.findFirst({
  where: { id: wishId, ownerId: userId },
});
if (!wish) throw new ForbiddenError('Not authorized');
```

**Why Permission Service is Mandatory:**

- Permission logic is complex (owners, admins, group members, public/password lists)
- Manual checks bypass business rules and create security holes
- Centralized logic is easier to audit and update
- Supports future features (delegated access, temporary sharing, etc.)

### ESLint Enforcement

The project enforces service layer compliance with custom ESLint rules:

```bash
# Check service layer compliance
pnpm lint:service-layer

# Fix auto-fixable issues
pnpm lint:fix
```

**Rules:**

- `local-rules/no-direct-db-import` - Warns on `import { db }` in API routes
- `local-rules/use-permission-service` - Warns on manual permission patterns

**Build Integration:**

- ESLint rules configured as **errors** (not warnings)
- Production builds fail if service layer violations detected
- Pre-commit hooks prevent committing violations

### Service Layer Benefits

1. **Security** - Centralized permission checks prevent authorization bypasses
2. **Code Reuse** - Bulk operations eliminate 175+ lines of duplication
3. **Maintainability** - Business logic changes in one place
4. **Testability** - Services easier to test than API routes
5. **Auditability** - Permission checks trackable through single service

## Data Fetching Strategy

### Server Components (Default)

Use Server Components for:

- Initial page loads
- SEO-critical content
- Data that doesn't change frequently
- Read-only displays

```typescript
// app/wishes/page.tsx
export default async function WishesPage() {
  const wishes = await db.wish.findMany({ where: { ownerId: userId } });
  return <WishList wishes={wishes} />;
}
```

### React Query (Interactivity)

Use TanStack React Query for:

- Interactive UI (real-time updates)
- Optimistic updates
- Pagination/infinite scroll
- Client-side caching

```typescript
// components/wishes/WishList.tsx
const { data: wishes } = useQuery({
  queryKey: ['wishes', userId],
  queryFn: () => fetch('/api/wishes').then((r) => r.json()),
  staleTime: 60_000, // 1 minute
});
```

### Server Actions (Mutations)

Use Server Actions for:

- Form submissions
- Simple mutations
- Progressive enhancement

```typescript
// app/wishes/actions.ts
'use server';

export async function createWish(formData: FormData) {
  const userId = await getAuthUserId();
  const data = parseFormData(formData);
  await wishService.createWish(data, userId);
  revalidatePath('/wishes');
}
```

### API Routes (Explicit API)

Use API Routes for:

- Complex mutations
- External integrations
- Rate-limited endpoints
- Non-form submissions

```typescript
// app/api/wishes/route.ts
export async function POST(req: Request) {
  const userId = await getAuthUserId();
  const data = await req.json();
  const wish = await wishService.createWish(data, userId);
  return Response.json(wish);
}
```

## Error Handling

### Custom Error Classes

```typescript
// src/lib/errors.ts
export class NotFoundError extends Error {
  statusCode = 404;
}

export class ForbiddenError extends Error {
  statusCode = 403;
}

export class ValidationError extends Error {
  statusCode = 400;
}
```

### API Route Error Handling

```typescript
// app/api/wishes/[id]/route.ts
export async function GET(req: Request, { params }: { params: { id: string } }) {
  try {
    const userId = await getAuthUserId();
    const wish = await wishService.getWish(params.id, userId);
    return Response.json(wish);
  } catch (error) {
    if (error instanceof NotFoundError) {
      return Response.json({ error: error.message }, { status: 404 });
    }
    if (error instanceof ForbiddenError) {
      return Response.json({ error: error.message }, { status: 403 });
    }
    // Log unexpected errors (Sentry in production)
    console.error('Unexpected error:', error);
    return Response.json({ error: 'Internal server error' }, { status: 500 });
  }
}
```

## Rate Limiting

### Single-Instance Strategy

Current implementation uses `rate-limiter-flexible` with in-memory storage:

**Multi-Tiered Limits:**

- Anonymous requests: By IP address
- Authenticated requests: By user ID
- Admin users: Higher limits or bypassed

**Common Limits:**

- Login attempts: 5 per 15 minutes
- API requests: 100 per minute (authenticated)
- API requests: 20 per minute (anonymous)
- Email sending: 10 per hour

### Future: Distributed Strategy

For multi-instance deployments, use Valkey/Redis as shared storage:

```typescript
// lib/rate-limit.ts
import { RateLimiterRedis } from 'rate-limiter-flexible';
import Redis from 'ioredis';

const redis = new Redis(process.env.REDIS_URL);

export const apiLimiter = new RateLimiterRedis({
  storeClient: redis,
  points: 100,
  duration: 60,
  keyPrefix: 'api',
});
```

## Image Processing Pipeline

1. **URL Extraction** - Scrape metadata from product URLs
2. **Download** - Fetch remote image
3. **Processing** - Sharp library (resize, optimize, format conversion)
4. **Storage** - Local filesystem (`uploads/` directory)
5. **Serving** - Next.js static file serving

**Status Tracking:**

- `PENDING` - Image URL received, not yet processed
- `PROCESSING` - Download/processing in progress
- `COMPLETED` - Image ready to display
- `FAILED` - Processing error (fallback to original URL)

## Authentication Flow

1. **Magic Link** - Email-based passwordless authentication
2. **OAuth** - Google, Facebook, Apple, generic OIDC
3. **Session Management** - NextAuth.js session cookies
4. **Onboarding** - First-time user setup (username selection)

## Deployment Architecture

### Single-Server Deployment (Current)

**Components:**

- Next.js application (single container)
- SQLite or PostgreSQL database
- Local filesystem for uploads
- In-memory rate limiting

**Scalability:**

- Supports 100s-1000s of users
- Vertical scaling (larger server)
- Simple backup/restore

### Future: Distributed Deployment

**Components:**

- Multiple Next.js instances (horizontal scaling)
- PostgreSQL database (managed service or cluster)
- S3-compatible object storage for uploads
- Valkey/Redis for rate limiting and caching
- Load balancer (nginx, AWS ALB, etc.)

**Scalability:**

- Supports 10,000+ concurrent users
- Horizontal scaling (add more containers)
- High availability (multi-region)
