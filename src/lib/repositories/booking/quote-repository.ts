/**
 * Tamayo — Quote repository.
 *
 * Architecture:
 * - Prisma queries for booking quotes
 * - One-to-one relationship with Booking
 * - Preserves quote details before booking confirmation
 * - Per schema: Quote has bookingId (unique), estimatedTotal, lineItems, issuedAt
 */

import type { Quote, Prisma } from "@prisma/client";
import prisma from "@/lib/db/prisma";

type Decimal = Prisma.Decimal;
import type { PrismaTransactionClient } from "@/lib/db/types";
import { NotFoundError } from "@/lib/errors";

/**
 * Quote line item.
 */
export interface QuoteLineItem {
  lineType: string;
  description: string;
  amount: string; // Decimal as string
}

/**
 * Domain type for Quote (ORM-agnostic).
 */
export interface QuoteDomain {
  id: string;
  bookingId: string;
  estimatedTotal: Decimal;
  lineItems: QuoteLineItem[];
  issuedAt: Date;
  createdAt: Date;
}

/**
 * DTO for creating a quote.
 */
export interface CreateQuoteData {
  bookingId: string;
  estimatedTotal: Decimal;
  lineItems: QuoteLineItem[];
}

/**
 * QuoteRepository — Prisma data access for quotes.
 */
export class QuoteRepository {
  /**
   * Find quote by ID.
   * @throws NotFoundError if quote doesn't exist
   */
  async findById(
    id: string,
    tx?: PrismaTransactionClient
  ): Promise<QuoteDomain> {
    const client = tx ?? prisma;
    const quote = await client.quote.findUnique({
      where: { id },
    });

    if (!quote) {
      throw new NotFoundError("Quote", id);
    }

    return this.toDomain(quote);
  }

  /**
   * Find quote by ID (returns null if not found).
   */
  async findByIdOrNull(
    id: string,
    tx?: PrismaTransactionClient
  ): Promise<QuoteDomain | null> {
    const client = tx ?? prisma;
    const quote = await client.quote.findUnique({
      where: { id },
    });

    return quote ? this.toDomain(quote) : null;
  }

  /**
   * Find quote by booking ID.
   */
  async findByBookingId(
    bookingId: string,
    tx?: PrismaTransactionClient
  ): Promise<QuoteDomain | null> {
    const client = tx ?? prisma;
    const quote = await client.quote.findUnique({
      where: { bookingId },
    });

    return quote ? this.toDomain(quote) : null;
  }

  /**
   * Create quote (linked to booking).
   */
  async create(
    data: CreateQuoteData,
    tx?: PrismaTransactionClient
  ): Promise<QuoteDomain> {
    const client = tx ?? prisma;

    const quote = await client.quote.create({
      data: {
        bookingId: data.bookingId,
        estimatedTotal: data.estimatedTotal,
        lineItems: data.lineItems as any,
        issuedAt: new Date(),
      },
    });

    return this.toDomain(quote);
  }

  /**
   * Map Prisma model to domain type.
   */
  private toDomain(quote: Quote): QuoteDomain {
    return {
      id: quote.id,
      bookingId: quote.bookingId,
      estimatedTotal: quote.estimatedTotal,
      lineItems: (quote.lineItems as any) as QuoteLineItem[],
      issuedAt: quote.issuedAt,
      createdAt: quote.createdAt,
    };
  }
}

/**
 * Singleton instance for use in services.
 */
export const quoteRepository = new QuoteRepository();
