/**
 * Tamaiyyo — GET /api/v1/bookings/ref/[ref]
 *
 * Get booking details by booking reference (public-facing lookup).
 */

import { NextRequest, NextResponse } from "next/server";
import { bookingService } from "@/lib/services/booking/booking-service";
import { isOperationalError } from "@/lib/errors";

export async function GET(
  request: NextRequest,
  { params }: { params: { ref: string } }
) {
  try {
    const booking = await bookingService.getBookingByRef(params.ref);

    return NextResponse.json(
      {
        success: true,
        data: booking,
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

    console.error(
      `Unexpected error in GET /api/v1/bookings/ref/${params.ref}:`,
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
