/**
 * Tamayo — VehicleService.
 *
 * Architecture:
 * - Orchestrates vehicle inventory workflows
 * - Owns business rules and status transitions
 * - Manages transactions
 * - Never exposes Prisma directly
 */

import { VehicleStatus, VehicleCategory, FuelType } from "@prisma/client";
import {
  vehicleRepository,
  type VehicleDomain,
  type CreateVehicleData,
  type UpdateVehicleData,
} from "@/lib/repositories/vehicle/vehicle-repository";
import { supplierAccountRepository } from "@/lib/repositories/identity/supplier-repository";
import prisma from "@/lib/db/prisma";
import { withTransaction } from "@/lib/db/transactions";
import {
  ValidationError,
  NotFoundError,
  ConflictError,
  ForbiddenError,
} from "@/lib/errors";

/**
 * DTO for vehicle creation.
 */
export interface CreateVehicle {
  supplierId: string;
  registrationNumber: string;
  category: VehicleCategory;
  ageYears?: number;
  fuelType: FuelType;
}

/**
 * DTO for vehicle update.
 */
export interface UpdateVehicle {
  vehicleId: string;
  registrationNumber?: string;
  category?: VehicleCategory;
  ageYears?: number;
  fuelType?: FuelType;
}

/**
 * VehicleService — business logic for vehicle inventory.
 */
export class VehicleService {
  /**
   * Create new vehicle.
   * Validates supplier exists and is active.
   */
  async createVehicle(data: CreateVehicle): Promise<VehicleDomain> {
    return withTransaction(prisma, async (tx) => {
      // Validate supplier exists and is active/pending
      const supplier = await supplierAccountRepository.findById(
        data.supplierId,
        tx
      );

      if (
        supplier.status !== "ACTIVE" &&
        supplier.status !== "PENDING_VERIFICATION"
      ) {
        throw new ForbiddenError(
          "Only active or pending suppliers can add vehicles"
        );
      }

      // Validate age if provided
      if (data.ageYears !== undefined) {
        if (data.ageYears < 0 || data.ageYears > 20) {
          throw new ValidationError("Vehicle age must be between 0 and 20 years");
        }
      }

      // Create vehicle
      const createData: CreateVehicleData = {
        supplierId: data.supplierId,
        registrationNumber: data.registrationNumber.toUpperCase().trim(),
        category: data.category,
        ageYears: data.ageYears,
        fuelType: data.fuelType,
      };

      return vehicleRepository.create(createData, tx);
    });
  }

  /**
   * Update vehicle (supplier edit before verification).
   */
  async updateVehicle(data: UpdateVehicle): Promise<VehicleDomain> {
    return withTransaction(prisma, async (tx) => {
      const vehicle = await vehicleRepository.findById(data.vehicleId, tx);

      // Can only update if in PENDING_VERIFICATION
      if (vehicle.status !== "PENDING_VERIFICATION") {
        throw new ForbiddenError(
          "Can only update vehicles in pending verification status"
        );
      }

      // Validate age if provided
      if (data.ageYears !== undefined) {
        if (data.ageYears < 0 || data.ageYears > 20) {
          throw new ValidationError("Vehicle age must be between 0 and 20 years");
        }
      }

      const updateData: UpdateVehicleData = {};
      if (data.registrationNumber)
        updateData.registrationNumber = data.registrationNumber
          .toUpperCase()
          .trim();
      if (data.category) updateData.category = data.category;
      if (data.ageYears !== undefined) updateData.ageYears = data.ageYears;
      if (data.fuelType) updateData.fuelType = data.fuelType;

      return vehicleRepository.update(vehicle.id, updateData, tx);
    });
  }

  /**
   * Get vehicle by ID.
   */
  async getVehicleById(id: string): Promise<VehicleDomain> {
    return vehicleRepository.findById(id);
  }

  /**
   * List vehicles with filters.
   */
  async listVehicles(
    filters: {
      supplierId?: string;
      status?: VehicleStatus;
      category?: VehicleCategory;
    },
    offset: number = 0,
    limit: number = 20
  ): Promise<{
    vehicles: VehicleDomain[];
    total: number;
    offset: number;
    limit: number;
  }> {
    const [vehicles, total] = await Promise.all([
      vehicleRepository.list(filters, offset, limit),
      vehicleRepository.count(filters),
    ]);

    return {
      vehicles,
      total,
      offset,
      limit,
    };
  }

  /**
   * Update vehicle status (admin or supplier action).
   * Enforces status transition rules.
   */
  async updateVehicleStatus(
    vehicleId: string,
    status: VehicleStatus,
    reason?: string
  ): Promise<VehicleDomain> {
    return withTransaction(prisma, async (tx) => {
      const vehicle = await vehicleRepository.findById(vehicleId, tx);

      // Business rules for status transitions
      if (status === "ACTIVE") {
        // Can activate from PENDING_VERIFICATION, INACTIVE, or SUSPENDED
        if (
          vehicle.status !== "PENDING_VERIFICATION" &&
          vehicle.status !== "INACTIVE" &&
          vehicle.status !== "SUSPENDED"
        ) {
          throw new ValidationError(
            `Cannot activate vehicle from ${vehicle.status} status`
          );
        }
      }

      if (status === "INACTIVE") {
        // Can deactivate from ACTIVE
        if (vehicle.status !== "ACTIVE") {
          throw new ValidationError(
            `Cannot deactivate vehicle from ${vehicle.status} status`
          );
        }
      }

      if (status === "SUSPENDED") {
        // Can suspend from ACTIVE or INACTIVE
        if (vehicle.status !== "ACTIVE" && vehicle.status !== "INACTIVE") {
          throw new ValidationError(
            `Cannot suspend vehicle from ${vehicle.status} status`
          );
        }
      }

      if (status === "REMOVED") {
        // Can remove from any status except ON_TRIP
        if (vehicle.status === "ON_TRIP") {
          throw new ValidationError("Cannot remove vehicle while on trip");
        }
      }

      return vehicleRepository.update(vehicleId, { status }, tx);
    });
  }

  /**
   * Soft-delete vehicle (supplier action).
   * Sets deletedAt timestamp and transitions to REMOVED.
   */
  async deleteVehicle(vehicleId: string): Promise<VehicleDomain> {
    return withTransaction(prisma, async (tx) => {
      const vehicle = await vehicleRepository.findById(vehicleId, tx);

      // Cannot delete vehicle on trip
      if (vehicle.status === "ON_TRIP") {
        throw new ValidationError("Cannot delete vehicle while on trip");
      }

      // Transition to REMOVED
      await vehicleRepository.update(vehicleId, { status: "REMOVED" }, tx);

      // Soft-delete
      return vehicleRepository.softDelete(vehicleId, tx);
    });
  }

  /**
   * Admin verify vehicle (approve/reject with optional corrections).
   */
  async verifyVehicle(
    vehicleId: string,
    action: "APPROVE" | "REJECT",
    adminId: string,
    corrections?: {
      category?: VehicleCategory;
      ageYears?: number;
    },
    reason?: string
  ): Promise<VehicleDomain> {
    return withTransaction(prisma, async (tx) => {
      const vehicle = await vehicleRepository.findById(vehicleId, tx);

      // Can only verify from PENDING_VERIFICATION
      if (vehicle.status !== "PENDING_VERIFICATION") {
        throw new ValidationError(
          "Can only verify vehicles in pending verification status"
        );
      }

      if (action === "APPROVE") {
        // Apply corrections if provided
        const updateData: UpdateVehicleData = {
          status: "ACTIVE",
        };

        if (corrections?.category) {
          updateData.category = corrections.category;
        }

        if (corrections?.ageYears !== undefined) {
          updateData.ageYears = corrections.ageYears;
        }

        return vehicleRepository.update(vehicleId, updateData, tx);
      }

      if (action === "REJECT") {
        // Transition to SUSPENDED (rejected vehicles cannot be activated without resubmission)
        return vehicleRepository.update(
          vehicleId,
          { status: "SUSPENDED" },
          tx
        );
      }

      throw new ValidationError(`Invalid verification action: ${action}`);
    });
  }
}

/**
 * Singleton instance for use in API handlers.
 */
export const vehicleService = new VehicleService();
