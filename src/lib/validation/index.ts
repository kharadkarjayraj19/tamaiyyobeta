/**
 * Tamayo — Validation helpers using Zod.
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

import { ZodError, ZodSchema } from "zod";
import { ValidationError } from "@/lib/errors";
export { commonSchemas, createEnumSchema } from "./primitives";

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

// Re-export validation schemas
export * from "./schemas/supplier-schemas";
export * from "./schemas/vehicle-schemas";
export * from "./schemas/booking-schemas";
export * from "./schemas/assignment-schemas";
export * from "./schemas/billing-schemas";
export * from "./schemas/payment-schemas";
export * from "./schemas/refund-schemas";
export * from "./schemas/settlement-schemas";
export * from "./schemas/corridor-schemas";
