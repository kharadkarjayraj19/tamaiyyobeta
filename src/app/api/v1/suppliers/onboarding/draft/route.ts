/**
 * Tamayo — POST /api/v1/suppliers/onboarding/draft
 *
 * Save supplier onboarding draft (partial data).
 */

import { NextRequest, NextResponse } from "next/server";
import { supplierService } from "@/lib/services/supplier/supplier-service";
import { validateDto } from "@/lib/validation";
import { SupplierOnboardingDraftSchema } from "@/lib/validation/schemas/supplier-schemas";
import { isOperationalError, getErrorMessage } from "@/lib/errors";

export async function POST(request: NextRequest) {
  try {
    // Parse and validate request body
    const body = await request.json();
    const validatedData = validateDto(SupplierOnboardingDraftSchema, body);

    // TODO: Replace with Better Auth identity extraction
    const identityId = request.headers.get("x-mock-identity-id") || "mock-identity-1";

    // Save draft
    const supplier = await supplierService.saveOnboardingDraft({
      identityId,
      businessName: validatedData.businessName,
      payoutBankDetails: validatedData.payoutBankDetails,
    });

    return NextResponse.json(
      {
        success: true,
        data: supplier,
      },
      { status: 200 }
    );
  } catch (error) {
    if (isOperationalError(error)) {
      return NextResponse.json(
        {
          success: false,
          error: {
            message: error.message,
            code: error.name,
            details: "details" in error ? error.details : undefined,
          },
        },
        { status: error.name === "ValidationError" ? 400 : 500 }
      );
    }

    // Unexpected error
    console.error("Unexpected error in POST /api/v1/suppliers/onboarding/draft:", error);
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
