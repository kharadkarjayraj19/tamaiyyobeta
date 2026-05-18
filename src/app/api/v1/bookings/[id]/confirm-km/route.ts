/**
 * Tamaiyyo — POST /api/v1/bookings/[id]/confirm-km
 *
 * Customer confirms km (optional workflow step).
 */

import { NextRequest, NextResponse } from "next/server";
import { billingService } from "@/lib/services/billing/billing-service";
import { validateDto, CustomerConfirmKmSchema } from "@/lib/validation";
import { isOperationalError } from "@/lib/errors";

export async function POST(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const bookingId = params.id;
    const body = await req.json();

    // Validate DTO
    const data = validateDto(CustomerConfirmKmSchema, {
      ...body,
      bookingId,
    });

    // Mock customer identity (replace with Better Auth later)
    const customerId = req.headers.get("x-mock-customer-id") || "system";

    // Customer confirms km
    const result = await billingService.customerConfirmKm({
      bookingId: data.bookingId,
      customerId,
      confirmedKm: data.confirmedKm,
      notes: data.notes,
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

    console.error("POST /api/v1/bookings/[id]/confirm-km error:", error);
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
