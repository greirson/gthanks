import { signupRestrictionService } from '../signup-restriction.service';

describe('SignupRestrictionService', () => {
  beforeEach(() => {
    // Reset environment variables before each test
    delete process.env.DISABLE_SIGNUPS;
    delete process.env.ALLOWED_SIGNUP_EMAILS;
    signupRestrictionService.resetConfig();
  });

  describe('No restrictions configured (backward compatible)', () => {
    it('should allow all signups when no env vars set', () => {
      expect(signupRestrictionService.isSignupAllowed('user@example.com')).toBe(true);
      expect(signupRestrictionService.isSignupAllowed('anyone@anywhere.com')).toBe(true);
      expect(signupRestrictionService.isSignupAllowed('test@test.test')).toBe(true);
    });
  });

  describe('DISABLE_SIGNUPS=true', () => {
    beforeEach(() => {
      process.env.DISABLE_SIGNUPS = 'true';
      signupRestrictionService.resetConfig();
    });

    it('should block all signups when globally disabled', () => {
      expect(signupRestrictionService.isSignupAllowed('user@example.com')).toBe(false);
      expect(signupRestrictionService.isSignupAllowed('admin@company.com')).toBe(false);
      expect(signupRestrictionService.isSignupAllowed('anyone@anywhere.com')).toBe(false);
    });

    it('should return "RegistrationDisabled" error code', () => {
      expect(signupRestrictionService.getErrorCode()).toBe('RegistrationDisabled');
    });

    it('should not throw when logging denial', () => {
      expect(() => {
        signupRestrictionService.logSignupDenial('user@example.com', 'email');
      }).not.toThrow();
    });
  });

  describe('Email whitelist (exact match)', () => {
    beforeEach(() => {
      process.env.ALLOWED_SIGNUP_EMAILS = 'alice@example.com,bob@test.org';
      signupRestrictionService.resetConfig();
    });

    it('should allow emails in whitelist', () => {
      expect(signupRestrictionService.isSignupAllowed('alice@example.com')).toBe(true);
      expect(signupRestrictionService.isSignupAllowed('bob@test.org')).toBe(true);
    });

    it('should block emails not in whitelist', () => {
      expect(signupRestrictionService.isSignupAllowed('charlie@example.com')).toBe(false);
      expect(signupRestrictionService.isSignupAllowed('user@other.com')).toBe(false);
    });

    it('should be case-insensitive', () => {
      expect(signupRestrictionService.isSignupAllowed('ALICE@EXAMPLE.COM')).toBe(true);
      expect(signupRestrictionService.isSignupAllowed('Alice@Example.Com')).toBe(true);
      expect(signupRestrictionService.isSignupAllowed('BOB@TEST.ORG')).toBe(true);
    });

    it('should trim whitespace from emails', () => {
      expect(signupRestrictionService.isSignupAllowed('  alice@example.com  ')).toBe(true);
      expect(signupRestrictionService.isSignupAllowed(' bob@test.org ')).toBe(true);
    });

    it('should return "AccessDenied" error code for whitelist block', () => {
      expect(signupRestrictionService.getErrorCode()).toBe('AccessDenied');
    });
  });

  describe('Domain whitelist (wildcard)', () => {
    beforeEach(() => {
      process.env.ALLOWED_SIGNUP_EMAILS = '*@company.com,*@partner.org';
      signupRestrictionService.resetConfig();
    });

    it('should allow any email from whitelisted domain', () => {
      expect(signupRestrictionService.isSignupAllowed('user@company.com')).toBe(true);
      expect(signupRestrictionService.isSignupAllowed('admin@company.com')).toBe(true);
      expect(signupRestrictionService.isSignupAllowed('anyone@partner.org')).toBe(true);
    });

    it('should block emails from non-whitelisted domains', () => {
      expect(signupRestrictionService.isSignupAllowed('user@external.com')).toBe(false);
      expect(signupRestrictionService.isSignupAllowed('admin@other.org')).toBe(false);
    });

    it('should NOT match subdomains', () => {
      expect(signupRestrictionService.isSignupAllowed('user@sub.company.com')).toBe(false);
      expect(signupRestrictionService.isSignupAllowed('admin@mail.partner.org')).toBe(false);
    });

    it('should be case-insensitive for domains', () => {
      expect(signupRestrictionService.isSignupAllowed('user@COMPANY.COM')).toBe(true);
      expect(signupRestrictionService.isSignupAllowed('admin@Company.Com')).toBe(true);
      expect(signupRestrictionService.isSignupAllowed('test@PARTNER.ORG')).toBe(true);
    });
  });

  describe('Mixed whitelist (emails + domains)', () => {
    beforeEach(() => {
      process.env.ALLOWED_SIGNUP_EMAILS = 'admin@external.com,contractor@freelance.com,*@company.com';
      signupRestrictionService.resetConfig();
    });

    it('should allow exact email matches', () => {
      expect(signupRestrictionService.isSignupAllowed('admin@external.com')).toBe(true);
      expect(signupRestrictionService.isSignupAllowed('contractor@freelance.com')).toBe(true);
    });

    it('should allow domain wildcard matches', () => {
      expect(signupRestrictionService.isSignupAllowed('user@company.com')).toBe(true);
      expect(signupRestrictionService.isSignupAllowed('anyone@company.com')).toBe(true);
    });

    it('should block emails not matching either pattern', () => {
      expect(signupRestrictionService.isSignupAllowed('user@external.com')).toBe(false);
      expect(signupRestrictionService.isSignupAllowed('other@freelance.com')).toBe(false);
      expect(signupRestrictionService.isSignupAllowed('admin@other.com')).toBe(false);
    });
  });

  describe('Whitespace handling', () => {
    beforeEach(() => {
      process.env.ALLOWED_SIGNUP_EMAILS = ' user@example.com , *@company.com , admin@test.org ';
      signupRestrictionService.resetConfig();
    });

    it('should trim whitespace from config', () => {
      expect(signupRestrictionService.isSignupAllowed('user@example.com')).toBe(true);
      expect(signupRestrictionService.isSignupAllowed('test@company.com')).toBe(true);
      expect(signupRestrictionService.isSignupAllowed('admin@test.org')).toBe(true);
    });
  });

  describe('Empty patterns', () => {
    beforeEach(() => {
      process.env.ALLOWED_SIGNUP_EMAILS = 'user@example.com,,  ,*@company.com';
      signupRestrictionService.resetConfig();
    });

    it('should filter out empty patterns', () => {
      expect(signupRestrictionService.isSignupAllowed('user@example.com')).toBe(true);
      expect(signupRestrictionService.isSignupAllowed('test@company.com')).toBe(true);
    });
  });

  describe('DISABLE_SIGNUPS takes priority', () => {
    beforeEach(() => {
      process.env.DISABLE_SIGNUPS = 'true';
      process.env.ALLOWED_SIGNUP_EMAILS = 'admin@example.com,*@company.com';
      signupRestrictionService.resetConfig();
    });

    it('should block all signups even with whitelist configured', () => {
      expect(signupRestrictionService.isSignupAllowed('admin@example.com')).toBe(false);
      expect(signupRestrictionService.isSignupAllowed('user@company.com')).toBe(false);
    });

    it('should return "RegistrationDisabled" error code', () => {
      expect(signupRestrictionService.getErrorCode()).toBe('RegistrationDisabled');
    });
  });

  describe('logSignupDenial', () => {
    beforeEach(() => {
      process.env.ALLOWED_SIGNUP_EMAILS = '*@company.com';
      signupRestrictionService.resetConfig();
    });

    it('should not throw when called', () => {
      expect(() => {
        signupRestrictionService.logSignupDenial('user@example.com', 'google');
      }).not.toThrow();

      expect(() => {
        signupRestrictionService.logSignupDenial('user@example.com', 'facebook');
      }).not.toThrow();

      expect(() => {
        signupRestrictionService.logSignupDenial('user@example.com', 'email');
      }).not.toThrow();
    });
  });

  describe('Edge cases', () => {
    it('should handle email without @ symbol gracefully', () => {
      process.env.ALLOWED_SIGNUP_EMAILS = '*@company.com';
      signupRestrictionService.resetConfig();

      // This shouldn't happen in practice (auth providers validate emails)
      // but service should not crash
      expect(() => {
        signupRestrictionService.isSignupAllowed('invalid-email');
      }).not.toThrow();
    });

    it('should handle empty email gracefully', () => {
      process.env.ALLOWED_SIGNUP_EMAILS = '*@company.com';
      signupRestrictionService.resetConfig();

      expect(() => {
        signupRestrictionService.isSignupAllowed('');
      }).not.toThrow();
    });
  });

  describe('Config caching', () => {
    it('should cache config after first call', () => {
      process.env.ALLOWED_SIGNUP_EMAILS = 'user@example.com';
      signupRestrictionService.resetConfig();

      // First call
      expect(signupRestrictionService.isSignupAllowed('user@example.com')).toBe(true);

      // Change env var (should not affect cached config)
      process.env.ALLOWED_SIGNUP_EMAILS = 'other@example.com';

      // Second call should use cached config
      expect(signupRestrictionService.isSignupAllowed('user@example.com')).toBe(true);
      expect(signupRestrictionService.isSignupAllowed('other@example.com')).toBe(false);
    });

    it('should reload config after resetConfig()', () => {
      process.env.ALLOWED_SIGNUP_EMAILS = 'user@example.com';
      signupRestrictionService.resetConfig();

      expect(signupRestrictionService.isSignupAllowed('user@example.com')).toBe(true);

      // Change env var and reset
      process.env.ALLOWED_SIGNUP_EMAILS = 'other@example.com';
      signupRestrictionService.resetConfig();

      // Should use new config
      expect(signupRestrictionService.isSignupAllowed('user@example.com')).toBe(false);
      expect(signupRestrictionService.isSignupAllowed('other@example.com')).toBe(true);
    });
  });
});
