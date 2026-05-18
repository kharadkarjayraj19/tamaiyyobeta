/**
 * Tamaiyyo — POST /api/v1/admin/suppliers/[id]/verify
 *
 * Admin verification of supplier accounts (approve/reject).
 */

import { NextRequest, NextResponse } from "next/server";
import { supplierService } from "@/lib/services/supplier/supplier-service";
import { validateDto } from "@/lib/validation";
import { AdminSupplierVerificationSchema } from "@/lib/validation/schemas/supplier-schemas";
import { isOperationalError } from "@/lib/errors";

export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const body = await request.json();
    const validatedData = validateDto(AdminSupplierVerificationSchema, {
      ...body,
      supplierId: params.id,
    });

    // TODO: Replace with Better Auth admin identity extraction
    const adminId = request.headers.get("x-mock-admin-id") || "mock-admin-1";

    // Verify action
    const targetStatus =
      validatedData.action === "APPROVE" ? "ACTIVE" : "REJECTED";

    const supplier = await supplierService.updateSupplierStatus(
      params.id,
      targetStatus,
      adminId,
      validatedData.reason
    );

    return NextResponse.json(
      {
        success: true,
        data: supplier,
        message:
          validatedData.action === "APPROVE"
            ? "Supplier approved successfully"
            : "Supplier rejected",
      },
      { status: 200 }
    );
  } catch (error) {
    if (isOperationalError(error)) {
      const statusCode =
        error.name === "ValidationError"
          ? 400
          : error.name === "NotFoundError"
          ? 404
          : 500;

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
      `Unexpected error in POST /api/v1/admin/suppliers/${params.id}/verify:`,
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
