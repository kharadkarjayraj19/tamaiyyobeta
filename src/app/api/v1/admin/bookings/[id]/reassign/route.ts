/**
 * Tamayo — POST /api/v1/admin/bookings/[id]/reassign
 *
 * Admin reassigns booking to different supplier.
 */

import { NextRequest, NextResponse } from "next/server";
import { assignmentService } from "@/lib/services/assignment/assignment-service";
import { validateDto } from "@/lib/validation";
import { AdminReassignBookingSchema } from "@/lib/validation/schemas/assignment-schemas";
import { isOperationalError } from "@/lib/errors";

export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const body = await request.json();
    const validatedData = validateDto(AdminReassignBookingSchema, {
      ...body,
      bookingId: params.id,
    });

    // TODO: Replace with Better Auth admin identity extraction
    const adminId = request.headers.get("x-mock-admin-id") || "mock-admin-1";

    const booking = await assignmentService.adminReassignBooking({
      bookingId: params.id,
      newSupplierId: validatedData.supplierId,
      adminId,
      reason: validatedData.reason,
    });

    return NextResponse.json(
      {
        success: true,
        data: booking,
        message: "Booking reassigned successfully",
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
      `Unexpected error in POST /api/v1/admin/bookings/${params.id}/reassign:`,
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
