/**
 * Test helper utilities for integration tests
 * Provides common setup, teardown, and utility functions
 */

import { jest } from '@jest/globals';
import { NextRequest } from 'next/server';

/**
 * Creates a mock NextRequest object for testing API routes
 */
export function createMockRequest(
  url: string,
  options: {
    method?: string;
    headers?: Record<string, string>;
    body?: any;
    searchParams?: Record<string, string>;
  } = {}
): NextRequest {
  const fullUrl = new URL(url, 'http://localhost:3000');
  
  // Add search params if provided
  if (options.searchParams) {
    Object.entries(options.searchParams).forEach(([key, value]) => {
      fullUrl.searchParams.append(key, value);
    });
  }

  // Create headers
  const headers = new Headers();
  if (options.headers) {
    Object.entries(options.headers).forEach(([key, value]) => {
      headers.set(key, value);
    });
  }

  // Add content-type for JSON bodies
  if (options.body && !headers.has('content-type')) {
    headers.set('content-type', 'application/json');
  }

  // Create the request
  const request = new NextRequest(fullUrl.toString(), {
    method: options.method || 'GET',
    headers,
    body: options.body ? JSON.stringify(options.body) : undefined,
  });

  return request;
}

/**
 * Sets up authentication context for tests
 */
export function mockAuthenticatedUser(user: {
  id: string;
  email: string;
  name?: string;
}) {
  // Set test headers that auth-utils will recognize
  (global as { mockHeaders?: Map<string, string> }).mockHeaders = new Map([
    ['X-Test-User-Id', user.id],
    ['X-Test-User-Email', user.email],
    ['X-Test-User-Name', user.name || '']
  ]);

  // Also update getCurrentUser mock if needed
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const authUtils = jest.requireMock('@/lib/auth-utils') as any;
  if (authUtils && authUtils.getCurrentUser) {
    authUtils.getCurrentUser.mockResolvedValue({
      id: user.id,
      email: user.email,
      name: user.name || null,
      avatarUrl: null,
      role: 'user',
      isAdmin: false,
      createdAt: new Date(),
      lastLoginAt: null,
      authMethod: 'session'
    });
  }
}

/**
 * Clears authentication context
 */
export function clearAuth() {
  (global as { mockHeaders?: Map<string, string> }).mockHeaders = new Map();

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const authUtils = jest.requireMock('@/lib/auth-utils') as any;
  if (authUtils && authUtils.getCurrentUser) {
    authUtils.getCurrentUser.mockResolvedValue(null);
  }
}

/**
 * Creates test data for a complete user scenario
 */
export async function createTestScenario(db: any) {
  const timestamp = Date.now();
  // Create users
  const owner = await db.user.create({
    data: {
      id: 'owner-' + timestamp,
      email: 'owner@test.com',
      name: 'List Owner'
    }
  });

  const giver = await db.user.create({
    data: {
      id: 'giver-' + timestamp,
      email: 'giver@test.com',
      name: 'Gift Giver'
    }
  });

  // Create group
  const group = await db.group.create({
    data: {
      id: 'group-' + timestamp,
      name: 'Test Family',
      description: 'Test family group'
    }
  });

  // Add users to group
  await db.userGroup.create({
    data: {
      userId: owner.id,
      groupId: group.id,
      role: 'admin'
    }
  });

  await db.userGroup.create({
    data: {
      userId: giver.id,
      groupId: group.id,
      role: 'member'
    }
  });

  // Create list
  const list = await db.list.create({
    data: {
      id: 'list-' + timestamp,
      name: 'Birthday Wishlist',
      description: 'My birthday wishes',
      ownerId: owner.id
    }
  });

  // Share list with group
  await db.listGroup.create({
    data: {
      listId: list.id,
      groupId: group.id,
      sharedBy: owner.id
    }
  });

  // Create wishes
  const wishes = await Promise.all([
    db.wish.create({
      data: {
        id: 'wish-1-' + timestamp,
        title: 'Book: Clean Code',
        notes: 'Programming book I want to read',
        url: 'https://example.com/clean-code',
        price: 39.99,
        wishLevel: 2,
        ownerId: owner.id
      }
    }),
    db.wish.create({
      data: {
        id: 'wish-2-' + timestamp,
        title: 'Wireless Headphones',
        notes: 'For working from home',
        url: 'https://example.com/headphones',
        price: 149.99,
        wishLevel: 3,
        ownerId: owner.id
      }
    }),
    db.wish.create({
      data: {
        id: 'wish-3-' + timestamp,
        title: 'Coffee Mug',
        notes: 'Nice ceramic mug',
        price: 15.00,
        wishLevel: 1,
        ownerId: owner.id
      }
    })
  ]);

  // Add wishes to list
  await Promise.all(
    wishes.map(wish =>
      db.listWish.create({
        data: {
          listId: list.id,
          wishId: wish.id
        }
      })
    )
  );

  return {
    owner,
    giver,
    group,
    list,
    wishes
  };
}

/**
 * Waits for async operations to complete
 */
export function waitFor(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}

/**
 * Asserts API response has expected status and structure
 */
export function assertApiResponse(
  response: Response,
  expectedStatus: number,
  expectedShape?: Record<string, any>
) {
  expect(response.status).toBe(expectedStatus);

  if (expectedShape && response.status === 200) {
    return response.json().then(data => {
      Object.keys(expectedShape).forEach(key => {
        expect(data).toHaveProperty(key);
        if (typeof expectedShape[key] === 'function') {
          expect(typeof data[key]).toBe(expectedShape[key].name.toLowerCase());
        }
      });
      return data;
    });
  }
}

/**
 * Generates a unique test identifier
 */
export function generateTestId(prefix: string = 'test'): string {
  const timestamp = Date.now();
  const random = Math.random().toString(36).substr(2, 9);
  return `${prefix}-${timestamp}-${random}`;
}

/**
 * Mock email capture for testing email sends
 */
export class EmailCapture {
  private emails: any[] = [];

  constructor() {
    this.reset();
  }

  capture(emailData: any) {
    this.emails.push({
      ...emailData,
      sentAt: new Date()
    });
  }

  getEmails() {
    return this.emails;
  }

  getLastEmail() {
    return this.emails[this.emails.length - 1];
  }

  findByRecipient(email: string) {
    return this.emails.filter(e => e.to === email);
  }

  reset() {
    this.emails = [];
  }
}

/**
 * Test context manager for integration tests
 */
export class TestContext {
  private db: any;
  private emailCapture: EmailCapture;
  private currentUser: any = null;

  constructor(database: any) {
    this.db = database;
    this.emailCapture = new EmailCapture();
  }

  async setup() {
    // Reset database
    const globalWithMock = global as { mockDb?: { _resetMockData?: () => void } };
    if (globalWithMock.mockDb && typeof globalWithMock.mockDb._resetMockData === 'function') {
      globalWithMock.mockDb._resetMockData();
    }

    // Reset email capture
    this.emailCapture.reset();

    // Clear auth
    clearAuth();
  }

  async teardown() {
    // Clear any test data
    this.currentUser = null;
    clearAuth();
  }

  setCurrentUser(user: any) {
    this.currentUser = user;
    mockAuthenticatedUser(user);
  }

  getCurrentUser() {
    return this.currentUser;
  }

  getEmailCapture() {
    return this.emailCapture;
  }

  getDb() {
    return this.db;
  }
}

/**
 * Validates reservation data structure
 */
export function validateReservation(reservation: any) {
  expect(reservation).toHaveProperty('id');
  expect(reservation).toHaveProperty('wishId');
  expect(reservation).toHaveProperty('reservedAt');
  
  // Either authenticated or anonymous
  if (reservation.reserverEmail) {
    expect(reservation.reserverEmail).toMatch(/^[^\s@]+@[^\s@]+\.[^\s@]+$/);
  }
  
  if (!reservation.reserverEmail && !reservation.accessToken) {
    throw new Error('Reservation must have either reserverEmail or accessToken');
  }
}

/**
 * Validates wish data structure
 */
export function validateWish(wish: any) {
  expect(wish).toHaveProperty('id');
  expect(wish).toHaveProperty('title');
  expect(wish).toHaveProperty('ownerId');
  expect(wish).toHaveProperty('wishLevel');
  
  if (wish.price !== null && wish.price !== undefined) {
    expect(typeof wish.price).toBe('number');
    expect(wish.price).toBeGreaterThanOrEqual(0);
  }
  
  if (wish.wishLevel) {
    expect(wish.wishLevel).toBeGreaterThanOrEqual(1);
    expect(wish.wishLevel).toBeLessThanOrEqual(3);
  }
}

/**
 * Creates a mock session for testing
 */
export async function createMockSession(db: any, user: any) {
  const sessionToken = 'session-' + generateTestId();
  
  const session = await db.session.create({
    data: {
      sessionToken,
      userId: user.id,
      expires: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000) // 30 days
    }
  });

  return {
    sessionToken,
    session,
    user
  };
}

/**
 * Simulates magic link flow
 */
export async function simulateMagicLinkFlow(db: any, email: string) {
  // Create verification token
  const token = 'magic-' + generateTestId();
  const expires = new Date(Date.now() + 15 * 60 * 1000);

  await db.verificationToken.create({
    data: {
      identifier: email,
      token,
      expires
    }
  });

  // Find or create user
  let user = await db.user.findUnique({
    where: { email }
  });

  if (!user) {
    user = await db.user.create({
      data: {
        email,
        emailVerified: new Date()
      }
    });
  }

  // Create session
  const { sessionToken, session } = await createMockSession(db, user);

  // Delete token (consumed)
  await db.verificationToken.delete({
    where: { token }
  });

  return {
    user,
    sessionToken,
    session
  };
}
