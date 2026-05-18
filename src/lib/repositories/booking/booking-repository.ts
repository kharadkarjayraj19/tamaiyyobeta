/**
 * Tamaiyyo — Booking repository (example implementation).
 *
 * Architecture:
 * - Query-only data access for bookings
 * - Maps Prisma models to domain types
 * - Accepts optional transaction client
 * - No workflow logic — services orchestrate create/update flows
 *
 * Pattern demonstrates:
 * - findById with includes (relations)
 * - List queries with filters
 * - Status filtering (no direct soft-delete on Booking)
 */

import type {
  Booking,
  BookingStatus,
  ProductType,
  ActorType,
} from "@prisma/client";
import prisma from "@/lib/db/prisma";
import type { PrismaTransactionClient } from "@/lib/db/types";
import { NotFoundError } from "@/lib/errors";

/**
 * Domain type for Booking (ORM-agnostic).
 */
export interface BookingDomain {
  id: string;
  bookingRef: string;
  customerId: string;
  supplierId: string | null;
  status: BookingStatus;
  productType: ProductType;
  tripStartDate: Date;
  tripEndDate: Date | null;
  estimatedKm: number | null;
  sourceCity: string;
  destinationCity: string | null;
  cancelledBy: ActorType | null;
  cancelledAt: Date | null;
  cancelledReason: string | null;
  createdAt: Date;
  updatedAt: Date;
}

/**
 * DTO for creating a booking.
 */
export interface CreateBookingData {
  bookingRef: string;
  customerId: string;
  productType: ProductType;
  tripStartDate: Date;
  tripEndDate?: Date;
  estimatedKm?: number;
  sourceCity: string;
  destinationCity?: string;
}

/**
 * DTO for updating booking fields.
 * Note: Status transitions should be explicit methods, not generic update.
 */
export interface UpdateBookingData {
  supplierId?: string;
  status?: BookingStatus;
  tripEndDate?: Date;
  estimatedKm?: number;
}

/**
 * List query filters.
 */
export interface BookingListFilters {
  customerId?: string;
  supplierId?: string;
  status?: BookingStatus;
  fromDate?: Date;
  toDate?: Date;
}

/**
 * BookingRepository — Prisma data access for bookings.
 */
export class BookingRepository {
  /**
   * Find booking by ID.
   * @throws NotFoundError if booking doesn't exist
   */
  async findById(
    id: string,
    tx?: PrismaTransactionClient
  ): Promise<BookingDomain> {
    const client = tx ?? prisma;
    const booking = await client.booking.findUnique({
      where: { id },
    });

    if (!booking) {
      throw new NotFoundError("Booking", id);
    }

    return this.toDomain(booking);
  }

  /**
   * Find booking by booking reference (human-readable).
   * @throws NotFoundError if booking doesn't exist
   */
  async findByRef(
    bookingRef: string,
    tx?: PrismaTransactionClient
  ): Promise<BookingDomain> {
    const client = tx ?? prisma;
    const booking = await client.booking.findUnique({
      where: { bookingRef },
    });

    if (!booking) {
      throw new NotFoundError("Booking", bookingRef);
    }

    return this.toDomain(booking);
  }

  /**
   * Find booking by ID or null if not found.
   */
  async findByIdOrNull(
    id: string,
    tx?: PrismaTransactionClient
  ): Promise<BookingDomain | null> {
    const client = tx ?? prisma;
    const booking = await client.booking.findUnique({
      where: { id },
    });

    return booking ? this.toDomain(booking) : null;
  }

  /**
   * List bookings with filters and pagination.
   */
  async list(
    filters: BookingListFilters,
    offset: number = 0,
    limit: number = 20,
    tx?: PrismaTransactionClient
  ): Promise<BookingDomain[]> {
    const client = tx ?? prisma;

    // Build where clause dynamically
    const where: any = {};

    if (filters.customerId) {
      where.customerId = filters.customerId;
    }

    if (filters.supplierId) {
      where.supplierId = filters.supplierId;
    }

    if (filters.status) {
      where.status = filters.status;
    }

    if (filters.fromDate || filters.toDate) {
      where.tripStartDate = {};
      if (filters.fromDate) {
        where.tripStartDate.gte = filters.fromDate;
      }
      if (filters.toDate) {
        where.tripStartDate.lte = filters.toDate;
      }
    }

    const bookings = await client.booking.findMany({
      where,
      orderBy: { tripStartDate: "desc" },
      skip: offset,
      take: limit,
    });

    return bookings.map((b: Booking) => this.toDomain(b));
  }

  /**
   * Count bookings matching filters.
   */
  async count(
    filters: BookingListFilters,
    tx?: PrismaTransactionClient
  ): Promise<number> {
    const client = tx ?? prisma;

    // Build where clause dynamically
    const where: any = {};

    if (filters.customerId) {
      where.customerId = filters.customerId;
    }

    if (filters.supplierId) {
      where.supplierId = filters.supplierId;
    }

    if (filters.status) {
      where.status = filters.status;
    }

    if (filters.fromDate || filters.toDate) {
      where.tripStartDate = {};
      if (filters.fromDate) {
        where.tripStartDate.gte = filters.fromDate;
      }
      if (filters.toDate) {
        where.tripStartDate.lte = filters.toDate;
      }
    }

    return client.booking.count({ where });
  }

  /**
   * Create a new booking.
   * Note: Services should handle ref generation, snapshot creation, event logging.
   */
  async create(
    data: CreateBookingData,
    tx?: PrismaTransactionClient
  ): Promise<BookingDomain> {
    const client = tx ?? prisma;
    const booking = await client.booking.create({
      data: {
        bookingRef: data.bookingRef,
        customerId: data.customerId,
        productType: data.productType,
        tripStartDate: data.tripStartDate,
        tripEndDate: data.tripEndDate,
        estimatedKm: data.estimatedKm,
        sourceCity: data.sourceCity,
        destinationCity: data.destinationCity,
        status: "REQUESTED",
      },
    });

    return this.toDomain(booking);
  }

  /**
   * Update booking fields.
   * Note: Prefer explicit transition methods in services over generic update.
   */
  async update(
    id: string,
    data: UpdateBookingData,
    tx?: PrismaTransactionClient
  ): Promise<BookingDomain> {
    const client = tx ?? prisma;

    try {
      const booking = await client.booking.update({
        where: { id },
        data,
      });

      return this.toDomain(booking);
    } catch (error) {
      if (
        error &&
        typeof error === "object" &&
        "code" in error &&
        error.code === "P2025"
      ) {
        throw new NotFoundError("Booking", id);
      }
      throw error;
    }
  }

  /**
   * Map Prisma model to domain type.
   */
  private toDomain(booking: Booking): BookingDomain {
    return {
      id: booking.id,
      bookingRef: booking.bookingRef,
      customerId: booking.customerId,
      supplierId: booking.supplierId,
      status: booking.status,
      productType: booking.productType,
      tripStartDate: booking.tripStartDate,
      tripEndDate: booking.tripEndDate,
      estimatedKm: booking.estimatedKm,
      sourceCity: booking.sourceCity,
      destinationCity: booking.destinationCity,
      cancelledBy: booking.cancelledBy,
      cancelledAt: booking.cancelledAt,
      cancelledReason: booking.cancelledReason,
      createdAt: booking.createdAt,
      updatedAt: booking.updatedAt,
    };
  }
}

/**
 * Singleton instance for use in services.
 */
export const bookingRepository = new BookingRepository();
