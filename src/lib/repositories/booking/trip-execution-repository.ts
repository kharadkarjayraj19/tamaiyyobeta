/**
 * Tamaiyyo — TripExecution repository.
 *
 * Architecture:
 * - Prisma queries for trip execution records
 * - One-to-one relationship with Booking
 * - Stores actual trip details (km, odometer, tolls, parking)
 */

import type { TripExecution } from "@prisma/client";
import prisma from "@/lib/db/prisma";
import type { PrismaTransactionClient } from "@/lib/db/types";
import { NotFoundError } from "@/lib/errors";

/**
 * Toll/Parking line item.
 */
export interface LineItem {
  description: string;
  amount: string;
  receiptUrl?: string;
}

/**
 * Domain type for TripExecution (ORM-agnostic).
 */
export interface TripExecutionDomain {
  id: string;
  bookingId: string;
  startedAt: Date | null;
  completedAt: Date | null;
  actualKm: number | null;
  actualStartOdometer: number | null;
  actualEndOdometer: number | null;
  tollLines: LineItem[];
  parkingLines: LineItem[];
  extensionsUsed: Record<string, unknown> | null;
  createdAt: Date;
  updatedAt: Date;
}

/**
 * DTO for creating trip execution record.
 */
export interface CreateTripExecutionData {
  bookingId: string;
  actualKm: number;
  actualStartOdometer?: number;
  actualEndOdometer?: number;
  tollLines: LineItem[];
  parkingLines: LineItem[];
}

/**
 * TripExecutionRepository — Prisma data access for trip execution.
 */
export class TripExecutionRepository {
  /**
   * Find trip execution by booking ID.
   */
  async findByBookingId(
    bookingId: string,
    tx?: PrismaTransactionClient
  ): Promise<TripExecutionDomain | null> {
    const client = tx ?? prisma;

    const execution = await client.tripExecution.findUnique({
      where: { bookingId },
    });

    return execution ? this.toDomain(execution) : null;
  }

  /**
   * Find trip execution by booking ID (throws if not found).
   */
  async findByBookingIdOrThrow(
    bookingId: string,
    tx?: PrismaTransactionClient
  ): Promise<TripExecutionDomain> {
    const execution = await this.findByBookingId(bookingId, tx);

    if (!execution) {
      throw new NotFoundError("TripExecution", bookingId);
    }

    return execution;
  }

  /**
   * Create trip execution record.
   */
  async create(
    data: CreateTripExecutionData,
    tx?: PrismaTransactionClient
  ): Promise<TripExecutionDomain> {
    const client = tx ?? prisma;

    const execution = await client.tripExecution.create({
      data: {
        bookingId: data.bookingId,
        completedAt: new Date(),
        actualKm: data.actualKm,
        actualStartOdometer: data.actualStartOdometer,
        actualEndOdometer: data.actualEndOdometer,
        tollLines: data.tollLines as any,
        parkingLines: data.parkingLines as any,
      },
    });

    return this.toDomain(execution);
  }

  /**
   * Update actual km (used for customer confirmation auto-resolution).
   */
  async updateActualKm(
    bookingId: string,
    actualKm: number,
    tx?: PrismaTransactionClient
  ): Promise<TripExecutionDomain> {
    const client = tx ?? prisma;

    const execution = await client.tripExecution.update({
      where: { bookingId },
      data: { actualKm },
    });

    return this.toDomain(execution);
  }

  /**
   * Map Prisma model to domain type.
   */
  private toDomain(execution: TripExecution): TripExecutionDomain {
    return {
      id: execution.id,
      bookingId: execution.bookingId,
      startedAt: execution.startedAt,
      completedAt: execution.completedAt,
      actualKm: execution.actualKm,
      actualStartOdometer: execution.actualStartOdometer,
      actualEndOdometer: execution.actualEndOdometer,
      tollLines: (execution.tollLines as any) as LineItem[],
      parkingLines: (execution.parkingLines as any) as LineItem[],
      extensionsUsed: execution.extensionsUsed as Record<string, unknown> | null,
      createdAt: execution.createdAt,
      updatedAt: execution.updatedAt,
    };
  }
}

/**
 * Singleton instance for use in services.
 */
export const tripExecutionRepository = new TripExecutionRepository();
