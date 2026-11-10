/**
 * Tamayo — QuoteService (pricing calculations).
 *
 * Architecture:
 * - Quote generation logic
 * - Pricing calculation based on trip parameters
 * - MVP placeholder pricing (configuration-driven later)
 * - Aligns with pricing-engine.md philosophy
 * 
 * MVP PLACEHOLDER: All pricing rates are hardcoded inline in methods below.
 * 
 * PRODUCTION TODO: Replace inline rates with database-driven configuration:
 * - PricingConfig table with versioning
 * - City/region-specific rates
 * - Dynamic surge pricing
 * - Partner-negotiated rates
 * - Seasonal adjustments
 * - Real-time inventory-based pricing
 * 
 * Current MVP rates (see method implementations):
 * - Minimum km/day: 300km/day (fixed)
 * - Per-km rates: age-bucketed by category/preset (₹12-36/km)
 * - Operational bundle: ₹3/km (tour pricing mode)
 * - One-way launch fare matrix: fixed eligible routes with fallback to tour pricing
 */

import { VehicleCategory, AgeBucket, ProductType } from "@prisma/client";
import { Prisma } from "@prisma/client";
import type { QuoteLineItem } from "@/lib/repositories/booking/quote-repository";
import { ValidationError } from "@/lib/errors";

/**
 * Pricing calculation input.
 */
export interface PricingInput {
  category: VehicleCategory;
  ageBucket: AgeBucket;
  productType: ProductType;
  cityTourPackage?: CityTourPackageCode;
  airportPackage?: AirportPackageCode;
  vehiclePresetId?: string;
  tripStartDate: Date;
  tripEndDate?: Date;
  estimatedKm?: number;
  returnDistanceKm?: number;
  sourceCity: string;
  destinationCity?: string;
}

/**
 * Pricing calculation result.
 */
export interface PricingResult {
  includedKmPerDay: number;
  minimumKmPerDay: number;
  includedDays: number;
  totalIncludedKm: number;
  billableKm: number;
  perKmRate: Prisma.Decimal;
  basePrice: Prisma.Decimal;
  operationalBundleAmount: Prisma.Decimal;
  estimatedTotal: Prisma.Decimal;
  lineItems: QuoteLineItem[];
  routeDistanceKm: number | null;
  returnDistanceKm: number | null;
  usableDistanceKm: number | null;
  snapshotData: Record<string, unknown>;
}

const MINIMUM_KM_PER_DAY = 300;
const OPERATIONAL_BUNDLE_RATE = 3;
const ERTIGA_ONE_WAY_SURCHARGE = 900;
const ONE_WAY_NEWER_VEHICLE_SURCHARGE = 200;

type CityTourPackageCode = "6h60km" | "8h80km" | "10h100km" | "12h120km";
type AirportPackageCode = "10km" | "20km" | "30km" | "40km";

type CityTourPackageConfig = {
  hours: number;
  includedKm: number;
};

type CityTourRateConfig = {
  faresByPackage: Record<CityTourPackageCode, number>;
  extraKmRate: number;
  extraHourRate: number;
};

type AirportRateConfig = {
  faresByPackage: Record<AirportPackageCode, number>;
};

type RouteFareConfig = {
  sedanFare: number;
  categoryFares?: Partial<Record<VehicleCategory, number>>;
};

const CITY_TOUR_PACKAGES: Record<CityTourPackageCode, CityTourPackageConfig> = {
  "6h60km": { hours: 6, includedKm: 60 },
  "8h80km": { hours: 8, includedKm: 80 },
  "10h100km": { hours: 10, includedKm: 100 },
  "12h120km": { hours: 12, includedKm: 120 },
};

const CITY_TOUR_RATE_MATRIX: Partial<Record<VehicleCategory, CityTourRateConfig>> = {
  [VehicleCategory.SEDAN]: {
    faresByPackage: {
      "6h60km": 2000,
      "8h80km": 2200,
      "10h100km": 2500,
      "12h120km": 2800,
    },
    extraKmRate: 15,
    extraHourRate: 150,
  },
  [VehicleCategory.ERTIGA]: {
    faresByPackage: {
      "6h60km": 2300,
      "8h80km": 2600,
      "10h100km": 2950,
      "12h120km": 3300,
    },
    extraKmRate: 17,
    extraHourRate: 150,
  },
  [VehicleCategory.KIA_CARENS]: {
    faresByPackage: {
      "6h60km": 3200,
      "8h80km": 3550,
      "10h100km": 3900,
      "12h120km": 4200,
    },
    extraKmRate: 18,
    extraHourRate: 200,
  },
  [VehicleCategory.INNOVA_CRYSTA]: {
    faresByPackage: {
      "6h60km": 3300,
      "8h80km": 3750,
      "10h100km": 4200,
      "12h120km": 4600,
    },
    extraKmRate: 23,
    extraHourRate: 200,
  },
};

const AIRPORT_PACKAGE_KM: Record<AirportPackageCode, number> = {
  "10km": 10,
  "20km": 20,
  "30km": 30,
  "40km": 40,
};

const AIRPORT_RATE_MATRIX: Partial<Record<VehicleCategory, AirportRateConfig>> = {
  [VehicleCategory.SEDAN]: {
    faresByPackage: {
      "10km": 1500,
      "20km": 1700,
      "30km": 1800,
      "40km": 1900,
    },
  },
  [VehicleCategory.ERTIGA]: {
    faresByPackage: {
      "10km": 1800,
      "20km": 2000,
      "30km": 2100,
      "40km": 2300,
    },
  },
  [VehicleCategory.KIA_CARENS]: {
    faresByPackage: {
      "10km": 2000,
      "20km": 2200,
      "30km": 2400,
      "40km": 2600,
    },
  },
  [VehicleCategory.INNOVA_CRYSTA]: {
    faresByPackage: {
      "10km": 2500,
      "20km": 2700,
      "30km": 2900,
      "40km": 3100,
    },
  },
};

const ONE_WAY_ROUTE_FARE_MATRIX: Record<string, RouteFareConfig> = {
  "mumbai|pune": { sedanFare: 2800 },
  "mumbai|sambhajinagar": {
    sedanFare: 5800,
    categoryFares: {
      [VehicleCategory.KIA_CARENS]: 8000,
      [VehicleCategory.INNOVA_CRYSTA]: 9500,
    },
  },
  "pune|sambhajinagar": { sedanFare: 3300 },
  "nashik|pune": { sedanFare: 3200 },
};

/**
 * QuoteService — pricing calculation logic.
 */
export class QuoteService {
  /**
   * Calculate pricing for a trip.
   * MVP placeholder pricing — real configuration TBD.
   */
  async calculatePricing(input: PricingInput): Promise<PricingResult> {
    // Calculate trip duration (days)
    const tripDays = this.calculateTripDays(
      input.tripStartDate,
      input.tripEndDate
    );

    const includedKmPerDay = MINIMUM_KM_PER_DAY;
    const totalIncludedKm = includedKmPerDay * tripDays;
    const perKmRate = new Prisma.Decimal(
      this.getPerKmRate(input.category, input.ageBucket, input.vehiclePresetId)
    );
    const routeDistanceKm = input.estimatedKm ?? null;
    const returnDistanceKm = input.returnDistanceKm ?? null;
    const usableDistanceKm =
      returnDistanceKm !== null
        ? Math.max(totalIncludedKm - returnDistanceKm, 0)
        : totalIncludedKm;

    if (input.productType === "MULTI_CITY") {
      return this.buildCityTourPricingResult({
        input,
        tripDays,
        routeDistanceKm,
      });
    }

    if (input.productType === "ONE_WAY" && input.airportPackage) {
      return this.buildAirportPricingResult({
        input,
        routeDistanceKm,
      });
    }

    if (input.productType === "ONE_WAY") {
      if (!input.destinationCity) {
        throw new ValidationError("Destination city is required for one-way pricing");
      }
      const routeKey = this.getOneWayRouteKey(input.sourceCity, input.destinationCity);
      const routeConfig = ONE_WAY_ROUTE_FARE_MATRIX[routeKey];
      const supportsOneWayCategory = Boolean(
        input.category === VehicleCategory.SEDAN ||
        input.category === VehicleCategory.ERTIGA ||
        routeConfig?.categoryFares?.[input.category]
      );

      if (routeConfig && supportsOneWayCategory) {
        const oneWayRouteKm =
          routeDistanceKm !== null
            ? Math.max(routeDistanceKm - (returnDistanceKm ?? 0), 0)
            : null;
        const ageSurcharge =
          input.ageBucket === AgeBucket.ZERO_TO_THREE ? ONE_WAY_NEWER_VEHICLE_SURCHARGE : 0;
        const configuredCategoryFare = routeConfig.categoryFares?.[input.category];
        const baseCorridorFare = configuredCategoryFare
          ? new Prisma.Decimal(configuredCategoryFare)
          : new Prisma.Decimal(routeConfig.sedanFare).plus(
              input.category === VehicleCategory.ERTIGA ? ERTIGA_ONE_WAY_SURCHARGE : 0
            );
        const corridorRouteKm = oneWayRouteKm;
        const corridorReturnKm = 0;
        const corridorBillableKm = corridorRouteKm !== null
          ? corridorRouteKm
          : totalIncludedKm;
        // One-way fixed-route launch fares do not add operational bundle.
        const operationalBundleAmount = new Prisma.Decimal(0);

        const lineItems: QuoteLineItem[] = [
          {
            lineType: "CORRIDOR_FARE",
            description: `${input.sourceCity} → ${input.destinationCity}`,
            amount: baseCorridorFare.toFixed(2),
          },
          ...(ageSurcharge > 0
            ? [
                {
                  lineType: "VEHICLE_AGE_SURCHARGE",
                  description: "0-3 years newer vehicle surcharge",
                  amount: new Prisma.Decimal(ageSurcharge).toFixed(2),
                } satisfies QuoteLineItem,
              ]
            : []),
        ];

        const estimatedTotal = baseCorridorFare
          .plus(ageSurcharge)
          .plus(operationalBundleAmount);

        return {
          includedKmPerDay,
          minimumKmPerDay: MINIMUM_KM_PER_DAY,
          includedDays: tripDays,
          totalIncludedKm,
          billableKm: corridorBillableKm,
          perKmRate,
          basePrice: baseCorridorFare.plus(ageSurcharge),
          operationalBundleAmount,
          estimatedTotal,
          lineItems,
          routeDistanceKm: corridorRouteKm ?? null,
          returnDistanceKm: null,
          usableDistanceKm: corridorRouteKm,
          snapshotData: {
            pricingMode: "ONE_WAY_FIXED_ROUTE",
            category: input.category,
            ageBucket: input.ageBucket,
            vehiclePresetId: input.vehiclePresetId,
            productType: input.productType,
            sourceCity: input.sourceCity,
            destinationCity: input.destinationCity,
            corridorFare: baseCorridorFare.toFixed(2),
            corridorRouteKm,
            corridorReturnKm,
            oneWayAgeSurcharge: ageSurcharge > 0 ? ageSurcharge : undefined,
            operationalBundleRate: 0,
            operationalBundleIncludesActuals: false,
            calculatedAt: new Date().toISOString(),
            configVersion: "MVP_PLACEHOLDER_V1",
          },
        };
      }

      // Fallback: one-way selection falls back to tour pricing when route/category is ineligible.
      return this.buildTourPricingResult({
        input,
        tripDays,
        includedKmPerDay,
        totalIncludedKm,
        perKmRate,
        routeDistanceKm,
        returnDistanceKm,
        usableDistanceKm,
      });
    }
    return this.buildTourPricingResult({
      input,
      tripDays,
      includedKmPerDay,
      totalIncludedKm,
      perKmRate,
      routeDistanceKm,
      returnDistanceKm,
      usableDistanceKm,
    });
  }

  private buildCityTourPricingResult(params: {
    input: PricingInput;
    tripDays: number;
    routeDistanceKm: number | null;
  }): PricingResult {
    const rateConfig = CITY_TOUR_RATE_MATRIX[params.input.category];
    if (!rateConfig) {
      throw new ValidationError("City tour for this vehicle is coming soon");
    }

    const packageCode = this.resolveCityTourPackageCode(
      params.input.cityTourPackage,
      params.input.estimatedKm
    );
    const packageConfig = CITY_TOUR_PACKAGES[packageCode];
    const packageFare = rateConfig.faresByPackage[packageCode];

    const perKmRate = new Prisma.Decimal(rateConfig.extraKmRate);
    const basePrice = new Prisma.Decimal(packageFare);
    const operationalBundleAmount = new Prisma.Decimal(0);
    const estimatedTotal = basePrice;
    const billableKm = packageConfig.includedKm;

    const lineItems: QuoteLineItem[] = [
      {
        lineType: "CITY_TOUR_PACKAGE",
        description: `City tour package ${packageConfig.hours} hr / ${packageConfig.includedKm} km`,
        amount: basePrice.toFixed(2),
      },
      {
        lineType: "CITY_TOUR_EXTRA_KM_RATE",
        description: `Extra km charge @ ₹${rateConfig.extraKmRate}/km`,
        amount: "0.00",
      },
      {
        lineType: "CITY_TOUR_EXTRA_HOUR_RATE",
        description: `Extra hour charge @ ₹${rateConfig.extraHourRate}/hr`,
        amount: "0.00",
      },
    ];

    return {
      includedKmPerDay: packageConfig.includedKm,
      minimumKmPerDay: packageConfig.includedKm,
      includedDays: 1,
      totalIncludedKm: packageConfig.includedKm,
      billableKm,
      perKmRate,
      basePrice,
      operationalBundleAmount,
      estimatedTotal,
      lineItems,
      routeDistanceKm: params.routeDistanceKm ?? packageConfig.includedKm,
      returnDistanceKm: null,
      usableDistanceKm: packageConfig.includedKm,
      snapshotData: {
        pricingMode: "CITY_TOUR_FIXED_PACKAGE",
        category: params.input.category,
        ageBucket: params.input.ageBucket,
        vehiclePresetId: params.input.vehiclePresetId,
        productType: params.input.productType,
        sourceCity: params.input.sourceCity,
        destinationCity: params.input.destinationCity,
        cityTourPackageCode: packageCode,
        cityTourHours: packageConfig.hours,
        cityTourIncludedKm: packageConfig.includedKm,
        cityTourFare: basePrice.toFixed(2),
        cityTourExtraKmRate: rateConfig.extraKmRate,
        cityTourExtraHourRate: rateConfig.extraHourRate,
        operationalBundleRate: 0,
        operationalBundleIncludesActuals: false,
        calculatedAt: new Date().toISOString(),
        configVersion: "MVP_PLACEHOLDER_V1",
      },
    };
  }

  private buildAirportPricingResult(params: {
    input: PricingInput;
    routeDistanceKm: number | null;
  }): PricingResult {
    const rateConfig = AIRPORT_RATE_MATRIX[params.input.category];
    if (!rateConfig) {
      throw new ValidationError("Airport pricing for this vehicle is coming soon");
    }

    const packageCode = this.resolveAirportPackageCode(
      params.input.airportPackage,
      params.input.estimatedKm
    );
    const includedKm = AIRPORT_PACKAGE_KM[packageCode];
    const packageFare = rateConfig.faresByPackage[packageCode];
    const basePrice = new Prisma.Decimal(packageFare);
    const operationalBundleAmount = new Prisma.Decimal(0);
    const perKmRate = new Prisma.Decimal(0);

    const lineItems: QuoteLineItem[] = [
      {
        lineType: "AIRPORT_PACKAGE",
        description: `Airport transfer package ${includedKm} km (all inclusive)`,
        amount: basePrice.toFixed(2),
      },
      {
        lineType: "AIRPORT_ENTRY_INCLUDED",
        description: "Airport entry charges included",
        amount: "0.00",
      },
    ];

    return {
      includedKmPerDay: includedKm,
      minimumKmPerDay: includedKm,
      includedDays: 1,
      totalIncludedKm: includedKm,
      billableKm: includedKm,
      perKmRate,
      basePrice,
      operationalBundleAmount,
      estimatedTotal: basePrice,
      lineItems,
      routeDistanceKm: params.routeDistanceKm ?? includedKm,
      returnDistanceKm: null,
      usableDistanceKm: includedKm,
      snapshotData: {
        pricingMode: "AIRPORT_FIXED_PACKAGE",
        category: params.input.category,
        ageBucket: AgeBucket.ZERO_TO_THREE,
        vehiclePresetId: params.input.vehiclePresetId,
        productType: params.input.productType,
        sourceCity: params.input.sourceCity,
        destinationCity: params.input.destinationCity,
        airportPackageCode: packageCode,
        airportIncludedKm: includedKm,
        airportFare: basePrice.toFixed(2),
        airportEntryIncluded: true,
        operationalBundleRate: 0,
        operationalBundleIncludesActuals: false,
        calculatedAt: new Date().toISOString(),
        configVersion: "MVP_PLACEHOLDER_V1",
      },
    };
  }

  /**
   * Calculate trip days from start/end dates.
   * MVP: Simple ceiling division; partial days count as full days.
   */
  private calculateTripDays(startDate: Date, endDate?: Date): number {
    if (!endDate) {
      // Default to 1 day for trips without explicit end date
      return 1;
    }

    const diffMs = endDate.getTime() - startDate.getTime();
    const diffDays = diffMs / (1000 * 60 * 60 * 24);

    // Ceiling: partial days count as full days
    return Math.max(1, Math.ceil(diffDays));
  }

  /**
   * Get per-km rate per category.
   * MVP placeholder rates — real configuration TBD per pricing-engine.md.
   */
  private getPerKmRate(
    category: VehicleCategory,
    ageBucket: AgeBucket,
    vehiclePresetId?: string
  ): number {
    const isNewAge =
      ageBucket === AgeBucket.ZERO_TO_THREE;

    if (category === VehicleCategory.SEDAN) {
      return isNewAge ? 13 : 12;
    }

    if (category === VehicleCategory.ERTIGA) {
      return isNewAge ? 15 : 14;
    }

    if (category === VehicleCategory.KIA_CARENS) {
      return isNewAge ? 16 : 15;
    }

    if (category === VehicleCategory.INNOVA_CRYSTA) {
      return isNewAge ? 20 : 19;
    }

    if (category === VehicleCategory.TEMPO_TRAVELLER) {
      if (vehiclePresetId === "urbania16") {
        return isNewAge ? 36 : 35;
      }

      return isNewAge ? 28 : 26;
    }

    throw new ValidationError("Unsupported vehicle category");
  }

  private buildTourPricingResult(params: {
    input: PricingInput;
    tripDays: number;
    includedKmPerDay: number;
    totalIncludedKm: number;
    perKmRate: Prisma.Decimal;
    routeDistanceKm: number | null;
    returnDistanceKm: number | null;
    usableDistanceKm: number | null;
  }): PricingResult {
    const billableKm = Math.max(
      params.routeDistanceKm ?? params.totalIncludedKm,
      params.totalIncludedKm
    );
    const basePrice = new Prisma.Decimal(billableKm).times(params.perKmRate);
    const operationalBundleAmount = new Prisma.Decimal(billableKm).times(OPERATIONAL_BUNDLE_RATE);

    const lineItems: QuoteLineItem[] = [
      {
        lineType: "BASE_DISTANCE",
        description: `${billableKm} km @ ₹${params.perKmRate.toFixed(2)}/km`,
        amount: basePrice.toFixed(2),
      },
      {
        lineType: "OPERATIONAL_BUNDLE",
        description: "Toll, parking, driver food & halting (bundled)",
        amount: operationalBundleAmount.toFixed(2),
      },
    ];

    const estimatedTotal = basePrice.plus(operationalBundleAmount);

    return {
      includedKmPerDay: params.includedKmPerDay,
      minimumKmPerDay: MINIMUM_KM_PER_DAY,
      includedDays: params.tripDays,
      totalIncludedKm: params.totalIncludedKm,
      billableKm,
      perKmRate: params.perKmRate,
      basePrice,
      operationalBundleAmount,
      estimatedTotal,
      lineItems,
      routeDistanceKm: params.routeDistanceKm,
      returnDistanceKm: params.returnDistanceKm,
      usableDistanceKm: params.usableDistanceKm,
      snapshotData: {
        pricingMode: "TOUR",
        category: params.input.category,
        ageBucket: params.input.ageBucket,
        vehiclePresetId: params.input.vehiclePresetId,
        productType: params.input.productType,
        sourceCity: params.input.sourceCity,
        destinationCity: params.input.destinationCity,
        routeDistanceKm: params.routeDistanceKm,
        returnDistanceKm: params.returnDistanceKm,
        billableKm,
        minimumKmPerDay: MINIMUM_KM_PER_DAY,
        perKmRate: params.perKmRate.toFixed(2),
        operationalBundleRate: OPERATIONAL_BUNDLE_RATE,
        operationalBundleIncludesActuals: true,
        calculatedAt: new Date().toISOString(),
        configVersion: "MVP_PLACEHOLDER_V1",
      },
    };
  }

  private getOneWayRouteKey(sourceCity: string, destinationCity: string): string {
    const normalizedSource = this.normalizeRouteCity(sourceCity);
    const normalizedDestination = this.normalizeRouteCity(destinationCity);
    const ordered = [normalizedSource, normalizedDestination].sort((a, b) =>
      a.localeCompare(b)
    );
    return `${ordered[0]}|${ordered[1]}`;
  }

  private normalizeRouteCity(city: string): string {
    const normalized = city.toLowerCase().replace(/[^a-z]/g, "");
    if (normalized.includes("sambhajinagar") || normalized.includes("aurangabad")) {
      return "sambhajinagar";
    }
    if (normalized.includes("mumbai")) {
      return "mumbai";
    }
    if (normalized.includes("pune")) {
      return "pune";
    }
    if (normalized.includes("nashik") || normalized.includes("nasik")) {
      return "nashik";
    }
    return normalized;
  }

  private resolveCityTourPackageCode(
    preferredPackage?: CityTourPackageCode,
    estimatedKm?: number
  ): CityTourPackageCode {
    if (preferredPackage && CITY_TOUR_PACKAGES[preferredPackage]) {
      return preferredPackage;
    }

    if (!estimatedKm) {
      return "8h80km";
    }

    if (estimatedKm <= 60) return "6h60km";
    if (estimatedKm <= 80) return "8h80km";
    if (estimatedKm <= 100) return "10h100km";
    return "12h120km";
  }

  private resolveAirportPackageCode(
    preferredPackage?: AirportPackageCode,
    estimatedKm?: number
  ): AirportPackageCode {
    if (
      preferredPackage &&
      (preferredPackage === "10km" ||
        preferredPackage === "20km" ||
        preferredPackage === "30km" ||
        preferredPackage === "40km")
    ) {
      return preferredPackage;
    }

    if (!estimatedKm) return "10km";
    if (estimatedKm <= 10) return "10km";
    if (estimatedKm <= 20) return "20km";
    if (estimatedKm <= 30) return "30km";
    return "40km";
  }
}

/**
 * Singleton instance for use in booking service.
 */
export const quoteService = new QuoteService();
