/**
 * Tamayo — PaymentService.
 *
 * Architecture:
 * - Orchestrates payment workflows
 * - Owns business rules for payment recording
 * - Manages transactions
 * - Never exposes Prisma directly
 * 
 * MVP PLACEHOLDER: No actual gateway integration yet. Payment recording
 * is manual entry for now. Production will integrate Razorpay webhooks.
 */

import type { PaymentMode, PaymentStatus } from "@prisma/client";
import { Prisma } from "@prisma/client";
import {
  paymentRepository,
  type PaymentDomain,
} from "@/lib/repositories/billing/payment-repository";
import {
  bookingRepository,
  type BookingDomain,
} from "@/lib/repositories/booking/booking-repository";
import { finalBillRepository } from "@/lib/repositories/billing/final-bill-repository";
import { domainEventRepository } from "@/lib/repositories/event/domain-event-repository";
import prisma from "@/lib/db/prisma";
import { withTransaction } from "@/lib/db/transactions";
import {
  ValidationError,
  NotFoundError,
  ConflictError,
} from "@/lib/errors";

/**
 * DTO for recording payment.
 */
export interface RecordPaymentRequest {
  bookingId: string;
  customerId: string;
  amount: Prisma.Decimal;
  mode: PaymentMode;
  gatewayOrderId?: string;
  finalBillId?: string;
}

/**
 * DTO for updating payment status.
 */
export interface UpdatePaymentStatusRequest {
  paymentId: string;
  status: PaymentStatus;
  gatewayPaymentId?: string;
  actorId: string;
}

/**
 * PaymentService — business logic for payment operations.
 */
export class PaymentService {
  /**
   * Record a payment (advance, partial, or full).
   * Transitions: Creates payment in INITIATED status.
   * 
   * MVP: Manual payment entry. Production will use gateway webhooks.
   */
  async recordPayment(
    request: RecordPaymentRequest
  ): Promise<{ payment: PaymentDomain; booking: BookingDomain }> {
    return withTransaction(prisma, async (tx) => {
      // 1. Fetch booking
      const booking = await bookingRepository.findById(request.bookingId, tx);

      // 2. OWNERSHIP VALIDATION: Customer owns booking
      if (booking.customerId !== request.customerId) {
        throw new ValidationError(
          "Customer does not own this booking. Cannot record payment."
        );
      }

      // 3. Validate booking status (allow payments for non-cancelled bookings)
      if (booking.status === "CANCELLED") {
        throw new ValidationError(
          "Cannot record payment for cancelled booking"
        );
      }

      // 4. Validate amount
      if (request.amount.lte(0)) {
        throw new ValidationError("Payment amount must be greater than 0");
      }

      // 5. If finalBillId provided, verify it exists and belongs to booking
      if (request.finalBillId) {
        const finalBill = await finalBillRepository.findByBookingId(
          request.bookingId,
          tx
        );

        if (!finalBill || finalBill.id !== request.finalBillId) {
          throw new ValidationError(
            "Final bill not found or does not belong to this booking"
          );
        }
      }

      // 6. Create payment record
      const payment = await paymentRepository.create(
        {
          bookingId: request.bookingId,
          amount: request.amount,
          mode: request.mode,
          gatewayOrderId: request.gatewayOrderId,
          finalBillId: request.finalBillId,
        },
        tx
      );

      // 7. Record domain event
      await domainEventRepository.append(
        {
          entityType: "Booking",
          entityId: request.bookingId,
          eventType: "PAYMENT_RECORDED",
          actorType: "CUSTOMER",
          actorId: request.customerId,
          payload: {
            paymentId: payment.id,
            amount: payment.amount.toFixed(2),
            mode: payment.mode,
            status: payment.status,
          },
        },
        tx
      );

      return { payment, booking };
    });
  }

  /**
   * Update payment status (capture, failure, etc.).
   * 
   * MVP: Manual status updates. Production will use gateway webhooks.
   */
  async updatePaymentStatus(
    request: UpdatePaymentStatusRequest
  ): Promise<PaymentDomain> {
    return withTransaction(prisma, async (tx) => {
      // 1. Fetch payment
      const payment = await paymentRepository.findById(request.paymentId, tx);

      if (!payment) {
        throw new NotFoundError("Payment", request.paymentId);
      }

      // 2. Validate status transition
      if (payment.status === "CAPTURED" && request.status !== "REFUNDED") {
        throw new ValidationError(
          "Cannot change status of captured payment except to refunded"
        );
      }

      if (payment.status === "FAILED") {
        throw new ValidationError("Cannot update status of failed payment");
      }

      // 3. Update payment status
      const updatedPayment = await paymentRepository.updateStatus(
        request.paymentId,
        request.status,
        request.gatewayPaymentId,
        tx
      );

      // 4. Record domain event
      await domainEventRepository.append(
        {
          entityType: "Booking",
          entityId: payment.bookingId,
          eventType:
            request.status === "CAPTURED"
              ? "PAYMENT_COMPLETED"
              : "PAYMENT_STATUS_UPDATED",
          actorType: "SYSTEM",
          actorId: request.actorId,
          payload: {
            paymentId: payment.id,
            oldStatus: payment.status,
            newStatus: request.status,
            gatewayPaymentId: request.gatewayPaymentId,
          },
        },
        tx
      );

      return updatedPayment;
    });
  }

  /**
   * Get payment by ID.
   */
  async getPaymentById(paymentId: string): Promise<PaymentDomain> {
    const payment = await paymentRepository.findById(paymentId);

    if (!payment) {
      throw new NotFoundError("Payment", paymentId);
    }

    return payment;
  }

  /**
   * Get payments for a booking.
   */
  async getPaymentsByBookingId(bookingId: string): Promise<PaymentDomain[]> {
    return paymentRepository.findByBookingId(bookingId);
  }

  /**
   * Calculate outstanding balance for a booking.
   * 
   * Returns: {
   *   finalBillAmount: total from final bill (or 0 if not issued)
   *   totalPaid: sum of CAPTURED payments
   *   outstandingBalance: finalBillAmount - totalPaid
   * }
   */
  async getOutstandingBalance(bookingId: string): Promise<{
    finalBillAmount: Prisma.Decimal;
    totalPaid: Prisma.Decimal;
    outstandingBalance: Prisma.Decimal;
  }> {
    // Fetch final bill
    const finalBill = await finalBillRepository.findByBookingId(bookingId);

    const finalBillAmount = finalBill
      ? finalBill.totalAmount
      : new Prisma.Decimal(0);

    // Calculate total paid (only CAPTURED payments count)
    const totalPaid = await paymentRepository.getTotalPaidForBooking(bookingId);

    const outstandingBalance = finalBillAmount.minus(totalPaid);

    return {
      finalBillAmount,
      totalPaid,
      outstandingBalance,
    };
  }
}

/**
 * Singleton instance for use in API handlers.
 */
export const paymentService = new PaymentService();
