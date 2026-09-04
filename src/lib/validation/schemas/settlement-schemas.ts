/**
 * Tamayo — Settlement validation schemas.
 *
 * Architecture:
 * - Zod schemas for settlement and payout operations
 * - DTO validation at API boundary
 */

import { z } from "zod";
import { commonSchemas, createEnumSchema } from "../primitives";

/**
 * Supplier earning status enum (from Prisma).
 */
export const SupplierEarningStatusSchema = createEnumSchema([
  "EARNED",
  "ELIGIBLE",
  "BATCHED",
  "PAID",
  "HELD",
] as const);

/**
 * Payout batch status enum (from Prisma).
 */
export const PayoutBatchStatusSchema = createEnumSchema([
  "DRAFT",
  "PENDING",
  "PAID",
  "CANCELLED",
] as const);

/**
 * List eligible earnings schema.
 * 
 * PAGINATION LIMIT: Server enforces maximum of 100 records.
 */
export const ListEligibleEarningsSchema = z.object({
  supplierId: commonSchemas.uuid.optional(),
  offset: commonSchemas.nonNegativeInt.default(0),
  limit: commonSchemas.positiveInt.max(100).default(20),
});

export type ListEligibleEarnings = z.infer<typeof ListEligibleEarningsSchema>;

/**
 * Get supplier earnings history schema.
 * 
 * PAGINATION LIMIT: Server enforces maximum of 100 records.
 */
export const GetSupplierEarningsSchema = z.object({
  status: SupplierEarningStatusSchema.optional(),
  payoutBatchId: commonSchemas.uuid.optional(),
  offset: commonSchemas.nonNegativeInt.default(0),
  limit: commonSchemas.positiveInt.max(100).default(20),
});

export type GetSupplierEarnings = z.infer<typeof GetSupplierEarningsSchema>;

/**
 * Create payout batch schema.
 */
export const CreatePayoutBatchSchema = z.object({
  supplierId: commonSchemas.uuid.optional(),
  cycleStartDate: z.string().refine(
    (val) => !isNaN(Date.parse(val)),
    { message: "Invalid date format for cycleStartDate" }
  ),
  cycleEndDate: z.string().refine(
    (val) => !isNaN(Date.parse(val)),
    { message: "Invalid date format for cycleEndDate" }
  ),
  bookingIds: z.array(commonSchemas.uuid).min(1).max(1000),
}).refine(
  (data) => {
    const start = new Date(data.cycleStartDate);
    const end = new Date(data.cycleEndDate);
    return end > start;
  },
  {
    message: "cycleEndDate must be after cycleStartDate",
    path: ["cycleEndDate"],
  }
);

export type CreatePayoutBatch = z.infer<typeof CreatePayoutBatchSchema>;

/**
 * Mark earnings as eligible schema.
 */
export const MarkEarningsEligibleSchema = z.object({
  bookingIds: z.array(commonSchemas.uuid).min(1).max(100),
});

export type MarkEarningsEligible = z.infer<typeof MarkEarningsEligibleSchema>;

/**
 * List payout batches schema.
 * 
 * PAGINATION LIMIT: Server enforces maximum of 100 records.
 */
export const ListPayoutBatchesSchema = z.object({
  supplierId: commonSchemas.uuid.optional(),
  status: PayoutBatchStatusSchema.optional(),
  fromDate: z.string().refine(
    (val) => !isNaN(Date.parse(val)),
    { message: "Invalid date format for fromDate" }
  ).optional(),
  toDate: z.string().refine(
    (val) => !isNaN(Date.parse(val)),
    { message: "Invalid date format for toDate" }
  ).optional(),
  offset: commonSchemas.nonNegativeInt.default(0),
  limit: commonSchemas.positiveInt.max(100).default(20),
});

export type ListPayoutBatches = z.infer<typeof ListPayoutBatchesSchema>;
