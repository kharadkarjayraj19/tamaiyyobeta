/**
 * Tamaiyyo — GET /api/v1/supplier/bookings/available
 *
 * Get available bookings for supplier (queue view).
 */

import { NextRequest, NextResponse } from "next/server";
import { assignmentService } from "@/lib/services/assignment/assignment-service";
import { validateDto } from "@/lib/validation";
import { SupplierBookingQueueFiltersSchema } from "@/lib/validation/schemas/assignment-schemas";
import { isOperationalError } from "@/lib/errors";

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;

    // TODO: Replace with Better Auth supplier identity extraction
    const supplierId =
      request.headers.get("x-mock-supplier-id") || "mock-supplier-1";

    // Parse and validate query parameters
    const rawFilters = {
      status: searchParams.get("status"),
      tripStartDateFrom: searchParams.get("tripStartDateFrom"),
      tripStartDateTo: searchParams.get("tripStartDateTo"),
      offset: searchParams.get("offset") || "0",
      limit: searchParams.get("limit") || "20",
    };

    const validatedFilters = validateDto(
      SupplierBookingQueueFiltersSchema,
      rawFilters
    );

    // Build filters
    const filters: any = {};
    if (validatedFilters.status) filters.status = validatedFilters.status;
    if (validatedFilters.tripStartDateFrom)
      filters.fromDate = new Date(validatedFilters.tripStartDateFrom);
    if (validatedFilters.tripStartDateTo)
      filters.toDate = new Date(validatedFilters.tripStartDateTo);

    const result = await assignmentService.getSupplierBookingQueue(
      supplierId,
      filters,
      validatedFilters.offset,
      validatedFilters.limit
    );

    return NextResponse.json(
      {
        success: true,
        data: result.bookings,
        pagination: {
          total: result.total,
          offset: result.offset,
          limit: result.limit,
        },
      },
      { status: 200 }
    );
  } catch (error) {
    if (isOperationalError(error)) {
      const statusCode = error.name === "ValidationError" ? 400 : 500;

      return NextResponse.json(
        {
          success: false,
          error: {
            message: error.message,
            code: error.name,
          },
        },
        { status: statusCode }
      );
    }

    console.error(
      "Unexpected error in GET /api/v1/supplier/bookings/available:",
      error
    );
    return NextResponse.json(
      {
        success: false,
        error: {
          message: "An unexpected error occurred",
          code: "INTERNAL_ERROR",
        },
      },
      { status: 500 }
    );
  }
}
