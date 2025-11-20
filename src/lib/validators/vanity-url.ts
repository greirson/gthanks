import { z } from 'zod';
import { RESERVED_USERNAMES, RESERVED_SLUGS } from '@/lib/constants/reserved-words';

/**
 * Validation schema for usernames in vanity URLs
 * Format: /{username}
 *
 * Rules:
 * - 3-50 characters
 * - Lowercase letters, numbers, and hyphens only
 * - Cannot start or end with hyphen
 * - No consecutive hyphens
 * - Not in reserved list
 */
export const usernameSchema = z
  .string()
  .min(3, 'Username must be at least 3 characters')
  .max(50, 'Username must be 50 characters or less')
  .transform((val) => val.toLowerCase())
  .pipe(
    z
      .string()
      .regex(/^[a-z0-9-]+$/, 'Username can only contain lowercase letters, numbers, and hyphens')
      .refine(
        (val) => !val.startsWith('-') && !val.endsWith('-'),
        'Username cannot start or end with a hyphen'
      )
      .refine((val) => !val.includes('--'), 'Username cannot contain consecutive hyphens')
      .refine((val) => !RESERVED_USERNAMES.has(val), 'This username is reserved')
  );

/**
 * Validation schema for list/group slugs in vanity URLs
 * Format: /{username}/{slug}
 *
 * Rules:
 * - 1-100 characters
 * - Lowercase letters, numbers, and hyphens only
 * - Cannot start or end with hyphen
 * - No consecutive hyphens
 * - Not in reserved list
 */
export const slugSchema = z
  .string()
  .min(1, 'Slug must be at least 1 character')
  .max(100, 'Slug must be 100 characters or less')
  .transform((val) => val.toLowerCase())
  .pipe(
    z
      .string()
      .regex(/^[a-z0-9-]+$/, 'Slug can only contain lowercase letters, numbers, and hyphens')
      .refine(
        (val) => !val.startsWith('-') && !val.endsWith('-'),
        'Slug cannot start or end with a hyphen'
      )
      .refine((val) => !val.includes('--'), 'Slug cannot contain consecutive hyphens')
      .refine((val) => !RESERVED_SLUGS.has(val), 'This slug is reserved')
  );

export type UsernameInput = z.infer<typeof usernameSchema>;
export type SlugInput = z.infer<typeof slugSchema>;
