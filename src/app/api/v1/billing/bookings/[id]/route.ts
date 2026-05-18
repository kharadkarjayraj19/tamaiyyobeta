/**
 * Tamaiyyo — GET /api/v1/billing/bookings/[id]
 *
 * Get final bill by booking ID.
 */

import { NextRequest, NextResponse } from "next/server";
import { billingService } from "@/lib/services/billing/billing-service";
import { isOperationalError } from "@/lib/errors";

export async function GET(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const bookingId = params.id;

    // Get final bill
    const bill = await billingService.getFinalBillByBookingId(bookingId);

    return NextResponse.json({
      success: true,
      data: bill,
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
        { status: error.constructor.name === "NotFoundError" ? 404 : 404 }
      );
    }

    console.error("GET /api/v1/billing/bookings/[id] error:", error);
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
