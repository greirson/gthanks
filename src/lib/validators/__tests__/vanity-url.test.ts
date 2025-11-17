import { describe, expect, it } from '@jest/globals';
import { usernameSchema, slugSchema } from '../vanity-url';
import { ZodError } from 'zod';

describe('usernameSchema', () => {
  describe('valid usernames', () => {
    it('should accept valid lowercase usernames', () => {
      expect(usernameSchema.parse('johndoe')).toBe('johndoe');
      expect(usernameSchema.parse('user123')).toBe('user123');
      expect(usernameSchema.parse('my-username')).toBe('my-username');
    });

    it('should transform uppercase to lowercase', () => {
      expect(usernameSchema.parse('JohnDoe')).toBe('johndoe');
      expect(usernameSchema.parse('USER123')).toBe('user123');
      expect(usernameSchema.parse('My-Username')).toBe('my-username');
    });

    it('should accept usernames with hyphens in the middle', () => {
      expect(usernameSchema.parse('john-doe')).toBe('john-doe');
      expect(usernameSchema.parse('user-name-123')).toBe('user-name-123');
    });

    it('should accept usernames at minimum length (3 chars)', () => {
      expect(usernameSchema.parse('abc')).toBe('abc');
      expect(usernameSchema.parse('a1b')).toBe('a1b');
    });

    it('should accept usernames at maximum length (50 chars)', () => {
      const maxUsername = 'a'.repeat(50);
      expect(usernameSchema.parse(maxUsername)).toBe(maxUsername);
    });
  });

  describe('invalid usernames', () => {
    it('should reject usernames shorter than 3 characters', () => {
      expect(() => usernameSchema.parse('ab')).toThrow(ZodError);
      expect(() => usernameSchema.parse('a')).toThrow(ZodError);
      expect(() => usernameSchema.parse('')).toThrow(ZodError);
    });

    it('should reject usernames longer than 50 characters', () => {
      const tooLong = 'a'.repeat(51);
      expect(() => usernameSchema.parse(tooLong)).toThrow(ZodError);
    });

    it('should reject usernames with special characters', () => {
      expect(() => usernameSchema.parse('john@doe')).toThrow(ZodError);
      expect(() => usernameSchema.parse('user_name')).toThrow(ZodError);
      expect(() => usernameSchema.parse('user.name')).toThrow(ZodError);
      expect(() => usernameSchema.parse('user name')).toThrow(ZodError);
      expect(() => usernameSchema.parse('user!name')).toThrow(ZodError);
    });

    it('should reject usernames starting with hyphen', () => {
      expect(() => usernameSchema.parse('-johndoe')).toThrow(ZodError);
      expect(() => usernameSchema.parse('-user')).toThrow(ZodError);
    });

    it('should reject usernames ending with hyphen', () => {
      expect(() => usernameSchema.parse('johndoe-')).toThrow(ZodError);
      expect(() => usernameSchema.parse('user-')).toThrow(ZodError);
    });

    it('should reject usernames with consecutive hyphens', () => {
      expect(() => usernameSchema.parse('john--doe')).toThrow(ZodError);
      expect(() => usernameSchema.parse('user---name')).toThrow(ZodError);
    });

    it('should reject reserved usernames', () => {
      expect(() => usernameSchema.parse('admin')).toThrow(ZodError);
      expect(() => usernameSchema.parse('api')).toThrow(ZodError);
      expect(() => usernameSchema.parse('auth')).toThrow(ZodError);
      expect(() => usernameSchema.parse('settings')).toThrow(ZodError);
      expect(() => usernameSchema.parse('dashboard')).toThrow(ZodError);
    });

    it('should reject reserved usernames regardless of case', () => {
      expect(() => usernameSchema.parse('ADMIN')).toThrow(ZodError);
      expect(() => usernameSchema.parse('Admin')).toThrow(ZodError);
      expect(() => usernameSchema.parse('API')).toThrow(ZodError);
    });
  });
});

describe('slugSchema', () => {
  describe('valid slugs', () => {
    it('should accept valid lowercase slugs', () => {
      expect(slugSchema.parse('my-list')).toBe('my-list');
      expect(slugSchema.parse('birthday-2025')).toBe('birthday-2025');
      expect(slugSchema.parse('wishlist')).toBe('wishlist');
    });

    it('should transform uppercase to lowercase', () => {
      expect(slugSchema.parse('My-List')).toBe('my-list');
      expect(slugSchema.parse('BIRTHDAY')).toBe('birthday');
    });

    it('should accept slugs with hyphens in the middle', () => {
      expect(slugSchema.parse('christmas-list')).toBe('christmas-list');
      expect(slugSchema.parse('my-birthday-2025')).toBe('my-birthday-2025');
    });

    it('should accept slugs at minimum length (1 char)', () => {
      expect(slugSchema.parse('a')).toBe('a');
      expect(slugSchema.parse('1')).toBe('1');
    });

    it('should accept slugs at maximum length (100 chars)', () => {
      const maxSlug = 'a'.repeat(100);
      expect(slugSchema.parse(maxSlug)).toBe(maxSlug);
    });
  });

  describe('invalid slugs', () => {
    it('should reject empty slugs', () => {
      expect(() => slugSchema.parse('')).toThrow(ZodError);
    });

    it('should reject slugs longer than 100 characters', () => {
      const tooLong = 'a'.repeat(101);
      expect(() => slugSchema.parse(tooLong)).toThrow(ZodError);
    });

    it('should reject slugs with special characters', () => {
      expect(() => slugSchema.parse('my list')).toThrow(ZodError);
      expect(() => slugSchema.parse('my_list')).toThrow(ZodError);
      expect(() => slugSchema.parse('my.list')).toThrow(ZodError);
      expect(() => slugSchema.parse('my@list')).toThrow(ZodError);
    });

    it('should reject slugs starting with hyphen', () => {
      expect(() => slugSchema.parse('-mylist')).toThrow(ZodError);
    });

    it('should reject slugs ending with hyphen', () => {
      expect(() => slugSchema.parse('mylist-')).toThrow(ZodError);
    });

    it('should reject slugs with consecutive hyphens', () => {
      expect(() => slugSchema.parse('my--list')).toThrow(ZodError);
      expect(() => slugSchema.parse('list---2025')).toThrow(ZodError);
    });

    it('should reject reserved slugs', () => {
      expect(() => slugSchema.parse('admin')).toThrow(ZodError);
      expect(() => slugSchema.parse('settings')).toThrow(ZodError);
      expect(() => slugSchema.parse('edit')).toThrow(ZodError);
    });
  });
});
