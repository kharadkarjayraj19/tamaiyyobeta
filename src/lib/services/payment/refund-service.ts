/**
 * Tamaiyyo — RefundService.
 *
 * Architecture:
 * - Orchestrates refund workflows
 * - Owns business rules for refund eligibility
 * - Implements 24h cancellation policy
 * - Manages transactions
 * - Never exposes Prisma directly
 * 
 * MVP PLACEHOLDER: No actual gateway integration yet. Refund processing
 * is manual. Production will integrate Razorpay refund APIs.
 * 
 * REFUND POLICY:
 * - >24h before trip: Full refund eligible
 * - <24h before trip: No automatic full refund
 * - Admin can override with explicit reason
 */

import type { ActorType, RefundStatus } from "@prisma/client";
import { Prisma } from "@prisma/client";
import {
  refundRepository,
  type RefundDomain,
} from "@/lib/repositories/billing/refund-repository";
import {
  paymentRepository,
  type PaymentDomain,
} from "@/lib/repositories/billing/payment-repository";
import {
  bookingRepository,
  type BookingDomain,
} from "@/lib/repositories/booking/booking-repository";
import { domainEventRepository } from "@/lib/repositories/event/domain-event-repository";
import prisma from "@/lib/db/prisma";
import { withTransaction } from "@/lib/db/transactions";
import {
  ValidationError,
  NotFoundError,
  ForbiddenError,
} from "@/lib/errors";

/**
 * DTO for creating refund.
 */
export interface CreateRefundRequest {
  bookingId: string;
  paymentId: string;
  amount: Prisma.Decimal;
  reason?: string;
  initiatedBy: ActorType;
  actorId: string;
}

/**
 * DTO for updating refund status.
 */
export interface UpdateRefundStatusRequest {
  refundId: string;
  status: RefundStatus;
  gatewayRefundId?: string;
  actorId: string;
}

/**
 * RefundService — business logic for refund operations.
 */
export class RefundService {
  /**
   * Create a refund (with 24h policy validation).
   * 
   * REFUND POLICY:
   * - Cancellation >24h before trip start: Full refund allowed
   * - Cancellation <24h before trip start: No automatic full refund
   * - Admin can override policy with explicit reason
   */
  async createRefund(
    request: CreateRefundRequest
  ): Promise<{ refund: RefundDomain; booking: BookingDomain }> {
    return withTransaction(prisma, async (tx) => {
      // 1. Fetch booking
      const booking = await bookingRepository.findById(request.bookingId, tx);

      // 2. Fetch payment
      const payment = await paymentRepository.findById(request.paymentId, tx);

      if (!payment) {
        throw new NotFoundError("Payment", request.paymentId);
      }

      // 3. Validate payment belongs to booking
      if (payment.bookingId !== request.bookingId) {
        throw new ValidationError(
          "Payment does not belong to this booking"
        );
      }

      // 4. Validate payment was captured
      if (payment.status !== "CAPTURED") {
        throw new ValidationError(
          "Cannot refund payment that was not captured"
        );
      }

      // 5. Validate refund amount
      if (request.amount.lte(0)) {
        throw new ValidationError("Refund amount must be greater than 0");
      }

      // 6. Check already refunded amount
      const totalRefunded = await refundRepository.getTotalRefundedForPayment(
        request.paymentId,
        tx
      );

      const remainingRefundable = payment.amount.minus(totalRefunded);

      if (request.amount.gt(remainingRefundable)) {
        throw new ValidationError(
          `Refund amount exceeds remaining refundable amount (₹${remainingRefundable.toFixed(2)})`
        );
      }

      // 7. POLICY VALIDATION: 24h refund window
      // Only enforce for customer-initiated refunds
      if (request.initiatedBy === "CUSTOMER") {
        const now = new Date();
        const tripStartDate = booking.tripStartDate;
        const hoursUntilTrip =
          (tripStartDate.getTime() - now.getTime()) / (1000 * 60 * 60);

        if (hoursUntilTrip < 24) {
          throw new ForbiddenError(
            "Cancellation within 24 hours of trip start. " +
            "Full refund not available. Please contact support for assistance."
          );
        }
      }

      // 8. Admin override requires reason
      if (request.initiatedBy === "ADMIN" && !request.reason) {
        throw new ValidationError(
          "Admin-initiated refunds require a reason"
        );
      }

      // 9. Create refund record
      const refund = await refundRepository.create(
        {
          bookingId: request.bookingId,
          paymentId: request.paymentId,
          amount: request.amount,
          reason: request.reason,
          initiatedBy: request.initiatedBy,
        },
        tx
      );

      // 10. Record domain event
      await domainEventRepository.append(
        {
          entityType: "Booking",
          entityId: request.bookingId,
          eventType: "REFUND_CREATED",
          actorType: request.initiatedBy,
          actorId: request.actorId,
          payload: {
            refundId: refund.id,
            paymentId: request.paymentId,
            amount: refund.amount.toFixed(2),
            reason: request.reason,
            remainingRefundable: remainingRefundable
              .minus(request.amount)
              .toFixed(2),
          },
        },
        tx
      );

      return { refund, booking };
    });
  }

  /**
   * Update refund status.
   * 
   * MVP: Manual status updates. Production will use gateway webhooks.
   */
  async updateRefundStatus(
    request: UpdateRefundStatusRequest
  ): Promise<RefundDomain> {
    return withTransaction(prisma, async (tx) => {
      // 1. Fetch refund
      const refund = await refundRepository.findById(request.refundId, tx);

      // 2. Validate status transition
      if (refund.status === "SUCCEEDED") {
        throw new ValidationError("Cannot update status of succeeded refund");
      }

      if (refund.status === "FAILED") {
        throw new ValidationError("Cannot update status of failed refund");
      }

      // 3. Update refund status
      const updatedRefund = await refundRepository.updateStatus(
        request.refundId,
        request.status,
        request.gatewayRefundId,
        tx
      );

      // 4. If refund succeeded, update payment status to REFUNDED
      // (only if full amount refunded)
      if (request.status === "SUCCEEDED") {
        const payment = await paymentRepository.findById(refund.paymentId, tx);
        const totalRefunded = await refundRepository.getTotalRefundedForPayment(
          refund.paymentId,
          tx
        );

        if (payment && totalRefunded.gte(payment.amount)) {
          await paymentRepository.updateStatus(
            refund.paymentId,
            "REFUNDED",
            undefined,
            tx
          );
        }
      }

      // 5. Record domain event
      await domainEventRepository.append(
        {
          entityType: "Booking",
          entityId: refund.bookingId,
          eventType: "REFUND_STATUS_UPDATED",
          actorType: "SYSTEM",
          actorId: request.actorId,
          payload: {
            refundId: refund.id,
            oldStatus: refund.status,
            newStatus: request.status,
            gatewayRefundId: request.gatewayRefundId,
          },
        },
        tx
      );

      return updatedRefund;
    });
  }

  /**
   * Get refund by ID.
   */
  async getRefundById(refundId: string): Promise<RefundDomain> {
    return refundRepository.findById(refundId);
  }

  /**
   * Get refunds for a booking.
   */
  async getRefundsByBookingId(bookingId: string): Promise<RefundDomain[]> {
    return refundRepository.findByBookingId(bookingId);
  }

  /**
   * Get refunds for a payment.
   */
  async getRefundsByPaymentId(paymentId: string): Promise<RefundDomain[]> {
    return refundRepository.findByPaymentId(paymentId);
  }

  /**
   * Check if booking is eligible for full refund.
   * 
   * Returns: { eligible: boolean, hoursUntilTrip: number, reason?: string }
   */
  async checkRefundEligibility(bookingId: string): Promise<{
    eligible: boolean;
    hoursUntilTrip: number;
    reason?: string;
  }> {
    const booking = await bookingRepository.findById(bookingId);

    const now = new Date();
    const tripStartDate = booking.tripStartDate;
    const hoursUntilTrip =
      (tripStartDate.getTime() - now.getTime()) / (1000 * 60 * 60);

    if (booking.status === "CANCELLED") {
      return {
        eligible: false,
        hoursUntilTrip,
        reason: "Booking already cancelled",
      };
    }

    if (booking.status === "CLOSED") {
      return {
        eligible: false,
        hoursUntilTrip,
        reason: "Booking already closed",
      };
    }

    if (hoursUntilTrip < 0) {
      return {
        eligible: false,
        hoursUntilTrip,
        reason: "Trip has already started or completed",
      };
    }

    if (hoursUntilTrip < 24) {
      return {
        eligible: false,
        hoursUntilTrip,
        reason: "Less than 24 hours until trip start. Contact support.",
      };
    }

    return {
      eligible: true,
      hoursUntilTrip,
    };
  }
}

/**
 * Singleton instance for use in API handlers.
 */
export const refundService = new RefundService();
