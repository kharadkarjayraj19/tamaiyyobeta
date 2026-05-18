/**
 * Tamaiyyo — POST /api/v1/bookings/[id]/generate-bill
 *
 * Generate final bill (admin or automated after completion/confirmation).
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

    // Mock admin identity (replace with Better Auth later)
    const actorId = req.headers.get("x-mock-admin-id") || "system";

    // Generate final bill
    const result = await billingService.generateFinalBill({
      bookingId,
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

    console.error("POST /api/v1/bookings/[id]/generate-bill error:", error);
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
