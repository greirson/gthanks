import { z } from 'zod';

import { isErrorResponse, validateApiResponse } from '@/lib/validators/api-responses';

export class ApiError extends Error {
  constructor(
    message: string,
    public statusCode: number,
    public code?: string,
    public response?: unknown
  ) {
    super(message);
    this.name = 'ApiError';
  }
}

interface RetryOptions {
  retries?: number;
  retryDelay?: number;
  retryOn?: number[]; // HTTP status codes to retry on
  retryCondition?: (error: ApiError) => boolean;
}

interface FetchOptions extends RequestInit {
  schema?: z.ZodSchema;
  timeout?: number;
  retry?: RetryOptions;
}

/**
 * Type-safe fetch wrapper with response validation
 *
 * @param url - The URL to fetch
 * @param options - Fetch options with optional schema for response validation
 * @returns Validated response data
 * @throws {ApiError} When the request fails or response validation fails
 */
export async function safeFetch<T = unknown>(
  url: string,
  options: FetchOptions & { schema: z.ZodSchema<T> }
): Promise<T>;
export async function safeFetch(url: string, options?: FetchOptions): Promise<unknown>;
export async function safeFetch<T = unknown>(url: string, options: FetchOptions = {}): Promise<T> {
  const { schema, timeout = 30000, retry = {}, ...fetchOptions } = options;
  const {
    retries = 3,
    retryDelay = 1000,
    retryOn = [408, 429, 500, 502, 503, 504],
    retryCondition,
  } = retry;

  let lastError: ApiError | null = null;

  for (let attempt = 0; attempt <= retries; attempt++) {
    // Add timeout support
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), timeout);

    try {
      const response = await fetch(url, {
        ...fetchOptions,
        signal: controller.signal,
      });

      clearTimeout(timeoutId);

      // Handle non-JSON responses
      const contentType = response.headers.get('content-type');
      if (!contentType?.includes('application/json')) {
        if (!response.ok) {
          throw new ApiError(`HTTP error! status: ${response.status}`, response.status);
        }
        return response.text() as Promise<T>;
      }

      const data = await response.json();

      // Handle error responses
      if (!response.ok) {
        if (isErrorResponse(data)) {
          throw new ApiError(data.error, response.status, data.code, data);
        }
        throw new ApiError(
          `HTTP error! status: ${response.status}`,
          response.status,
          undefined,
          data
        );
      }

      // Validate successful response if schema provided
      if (schema) {
        return validateApiResponse(schema, data, 'Invalid API response format');
      }

      return data;
    } catch (error) {
      clearTimeout(timeoutId);

      if (error instanceof ApiError) {
        lastError = error;
      } else if (error instanceof z.ZodError) {
        lastError = new ApiError('Invalid response format', 0, 'VALIDATION_ERROR', error.errors);
      } else if (error instanceof Error) {
        if (error.name === 'AbortError') {
          lastError = new ApiError('Request timeout', 0, 'TIMEOUT');
        } else {
          lastError = new ApiError(error.message, 0, 'NETWORK_ERROR');
        }
      } else {
        lastError = new ApiError('Unknown error occurred', 0, 'UNKNOWN');
      }

      // Don't retry on last attempt
      if (attempt === retries) {
        break;
      }

      // Check if we should retry
      const shouldRetry = retryCondition
        ? retryCondition(lastError)
        : retryOn.includes(lastError.statusCode) ||
          lastError.code === 'TIMEOUT' ||
          lastError.code === 'NETWORK_ERROR';

      if (!shouldRetry) {
        break;
      }

      // Exponential backoff with jitter
      const delay = retryDelay * Math.pow(2, attempt) + Math.random() * 1000;
      await new Promise((resolve) => setTimeout(resolve, delay));
    }
  }

  throw lastError || new ApiError('Request failed', 0, 'UNKNOWN');
}

/**
 * Helper function for GET requests with type validation
 */
export async function apiGet<T>(
  url: string,
  schema: z.ZodSchema<T>,
  options?: Omit<FetchOptions, 'method' | 'body' | 'schema'>
): Promise<T> {
  return safeFetch(url, {
    ...options,
    method: 'GET',
    schema,
  });
}

/**
 * Helper function for POST requests with type validation
 */
export async function apiPost<TResponse, TBody = unknown>(
  url: string,
  body: TBody,
  schema: z.ZodSchema<TResponse>,
  options?: Omit<FetchOptions, 'method' | 'body' | 'schema'>
): Promise<TResponse> {
  return safeFetch(url, {
    ...options,
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      ...options?.headers,
    },
    body: JSON.stringify(body),
    schema,
  });
}

/**
 * Helper function for PUT requests with type validation
 */
export async function apiPut<TResponse, TBody = unknown>(
  url: string,
  body: TBody,
  schema: z.ZodSchema<TResponse>,
  options?: Omit<FetchOptions, 'method' | 'body' | 'schema'>
): Promise<TResponse> {
  return safeFetch(url, {
    ...options,
    method: 'PUT',
    headers: {
      'Content-Type': 'application/json',
      ...options?.headers,
    },
    body: JSON.stringify(body),
    schema,
  });
}

/**
 * Helper function for PATCH requests with type validation
 */
export async function apiPatch<TResponse, TBody = unknown>(
  url: string,
  body: TBody,
  schema: z.ZodSchema<TResponse>,
  options?: Omit<FetchOptions, 'method' | 'body' | 'schema'>
): Promise<TResponse> {
  return safeFetch(url, {
    ...options,
    method: 'PATCH',
    headers: {
      'Content-Type': 'application/json',
      ...options?.headers,
    },
    body: JSON.stringify(body),
    schema,
  });
}

/**
 * Helper function for DELETE requests with type validation
 */
export async function apiDelete<T>(
  url: string,
  schema?: z.ZodSchema<T>,
  options?: Omit<FetchOptions, 'method' | 'schema'>
): Promise<T | void> {
  const result = await safeFetch(url, {
    ...options,
    method: 'DELETE',
    schema,
  });
  return result as T | void;
}

/**
 * Helper function for DELETE requests with body and type validation
 */
export async function apiDeleteWithBody<TBody = unknown, TResponse = void>(
  url: string,
  body: TBody,
  schema?: z.ZodSchema<TResponse>,
  options?: Omit<FetchOptions, 'method' | 'body' | 'schema'>
): Promise<TResponse> {
  return safeFetch(url, {
    ...options,
    method: 'DELETE',
    headers: {
      'Content-Type': 'application/json',
      ...options?.headers,
    },
    body: JSON.stringify(body),
    schema,
  }) as Promise<TResponse>;
}
