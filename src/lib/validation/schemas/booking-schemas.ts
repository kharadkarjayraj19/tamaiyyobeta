/**
 * Tamayo — Booking validation schemas.
 *
 * Architecture:
 * - DTOs for booking quote requests
 * - DTOs for booking creation
 * - DTOs for booking filters/listing
 * - Aligns with booking-lifecycle.md and pricing-engine.md
 */

import { z } from "zod";
import { commonSchemas } from "../index";
import {
  VehicleCategory,
  AgeBucket,
  ProductType,
  BookingStatus,
} from "@prisma/client";

/**
 * Destination stop schema (for multi-destination support).
 */
export const DestinationStopSchema = z.object({
  location: z.string().min(1).max(200),
  geo: z
    .object({
      lat: z.number().min(-90).max(90),
      lng: z.number().min(-180).max(180),
    })
    .optional(),
});

export type DestinationStop = z.infer<typeof DestinationStopSchema>;

/**
 * Booking quote request schema.
 * Customer provides trip details to get price estimate.
 */
export const BookingQuoteRequestSchema = z.object({
  sourceCity: z.string().min(1).max(100),
  destinationCity: z.string().min(1).max(100).optional(),
  pickupLocation: z.string().min(1).max(200),
  destinations: z.array(DestinationStopSchema).min(1).max(10),
  tripStartDate: z.string().datetime(),
  tripEndDate: z.string().datetime().optional(),
  category: z.enum([
    VehicleCategory.SEDAN,
    VehicleCategory.ERTIGA,
    VehicleCategory.KIA_CARENS,
    VehicleCategory.INNOVA_CRYSTA,
    VehicleCategory.TEMPO_TRAVELLER,
  ]),
  ageBucket: z.enum([
    AgeBucket.ZERO_TO_THREE,
    AgeBucket.THREE_TO_SEVEN,
    AgeBucket.SEVEN_TO_TWELVE,
  ]),
  productType: z.enum([
    ProductType.ONE_WAY,
    ProductType.MULTI_CITY,
    ProductType.ROUND_TRIP,
  ]),
  estimatedKm: z.number().int().positive().optional(),
  returnDistanceKm: z.number().int().positive().optional(),
});

export type BookingQuoteRequest = z.infer<typeof BookingQuoteRequestSchema>;

/**
 * Booking creation schema.
 * Customer confirms booking based on quote.
 */
export const CreateBookingSchema = z.object({
  quoteId: commonSchemas.uuid.optional(), // Optional: can create without pre-generated quote
  sourceCity: z.string().min(1).max(100),
  destinationCity: z.string().min(1).max(100).optional(),
  pickupLocation: z.string().min(1).max(200),
  destinations: z.array(DestinationStopSchema).min(1).max(10),
  tripStartDate: z.string().datetime(),
  tripEndDate: z.string().datetime().optional(),
  category: z.enum([
    VehicleCategory.SEDAN,
    VehicleCategory.ERTIGA,
    VehicleCategory.KIA_CARENS,
    VehicleCategory.INNOVA_CRYSTA,
    VehicleCategory.TEMPO_TRAVELLER,
  ]),
  ageBucket: z.enum([
    AgeBucket.ZERO_TO_THREE,
    AgeBucket.THREE_TO_SEVEN,
    AgeBucket.SEVEN_TO_TWELVE,
  ]),
  productType: z.enum([
    ProductType.ONE_WAY,
    ProductType.MULTI_CITY,
    ProductType.ROUND_TRIP,
  ]),
  estimatedKm: z.number().int().positive().optional(),
  returnDistanceKm: z.number().int().positive().optional(),
});

export type CreateBooking = z.infer<typeof CreateBookingSchema>;

/**
 * Booking list filters schema.
 */
export const BookingListFiltersSchema = z.object({
  customerId: commonSchemas.uuid.optional(),
  supplierId: commonSchemas.uuid.optional(),
  status: z
    .enum([
      BookingStatus.REQUESTED,
      BookingStatus.SUPPLIER_ASSIGNED,
      BookingStatus.ACCEPTED,
      BookingStatus.READY_FOR_TRIP,
      BookingStatus.IN_PROGRESS,
      BookingStatus.COMPLETED,
      BookingStatus.BILLING_IN_PROGRESS,
      BookingStatus.CLOSED,
      BookingStatus.CANCELLED,
    ])
    .optional(),
  tripStartDateFrom: z.string().datetime().optional(),
  tripStartDateTo: z.string().datetime().optional(),
  offset: commonSchemas.paginationOffset,
  limit: commonSchemas.paginationLimit,
});

export type BookingListFilters = z.infer<typeof BookingListFiltersSchema>;
