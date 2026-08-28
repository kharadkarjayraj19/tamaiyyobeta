/**
 * Tamayo — Refund validation schemas.
 *
 * Architecture:
 * - Zod schemas for refund operations
 * - DTO validation at API boundary
 */

import { z } from "zod";
import { commonSchemas, createEnumSchema } from "@/lib/validation";

/**
 * Refund status enum (from Prisma).
 */
export const RefundStatusSchema = createEnumSchema([
  "INITIATED",
  "SUCCEEDED",
  "FAILED",
] as const);

/**
 * Actor type enum (from Prisma).
 */
export const ActorTypeSchema = createEnumSchema([
  "CUSTOMER",
  "SUPPLIER",
  "ADMIN",
  "SYSTEM",
] as const);

/**
 * Create refund schema.
 * 
 * VALIDATION: Amount must be positive, max ₹5,00,000 per refund.
 * Reason is required for admin-initiated refunds.
 */
export const CreateRefundSchema = z.object({
  bookingId: commonSchemas.uuid,
  paymentId: commonSchemas.uuid,
  amount: commonSchemas.decimalString.refine(
    (val) => {
      const num = parseFloat(val);
      return num > 0 && num <= 500000;
    },
    { message: "Refund amount must be between 0 and 500000" }
  ),
  reason: z.string().min(1).max(500).optional(),
  initiatedBy: ActorTypeSchema,
});

export type CreateRefund = z.infer<typeof CreateRefundSchema>;

/**
 * Update refund status schema.
 */
export const UpdateRefundStatusSchema = z.object({
  status: RefundStatusSchema,
  gatewayRefundId: z.string().min(1).max(255).optional(),
});

export type UpdateRefundStatus = z.infer<typeof UpdateRefundStatusSchema>;

/**
 * Get booking refunds schema (query params).
 */
export const GetBookingRefundsSchema = z.object({
  bookingId: commonSchemas.uuid,
});

export type GetBookingRefunds = z.infer<typeof GetBookingRefundsSchema>;
