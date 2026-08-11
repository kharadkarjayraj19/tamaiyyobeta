/**
 * Tamaiyyo — Booking API routes.
 *
 * POST /api/v1/bookings — Create booking
 * GET /api/v1/bookings — List bookings
 */

import { NextRequest, NextResponse } from "next/server";
import { bookingService } from "@/lib/services/booking/booking-service";
import { validateDto } from "@/lib/validation";
import {
  CreateBookingSchema,
  BookingListFiltersSchema,
} from "@/lib/validation/schemas/booking-schemas";
import { isOperationalError } from "@/lib/errors";
import { captureServerEvent } from "@/lib/observability/posthog-server";

/**
 * POST /api/v1/bookings — Create booking
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const validatedData = validateDto(CreateBookingSchema, body);

    // TODO: Replace with Better Auth customer identity extraction
    const customerId =
      request.headers.get("x-mock-customer-id") || "mock-customer-1";

    // Create booking with full transactional integrity
    const result = await bookingService.createBooking({
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
      estimatedKm: validatedData.estimatedKm,
      returnDistanceKm: validatedData.returnDistanceKm,
    });

    captureServerEvent({
      distinctId: customerId,
      event: "booking_created",
      properties: {
        bookingId: result.booking.id,
        bookingRef: result.booking.bookingRef,
        productType: validatedData.productType,
        category: validatedData.category,
        sourceCity: validatedData.sourceCity,
        destinationCity: validatedData.destinationCity ?? null,
      },
    }).catch(() => undefined);

    return NextResponse.json(
      {
        success: true,
        data: {
          booking: result.booking,
          quote: result.quote,
        },
        message: "Booking created successfully",
      },
      { status: 201 }
    );
  } catch (error) {
    if (isOperationalError(error)) {
      const statusCode =
        error.name === "ValidationError"
          ? 400
          : error.name === "ConflictError"
          ? 409
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

    console.error("Unexpected error in POST /api/v1/bookings:", error);
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

/**
 * GET /api/v1/bookings — List bookings
 */
export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;

    // Parse and validate query parameters
    const rawFilters = {
      customerId: searchParams.get("customerId"),
      supplierId: searchParams.get("supplierId"),
      status: searchParams.get("status"),
      tripStartDateFrom: searchParams.get("tripStartDateFrom"),
      tripStartDateTo: searchParams.get("tripStartDateTo"),
      offset: searchParams.get("offset") || "0",
      limit: searchParams.get("limit") || "20",
    };

    const validatedFilters = validateDto(
      BookingListFiltersSchema,
      rawFilters
    );

    // Build filters
    const filters: {
      customerId?: string;
      supplierId?: string;
      status?: (typeof validatedFilters)["status"];
      fromDate?: Date;
      toDate?: Date;
    } = {};
    if (validatedFilters.customerId) filters.customerId = validatedFilters.customerId;
    if (validatedFilters.supplierId) filters.supplierId = validatedFilters.supplierId;
    if (validatedFilters.status) filters.status = validatedFilters.status;
    if (validatedFilters.tripStartDateFrom)
      filters.fromDate = new Date(validatedFilters.tripStartDateFrom);
    if (validatedFilters.tripStartDateTo)
      filters.toDate = new Date(validatedFilters.tripStartDateTo);

    const result = await bookingService.listBookings(
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

    console.error("Unexpected error in GET /api/v1/bookings:", error);
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
