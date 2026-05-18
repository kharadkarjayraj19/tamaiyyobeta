/**
 * Tamaiyyo — Assignment validation schemas.
 *
 * Architecture:
 * - DTOs for supplier booking acceptance/rejection
 * - DTOs for vehicle/driver assignment
 * - DTOs for admin reassignment
 * - Aligns with supplier-operations.md and booking-lifecycle.md
 */

import { z } from "zod";
import { commonSchemas } from "../index";
import { BookingStatus } from "@prisma/client";

/**
 * Supplier booking acceptance schema.
 */
export const AcceptBookingSchema = z.object({
  bookingId: commonSchemas.uuid,
  notes: z.string().optional(),
});

export type AcceptBooking = z.infer<typeof AcceptBookingSchema>;

/**
 * Supplier booking rejection schema.
 */
export const RejectBookingSchema = z.object({
  bookingId: commonSchemas.uuid,
  reason: z.string().min(10).max(500),
});

export type RejectBooking = z.infer<typeof RejectBookingSchema>;

/**
 * Vehicle and driver assignment schema.
 */
export const AssignVehicleDriverSchema = z.object({
  bookingId: commonSchemas.uuid,
  vehicleId: commonSchemas.uuid,
  driverId: commonSchemas.uuid,
});

export type AssignVehicleDriver = z.infer<typeof AssignVehicleDriverSchema>;

/**
 * Admin reassignment schema.
 */
export const AdminReassignBookingSchema = z.object({
  bookingId: commonSchemas.uuid,
  supplierId: commonSchemas.uuid,
  reason: z.string().min(10).max(500),
});

export type AdminReassignBooking = z.infer<typeof AdminReassignBookingSchema>;

/**
 * Supplier booking queue filters schema.
 */
export const SupplierBookingQueueFiltersSchema = z.object({
  status: z
    .enum([
      BookingStatus.REQUESTED,
      BookingStatus.ACCEPTED,
      BookingStatus.READY_FOR_TRIP,
      BookingStatus.IN_PROGRESS,
      BookingStatus.COMPLETED,
    ])
    .optional(),
  tripStartDateFrom: z.string().datetime().optional(),
  tripStartDateTo: z.string().datetime().optional(),
  offset: commonSchemas.paginationOffset,
  limit: commonSchemas.paginationLimit,
});

export type SupplierBookingQueueFilters = z.infer<
  typeof SupplierBookingQueueFiltersSchema
>;
