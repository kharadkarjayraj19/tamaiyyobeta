/**
 * Tamaiyyo — One-way corridor validation schemas.
 *
 * Architecture:
 * - DTOs for admin-managed one-way corridors
 * - Aligns with pricing-engine.md (corridor pricing)
 */

import { z } from "zod";
import { VehicleCategory } from "@prisma/client";
import { commonSchemas } from "../index";

export const CreateOneWayCorridorSchema = z.object({
  sourceCity: z.string().min(1).max(100),
  destinationCity: z.string().min(1).max(100),
  vehicleCategory: z.enum([
    VehicleCategory.SEDAN,
    VehicleCategory.ERTIGA,
    VehicleCategory.KIA_CARENS,
    VehicleCategory.INNOVA_CRYSTA,
    VehicleCategory.TEMPO_TRAVELLER,
  ]),
  fareAmount: commonSchemas.decimalString,
  routeDistanceKm: z.number().int().positive().optional(),
  returnDistanceKm: z.number().int().positive().optional(),
  isActive: z.boolean().optional(),
});

export type CreateOneWayCorridor = z.infer<typeof CreateOneWayCorridorSchema>;

export const ListOneWayCorridorsSchema = z.object({
  sourceCity: z.string().min(1).max(100).optional(),
  destinationCity: z.string().min(1).max(100).optional(),
  vehicleCategory: z
    .enum([
      VehicleCategory.SEDAN,
      VehicleCategory.ERTIGA,
      VehicleCategory.KIA_CARENS,
      VehicleCategory.INNOVA_CRYSTA,
      VehicleCategory.TEMPO_TRAVELLER,
    ])
    .optional(),
  offset: commonSchemas.paginationOffset,
  limit: commonSchemas.paginationLimit,
});

export type ListOneWayCorridors = z.infer<typeof ListOneWayCorridorsSchema>;
