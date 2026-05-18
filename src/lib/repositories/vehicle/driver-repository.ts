/**
 * Tamaiyyo — Driver repository.
 *
 * Architecture:
 * - Prisma queries for driver records
 * - Soft-delete filtering (deletedAt IS NULL)
 * - Maps to domain types (ORM-agnostic)
 */

import type { Driver, DriverStatus } from "@prisma/client";
import prisma from "@/lib/db/prisma";
import type { PrismaTransactionClient } from "@/lib/db/types";
import { NotFoundError } from "@/lib/errors";

/**
 * Domain type for Driver (ORM-agnostic).
 */
export interface DriverDomain {
  id: string;
  supplierId: string;
  name: string;
  phone: string;
  licenseNumber: string | null;
  status: DriverStatus;
  deletedAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
}

/**
 * List query filters.
 */
export interface DriverListFilters {
  supplierId?: string;
  status?: DriverStatus;
  includeDeleted?: boolean;
}

/**
 * DriverRepository — Prisma data access for drivers.
 */
export class DriverRepository {
  /**
   * Find driver by ID.
   * @throws NotFoundError if driver doesn't exist
   */
  async findById(
    id: string,
    tx?: PrismaTransactionClient
  ): Promise<DriverDomain> {
    const client = tx ?? prisma;
    const driver = await client.driver.findUnique({
      where: { id },
    });

    if (!driver) {
      throw new NotFoundError("Driver", id);
    }

    return this.toDomain(driver);
  }

  /**
   * Find driver by ID (returns null if not found).
   */
  async findByIdOrNull(
    id: string,
    tx?: PrismaTransactionClient
  ): Promise<DriverDomain | null> {
    const client = tx ?? prisma;
    const driver = await client.driver.findUnique({
      where: { id },
    });

    return driver ? this.toDomain(driver) : null;
  }

  /**
   * List drivers with filters.
   */
  async list(
    filters: DriverListFilters,
    offset: number = 0,
    limit: number = 20,
    tx?: PrismaTransactionClient
  ): Promise<DriverDomain[]> {
    const client = tx ?? prisma;

    const where: any = {};

    if (filters.supplierId) {
      where.supplierId = filters.supplierId;
    }

    if (filters.status) {
      where.status = filters.status;
    }

    // Soft-delete filtering
    if (!filters.includeDeleted) {
      where.deletedAt = null;
    }

    const drivers = await client.driver.findMany({
      where,
      orderBy: { createdAt: "desc" },
      skip: offset,
      take: limit,
    });

    return drivers.map((d: Driver) => this.toDomain(d));
  }

  /**
   * Map Prisma model to domain type.
   */
  private toDomain(driver: Driver): DriverDomain {
    return {
      id: driver.id,
      supplierId: driver.supplierId,
      name: driver.name,
      phone: driver.phone,
      licenseNumber: driver.licenseNumber,
      status: driver.status,
      deletedAt: driver.deletedAt,
      createdAt: driver.createdAt,
      updatedAt: driver.updatedAt,
    };
  }
}

/**
 * Singleton instance for use in services.
 */
export const driverRepository = new DriverRepository();
