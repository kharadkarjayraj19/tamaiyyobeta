/**
 * Tamaiyyo — FinalBill repository.
 *
 * Architecture:
 * - Prisma queries for final bills
 * - One-to-one relationship with Booking
 * - Immutable billing snapshots
 */

import type { FinalBill, Prisma } from "@prisma/client";
import prisma from "@/lib/db/prisma";
import type { PrismaTransactionClient } from "@/lib/db/types";
import { NotFoundError } from "@/lib/errors";

/**
 * Bill line item.
 */
export interface BillLineItem {
  lineType: string;
  description: string;
  quantity?: number;
  rate?: string;
  amount: string;
}

/**
 * Domain type for FinalBill (ORM-agnostic).
 */
export interface FinalBillDomain {
  id: string;
  bookingId: string;
  quoteId: string | null;
  subtotal: Prisma.Decimal;
  platformFee: Prisma.Decimal | null;
  totalAmount: Prisma.Decimal;
  varianceFromQuote: Prisma.Decimal | null;
  lineItems: BillLineItem[];
  issuedAt: Date;
  createdAt: Date;
}

/**
 * DTO for creating final bill.
 */
export interface CreateFinalBillData {
  bookingId: string;
  quoteId?: string;
  subtotal: Prisma.Decimal;
  platformFee?: Prisma.Decimal;
  totalAmount: Prisma.Decimal;
  varianceFromQuote?: Prisma.Decimal;
  lineItems: BillLineItem[];
}

/**
 * FinalBillRepository — Prisma data access for final bills.
 */
export class FinalBillRepository {
  /**
   * Find final bill by booking ID.
   */
  async findByBookingId(
    bookingId: string,
    tx?: PrismaTransactionClient
  ): Promise<FinalBillDomain | null> {
    const client = tx ?? prisma;

    const bill = await client.finalBill.findUnique({
      where: { bookingId },
    });

    return bill ? this.toDomain(bill) : null;
  }

  /**
   * Find final bill by ID.
   */
  async findById(
    id: string,
    tx?: PrismaTransactionClient
  ): Promise<FinalBillDomain | null> {
    const client = tx ?? prisma;

    const bill = await client.finalBill.findUnique({
      where: { id },
    });

    return bill ? this.toDomain(bill) : null;
  }

  /**
   * Create final bill.
   */
  async create(
    data: CreateFinalBillData,
    tx?: PrismaTransactionClient
  ): Promise<FinalBillDomain> {
    const client = tx ?? prisma;

    const bill = await client.finalBill.create({
      data: {
        bookingId: data.bookingId,
        quoteId: data.quoteId,
        subtotal: data.subtotal,
        platformFee: data.platformFee,
        totalAmount: data.totalAmount,
        varianceFromQuote: data.varianceFromQuote,
        lineItems: data.lineItems as any,
        issuedAt: new Date(),
      },
    });

    return this.toDomain(bill);
  }

  /**
   * Map Prisma model to domain type.
   */
  private toDomain(bill: FinalBill): FinalBillDomain {
    return {
      id: bill.id,
      bookingId: bill.bookingId,
      quoteId: bill.quoteId,
      subtotal: bill.subtotal,
      platformFee: bill.platformFee,
      totalAmount: bill.totalAmount,
      varianceFromQuote: bill.varianceFromQuote,
      lineItems: (bill.lineItems as any) as BillLineItem[],
      issuedAt: bill.issuedAt,
      createdAt: bill.createdAt,
    };
  }
}

/**
 * Singleton instance for use in services.
 */
export const finalBillRepository = new FinalBillRepository();
