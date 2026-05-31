import { NextRequest, NextResponse } from "next/server";
import { refundService } from "@/lib/services/payment/refund-service";
import { validateDto, CreateRefundSchema } from "@/lib/validation";
import { isOperationalError } from "@/lib/errors";
import { Prisma } from "@prisma/client";

/**
 * POST /api/v1/refunds
 * Create a refund (with 24h policy validation).
 * 
 * REFUND POLICY:
 * - >24h before trip: Full refund allowed
 * - <24h before trip: No automatic full refund (admin override required)
 * 
 * MVP: Manual refund processing. Production will use gateway refund APIs.
 */
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    
    // Mock identity (customer or admin)
    const actorType = body.initiatedBy || "CUSTOMER";
    const actorId = 
      actorType === "ADMIN" 
        ? req.headers.get("x-mock-admin-id")
        : req.headers.get("x-mock-customer-id");
    
    if (!actorId) {
      return NextResponse.json(
        {
          success: false,
          error: {
            type: "UnauthorizedError",
            message: "Authentication required",
          },
        },
        { status: 401 }
      );
    }

    // Validate DTO
    const validated = validateDto(CreateRefundSchema, body);

    // Convert amount string to Decimal
    const amount = new Prisma.Decimal(validated.amount);

    // Create refund
    const result = await refundService.createRefund({
      bookingId: validated.bookingId,
      paymentId: validated.paymentId,
      amount,
      reason: validated.reason,
      initiatedBy: validated.initiatedBy,
      actorId,
    });

    return NextResponse.json({
      success: true,
      data: {
        refund: {
          id: result.refund.id,
          bookingId: result.refund.bookingId,
          paymentId: result.refund.paymentId,
          amount: result.refund.amount.toFixed(2),
          reason: result.refund.reason,
          initiatedBy: result.refund.initiatedBy,
          status: result.refund.status,
          createdAt: result.refund.createdAt.toISOString(),
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

    console.error("POST /api/v1/refunds error:", error);
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
