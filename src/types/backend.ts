/**
 * Tamaiyyo — Shared backend types.
 *
 * Architecture:
 * - Common types used across services and repositories
 * - Pagination, filters, results
 * - Keep domain types in repository files (co-located with logic)
 */

/**
 * Pagination parameters for list queries.
 */
export interface PaginationParams {
  offset: number;
  limit: number;
}

/**
 * Paginated result wrapper.
 */
export interface PaginatedResult<T> {
  data: T[];
  total: number;
  offset: number;
  limit: number;
  hasMore: boolean;
}

/**
 * Helper to create paginated result.
 */
export function createPaginatedResult<T>(
  data: T[],
  total: number,
  offset: number,
  limit: number
): PaginatedResult<T> {
  return {
    data,
    total,
    offset,
    limit,
    hasMore: offset + data.length < total,
  };
}

/**
 * Date range filter (common pattern).
 */
export interface DateRangeFilter {
  fromDate?: Date;
  toDate?: Date;
}

/**
 * Success result wrapper for API responses.
 */
export interface SuccessResult<T> {
  success: true;
  data: T;
}

/**
 * Error result wrapper for API responses.
 */
export interface ErrorResult {
  success: false;
  error: {
    code: string;
    message: string;
    details?: unknown;
  };
}

/**
 * Generic result type (success or error).
 */
export type Result<T> = SuccessResult<T> | ErrorResult;

/**
 * Helper to create success result.
 */
export function createSuccessResult<T>(data: T): SuccessResult<T> {
  return { success: true, data };
}

/**
 * Helper to create error result.
 */
export function createErrorResult(
  code: string,
  message: string,
  details?: unknown
): ErrorResult {
  return {
    success: false,
    error: { code, message, details },
  };
}
