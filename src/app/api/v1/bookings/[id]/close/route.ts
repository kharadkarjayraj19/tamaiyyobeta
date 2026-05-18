/**
 * Tamaiyyo — POST /api/v1/bookings/[id]/close
 *
 * Close booking after billing is complete (operational closure).
 * 
 * Note: This is MVP operational closure. In production, this would be
 * triggered automatically by payment gateway confirmation.
 */

import { NextRequest, NextResponse } from "next/server";
import { billingService } from "@/lib/services/billing/billing-service";
import { isOperationalError } from "@/lib/errors";

export async function POST(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const bookingId = params.id;
    const body = await req.json();

    // Mock admin/system identity (replace with Better Auth later)
    const actorId = req.headers.get("x-mock-admin-id") || "system";

    // Close booking
    const result = await billingService.closeBooking({
      bookingId,
      actorId,
      notes: body.notes,
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

    console.error("POST /api/v1/bookings/[id]/close error:", error);
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
