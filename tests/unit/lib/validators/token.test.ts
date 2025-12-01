import {
  createTokenSchema,
  tokenUserSchema,
  tokenCreationResponseSchema,
  tokenInfoSchema,
  tokenListResponseSchema,
  tokenErrorSchema,
  DEVICE_TYPES,
  TOKEN_ERROR_CODES,
  EXPIRATION_OPTIONS,
  EXPIRATION_LABELS,
  DEFAULT_EXPIRATION,
} from '@/lib/validators/token';

describe('Token Validators', () => {
  // =============================================================================
  // createTokenSchema
  // =============================================================================

  describe('createTokenSchema', () => {
    it('accepts valid name and deviceType', () => {
      const result = createTokenSchema.safeParse({
        name: 'My Safari Extension',
        deviceType: 'safari_extension',
      });
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.name).toBe('My Safari Extension');
        expect(result.data.deviceType).toBe('safari_extension');
      }
    });

    it('accepts name without deviceType (optional field)', () => {
      const result = createTokenSchema.safeParse({
        name: 'API Token',
      });
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.name).toBe('API Token');
        expect(result.data.deviceType).toBeUndefined();
      }
    });

    it('trims whitespace from name', () => {
      const result = createTokenSchema.safeParse({
        name: '  My Token  ',
      });
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.name).toBe('My Token');
      }
    });

    it('rejects empty name - SECURITY CRITICAL', () => {
      const result = createTokenSchema.safeParse({
        name: '',
      });
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.issues[0].message).toBe('Name is required');
      }
    });

    it('rejects whitespace-only name - SECURITY CRITICAL', () => {
      const result = createTokenSchema.safeParse({
        name: '   ',
      });
      expect(result.success).toBe(false);
      if (!result.success) {
        // After trim, becomes empty string, so fails min(1)
        expect(result.error.issues[0].message).toBe('Name is required');
      }
    });

    it('rejects missing name - SECURITY CRITICAL', () => {
      const result = createTokenSchema.safeParse({});
      expect(result.success).toBe(false);
    });

    it('rejects name > 100 characters', () => {
      const longName = 'a'.repeat(101);
      const result = createTokenSchema.safeParse({
        name: longName,
      });
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.issues[0].message).toBe('Name must be less than 100 characters');
      }
    });

    it('accepts name exactly 100 characters', () => {
      const exactName = 'a'.repeat(100);
      const result = createTokenSchema.safeParse({
        name: exactName,
      });
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.name).toBe(exactName);
      }
    });

    it('accepts name with 1 character (minimum)', () => {
      const result = createTokenSchema.safeParse({
        name: 'a',
      });
      expect(result.success).toBe(true);
    });

    it('rejects invalid deviceType', () => {
      const result = createTokenSchema.safeParse({
        name: 'Test Token',
        deviceType: 'invalid_device',
      });
      expect(result.success).toBe(false);
    });

    it('accepts all valid device types', () => {
      for (const deviceType of DEVICE_TYPES) {
        const result = createTokenSchema.safeParse({
          name: 'Token for ' + deviceType,
          deviceType,
        });
        expect(result.success).toBe(true);
      }
    });

    it('accepts all valid expiration options', () => {
      for (const expiresIn of EXPIRATION_OPTIONS) {
        const result = createTokenSchema.safeParse({
          name: 'Token with ' + expiresIn + ' expiration',
          expiresIn,
        });
        expect(result.success).toBe(true);
        if (result.success) {
          expect(result.data.expiresIn).toBe(expiresIn);
        }
      }
    });

    it('defaults to 90d expiration when not specified', () => {
      const result = createTokenSchema.safeParse({
        name: 'Default Expiration Token',
      });
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.expiresIn).toBe('90d');
      }
    });

    it('rejects invalid expiresIn option', () => {
      const result = createTokenSchema.safeParse({
        name: 'Test Token',
        expiresIn: '100d', // Invalid option
      });
      expect(result.success).toBe(false);
    });

    it('accepts name with special characters', () => {
      const result = createTokenSchema.safeParse({
        name: "John's Safari Extension (v1.0) - Work",
      });
      expect(result.success).toBe(true);
    });

    it('accepts name with unicode characters', () => {
      const result = createTokenSchema.safeParse({
        name: 'Extension de Safari',
      });
      expect(result.success).toBe(true);
    });

    it('rejects non-string name', () => {
      const result = createTokenSchema.safeParse({
        name: 123,
      });
      expect(result.success).toBe(false);
    });

    it('rejects null name', () => {
      const result = createTokenSchema.safeParse({
        name: null,
      });
      expect(result.success).toBe(false);
    });
  });

  // =============================================================================
  // tokenUserSchema
  // =============================================================================

  describe('tokenUserSchema', () => {
    it('accepts valid user with all fields', () => {
      const result = tokenUserSchema.safeParse({
        id: 'user_123',
        name: 'John Doe',
        email: 'john@example.com',
      });
      expect(result.success).toBe(true);
    });

    it('accepts user with null name', () => {
      const result = tokenUserSchema.safeParse({
        id: 'user_123',
        name: null,
        email: 'john@example.com',
      });
      expect(result.success).toBe(true);
    });

    it('accepts user with null email', () => {
      const result = tokenUserSchema.safeParse({
        id: 'user_123',
        name: 'John Doe',
        email: null,
      });
      expect(result.success).toBe(true);
    });

    it('accepts user with both name and email null', () => {
      const result = tokenUserSchema.safeParse({
        id: 'user_123',
        name: null,
        email: null,
      });
      expect(result.success).toBe(true);
    });

    it('rejects missing id', () => {
      const result = tokenUserSchema.safeParse({
        name: 'John Doe',
        email: 'john@example.com',
      });
      expect(result.success).toBe(false);
    });

    it('rejects invalid email format', () => {
      const result = tokenUserSchema.safeParse({
        id: 'user_123',
        name: 'John Doe',
        email: 'not-an-email',
      });
      expect(result.success).toBe(false);
    });
  });

  // =============================================================================
  // tokenCreationResponseSchema (simplified - no refresh token)
  // =============================================================================

  describe('tokenCreationResponseSchema', () => {
    it('accepts valid token creation response with expiration', () => {
      const result = tokenCreationResponseSchema.safeParse({
        token: 'gth_access_abc123',
        expiresAt: Date.now() + 3600000,
        user: {
          id: 'user_123',
          name: 'John Doe',
          email: 'john@example.com',
        },
      });
      expect(result.success).toBe(true);
    });

    it('accepts token creation response with null expiresAt (never expires)', () => {
      const result = tokenCreationResponseSchema.safeParse({
        token: 'gth_access_abc123',
        expiresAt: null,
        user: {
          id: 'user_123',
          name: 'John Doe',
          email: 'john@example.com',
        },
      });
      expect(result.success).toBe(true);
    });

    it('rejects missing token', () => {
      const result = tokenCreationResponseSchema.safeParse({
        expiresAt: Date.now() + 3600000,
        user: { id: 'user_123', name: null, email: null },
      });
      expect(result.success).toBe(false);
    });

    it('rejects missing user', () => {
      const result = tokenCreationResponseSchema.safeParse({
        token: 'gth_access_abc123',
        expiresAt: Date.now() + 3600000,
      });
      expect(result.success).toBe(false);
    });

    it('rejects string expiresAt (must be number or null)', () => {
      const result = tokenCreationResponseSchema.safeParse({
        token: 'gth_access_abc123',
        expiresAt: '2024-01-01T00:00:00Z', // String instead of number
        user: { id: 'user_123', name: null, email: null },
      });
      expect(result.success).toBe(false);
    });
  });

  // =============================================================================
  // tokenInfoSchema
  // =============================================================================

  describe('tokenInfoSchema', () => {
    it('accepts valid token info with expiration', () => {
      const result = tokenInfoSchema.safeParse({
        id: 'token_123',
        name: 'My Safari Extension',
        deviceType: 'safari_extension',
        tokenPrefix: 'gth_abc1',
        lastUsedAt: '2024-01-15T10:30:00.000Z',
        createdAt: '2024-01-01T00:00:00.000Z',
        expiresAt: '2024-12-31T23:59:59.999Z',
        current: true,
      });
      expect(result.success).toBe(true);
    });

    it('accepts token info with null expiresAt (never expires)', () => {
      const result = tokenInfoSchema.safeParse({
        id: 'token_123',
        name: 'Eternal Token',
        deviceType: 'api_client',
        tokenPrefix: 'gth_abc1',
        lastUsedAt: null,
        createdAt: '2024-01-01T00:00:00.000Z',
        expiresAt: null,
        current: false,
      });
      expect(result.success).toBe(true);
    });

    it('accepts token info with null deviceType', () => {
      const result = tokenInfoSchema.safeParse({
        id: 'token_123',
        name: 'My Token',
        deviceType: null,
        tokenPrefix: 'gth_abc1',
        lastUsedAt: null,
        createdAt: '2024-01-01T00:00:00.000Z',
        expiresAt: '2024-12-31T23:59:59.999Z',
      });
      expect(result.success).toBe(true);
    });

    it('accepts token info without current field (optional)', () => {
      const result = tokenInfoSchema.safeParse({
        id: 'token_123',
        name: 'My Token',
        deviceType: null,
        tokenPrefix: 'gth_abc1',
        lastUsedAt: null,
        createdAt: '2024-01-01T00:00:00.000Z',
        expiresAt: '2024-12-31T23:59:59.999Z',
      });
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.current).toBeUndefined();
      }
    });

    it('rejects invalid datetime format for createdAt', () => {
      const result = tokenInfoSchema.safeParse({
        id: 'token_123',
        name: 'My Token',
        deviceType: null,
        tokenPrefix: 'gth_abc1',
        lastUsedAt: null,
        createdAt: 'not-a-date',
        expiresAt: '2024-12-31T23:59:59.999Z',
      });
      expect(result.success).toBe(false);
    });

    it('rejects missing required fields', () => {
      const result = tokenInfoSchema.safeParse({
        id: 'token_123',
        name: 'My Token',
        // Missing tokenPrefix, createdAt
      });
      expect(result.success).toBe(false);
    });
  });

  // =============================================================================
  // tokenListResponseSchema
  // =============================================================================

  describe('tokenListResponseSchema', () => {
    it('accepts valid token list response', () => {
      const result = tokenListResponseSchema.safeParse({
        tokens: [
          {
            id: 'token_1',
            name: 'Token 1',
            deviceType: 'safari_extension',
            tokenPrefix: 'gth_abc1',
            lastUsedAt: '2024-01-15T10:30:00.000Z',
            createdAt: '2024-01-01T00:00:00.000Z',
            expiresAt: '2024-12-31T23:59:59.999Z',
            current: true,
          },
          {
            id: 'token_2',
            name: 'Token 2',
            deviceType: null,
            tokenPrefix: 'gth_def2',
            lastUsedAt: null,
            createdAt: '2024-01-05T00:00:00.000Z',
            expiresAt: null, // Never expires
          },
        ],
      });
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.tokens).toHaveLength(2);
      }
    });

    it('accepts empty token list', () => {
      const result = tokenListResponseSchema.safeParse({
        tokens: [],
      });
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.tokens).toHaveLength(0);
      }
    });

    it('rejects missing tokens field', () => {
      const result = tokenListResponseSchema.safeParse({});
      expect(result.success).toBe(false);
    });

    it('rejects non-array tokens', () => {
      const result = tokenListResponseSchema.safeParse({
        tokens: 'not-an-array',
      });
      expect(result.success).toBe(false);
    });
  });

  // =============================================================================
  // tokenErrorSchema
  // =============================================================================

  describe('tokenErrorSchema', () => {
    it('accepts valid error response', () => {
      const result = tokenErrorSchema.safeParse({
        error: 'unauthorized',
        message: 'Authentication required',
      });
      expect(result.success).toBe(true);
    });

    it('accepts all valid error codes', () => {
      for (const errorCode of TOKEN_ERROR_CODES) {
        const result = tokenErrorSchema.safeParse({
          error: errorCode,
          message: 'Error: ' + errorCode,
        });
        expect(result.success).toBe(true);
      }
    });

    it('rejects invalid error code', () => {
      const result = tokenErrorSchema.safeParse({
        error: 'invalid_error_code',
        message: 'Some error',
      });
      expect(result.success).toBe(false);
    });

    it('rejects missing error code', () => {
      const result = tokenErrorSchema.safeParse({
        message: 'Some error',
      });
      expect(result.success).toBe(false);
    });

    it('rejects missing message', () => {
      const result = tokenErrorSchema.safeParse({
        error: 'unauthorized',
      });
      expect(result.success).toBe(false);
    });
  });

  // =============================================================================
  // DEVICE_TYPES constant
  // =============================================================================

  describe('DEVICE_TYPES constant', () => {
    it('contains expected device types', () => {
      expect(DEVICE_TYPES).toContain('safari_extension');
      expect(DEVICE_TYPES).toContain('chrome_extension');
      expect(DEVICE_TYPES).toContain('firefox_extension');
      expect(DEVICE_TYPES).toContain('ios_app');
      expect(DEVICE_TYPES).toContain('android_app');
      expect(DEVICE_TYPES).toContain('api_client');
      expect(DEVICE_TYPES).toContain('other');
    });

    it('has exactly 7 device types', () => {
      expect(DEVICE_TYPES).toHaveLength(7);
    });
  });

  // =============================================================================
  // EXPIRATION_OPTIONS constant
  // =============================================================================

  describe('EXPIRATION_OPTIONS constant', () => {
    it('contains expected expiration options', () => {
      expect(EXPIRATION_OPTIONS).toContain('30d');
      expect(EXPIRATION_OPTIONS).toContain('90d');
      expect(EXPIRATION_OPTIONS).toContain('6m');
      expect(EXPIRATION_OPTIONS).toContain('1y');
      expect(EXPIRATION_OPTIONS).toContain('never');
    });

    it('has exactly 5 expiration options', () => {
      expect(EXPIRATION_OPTIONS).toHaveLength(5);
    });
  });

  // =============================================================================
  // EXPIRATION_LABELS constant
  // =============================================================================

  describe('EXPIRATION_LABELS constant', () => {
    it('has labels for all expiration options', () => {
      for (const option of EXPIRATION_OPTIONS) {
        expect(EXPIRATION_LABELS[option]).toBeDefined();
        expect(typeof EXPIRATION_LABELS[option]).toBe('string');
      }
    });

    it('has expected label values', () => {
      expect(EXPIRATION_LABELS['30d']).toBe('30 days');
      expect(EXPIRATION_LABELS['90d']).toBe('90 days');
      expect(EXPIRATION_LABELS['6m']).toBe('6 months');
      expect(EXPIRATION_LABELS['1y']).toBe('1 year');
      expect(EXPIRATION_LABELS['never']).toBe('No expiration');
    });
  });

  // =============================================================================
  // DEFAULT_EXPIRATION constant
  // =============================================================================

  describe('DEFAULT_EXPIRATION constant', () => {
    it('is 90d (like GitHub)', () => {
      expect(DEFAULT_EXPIRATION).toBe('90d');
    });

    it('is a valid expiration option', () => {
      expect(EXPIRATION_OPTIONS).toContain(DEFAULT_EXPIRATION);
    });
  });

  // =============================================================================
  // TOKEN_ERROR_CODES constant
  // =============================================================================

  describe('TOKEN_ERROR_CODES constant', () => {
    it('contains expected error codes', () => {
      expect(TOKEN_ERROR_CODES).toContain('unauthorized');
      expect(TOKEN_ERROR_CODES).toContain('invalid_token');
      expect(TOKEN_ERROR_CODES).toContain('token_expired');
      expect(TOKEN_ERROR_CODES).toContain('token_revoked');
      expect(TOKEN_ERROR_CODES).toContain('not_found');
      expect(TOKEN_ERROR_CODES).toContain('rate_limited');
      expect(TOKEN_ERROR_CODES).toContain('validation_error');
    });

    it('has exactly 7 error codes', () => {
      expect(TOKEN_ERROR_CODES).toHaveLength(7);
    });
  });
});
