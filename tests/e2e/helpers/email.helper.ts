/**
 * Email generation helpers for E2E tests
 * Ensures unique email addresses to prevent database collisions on test retries
 */

/**
 * Generate a unique email address for testing
 * Uses timestamp + random string to prevent collisions when tests are retried
 *
 * @param role - Role identifier (e.g., 'owner', 'member', 'reserver')
 * @returns Unique email address in format: role-timestamp-random@test.com
 *
 * @example
 * const email = generateUniqueEmail('owner');
 * // Returns: owner-1700000000000-abc123@test.com
 */
export function generateUniqueEmail(role: string = 'user'): string {
  const timestamp = Date.now();
  const random = Math.random().toString(36).substring(7);
  return `${role}-${timestamp}-${random}@test.com`;
}

/**
 * Generate multiple unique emails with different roles
 *
 * @param roles - Array of role identifiers
 * @returns Object mapping roles to unique email addresses
 *
 * @example
 * const emails = generateUniqueEmails(['owner', 'member', 'admin']);
 * // Returns: { owner: 'owner-...@test.com', member: 'member-...@test.com', ... }
 */
export function generateUniqueEmails(roles: string[]): Record<string, string> {
  const emails: Record<string, string> = {};
  for (const role of roles) {
    emails[role] = generateUniqueEmail(role);
  }
  return emails;
}
