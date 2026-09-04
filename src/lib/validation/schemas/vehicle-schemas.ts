/**
 * Tamayo — Vehicle onboarding validation schemas.
 *
 * Architecture:
 * - DTOs for vehicle creation
 * - Admin verification actions
 * - Aligns with vehicle-management.md and vehicle-domain-model.md
 */

import { z } from "zod";
import { commonSchemas } from "../primitives";
import {
  VehicleCategory,
  FuelType,
  VehicleStatus,
} from "@prisma/client";

/**
 * Vehicle creation schema (supplier-initiated).
 */
export const CreateVehicleSchema = z.object({
  supplierId: commonSchemas.uuid,
  registrationNumber: z
    .string()
    .min(1)
    .max(20)
    .regex(/^[A-Z0-9\s-]+$/, {
      message:
        "Registration number must contain only uppercase letters, numbers, spaces, and hyphens",
    })
    .transform((val) => val.toUpperCase().trim()),
  category: z.enum([
    VehicleCategory.SEDAN,
    VehicleCategory.ERTIGA,
    VehicleCategory.KIA_CARENS,
    VehicleCategory.INNOVA_CRYSTA,
    VehicleCategory.TEMPO_TRAVELLER,
  ]),
  ageYears: commonSchemas.nonNegativeInt.optional(),
  fuelType: z.enum([
    FuelType.PETROL,
    FuelType.DIESEL,
    FuelType.CNG,
    FuelType.EV,
  ]),
});

export type CreateVehicle = z.infer<typeof CreateVehicleSchema>;

/**
 * Update vehicle schema (supplier edit before verification).
 */
export const UpdateVehicleSchema = z.object({
  vehicleId: commonSchemas.uuid,
  registrationNumber: z
    .string()
    .min(1)
    .max(20)
    .regex(/^[A-Z0-9\s-]+$/)
    .transform((val) => val.toUpperCase().trim())
    .optional(),
  category: z
    .enum([
      VehicleCategory.SEDAN,
      VehicleCategory.ERTIGA,
      VehicleCategory.KIA_CARENS,
      VehicleCategory.INNOVA_CRYSTA,
      VehicleCategory.TEMPO_TRAVELLER,
    ])
    .optional(),
  ageYears: commonSchemas.nonNegativeInt.optional(),
  fuelType: z
    .enum([FuelType.PETROL, FuelType.DIESEL, FuelType.CNG, FuelType.EV])
    .optional(),
});

export type UpdateVehicle = z.infer<typeof UpdateVehicleSchema>;

/**
 * Admin vehicle verification action schema.
 */
export const AdminVehicleVerificationSchema = z.object({
  vehicleId: commonSchemas.uuid,
  action: z.enum(["APPROVE", "REJECT"]),
  reason: z.string().optional(), // Required for REJECT
  // Optional: admin may correct category/age bucket during verification
  correctedCategory: z
    .enum([
      VehicleCategory.SEDAN,
      VehicleCategory.ERTIGA,
      VehicleCategory.KIA_CARENS,
      VehicleCategory.INNOVA_CRYSTA,
      VehicleCategory.TEMPO_TRAVELLER,
    ])
    .optional(),
  correctedAgeYears: commonSchemas.nonNegativeInt.optional(),
});

export type AdminVehicleVerification = z.infer<
  typeof AdminVehicleVerificationSchema
>;

/**
 * Update vehicle status schema (admin/supplier action).
 */
export const UpdateVehicleStatusSchema = z.object({
  vehicleId: commonSchemas.uuid,
  status: z.enum([
    VehicleStatus.ACTIVE,
    VehicleStatus.INACTIVE,
    VehicleStatus.SUSPENDED,
    VehicleStatus.REMOVED,
  ]),
  reason: z.string().optional(),
});

export type UpdateVehicleStatus = z.infer<typeof UpdateVehicleStatusSchema>;
