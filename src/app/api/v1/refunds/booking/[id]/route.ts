import { NextRequest, NextResponse } from "next/server";
import { refundService } from "@/lib/services/payment/refund-service";
import { isOperationalError } from "@/lib/errors";

/**
 * GET /api/v1/refunds/booking/[id]
 * Get all refunds for a booking.
 */
export async function GET(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const bookingId = params.id;

    // Get refunds
    const refunds = await refundService.getRefundsByBookingId(bookingId);

    // Get refund eligibility
    const eligibility = await refundService.checkRefundEligibility(bookingId);

    return NextResponse.json({
      success: true,
      data: {
        refunds: refunds.map((r) => ({
          id: r.id,
          bookingId: r.bookingId,
          paymentId: r.paymentId,
          amount: r.amount.toFixed(2),
          reason: r.reason,
          initiatedBy: r.initiatedBy,
          status: r.status,
          gatewayRefundId: r.gatewayRefundId,
          createdAt: r.createdAt.toISOString(),
        })),
        eligibility: {
          eligible: eligibility.eligible,
          hoursUntilTrip: Math.round(eligibility.hoursUntilTrip),
          reason: eligibility.reason,
        },
      },
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

    console.error("GET /api/v1/refunds/booking/[id] error:", error);
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
