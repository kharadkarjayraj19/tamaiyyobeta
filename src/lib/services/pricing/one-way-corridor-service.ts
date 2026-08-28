/**
 * Tamayo — OneWayCorridorService.
 *
 * Architecture:
 * - Orchestrates admin corridor creation and listing
 * - Owns simple validations (route completeness)
 */

import { Prisma } from "@prisma/client";
import {
  oneWayCorridorRepository,
  type CreateOneWayCorridorData,
} from "@/lib/repositories/pricing/one-way-corridor-repository";
import { ValidationError } from "@/lib/errors";

export class OneWayCorridorService {
  async createCorridor(data: Omit<CreateOneWayCorridorData, "fareAmount"> & {
    fareAmount: string;
  }) {
    if (data.sourceCity.trim() === data.destinationCity.trim()) {
      throw new ValidationError("Source and destination city must be different");
    }

    return oneWayCorridorRepository.create({
      ...data,
      fareAmount: new Prisma.Decimal(data.fareAmount),
    });
  }

  async listCorridors(params: {
    sourceCity?: string;
    destinationCity?: string;
    vehicleCategory?: CreateOneWayCorridorData["vehicleCategory"];
    offset?: number;
    limit?: number;
  }) {
    return oneWayCorridorRepository.listActive(params);
  }
}

export const oneWayCorridorService = new OneWayCorridorService();
