/**
 * Tamaiyyo — BookingItinerary repository.
 *
 * Architecture:
 * - Prisma queries for booking itineraries
 * - One-to-one relationship with Booking
 * - Supports multiple destinations (JSON array)
 */

import type { BookingItinerary } from "@prisma/client";
import prisma from "@/lib/db/prisma";
import type { PrismaTransactionClient } from "@/lib/db/types";
import { NotFoundError } from "@/lib/errors";

/**
 * Domain type for BookingItinerary (ORM-agnostic).
 */
export interface BookingItineraryDomain {
  id: string;
  bookingId: string;
  pickupLocation: string;
  pickupGeo: { lat: number; lng: number } | null;
  destinations: Array<{
    location: string;
    geo?: { lat: number; lng: number };
  }>;
  estimatedDistance: number | null;
  createdAt: Date;
}

/**
 * DTO for creating a booking itinerary.
 */
export interface CreateBookingItineraryData {
  bookingId: string;
  pickupLocation: string;
  pickupGeo?: { lat: number; lng: number };
  destinations: Array<{
    location: string;
    geo?: { lat: number; lng: number };
  }>;
  estimatedDistance?: number;
}

/**
 * BookingItineraryRepository — Prisma data access for booking itineraries.
 */
export class BookingItineraryRepository {
  /**
   * Find itinerary by booking ID.
   * @throws NotFoundError if itinerary doesn't exist
   */
  async findByBookingId(
    bookingId: string,
    tx?: PrismaTransactionClient
  ): Promise<BookingItineraryDomain> {
    const client = tx ?? prisma;
    const itinerary = await client.bookingItinerary.findUnique({
      where: { bookingId },
    });

    if (!itinerary) {
      throw new NotFoundError("BookingItinerary", bookingId);
    }

    return this.toDomain(itinerary);
  }

  /**
   * Find itinerary by booking ID (returns null if not found).
   */
  async findByBookingIdOrNull(
    bookingId: string,
    tx?: PrismaTransactionClient
  ): Promise<BookingItineraryDomain | null> {
    const client = tx ?? prisma;
    const itinerary = await client.bookingItinerary.findUnique({
      where: { bookingId },
    });

    return itinerary ? this.toDomain(itinerary) : null;
  }

  /**
   * Create booking itinerary.
   */
  async create(
    data: CreateBookingItineraryData,
    tx?: PrismaTransactionClient
  ): Promise<BookingItineraryDomain> {
    const client = tx ?? prisma;

    const itinerary = await client.bookingItinerary.create({
      data: {
        bookingId: data.bookingId,
        pickupLocation: data.pickupLocation,
        pickupGeo: data.pickupGeo as any,
        destinations: data.destinations as any,
        estimatedDistance: data.estimatedDistance,
      },
    });

    return this.toDomain(itinerary);
  }

  /**
   * Map Prisma model to domain type.
   */
  private toDomain(
    itinerary: BookingItinerary
  ): BookingItineraryDomain {
    return {
      id: itinerary.id,
      bookingId: itinerary.bookingId,
      pickupLocation: itinerary.pickupLocation,
      pickupGeo: itinerary.pickupGeo as { lat: number; lng: number } | null,
      destinations: itinerary.destinations as Array<{
        location: string;
        geo?: { lat: number; lng: number };
      }>,
      estimatedDistance: itinerary.estimatedDistance,
      createdAt: itinerary.createdAt,
    };
  }
}

/**
 * Singleton instance for use in services.
 */
export const bookingItineraryRepository = new BookingItineraryRepository();
