import { NextRequest, NextResponse } from "next/server";
import { settlementService } from "@/lib/services/settlement/settlement-service";
import { validateDto, MarkEarningsEligibleSchema } from "@/lib/validation";
import { isOperationalError } from "@/lib/errors";

/**
 * POST /api/v1/settlements/mark-eligible
 * Mark earnings as eligible for payout.
 * Transitions: EARNED → ELIGIBLE
 * 
 * Admin only.
 */
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    
    // Mock admin identity
    const adminId = req.headers.get("x-mock-admin-id");
    
    if (!adminId) {
      return NextResponse.json(
        {
          success: false,
          error: {
            type: "UnauthorizedError",
            message: "Admin authentication required",
          },
        },
        { status: 401 }
      );
    }

    // Validate DTO
    const validated = validateDto(MarkEarningsEligibleSchema, body);

    // Mark earnings as eligible
    const result = await settlementService.markEarningsEligible({
      bookingIds: validated.bookingIds,
      actorId: adminId,
    });

    return NextResponse.json({
      success: true,
      data: {
        updated: result.updated,
        earnings: result.earnings.map((e) => ({
          id: e.id,
          bookingId: e.bookingId,
          supplierId: e.supplierId,
          netAmount: e.netAmount.toFixed(2),
          status: e.status,
        })),
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
        { status: error.constructor.name === "ValidationError" ? 400 : error.constructor.name === "NotFoundError" ? 404 : 400 }
      );
    }

    console.error("POST /api/v1/settlements/mark-eligible error:", error);
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
