/**
 * Tamayo — CommissionSnapshot repository.
 *
 * Architecture:
 * - Prisma queries for commission snapshots
 * - One-to-one relationship with FinalBill
 * - Immutable commission calculation snapshots
 */

import type { CommissionSnapshot, Prisma } from "@prisma/client";
import prisma from "@/lib/db/prisma";
import type { PrismaTransactionClient } from "@/lib/db/types";

/**
 * Domain type for CommissionSnapshot (ORM-agnostic).
 */
export interface CommissionSnapshotDomain {
  id: string;
  finalBillId: string;
  ruleVersionId: string | null;
  perKmRate: Prisma.Decimal | null;
  platformFeeFlat: Prisma.Decimal | null;
  calculatedCommission: Prisma.Decimal;
  snapshotData: Record<string, unknown>;
  createdAt: Date;
}

/**
 * DTO for creating commission snapshot.
 */
export interface CreateCommissionSnapshotData {
  finalBillId: string;
  ruleVersionId?: string;
  perKmRate?: Prisma.Decimal;
  platformFeeFlat?: Prisma.Decimal;
  calculatedCommission: Prisma.Decimal;
  snapshotData: Record<string, unknown>;
}

/**
 * CommissionSnapshotRepository — Prisma data access for commission snapshots.
 */
export class CommissionSnapshotRepository {
  /**
   * Find snapshot by final bill ID.
   */
  async findByFinalBillId(
    finalBillId: string,
    tx?: PrismaTransactionClient
  ): Promise<CommissionSnapshotDomain | null> {
    const client = tx ?? prisma;

    const snapshot = await client.commissionSnapshot.findUnique({
      where: { finalBillId },
    });

    return snapshot ? this.toDomain(snapshot) : null;
  }

  /**
   * Create commission snapshot.
   */
  async create(
    data: CreateCommissionSnapshotData,
    tx?: PrismaTransactionClient
  ): Promise<CommissionSnapshotDomain> {
    const client = tx ?? prisma;

    const snapshot = await client.commissionSnapshot.create({
      data: {
        finalBillId: data.finalBillId,
        ruleVersionId: data.ruleVersionId,
        perKmRate: data.perKmRate,
        platformFeeFlat: data.platformFeeFlat,
        calculatedCommission: data.calculatedCommission,
        snapshotData: data.snapshotData as any,
      },
    });

    return this.toDomain(snapshot);
  }

  /**
   * Map Prisma model to domain type.
   */
  private toDomain(snapshot: CommissionSnapshot): CommissionSnapshotDomain {
    return {
      id: snapshot.id,
      finalBillId: snapshot.finalBillId,
      ruleVersionId: snapshot.ruleVersionId,
      perKmRate: snapshot.perKmRate,
      platformFeeFlat: snapshot.platformFeeFlat,
      calculatedCommission: snapshot.calculatedCommission,
      snapshotData: snapshot.snapshotData as Record<string, unknown>,
      createdAt: snapshot.createdAt,
    };
  }
}

/**
 * Singleton instance for use in services.
 */
export const commissionSnapshotRepository = new CommissionSnapshotRepository();
