/**
 * Tamayo — POST /api/v1/bookings/quote
 *
 * Generate a booking quote (no booking created).
 */

import { NextRequest, NextResponse } from "next/server";
import { bookingService } from "@/lib/services/booking/booking-service";
import { validateDto } from "@/lib/validation";
import { BookingQuoteRequestSchema } from "@/lib/validation/schemas/booking-schemas";
import { isOperationalError } from "@/lib/errors";
import { captureServerEvent } from "@/lib/observability/posthog-server";
import { getSession } from "@/lib/auth/session";

function readSessionUserId(session: unknown): string | null {
  if (!session || typeof session !== "object") {
    return null;
  }
  const user = (session as { user?: { id?: unknown } }).user;
  if (!user || typeof user.id !== "string") {
    return null;
  }
  return user.id;
}

export async function POST(request: NextRequest) {
  try {
    // Parse and validate request body
    const body = await request.json();
    const validatedData = validateDto(BookingQuoteRequestSchema, body);

    const session = await getSession();
    const customerId =
      readSessionUserId(session) ??
      request.headers.get("x-mock-customer-id") ??
      "mock-customer-1";

    // Generate quote
    const quote = await bookingService.generateQuote({
      customerId,
      sourceCity: validatedData.sourceCity,
      destinationCity: validatedData.destinationCity,
      pickupLocation: validatedData.pickupLocation,
      destinations: validatedData.destinations,
      tripStartDate: new Date(validatedData.tripStartDate),
      tripEndDate: validatedData.tripEndDate
        ? new Date(validatedData.tripEndDate)
        : undefined,
      category: validatedData.category,
      ageBucket: validatedData.ageBucket,
      productType: validatedData.productType,
      vehiclePresetId: validatedData.vehiclePresetId,
      estimatedKm: validatedData.estimatedKm,
      returnDistanceKm: validatedData.returnDistanceKm,
    });

    captureServerEvent({
      distinctId: customerId,
      event: "booking_quote_generated",
      properties: {
        productType: validatedData.productType,
        category: validatedData.category,
        ageBucket: validatedData.ageBucket,
        sourceCity: validatedData.sourceCity,
        destinationCity: validatedData.destinationCity ?? null,
      },
    }).catch(() => undefined);

    return NextResponse.json(
      {
        success: true,
        data: quote,
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
            details: "details" in error ? error.details : undefined,
          },
        },
        { status: statusCode }
      );
    }

    // Unexpected error
    console.error(
      "Unexpected error in POST /api/v1/bookings/quote:",
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
