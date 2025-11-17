/**
 * Simple Logging Service for MVP
 *
 * Basic console logging without external dependencies
 */

const isDevelopment = process.env.NODE_ENV === 'development';
const isTest = process.env.NODE_ENV === 'test';

export const logger = {
  info: (...args: unknown[]) => {
    if (!isTest) {
      // eslint-disable-next-line no-console
      console.log(...args);
    }
  },
  error: (...args: unknown[]) => {
    if (!isTest) {
      // eslint-disable-next-line no-console
      console.error(...args);
    }
  },
  warn: (...args: unknown[]) => {
    if (!isTest) {
      // eslint-disable-next-line no-console
      console.warn(...args);
    }
  },
  debug: (...args: unknown[]) => {
    if (isDevelopment && !isTest) {
      // eslint-disable-next-line no-console
      console.log('[DEBUG]', ...args);
    }
  },
  child: () => logger, // For compatibility
};

// Security event logging - simplified for MVP
export const logSecurityEvent = (event: string, details?: unknown) => {
  if (isDevelopment) {
    // eslint-disable-next-line no-console
    console.log('[SECURITY]', event, details);
  }
};

// Audit logging - simplified for MVP
export const logAuditEvent = (action: string, details?: unknown) => {
  if (isDevelopment) {
    // eslint-disable-next-line no-console
    console.log('[AUDIT]', action, details);
  }
};

export default logger;
