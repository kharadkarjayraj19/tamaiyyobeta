/**
 * Tamayo — One-way corridor repository.
 *
 * Architecture:
 * - Prisma queries for admin-configured one-way corridors
 * - Supports corridor lookup for ONE_WAY pricing
 * - No business logic; services orchestrate usage
 */

import type { OneWayCorridor, VehicleCategory, Prisma } from "@prisma/client";
import prisma from "@/lib/db/prisma";
import type { PrismaTransactionClient } from "@/lib/db/types";
import { NotFoundError } from "@/lib/errors";

type Decimal = Prisma.Decimal;

/**
 * Domain type for OneWayCorridor (ORM-agnostic).
 */
export interface OneWayCorridorDomain {
  id: string;
  sourceCity: string;
  destinationCity: string;
  vehicleCategory: VehicleCategory;
  fareAmount: Decimal;
  routeDistanceKm: number | null;
  returnDistanceKm: number | null;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

/**
 * DTO for creating a one-way corridor.
 */
export interface CreateOneWayCorridorData {
  sourceCity: string;
  destinationCity: string;
  vehicleCategory: VehicleCategory;
  fareAmount: Decimal;
  routeDistanceKm?: number;
  returnDistanceKm?: number;
  isActive?: boolean;
}

/**
 * OneWayCorridorRepository — Prisma data access for corridors.
 */
export class OneWayCorridorRepository {
  async findById(
    id: string,
    tx?: PrismaTransactionClient
  ): Promise<OneWayCorridorDomain> {
    const client = tx ?? prisma;
    const corridor = await client.oneWayCorridor.findUnique({ where: { id } });

    if (!corridor) {
      throw new NotFoundError("OneWayCorridor", id);
    }

    return this.toDomain(corridor);
  }

  async findActiveByRoute(params: {
    sourceCity: string;
    destinationCity: string;
    vehicleCategory: VehicleCategory;
  }): Promise<OneWayCorridorDomain | null> {
    const corridor = await prisma.oneWayCorridor.findFirst({
      where: {
        sourceCity: params.sourceCity,
        destinationCity: params.destinationCity,
        vehicleCategory: params.vehicleCategory,
        isActive: true,
      },
    });

    return corridor ? this.toDomain(corridor) : null;
  }

  async listActive(params: {
    sourceCity?: string;
    destinationCity?: string;
    vehicleCategory?: VehicleCategory;
    offset?: number;
    limit?: number;
  }): Promise<OneWayCorridorDomain[]> {
    const corridors = await prisma.oneWayCorridor.findMany({
      where: {
        isActive: true,
        sourceCity: params.sourceCity,
        destinationCity: params.destinationCity,
        vehicleCategory: params.vehicleCategory,
      },
      orderBy: { sourceCity: "asc" },
      skip: params.offset ?? 0,
      take: params.limit ?? 50,
    });

    return corridors.map((corridor) => this.toDomain(corridor));
  }

  async create(
    data: CreateOneWayCorridorData,
    tx?: PrismaTransactionClient
  ): Promise<OneWayCorridorDomain> {
    const client = tx ?? prisma;
    const corridor = await client.oneWayCorridor.create({
      data: {
        sourceCity: data.sourceCity,
        destinationCity: data.destinationCity,
        vehicleCategory: data.vehicleCategory,
        fareAmount: data.fareAmount,
        routeDistanceKm: data.routeDistanceKm,
        returnDistanceKm: data.returnDistanceKm,
        isActive: data.isActive ?? true,
      },
    });

    return this.toDomain(corridor);
  }

  private toDomain(corridor: OneWayCorridor): OneWayCorridorDomain {
    return {
      id: corridor.id,
      sourceCity: corridor.sourceCity,
      destinationCity: corridor.destinationCity,
      vehicleCategory: corridor.vehicleCategory,
      fareAmount: corridor.fareAmount,
      routeDistanceKm: corridor.routeDistanceKm,
      returnDistanceKm: corridor.returnDistanceKm,
      isActive: corridor.isActive,
      createdAt: corridor.createdAt,
      updatedAt: corridor.updatedAt,
    };
  }
}

export const oneWayCorridorRepository = new OneWayCorridorRepository();
