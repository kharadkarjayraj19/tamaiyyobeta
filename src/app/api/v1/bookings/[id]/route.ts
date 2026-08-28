/**
 * Tamayo — Booking detail API routes.
 *
 * GET /api/v1/bookings/[id] — Get booking details
 */

import { NextRequest, NextResponse } from "next/server";
import { bookingService } from "@/lib/services/booking/booking-service";
import { isOperationalError } from "@/lib/errors";

/**
 * GET /api/v1/bookings/[id]
 */
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const booking = await bookingService.getBookingById(params.id);

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
      `Unexpected error in GET /api/v1/bookings/${params.id}:`,
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
