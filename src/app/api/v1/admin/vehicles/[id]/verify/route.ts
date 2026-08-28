/**
 * Tamayo — POST /api/v1/admin/vehicles/[id]/verify
 *
 * Admin verification of vehicles (approve/reject with optional corrections).
 */

import { NextRequest, NextResponse } from "next/server";
import { vehicleService } from "@/lib/services/vehicle/vehicle-service";
import { validateDto } from "@/lib/validation";
import { AdminVehicleVerificationSchema } from "@/lib/validation/schemas/vehicle-schemas";
import { isOperationalError } from "@/lib/errors";

export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const body = await request.json();
    const validatedData = validateDto(AdminVehicleVerificationSchema, {
      ...body,
      vehicleId: params.id,
    });

    // TODO: Replace with Better Auth admin identity extraction
    const adminId = request.headers.get("x-mock-admin-id") || "mock-admin-1";

    // Verify vehicle with optional corrections
    const vehicle = await vehicleService.verifyVehicle(
      params.id,
      validatedData.action,
      adminId,
      {
        category: validatedData.correctedCategory,
        ageYears: validatedData.correctedAgeYears,
      },
      validatedData.reason
    );

    return NextResponse.json(
      {
        success: true,
        data: vehicle,
        message:
          validatedData.action === "APPROVE"
            ? "Vehicle approved successfully"
            : "Vehicle rejected",
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

    console.error(
      `Unexpected error in POST /api/v1/admin/vehicles/${params.id}/verify:`,
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
