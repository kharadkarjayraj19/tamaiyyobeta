/**
 * Tamaiyyo — GET /api/v1/suppliers/[id]
 *
 * Get supplier account details.
 */

import { NextRequest, NextResponse } from "next/server";
import { supplierService } from "@/lib/services/supplier/supplier-service";
import { isOperationalError } from "@/lib/errors";

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const supplier = await supplierService.getSupplierById(params.id);

    return NextResponse.json(
      {
        success: true,
        data: supplier,
      },
      { status: 200 }
    );
  } catch (error) {
    if (isOperationalError(error)) {
      const statusCode = error.name === "NotFoundError" ? 404 : 500;

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

    // Unexpected error
    console.error(`Unexpected error in GET /api/v1/suppliers/${params.id}:`, error);
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
