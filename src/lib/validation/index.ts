/**
 * Tamaiyyo — Validation helpers using Zod.
 *
 * Architecture:
 * - API handlers validate request DTOs using Zod schemas
 * - Services validate domain business rules (beyond DTO shape)
 * - Throw ValidationError for validation failures
 *
 * Usage:
 * - Define Zod schemas for each DTO
 * - Use validateDto() in route handlers before calling services
 * - Services assume input is shape-valid but apply business rules
 */

import { z, ZodError, ZodSchema } from "zod";
import { ValidationError } from "@/lib/errors";

/**
 * Validate data against a Zod schema.
 * Throws ValidationError with formatted details on failure.
 */
export function validateDto<T>(schema: ZodSchema<T>, data: unknown): T {
  try {
    return schema.parse(data);
  } catch (error) {
    if (error instanceof ZodError) {
      throw new ValidationError("Validation failed", {
        errors: error.issues.map((err) => ({
          path: err.path.join("."),
          message: err.message,
          code: err.code,
        })),
      });
    }
    throw error;
  }
}

/**
 * Safe parse that returns result object instead of throwing.
 * Use when validation failure should be handled without exceptions.
 */
export function safeValidateDto<T>(
  schema: ZodSchema<T>,
  data: unknown
): { success: true; data: T } | { success: false; error: ValidationError } {
  const result = schema.safeParse(data);
  if (result.success) {
    return { success: true, data: result.data };
  }
  return {
    success: false,
    error: new ValidationError("Validation failed", {
      errors: result.error.issues.map((err) => ({
        path: err.path.join("."),
        message: err.message,
        code: err.code,
      })),
    }),
  };
}

/**
 * Common validation schemas (reusable primitives)
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

// Re-export validation schemas
export * from "./schemas/supplier-schemas";
export * from "./schemas/vehicle-schemas";
export * from "./schemas/booking-schemas";
