import { NextRequest, NextResponse } from "next/server";
import { settlementService } from "@/lib/services/settlement/settlement-service";
import { validateDto, CreatePayoutBatchSchema, ListPayoutBatchesSchema } from "@/lib/validation";
import { isOperationalError } from "@/lib/errors";

/**
 * POST /api/v1/settlements/batches
 * Create payout batch (group eligible earnings).
 * Transitions: ELIGIBLE → BATCHED
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
    const validated = validateDto(CreatePayoutBatchSchema, body);

    // Create payout batch
    const result = await settlementService.createPayoutBatch({
      supplierId: validated.supplierId,
      cycleStartDate: new Date(validated.cycleStartDate),
      cycleEndDate: new Date(validated.cycleEndDate),
      bookingIds: validated.bookingIds,
      actorId: adminId,
    });

    return NextResponse.json({
      success: true,
      data: {
        batch: {
          id: result.batch.id,
          batchRef: result.batch.batchRef,
          supplierId: result.batch.supplierId,
          cycleStartDate: result.batch.cycleStartDate.toISOString(),
          cycleEndDate: result.batch.cycleEndDate.toISOString(),
          totalEarnings: result.batch.totalEarnings.toFixed(2),
          totalDeductions: result.batch.totalDeductions?.toFixed(2) || "0.00",
          netPayout: result.batch.netPayout.toFixed(2),
          status: result.batch.status,
          createdAt: result.batch.createdAt.toISOString(),
        },
        earningsCount: result.earningsCount,
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

    console.error("POST /api/v1/settlements/batches error:", error);
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

/**
 * GET /api/v1/settlements/batches
 * List payout batches with filters.
 * 
 * Query params:
 * - supplierId: Filter by supplier (optional)
 * - status: Filter by status (optional)
 * - fromDate: Start date filter (optional)
 * - toDate: End date filter (optional)
 * - offset: Pagination offset (default 0)
 * - limit: Max records (default 20, max 100)
 */
export async function GET(req: NextRequest) {
  try {
    const searchParams = Object.fromEntries(req.nextUrl.searchParams);
    
    // Validate query params
    const validated = validateDto(ListPayoutBatchesSchema, searchParams);

    // Build filters
    const filters: any = {};
    if (validated.supplierId) filters.supplierId = validated.supplierId;
    if (validated.status) filters.status = validated.status;
    if (validated.fromDate) filters.fromDate = new Date(validated.fromDate);
    if (validated.toDate) filters.toDate = new Date(validated.toDate);

    // List batches
    const result = await settlementService.listPayoutBatches(
      filters,
      validated.offset,
      validated.limit
    );

    return NextResponse.json({
      success: true,
      data: {
        batches: result.batches.map((b) => ({
          id: b.id,
          batchRef: b.batchRef,
          supplierId: b.supplierId,
          cycleStartDate: b.cycleStartDate.toISOString(),
          cycleEndDate: b.cycleEndDate.toISOString(),
          totalEarnings: b.totalEarnings.toFixed(2),
          totalDeductions: b.totalDeductions?.toFixed(2) || "0.00",
          netPayout: b.netPayout.toFixed(2),
          status: b.status,
          paidAt: b.paidAt?.toISOString() || null,
          createdAt: b.createdAt.toISOString(),
        })),
        total: result.total,
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
        { status: error.constructor.name === "ValidationError" ? 400 : 404 }
      );
    }

    console.error("GET /api/v1/settlements/batches error:", error);
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
