/**
 * Test data fixtures for E2E tests
 *
 * These fixtures provide consistent test data across test suites.
 */

import { generateUniqueEmail } from '../helpers/email.helper';

/**
 * Generate unique test users with unique emails to prevent collisions
 * @returns Object with user1, user2, user3 test user data
 */
export function getTestUsers() {
  return {
    user1: {
      email: generateUniqueEmail('test-user1'),
      name: 'Test User 1',
    },
    user2: {
      email: generateUniqueEmail('test-user2'),
      name: 'Test User 2',
    },
    user3: {
      email: generateUniqueEmail('test-user3'),
      name: 'Test User 3',
    },
  };
}

/**
 * Legacy export for backward compatibility
 * @deprecated Use getTestUsers() instead to ensure unique emails
 */
export const testUsers = getTestUsers();

export const testWishes = {
  wish1: {
    title: 'Test Product 1',
    description: 'A test product for E2E testing',
    url: 'https://example.com/product-1',
    price: 29.99,
    priority: 3, // High priority (3 stars)
  },
  wish2: {
    title: 'Test Product 2',
    description: 'Another test product',
    url: 'https://example.com/product-2',
    price: 49.99,
    priority: 2, // Medium priority (2 stars)
  },
  wish3: {
    title: 'Test Product 3',
    description: 'Yet another test product',
    url: 'https://example.com/product-3',
    price: 19.99,
    priority: 1, // Low priority (1 star)
  },
} as const;

export const testLists = {
  list1: {
    name: 'Test Birthday List',
    description: 'Birthday wishes for E2E testing',
    eventDate: '2025-12-25',
  },
  list2: {
    name: 'Test Holiday List',
    description: 'Holiday wishes for E2E testing',
    eventDate: '2025-01-01',
  },
} as const;

export const testGroups = {
  group1: {
    name: 'Test Family Group',
    description: 'Family group for E2E testing',
  },
  group2: {
    name: 'Test Friends Group',
    description: 'Friends group for E2E testing',
  },
} as const;
