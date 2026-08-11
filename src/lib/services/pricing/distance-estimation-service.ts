import "server-only";

import { serverEnv } from "@/config/env/server";

type DestinationStop = {
  location: string;
  geo?: { lat: number; lng: number };
};

export type DistanceEstimationInput = {
  pickupLocation: string;
  destinations: DestinationStop[];
  estimatedKm?: number;
};

/**
 * Route distance resolver with Google Maps as the preferred source.
 * Falls back to caller-provided estimated km when API is unavailable.
 */
export class DistanceEstimationService {
  async resolveRouteDistanceKm(
    input: DistanceEstimationInput
  ): Promise<number | undefined> {
    if (input.estimatedKm) {
      return input.estimatedKm;
    }

    if (!serverEnv.googleMapsApiKey || input.destinations.length === 0) {
      return input.estimatedKm;
    }

    const points = [input.pickupLocation, ...input.destinations.map((stop) => stop.location)];
    const destination = points[points.length - 1];
    const waypoints = points.slice(1, -1);

    try {
      const params = new URLSearchParams({
        origin: input.pickupLocation,
        destination,
        key: serverEnv.googleMapsApiKey,
        units: "metric",
        mode: "driving",
        region: "in",
      });

      if (waypoints.length > 0) {
        params.set("waypoints", waypoints.join("|"));
      }

      const response = await fetch(
        `https://maps.googleapis.com/maps/api/directions/json?${params.toString()}`,
        { method: "GET", cache: "no-store" }
      );

      if (!response.ok) {
        return input.estimatedKm;
      }

      const payload = (await response.json()) as {
        status?: string;
        routes?: Array<{
          legs?: Array<{ distance?: { value?: number } }>;
        }>;
      };

      if (payload.status !== "OK" || !payload.routes?.length) {
        return input.estimatedKm;
      }

      const legs = payload.routes[0]?.legs ?? [];
      const totalMeters = legs.reduce((sum, leg) => sum + (leg.distance?.value ?? 0), 0);

      if (totalMeters <= 0) {
        return input.estimatedKm;
      }

      return Math.round(totalMeters / 1000);
    } catch (error) {
      console.error("Google Maps distance estimation failed:", error);
      return input.estimatedKm;
    }
  }
}

export const distanceEstimationService = new DistanceEstimationService();
