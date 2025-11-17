/**
 * Apple OAuth Client Secret Generator
 *
 * Automatically generates JWT client secrets for Apple OAuth from environment variables.
 * Eliminates the need for manual JWT generation and file mounting.
 */
import jwt from 'jsonwebtoken';

interface AppleCredentials {
  clientId: string;
  teamId: string;
  keyId: string;
  privateKeyBase64: string;
}

interface AppleClientSecretOptions {
  /** Expiration time in seconds. Default: 6 months (15777000 seconds) */
  expirationSeconds?: number;
  /** Audience for the JWT. Default: 'https://appleid.apple.com' */
  audience?: string;
}

/**
 * Cache for generated client secrets to avoid regenerating unnecessarily
 */
let cachedSecret: {
  token: string;
  expiresAt: number;
} | null = null;

/**
 * Generate Apple OAuth client secret JWT from environment variables
 */
export function generateAppleClientSecret(
  credentials: AppleCredentials,
  options: AppleClientSecretOptions = {}
): string {
  const {
    expirationSeconds = 15777000, // 6 months
    audience = 'https://appleid.apple.com',
  } = options;

  // Validate required credentials
  validateAppleCredentials(credentials);

  const now = Math.floor(Date.now() / 1000);
  const expiration = now + expirationSeconds;

  // Check if we have a valid cached secret (with 1 week buffer)
  if (cachedSecret && cachedSecret.expiresAt > now + 604800) {
    return cachedSecret.token;
  }

  try {
    // Decode the base64 private key
    const privateKey = Buffer.from(credentials.privateKeyBase64, 'base64').toString('utf8');

    // Validate private key format
    if (!privateKey.includes('BEGIN PRIVATE KEY') && !privateKey.includes('BEGIN EC PRIVATE KEY')) {
      throw new Error('Invalid private key format. Expected PEM format private key.');
    }

    // Create JWT payload
    const payload = {
      iss: credentials.teamId,
      iat: now,
      exp: expiration,
      aud: audience,
      sub: credentials.clientId,
    };

    // Generate JWT
    const token = jwt.sign(payload, privateKey, {
      algorithm: 'ES256',
      header: {
        kid: credentials.keyId,
        alg: 'ES256',
      },
    });

    // Cache the generated secret
    cachedSecret = {
      token,
      expiresAt: expiration,
    };

    return token;
  } catch (error) {
    if (error instanceof Error) {
      throw new Error(`Failed to generate Apple client secret: ${error.message}`);
    }
    throw new Error('Failed to generate Apple client secret: Unknown error');
  }
}

/**
 * Get Apple OAuth client secret from environment variables
 */
export function getAppleClientSecret(): string | null {
  // Check if manual client secret is provided (fallback to existing approach)
  const manualSecret = process.env.APPLE_CLIENT_SECRET;
  if (manualSecret) {
    return manualSecret;
  }

  // Check if we have all required environment variables for auto-generation
  const credentials = getAppleCredentialsFromEnv();
  if (!credentials) {
    return null;
  }

  try {
    return generateAppleClientSecret(credentials);
  } catch (error) {
    console.error('Apple OAuth client secret generation failed:', error);
    return null;
  }
}

/**
 * Extract Apple credentials from environment variables
 */
export function getAppleCredentialsFromEnv(): AppleCredentials | null {
  const clientId = process.env.APPLE_CLIENT_ID;
  const teamId = process.env.APPLE_TEAM_ID;
  const keyId = process.env.APPLE_KEY_ID;
  const privateKeyBase64 = process.env.APPLE_PRIVATE_KEY_BASE64;

  if (!clientId || !teamId || !keyId || !privateKeyBase64) {
    return null;
  }

  return {
    clientId,
    teamId,
    keyId,
    privateKeyBase64,
  };
}

/**
 * Validate Apple credentials
 */
function validateAppleCredentials(credentials: AppleCredentials): void {
  const { clientId, teamId, keyId, privateKeyBase64 } = credentials;

  if (!clientId) {
    throw new Error('Apple Client ID is required');
  }

  if (!teamId) {
    throw new Error('Apple Team ID is required');
  }

  if (!/^[A-Z0-9]{10}$/.test(teamId)) {
    throw new Error('Apple Team ID must be exactly 10 alphanumeric characters');
  }

  if (!keyId) {
    throw new Error('Apple Key ID is required');
  }

  if (!/^[A-Z0-9]{10}$/.test(keyId)) {
    throw new Error('Apple Key ID must be exactly 10 alphanumeric characters');
  }

  if (!privateKeyBase64) {
    throw new Error('Apple Private Key (base64 encoded) is required');
  }

  // Validate base64 format
  try {
    const decoded = Buffer.from(privateKeyBase64, 'base64').toString('utf8');
    if (!decoded.includes('BEGIN') || !decoded.includes('PRIVATE KEY')) {
      throw new Error('Invalid private key format');
    }
  } catch {
    throw new Error('Apple Private Key must be valid base64 encoded PEM format');
  }
}

/**
 * Check if Apple OAuth is properly configured
 */
export function isAppleOAuthConfigured(): boolean {
  // Check for manual configuration
  if (process.env.APPLE_CLIENT_SECRET && process.env.APPLE_CLIENT_ID) {
    return true;
  }

  // Check for automatic configuration
  const credentials = getAppleCredentialsFromEnv();
  return credentials !== null;
}

/**
 * Get Apple OAuth configuration status with details
 */
export function getAppleOAuthStatus(): {
  configured: boolean;
  method: 'manual' | 'automatic' | 'none';
  missingVariables?: string[];
  error?: string;
} {
  // Check manual configuration first
  if (process.env.APPLE_CLIENT_SECRET && process.env.APPLE_CLIENT_ID) {
    return {
      configured: true,
      method: 'manual',
    };
  }

  // Check automatic configuration
  const requiredVars = [
    'APPLE_CLIENT_ID',
    'APPLE_TEAM_ID',
    'APPLE_KEY_ID',
    'APPLE_PRIVATE_KEY_BASE64',
  ];
  const missingVars = requiredVars.filter((varName) => !process.env[varName]);

  if (missingVars.length === 0) {
    // All variables present, test generation
    try {
      const credentials = getAppleCredentialsFromEnv();
      if (credentials) {
        validateAppleCredentials(credentials);
        return {
          configured: true,
          method: 'automatic',
        };
      }
    } catch (error) {
      return {
        configured: false,
        method: 'none',
        error: error instanceof Error ? error.message : 'Unknown validation error',
      };
    }
  }

  return {
    configured: false,
    method: 'none',
    missingVariables: missingVars,
  };
}
