/**
 * Tamaiyyo — SupplierAccount repository.
 *
 * Architecture:
 * - Prisma queries for supplier accounts
 * - Maps to domain types (ORM-agnostic)
 * - Supports transaction participation
 * - No business logic — services own workflows
 */

import type { SupplierAccount, SupplierAccountStatus } from "@prisma/client";
import prisma from "@/lib/db/prisma";
import type { PrismaTransactionClient } from "@/lib/db/types";
import { NotFoundError } from "@/lib/errors";

/**
 * Domain type for SupplierAccount (ORM-agnostic).
 */
export interface SupplierAccountDomain {
  id: string;
  identityId: string;
  businessName: string;
  status: SupplierAccountStatus;
  verificationApprovedAt: Date | null;
  verificationApprovedBy: string | null;
  payoutBankDetails: Record<string, unknown> | null;
  createdAt: Date;
  updatedAt: Date;
}

/**
 * DTO for creating a supplier account.
 */
export interface CreateSupplierAccountData {
  identityId: string;
  businessName: string;
  payoutBankDetails?: Record<string, unknown>;
}

/**
 * DTO for updating a supplier account.
 */
export interface UpdateSupplierAccountData {
  businessName?: string;
  status?: SupplierAccountStatus;
  verificationApprovedAt?: Date;
  verificationApprovedBy?: string;
  payoutBankDetails?: Record<string, unknown>;
}

/**
 * List query filters.
 */
export interface SupplierListFilters {
  status?: SupplierAccountStatus;
  search?: string; // Search by business name
}

/**
 * SupplierAccountRepository — Prisma data access for supplier accounts.
 */
export class SupplierAccountRepository {
  /**
   * Find supplier account by ID.
   * @throws NotFoundError if account doesn't exist
   */
  async findById(
    id: string,
    tx?: PrismaTransactionClient
  ): Promise<SupplierAccountDomain> {
    const client = tx ?? prisma;
    const account = await client.supplierAccount.findUnique({
      where: { id },
    });

    if (!account) {
      throw new NotFoundError("SupplierAccount", id);
    }

    return this.toDomain(account);
  }

  /**
   * Find supplier account by ID (returns null if not found).
   */
  async findByIdOrNull(
    id: string,
    tx?: PrismaTransactionClient
  ): Promise<SupplierAccountDomain | null> {
    const client = tx ?? prisma;
    const account = await client.supplierAccount.findUnique({
      where: { id },
    });

    return account ? this.toDomain(account) : null;
  }

  /**
   * Find supplier account by identity ID.
   */
  async findByIdentityId(
    identityId: string,
    tx?: PrismaTransactionClient
  ): Promise<SupplierAccountDomain | null> {
    const client = tx ?? prisma;
    const account = await client.supplierAccount.findUnique({
      where: { identityId },
    });

    return account ? this.toDomain(account) : null;
  }

  /**
   * List supplier accounts with filters and pagination.
   */
  async list(
    filters: SupplierListFilters,
    offset: number = 0,
    limit: number = 20,
    tx?: PrismaTransactionClient
  ): Promise<SupplierAccountDomain[]> {
    const client = tx ?? prisma;

    const where: any = {};

    if (filters.status) {
      where.status = filters.status;
    }

    if (filters.search) {
      where.businessName = {
        contains: filters.search,
        mode: "insensitive",
      };
    }

    const accounts = await client.supplierAccount.findMany({
      where,
      orderBy: { createdAt: "desc" },
      skip: offset,
      take: limit,
    });

    return accounts.map((a: SupplierAccount) => this.toDomain(a));
  }

  /**
   * Count supplier accounts matching filters.
   */
  async count(
    filters: SupplierListFilters,
    tx?: PrismaTransactionClient
  ): Promise<number> {
    const client = tx ?? prisma;

    const where: any = {};

    if (filters.status) {
      where.status = filters.status;
    }

    if (filters.search) {
      where.businessName = {
        contains: filters.search,
        mode: "insensitive",
      };
    }

    return client.supplierAccount.count({ where });
  }

  /**
   * Create a new supplier account.
   */
  async create(
    data: CreateSupplierAccountData,
    tx?: PrismaTransactionClient
  ): Promise<SupplierAccountDomain> {
    const client = tx ?? prisma;
    const account = await client.supplierAccount.create({
      data: {
        identityId: data.identityId,
        businessName: data.businessName,
        payoutBankDetails: data.payoutBankDetails as any,
        status: "PENDING_VERIFICATION",
      },
    });

    return this.toDomain(account);
  }

  /**
   * Update supplier account.
   * @throws NotFoundError if account doesn't exist
   */
  async update(
    id: string,
    data: UpdateSupplierAccountData,
    tx?: PrismaTransactionClient
  ): Promise<SupplierAccountDomain> {
    const client = tx ?? prisma;

    try {
      const account = await client.supplierAccount.update({
        where: { id },
        data: {
          businessName: data.businessName,
          status: data.status,
          verificationApprovedAt: data.verificationApprovedAt,
          verificationApprovedBy: data.verificationApprovedBy,
          payoutBankDetails: data.payoutBankDetails as any,
        },
      });

      return this.toDomain(account);
    } catch (error) {
      if (
        error &&
        typeof error === "object" &&
        "code" in error &&
        error.code === "P2025"
      ) {
        throw new NotFoundError("SupplierAccount", id);
      }
      throw error;
    }
  }

  /**
   * Map Prisma model to domain type.
   */
  private toDomain(account: SupplierAccount): SupplierAccountDomain {
    return {
      id: account.id,
      identityId: account.identityId,
      businessName: account.businessName,
      status: account.status,
      verificationApprovedAt: account.verificationApprovedAt,
      verificationApprovedBy: account.verificationApprovedBy,
      payoutBankDetails: account.payoutBankDetails as Record<
        string,
        unknown
      > | null,
      createdAt: account.createdAt,
      updatedAt: account.updatedAt,
    };
  }
}

/**
 * Singleton instance for use in services.
 */
export const supplierAccountRepository = new SupplierAccountRepository();
