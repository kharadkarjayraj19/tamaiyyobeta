import { z } from "zod";

/**
 * Common validation schemas (reusable primitives).
 *
 * Kept in a standalone module to avoid circular imports between
 * schema files and the validation barrel (`index.ts`).
 */
export const commonSchemas = {
  /** UUID string validation */
  uuid: z.string().uuid({ message: "Invalid UUID format" }),

  /** Phone number validation (India +91 format) */
  phone: z
    .string()
    .regex(/^\+91[6-9]\d{9}$/, {
      message: "Invalid phone number. Must be +91 followed by 10 digits.",
    }),

  /** Email validation */
  email: z.string().email({ message: "Invalid email format" }),

  /** Non-empty string validation */
  nonEmptyString: z
    .string()
    .trim()
    .min(1, { message: "Value cannot be empty" }),

  /** Positive integer validation */
  positiveInt: z.number().int().positive(),

  /** Non-negative integer validation */
  nonNegativeInt: z.number().int().nonnegative(),

  /** Decimal string for monetary values (e.g. "123.45") */
  decimalString: z
    .string()
    .regex(/^\d+(\.\d{1,2})?$/, {
      message: "Invalid decimal format. Use format: 123.45",
    }),

  /** ISO date string validation */
  isoDate: z.string().datetime({ message: "Invalid ISO date format" }),

  /** Pagination offset */
  paginationOffset: z.coerce.number().int().nonnegative().default(0),

  /** Pagination limit (max 100) */
  paginationLimit: z.coerce.number().int().positive().max(100).default(20),
};

/**
 * Create enum schema from array of values.
 */
export function createEnumSchema<T extends [string, ...string[]]>(values: T) {
  return z.enum(values);
}
