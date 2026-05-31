import { NextRequest, NextResponse } from "next/server";
import { settlementService } from "@/lib/services/settlement/settlement-service";
import { validateDto, GetSupplierEarningsSchema } from "@/lib/validation";
import { isOperationalError } from "@/lib/errors";

/**
 * GET /api/v1/settlements/supplier/[id]
 * Get supplier earnings history.
 * 
 * Query params:
 * - status: Filter by status (optional)
 * - payoutBatchId: Filter by batch (optional)
 * - offset: Pagination offset (default 0)
 * - limit: Max records (default 20, max 100)
 */
export async function GET(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const supplierId = params.id;
    const searchParams = Object.fromEntries(req.nextUrl.searchParams);
    
    // Validate query params
    const validated = validateDto(GetSupplierEarningsSchema, searchParams);

    // Build filters
    const filters: any = {};
    if (validated.status) filters.status = validated.status;
    if (validated.payoutBatchId) filters.payoutBatchId = validated.payoutBatchId;

    // Get earnings
    const result = await settlementService.getSupplierEarnings(
      supplierId,
      filters,
      validated.offset,
      validated.limit
    );

    return NextResponse.json({
      success: true,
      data: {
        supplierId,
        earnings: result.earnings.map((e) => ({
          id: e.id,
          bookingId: e.bookingId,
          finalBillId: e.finalBillId,
          grossAmount: e.grossAmount.toFixed(2),
          commissionAmount: e.commissionAmount.toFixed(2),
          netAmount: e.netAmount.toFixed(2),
          status: e.status,
          payoutBatchId: e.payoutBatchId,
          createdAt: e.createdAt.toISOString(),
        })),
        offset: result.offset,
        limit: result.limit,
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

    console.error("GET /api/v1/settlements/supplier/[id] error:", error);
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
