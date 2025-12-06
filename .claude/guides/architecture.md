# Architecture & Design Patterns

## Database Schema

The gthanks platform uses **17 Prisma models** organized into logical domains:

### Core Models

| Domain           | Models                                                 |
| ---------------- | ------------------------------------------------------ |
| User Management  | `User`, `UserEmail`                                    |
| Authentication   | `Session`, `Account`, `VerificationToken`, `MagicLink` |
| Wish Management  | `Wish`, `UserPreference`                               |
| List Management  | `List`                                                 |
| Group Management | `Group`                                                |

### Relationship Models

| Domain              | Models                               |
| ------------------- | ------------------------------------ |
| List Relationships  | `ListWish`, `ListAdmin`, `ListGroup` |
| Group Relationships | `UserGroup`, `GroupInvitation`       |
| Other               | `ListInvitation`, `Reservation`      |

### Key Relationships

```
User
├── 1:N Wishes, Lists, GroupInvitations, ListInvitations
├── N:M Lists (via ListAdmin), Groups (via UserGroup)
└── 1:1 UserPreference

List
├── N:M Wishes (via ListWish), Users (via ListAdmin), Groups (via ListGroup)
└── 1:N ListInvitations

Group
├── N:M Users (via UserGroup), Lists (via ListGroup)
└── 1:N GroupInvitations

Wish ── N:M Lists (via ListWish), 1:N Reservations
```

### Database Design Principles

1. **Cascade Deletes** - All foreign keys use `onDelete: Cascade`
2. **Comprehensive Indexing** - Foreign keys, lookup fields, filter/sort combinations
3. **Audit Fields** - All models have `createdAt`; most have `updatedAt`

## Prisma Naming Conventions (MANDATORY)

- **Model names**: ALWAYS PascalCase (`SiteSettings`, `UserEmail`)
- **Relation fields**: MUST use camelCase (`user`, `listWishes`)
- **Table mapping**: Use `@@map("table_name")` when DB uses snake_case

```prisma
// Correct pattern
model UserEmail {
  id     String @id
  userId String
  user   User   @relation(fields: [userId], references: [id])  // camelCase
  @@map("user_emails")
}
```

## Project Structure

```
src/
├── app/                    # Next.js App Router
│   ├── api/                # API routes (auth, wishes, lists, groups, admin)
│   ├── (auth)/             # Auth pages (login, setup, verify)
│   ├── (admin)/            # Admin pages
│   └── [domain]/           # Feature pages (wishes, lists, groups, profile)
├── components/
│   ├── ui/                 # Radix UI primitives
│   ├── [domain]/           # Domain-specific components
│   ├── admin/              # Admin components
│   └── common/             # Shared components
├── lib/
│   ├── services/           # Domain services (see below)
│   ├── auth.ts, db.ts      # Core utilities
│   ├── email.ts, image.ts  # Feature utilities
│   └── errors.ts           # Custom error classes
├── hooks/                  # Custom React hooks
├── types/                  # TypeScript definitions
└── middleware.ts           # Next.js middleware
```

## Service Layer Architecture

```
src/lib/services/
├── admin-service.ts              # Admin user management
├── list-invitation.service.ts    # List invitation handling
├── list-service.ts               # List CRUD operations
├── permission-service.ts         # Authorization (MANDATORY)
├── reservation-service.ts        # Gift reservation logic
├── wish-service.ts               # Wish CRUD + bulk operations
└── group/                        # Modular group services
```

### Service Layer Rules

**MUST use services for:**

- Bulk operations (multi-record modifications)
- Permission-sensitive write operations
- Complex transactions (multi-step database operations)

**Direct Prisma queries OK for:**

- Simple reads (user's own data after auth)
- Aggregations (count, sum)
- Read-only lookups

### Permission Service (MANDATORY)

All permission checks MUST use `permissionService`:

```typescript
// Correct - use require() or can()
await permissionService.require(userId, 'edit', { type: 'wish', id: wishId });
const { allowed } = await permissionService.can(userId, 'delete', { type: 'list', id });

// NEVER manually check ownership - bypasses business rules
```

### ESLint Enforcement

- `pnpm lint:service-layer` - Check compliance
- Rules configured as **errors** (build-blocking)
- Pre-commit hooks prevent violations

## Image Processing Pipeline

1. URL Extraction -> 2. Download -> 3. Sharp processing -> 4. Local storage -> 5. Next.js serving

**Status**: `PENDING` -> `PROCESSING` -> `COMPLETED` | `FAILED`

## Authentication Flow

1. Magic Link (email-based)
2. OAuth (Google, Facebook, Apple, OIDC)
3. Session Management (NextAuth.js)
4. Onboarding (username selection)

## Deployment Architecture

**Current (Single-Server):**

- Next.js container + SQLite/PostgreSQL + local uploads + in-memory rate limiting
- Supports 100s-1000s users, vertical scaling

**Future (Distributed):**

- Multiple containers + managed PostgreSQL + S3 storage + Valkey/Redis
- Supports 10,000+ users, horizontal scaling
