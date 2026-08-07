/**
 * Tamaiyyo — One-way corridor admin API.
 *
 * POST /api/v1/admin/one-way-corridors — Create corridor
 * GET /api/v1/admin/one-way-corridors — List corridors
 */

import { NextRequest, NextResponse } from "next/server";
import { validateDto } from "@/lib/validation";
import {
  CreateOneWayCorridorSchema,
  ListOneWayCorridorsSchema,
} from "@/lib/validation/schemas/corridor-schemas";
import { oneWayCorridorService } from "@/lib/services/pricing/one-way-corridor-service";
import { isOperationalError } from "@/lib/errors";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const validatedData = validateDto(CreateOneWayCorridorSchema, body);

    // TODO: Replace with Better Auth admin identity extraction
    const adminId =
      request.headers.get("x-mock-admin-id") || "mock-admin-1";

    const corridor = await oneWayCorridorService.createCorridor({
      sourceCity: validatedData.sourceCity,
      destinationCity: validatedData.destinationCity,
      vehicleCategory: validatedData.vehicleCategory,
      fareAmount: validatedData.fareAmount,
      routeDistanceKm: validatedData.routeDistanceKm,
      returnDistanceKm: validatedData.returnDistanceKm,
      isActive: validatedData.isActive,
    });

    return NextResponse.json(
      {
        success: true,
        data: corridor,
        message: `One-way corridor created by ${adminId}`,
      },
      { status: 201 }
    );
  } catch (error) {
    if (isOperationalError(error)) {
      const statusCode = error.name === "ValidationError" ? 400 : 500;
      return NextResponse.json(
        {
          success: false,
          error: {
            message: error.message,
            code: error.name,
            details: "details" in error ? error.details : undefined,
          },
        },
        { status: statusCode }
      );
    }

    console.error(
      "Unexpected error in POST /api/v1/admin/one-way-corridors:",
      error
    );
    return NextResponse.json(
      {
        success: false,
        error: {
          message: "An unexpected error occurred",
          code: "INTERNAL_ERROR",
        },
      },
      { status: 500 }
    );
  }
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const params = Object.fromEntries(searchParams.entries());
    const validatedData = validateDto(ListOneWayCorridorsSchema, params);

    const corridors = await oneWayCorridorService.listCorridors({
      sourceCity: validatedData.sourceCity,
      destinationCity: validatedData.destinationCity,
      vehicleCategory: validatedData.vehicleCategory,
      offset: validatedData.offset,
      limit: validatedData.limit,
    });

    return NextResponse.json(
      {
        success: true,
        data: corridors,
      },
      { status: 200 }
    );
  } catch (error) {
    if (isOperationalError(error)) {
      const statusCode = error.name === "ValidationError" ? 400 : 500;
      return NextResponse.json(
        {
          success: false,
          error: {
            message: error.message,
            code: error.name,
            details: "details" in error ? error.details : undefined,
          },
        },
        { status: statusCode }
      );
    }

    console.error(
      "Unexpected error in GET /api/v1/admin/one-way-corridors:",
      error
    );
    return NextResponse.json(
      {
        success: false,
        error: {
          message: "An unexpected error occurred",
          code: "INTERNAL_ERROR",
        },
      },
      { status: 500 }
    );
  }
}
