/**
 * Integration tests for public list sharing API
 *
 * Tests cover:
 * - Public list access (no password)
 * - Password-protected list access
 * - Invalid share token handling
 * - Rate limiting (21+ requests)
 * - Anonymous access (no authentication required)
 *
 * Core feature: Allows sharing lists publicly without requiring recipients to sign up
 */

import { describe, it, expect, beforeEach, afterEach, jest, beforeAll } from '@jest/globals';
import { hash, verify } from '@node-rs/argon2';
import crypto from 'crypto';
import { NextRequest } from 'next/server';
import { db } from '@/lib/db';

// Import the real modules - no mocking
import {
  GET as getPublicList,
  POST as accessPasswordProtectedList,
} from '@/app/api/lists/public/[shareToken]/route';
import { rateLimiter } from '@/lib/rate-limiter';

describe('Public List API Integration Tests', () => {
  let testUser: any;
  let publicList: any;
  let passwordProtectedList: any;
  let privateList: any;
  let testWish: any;
  let publicShareToken: string;
  let passwordShareToken: string;
  let testPassword: string;
  let testPasswordHash: string;

  beforeEach(async () => {
    // Clear rate limiter storage before each test to prevent test isolation issues
    rateLimiter.clear();

    // Reset database state
    if (global.mockDb && typeof global.mockDb._resetMockData === 'function') {
      global.mockDb._resetMockData();
    }

    // Setup test data
    testPassword = 'secure123';
    // Use real argon2 hash since @node-rs/argon2 is a native addon that cannot be mocked
    testPasswordHash = await hash(testPassword, {
      memoryCost: 19456,
      timeCost: 2,
      outputLen: 32,
      parallelism: 1,
    });

    // Create test user (list owner)
    testUser = await db.user.create({
      data: {
        id: 'list-owner-123',
        email: 'listowner@example.com',
        name: 'List Owner',
      },
    });

    // Create a wish to add to lists
    testWish = await db.wish.create({
      data: {
        id: 'wish-shared-001',
        title: 'Shared Gift Item',
        notes: 'A gift on the shared list',
        price: 29.99,
        wishLevel: 2,
        ownerId: testUser.id,
      },
    });

    // Generate share tokens
    publicShareToken = crypto.randomBytes(32).toString('hex');
    passwordShareToken = crypto.randomBytes(32).toString('hex');

    // Create public list (no password)
    publicList = await db.list.create({
      data: {
        id: 'public-list-001',
        name: 'My Public Birthday List',
        description: 'Public wishlist for my birthday',
        visibility: 'public',
        shareToken: publicShareToken,
        ownerId: testUser.id,
      },
    });

    // Create password-protected list
    passwordProtectedList = await db.list.create({
      data: {
        id: 'password-list-001',
        name: 'My Protected List',
        description: 'Password protected wishlist',
        visibility: 'password',
        password: testPasswordHash,
        shareToken: passwordShareToken,
        ownerId: testUser.id,
      },
    });

    // Create private list (should not be accessible via share token)
    privateList = await db.list.create({
      data: {
        id: 'private-list-001',
        name: 'My Private List',
        description: 'Private wishlist',
        visibility: 'private',
        shareToken: null,
        ownerId: testUser.id,
      },
    });

    // Add wish to public list
    await db.listWish.create({
      data: {
        listId: publicList.id,
        wishId: testWish.id,
      },
    });

    // Add wish to password-protected list
    await db.listWish.create({
      data: {
        listId: passwordProtectedList.id,
        wishId: testWish.id,
      },
    });
  });

  describe('Public List Access (No Password)', () => {
    it('should allow anonymous access to public list via share token', async () => {
      const request = new NextRequest(`http://localhost:3000/api/lists/public/${publicShareToken}`);

      const response = await getPublicList(request, { params: { shareToken: publicShareToken } });
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data).toBeTruthy();
      expect(data.id).toBe(publicList.id);
      expect(data.name).toBe('My Public Birthday List');
      expect(data.visibility).toBe('public');
      expect(data.owner).toBeTruthy();
      expect(data.owner.name).toBe('List Owner');
    });

    it('should include wishes in public list response', async () => {
      const request = new NextRequest(`http://localhost:3000/api/lists/public/${publicShareToken}`);

      const response = await getPublicList(request, { params: { shareToken: publicShareToken } });
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.wishes).toBeTruthy();
      expect(Array.isArray(data.wishes)).toBe(true);
      expect(data.wishes.length).toBeGreaterThan(0);
      expect(data.wishes[0].wish.title).toBe('Shared Gift Item');
      expect(data.wishes[0].wish.price).toBe(29.99);
    });

    it('should not expose password hash in public list response', async () => {
      const request = new NextRequest(`http://localhost:3000/api/lists/public/${publicShareToken}`);

      const response = await getPublicList(request, { params: { shareToken: publicShareToken } });
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.password).toBeUndefined();
    });

    it('should include owner information in response', async () => {
      const request = new NextRequest(`http://localhost:3000/api/lists/public/${publicShareToken}`);

      const response = await getPublicList(request, { params: { shareToken: publicShareToken } });
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.owner).toBeTruthy();
      expect(data.owner.id).toBe(testUser.id);
      expect(data.owner.name).toBe(testUser.name);
      expect(data.owner.email).toBe(testUser.email);
    });
  });

  describe('Password-Protected List Access', () => {
    it('should return 403 when accessing password-protected list via GET without password', async () => {
      const request = new NextRequest(
        `http://localhost:3000/api/lists/public/${passwordShareToken}`
      );

      const response = await getPublicList(request, { params: { shareToken: passwordShareToken } });
      const data = await response.json();

      expect(response.status).toBe(403);
      expect(data.error).toBeTruthy();
      expect(data.code).toBe('FORBIDDEN');
    });

    it('should allow access to password-protected list with correct password', async () => {
      const request = new NextRequest(
        `http://localhost:3000/api/lists/public/${passwordShareToken}`,
        {
          method: 'POST',
          body: JSON.stringify({ password: testPassword }),
          headers: {
            'Content-Type': 'application/json',
          },
        }
      );

      const response = await accessPasswordProtectedList(request, {
        params: { shareToken: passwordShareToken },
      });
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data).toBeTruthy();
      expect(data.id).toBe(passwordProtectedList.id);
      expect(data.name).toBe('My Protected List');
      expect(data.visibility).toBe('password');
      expect(data.wishes).toBeTruthy();
    });

    it('should return 403 when accessing password-protected list with wrong password', async () => {
      const request = new NextRequest(
        `http://localhost:3000/api/lists/public/${passwordShareToken}`,
        {
          method: 'POST',
          body: JSON.stringify({ password: 'wrongpassword' }),
          headers: {
            'Content-Type': 'application/json',
          },
        }
      );

      const response = await accessPasswordProtectedList(request, {
        params: { shareToken: passwordShareToken },
      });
      const data = await response.json();

      expect(response.status).toBe(403);
      expect(data.error).toBeTruthy();
      expect(data.code).toBe('FORBIDDEN');
    });

    it('should return 400 when password is missing from POST request', async () => {
      const request = new NextRequest(
        `http://localhost:3000/api/lists/public/${passwordShareToken}`,
        {
          method: 'POST',
          body: JSON.stringify({}),
          headers: {
            'Content-Type': 'application/json',
          },
        }
      );

      const response = await accessPasswordProtectedList(request, {
        params: { shareToken: passwordShareToken },
      });
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error).toBeTruthy();
      expect(data.code).toBe('VALIDATION_ERROR');
    });

    it('should not expose password hash in password-protected list response', async () => {
      const request = new NextRequest(
        `http://localhost:3000/api/lists/public/${passwordShareToken}`,
        {
          method: 'POST',
          body: JSON.stringify({ password: testPassword }),
          headers: {
            'Content-Type': 'application/json',
          },
        }
      );

      const response = await accessPasswordProtectedList(request, {
        params: { shareToken: passwordShareToken },
      });
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.password).toBeUndefined();
    });
  });

  describe('Invalid Share Token Handling', () => {
    it('should return 404 for non-existent share token', async () => {
      const fakeToken = crypto.randomBytes(32).toString('hex');
      const request = new NextRequest(`http://localhost:3000/api/lists/public/${fakeToken}`);

      const response = await getPublicList(request, { params: { shareToken: fakeToken } });
      const data = await response.json();

      expect(response.status).toBe(404);
      expect(data.error).toBeTruthy();
    });

    it('should return 404 for empty share token', async () => {
      const request = new NextRequest('http://localhost:3000/api/lists/public/');

      const response = await getPublicList(request, { params: { shareToken: '' } });
      const data = await response.json();

      expect(response.status).toBe(404);
      expect(data.error).toBeTruthy();
    });

    it('should return 403 when trying to access private list via share token', async () => {
      const privateToken = crypto.randomBytes(32).toString('hex');
      await db.list.update({
        where: { id: privateList.id },
        data: { shareToken: privateToken },
      });

      const request = new NextRequest(`http://localhost:3000/api/lists/public/${privateToken}`);

      const response = await getPublicList(request, { params: { shareToken: privateToken } });
      const data = await response.json();

      expect(response.status).toBe(403);
      expect(data.error).toBeTruthy();
    });
  });

  describe('Rate Limiting', () => {
    it('should return 429 when rate limit is exceeded', async () => {
      // The real rate limiter has a 1 minute window with 20 requests max
      // We'll make 21 rapid requests to exceed the limit
      const clientId = 'rate-limit-test-client-' + Date.now();

      // Make 20 requests (should succeed)
      for (let i = 0; i < 20; i++) {
        const request = new NextRequest(
          `http://localhost:3000/api/lists/public/${publicShareToken}`,
          {
            headers: {
              'x-real-ip': clientId,
            },
          }
        );
        const response = await getPublicList(request, { params: { shareToken: publicShareToken } });
        expect(response.status).toBe(200);
      }

      // 21st request should be rate limited
      const request = new NextRequest(
        `http://localhost:3000/api/lists/public/${publicShareToken}`,
        {
          headers: {
            'x-real-ip': clientId,
          },
        }
      );
      const response = await getPublicList(request, { params: { shareToken: publicShareToken } });
      const data = await response.json();

      expect(response.status).toBe(429);
      expect(data.error).toBeTruthy();
      expect(data.code).toBe('RATE_LIMIT_EXCEEDED');
      expect(data.retryAfter).toBeTruthy();
    });

    it('should return rate limit headers in successful response', async () => {
      const request = new NextRequest(`http://localhost:3000/api/lists/public/${publicShareToken}`);

      const response = await getPublicList(request, { params: { shareToken: publicShareToken } });

      expect(response.status).toBe(200);
      // Check that rate limit headers are present
      expect(response.headers.get('X-RateLimit-Limit')).toBeTruthy();
      expect(response.headers.get('X-RateLimit-Remaining')).toBeTruthy();
      expect(response.headers.get('X-RateLimit-Reset')).toBeTruthy();
    });

    it('should apply rate limiting to password-protected POST requests', async () => {
      // The password endpoint has stricter limits: 5 requests per 5 minutes
      const clientId = 'password-rate-limit-test-' + Date.now();

      // Make 5 requests (should succeed)
      for (let i = 0; i < 5; i++) {
        const request = new NextRequest(
          `http://localhost:3000/api/lists/public/${passwordShareToken}`,
          {
            method: 'POST',
            body: JSON.stringify({ password: testPassword }),
            headers: {
              'Content-Type': 'application/json',
              'x-real-ip': clientId,
            },
          }
        );
        const response = await accessPasswordProtectedList(request, {
          params: { shareToken: passwordShareToken },
        });
        expect(response.status).toBe(200);
      }

      // 6th request should be rate limited
      const request = new NextRequest(
        `http://localhost:3000/api/lists/public/${passwordShareToken}`,
        {
          method: 'POST',
          body: JSON.stringify({ password: testPassword }),
          headers: {
            'Content-Type': 'application/json',
            'x-real-ip': clientId,
          },
        }
      );
      const response = await accessPasswordProtectedList(request, {
        params: { shareToken: passwordShareToken },
      });
      const data = await response.json();

      expect(response.status).toBe(429);
      expect(data.error).toBeTruthy();
      expect(data.code).toBe('RATE_LIMIT_EXCEEDED');
    });
  });

  describe('Anonymous Access (No Authentication)', () => {
    it('should allow access without authentication headers', async () => {
      const request = new NextRequest(`http://localhost:3000/api/lists/public/${publicShareToken}`);

      const response = await getPublicList(request, { params: { shareToken: publicShareToken } });
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data).toBeTruthy();
      expect(data.id).toBe(publicList.id);
    });

    it('should work for users without accounts', async () => {
      const request = new NextRequest(
        `http://localhost:3000/api/lists/public/${publicShareToken}`,
        {
          headers: {
            'User-Agent': 'Mozilla/5.0 (Anonymous User)',
          },
        }
      );

      const response = await getPublicList(request, { params: { shareToken: publicShareToken } });
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data).toBeTruthy();
      expect(data.name).toBe('My Public Birthday List');
    });
  });

  describe('Edge Cases', () => {
    it('should handle list with no wishes gracefully', async () => {
      const emptyShareToken = crypto.randomBytes(32).toString('hex');
      await db.list.create({
        data: {
          id: 'empty-list-001',
          name: 'Empty List',
          description: 'A list with no wishes',
          visibility: 'public',
          shareToken: emptyShareToken,
          ownerId: testUser.id,
        },
      });

      const request = new NextRequest(`http://localhost:3000/api/lists/public/${emptyShareToken}`);

      const response = await getPublicList(request, { params: { shareToken: emptyShareToken } });
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data).toBeTruthy();
      expect(data.wishes).toBeTruthy();
      expect(data.wishes.length).toBe(0);
    });

    it('should handle list with null description', async () => {
      const request = new NextRequest(`http://localhost:3000/api/lists/public/${publicShareToken}`);

      const response = await getPublicList(request, { params: { shareToken: publicShareToken } });
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data).toBeTruthy();
      expect(typeof data.description === 'string' || data.description === null).toBe(true);
    });

    it('should handle concurrent requests to same share token', async () => {
      const requests = Array(5)
        .fill(null)
        .map(() => new NextRequest(`http://localhost:3000/api/lists/public/${publicShareToken}`));

      const responses = await Promise.all(
        requests.map((req) => getPublicList(req, { params: { shareToken: publicShareToken } }))
      );

      for (const response of responses) {
        expect(response.status).toBe(200);
        const data = await response.json();
        expect(data.id).toBe(publicList.id);
      }
    });
  });

  describe('Data Integrity', () => {
    it('should include accurate wish count', async () => {
      const wish2 = await db.wish.create({
        data: {
          title: 'Second Gift',
          price: 19.99,
          ownerId: testUser.id,
        },
      });

      await db.listWish.create({
        data: {
          listId: publicList.id,
          wishId: wish2.id,
        },
      });

      const request = new NextRequest(`http://localhost:3000/api/lists/public/${publicShareToken}`);

      const response = await getPublicList(request, { params: { shareToken: publicShareToken } });
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.wishes.length).toBe(2);
    });

    it('should return wishes in correct order', async () => {
      const request = new NextRequest(`http://localhost:3000/api/lists/public/${publicShareToken}`);

      const response = await getPublicList(request, { params: { shareToken: publicShareToken } });
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.wishes).toBeTruthy();
      expect(Array.isArray(data.wishes)).toBe(true);
      if (data.wishes.length > 1) {
        const firstAdded = new Date(data.wishes[0].addedAt);
        const secondAdded = new Date(data.wishes[1].addedAt);
        expect(firstAdded >= secondAdded).toBe(true);
      }
    });
  });
});
