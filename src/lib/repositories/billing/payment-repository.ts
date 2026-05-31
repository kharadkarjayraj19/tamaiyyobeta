/**
 * Tamaiyyo — Payment repository.
 *
 * Architecture:
 * - Prisma queries for payment records
 * - Multiple payments possible per booking
 * - Tracks payment gateway integration details
 */

import type { Payment, PaymentMode, PaymentStatus } from "@prisma/client";
import { Prisma } from "@prisma/client";
import prisma from "@/lib/db/prisma";
import type { PrismaTransactionClient } from "@/lib/db/types";

/**
 * Domain type for Payment (ORM-agnostic).
 */
export interface PaymentDomain {
  id: string;
  bookingId: string;
  finalBillId: string | null;
  amount: Prisma.Decimal;
  mode: PaymentMode;
  status: PaymentStatus;
  gatewayOrderId: string | null;
  gatewayPaymentId: string | null;
  gatewayRefundId: string | null;
  createdAt: Date;
  updatedAt: Date;
}

/**
 * DTO for creating payment record.
 */
export interface CreatePaymentData {
  bookingId: string;
  finalBillId?: string;
  amount: Prisma.Decimal;
  mode: PaymentMode;
  gatewayOrderId?: string;
}

/**
 * PaymentRepository — Prisma data access for payments.
 */
export class PaymentRepository {
  /**
   * Find payment by ID.
   */
  async findById(
    id: string,
    tx?: PrismaTransactionClient
  ): Promise<PaymentDomain | null> {
    const client = tx ?? prisma;

    const payment = await client.payment.findUnique({
      where: { id },
    });

    return payment ? this.toDomain(payment) : null;
  }

  /**
   * Find payments by booking ID.
   */
  async findByBookingId(
    bookingId: string,
    tx?: PrismaTransactionClient
  ): Promise<PaymentDomain[]> {
    const client = tx ?? prisma;

    const payments = await client.payment.findMany({
      where: { bookingId },
      orderBy: { createdAt: "asc" },
    });

    return payments.map((p: Payment) => this.toDomain(p));
  }

  /**
   * Get total paid amount for a booking (only CAPTURED payments).
   */
  async getTotalPaidForBooking(
    bookingId: string,
    tx?: PrismaTransactionClient
  ): Promise<Prisma.Decimal> {
    const client = tx ?? prisma;

    const result = await client.payment.aggregate({
      where: {
        bookingId,
        status: "CAPTURED",
      },
      _sum: {
        amount: true,
      },
    });

    return result._sum.amount || new Prisma.Decimal(0);
  }

  /**
   * Create payment record.
   */
  async create(
    data: CreatePaymentData,
    tx?: PrismaTransactionClient
  ): Promise<PaymentDomain> {
    const client = tx ?? prisma;

    const payment = await client.payment.create({
      data: {
        bookingId: data.bookingId,
        finalBillId: data.finalBillId,
        amount: data.amount,
        mode: data.mode,
        status: "INITIATED",
        gatewayOrderId: data.gatewayOrderId,
      },
    });

    return this.toDomain(payment);
  }

  /**
   * Update payment status.
   */
  async updateStatus(
    id: string,
    status: PaymentStatus,
    gatewayPaymentId?: string,
    tx?: PrismaTransactionClient
  ): Promise<PaymentDomain> {
    const client = tx ?? prisma;

    const payment = await client.payment.update({
      where: { id },
      data: {
        status,
        gatewayPaymentId: gatewayPaymentId || undefined,
      },
    });

    return this.toDomain(payment);
  }

  /**
   * Map Prisma model to domain type.
   */
  private toDomain(payment: Payment): PaymentDomain {
    return {
      id: payment.id,
      bookingId: payment.bookingId,
      finalBillId: payment.finalBillId,
      amount: payment.amount,
      mode: payment.mode,
      status: payment.status,
      gatewayOrderId: payment.gatewayOrderId,
      gatewayPaymentId: payment.gatewayPaymentId,
      gatewayRefundId: payment.gatewayRefundId,
      createdAt: payment.createdAt,
      updatedAt: payment.updatedAt,
    };
  }
}

/**
 * Singleton instance for use in services.
 */
export const paymentRepository = new PaymentRepository();
