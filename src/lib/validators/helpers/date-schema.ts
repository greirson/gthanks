/**
 * Helper for creating flexible date schemas that accept both Date objects and ISO strings
 * Handles the mismatch between Prisma (Date objects) and JSON serialization (strings)
 */
import { z } from 'zod';

/**
 * Creates a Zod schema that accepts both Date objects and ISO date strings
 * Always transforms to ISO string format for consistency
 */
export const flexibleDateSchema = (): z.ZodType<string> =>
  z
    .union([z.date(), z.string().datetime({ offset: true }).or(z.string().datetime())])
    .transform((val): string => {
      if (val instanceof Date) {
        return val.toISOString();
      }
      return val;
    }) as z.ZodType<string>;

/**
 * Creates a nullable version of the flexible date schema
 */
export const flexibleDateSchemaOptional = (): z.ZodType<string | null> =>
  z
    .union([z.date(), z.string().datetime({ offset: true }).or(z.string().datetime()), z.null()])
    .transform((val): string | null => {
      if (val === null) {
        return null;
      }
      if (val instanceof Date) {
        return val.toISOString();
      }
      return val;
    }) as z.ZodType<string | null>;
