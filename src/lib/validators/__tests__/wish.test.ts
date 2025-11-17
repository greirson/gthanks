import { describe, it, expect } from '@jest/globals';
import { WishCreateSchema, WishUpdateSchema } from '../wish';

describe('WishCreateSchema URL Validation (XSS Prevention)', () => {
  describe('Malicious URLs - Must Reject', () => {
    it('should reject javascript: protocol', () => {
      expect(() =>
        WishCreateSchema.parse({
          title: 'Test Wish',
          url: 'javascript:alert(1)',
        })
      ).toThrow(/Only http and https URLs are allowed|Please enter a valid URL/);
    });

    it('should reject data: protocol', () => {
      expect(() =>
        WishCreateSchema.parse({
          title: 'Test Wish',
          url: 'data:text/html,<script>alert(1)</script>',
        })
      ).toThrow(/Only http and https URLs are allowed|Please enter a valid URL/);
    });

    it('should reject file: protocol', () => {
      expect(() =>
        WishCreateSchema.parse({
          title: 'Test Wish',
          url: 'file:///etc/passwd',
        })
      ).toThrow(/Only http and https URLs are allowed|Please enter a valid URL/);
    });

    it('should reject vbscript: protocol', () => {
      expect(() =>
        WishCreateSchema.parse({
          title: 'Test Wish',
          url: 'vbscript:msgbox(1)',
        })
      ).toThrow(/Only http and https URLs are allowed|Please enter a valid URL/);
    });

    it('should reject ftp: protocol', () => {
      expect(() =>
        WishCreateSchema.parse({
          title: 'Test Wish',
          url: 'ftp://example.com/file.txt',
        })
      ).toThrow(/Only http and https URLs are allowed/);
    });
  });

  describe('Valid URLs - Must Accept', () => {
    it('should accept https:// URLs', () => {
      const result = WishCreateSchema.parse({
        title: 'Test Wish',
        url: 'https://amazon.com/product/123',
      });
      expect(result.url).toBeDefined();
      expect(result.url).toContain('amazon.com');
    });

    it('should accept http:// URLs', () => {
      const result = WishCreateSchema.parse({
        title: 'Test Wish',
        url: 'http://example.com',
      });
      expect(result.url).toBeDefined();
      expect(result.url).toContain('example.com');
    });

    it('should accept https:// with www', () => {
      const result = WishCreateSchema.parse({
        title: 'Test Wish',
        url: 'https://www.google.com',
      });
      expect(result.url).toBeDefined();
      expect(result.url).toContain('google.com');
    });
  });

  describe('Edge Cases - Optional URL Field', () => {
    it('should accept null URL', () => {
      const result = WishCreateSchema.parse({
        title: 'Test Wish',
        url: null,
      });
      expect(result.url).toBeNull();
    });

    it('should accept empty string URL', () => {
      const result = WishCreateSchema.parse({
        title: 'Test Wish',
        url: '',
      });
      expect(result.url).toBeNull();
    });

    it('should accept undefined URL', () => {
      const result = WishCreateSchema.parse({
        title: 'Test Wish',
        url: undefined,
      });
      expect(result.url).toBeNull();
    });

    it('should accept wish without URL field', () => {
      const result = WishCreateSchema.parse({
        title: 'Test Wish',
      });
      expect(result.url).toBeNull();
    });
  });

  describe('URL Simplification - Post-Validation', () => {
    it('should simplify valid URLs after security validation', () => {
      // URL simplification happens AFTER protocol check
      const result = WishCreateSchema.parse({
        title: 'Test Wish',
        url: 'https://amazon.com/dp/B08N5WRWNW?tracking=12345',
      });
      // Simplified URL should still be https
      expect(result.url).toBeDefined();
      expect(result.url).toMatch(/^https?:\/\//);
    });
  });
});

describe('WishUpdateSchema URL Validation (XSS Prevention)', () => {
  it('should reject malicious URLs in updates', () => {
    expect(() =>
      WishUpdateSchema.parse({
        url: 'javascript:alert(1)',
      })
    ).toThrow(/Only http and https URLs are allowed|Please enter a valid URL/);
  });

  it('should accept valid URLs in updates', () => {
    const result = WishUpdateSchema.parse({
      url: 'https://example.com/product',
    });
    expect(result.url).toBeDefined();
    expect(result.url).toContain('example.com');
  });

  it('should accept null in updates (clear URL)', () => {
    const result = WishUpdateSchema.parse({
      url: null,
    });
    expect(result.url).toBeNull();
  });
});
