/**
 * Tamayo — POST /api/v1/bookings/[id]/complete
 *
 * Submit trip execution (supplier/driver submits actuals).
 */

import { NextRequest, NextResponse } from "next/server";
import { billingService } from "@/lib/services/billing/billing-service";
import { validateDto, SubmitTripExecutionSchema } from "@/lib/validation";
import { isOperationalError } from "@/lib/errors";

export async function POST(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const bookingId = params.id;
    const body = await req.json();

    // Validate DTO
    const data = validateDto(SubmitTripExecutionSchema, {
      ...body,
      bookingId,
    });

    // Mock supplier identity (replace with Better Auth later)
    const actorId = req.headers.get("x-mock-supplier-id") || "system";

    // Submit trip execution
    const result = await billingService.submitTripExecution({
      bookingId: data.bookingId,
      actualKm: data.actualKm,
      actualStartOdometer: data.actualStartOdometer,
      actualEndOdometer: data.actualEndOdometer,
      tollLines: data.tollLines,
      parkingLines: data.parkingLines,
      notes: data.notes,
      actorId,
    });

    return NextResponse.json({
      success: true,
      data: result,
    });
  } catch (error: any) {
    if (isOperationalError(error)) {
      return NextResponse.json(
        {
          success: false,
          error: {
            type: error.constructor.name,
            message: error.message,
          },
        },
        { status: error.constructor.name === "NotFoundError" ? 404 : 400 }
      );
    }

    console.error("POST /api/v1/bookings/[id]/complete error:", error);
    return NextResponse.json(
      {
        success: false,
        error: {
          type: "InternalServerError",
          message: "An unexpected error occurred",
        },
      },
      { status: 500 }
    );
  }
}
