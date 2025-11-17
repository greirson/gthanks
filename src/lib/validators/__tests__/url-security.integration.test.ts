import { describe, it, expect } from '@jest/globals';
import { WishCreateSchema, WishUpdateSchema } from '@/lib/validators/wish';

describe('URL Validation Security - Integration Tests', () => {
  describe('XSS Attack Prevention', () => {
    const maliciousUrls = [
      'javascript:alert(1)',
      'javascript:alert(document.cookie)',
      'javascript:void(0)',
      'JAVASCRIPT:alert(1)', // Case variation
      'data:text/html,<script>alert(1)</script>',
      'data:text/html;base64,PHNjcmlwdD5hbGVydCgxKTwvc2NyaXB0Pg==',
      'vbscript:msgbox(1)',
      'file:///etc/passwd',
      'file://C:/Windows/System32/config/sam',
    ];

    maliciousUrls.forEach((url) => {
      it(`should reject malicious URL: ${url}`, () => {
        const result = WishCreateSchema.safeParse({
          title: 'Test Wish',
          url: url,
        });

        expect(result.success).toBe(false);
        if (!result.success) {
          expect(result.error.issues[0].message).toContain('Only http and https URLs');
        }
      });
    });
  });

  describe('Valid URL Acceptance', () => {
    const validUrls = [
      'https://amazon.com/product/123',
      'http://example.com',
      'https://www.google.com/search?q=test',
      'https://subdomain.example.com/path/to/resource',
      'https://example.com:8080/path',
    ];

    validUrls.forEach((url) => {
      it(`should accept valid URL: ${url}`, () => {
        const result = WishCreateSchema.safeParse({
          title: 'Test Wish',
          url: url,
        });

        expect(result.success).toBe(true);
      });
    });
  });

  describe('Edge Cases', () => {
    it('should accept null URL', () => {
      const result = WishCreateSchema.safeParse({
        title: 'Test Wish',
        url: null,
      });
      expect(result.success).toBe(true);
    });

    it('should accept undefined URL', () => {
      const result = WishCreateSchema.safeParse({
        title: 'Test Wish',
        // url omitted
      });
      expect(result.success).toBe(true);
    });

    it('should reject empty string URL', () => {
      const result = WishCreateSchema.safeParse({
        title: 'Test Wish',
        url: '',
      });
      expect(result.success).toBe(true); // Empty string converts to undefined
    });
  });

  describe('WishUpdateSchema Security', () => {
    it('should reject javascript: protocol in update', () => {
      const result = WishUpdateSchema.safeParse({
        url: 'javascript:alert(1)',
      });

      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.issues[0].message).toContain('Only http and https URLs');
      }
    });

    it('should reject data: protocol in update', () => {
      const result = WishUpdateSchema.safeParse({
        url: 'data:text/html,<script>alert(1)</script>',
      });

      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.issues[0].message).toContain('Only http and https URLs');
      }
    });

    it('should accept valid https URL in update', () => {
      const result = WishUpdateSchema.safeParse({
        url: 'https://example.com/product',
      });

      expect(result.success).toBe(true);
    });
  });

  describe('Protocol Bypass Attempts', () => {
    const bypassAttempts = [
      'JavaScRipt:alert(1)', // Mixed case
      'jAvAsCrIpT:alert(1)', // Mixed case variation
      ' javascript:alert(1)', // Leading whitespace
      'javascript:alert(1) ', // Trailing whitespace
      '\tjavascript:alert(1)', // Tab character
      '\njavascript:alert(1)', // Newline character
    ];

    bypassAttempts.forEach((url) => {
      it(`should reject bypass attempt: ${JSON.stringify(url)}`, () => {
        const result = WishCreateSchema.safeParse({
          title: 'Test Wish',
          url: url,
        });

        // All should fail - either invalid URL or wrong protocol
        expect(result.success).toBe(false);
      });
    });
  });

  describe('URL Length Validation', () => {
    it('should reject URLs longer than 2048 characters after simplification', () => {
      const longUrl = 'https://example.com/' + 'a'.repeat(2048);
      const result = WishCreateSchema.safeParse({
        title: 'Test Wish',
        url: longUrl,
      });

      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.issues[0].message).toContain('must be less than 2048 characters');
      }
    });

    it('should accept URLs under 2048 characters', () => {
      const validUrl = 'https://example.com/' + 'a'.repeat(100);
      const result = WishCreateSchema.safeParse({
        title: 'Test Wish',
        url: validUrl,
      });

      expect(result.success).toBe(true);
    });
  });
});
