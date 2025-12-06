# API Routes & Conventions

## Route Organization

```
src/app/api/
├── auth/
│   ├── [...nextauth]/route.ts      # NextAuth.js endpoints
│   ├── magic-link/route.ts         # Magic link generation
│   └── verify/route.ts             # Email verification
├── wishes/
│   ├── route.ts                    # GET (list), POST (create)
│   ├── [id]/route.ts               # GET, PATCH, DELETE
│   ├── [id]/image/route.ts         # Image upload/processing
│   └── bulk-delete/route.ts        # DELETE multiple wishes
├── lists/
│   ├── route.ts                    # GET (list), POST (create)
│   ├── [id]/route.ts               # GET, PATCH, DELETE
│   ├── [id]/wishes/route.ts        # Manage list wishes
│   ├── [id]/admins/route.ts        # Manage co-admins
│   ├── [id]/share/route.ts         # Share list
│   └── [id]/password/route.ts      # Verify list password
├── groups/
│   ├── route.ts                    # GET (list), POST (create)
│   ├── [id]/route.ts               # GET, PATCH, DELETE
│   ├── [id]/members/route.ts       # Manage group members
│   ├── [id]/invite/route.ts        # Send group invitation
│   └── [id]/lists/route.ts         # Share lists with group
├── reservations/
│   ├── route.ts                    # POST (create reservation)
│   ├── [id]/route.ts               # DELETE (remove reservation)
│   └── verify/route.ts             # Verify reservation token
├── admin/
│   ├── users/route.ts              # GET (list users)
│   ├── users/[id]/route.ts         # PATCH (update user)
│   └── users/[id]/suspend/route.ts # POST (suspend user)
└── health/route.ts                 # Health check endpoint
```

## RESTful Conventions

| Method | Purpose              | Success Status |
| ------ | -------------------- | -------------- |
| GET    | Retrieve resource(s) | 200 OK         |
| POST   | Create new resource  | 201 Created    |
| PATCH  | Partial update       | 200 OK         |
| PUT    | Full replacement     | 200 OK         |
| DELETE | Remove resource      | 204 No Content |

**URL Structure:**

- Collections: `GET/POST /api/wishes`
- Resources: `GET/PATCH/DELETE /api/wishes/[id]`
- Sub-resources: `GET/POST /api/lists/[id]/wishes`

## Error Codes

| Status | Use Case          | Example                  |
| ------ | ----------------- | ------------------------ |
| 400    | Bad Request       | Invalid input data       |
| 401    | Unauthorized      | Missing or invalid auth  |
| 403    | Forbidden         | Insufficient permissions |
| 404    | Not Found         | Resource doesn't exist   |
| 409    | Conflict          | Duplicate resource       |
| 422    | Unprocessable     | Business logic error     |
| 429    | Too Many Requests | Rate limit exceeded      |
| 500    | Internal Error    | Unexpected server error  |

## API Response Validation (MANDATORY)

All API endpoints MUST return data matching frontend Zod schemas.

**Common Issue:** Service returns incomplete data -> Zod validation fails at runtime.

**Prevention Checklist:**

1. Check frontend API client schema (e.g., `ReservationWithWishSchema`)
2. Match service method return type to schema requirements
3. Include all nested relations in Prisma queries

**Common Include Patterns:**

```typescript
// Reservations with Wishes
include: {
  wish: {
    include: {
      user: {
        select: {
          (id, name, email);
        }
      }
    }
  }
}

// Lists with Wishes
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

**When you see:** `Expected object, received undefined` at path `["wish"]`

- Find frontend schema -> Check service method -> Add missing `include` -> Update return type

## Authentication

- Use `auth()` from `@/lib/auth` to get session
- Check `session?.user` for authenticated routes
- Check `session?.user?.isAdmin` for admin routes
- Always use service layer for mutations (includes permission checks)

## Rate Limiting

**Global:** 100 requests/minute per IP (middleware)

**Category Limits:**

- Login: 5/15min
- API (auth): 100/min
- API (anon): 20/min
- Uploads: 10/hour
- Email: 10/hour

See `docs/RATE_LIMITING.md` for full configuration.

## Request Validation

Use Zod schemas for all request body validation:

```typescript
const result = schema.safeParse(body);
if (!result.success) {
  return NextResponse.json(
    { error: 'Validation failed', details: result.error.issues },
    { status: 400 }
  );
}
```

## Response Formats

**Success:** Resource object or `{ data: [...], pagination: {...} }`

**Error:** `{ error: "message", details?: [...] }`

**Pagination:** `{ total, page, pageSize, totalPages }`
