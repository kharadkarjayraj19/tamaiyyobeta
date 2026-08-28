/**
 * Tamayo — Billing validation schemas.
 *
 * Architecture:
 * - DTOs for trip execution submission
 * - DTOs for customer confirmation
 * - DTOs for final bill generation
 * - Aligns with billing-settlement.md and booking-lifecycle.md
 */

import { z } from "zod";
import { commonSchemas } from "../index";

/**
 * Toll line item schema.
 * 
 * VALIDATION: Amount must be positive decimal string, max ₹50,000 per line item
 * to prevent unreasonable values from corrupting billing calculations.
 */
export const TollLineSchema = z.object({
  description: z.string().min(1).max(200),
  amount: commonSchemas.decimalString.refine(
    (val) => {
      const num = parseFloat(val);
      return num > 0 && num <= 50000;
    },
    { message: "Toll amount must be between 0 and 50000" }
  ),
  receiptUrl: z.string().url().optional(),
});

export type TollLine = z.infer<typeof TollLineSchema>;

/**
 * Parking line item schema.
 * 
 * VALIDATION: Amount must be positive decimal string, max ₹10,000 per line item
 * to prevent unreasonable values from corrupting billing calculations.
 */
export const ParkingLineSchema = z.object({
  description: z.string().min(1).max(200),
  amount: commonSchemas.decimalString.refine(
    (val) => {
      const num = parseFloat(val);
      return num > 0 && num <= 10000;
    },
    { message: "Parking amount must be between 0 and 10000" }
  ),
  receiptUrl: z.string().url().optional(),
});

export type ParkingLine = z.infer<typeof ParkingLineSchema>;

/**
 * Trip execution submission schema (supplier/driver submits actuals).
 * 
 * VALIDATION: Odometer readings, if provided, must satisfy end > start.
 * Max 20 toll lines and 20 parking lines to prevent abuse.
 */
export const SubmitTripExecutionSchema = z.object({
  bookingId: commonSchemas.uuid,
  actualKm: commonSchemas.positiveInt,
  actualStartOdometer: commonSchemas.nonNegativeInt.optional(),
  actualEndOdometer: commonSchemas.nonNegativeInt.optional(),
  tollLines: z.array(TollLineSchema).max(20, "Maximum 20 toll line items allowed").default([]),
  parkingLines: z.array(ParkingLineSchema).max(20, "Maximum 20 parking line items allowed").default([]),
  notes: z.string().max(1000).optional(),
}).refine(
  (data) => {
    // Validate odometer readings if both provided
    if (data.actualStartOdometer !== undefined && data.actualEndOdometer !== undefined) {
      return data.actualEndOdometer > data.actualStartOdometer;
    }
    return true;
  },
  {
    message: "actualEndOdometer must be greater than actualStartOdometer",
    path: ["actualEndOdometer"],
  }
);

export type SubmitTripExecution = z.infer<typeof SubmitTripExecutionSchema>;

/**
 * Customer km confirmation schema.
 */
export const CustomerConfirmKmSchema = z.object({
  bookingId: commonSchemas.uuid,
  confirmedKm: commonSchemas.positiveInt,
  notes: z.string().max(500).optional(),
});

export type CustomerConfirmKm = z.infer<typeof CustomerConfirmKmSchema>;

/**
 * Final bill retrieval schema.
 */
export const GetFinalBillSchema = z.object({
  bookingId: commonSchemas.uuid,
});

export type GetFinalBill = z.infer<typeof GetFinalBillSchema>;
