/**
 * Tamayo — Payment validation schemas.
 *
 * Architecture:
 * - Zod schemas for payment operations
 * - DTO validation at API boundary
 */

import { z } from "zod";
import { commonSchemas, createEnumSchema } from "@/lib/validation";

/**
 * Payment mode enum (from Prisma).
 */
export const PaymentModeSchema = createEnumSchema([
  "ONLINE_CARD",
  "ONLINE_UPI",
  "CASH",
] as const);

/**
 * Payment status enum (from Prisma).
 */
export const PaymentStatusSchema = createEnumSchema([
  "INITIATED",
  "AUTHORIZED",
  "CAPTURED",
  "FAILED",
  "REFUNDED",
] as const);

/**
 * Record payment schema.
 * 
 * VALIDATION: Amount must be positive, max ₹5,00,000 per payment.
 */
export const RecordPaymentSchema = z.object({
  bookingId: commonSchemas.uuid,
  amount: commonSchemas.decimalString.refine(
    (val) => {
      const num = parseFloat(val);
      return num > 0 && num <= 500000;
    },
    { message: "Payment amount must be between 0 and 500000" }
  ),
  mode: PaymentModeSchema,
  gatewayOrderId: z.string().min(1).max(255).optional(),
  finalBillId: commonSchemas.uuid.optional(),
});

export type RecordPayment = z.infer<typeof RecordPaymentSchema>;

/**
 * Update payment status schema.
 */
export const UpdatePaymentStatusSchema = z.object({
  status: PaymentStatusSchema,
  gatewayPaymentId: z.string().min(1).max(255).optional(),
});

export type UpdatePaymentStatus = z.infer<typeof UpdatePaymentStatusSchema>;

/**
 * Get booking payments schema (query params).
 */
export const GetBookingPaymentsSchema = z.object({
  bookingId: commonSchemas.uuid,
});

export type GetBookingPayments = z.infer<typeof GetBookingPaymentsSchema>;
