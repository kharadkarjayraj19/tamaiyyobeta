/**
 * Tamaiyyo — Billing validation schemas.
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
 */
export const TollLineSchema = z.object({
  description: z.string().min(1).max(200),
  amount: commonSchemas.decimalString,
  receiptUrl: z.string().url().optional(),
});

export type TollLine = z.infer<typeof TollLineSchema>;

/**
 * Parking line item schema.
 */
export const ParkingLineSchema = z.object({
  description: z.string().min(1).max(200),
  amount: commonSchemas.decimalString,
  receiptUrl: z.string().url().optional(),
});

export type ParkingLine = z.infer<typeof ParkingLineSchema>;

/**
 * Trip execution submission schema (supplier/driver submits actuals).
 */
export const SubmitTripExecutionSchema = z.object({
  bookingId: commonSchemas.uuid,
  actualKm: commonSchemas.positiveInt,
  actualStartOdometer: commonSchemas.nonNegativeInt.optional(),
  actualEndOdometer: commonSchemas.nonNegativeInt.optional(),
  tollLines: z.array(TollLineSchema).default([]),
  parkingLines: z.array(ParkingLineSchema).default([]),
  notes: z.string().max(1000).optional(),
});

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
