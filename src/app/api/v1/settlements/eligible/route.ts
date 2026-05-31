import { NextRequest, NextResponse } from "next/server";
import { settlementService } from "@/lib/services/settlement/settlement-service";
import { validateDto, ListEligibleEarningsSchema } from "@/lib/validation";
import { isOperationalError } from "@/lib/errors";

/**
 * GET /api/v1/settlements/eligible
 * List eligible earnings (not yet batched).
 * 
 * Query params:
 * - supplierId: Filter by supplier (optional)
 * - limit: Max records (default 20, max 100)
 */
export async function GET(req: NextRequest) {
  try {
    const searchParams = Object.fromEntries(req.nextUrl.searchParams);
    
    // Validate query params
    const validated = validateDto(ListEligibleEarningsSchema, searchParams);

    // Get eligible earnings
    const earnings = await settlementService.listEligibleEarnings(
      validated.supplierId,
      validated.limit
    );

    return NextResponse.json({
      success: true,
      data: {
        earnings: earnings.map((e) => ({
          id: e.id,
          bookingId: e.bookingId,
          supplierId: e.supplierId,
          grossAmount: e.grossAmount.toFixed(2),
          commissionAmount: e.commissionAmount.toFixed(2),
          netAmount: e.netAmount.toFixed(2),
          status: e.status,
          createdAt: e.createdAt.toISOString(),
        })),
        count: earnings.length,
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
        { status: error.constructor.name === "ValidationError" ? 400 : 404 }
      );
    }

    console.error("GET /api/v1/settlements/eligible error:", error);
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
