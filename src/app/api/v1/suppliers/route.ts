/**
 * Tamayo — GET /api/v1/suppliers
 *
 * List supplier accounts with filters.
 */

import { NextRequest, NextResponse } from "next/server";
import { supplierService } from "@/lib/services/supplier/supplier-service";
import { SupplierAccountStatus } from "@prisma/client";
import { isOperationalError } from "@/lib/errors";

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;

    // Extract filters
    const status = searchParams.get("status") as SupplierAccountStatus | null;
    const search = searchParams.get("search");
    const offset = parseInt(searchParams.get("offset") || "0", 10);
    const limit = Math.min(
      parseInt(searchParams.get("limit") || "20", 10),
      100
    );

    const filters: any = {};
    if (status) filters.status = status;
    if (search) filters.search = search;

    const result = await supplierService.listSuppliers(filters, offset, limit);

    return NextResponse.json(
      {
        success: true,
        data: result.suppliers,
        pagination: {
          total: result.total,
          offset: result.offset,
          limit: result.limit,
        },
      },
      { status: 200 }
    );
  } catch (error) {
    console.error("Unexpected error in GET /api/v1/suppliers:", error);
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
