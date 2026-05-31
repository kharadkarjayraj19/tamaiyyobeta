/**
 * Tamaiyyo — SettlementService.
 *
 * Architecture:
 * - Orchestrates supplier settlement workflows
 * - Owns business rules for payout eligibility
 * - Manages payout batch creation
 * - Manages transactions
 * - Never exposes Prisma directly
 * 
 * MVP PLACEHOLDER: No automatic bank payout integration yet.
 * Admin manually marks batches as COMPLETED after bank transfer.
 * Production will integrate bank payout APIs.
 * 
 * SETTLEMENT LIFECYCLE:
 * - EARNED: Final bill generated, supplier earning created
 * - ELIGIBLE: Cleared for payout (no disputes/holds)
 * - BATCHED: Included in a payout batch
 * - PAID: Batch executed, funds transferred
 * - HELD: Blocked with reason code (dispute, fraud, KYC)
 */

import type { SupplierEarningStatus, PayoutBatchStatus } from "@prisma/client";
import { Prisma } from "@prisma/client";
import {
  supplierEarningRepository,
  type SupplierEarningDomain,
} from "@/lib/repositories/billing/supplier-earning-repository";
import {
  payoutBatchRepository,
  type PayoutBatchDomain,
} from "@/lib/repositories/billing/payout-batch-repository";
import { bookingRepository } from "@/lib/repositories/booking/booking-repository";
import { domainEventRepository } from "@/lib/repositories/event/domain-event-repository";
import prisma from "@/lib/db/prisma";
import { withTransaction } from "@/lib/db/transactions";
import {
  ValidationError,
  NotFoundError,
  ConflictError,
} from "@/lib/errors";

/**
 * DTO for marking earnings as eligible.
 */
export interface MarkEarningsEligibleRequest {
  bookingIds: string[];
  actorId: string;
}

/**
 * DTO for creating payout batch.
 */
export interface CreatePayoutBatchRequest {
  supplierId?: string;
  cycleStartDate: Date;
  cycleEndDate: Date;
  bookingIds: string[];
  actorId: string;
}

/**
 * SettlementService — business logic for settlement operations.
 */
export class SettlementService {
  /**
   * Mark supplier earnings as eligible for payout.
   * Transitions: EARNED → ELIGIBLE
   * 
   * Business rules:
   * - Booking must be CLOSED
   * - Final bill must exist
   * - Earning must be in EARNED status
   */
  async markEarningsEligible(
    request: MarkEarningsEligibleRequest
  ): Promise<{ updated: number; earnings: SupplierEarningDomain[] }> {
    return withTransaction(prisma, async (tx) => {
      const updatedEarnings: SupplierEarningDomain[] = [];

      for (const bookingId of request.bookingIds) {
        // 1. Fetch booking
        const booking = await bookingRepository.findById(bookingId, tx);

        // 2. Validate booking status
        if (booking.status !== "CLOSED") {
          throw new ValidationError(
            `Booking ${bookingId} is not closed. Cannot mark earning as eligible.`
          );
        }

        // 3. Fetch earning
        const earning = await supplierEarningRepository.findByBookingId(
          bookingId,
          tx
        );

        if (!earning) {
          throw new NotFoundError("SupplierEarning", `for booking ${bookingId}`);
        }

        // 4. Validate earning status
        if (earning.status !== "EARNED") {
          throw new ValidationError(
            `Earning for booking ${bookingId} is in ${earning.status} status. Cannot mark as eligible.`
          );
        }

        // 5. Update status to ELIGIBLE
        const updated = await supplierEarningRepository.updateStatus(
          bookingId,
          "ELIGIBLE",
          tx
        );

        updatedEarnings.push(updated);

        // 6. Record domain event
        await domainEventRepository.append(
          {
            entityType: "Booking",
            entityId: bookingId,
            eventType: "SETTLEMENT_ELIGIBLE",
            actorType: "ADMIN",
            actorId: request.actorId,
            payload: {
              earningId: earning.id,
              supplierId: earning.supplierId,
              netAmount: earning.netAmount.toFixed(2),
            },
          },
          tx
        );
      }

      return {
        updated: updatedEarnings.length,
        earnings: updatedEarnings,
      };
    });
  }

  /**
   * List eligible earnings (not yet batched).
   */
  async listEligibleEarnings(
    supplierId?: string,
    limit: number = 100
  ): Promise<SupplierEarningDomain[]> {
    // PAGINATION LIMIT: Enforce server-side maximum
    const enforcedLimit = Math.min(limit, 100);

    return supplierEarningRepository.findEligible(supplierId, enforcedLimit);
  }

  /**
   * Get supplier earnings history.
   */
  async getSupplierEarnings(
    supplierId: string,
    filters?: {
      status?: SupplierEarningStatus;
      payoutBatchId?: string;
    },
    offset: number = 0,
    limit: number = 20
  ): Promise<{
    earnings: SupplierEarningDomain[];
    offset: number;
    limit: number;
  }> {
    // PAGINATION LIMIT: Enforce server-side maximum
    const enforcedLimit = Math.min(limit, 100);

    const earnings = await supplierEarningRepository.findBySupplierId(
      supplierId,
      filters,
      offset,
      enforcedLimit
    );

    return {
      earnings,
      offset,
      limit: enforcedLimit,
    };
  }

  /**
   * Create payout batch (group eligible earnings into batch).
   * Transitions: ELIGIBLE → BATCHED
   * 
   * Business rules:
   * - All earnings must be in ELIGIBLE status
   * - All earnings must be for the same supplier if supplierId provided
   * - Earnings must not already be in a batch
   */
  async createPayoutBatch(
    request: CreatePayoutBatchRequest
  ): Promise<{
    batch: PayoutBatchDomain;
    earningsCount: number;
  }> {
    return withTransaction(prisma, async (tx) => {
      // 1. Validate date range
      if (request.cycleEndDate <= request.cycleStartDate) {
        throw new ValidationError(
          "cycleEndDate must be after cycleStartDate"
        );
      }

      // 2. Fetch earnings
      const earnings: SupplierEarningDomain[] = [];
      let totalGross = new Prisma.Decimal(0);
      let totalCommission = new Prisma.Decimal(0);
      let totalNet = new Prisma.Decimal(0);
      let batchSupplierId: string | undefined = request.supplierId;

      for (const bookingId of request.bookingIds) {
        const earning = await supplierEarningRepository.findByBookingId(
          bookingId,
          tx
        );

        if (!earning) {
          throw new NotFoundError(
            "SupplierEarning",
            `for booking ${bookingId}`
          );
        }

        // Validate status
        if (earning.status !== "ELIGIBLE") {
          throw new ValidationError(
            `Earning for booking ${bookingId} is not eligible (status: ${earning.status})`
          );
        }

        // Validate not already batched
        if (earning.payoutBatchId) {
          throw new ValidationError(
            `Earning for booking ${bookingId} is already in batch ${earning.payoutBatchId}`
          );
        }

        // If supplierId not provided, use first earning's supplier
        if (!batchSupplierId) {
          batchSupplierId = earning.supplierId;
        }

        // Validate all earnings for same supplier
        if (earning.supplierId !== batchSupplierId) {
          throw new ValidationError(
            `All earnings in batch must be for the same supplier`
          );
        }

        earnings.push(earning);
        totalGross = totalGross.plus(earning.grossAmount);
        totalCommission = totalCommission.plus(earning.commissionAmount);
        totalNet = totalNet.plus(earning.netAmount);
      }

      if (earnings.length === 0) {
        throw new ValidationError("No eligible earnings found for batch");
      }

      // 3. Generate batch reference
      const batchRef = await this.generateBatchRef();

      // 4. Create payout batch
      const batch = await payoutBatchRepository.create(
        {
          batchRef,
          supplierId: batchSupplierId,
          cycleStartDate: request.cycleStartDate,
          cycleEndDate: request.cycleEndDate,
          totalEarnings: totalGross,
          totalDeductions: totalCommission,
          netPayout: totalNet,
        },
        tx
      );

      // 5. Attach earnings to batch (update status to BATCHED)
      await supplierEarningRepository.updateMany(
        request.bookingIds,
        "BATCHED",
        batch.id,
        tx
      );

      // 6. Record domain event
      await domainEventRepository.append(
        {
          entityType: "PayoutBatch",
          entityId: batch.id,
          eventType: "PAYOUT_BATCH_CREATED",
          actorType: "ADMIN",
          actorId: request.actorId,
          payload: {
            batchRef: batch.batchRef,
            supplierId: batchSupplierId,
            earningsCount: earnings.length,
            netPayoutAmount: totalNet.toFixed(2),
            cycleStartDate: request.cycleStartDate.toISOString(),
            cycleEndDate: request.cycleEndDate.toISOString(),
          },
        },
        tx
      );

      return {
        batch,
        earningsCount: earnings.length,
      };
    });
  }

  /**
   * Get payout batch by ID.
   */
  async getPayoutBatchById(batchId: string): Promise<PayoutBatchDomain> {
    return payoutBatchRepository.findById(batchId);
  }

  /**
   * List payout batches with filters.
   */
  async listPayoutBatches(
    filters?: {
      supplierId?: string;
      status?: PayoutBatchStatus;
      fromDate?: Date;
      toDate?: Date;
    },
    offset: number = 0,
    limit: number = 20
  ): Promise<{
    batches: PayoutBatchDomain[];
    total: number;
    offset: number;
    limit: number;
  }> {
    // PAGINATION LIMIT: Enforce server-side maximum
    const enforcedLimit = Math.min(limit, 100);

    const [batches, total] = await Promise.all([
      payoutBatchRepository.list(filters, offset, enforcedLimit),
      payoutBatchRepository.count(filters),
    ]);

    return {
      batches,
      total,
      offset,
      limit: enforcedLimit,
    };
  }

  /**
   * Generate unique batch reference.
   * 
   * MVP PLACEHOLDER: Simple timestamp-based generation.
   * Production should use more robust collision handling.
   */
  private async generateBatchRef(): Promise<string> {
    const timestamp = Date.now();
    const random = Math.floor(Math.random() * 1000);
    const ref = `PB-${timestamp}-${random}`;

    // Check for collision
    const existing = await payoutBatchRepository.findByBatchRef(ref);
    if (existing) {
      // Retry with different random
      return this.generateBatchRef();
    }

    return ref;
  }
}

/**
 * Singleton instance for use in API handlers.
 */
export const settlementService = new SettlementService();
