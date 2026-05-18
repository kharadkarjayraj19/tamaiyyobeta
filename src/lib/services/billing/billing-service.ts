/**
 * Tamaiyyo — Billing service.
 *
 * Architecture:
 * - Orchestrates trip completion, final billing, and settlement
 * - Owns transactional integrity (execution + bill + earnings + commission + events)
 * - Handles customer confirmation workflows
 * - Preserves immutable financial snapshots
 */

import { Prisma } from "@prisma/client";
import prisma from "@/lib/db/prisma";
import { withTransaction } from "@/lib/db/transactions";
import { ValidationError, NotFoundError, ConflictError, ForbiddenError } from "@/lib/errors";
import { bookingRepository } from "@/lib/repositories/booking/booking-repository";
import { tripExecutionRepository } from "@/lib/repositories/booking/trip-execution-repository";
import { finalBillRepository } from "@/lib/repositories/billing/final-bill-repository";
import { supplierEarningRepository } from "@/lib/repositories/billing/supplier-earning-repository";
import { commissionSnapshotRepository } from "@/lib/repositories/billing/commission-snapshot-repository";
import { quoteRepository } from "@/lib/repositories/booking/quote-repository";
import { bookingPricingSnapshotRepository } from "@/lib/repositories/booking/booking-pricing-snapshot-repository";
import { domainEventRepository } from "@/lib/repositories/event/domain-event-repository";
import type { LineItem } from "@/lib/repositories/booking/trip-execution-repository";
import type { BillLineItem } from "@/lib/repositories/billing/final-bill-repository";

/**
 * MVP PLACEHOLDER: Hardcoded commission configuration.
 * 
 * PRODUCTION TODO: Replace with database-driven commission config that supports:
 * - Category-specific rates
 * - City-specific rates
 * - Supplier-tier-specific rates
 * - Time-based versioning
 * 
 * Current MVP rates:
 * - Platform fee: ₹500 flat per booking
 * - Per-km commission: ₹2/km
 * 
 * Commission calculation: platformFee + (perKmRate × actualKm)
 */
const MVP_COMMISSION_CONFIG = {
  platformFeeFlat: new Prisma.Decimal(500), // ₹500 flat platform fee
  perKmRate: new Prisma.Decimal(2), // ₹2 per km commission
};

/**
 * BillingService — business logic for billing, trip completion, and settlement.
 */
export class BillingService {
  /**
   * Submit trip execution (supplier/driver submits actuals).
   * Transitions: IN_PROGRESS → COMPLETED
   */
  async submitTripExecution(params: {
    bookingId: string;
    actualKm: number;
    actualStartOdometer?: number;
    actualEndOdometer?: number;
    tollLines: LineItem[];
    parkingLines: LineItem[];
    notes?: string;
    actorId: string;
  }) {
    return withTransaction(prisma, async (tx) => {
      // 1. Fetch booking
      const booking = await bookingRepository.findById(params.bookingId, tx);

      // 2. Validate state
      if (booking.status !== "IN_PROGRESS") {
        throw new ValidationError(
          `Cannot submit trip execution for booking in ${booking.status} state`
        );
      }

      // Note: Booking doesn't have soft-delete, so no deletedAt check needed

      // 3. Validate actual km (sanity check)
      if (params.actualKm < 1) {
        throw new ValidationError("Actual km must be at least 1");
      }

      // 3a. LIFECYCLE GUARD: Validate trip has not already been completed
      const existingExecution = await tripExecutionRepository.findByBookingId(
        params.bookingId,
        tx
      );
      if (existingExecution) {
        throw new ConflictError(
          "Trip execution already submitted for this booking. Cannot submit again."
        );
      }

      // 4. Create trip execution record
      await tripExecutionRepository.create(
        {
          bookingId: params.bookingId,
          actualKm: params.actualKm,
          actualStartOdometer: params.actualStartOdometer,
          actualEndOdometer: params.actualEndOdometer,
          tollLines: params.tollLines,
          parkingLines: params.parkingLines,
        },
        tx
      );

      // 5. Update booking status to COMPLETED
      await bookingRepository.updateStatus(
        params.bookingId,
        "COMPLETED",
        tx
      );

      // 6. Record domain event
      await domainEventRepository.append(
        {
          entityType: "Booking",
          entityId: params.bookingId,
          eventType: "TRIP_COMPLETED",
          actorType: "SUPPLIER", // Supplier/driver submits trip execution
          actorId: params.actorId,
          payload: {
            actualKm: params.actualKm,
            notes: params.notes,
          },
        },
        tx
      );

      return {
        bookingId: params.bookingId,
        status: "COMPLETED",
        actualKm: params.actualKm,
      };
    });
  }

  /**
   * Customer confirms km (optional workflow step).
   * Remains in COMPLETED state or transitions to BILLING_IN_PROGRESS depending on policy.
   */
  async customerConfirmKm(params: {
    bookingId: string;
    customerId: string;
    confirmedKm: number;
    notes?: string;
  }) {
    return withTransaction(prisma, async (tx) => {
      // 1. Fetch booking
      const booking = await bookingRepository.findById(params.bookingId, tx);

      // 2. OWNERSHIP VALIDATION: Customer can only confirm own booking
      if (booking.customerId !== params.customerId) {
        throw new ForbiddenError(
          "Customer does not own this booking. Cannot confirm km."
        );
      }

      // 3. Validate state
      if (booking.status !== "COMPLETED") {
        throw new ValidationError(
          `Cannot confirm km for booking in ${booking.status} state`
        );
      }

      // 4. Fetch trip execution
      const execution = await tripExecutionRepository.findByBookingIdOrThrow(
        params.bookingId,
        tx
      );

      // 5. Check for km mismatch
      const supplierKm = execution.actualKm!;
      const kmDiff = Math.abs(supplierKm - params.confirmedKm);
      const mismatchThreshold = 20; // Allow 20km variance for MVP (auto-resolvable)

      if (kmDiff > mismatchThreshold) {
        // Major mismatch: Record event and require manual support resolution
        await domainEventRepository.append(
          {
            entityType: "Booking",
            entityId: params.bookingId,
            eventType: "KM_MISMATCH_DETECTED",
            actorType: "CUSTOMER",
            actorId: params.customerId,
            payload: {
              supplierKm,
              customerKm: params.confirmedKm,
              difference: kmDiff,
              notes: params.notes,
              requiresManualResolution: true,
            },
          },
          tx
        );

        throw new ValidationError(
          `Km mismatch detected (supplier: ${supplierKm}, customer: ${params.confirmedKm}). ` +
          `Difference of ${kmDiff}km exceeds threshold. Manual support resolution required.`
        );
      }

      // 6. Small mismatch: Auto-resolve in favor of customer
      let resolvedKm = params.confirmedKm;
      let autoResolved = false;

      if (kmDiff > 0) {
        // Use customer's confirmed km for billing (favor customer)
        await tripExecutionRepository.updateActualKm(
          params.bookingId,
          params.confirmedKm,
          tx
        );

        autoResolved = true;
      }

      // 7. Record customer confirmation event
      await domainEventRepository.append(
        {
          entityType: "Booking",
          entityId: params.bookingId,
          eventType: "CUSTOMER_CONFIRMED",
          actorType: "CUSTOMER",
          actorId: params.customerId,
          payload: {
            supplierKm,
            confirmedKm: params.confirmedKm,
            difference: kmDiff,
            autoResolved,
            resolvedKm,
            notes: params.notes,
          },
        },
        tx
      );

      return {
        bookingId: params.bookingId,
        supplierKm,
        confirmedKm: params.confirmedKm,
        resolvedKm,
        autoResolved,
        status: "COMPLETED",
      };
    });
  }

  /**
   * Generate final bill (after trip completion or customer confirmation).
   * Transitions: COMPLETED → BILLING_IN_PROGRESS → CLOSED
   */
  async generateFinalBill(params: {
    bookingId: string;
    actorId: string;
  }) {
    return withTransaction(prisma, async (tx) => {
      // 1. Fetch booking
      const booking = await bookingRepository.findById(params.bookingId, tx);

      // 2. Validate state
      if (booking.status !== "COMPLETED") {
        throw new ValidationError(
          `Cannot generate final bill for booking in ${booking.status} state`
        );
      }

      // 2a. IDEMPOTENCY GUARD: Check if final bill already exists
      const existingBill = await finalBillRepository.findByBookingId(params.bookingId, tx);
      if (existingBill) {
        throw new ConflictError(
          "Final bill already exists for this booking. Cannot generate duplicate."
        );
      }

      // 3. Fetch trip execution
      const execution = await tripExecutionRepository.findByBookingIdOrThrow(
        params.bookingId,
        tx
      );

      // 4. Fetch pricing snapshot and quote
      const pricingSnapshot = await bookingPricingSnapshotRepository.findByBookingId(
        params.bookingId,
        tx
      );

      if (!pricingSnapshot) {
        throw new ValidationError("Pricing snapshot not found for booking");
      }

      const quote = await quoteRepository.findByBookingId(params.bookingId, tx);

      // 5. Calculate final bill line items
      const billLines: BillLineItem[] = [];

      // Extract pricing rates from snapshot data (MVP placeholder rates)
      const snapshotData = pricingSnapshot.snapshotData as any;
      const ratePerDay = new Prisma.Decimal(snapshotData.ratePerDay || pricingSnapshot.basePrice);
      const extraKmRate = new Prisma.Decimal(snapshotData.extraKmRate || 10);
      const oneWaySurcharge = snapshotData.oneWaySurcharge 
        ? new Prisma.Decimal(snapshotData.oneWaySurcharge) 
        : null;

      // Base fare (category + age bucket)
      const tripEndDate = booking.tripEndDate || new Date();
      const tripDays = Math.max(
        1,
        Math.ceil(
          (tripEndDate.getTime() - booking.tripStartDate.getTime()) /
            (1000 * 60 * 60 * 24)
        )
      );

      const baseFare = ratePerDay.mul(tripDays);

      billLines.push({
        lineType: "BASE_FARE",
        description: `${pricingSnapshot.category} (${pricingSnapshot.ageBucket}) - ${tripDays} day(s)`,
        quantity: tripDays,
        rate: ratePerDay.toString(),
        amount: baseFare.toString(),
      });

      // Extra km charge
      const includedKmPerDay = pricingSnapshot.includedKmPerDay;
      const totalIncludedKm = includedKmPerDay * tripDays;
      const actualKm = execution.actualKm!;
      const extraKm = Math.max(0, actualKm - totalIncludedKm);

      if (extraKm > 0) {
        const extraKmCharge = extraKmRate.mul(extraKm);

        billLines.push({
          lineType: "EXTRA_KM",
          description: `Extra km (${extraKm} km)`,
          quantity: extraKm,
          rate: extraKmRate.toString(),
          amount: extraKmCharge.toString(),
        });
      }

      // Tolls
      for (const toll of execution.tollLines) {
        billLines.push({
          lineType: "TOLL",
          description: toll.description,
          amount: toll.amount,
        });
      }

      // Parking
      for (const parking of execution.parkingLines) {
        billLines.push({
          lineType: "PARKING",
          description: parking.description,
          amount: parking.amount,
        });
      }

      // One-way surcharge (if applicable)
      if (oneWaySurcharge && oneWaySurcharge.gt(0)) {
        billLines.push({
          lineType: "ONE_WAY_SURCHARGE",
          description: "One-way surcharge",
          amount: oneWaySurcharge.toString(),
        });
      }

      // Calculate subtotal
      const subtotal = billLines.reduce(
        (sum, line) => sum.add(new Prisma.Decimal(line.amount)),
        new Prisma.Decimal(0)
      );

      // Platform fee (MVP flat fee)
      const platformFee = MVP_COMMISSION_CONFIG.platformFeeFlat;

      // Total amount
      const totalAmount = subtotal.add(platformFee);

      // Variance from quote
      let varianceFromQuote: Prisma.Decimal | undefined;
      if (quote) {
        varianceFromQuote = totalAmount.sub(quote.estimatedTotal);
      }

      // 6. Create final bill
      const finalBill = await finalBillRepository.create(
        {
          bookingId: params.bookingId,
          quoteId: quote?.id,
          subtotal,
          platformFee,
          totalAmount,
          varianceFromQuote,
          lineItems: billLines,
        },
        tx
      );

      // 7. Calculate commission
      const perKmCommission = MVP_COMMISSION_CONFIG.perKmRate.mul(actualKm);
      const calculatedCommission = platformFee.add(perKmCommission);

      // 8. Create commission snapshot
      await commissionSnapshotRepository.create(
        {
          finalBillId: finalBill.id,
          perKmRate: MVP_COMMISSION_CONFIG.perKmRate,
          platformFeeFlat: MVP_COMMISSION_CONFIG.platformFeeFlat,
          calculatedCommission,
          snapshotData: {
            config: MVP_COMMISSION_CONFIG,
            actualKm,
            tripDays,
          },
        },
        tx
      );

      // 9. Calculate supplier earning
      const supplierEarning = subtotal.sub(calculatedCommission);

      await supplierEarningRepository.create(
        {
          bookingId: params.bookingId,
          supplierId: booking.supplierId!,
          finalBillId: finalBill.id,
          grossAmount: subtotal,
          commissionAmount: calculatedCommission,
          netAmount: supplierEarning,
        },
        tx
      );

      // 10. Update booking status to BILLING_IN_PROGRESS
      await bookingRepository.updateStatus(
        params.bookingId,
        "BILLING_IN_PROGRESS",
        tx
      );

      // 11. Record domain event
      await domainEventRepository.append(
        {
          entityType: "Booking",
          entityId: params.bookingId,
          eventType: "FINAL_BILL_GENERATED",
          actorType: "SYSTEM", // System or admin generates final bill
          actorId: params.actorId,
          payload: {
            finalBillId: finalBill.id,
            totalAmount: totalAmount.toString(),
            supplierEarning: supplierEarning.toString(),
            varianceFromQuote: varianceFromQuote?.toString(),
          },
        },
        tx
      );

      return {
        bookingId: params.bookingId,
        finalBillId: finalBill.id,
        totalAmount: totalAmount.toString(),
        subtotal: subtotal.toString(),
        platformFee: platformFee.toString(),
        supplierEarning: supplierEarning.toString(),
        varianceFromQuote: varianceFromQuote?.toString(),
        status: "BILLING_IN_PROGRESS",
      };
    });
  }

  /**
   * Get final bill by booking ID.
   */
  async getFinalBillByBookingId(bookingId: string) {
    const bill = await finalBillRepository.findByBookingId(bookingId);

    if (!bill) {
      throw new NotFoundError("FinalBill", bookingId);
    }

    return bill;
  }

  /**
   * Close booking after billing is complete (operational closure).
   * Transitions: BILLING_IN_PROGRESS → CLOSED
   * 
   * Note: This is operational closure for MVP. In production, this would be
   * triggered by payment confirmation from payment gateway.
   */
  async closeBooking(params: {
    bookingId: string;
    actorId: string;
    notes?: string;
  }) {
    return withTransaction(prisma, async (tx) => {
      // 1. Fetch booking
      const booking = await bookingRepository.findById(params.bookingId, tx);

      // 2. IDEMPOTENCY GUARD: Check if already closed
      if (booking.status === "CLOSED") {
        throw new ConflictError(
          "Booking is already closed. Cannot close again."
        );
      }

      // 3. Validate state
      if (booking.status !== "BILLING_IN_PROGRESS") {
        throw new ValidationError(
          `Cannot close booking in ${booking.status} state. Must be in BILLING_IN_PROGRESS.`
        );
      }

      // 4. Verify final bill exists
      const finalBill = await finalBillRepository.findByBookingId(params.bookingId, tx);
      if (!finalBill) {
        throw new ValidationError("Cannot close booking without final bill");
      }

      // 5. Update booking status to CLOSED
      await bookingRepository.updateStatus(
        params.bookingId,
        "CLOSED",
        tx
      );

      // 6. Record domain event
      await domainEventRepository.append(
        {
          entityType: "Booking",
          entityId: params.bookingId,
          eventType: "BOOKING_CLOSED",
          actorType: "SYSTEM", // System or admin closes booking
          actorId: params.actorId,
          payload: {
            finalBillId: finalBill.id,
            notes: params.notes,
          },
        },
        tx
      );

      return {
        bookingId: params.bookingId,
        status: "CLOSED",
        finalBillId: finalBill.id,
      };
    });
  }
}

/**
 * Singleton instance for use in API routes.
 */
export const billingService = new BillingService();
