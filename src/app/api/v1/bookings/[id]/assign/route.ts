/**
 * Tamayo — POST /api/v1/bookings/[id]/assign
 *
 * Assign vehicle and driver to booking (supplier action).
 */

import { NextRequest, NextResponse } from "next/server";
import { assignmentService } from "@/lib/services/assignment/assignment-service";
import { validateDto } from "@/lib/validation";
import { AssignVehicleDriverSchema } from "@/lib/validation/schemas/assignment-schemas";
import { isOperationalError } from "@/lib/errors";

export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const body = await request.json();
    const validatedData = validateDto(AssignVehicleDriverSchema, {
      ...body,
      bookingId: params.id,
    });

    // TODO: Replace with Better Auth supplier identity extraction
    const supplierId =
      request.headers.get("x-mock-supplier-id") || "mock-supplier-1";

    const booking = await assignmentService.assignVehicleDriver({
      bookingId: params.id,
      supplierId,
      vehicleId: validatedData.vehicleId,
      driverId: validatedData.driverId,
    });

    return NextResponse.json(
      {
        success: true,
        data: booking,
        message: "Vehicle and driver assigned successfully",
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

    console.error(
      `Unexpected error in POST /api/v1/bookings/${params.id}/assign:`,
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
