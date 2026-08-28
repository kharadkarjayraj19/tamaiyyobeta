/**
 * Tamayo — Transaction helper utilities.
 *
 * Architecture:
 * - Services orchestrate transactions via prisma.$transaction
 * - Repositories participate with shared transaction client
 * - Never nest transactions from services (Prisma limitation)
 *
 * Usage pattern:
 *
 * // Service layer
 * import prisma from "@/lib/db/prisma";
 * import { withTransaction } from "@/lib/db/transactions";
 *
 * export async function createBookingWithSnapshot(data: CreateBookingData) {
 *   return withTransaction(prisma, async (tx) => {
 *     const booking = await bookingRepo.create(data, tx);
 *     await snapshotRepo.create(booking.id, snapshotData, tx);
 *     await eventRepo.append(event, tx);
 *     return booking;
 *   });
 * }
 */

import type { PrismaClient } from "@prisma/client";
import type { PrismaTransactionClient } from "./types";

/**
 * Execute a callback within a Prisma transaction.
 * Simplifies transaction boilerplate and ensures consistent error handling.
 *
 * @param prisma - Prisma client instance
 * @param callback - Async function receiving transaction client
 * @returns Result of callback execution
 */
export async function withTransaction<T>(
  prisma: PrismaClient,
  callback: (tx: PrismaTransactionClient) => Promise<T>
): Promise<T> {
  return prisma.$transaction(async (tx) => {
    // Cast tx to PrismaTransactionClient for repository compatibility
    return callback(tx as PrismaTransactionClient);
  });
}

/**
 * Execute multiple operations in a transaction with timeout.
 * Use for operations that may take longer than default 5s timeout.
 *
 * @param prisma - Prisma client instance
 * @param callback - Async function receiving transaction client
 * @param timeoutMs - Transaction timeout in milliseconds (default 10000)
 */
export async function withTransactionTimeout<T>(
  prisma: PrismaClient,
  callback: (tx: PrismaTransactionClient) => Promise<T>,
  timeoutMs: number = 10000
): Promise<T> {
  return prisma.$transaction(
    async (tx) => {
      // Cast tx to PrismaTransactionClient for repository compatibility
      return callback(tx as PrismaTransactionClient);
    },
    { timeout: timeoutMs }
  );
}
