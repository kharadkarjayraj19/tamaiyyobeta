/**
 * Tamayo — Operational error classes for backend application layer.
 *
 * Architecture:
 * - Use these errors in services and repositories for operational failures
 * - API handlers translate these to appropriate HTTP status codes
 * - Never expose Prisma errors directly to API responses
 *
 * Error hierarchy:
 * - OperationalError (base) — Application-level operational failures
 *   - ValidationError — Invalid input data (400)
 *   - NotFoundError — Entity not found (404)
 *   - ConflictError — Business rule conflict (409)
 *   - ForbiddenError — Authorization failed (403)
 *   - UnauthorizedError — Authentication failed (401)
 */

export class OperationalError extends Error {
  public readonly code: string;
  public readonly statusCode: number;
  public readonly details?: unknown;

  constructor(
    message: string,
    code: string,
    statusCode: number,
    details?: unknown
  ) {
    super(message);
    this.name = this.constructor.name;
    this.code = code;
    this.statusCode = statusCode;
    this.details = details;
    Error.captureStackTrace(this, this.constructor);
  }
}

/**
 * ValidationError — Invalid input data
 * Usage: DTO validation failures, business rule validation failures
 */
export class ValidationError extends OperationalError {
  constructor(message: string, details?: unknown) {
    super(message, "VALIDATION_ERROR", 400, details);
  }
}

/**
 * NotFoundError — Entity not found
 * Usage: When querying by ID/ref and entity doesn't exist
 */
export class NotFoundError extends OperationalError {
  constructor(entityType: string, identifier: string) {
    super(
      `${entityType} not found: ${identifier}`,
      "NOT_FOUND",
      404,
      { entityType, identifier }
    );
  }
}

/**
 * ConflictError — Business rule conflict
 * Usage: Booking already cancelled, vehicle already on-trip, duplicate booking ref
 */
export class ConflictError extends OperationalError {
  constructor(message: string, details?: unknown) {
    super(message, "CONFLICT", 409, details);
  }
}

/**
 * ForbiddenError — Authorization failed
 * Usage: Customer trying to access another customer's booking, supplier role mismatch
 */
export class ForbiddenError extends OperationalError {
  constructor(message: string, details?: unknown) {
    super(message, "FORBIDDEN", 403, details);
  }
}

/**
 * UnauthorizedError — Authentication failed
 * Usage: No session, invalid token, expired session
 */
export class UnauthorizedError extends OperationalError {
  constructor(message: string = "Authentication required") {
    super(message, "UNAUTHORIZED", 401);
  }
}

/**
 * Helper to check if error is an OperationalError
 */
export function isOperationalError(error: unknown): error is OperationalError {
  return error instanceof OperationalError;
}

/**
 * Helper to safely extract error message
 */
export function getErrorMessage(error: unknown): string {
  if (error instanceof Error) {
    return error.message;
  }
  if (typeof error === "string") {
    return error;
  }
  return "An unknown error occurred";
}
