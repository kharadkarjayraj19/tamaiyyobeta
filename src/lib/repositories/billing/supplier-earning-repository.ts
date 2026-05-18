/**
 * Tamaiyyo — SupplierEarning repository.
 *
 * Architecture:
 * - Prisma queries for supplier earnings
 * - One-to-one relationship with Booking and FinalBill
 * - Tracks supplier payout amounts
 */

import type { SupplierEarning, Prisma } from "@prisma/client";
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
