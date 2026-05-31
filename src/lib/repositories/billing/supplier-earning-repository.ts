/**
 * Tamaiyyo — SupplierEarning repository.
 *
 * Architecture:
 * - Prisma queries for supplier earnings
 * - One-to-one relationship with Booking and FinalBill
 * - Tracks supplier payout amounts
 * - Supports settlement lifecycle (EARNED → ELIGIBLE → BATCHED → PAID/HELD)
 */

import type { SupplierEarning, SupplierEarningStatus, Prisma } from "@prisma/client";
import prisma from "@/lib/db/prisma";
import type { PrismaTransactionClient } from "@/lib/db/types";

/**
 * Domain type for SupplierEarning (ORM-agnostic).
 */
export interface SupplierEarningDomain {
  id: string;
  bookingId: string;
  supplierId: string;
  finalBillId: string;
  grossAmount: Prisma.Decimal;
  commissionAmount: Prisma.Decimal;
  netAmount: Prisma.Decimal;
  status: string;
  payoutBatchId: string | null;
  createdAt: Date;
  updatedAt: Date;
}

/**
 * DTO for creating supplier earning record.
 */
export interface CreateSupplierEarningData {
  bookingId: string;
  supplierId: string;
  finalBillId: string;
  grossAmount: Prisma.Decimal;
  commissionAmount: Prisma.Decimal;
  netAmount: Prisma.Decimal;
}

/**
 * SupplierEarningRepository — Prisma data access for supplier earnings.
 */
export class SupplierEarningRepository {
  /**
   * Find earning by booking ID.
   */
  async findByBookingId(
    bookingId: string,
    tx?: PrismaTransactionClient
  ): Promise<SupplierEarningDomain | null> {
    const client = tx ?? prisma;

    const earning = await client.supplierEarning.findUnique({
      where: { bookingId },
    });

    return earning ? this.toDomain(earning) : null;
  }

  /**
   * Find earning by supplier and status.
   */
  async findBySupplierId(
    supplierId: string,
    filters?: {
      status?: SupplierEarningStatus;
      payoutBatchId?: string;
    },
    offset: number = 0,
    limit: number = 20,
    tx?: PrismaTransactionClient
  ): Promise<SupplierEarningDomain[]> {
    const client = tx ?? prisma;

    const where: any = { supplierId };

    if (filters?.status) {
      where.status = filters.status;
    }

    if (filters?.payoutBatchId) {
      where.payoutBatchId = filters.payoutBatchId;
    }

    const earnings = await client.supplierEarning.findMany({
      where,
      orderBy: { createdAt: "desc" },
      skip: offset,
      take: limit,
    });

    return earnings.map((e: SupplierEarning) => this.toDomain(e));
  }

  /**
   * Find eligible earnings (status = ELIGIBLE, not yet batched).
   */
  async findEligible(
    supplierId?: string,
    limit: number = 100,
    tx?: PrismaTransactionClient
  ): Promise<SupplierEarningDomain[]> {
    const client = tx ?? prisma;

    const where: any = {
      status: "ELIGIBLE",
      payoutBatchId: null,
    };

    if (supplierId) {
      where.supplierId = supplierId;
    }

    const earnings = await client.supplierEarning.findMany({
      where,
      orderBy: { createdAt: "asc" },
      take: limit,
    });

    return earnings.map((e: SupplierEarning) => this.toDomain(e));
  }

  /**
   * Create supplier earning record.
   */
  async create(
    data: CreateSupplierEarningData,
    tx?: PrismaTransactionClient
  ): Promise<SupplierEarningDomain> {
    const client = tx ?? prisma;

    const earning = await client.supplierEarning.create({
      data: {
        bookingId: data.bookingId,
        supplierId: data.supplierId,
        finalBillId: data.finalBillId,
        grossAmount: data.grossAmount,
        commissionAmount: data.commissionAmount,
        netAmount: data.netAmount,
        status: "EARNED",
      },
    });

    return this.toDomain(earning);
  }

  /**
   * Update earning status.
   */
  async updateStatus(
    bookingId: string,
    status: SupplierEarningStatus,
    tx?: PrismaTransactionClient
  ): Promise<SupplierEarningDomain> {
    const client = tx ?? prisma;

    const earning = await client.supplierEarning.update({
      where: { bookingId },
      data: { status },
    });

    return this.toDomain(earning);
  }

  /**
   * Attach earning to payout batch.
   */
  async attachToBatch(
    bookingId: string,
    payoutBatchId: string,
    status: SupplierEarningStatus,
    tx?: PrismaTransactionClient
  ): Promise<SupplierEarningDomain> {
    const client = tx ?? prisma;

    const earning = await client.supplierEarning.update({
      where: { bookingId },
      data: {
        payoutBatchId,
        status,
      },
    });

    return this.toDomain(earning);
  }

  /**
   * Update multiple earnings to a status (for batch operations).
   */
  async updateMany(
    bookingIds: string[],
    status: SupplierEarningStatus,
    payoutBatchId?: string,
    tx?: PrismaTransactionClient
  ): Promise<number> {
    const client = tx ?? prisma;

    const result = await client.supplierEarning.updateMany({
      where: {
        bookingId: { in: bookingIds },
      },
      data: {
        status,
        payoutBatchId: payoutBatchId || undefined,
      },
    });

    return result.count;
  }

  /**
   * Map Prisma model to domain type.
   */
  private toDomain(earning: SupplierEarning): SupplierEarningDomain {
    return {
      id: earning.id,
      bookingId: earning.bookingId,
      supplierId: earning.supplierId,
      finalBillId: earning.finalBillId,
      grossAmount: earning.grossAmount,
      commissionAmount: earning.commissionAmount,
      netAmount: earning.netAmount,
      status: earning.status,
      payoutBatchId: earning.payoutBatchId,
      createdAt: earning.createdAt,
      updatedAt: earning.updatedAt,
    };
  }
}

/**
 * Singleton instance for use in services.
 */
export const supplierEarningRepository = new SupplierEarningRepository();
