/**
 * Tamayo — PayoutBatch repository.
 *
 * Architecture:
 * - Prisma queries for payout batches
 * - Groups supplier earnings into settlement cycles
 * - Tracks batch lifecycle and payout status
 */

import type { PayoutBatch, PayoutBatchStatus } from "@prisma/client";
import { Prisma } from "@prisma/client";
import prisma from "@/lib/db/prisma";
import type { PrismaTransactionClient } from "@/lib/db/types";
import { NotFoundError } from "@/lib/errors";

/**
 * Domain type for PayoutBatch (ORM-agnostic).
 */
export interface PayoutBatchDomain {
  id: string;
  batchRef: string;
  supplierId: string | null;
  cycleStartDate: Date;
  cycleEndDate: Date;
  totalEarnings: Prisma.Decimal;
  totalDeductions: Prisma.Decimal | null;
  netPayout: Prisma.Decimal;
  status: PayoutBatchStatus;
  paidAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
}

/**
 * DTO for creating payout batch.
 */
export interface CreatePayoutBatchData {
  batchRef: string;
  supplierId?: string;
  cycleStartDate: Date;
  cycleEndDate: Date;
  totalEarnings: Prisma.Decimal;
  totalDeductions?: Prisma.Decimal;
  netPayout: Prisma.Decimal;
}

/**
 * PayoutBatchRepository — Prisma data access for payout batches.
 */
export class PayoutBatchRepository {
  /**
   * Find batch by ID.
   */
  async findById(
    id: string,
    tx?: PrismaTransactionClient
  ): Promise<PayoutBatchDomain> {
    const client = tx ?? prisma;

    const batch = await client.payoutBatch.findUnique({
      where: { id },
    });

    if (!batch) {
      throw new NotFoundError("PayoutBatch", id);
    }

    return this.toDomain(batch);
  }

  /**
   * Find batch by ID (returns null if not found).
   */
  async findByIdOrNull(
    id: string,
    tx?: PrismaTransactionClient
  ): Promise<PayoutBatchDomain | null> {
    const client = tx ?? prisma;

    const batch = await client.payoutBatch.findUnique({
      where: { id },
    });

    return batch ? this.toDomain(batch) : null;
  }

  /**
   * Find batch by reference.
   */
  async findByBatchRef(
    batchRef: string,
    tx?: PrismaTransactionClient
  ): Promise<PayoutBatchDomain | null> {
    const client = tx ?? prisma;

    const batch = await client.payoutBatch.findUnique({
      where: { batchRef },
    });

    return batch ? this.toDomain(batch) : null;
  }

  /**
   * List payout batches with filters.
   */
  async list(
    filters?: {
      supplierId?: string;
      status?: PayoutBatchStatus;
      fromDate?: Date;
      toDate?: Date;
    },
    offset: number = 0,
    limit: number = 20,
    tx?: PrismaTransactionClient
  ): Promise<PayoutBatchDomain[]> {
    const client = tx ?? prisma;

    const where: any = {};

    if (filters?.supplierId) {
      where.supplierId = filters.supplierId;
    }

    if (filters?.status) {
      where.status = filters.status;
    }

    if (filters?.fromDate || filters?.toDate) {
      where.createdAt = {};
      if (filters.fromDate) where.createdAt.gte = filters.fromDate;
      if (filters.toDate) where.createdAt.lte = filters.toDate;
    }

    const batches = await client.payoutBatch.findMany({
      where,
      orderBy: { createdAt: "desc" },
      skip: offset,
      take: limit,
    });

    return batches.map((b: PayoutBatch) => this.toDomain(b));
  }

  /**
   * Count batches with filters.
   */
  async count(
    filters?: {
      supplierId?: string;
      status?: PayoutBatchStatus;
      fromDate?: Date;
      toDate?: Date;
    },
    tx?: PrismaTransactionClient
  ): Promise<number> {
    const client = tx ?? prisma;

    const where: any = {};

    if (filters?.supplierId) {
      where.supplierId = filters.supplierId;
    }

    if (filters?.status) {
      where.status = filters.status;
    }

    if (filters?.fromDate || filters?.toDate) {
      where.createdAt = {};
      if (filters.fromDate) where.createdAt.gte = filters.fromDate;
      if (filters.toDate) where.createdAt.lte = filters.toDate;
    }

    return client.payoutBatch.count({ where });
  }

  /**
   * Create payout batch.
   */
  async create(
    data: CreatePayoutBatchData,
    tx?: PrismaTransactionClient
  ): Promise<PayoutBatchDomain> {
    const client = tx ?? prisma;

    const batch = await client.payoutBatch.create({
      data: {
        batchRef: data.batchRef,
        supplierId: data.supplierId,
        cycleStartDate: data.cycleStartDate,
        cycleEndDate: data.cycleEndDate,
        totalEarnings: data.totalEarnings,
        totalDeductions: data.totalDeductions,
        netPayout: data.netPayout,
        status: "PENDING",
      },
    });

    return this.toDomain(batch);
  }

  /**
   * Update batch status.
   */
  async updateStatus(
    id: string,
    status: PayoutBatchStatus,
    paidAt?: Date,
    tx?: PrismaTransactionClient
  ): Promise<PayoutBatchDomain> {
    const client = tx ?? prisma;

    const batch = await client.payoutBatch.update({
      where: { id },
      data: {
        status,
        paidAt: paidAt || undefined,
      },
    });

    return this.toDomain(batch);
  }

  /**
   * Map Prisma model to domain type.
   */
  private toDomain(batch: PayoutBatch): PayoutBatchDomain {
    return {
      id: batch.id,
      batchRef: batch.batchRef,
      supplierId: batch.supplierId,
      cycleStartDate: batch.cycleStartDate,
      cycleEndDate: batch.cycleEndDate,
      totalEarnings: batch.totalEarnings,
      totalDeductions: batch.totalDeductions,
      netPayout: batch.netPayout,
      status: batch.status,
      paidAt: batch.paidAt,
      createdAt: batch.createdAt,
      updatedAt: batch.updatedAt,
    };
  }
}

/**
 * Singleton instance for use in services.
 */
export const payoutBatchRepository = new PayoutBatchRepository();
