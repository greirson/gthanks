import { logger } from './logger';

/**
 * Configuration for signup restrictions
 */
interface SignupConfig {
  disabled: boolean;
  allowedPatterns: Set<string>; // Normalized patterns for O(1) lookup
}

/**
 * Service for managing signup restrictions based on environment variables
 *
 * Supports:
 * - Disabling all signups (DISABLE_SIGNUPS=true)
 * - Email whitelist (ALLOWED_SIGNUP_EMAILS="user@example.com,...")
 * - Domain wildcard whitelist (ALLOWED_SIGNUP_EMAILS="*@company.com,...")
 * - Mixed email and domain restrictions
 *
 * Security features:
 * - Normalized email comparison (lowercase, trimmed)
 * - Set-based O(1) lookup (no timing attacks)
 * - No regex patterns (prevents ReDoS)
 * - Generic error codes (no whitelist disclosure)
 * - Detailed server-side logging only
 */
class SignupRestrictionService {
  private config: SignupConfig | null = null;

  /**
   * Parse environment variables and cache configuration
   * Runs once at startup for performance
   */
  private getConfig(): SignupConfig {
    if (this.config) {
      return this.config;
    }

    const disabled = process.env.DISABLE_SIGNUPS === 'true';
    const allowed = process.env.ALLOWED_SIGNUP_EMAILS || '';

    // Parse and normalize: trim, lowercase, deduplicate
    const patterns = allowed
      .split(',')
      .map((p) => p.trim().toLowerCase())
      .filter((p) => p.length > 0);

    this.config = {
      disabled,
      allowedPatterns: new Set(patterns),
    };

    return this.config;
  }

  /**
   * Check if an email address is allowed to sign up
   *
   * @param email - Email address to validate
   * @returns true if signup is allowed, false otherwise
   *
   * @example
   * // With DISABLE_SIGNUPS=true
   * isSignupAllowed('user@example.com') // => false
   *
   * @example
   * // With ALLOWED_SIGNUP_EMAILS="*@company.com"
   * isSignupAllowed('user@company.com') // => true
   * isSignupAllowed('user@external.com') // => false
   *
   * @example
   * // No restrictions configured (default MVP behavior)
   * isSignupAllowed('anyone@anywhere.com') // => true
   */
  isSignupAllowed(email: string): boolean {
    const config = this.getConfig();

    // Check 1: Signups globally disabled?
    if (config.disabled) {
      return false;
    }

    // Check 2: No whitelist = allow all (backward compatible)
    if (config.allowedPatterns.size === 0) {
      return true;
    }

    const normalized = email.trim().toLowerCase();
    const domain = '@' + normalized.split('@')[1];

    // Check 3: Exact email match or wildcard domain match
    return (
      config.allowedPatterns.has(normalized) || // exact: user@example.com
      config.allowedPatterns.has('*' + domain) // wildcard: *@example.com
    );
  }

  /**
   * Get generic error code for signup denial
   * Does not disclose whitelist information
   *
   * @returns 'RegistrationDisabled' if globally disabled, 'AccessDenied' for whitelist block
   */
  getErrorCode(): string {
    const config = this.getConfig();
    return config.disabled ? 'RegistrationDisabled' : 'AccessDenied';
  }

  /**
   * Log signup denial with details (server-side only)
   *
   * @param email - Email that was denied
   * @param provider - Auth provider used (email, google, facebook, etc.)
   *
   * Privacy: Logs domain only, not full email address
   */
  logSignupDenial(email: string, provider: string): void {
    const domain = email.split('@')[1] || 'unknown';
    const config = this.getConfig();

    logger.warn('Signup attempt blocked', {
      domain, // Privacy: log domain only, not full email
      provider,
      reason: config.disabled ? 'Global disable' : 'Not on whitelist',
    });
  }

  /**
   * Check if signups are globally disabled
   *
   * @returns true if DISABLE_SIGNUPS=true, false otherwise
   */
  isSignupsDisabled(): boolean {
    return this.getConfig().disabled;
  }

  /**
   * Reset cached configuration (useful for testing)
   * @internal
   */
  resetConfig(): void {
    this.config = null;
  }
}

export const signupRestrictionService = new SignupRestrictionService();
