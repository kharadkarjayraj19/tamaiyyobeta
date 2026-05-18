/**
 * Tamaiyyo — POST /api/v1/suppliers/onboarding/submit
 *
 * Submit supplier onboarding for admin verification.
 */

import { NextRequest, NextResponse } from "next/server";
import { supplierService } from "@/lib/services/supplier/supplier-service";
import { validateDto } from "@/lib/validation";
import { SupplierOnboardingSubmissionSchema } from "@/lib/validation/schemas/supplier-schemas";
import { isOperationalError } from "@/lib/errors";

export async function POST(request: NextRequest) {
  try {
    // Parse and validate request body
    const body = await request.json();
    const validatedData = validateDto(SupplierOnboardingSubmissionSchema, body);

    // TODO: Replace with Better Auth identity extraction
    const identityId = request.headers.get("x-mock-identity-id") || "mock-identity-1";

    // Submit onboarding
    const supplier = await supplierService.submitOnboarding({
      identityId,
      businessName: validatedData.businessName,
      payoutBankDetails: validatedData.payoutBankDetails,
    });

    return NextResponse.json(
      {
        success: true,
        data: supplier,
        message: "Onboarding submitted successfully. Awaiting admin verification.",
      },
      { status: 200 }
    );
  } catch (error) {
    if (isOperationalError(error)) {
      const statusCode =
        error.name === "ValidationError"
          ? 400
          : error.name === "ForbiddenError"
          ? 403
          : 500;

      return NextResponse.json(
        {
          success: false,
          error: {
            message: error.message,
            code: error.name,
            details: "details" in error ? error.details : undefined,
          },
        },
        { status: statusCode }
      );
    }

    // Unexpected error
    console.error("Unexpected error in POST /api/v1/suppliers/onboarding/submit:", error);
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
