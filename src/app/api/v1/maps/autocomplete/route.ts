import { NextRequest, NextResponse } from "next/server";

import { serverEnv } from "@/config/env/server";
import { ValidationError, isOperationalError } from "@/lib/errors";

type PlacesAutocompleteNewResponse = {
  suggestions?: Array<{
    placePrediction?: {
      placeId?: string;
      text?: {
        text?: string;
      };
      structuredFormat?: {
        mainText?: {
          text?: string;
        };
        secondaryText?: {
          text?: string;
        };
      };
    };
  }>;
  error?: {
    message?: string;
    status?: string;
  };
};

export async function GET(request: NextRequest) {
  try {
    const input = request.nextUrl.searchParams.get("input")?.trim() ?? "";
    const sessionToken = request.nextUrl.searchParams.get("sessionToken")?.trim();

    if (input.length === 0 || input.length < 3) {
      return NextResponse.json({ success: true, data: { predictions: [] } }, { status: 200 });
    }

    if (input.length > 120) {
      throw new ValidationError("Location query is too long");
    }

    if (!serverEnv.googleMapsPlacesApiKey) {
      return NextResponse.json(
        {
          success: false,
          error: {
            message: "Google Places API key is not configured",
            code: "MAPS_NOT_CONFIGURED",
          },
        },
        { status: 503 }
      );
    }

    const payload: {
      input: string;
      languageCode: string;
      regionCode: string;
      includedRegionCodes: string[];
      sessionToken?: string;
    } = {
      input,
      languageCode: "en",
      regionCode: "IN",
      includedRegionCodes: ["IN"],
    };

    if (sessionToken) {
      payload.sessionToken = sessionToken;
    }

    const response = await fetch("https://places.googleapis.com/v1/places:autocomplete", {
      method: "POST",
      cache: "no-store",
      headers: {
        "Content-Type": "application/json",
        "X-Goog-Api-Key": serverEnv.googleMapsPlacesApiKey,
        "X-Goog-FieldMask":
          "suggestions.placePrediction.placeId,suggestions.placePrediction.text,suggestions.placePrediction.structuredFormat.mainText,suggestions.placePrediction.structuredFormat.secondaryText",
      },
      body: JSON.stringify(payload),
    });

    if (!response.ok) {
      let upstreamMessage = "Unable to fetch location suggestions";
      let upstreamStatus: string | undefined;

      try {
        const upstreamPayload = (await response.json()) as PlacesAutocompleteNewResponse;
        upstreamMessage = upstreamPayload.error?.message ?? upstreamMessage;
        upstreamStatus = upstreamPayload.error?.status;
      } catch {
        // Keep generic upstream error if payload cannot be parsed.
      }

      return NextResponse.json(
        {
          success: false,
          error: {
            message: upstreamMessage,
            code: "MAPS_UPSTREAM_ERROR",
            details: { status: upstreamStatus ?? `HTTP_${response.status}` },
          },
        },
        { status: 502 }
      );
    }

    const data = (await response.json()) as PlacesAutocompleteNewResponse;
    const predictions = (data.suggestions ?? [])
      .map((suggestion) => suggestion.placePrediction)
      .filter((prediction): prediction is NonNullable<typeof prediction> => {
        return Boolean(prediction?.placeId && prediction?.text?.text);
      })
      .map((prediction) => ({
        placeId: prediction.placeId as string,
        description: prediction.text?.text as string,
        mainText: prediction.structuredFormat?.mainText?.text ?? (prediction.text?.text as string),
        secondaryText: prediction.structuredFormat?.secondaryText?.text ?? "",
      }));

    return NextResponse.json(
      {
        success: true,
        data: { predictions },
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
            code: error.code,
            details: error.details,
          },
        },
        { status: error.statusCode }
      );
    }

    console.error("Unexpected error in GET /api/v1/maps/autocomplete:", error);

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
