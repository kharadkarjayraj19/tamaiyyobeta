import "server-only";

import { serverEnv } from "@/config/env/server";

type DestinationStop = {
  location: string;
  geo?: { lat: number; lng: number };
};

export type DistanceEstimationInput = {
  sourceCity?: string;
  pickupLocation: string;
  destinations: DestinationStop[];
  estimatedKm?: number;
};

export type DistanceEstimationResult = {
  routeDistanceKm: number | undefined;
  returnDistanceKm: number | undefined;
  dispatchHubCity: string | undefined;
};

type LaunchHub = {
  id: string;
  displayName: string;
  routingLabel: string;
  aliases: string[];
};

type CachedResult<T> = {
  value: T;
  expiresAt: number;
};

const LAUNCH_HUBS: LaunchHub[] = [
  {
    id: "mumbai",
    displayName: "Mumbai",
    routingLabel: "Mumbai, Maharashtra, India",
    aliases: ["mumbai", "bombay"],
  },
  {
    id: "pune",
    displayName: "Pune",
    routingLabel: "Pune, Maharashtra, India",
    aliases: ["pune", "poona"],
  },
  {
    id: "sambhajinagar",
    displayName: "Chhatrapati Sambhajinagar",
    routingLabel: "Aurangabad, Maharashtra, India",
    aliases: ["chhatrapati sambhajinagar", "sambhajinagar", "aurangabad"],
  },
  {
    id: "nashik",
    displayName: "Nashik",
    routingLabel: "Nashik, Maharashtra, India",
    aliases: ["nashik", "nasik"],
  },
];

const ROUTE_CACHE_TTL_MS = 3 * 60 * 1000;
const POINT_CACHE_TTL_MS = 10 * 60 * 1000;

/**
 * Route distance resolver with Google Maps as the preferred source.
 * Falls back to caller-provided estimated km when API is unavailable.
 */
export class DistanceEstimationService {
  private readonly routeDistanceInFlight = new Map<string, Promise<DistanceEstimationResult>>();
  private readonly routeDistanceResultCache = new Map<
    string,
    CachedResult<DistanceEstimationResult>
  >();

  async resolveRouteDistanceKm(input: DistanceEstimationInput): Promise<number | undefined> {
    const result = await this.resolveRouteDistanceDetails(input);
    return result.routeDistanceKm;
  }

  async resolveRouteDistanceDetails(
    input: DistanceEstimationInput
  ): Promise<DistanceEstimationResult> {
    const cacheKey = JSON.stringify({
      sourceCity: input.sourceCity?.trim().toLowerCase() ?? "",
      pickupLocation: input.pickupLocation.trim(),
      destinations: input.destinations.map((stop) => stop.location.trim()),
      estimatedKm: input.estimatedKm ?? null,
    });

    const cachedRoute = this.routeDistanceResultCache.get(cacheKey);
    if (cachedRoute && cachedRoute.expiresAt > Date.now()) {
      return cachedRoute.value;
    }

    const inFlight = this.routeDistanceInFlight.get(cacheKey);
    if (inFlight) {
      return inFlight;
    }

    const pending = this.resolveRouteDistanceDetailsInternal(input);
    this.routeDistanceInFlight.set(cacheKey, pending);

    try {
      const resolved = await pending;
      this.routeDistanceResultCache.set(cacheKey, {
        value: resolved,
        expiresAt: Date.now() + ROUTE_CACHE_TTL_MS,
      });
      return resolved;
    } finally {
      this.routeDistanceInFlight.delete(cacheKey);
    }
  }

  private async resolveRouteDistanceDetailsInternal(
    input: DistanceEstimationInput
  ): Promise<DistanceEstimationResult> {
    if (input.estimatedKm) {
      return {
        routeDistanceKm: input.estimatedKm,
        returnDistanceKm: undefined,
        dispatchHubCity: undefined,
      };
    }

    if (!serverEnv.googleMapsDirectionsApiKey || input.destinations.length === 0) {
      return {
        routeDistanceKm: input.estimatedKm,
        returnDistanceKm: undefined,
        dispatchHubCity: undefined,
      };
    }

    if (!input.destinations[input.destinations.length - 1]?.location) {
      return {
        routeDistanceKm: input.estimatedKm,
        returnDistanceKm: undefined,
        dispatchHubCity: undefined,
      };
    }

    const operationalHub = await this.resolveOperationalHub({
      routePoints: [input.pickupLocation, ...input.destinations.map((stop) => stop.location)],
    });
    const routeMetrics = await this.resolveClosedLoopRouteForHub(
      operationalHub.routingLabel,
      [input.pickupLocation, ...input.destinations.map((stop) => stop.location)]
    );

    if (!routeMetrics) {
      return {
        routeDistanceKm: input.estimatedKm,
        returnDistanceKm: undefined,
        dispatchHubCity: operationalHub.displayName,
      };
    }

    return {
      routeDistanceKm: routeMetrics.totalKm,
      returnDistanceKm: routeMetrics.returnKm,
      dispatchHubCity: operationalHub.displayName,
    };
  }

  private async resolveOperationalHub(input: {
    routePoints: string[];
  }): Promise<LaunchHub> {
    const scoredHubs = await Promise.all(
      LAUNCH_HUBS.map(async (hub) => ({
        hub,
        routeMetrics: await this.resolveClosedLoopRouteForHub(hub.routingLabel, input.routePoints),
      }))
    );

    const best = scoredHubs.reduce<{
      hub: LaunchHub;
      routeMetrics: { totalKm: number; returnKm: number | undefined } | undefined;
    }>(
      (currentBest, candidate) =>
        (candidate.routeMetrics?.totalKm ?? Number.POSITIVE_INFINITY) <
        (currentBest.routeMetrics?.totalKm ?? Number.POSITIVE_INFINITY)
          ? candidate
          : currentBest,
      { hub: LAUNCH_HUBS[0], routeMetrics: undefined }
    );

    return best.hub;
  }

  private async resolveClosedLoopRouteForHub(
    hubLocation: string,
    tripPoints: string[]
  ): Promise<{ totalKm: number; returnKm: number | undefined } | undefined> {
    if (!serverEnv.googleMapsDirectionsApiKey) {
      return undefined;
    }

    try {
      const destination = hubLocation;
      const waypoints = [...tripPoints, hubLocation];
      const params = new URLSearchParams({
        origin: hubLocation,
        destination,
        key: serverEnv.googleMapsDirectionsApiKey,
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
        return undefined;
      }

      const payload = (await response.json()) as {
        status?: string;
        routes?: Array<{
          legs?: Array<{ distance?: { value?: number } }>;
        }>;
      };

      if (payload.status !== "OK" || !payload.routes?.length) {
        return undefined;
      }

      const legs = payload.routes[0]?.legs ?? [];
      const totalMeters = legs.reduce((sum, leg) => sum + (leg.distance?.value ?? 0), 0);
      const returnLegMeters = legs[legs.length - 1]?.distance?.value ?? 0;

      if (totalMeters <= 0) {
        return undefined;
      }

      return {
        totalKm: Math.round(totalMeters / 1000),
        returnKm: returnLegMeters > 0 ? Math.round(returnLegMeters / 1000) : undefined,
      };
    } catch {
      return undefined;
    }
  }
}

export const distanceEstimationService = new DistanceEstimationService();
