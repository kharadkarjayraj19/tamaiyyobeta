/**
 * Tamaiyyo — BookingPricingSnapshot repository.
 *
 * Architecture:
 * - Prisma queries for immutable pricing snapshots
 * - One-to-one relationship with Booking
 * - Preserves pricing configuration at booking time
 */

import type { BookingPricingSnapshot, VehicleCategory, AgeBucket, Prisma } from "@prisma/client";
import prisma from "@/lib/db/prisma";

type Decimal = Prisma.Decimal;
import type { PrismaTransactionClient } from "@/lib/db/types";
import { NotFoundError } from "@/lib/errors";

// Note: findByBookingIdOrThrow is already implemented above as findByBookingId with throw

/**
 * Domain type for BookingPricingSnapshot (ORM-agnostic).
 */
export interface BookingPricingSnapshotDomain {
  id: string;
  bookingId: string;
  category: VehicleCategory;
  ageBucket: AgeBucket;
  includedKmPerDay: number;
  minimumKmPerDay: number;
  includedDays: number;
  totalIncludedKm: number;
  billableKm: number;
  perKmRate: Decimal;
  basePrice: Decimal;
  operationalBundleAmount: Decimal;
  pricingConfigVersionId: string | null;
  snapshotData: Record<string, unknown>;
  createdAt: Date;
}

/**
 * DTO for creating a booking pricing snapshot.
 */
export interface CreateBookingPricingSnapshotData {
  bookingId: string;
  category: VehicleCategory;
  ageBucket: AgeBucket;
  includedKmPerDay: number;
  minimumKmPerDay: number;
  includedDays: number;
  totalIncludedKm: number;
  billableKm: number;
  perKmRate: Decimal;
  basePrice: Decimal;
  operationalBundleAmount: Decimal;
  pricingConfigVersionId?: string;
  snapshotData: Record<string, unknown>;
}

/**
 * BookingPricingSnapshotRepository — Prisma data access for pricing snapshots.
 */
export class BookingPricingSnapshotRepository {
  /**
   * Find snapshot by booking ID.
   * @throws NotFoundError if snapshot doesn't exist
   */
  async findByBookingId(
    bookingId: string,
    tx?: PrismaTransactionClient
  ): Promise<BookingPricingSnapshotDomain> {
    const client = tx ?? prisma;
    const snapshot = await client.bookingPricingSnapshot.findUnique({
      where: { bookingId },
    });

    if (!snapshot) {
      throw new NotFoundError("BookingPricingSnapshot", bookingId);
    }

    return this.toDomain(snapshot);
  }

  /**
   * Find snapshot by booking ID (returns null if not found).
   */
  async findByBookingIdOrNull(
    bookingId: string,
    tx?: PrismaTransactionClient
  ): Promise<BookingPricingSnapshotDomain | null> {
    const client = tx ?? prisma;
    const snapshot = await client.bookingPricingSnapshot.findUnique({
      where: { bookingId },
    });

    return snapshot ? this.toDomain(snapshot) : null;
  }

  /**
   * Create booking pricing snapshot.
   */
  async create(
    data: CreateBookingPricingSnapshotData,
    tx?: PrismaTransactionClient
  ): Promise<BookingPricingSnapshotDomain> {
    const client = tx ?? prisma;

    const snapshot = await client.bookingPricingSnapshot.create({
      data: {
        bookingId: data.bookingId,
        category: data.category,
        ageBucket: data.ageBucket,
        includedKmPerDay: data.includedKmPerDay,
        minimumKmPerDay: data.minimumKmPerDay,
        includedDays: data.includedDays,
        totalIncludedKm: data.totalIncludedKm,
        billableKm: data.billableKm,
        perKmRate: data.perKmRate,
        basePrice: data.basePrice,
        operationalBundleAmount: data.operationalBundleAmount,
        pricingConfigVersionId: data.pricingConfigVersionId,
        snapshotData: data.snapshotData as Prisma.InputJsonValue,
      },
    });

    return this.toDomain(snapshot);
  }

  /**
   * Map Prisma model to domain type.
   */
  private toDomain(
    snapshot: BookingPricingSnapshot
  ): BookingPricingSnapshotDomain {
    return {
      id: snapshot.id,
      bookingId: snapshot.bookingId,
      category: snapshot.category,
      ageBucket: snapshot.ageBucket,
      includedKmPerDay: snapshot.includedKmPerDay,
      minimumKmPerDay: snapshot.minimumKmPerDay,
      includedDays: snapshot.includedDays,
      totalIncludedKm: snapshot.totalIncludedKm,
      billableKm: snapshot.billableKm,
      perKmRate: snapshot.perKmRate,
      basePrice: snapshot.basePrice,
      operationalBundleAmount: snapshot.operationalBundleAmount,
      pricingConfigVersionId: snapshot.pricingConfigVersionId,
      snapshotData: snapshot.snapshotData as Record<string, unknown>,
      createdAt: snapshot.createdAt,
    };
  }
}

/**
 * Singleton instance for use in services.
 */
export const bookingPricingSnapshotRepository = new BookingPricingSnapshotRepository();
