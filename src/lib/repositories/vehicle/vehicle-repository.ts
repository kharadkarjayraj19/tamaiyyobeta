/**
 * Tamaiyyo — Vehicle repository.
 *
 * Architecture:
 * - Prisma queries for vehicle inventory
 * - Soft-delete filtering (deletedAt IS NULL)
 * - Maps to domain types (ORM-agnostic)
 * - Supports transaction participation
 */

import type {
  Vehicle,
  VehicleStatus,
  VehicleCategory,
  AgeBucket,
  FuelType,
} from "@prisma/client";
import prisma from "@/lib/db/prisma";
import type { PrismaTransactionClient } from "@/lib/db/types";
import { NotFoundError, ConflictError } from "@/lib/errors";

/**
 * Domain type for Vehicle (ORM-agnostic).
 */
export interface VehicleDomain {
  id: string;
  supplierId: string;
  registrationNumber: string;
  category: VehicleCategory;
  ageYears: number | null;
  ageBucket: AgeBucket | null;
  fuelType: FuelType;
  status: VehicleStatus;
  deletedAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
}

/**
 * DTO for creating a vehicle.
 */
export interface CreateVehicleData {
  supplierId: string;
  registrationNumber: string;
  category: VehicleCategory;
  ageYears?: number;
  fuelType: FuelType;
}

/**
 * DTO for updating a vehicle.
 */
export interface UpdateVehicleData {
  registrationNumber?: string;
  category?: VehicleCategory;
  ageYears?: number;
  ageBucket?: AgeBucket;
  fuelType?: FuelType;
  status?: VehicleStatus;
}

/**
 * List query filters.
 */
export interface VehicleListFilters {
  supplierId?: string;
  status?: VehicleStatus;
  category?: VehicleCategory;
  includeDeleted?: boolean;
}

/**
 * VehicleRepository — Prisma data access for vehicle inventory.
 */
export class VehicleRepository {
  /**
   * Find vehicle by ID.
   * @throws NotFoundError if vehicle doesn't exist
   */
  async findById(
    id: string,
    tx?: PrismaTransactionClient
  ): Promise<VehicleDomain> {
    const client = tx ?? prisma;
    const vehicle = await client.vehicle.findUnique({
      where: { id },
    });

    if (!vehicle) {
      throw new NotFoundError("Vehicle", id);
    }

    return this.toDomain(vehicle);
  }

  /**
   * Find vehicle by ID (returns null if not found).
   */
  async findByIdOrNull(
    id: string,
    tx?: PrismaTransactionClient
  ): Promise<VehicleDomain | null> {
    const client = tx ?? prisma;
    const vehicle = await client.vehicle.findUnique({
      where: { id },
    });

    return vehicle ? this.toDomain(vehicle) : null;
  }

  /**
   * Find vehicle by registration number (active only).
   * Used for uniqueness validation.
   */
  async findByRegistrationNumber(
    registrationNumber: string,
    tx?: PrismaTransactionClient
  ): Promise<VehicleDomain | null> {
    const client = tx ?? prisma;
    const vehicle = await client.vehicle.findFirst({
      where: {
        registrationNumber,
        deletedAt: null, // Only active registrations
      },
    });

    return vehicle ? this.toDomain(vehicle) : null;
  }

  /**
   * List vehicles with filters and pagination.
   */
  async list(
    filters: VehicleListFilters,
    offset: number = 0,
    limit: number = 20,
    tx?: PrismaTransactionClient
  ): Promise<VehicleDomain[]> {
    const client = tx ?? prisma;

    const where: any = {};

    if (filters.supplierId) {
      where.supplierId = filters.supplierId;
    }

    if (filters.status) {
      where.status = filters.status;
    }

    if (filters.category) {
      where.category = filters.category;
    }

    // Soft-delete filtering
    if (!filters.includeDeleted) {
      where.deletedAt = null;
    }

    const vehicles = await client.vehicle.findMany({
      where,
      orderBy: { createdAt: "desc" },
      skip: offset,
      take: limit,
    });

    return vehicles.map((v: Vehicle) => this.toDomain(v));
  }

  /**
   * Count vehicles matching filters.
   */
  async count(
    filters: VehicleListFilters,
    tx?: PrismaTransactionClient
  ): Promise<number> {
    const client = tx ?? prisma;

    const where: any = {};

    if (filters.supplierId) {
      where.supplierId = filters.supplierId;
    }

    if (filters.status) {
      where.status = filters.status;
    }

    if (filters.category) {
      where.category = filters.category;
    }

    // Soft-delete filtering
    if (!filters.includeDeleted) {
      where.deletedAt = null;
    }

    return client.vehicle.count({ where });
  }

  /**
   * Create a new vehicle.
   * @throws ConflictError if registration number already exists (active)
   */
  async create(
    data: CreateVehicleData,
    tx?: PrismaTransactionClient
  ): Promise<VehicleDomain> {
    const client = tx ?? prisma;

    // Check registration number uniqueness (active vehicles only)
    const existing = await this.findByRegistrationNumber(
      data.registrationNumber,
      tx
    );
    if (existing) {
      throw new ConflictError(
        `Vehicle with registration number ${data.registrationNumber} already exists`,
        { registrationNumber: data.registrationNumber }
      );
    }

    // Calculate age bucket if age provided
    const ageBucket = data.ageYears
      ? this.calculateAgeBucket(data.ageYears)
      : null;

    const vehicle = await client.vehicle.create({
      data: {
        supplierId: data.supplierId,
        registrationNumber: data.registrationNumber,
        category: data.category,
        ageYears: data.ageYears,
        ageBucket,
        fuelType: data.fuelType,
        status: "PENDING_VERIFICATION",
      },
    });

    return this.toDomain(vehicle);
  }

  /**
   * Update vehicle.
   * @throws NotFoundError if vehicle doesn't exist
   */
  async update(
    id: string,
    data: UpdateVehicleData,
    tx?: PrismaTransactionClient
  ): Promise<VehicleDomain> {
    const client = tx ?? prisma;

    // If ageYears updated, recalculate ageBucket
    const updateData: any = { ...data };
    if (data.ageYears !== undefined) {
      updateData.ageBucket = this.calculateAgeBucket(data.ageYears);
    }

    try {
      const vehicle = await client.vehicle.update({
        where: { id },
        data: updateData,
      });

      return this.toDomain(vehicle);
    } catch (error) {
      if (
        error &&
        typeof error === "object" &&
        "code" in error &&
        error.code === "P2025"
      ) {
        throw new NotFoundError("Vehicle", id);
      }
      throw error;
    }
  }

  /**
   * Soft-delete vehicle.
   * Sets deletedAt timestamp.
   */
  async softDelete(
    id: string,
    tx?: PrismaTransactionClient
  ): Promise<VehicleDomain> {
    const client = tx ?? prisma;

    try {
      const vehicle = await client.vehicle.update({
        where: { id },
        data: { deletedAt: new Date() },
      });

      return this.toDomain(vehicle);
    } catch (error) {
      if (
        error &&
        typeof error === "object" &&
        "code" in error &&
        error.code === "P2025"
      ) {
        throw new NotFoundError("Vehicle", id);
      }
      throw error;
    }
  }

  /**
   * Calculate age bucket from age years.
   * Per pricing-engine.md §4: 0-3, 3-7, 7-12 years.
   */
  private calculateAgeBucket(ageYears: number): AgeBucket {
    if (ageYears < 3) {
      return "ZERO_TO_THREE";
    } else if (ageYears < 7) {
      return "THREE_TO_SEVEN";
    } else {
      return "SEVEN_TO_TWELVE";
    }
  }

  /**
   * Map Prisma model to domain type.
   */
  private toDomain(vehicle: Vehicle): VehicleDomain {
    return {
      id: vehicle.id,
      supplierId: vehicle.supplierId,
      registrationNumber: vehicle.registrationNumber,
      category: vehicle.category,
      ageYears: vehicle.ageYears,
      ageBucket: vehicle.ageBucket,
      fuelType: vehicle.fuelType,
      status: vehicle.status,
      deletedAt: vehicle.deletedAt,
      createdAt: vehicle.createdAt,
      updatedAt: vehicle.updatedAt,
    };
  }
}

/**
 * Singleton instance for use in services.
 */
export const vehicleRepository = new VehicleRepository();
