import { NextRequest, NextResponse } from "next/server";
import { paymentService } from "@/lib/services/payment/payment-service";
import { validateDto, RecordPaymentSchema } from "@/lib/validation";
import { isOperationalError } from "@/lib/errors";
import { Prisma } from "@prisma/client";

/**
 * POST /api/v1/payments
 * Record a payment (advance, partial, or full).
 * 
 * MVP: Manual payment entry. Production will use gateway webhooks.
 */
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    
    // Mock customer identity (replace with Better Auth later)
    const customerId = req.headers.get("x-mock-customer-id");
    
    if (!customerId) {
      return NextResponse.json(
        {
          success: false,
          error: {
            type: "UnauthorizedError",
            message: "Customer authentication required",
          },
        },
        { status: 401 }
      );
    }

    // Validate DTO
    const validated = validateDto(RecordPaymentSchema, body);

    // Convert amount string to Decimal
    const amount = new Prisma.Decimal(validated.amount);

    // Record payment
    const result = await paymentService.recordPayment({
      bookingId: validated.bookingId,
      customerId,
      amount,
      mode: validated.mode,
      gatewayOrderId: validated.gatewayOrderId,
      finalBillId: validated.finalBillId,
    });

    return NextResponse.json({
      success: true,
      data: {
        payment: {
          id: result.payment.id,
          bookingId: result.payment.bookingId,
          amount: result.payment.amount.toFixed(2),
          mode: result.payment.mode,
          status: result.payment.status,
          gatewayOrderId: result.payment.gatewayOrderId,
          createdAt: result.payment.createdAt.toISOString(),
        },
        booking: {
          id: result.booking.id,
          bookingRef: result.booking.bookingRef,
          status: result.booking.status,
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
        {
          status:
            error.constructor.name === "ValidationError" ? 400 :
            error.constructor.name === "NotFoundError" ? 404 :
            error.constructor.name === "ForbiddenError" ? 403 : 400
        }
      );
    }

    console.error("POST /api/v1/payments error:", error);
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
