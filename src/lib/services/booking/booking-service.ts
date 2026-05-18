/**
 * Tamaiyyo — BookingService.
 *
 * Architecture:
 * - Orchestrates booking workflows (quote generation, booking creation)
 * - Owns business rules and validation
 * - Manages transactions via withTransaction
 * - Preserves immutable pricing snapshots
 * - Appends domain events for audit
 */

import { BookingStatus, ProductType, VehicleCategory, AgeBucket } from "@prisma/client";
import {
  bookingRepository,
  type BookingDomain,
  type CreateBookingData,
} from "@/lib/repositories/booking/booking-repository";
import {
  bookingItineraryRepository,
  type CreateBookingItineraryData,
} from "@/lib/repositories/booking/booking-itinerary-repository";
import {
  bookingPricingSnapshotRepository,
  type CreateBookingPricingSnapshotData,
} from "@/lib/repositories/booking/booking-pricing-snapshot-repository";
import {
  quoteRepository,
  type CreateQuoteData,
  type QuoteDomain,
} from "@/lib/repositories/booking/quote-repository";
import {
  domainEventRepository,
  type CreateDomainEventData,
} from "@/lib/repositories/event/domain-event-repository";
import { quoteService, type PricingInput } from "./quote-service";
import prisma from "@/lib/db/prisma";
import { withTransaction } from "@/lib/db/transactions";
import { ValidationError, ConflictError } from "@/lib/errors";

/**
 * DTO for booking quote request.
 */
export interface BookingQuoteRequest {
  customerId: string;
  sourceCity: string;
  destinationCity?: string;
  pickupLocation: string;
  destinations: Array<{ location: string; geo?: { lat: number; lng: number } }>;
  tripStartDate: Date;
  tripEndDate?: Date;
  category: VehicleCategory;
  ageBucket: AgeBucket;
  productType: ProductType;
  estimatedKm?: number;
}

/**
 * DTO for creating a booking.
 */
export interface CreateBooking {
  customerId: string;
  sourceCity: string;
  destinationCity?: string;
  pickupLocation: string;
  destinations: Array<{ location: string; geo?: { lat: number; lng: number } }>;
  tripStartDate: Date;
  tripEndDate?: Date;
  category: VehicleCategory;
  ageBucket: AgeBucket;
  productType: ProductType;
  estimatedKm?: number;
}

/**
 * Booking with full details (booking + quote).
 */
export interface BookingWithDetails {
  booking: BookingDomain;
  quote: QuoteDomain;
}

/**
 * BookingService — business logic for booking operations.
 */
export class BookingService {
  /**
   * Generate a quote for a booking request (no booking created yet).
   * Returns pricing details for customer review.
   */
  async generateQuote(request: BookingQuoteRequest): Promise<{
    estimatedTotal: string;
    lineItems: Array<{ lineType: string; description: string; amount: string }>;
    includedKmPerDay: number;
    includedDays: number;
    totalIncludedKm: number;
  }> {
    // Validate trip dates
    this.validateTripDates(request.tripStartDate, request.tripEndDate);

    // Calculate pricing
    const pricingInput: PricingInput = {
      category: request.category,
      ageBucket: request.ageBucket,
      productType: request.productType,
      tripStartDate: request.tripStartDate,
      tripEndDate: request.tripEndDate,
      estimatedKm: request.estimatedKm,
      sourceCity: request.sourceCity,
    };

    const pricing = quoteService.calculatePricing(pricingInput);

    return {
      estimatedTotal: pricing.estimatedTotal.toFixed(2),
      lineItems: pricing.lineItems,
      includedKmPerDay: pricing.includedKmPerDay,
      includedDays: pricing.includedDays,
      totalIncludedKm: pricing.totalIncludedKm,
    };
  }

  /**
   * Create a new booking with full transactional integrity.
   * Creates: Booking → Itinerary → PricingSnapshot → Quote → DomainEvent
   */
  async createBooking(data: CreateBooking): Promise<BookingWithDetails> {
    // Validate trip dates
    this.validateTripDates(data.tripStartDate, data.tripEndDate);

    // Validate destinations
    if (data.destinations.length === 0) {
      throw new ValidationError("At least one destination is required");
    }

    return withTransaction(prisma, async (tx) => {
      // Generate unique booking reference
      const bookingRef = await this.generateBookingRef();

      // Calculate pricing
      const pricingInput: PricingInput = {
        category: data.category,
        ageBucket: data.ageBucket,
        productType: data.productType,
        tripStartDate: data.tripStartDate,
        tripEndDate: data.tripEndDate,
        estimatedKm: data.estimatedKm,
        sourceCity: data.sourceCity,
      };

      const pricing = quoteService.calculatePricing(pricingInput);

      // 1. Create booking
      const bookingData: CreateBookingData = {
        bookingRef,
        customerId: data.customerId,
        productType: data.productType,
        tripStartDate: data.tripStartDate,
        tripEndDate: data.tripEndDate,
        estimatedKm: data.estimatedKm,
        sourceCity: data.sourceCity,
        destinationCity: data.destinationCity,
      };

      const booking = await bookingRepository.create(bookingData, tx);

      // 2. Create itinerary
      const itineraryData: CreateBookingItineraryData = {
        bookingId: booking.id,
        pickupLocation: data.pickupLocation,
        destinations: data.destinations,
        estimatedDistance: data.estimatedKm,
      };

      await bookingItineraryRepository.create(itineraryData, tx);

      // 3. Create pricing snapshot (immutable)
      const snapshotData: CreateBookingPricingSnapshotData = {
        bookingId: booking.id,
        category: data.category,
        ageBucket: data.ageBucket,
        includedKmPerDay: pricing.includedKmPerDay,
        includedDays: pricing.includedDays,
        totalIncludedKm: pricing.totalIncludedKm,
        basePrice: pricing.basePrice,
        snapshotData: pricing.snapshotData,
      };

      await bookingPricingSnapshotRepository.create(snapshotData, tx);

      // 4. Create quote
      const quoteData: CreateQuoteData = {
        bookingId: booking.id,
        estimatedTotal: pricing.estimatedTotal,
        lineItems: pricing.lineItems,
      };

      const quote = await quoteRepository.create(quoteData, tx);

      // 5. Append domain events
      const bookingCreatedEvent: CreateDomainEventData = {
        eventType: "BOOKING_CREATED",
        entityType: "BOOKING",
        entityId: booking.id,
        actorType: "CUSTOMER",
        actorId: data.customerId,
        payload: {
          bookingRef: booking.bookingRef,
          category: data.category,
          ageBucket: data.ageBucket,
          productType: data.productType,
          sourceCity: data.sourceCity,
          destinationCity: data.destinationCity,
        },
      };

      await domainEventRepository.append(bookingCreatedEvent, tx);

      const quoteGeneratedEvent: CreateDomainEventData = {
        eventType: "QUOTE_GENERATED",
        entityType: "BOOKING",
        entityId: booking.id,
        actorType: "SYSTEM",
        actorId: "PRICING_ENGINE",
        payload: {
          estimatedTotal: pricing.estimatedTotal.toFixed(2),
          includedKm: pricing.totalIncludedKm,
          includedDays: pricing.includedDays,
        },
      };

      await domainEventRepository.append(quoteGeneratedEvent, tx);

      return {
        booking,
        quote,
      };
    });
  }

  /**
   * Get booking by ID.
   */
  async getBookingById(id: string): Promise<BookingDomain> {
    return bookingRepository.findById(id);
  }

  /**
   * Get booking by reference.
   */
  async getBookingByRef(bookingRef: string): Promise<BookingDomain> {
    return bookingRepository.findByRef(bookingRef);
  }

  /**
   * List bookings with filters.
   */
  async listBookings(
    filters: {
      customerId?: string;
      supplierId?: string;
      status?: BookingStatus;
      fromDate?: Date;
      toDate?: Date;
    },
    offset: number = 0,
    limit: number = 20
  ): Promise<{
    bookings: BookingDomain[];
    total: number;
    offset: number;
    limit: number;
  }> {
    const [bookings, total] = await Promise.all([
      bookingRepository.list(filters, offset, limit),
      bookingRepository.count(filters),
    ]);

    return {
      bookings,
      total,
      offset,
      limit,
    };
  }

  /**
   * Validate trip dates.
   */
  private validateTripDates(startDate: Date, endDate?: Date): void {
    const now = new Date();
    if (startDate < now) {
      throw new ValidationError("Trip start date cannot be in the past");
    }

    if (endDate && endDate < startDate) {
      throw new ValidationError("Trip end date must be after start date");
    }
  }

  /**
   * Generate unique booking reference.
   * MVP: timestamp + random; real implementation would check DB uniqueness.
   */
  private async generateBookingRef(): Promise<string> {
    const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
    let ref = "TM-";
    for (let i = 0; i < 8; i++) {
      ref += chars.charAt(Math.floor(Math.random() * chars.length));
    }

    // Check for collision (in production, use retry loop)
    const existing = await bookingRepository.findByIdOrNull(ref);
    if (existing) {
      throw new ConflictError("Booking reference collision (rare)", { ref });
    }

    return ref;
  }
}

/**
 * Singleton instance for use in API handlers.
 */
export const bookingService = new BookingService();
