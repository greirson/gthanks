/**
 * Utility functions for consistent date serialization between Prisma and API responses
 * Converts Date objects to ISO strings for proper Zod validation
 */

/**
 * Recursively serializes all Date objects in an object to ISO strings
 * Handles nested objects and arrays
 */
export function serializeDates<T>(obj: T): T {
  if (obj === null || obj === undefined) {
    return obj;
  }

  if (obj instanceof Date) {
    return obj.toISOString() as unknown as T;
  }

  if (Array.isArray(obj)) {
    // eslint-disable-next-line @typescript-eslint/no-unsafe-return
    return obj.map((item) => serializeDates(item)) as unknown as T;
  }

  if (typeof obj === 'object') {
    const serialized: Record<string, unknown> = {};
    const source = obj as Record<string, unknown>;
    for (const key in source) {
      if (Object.prototype.hasOwnProperty.call(source, key)) {
        serialized[key] = serializeDates(source[key]);
      }
    }
    return serialized as T;
  }

  return obj;
}

/**
 * Type-safe wrapper for serializing Prisma model responses
 * Ensures all Date fields are converted to ISO strings
 */
export function serializePrismaResponse<T>(data: T): T {
  return serializeDates(data);
}

/**
 * Serializes an array of Prisma models
 */
export function serializePrismaArray<T>(data: T[]): T[] {
  return data.map((item) => serializePrismaResponse(item));
}
