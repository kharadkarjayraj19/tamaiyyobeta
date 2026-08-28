/**
 * Tamayo — CustomerAccount repository (example implementation).
 *
 * Architecture:
 * - Repositories own Prisma queries only
 * - Map Prisma models to domain types (ORM-agnostic)
 * - Accept optional transaction client for service orchestration
 * - No business logic — services own workflow
 *
 * Pattern:
 * - findById, findByX — query methods
 * - create — insert methods
 * - update — update methods
 * - No delete — use status transitions or soft-delete
 */

import type { CustomerAccount } from "@prisma/client";
import prisma from "@/lib/db/prisma";
import type { PrismaTransactionClient } from "@/lib/db/types";
import { NotFoundError } from "@/lib/errors";

/**
 * Domain type for CustomerAccount (ORM-agnostic).
 * Services work with this type, not Prisma models directly.
 */
export interface CustomerAccountDomain {
  id: string;
  identityId: string;
  name: string | null;
  status: string;
  createdAt: Date;
  updatedAt: Date;
}

/**
 * DTO for creating a customer account.
 */
export interface CreateCustomerAccountData {
  identityId: string;
  name?: string;
}

/**
 * DTO for updating a customer account.
 */
export interface UpdateCustomerAccountData {
  name?: string;
  status?: string;
}

/**
 * CustomerAccountRepository — Prisma data access for customer accounts.
 */
export class CustomerAccountRepository {
  /**
   * Find customer account by ID.
   * @throws NotFoundError if account doesn't exist
   */
  async findById(
    id: string,
    tx?: PrismaTransactionClient
  ): Promise<CustomerAccountDomain> {
    const client = tx ?? prisma;
    const account = await client.customerAccount.findUnique({
      where: { id },
    });

    if (!account) {
      throw new NotFoundError("CustomerAccount", id);
    }

    return this.toDomain(account);
  }

  /**
   * Find customer account by ID (returns null if not found).
   */
  async findByIdOrNull(
    id: string,
    tx?: PrismaTransactionClient
  ): Promise<CustomerAccountDomain | null> {
    const client = tx ?? prisma;
    const account = await client.customerAccount.findUnique({
      where: { id },
    });

    return account ? this.toDomain(account) : null;
  }

  /**
   * Find customer account by identity ID.
   */
  async findByIdentityId(
    identityId: string,
    tx?: PrismaTransactionClient
  ): Promise<CustomerAccountDomain | null> {
    const client = tx ?? prisma;
    const account = await client.customerAccount.findUnique({
      where: { identityId },
    });

    return account ? this.toDomain(account) : null;
  }

  /**
   * Create a new customer account.
   */
  async create(
    data: CreateCustomerAccountData,
    tx?: PrismaTransactionClient
  ): Promise<CustomerAccountDomain> {
    const client = tx ?? prisma;
    const account = await client.customerAccount.create({
      data: {
        identityId: data.identityId,
        name: data.name,
        status: "ACTIVE",
      },
    });

    return this.toDomain(account);
  }

  /**
   * Update customer account.
   * @throws NotFoundError if account doesn't exist
   */
  async update(
    id: string,
    data: UpdateCustomerAccountData,
    tx?: PrismaTransactionClient
  ): Promise<CustomerAccountDomain> {
    const client = tx ?? prisma;

    try {
      const account = await client.customerAccount.update({
        where: { id },
        data,
      });

      return this.toDomain(account);
    } catch (error) {
      // Prisma throws P2025 when record not found
      if (
        error &&
        typeof error === "object" &&
        "code" in error &&
        error.code === "P2025"
      ) {
        throw new NotFoundError("CustomerAccount", id);
      }
      throw error;
    }
  }

  /**
   * Map Prisma model to domain type.
   * Keeps services ORM-agnostic.
   */
  private toDomain(account: CustomerAccount): CustomerAccountDomain {
    return {
      id: account.id,
      identityId: account.identityId,
      name: account.name,
      status: account.status,
      createdAt: account.createdAt,
      updatedAt: account.updatedAt,
    };
  }
}

/**
 * Singleton instance for use in services.
 */
export const customerAccountRepository = new CustomerAccountRepository();
