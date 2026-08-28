/**
 * Tamayo — Refund repository.
 *
 * Architecture:
 * - Prisma queries for refund records
 * - Multiple refunds possible per payment
 * - Tracks refund lifecycle and gateway details
 */

import type { Refund, ActorType, RefundStatus } from "@prisma/client";
import { Prisma } from "@prisma/client";
import prisma from "@/lib/db/prisma";
import type { PrismaTransactionClient } from "@/lib/db/types";
import { NotFoundError } from "@/lib/errors";

/**
 * Domain type for Refund (ORM-agnostic).
 */
export interface RefundDomain {
  id: string;
  bookingId: string;
  paymentId: string;
  amount: Prisma.Decimal;
  reason: string | null;
  initiatedBy: ActorType;
  status: RefundStatus;
  gatewayRefundId: string | null;
  createdAt: Date;
  updatedAt: Date;
}

/**
 * DTO for creating refund record.
 */
export interface CreateRefundData {
  bookingId: string;
  paymentId: string;
  amount: Prisma.Decimal;
  reason?: string;
  initiatedBy: ActorType;
  gatewayRefundId?: string;
}

/**
 * RefundRepository — Prisma data access for refunds.
 */
export class RefundRepository {
  /**
   * Find refund by ID.
   */
  async findById(
    id: string,
    tx?: PrismaTransactionClient
  ): Promise<RefundDomain> {
    const client = tx ?? prisma;

    const refund = await client.refund.findUnique({
      where: { id },
    });

    if (!refund) {
      throw new NotFoundError("Refund", id);
    }

    return this.toDomain(refund);
  }

  /**
   * Find refund by ID (returns null if not found).
   */
  async findByIdOrNull(
    id: string,
    tx?: PrismaTransactionClient
  ): Promise<RefundDomain | null> {
    const client = tx ?? prisma;

    const refund = await client.refund.findUnique({
      where: { id },
    });

    return refund ? this.toDomain(refund) : null;
  }

  /**
   * Find refunds by booking ID.
   */
  async findByBookingId(
    bookingId: string,
    tx?: PrismaTransactionClient
  ): Promise<RefundDomain[]> {
    const client = tx ?? prisma;

    const refunds = await client.refund.findMany({
      where: { bookingId },
      orderBy: { createdAt: "desc" },
    });

    return refunds.map((r: Refund) => this.toDomain(r));
  }

  /**
   * Find refunds by payment ID.
   */
  async findByPaymentId(
    paymentId: string,
    tx?: PrismaTransactionClient
  ): Promise<RefundDomain[]> {
    const client = tx ?? prisma;

    const refunds = await client.refund.findMany({
      where: { paymentId },
      orderBy: { createdAt: "desc" },
    });

    return refunds.map((r: Refund) => this.toDomain(r));
  }

  /**
   * Get total refunded amount for a payment (only SUCCEEDED refunds).
   */
  async getTotalRefundedForPayment(
    paymentId: string,
    tx?: PrismaTransactionClient
  ): Promise<Prisma.Decimal> {
    const client = tx ?? prisma;

    const result = await client.refund.aggregate({
      where: {
        paymentId,
        status: "SUCCEEDED",
      },
      _sum: {
        amount: true,
      },
    });

    return result._sum?.amount || new Prisma.Decimal(0);
  }

  /**
   * Create refund record.
   */
  async create(
    data: CreateRefundData,
    tx?: PrismaTransactionClient
  ): Promise<RefundDomain> {
    const client = tx ?? prisma;

    const refund = await client.refund.create({
      data: {
        bookingId: data.bookingId,
        paymentId: data.paymentId,
        amount: data.amount,
        reason: data.reason,
        initiatedBy: data.initiatedBy,
        status: "INITIATED",
        gatewayRefundId: data.gatewayRefundId,
      },
    });

    return this.toDomain(refund);
  }

  /**
   * Update refund status.
   */
  async updateStatus(
    id: string,
    status: RefundStatus,
    gatewayRefundId?: string,
    tx?: PrismaTransactionClient
  ): Promise<RefundDomain> {
    const client = tx ?? prisma;

    const refund = await client.refund.update({
      where: { id },
      data: {
        status,
        gatewayRefundId: gatewayRefundId || undefined,
      },
    });

    return this.toDomain(refund);
  }

  /**
   * Map Prisma model to domain type.
   */
  private toDomain(refund: Refund): RefundDomain {
    return {
      id: refund.id,
      bookingId: refund.bookingId,
      paymentId: refund.paymentId,
      amount: refund.amount,
      reason: refund.reason,
      initiatedBy: refund.initiatedBy,
      status: refund.status,
      gatewayRefundId: refund.gatewayRefundId,
      createdAt: refund.createdAt,
      updatedAt: refund.updatedAt,
    };
  }
}

/**
 * Singleton instance for use in services.
 */
export const refundRepository = new RefundRepository();
