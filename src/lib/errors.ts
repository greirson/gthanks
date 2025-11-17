import { NextResponse } from 'next/server';
import { ZodError } from 'zod';

/**
 * Consolidated Error Handling for gthanks MVP
 *
 * This file combines error classes, type guards, utilities, and handlers
 * from the previous error-handler.ts, errors.ts, and error-utils.ts files.
 */

// ============================================================================
// SECTION 1: Error Classes
// ============================================================================

export class AppError extends Error {
  constructor(
    message: string,
    public code: string,
    public statusCode: number = 500,
    public field?: string
  ) {
    super(message);
    this.name = 'AppError';
  }
}

export class ValidationError extends AppError {
  constructor(message: string, field?: string) {
    super(message, 'VALIDATION_ERROR', 400, field);
    this.name = 'ValidationError';
  }
}

export class NotFoundError extends AppError {
  constructor(message: string) {
    super(message, 'NOT_FOUND', 404);
    this.name = 'NotFoundError';
  }
}

export class UnauthorizedError extends AppError {
  constructor(message: string = 'Unauthorized') {
    super(message, 'UNAUTHORIZED', 401);
    this.name = 'UnauthorizedError';
  }
}

export class ForbiddenError extends AppError {
  constructor(message: string = 'Forbidden') {
    super(message, 'FORBIDDEN', 403);
    this.name = 'ForbiddenError';
  }
}

export class ConflictError extends AppError {
  constructor(message: string = 'Conflict') {
    super(message, 'CONFLICT', 409);
    this.name = 'ConflictError';
  }
}

// ============================================================================
// SECTION 2: Type Guards
// ============================================================================

/**
 * Type guard to check if a value is an Error instance
 */
export function isError(value: unknown): value is Error {
  return value instanceof Error;
}

/**
 * Type guard to check if a value is an AppError instance
 */
export function isAppError(value: unknown): value is AppError {
  return value instanceof AppError;
}

/**
 * Type guard to check if a value is a ZodError instance
 */
export function isZodError(value: unknown): value is ZodError {
  return value instanceof ZodError;
}

// ============================================================================
// SECTION 3: Utility Functions
// ============================================================================

/**
 * Extract a user-friendly error message from various error types
 */
export function getErrorMessage(error: unknown): string {
  // Handle ZodError specifically for better formatting
  if (isZodError(error)) {
    if (error.issues.length === 0) {
      return 'Validation error';
    }
    const messages = error.issues
      .map((issue) => `${issue.path.join('.')}: ${issue.message}`)
      .join('; ');
    return `Validation error: ${messages}`;
  }

  // Handle Error instances (including AppError which extends Error)
  if (isError(error)) {
    return error.message;
  }

  // Handle string errors
  if (typeof error === 'string') {
    return error;
  }

  // Handle objects with message property
  if (
    error &&
    typeof error === 'object' &&
    'message' in error &&
    typeof error.message === 'string'
  ) {
    return error.message;
  }

  // Handle objects with error property
  if (error && typeof error === 'object' && 'error' in error && typeof error.error === 'string') {
    return error.error;
  }

  // Default message for unknown errors
  return 'An unknown error occurred';
}

/**
 * Parse an unknown error into a proper Error instance
 */
export function parseUnknownError(error: unknown): Error {
  // Return Error instances as-is
  if (isError(error)) {
    return error;
  }

  // Convert other types to Error
  return new Error(getErrorMessage(error));
}

// ============================================================================
// SECTION 4: API Error Handler
// ============================================================================

/**
 * Centralized API error handler for consistent error responses
 * @param error - The error object to handle
 * @returns NextResponse with standardized error format
 */
export function handleApiError(error: unknown): NextResponse {
  // Log error for debugging (but don't log sensitive details in production)
  console.error('API Error:', error);

  // Handle AppError instances (business logic errors)
  if (isAppError(error)) {
    return NextResponse.json(
      {
        error: error.message,
        code: error.code,
        ...(error.field && { field: error.field }),
      },
      { status: error.statusCode }
    );
  }

  // Handle Zod validation errors
  if (isZodError(error)) {
    return NextResponse.json(
      {
        error: 'Validation failed',
        code: 'VALIDATION_ERROR',
        details: error.errors,
      },
      { status: 400 }
    );
  }

  // Handle generic errors (don't leak stack traces in production)
  const isProduction = process.env.NODE_ENV === 'production';
  const errorMessage = getErrorMessage(error);

  return NextResponse.json(
    {
      error: isProduction ? 'Internal server error' : errorMessage,
      code: 'INTERNAL_ERROR',
    },
    { status: 500 }
  );
}

// ============================================================================
// SECTION 5: Browser Error Handler (Client-side only)
// ============================================================================

/**
 * Initialize basic error handling for browser environment
 * Sets up global error listeners for unhandled errors and promise rejections
 */
export function initializeErrorHandling() {
  if (typeof window === 'undefined') {
    return;
  }

  // Log unhandled promise rejections
  window.addEventListener('unhandledrejection', (event) => {
    console.error('Unhandled promise rejection:', event.reason);
  });

  // Log global JavaScript errors
  window.addEventListener('error', (event) => {
    console.error('JavaScript error:', event.error || event.message);
  });
}

/**
 * Simple error helper for components
 * @param error - The error to handle
 * @param context - Optional context string for debugging
 * @returns User-friendly error message
 */
export function handleError(error: unknown, context?: string) {
  const message = error instanceof Error ? error.message : String(error);
  const fullMessage = context ? `${context}: ${message}` : message;

  console.error(fullMessage, error);

  // Return a user-friendly message
  return 'An error occurred. Please try again.';
}

// ============================================================================
// SECTION 6: User-Friendly Error Messages (Grandma Test)
// ============================================================================

/**
 * User-friendly error messages for the "Grandma Test"
 * Technical users see codes in logs, end users see friendly messages
 */
export const FRIENDLY_ERROR_MESSAGES: Record<string, string> = {
  VALIDATION_ERROR: 'Please check your information and try again',
  FORBIDDEN: "You don't have permission to do that",
  NOT_FOUND: "We couldn't find what you're looking for",
  UNAUTHORIZED: 'Please sign in to continue',
  RATE_LIMIT_EXCEEDED: 'Too many requests. Please wait a moment and try again',
  EMAIL_REQUIRED: 'An email address is required',
  ALREADY_EXISTS: 'This already exists. Please try something different',
  INVALID_OPERATION: "This action isn't allowed",
  DATABASE_ERROR: 'Something went wrong. Please try again',
  ACCOUNT_LINK_FAILED: "We couldn't link your account. Please try again",
  CONFLICT: 'This already exists. Please try something different',
  INTERNAL_ERROR: 'Something went wrong. Please try again',
};

/**
 * Get user-friendly error message for a code
 * Falls back to provided message or generic error
 */
export function getUserFriendlyError(code: string, fallback?: string): string {
  return FRIENDLY_ERROR_MESSAGES[code] || fallback || 'Something went wrong. Please try again';
}
