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

### HTTP Methods

| Method | Purpose | Success Status |
|--------|---------|---------------|
| GET | Retrieve resource(s) | 200 OK |
| POST | Create new resource | 201 Created |
| PATCH | Partial update | 200 OK |
| PUT | Full replacement | 200 OK |
| DELETE | Remove resource | 204 No Content |

### URL Structure

```
# Resource collections
GET    /api/wishes              # List all wishes
POST   /api/wishes              # Create wish

# Individual resources
GET    /api/wishes/[id]         # Get wish
PATCH  /api/wishes/[id]         # Update wish
DELETE /api/wishes/[id]         # Delete wish

# Sub-resources
GET    /api/lists/[id]/wishes   # Get wishes in list
POST   /api/lists/[id]/wishes   # Add wish to list
DELETE /api/lists/[id]/wishes/[wishId]  # Remove wish from list
```

## Authentication Flow

### Session Management

```typescript
// lib/auth.ts
import NextAuth from 'next-auth';
import GoogleProvider from 'next-auth/providers/google';
import { PrismaAdapter } from '@next-auth/prisma-adapter';
import { db } from '@/lib/db';

export const { handlers, auth, signIn, signOut } = NextAuth({
  adapter: PrismaAdapter(db),
  providers: [
    GoogleProvider({
      clientId: process.env.GOOGLE_CLIENT_ID!,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET!,
    }),
    // ... other providers
  ],
  callbacks: {
    session({ session, user }) {
      // Attach user ID and role to session
      session.user.id = user.id;
      session.user.isAdmin = user.isAdmin;
      session.user.username = user.username;
      return session;
    },
  },
});
```

### Protected API Routes

```typescript
// app/api/wishes/route.ts
import { auth } from '@/lib/auth';
import { NextResponse } from 'next/server';

export async function POST(req: Request) {
  // Check authentication
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json(
      { error: 'Unauthorized' },
      { status: 401 }
    );
  }

  const userId = session.user.id;
  const data = await req.json();

  // Use service layer
  const wish = await wishService.createWish(data, userId);

  return NextResponse.json(wish, { status: 201 });
}
```

### Admin-Only Routes

```typescript
// app/api/admin/users/route.ts
export async function GET(req: Request) {
  const session = await auth();

  // Check admin permission
  if (!session?.user?.isAdmin) {
    return NextResponse.json(
      { error: 'Forbidden - Admin access required' },
      { status: 403 }
    );
  }

  const users = await adminService.listUsers();
  return NextResponse.json(users);
}
```

## Request/Response Patterns

### Request Body Validation

Use Zod schemas for validation:

```typescript
// lib/schemas/wish.ts
import { z } from 'zod';

export const createWishSchema = z.object({
  title: z.string().min(1).max(200),
  url: z.string().url().optional().or(z.literal('')),
  price: z.number().positive().optional(),
  currency: z.string().length(3).optional(),
  notes: z.string().max(1000).optional(),
  wishLevel: z.number().int().min(1).max(3).default(1),
  quantity: z.number().int().positive().default(1),
});

// API route
export async function POST(req: Request) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const body = await req.json();

  // Validate request body
  const result = createWishSchema.safeParse(body);
  if (!result.success) {
    return NextResponse.json(
      { error: 'Validation failed', details: result.error.issues },
      { status: 400 }
    );
  }

  const wish = await wishService.createWish(result.data, session.user.id);
  return NextResponse.json(wish, { status: 201 });
}
```

### Response Formats

**Success Response:**
```json
{
  "id": "clh1x2y3z4",
  "title": "Red Bike",
  "price": 299.99,
  "currency": "USD",
  "wishLevel": 3,
  "ownerId": "clh0abc123",
  "createdAt": "2024-01-15T10:30:00Z",
  "updatedAt": "2024-01-15T10:30:00Z"
}
```

**Error Response:**
```json
{
  "error": "Validation failed",
  "details": [
    {
      "code": "too_small",
      "minimum": 1,
      "type": "string",
      "path": ["title"],
      "message": "Title is required"
    }
  ]
}
```

**Collection Response (with Pagination):**
```json
{
  "data": [...],
  "pagination": {
    "total": 42,
    "page": 1,
    "pageSize": 20,
    "totalPages": 3
  }
}
```

## Error Handling

### Standard Error Codes

| Status | Use Case | Example |
|--------|----------|---------|
| 400 | Bad Request | Invalid input data |
| 401 | Unauthorized | Missing or invalid auth |
| 403 | Forbidden | Insufficient permissions |
| 404 | Not Found | Resource doesn't exist |
| 409 | Conflict | Duplicate resource |
| 422 | Unprocessable | Business logic error |
| 429 | Too Many Requests | Rate limit exceeded |
| 500 | Internal Error | Unexpected server error |

### Error Handler Pattern

```typescript
// lib/api-error-handler.ts
import { NextResponse } from 'next/server';
import * as Sentry from '@sentry/nextjs';
import {
  NotFoundError,
  ForbiddenError,
  ValidationError,
} from '@/lib/errors';

export function handleApiError(error: unknown) {
  // Known error types
  if (error instanceof ValidationError) {
    return NextResponse.json(
      { error: error.message },
      { status: 400 }
    );
  }

  if (error instanceof ForbiddenError) {
    return NextResponse.json(
      { error: error.message },
      { status: 403 }
    );
  }

  if (error instanceof NotFoundError) {
    return NextResponse.json(
      { error: error.message },
      { status: 404 }
    );
  }

  // Unexpected errors
  console.error('Unexpected API error:', error);
  Sentry.captureException(error);

  return NextResponse.json(
    { error: 'Internal server error' },
    { status: 500 }
  );
}

// Usage in API routes
export async function DELETE(req: Request, { params }: { params: { id: string } }) {
  try {
    const session = await auth();
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    await wishService.deleteWish(params.id, session.user.id);
    return new NextResponse(null, { status: 204 });
  } catch (error) {
    return handleApiError(error);
  }
}
```

## Rate Limiting

### Per-Endpoint Limits

```typescript
// lib/rate-limit.ts
import { RateLimiterMemory } from 'rate-limiter-flexible';

// Different limiters for different endpoints
export const authLimiter = new RateLimiterMemory({
  points: 5, // 5 requests
  duration: 60 * 15, // per 15 minutes
});

export const apiLimiter = new RateLimiterMemory({
  points: 100, // 100 requests
  duration: 60, // per minute
});

export const uploadLimiter = new RateLimiterMemory({
  points: 10, // 10 uploads
  duration: 60 * 60, // per hour
});
```

### Apply Rate Limiting

```typescript
// app/api/wishes/route.ts
import { apiLimiter } from '@/lib/rate-limit';

export async function POST(req: Request) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  // Apply rate limit
  const key = `wish:create:${session.user.id}`;
  try {
    await apiLimiter.consume(key);
  } catch (error) {
    return NextResponse.json(
      { error: 'Too many requests. Please try again later.' },
      { status: 429 }
    );
  }

  // Process request
  const data = await req.json();
  const wish = await wishService.createWish(data, session.user.id);

  return NextResponse.json(wish, { status: 201 });
}
```

### Rate Limit by IP (Anonymous)

```typescript
// For unauthenticated endpoints
import { headers } from 'next/headers';

export async function POST(req: Request) {
  const headersList = headers();
  const ip = headersList.get('x-forwarded-for') || headersList.get('x-real-ip') || 'unknown';

  const key = `anon:${ip}`;
  try {
    await apiLimiter.consume(key);
  } catch (error) {
    return NextResponse.json(
      { error: 'Too many requests' },
      { status: 429 }
    );
  }

  // Process request...
}
```

## Pagination

### Query Parameters

```
GET /api/wishes?page=2&pageSize=20&sortBy=createdAt&sortOrder=desc
```

### Implementation

```typescript
// app/api/wishes/route.ts
export async function GET(req: Request) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { searchParams } = new URL(req.url);
  const page = parseInt(searchParams.get('page') || '1');
  const pageSize = parseInt(searchParams.get('pageSize') || '20');
  const sortBy = searchParams.get('sortBy') || 'createdAt';
  const sortOrder = searchParams.get('sortOrder') || 'desc';

  // Fetch data
  const skip = (page - 1) * pageSize;
  const [wishes, total] = await Promise.all([
    db.wish.findMany({
      where: { ownerId: session.user.id },
      orderBy: { [sortBy]: sortOrder },
      skip,
      take: pageSize,
    }),
    db.wish.count({ where: { ownerId: session.user.id } }),
  ]);

  return NextResponse.json({
    data: wishes,
    pagination: {
      total,
      page,
      pageSize,
      totalPages: Math.ceil(total / pageSize),
    },
  });
}
```

## File Uploads

### Image Upload Endpoint

```typescript
// app/api/wishes/[id]/image/route.ts
import { writeFile } from 'fs/promises';
import { join } from 'path';
import sharp from 'sharp';

export async function POST(
  req: Request,
  { params }: { params: { id: string } }
) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  // Check permission
  await permissionService.require(session.user.id, 'edit', {
    type: 'wish',
    id: params.id,
  });

  // Apply upload rate limit
  const key = `upload:${session.user.id}`;
  try {
    await uploadLimiter.consume(key);
  } catch (error) {
    return NextResponse.json(
      { error: 'Upload limit exceeded' },
      { status: 429 }
    );
  }

  // Parse multipart form data
  const formData = await req.formData();
  const file = formData.get('image') as File;

  if (!file) {
    return NextResponse.json(
      { error: 'No file uploaded' },
      { status: 400 }
    );
  }

  // Validate file type
  if (!file.type.startsWith('image/')) {
    return NextResponse.json(
      { error: 'File must be an image' },
      { status: 400 }
    );
  }

  // Validate file size (max 5MB)
  if (file.size > 5 * 1024 * 1024) {
    return NextResponse.json(
      { error: 'File too large (max 5MB)' },
      { status: 400 }
    );
  }

  // Process image
  const buffer = Buffer.from(await file.arrayBuffer());
  const processed = await sharp(buffer)
    .resize(800, 800, { fit: 'inside' })
    .webp({ quality: 85 })
    .toBuffer();

  // Save to disk
  const filename = `${params.id}-${Date.now()}.webp`;
  const filepath = join(process.cwd(), 'uploads', filename);
  await writeFile(filepath, processed);

  // Update wish record
  await db.wish.update({
    where: { id: params.id },
    data: { localImagePath: `/uploads/${filename}` },
  });

  return NextResponse.json({
    url: `/uploads/${filename}`,
  });
}
```

## CORS (Optional)

For external API access:

```typescript
// middleware.ts
import { NextResponse } from 'next/server';

export function middleware(req: Request) {
  const res = NextResponse.next();

  // Only allow CORS for specific origins
  const allowedOrigins = ['https://app.gthanks.com'];
  const origin = req.headers.get('origin');

  if (origin && allowedOrigins.includes(origin)) {
    res.headers.set('Access-Control-Allow-Origin', origin);
    res.headers.set('Access-Control-Allow-Methods', 'GET, POST, PATCH, DELETE');
    res.headers.set('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  }

  return res;
}
```

## API Documentation

Use JSDoc comments for API routes:

```typescript
/**
 * GET /api/wishes
 *
 * List all wishes for the authenticated user
 *
 * Query Parameters:
 * - page: number (default: 1)
 * - pageSize: number (default: 20, max: 100)
 * - sortBy: 'createdAt' | 'wishLevel' | 'price' (default: 'createdAt')
 * - sortOrder: 'asc' | 'desc' (default: 'desc')
 * - wishLevel: number (1-3, optional filter)
 *
 * Returns:
 * - 200: { data: Wish[], pagination: {...} }
 * - 401: Unauthorized
 */
export async function GET(req: Request) {
  // ...
}
```

## Testing API Routes

```typescript
// tests/integration/api/wishes.test.ts
import { testRequest } from '@/tests/helpers';
import { createTestUser, createTestWish } from '@/tests/fixtures';

describe('DELETE /api/wishes/[id]', () => {
  it('deletes wish successfully', async () => {
    const user = await createTestUser();
    const wish = await createTestWish({ ownerId: user.id });

    const response = await testRequest
      .delete(`/api/wishes/${wish.id}`)
      .auth(user.id);

    expect(response.status).toBe(204);

    const dbWish = await db.wish.findUnique({ where: { id: wish.id } });
    expect(dbWish).toBeNull();
  });

  it('returns 404 for non-existent wish', async () => {
    const user = await createTestUser();

    const response = await testRequest
      .delete('/api/wishes/nonexistent')
      .auth(user.id);

    expect(response.status).toBe(404);
  });

  it('returns 403 when user is not owner', async () => {
    const owner = await createTestUser();
    const otherUser = await createTestUser({ email: 'other@example.com' });
    const wish = await createTestWish({ ownerId: owner.id });

    const response = await testRequest
      .delete(`/api/wishes/${wish.id}`)
      .auth(otherUser.id);

    expect(response.status).toBe(403);
  });
});
```
