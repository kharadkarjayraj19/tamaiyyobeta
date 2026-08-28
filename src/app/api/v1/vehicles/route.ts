/**
 * Tamayo — Vehicle API routes.
 *
 * POST /api/v1/vehicles — Create vehicle
 * GET /api/v1/vehicles — List vehicles
 */

import { NextRequest, NextResponse } from "next/server";
import { vehicleService } from "@/lib/services/vehicle/vehicle-service";
import { validateDto } from "@/lib/validation";
import { CreateVehicleSchema } from "@/lib/validation/schemas/vehicle-schemas";
import { isOperationalError } from "@/lib/errors";
import { VehicleStatus, VehicleCategory } from "@prisma/client";

/**
 * POST /api/v1/vehicles — Create vehicle
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const validatedData = validateDto(CreateVehicleSchema, body);

    const vehicle = await vehicleService.createVehicle({
      supplierId: validatedData.supplierId,
      registrationNumber: validatedData.registrationNumber,
      category: validatedData.category,
      ageYears: validatedData.ageYears,
      fuelType: validatedData.fuelType,
    });

    return NextResponse.json(
      {
        success: true,
        data: vehicle,
        message: "Vehicle created successfully. Awaiting admin verification.",
      },
      { status: 201 }
    );
  } catch (error) {
    if (isOperationalError(error)) {
      const statusCode =
        error.name === "ValidationError"
          ? 400
          : error.name === "ConflictError"
          ? 409
          : error.name === "ForbiddenError"
          ? 403
          : 500;

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

    console.error("Unexpected error in POST /api/v1/vehicles:", error);
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

/**
 * GET /api/v1/vehicles — List vehicles
 */
export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;

    const supplierId = searchParams.get("supplierId");
    const status = searchParams.get("status") as VehicleStatus | null;
    const category = searchParams.get("category") as VehicleCategory | null;
    const offset = parseInt(searchParams.get("offset") || "0", 10);
    const limit = Math.min(
      parseInt(searchParams.get("limit") || "20", 10),
      100
    );

    const filters: any = {};
    if (supplierId) filters.supplierId = supplierId;
    if (status) filters.status = status;
    if (category) filters.category = category;

    const result = await vehicleService.listVehicles(filters, offset, limit);

    return NextResponse.json(
      {
        success: true,
        data: result.vehicles,
        pagination: {
          total: result.total,
          offset: result.offset,
          limit: result.limit,
        },
      },
      { status: 200 }
    );
  } catch (error) {
    console.error("Unexpected error in GET /api/v1/vehicles:", error);
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
