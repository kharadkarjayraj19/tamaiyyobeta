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
 * - Per-km rates: ₹12-25/km by category
 * - Operational bundle: ₹3/km (computed in backend, shown as total)
 * - One-way corridor fare: admin-configured fixed price
 */

import { VehicleCategory, AgeBucket, ProductType } from "@prisma/client";
import { Prisma } from "@prisma/client";
import type { QuoteLineItem } from "@/lib/repositories/booking/quote-repository";
import { oneWayCorridorRepository } from "@/lib/repositories/pricing/one-way-corridor-repository";
import { ValidationError } from "@/lib/errors";

/**
 * Pricing calculation input.
 */
export interface PricingInput {
  category: VehicleCategory;
  ageBucket: AgeBucket;
  productType: ProductType;
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
    const perKmRate = new Prisma.Decimal(this.getPerKmRate(input.category));
    const routeDistanceKm = input.estimatedKm ?? null;
    const returnDistanceKm = input.returnDistanceKm ?? null;
    const usableDistanceKm =
      returnDistanceKm !== null
        ? Math.max(totalIncludedKm - returnDistanceKm, 0)
        : totalIncludedKm;

    if (input.productType === "ONE_WAY") {
      if (!input.destinationCity) {
        throw new ValidationError("Destination city is required for one-way pricing");
      }

      const corridor = await oneWayCorridorRepository.findActiveByRoute({
        sourceCity: input.sourceCity,
        destinationCity: input.destinationCity,
        vehicleCategory: input.category,
      });

      if (!corridor) {
        throw new ValidationError("One-way pricing is not available for this route");
      }

      const corridorRouteKm = corridor.routeDistanceKm ?? routeDistanceKm;
      const corridorReturnKm =
        corridor.returnDistanceKm ?? returnDistanceKm ?? 0;
      const corridorBillableKm = corridorRouteKm
        ? corridorRouteKm + corridorReturnKm
        : totalIncludedKm;
      const operationalBundleAmount = new Prisma.Decimal(corridorBillableKm).times(
        OPERATIONAL_BUNDLE_RATE
      );

      const lineItems: QuoteLineItem[] = [
        {
          lineType: "CORRIDOR_FARE",
          description: `${input.sourceCity} → ${input.destinationCity}`,
          amount: corridor.fareAmount.toFixed(2),
        },
        {
          lineType: "OPERATIONAL_BUNDLE",
          description: "Toll, parking, driver food & halting (bundled)",
          amount: operationalBundleAmount.toFixed(2),
        },
      ];

      const estimatedTotal = corridor.fareAmount.plus(operationalBundleAmount);

      return {
        includedKmPerDay,
        minimumKmPerDay: MINIMUM_KM_PER_DAY,
        includedDays: tripDays,
        totalIncludedKm,
        billableKm: corridorBillableKm,
        perKmRate,
        basePrice: corridor.fareAmount,
        operationalBundleAmount,
        estimatedTotal,
        lineItems,
        routeDistanceKm: corridorRouteKm ?? null,
        returnDistanceKm: corridorReturnKm || null,
        usableDistanceKm,
        snapshotData: {
          pricingMode: "CORRIDOR",
          category: input.category,
          ageBucket: input.ageBucket,
          productType: input.productType,
          sourceCity: input.sourceCity,
          destinationCity: input.destinationCity,
          corridorId: corridor.id,
          corridorFare: corridor.fareAmount.toFixed(2),
          corridorRouteKm,
          corridorReturnKm,
          operationalBundleRate: OPERATIONAL_BUNDLE_RATE,
          operationalBundleIncludesActuals: true,
          calculatedAt: new Date().toISOString(),
          configVersion: "MVP_PLACEHOLDER_V1",
        },
      };
    }

    const billableKm = Math.max(routeDistanceKm ?? totalIncludedKm, totalIncludedKm);
    const basePrice = new Prisma.Decimal(billableKm).times(perKmRate);
    const operationalBundleAmount = new Prisma.Decimal(billableKm).times(
      OPERATIONAL_BUNDLE_RATE
    );

    const lineItems: QuoteLineItem[] = [
      {
        lineType: "BASE_DISTANCE",
        description: `${billableKm} km @ ₹${perKmRate.toFixed(2)}/km`,
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
      includedKmPerDay,
      minimumKmPerDay: MINIMUM_KM_PER_DAY,
      includedDays: tripDays,
      totalIncludedKm,
      billableKm,
      perKmRate,
      basePrice,
      operationalBundleAmount,
      estimatedTotal,
      lineItems,
      routeDistanceKm,
      returnDistanceKm,
      usableDistanceKm,
      snapshotData: {
        pricingMode: "TOUR",
        category: input.category,
        ageBucket: input.ageBucket,
        productType: input.productType,
        sourceCity: input.sourceCity,
        routeDistanceKm,
        returnDistanceKm,
        billableKm,
        minimumKmPerDay: MINIMUM_KM_PER_DAY,
        perKmRate: perKmRate.toFixed(2),
        operationalBundleRate: OPERATIONAL_BUNDLE_RATE,
        operationalBundleIncludesActuals: true,
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
  private getPerKmRate(category: VehicleCategory): number {
    const extraKmRates: Record<VehicleCategory, number> = {
      SEDAN: 12,
      ERTIGA: 14,
      KIA_CARENS: 15,
      INNOVA_CRYSTA: 18,
      TEMPO_TRAVELLER: 25,
    };

    return extraKmRates[category];
  }
}

/**
 * Singleton instance for use in booking service.
 */
export const quoteService = new QuoteService();
