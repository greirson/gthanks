import {
  createTokenSchema,
  refreshTokenSchema,
  tokenUserSchema,
  tokenCreationResponseSchema,
  tokenRefreshResponseSchema,
  tokenInfoSchema,
  tokenListResponseSchema,
  tokenErrorSchema,
  DEVICE_TYPES,
  TOKEN_ERROR_CODES,
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
          name: `Token for ${deviceType}`,
          deviceType,
        });
        expect(result.success).toBe(true);
      }
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
  // refreshTokenSchema
  // =============================================================================

  describe('refreshTokenSchema', () => {
    it('accepts valid refresh token string', () => {
      const result = refreshTokenSchema.safeParse({
        refreshToken: 'gth_refresh_abc123def456',
      });
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.refreshToken).toBe('gth_refresh_abc123def456');
      }
    });

    it('rejects empty refreshToken - SECURITY CRITICAL', () => {
      const result = refreshTokenSchema.safeParse({
        refreshToken: '',
      });
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.issues[0].message).toBe('Refresh token is required');
      }
    });

    it('rejects missing refreshToken - SECURITY CRITICAL', () => {
      const result = refreshTokenSchema.safeParse({});
      expect(result.success).toBe(false);
    });

    it('rejects non-string refreshToken', () => {
      const result = refreshTokenSchema.safeParse({
        refreshToken: 12345,
      });
      expect(result.success).toBe(false);
    });

    it('rejects null refreshToken', () => {
      const result = refreshTokenSchema.safeParse({
        refreshToken: null,
      });
      expect(result.success).toBe(false);
    });

    it('rejects undefined refreshToken', () => {
      const result = refreshTokenSchema.safeParse({
        refreshToken: undefined,
      });
      expect(result.success).toBe(false);
    });

    it('accepts long refresh token strings', () => {
      const longToken = 'gth_refresh_' + 'a'.repeat(500);
      const result = refreshTokenSchema.safeParse({
        refreshToken: longToken,
      });
      expect(result.success).toBe(true);
    });

    it('accepts refresh token with special characters', () => {
      const result = refreshTokenSchema.safeParse({
        refreshToken: 'gth_refresh_abc-123_def.456',
      });
      expect(result.success).toBe(true);
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
  // tokenCreationResponseSchema
  // =============================================================================

  describe('tokenCreationResponseSchema', () => {
    it('accepts valid token creation response', () => {
      const result = tokenCreationResponseSchema.safeParse({
        accessToken: 'gth_access_abc123',
        refreshToken: 'gth_refresh_def456',
        expiresAt: Date.now() + 3600000,
        user: {
          id: 'user_123',
          name: 'John Doe',
          email: 'john@example.com',
        },
      });
      expect(result.success).toBe(true);
    });

    it('rejects missing accessToken', () => {
      const result = tokenCreationResponseSchema.safeParse({
        refreshToken: 'gth_refresh_def456',
        expiresAt: Date.now() + 3600000,
        user: { id: 'user_123', name: null, email: null },
      });
      expect(result.success).toBe(false);
    });

    it('rejects missing refreshToken', () => {
      const result = tokenCreationResponseSchema.safeParse({
        accessToken: 'gth_access_abc123',
        expiresAt: Date.now() + 3600000,
        user: { id: 'user_123', name: null, email: null },
      });
      expect(result.success).toBe(false);
    });

    it('rejects missing expiresAt', () => {
      const result = tokenCreationResponseSchema.safeParse({
        accessToken: 'gth_access_abc123',
        refreshToken: 'gth_refresh_def456',
        user: { id: 'user_123', name: null, email: null },
      });
      expect(result.success).toBe(false);
    });

    it('rejects missing user', () => {
      const result = tokenCreationResponseSchema.safeParse({
        accessToken: 'gth_access_abc123',
        refreshToken: 'gth_refresh_def456',
        expiresAt: Date.now() + 3600000,
      });
      expect(result.success).toBe(false);
    });

    it('rejects non-number expiresAt', () => {
      const result = tokenCreationResponseSchema.safeParse({
        accessToken: 'gth_access_abc123',
        refreshToken: 'gth_refresh_def456',
        expiresAt: '2024-01-01T00:00:00Z', // String instead of number
        user: { id: 'user_123', name: null, email: null },
      });
      expect(result.success).toBe(false);
    });
  });

  // =============================================================================
  // tokenRefreshResponseSchema
  // =============================================================================

  describe('tokenRefreshResponseSchema', () => {
    it('accepts valid token refresh response', () => {
      const result = tokenRefreshResponseSchema.safeParse({
        accessToken: 'gth_access_new123',
        expiresAt: Date.now() + 3600000,
      });
      expect(result.success).toBe(true);
    });

    it('rejects missing accessToken', () => {
      const result = tokenRefreshResponseSchema.safeParse({
        expiresAt: Date.now() + 3600000,
      });
      expect(result.success).toBe(false);
    });

    it('rejects missing expiresAt', () => {
      const result = tokenRefreshResponseSchema.safeParse({
        accessToken: 'gth_access_new123',
      });
      expect(result.success).toBe(false);
    });
  });

  // =============================================================================
  // tokenInfoSchema
  // =============================================================================

  describe('tokenInfoSchema', () => {
    it('accepts valid token info', () => {
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
        // Missing tokenPrefix, createdAt, expiresAt
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
            expiresAt: '2024-12-31T23:59:59.999Z',
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
          message: `Error: ${errorCode}`,
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
  // TOKEN_ERROR_CODES constant
  // =============================================================================

  describe('TOKEN_ERROR_CODES constant', () => {
    it('contains expected error codes', () => {
      expect(TOKEN_ERROR_CODES).toContain('unauthorized');
      expect(TOKEN_ERROR_CODES).toContain('invalid_token');
      expect(TOKEN_ERROR_CODES).toContain('invalid_refresh_token');
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
