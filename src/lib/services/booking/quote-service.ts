/**
 * Tamaiyyo — QuoteService (pricing calculations).
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
 * - Base rates: ₹3,000-7,000/day by category
 * - Included km: 300km/day (fixed)
 * - Extra km: ₹12-25/km by category
 * - One-way surcharge: 30% of base fare
 * - Age bucket discounts: 0-10-20% by vehicle age
 */

import { VehicleCategory, AgeBucket, ProductType } from "@prisma/client";
import { Prisma } from "@prisma/client";
import type { QuoteLineItem } from "@/lib/repositories/booking/quote-repository";

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
  sourceCity: string;
}

/**
 * Pricing calculation result.
 */
export interface PricingResult {
  includedKmPerDay: number;
  includedDays: number;
  totalIncludedKm: number;
  basePrice: Prisma.Decimal;
  extraKmCharge: Prisma.Decimal;
  estimatedTotal: Prisma.Decimal;
  lineItems: QuoteLineItem[];
  snapshotData: Record<string, unknown>;
}

/**
 * QuoteService — pricing calculation logic.
 */
export class QuoteService {
  /**
   * Calculate pricing for a trip.
   * MVP placeholder pricing — real configuration TBD.
   */
  calculatePricing(input: PricingInput): PricingResult {
    // Calculate trip duration (days)
    const tripDays = this.calculateTripDays(
      input.tripStartDate,
      input.tripEndDate
    );

    // Get base rate per day (MVP placeholder)
    const baseRatePerDay = this.getBaseRatePerDay(
      input.category,
      input.ageBucket,
      input.productType
    );

    // Included km per day (MVP: 300km/day default per pricing-engine.md §5)
    const includedKmPerDay = 300;
    const totalIncludedKm = includedKmPerDay * tripDays;

    // Calculate base price
    const basePrice = new Prisma.Decimal(baseRatePerDay).times(tripDays);

    // Calculate extra km charge if estimated km provided
    let extraKmCharge = new Prisma.Decimal(0);
    const lineItems: QuoteLineItem[] = [];

    lineItems.push({
      lineType: "BASE_PACKAGE",
      description: `${tripDays} day(s) @ ${includedKmPerDay}km/day (${input.category}, ${input.ageBucket})`,
      amount: basePrice.toFixed(2),
    });

    if (input.estimatedKm && input.estimatedKm > totalIncludedKm) {
      const extraKm = input.estimatedKm - totalIncludedKm;
      const extraKmRate = this.getExtraKmRate(input.category);
      extraKmCharge = new Prisma.Decimal(extraKm).times(extraKmRate);

      lineItems.push({
        lineType: "EXTRA_KM",
        description: `${extraKm} extra km @ ₹${extraKmRate}/km`,
        amount: extraKmCharge.toFixed(2),
      });
    }

    // One-way surcharge for ONE_WAY product type (MVP: 30% of base)
    let oneWaySurcharge = new Prisma.Decimal(0);
    if (input.productType === "ONE_WAY") {
      oneWaySurcharge = basePrice.times(0.3);
      lineItems.push({
        lineType: "ONE_WAY_SURCHARGE",
        description: "One-way repositioning charge",
        amount: oneWaySurcharge.toFixed(2),
      });
    }

    const estimatedTotal = basePrice
      .plus(extraKmCharge)
      .plus(oneWaySurcharge);

    return {
      includedKmPerDay,
      includedDays: tripDays,
      totalIncludedKm,
      basePrice,
      extraKmCharge,
      estimatedTotal,
      lineItems,
      snapshotData: {
        category: input.category,
        ageBucket: input.ageBucket,
        productType: input.productType,
        sourceCity: input.sourceCity,
        baseRatePerDay,
        includedKmPerDay,
        extraKmRate: input.estimatedKm
          ? this.getExtraKmRate(input.category)
          : null,
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
      // Default to 1 day for one-way trips without explicit end date
      return 1;
    }

    const diffMs = endDate.getTime() - startDate.getTime();
    const diffDays = diffMs / (1000 * 60 * 60 * 24);

    // Ceiling: partial days count as full days
    return Math.max(1, Math.ceil(diffDays));
  }

  /**
   * Get base rate per day for category/age bucket/product type.
   * MVP placeholder rates — real configuration TBD per pricing-engine.md.
   */
  private getBaseRatePerDay(
    category: VehicleCategory,
    ageBucket: AgeBucket,
    productType: ProductType
  ): number {
    // Base rates by category (MVP placeholders)
    const categoryRates: Record<VehicleCategory, number> = {
      SEDAN: 3000,
      ERTIGA: 3500,
      KIA_CARENS: 4000,
      INNOVA_CRYSTA: 5000,
      TEMPO_TRAVELLER: 7000,
    };

    let baseRate = categoryRates[category];

    // Age bucket adjustment (MVP: percentage adjustments)
    const ageBucketMultipliers: Record<AgeBucket, number> = {
      ZERO_TO_THREE: 1.0, // Newest vehicles
      THREE_TO_SEVEN: 0.9, // 10% discount
      SEVEN_TO_TWELVE: 0.8, // 20% discount
    };

    baseRate = baseRate * ageBucketMultipliers[ageBucket];

    return Math.round(baseRate);
  }

  /**
   * Get extra km rate per category.
   * MVP placeholder rates.
   */
  private getExtraKmRate(category: VehicleCategory): number {
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
