/**
 * Tamaiyyo — Vehicle detail API routes.
 *
 * GET /api/v1/vehicles/[id] — Get vehicle details
 * PATCH /api/v1/vehicles/[id] — Update vehicle
 * DELETE /api/v1/vehicles/[id] — Soft-delete vehicle
 */

import { NextRequest, NextResponse } from "next/server";
import { vehicleService } from "@/lib/services/vehicle/vehicle-service";
import { validateDto } from "@/lib/validation";
import { UpdateVehicleSchema } from "@/lib/validation/schemas/vehicle-schemas";
import { isOperationalError } from "@/lib/errors";

/**
 * GET /api/v1/vehicles/[id]
 */
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const vehicle = await vehicleService.getVehicleById(params.id);

    return NextResponse.json(
      {
        success: true,
        data: vehicle,
      },
      { status: 200 }
    );
  } catch (error) {
    if (isOperationalError(error)) {
      const statusCode = error.name === "NotFoundError" ? 404 : 500;

      return NextResponse.json(
        {
          success: false,
          error: {
            message: error.message,
            code: error.name,
          },
        },
        { status: statusCode }
      );
    }

    console.error(`Unexpected error in GET /api/v1/vehicles/${params.id}:`, error);
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
 * PATCH /api/v1/vehicles/[id]
 */
export async function PATCH(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const body = await request.json();
    const validatedData = validateDto(UpdateVehicleSchema, {
      ...body,
      vehicleId: params.id,
    });

    const vehicle = await vehicleService.updateVehicle({
      vehicleId: params.id,
      registrationNumber: validatedData.registrationNumber,
      category: validatedData.category,
      ageYears: validatedData.ageYears,
      fuelType: validatedData.fuelType,
    });

    return NextResponse.json(
      {
        success: true,
        data: vehicle,
      },
      { status: 200 }
    );
  } catch (error) {
    if (isOperationalError(error)) {
      const statusCode =
        error.name === "ValidationError"
          ? 400
          : error.name === "NotFoundError"
          ? 404
          : error.name === "ForbiddenError"
          ? 403
          : 500;

      return NextResponse.json(
        {
          success: false,
          error: {
            message: error.message,
            code: error.name,
          },
        },
        { status: statusCode }
      );
    }

    console.error(`Unexpected error in PATCH /api/v1/vehicles/${params.id}:`, error);
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
 * DELETE /api/v1/vehicles/[id]
 */
export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const vehicle = await vehicleService.deleteVehicle(params.id);

    return NextResponse.json(
      {
        success: true,
        data: vehicle,
        message: "Vehicle deleted successfully",
      },
      { status: 200 }
    );
  } catch (error) {
    if (isOperationalError(error)) {
      const statusCode =
        error.name === "ValidationError"
          ? 400
          : error.name === "NotFoundError"
          ? 404
          : 500;

      return NextResponse.json(
        {
          success: false,
          error: {
            message: error.message,
            code: error.name,
          },
        },
        { status: statusCode }
      );
    }

    console.error(`Unexpected error in DELETE /api/v1/vehicles/${params.id}:`, error);
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
