import { NextRequest, NextResponse } from "next/server";
import { paymentService } from "@/lib/services/payment/payment-service";
import { isOperationalError } from "@/lib/errors";

/**
 * GET /api/v1/payments/booking/[id]
 * Get all payments for a booking.
 */
export async function GET(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const bookingId = params.id;

    // Get payments
    const payments = await paymentService.getPaymentsByBookingId(bookingId);

    // Get outstanding balance
    const balance = await paymentService.getOutstandingBalance(bookingId);

    return NextResponse.json({
      success: true,
      data: {
        payments: payments.map((p) => ({
          id: p.id,
          bookingId: p.bookingId,
          amount: p.amount.toFixed(2),
          mode: p.mode,
          status: p.status,
          gatewayOrderId: p.gatewayOrderId,
          gatewayPaymentId: p.gatewayPaymentId,
          createdAt: p.createdAt.toISOString(),
        })),
        summary: {
          finalBillAmount: balance.finalBillAmount.toFixed(2),
          totalPaid: balance.totalPaid.toFixed(2),
          outstandingBalance: balance.outstandingBalance.toFixed(2),
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

    console.error("GET /api/v1/payments/booking/[id] error:", error);
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
