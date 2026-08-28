/**
 * Tamayo — Database and Prisma type utilities.
 *
 * Architecture:
 * - PrismaTransactionClient for transaction-aware repositories
 * - Domain types separate from Prisma models (ORM-agnostic services)
 */

import type { PrismaClient } from "@prisma/client";

/**
 * Prisma transaction client type.
 * Used in repository methods to accept either the root client or a transaction client.
 * 
 * For simplicity, we use PrismaClient type directly - Prisma handles the actual 
 * transaction client restrictions at runtime.
 */
export type PrismaTransactionClient = PrismaClient;

/**
 * Helper type for repository methods that accept optional transaction client.
 * Usage: repositories define methods with `tx?: PrismaTransactionClient`
 */
export type TransactionContext = PrismaTransactionClient | undefined;
