# Tamaiyyo — Pricing Engine vs UI Model: UX & Terminology Review

**Date:** 2026-05-31  
**Status:** UX Architecture Review  
**Purpose:** Evaluate pricing engine architecture against new business rules and determine optimal customer-facing presentation for vehicle cards, fare terminology, KM disclosure, and billing transparency

---

## Executive Summary

**Current Pricing Architecture:**
- **Day-based pricing:** Base rate per day × trip duration
- **Included KM:** 300km/day (accumulated over multi-day trips)
- **Extra KM charges:** Per-km rate above included allowance
- **One-way surcharge:** 30% markup on base fare
- **Uniform model:** Same pricing logic for all trip types

**New Business Rules:**
1. **One Way Transfer** → Uses **corridor pricing** (fixed fare per route, e.g., Delhi-Jaipur)
2. **Multi-City Tour** → Uses **KM-based pricing** (price per km driven)
3. **Multi-day tours** → May have **minimum daily billable KM** (distinct from actual route KM)
4. **One-way tours** → May require **empty return costing** (vehicle deadhead back to origin)
5. **Route KM ≠ Billable KM** → Actual driving distance may differ from charged distance

**Gap Assessment:** **CRITICAL ARCHITECTURAL MISMATCH**

The current pricing engine implements a **uniform day-rate + included-km + extra-km** model. The new business rules require **three distinct pricing models** that are fundamentally incompatible with the current architecture.

---

## Part 1: Pricing Architecture Gap Analysis

### Current Implementation vs New Business Rules

| Trip Type | Current Model | New Business Rule | Architectural Gap |
|-----------|---------------|-------------------|-------------------|
| **One Way Transfer** | Day-rate + 30% surcharge | **Corridor pricing** (fixed route fare) | 🔴 **CRITICAL:** No corridor pricing infrastructure |
| **Multi-City Tour** | Day-rate + included km | **KM-based pricing** (per-km rate) | 🔴 **CRITICAL:** No pure KM-based pricing mode |
| **Round Trip Tour** | Day-rate + included km | *(Presumably same)* | 🟢 **Compatible** (if day-rate model retained) |
| **Billable KM Logic** | Included km + extra km | **Minimum daily billable KM** + empty return | 🔴 **CRITICAL:** No minimum billable km concept |
| **Route Distance** | Estimated km = billable km | **Route KM ≠ Billable KM** | 🔴 **CRITICAL:** No distinction in quote/billing |

### Gap Severity Classification

#### 🔴 Critical Gaps (Blocks Implementation)

**1. Corridor Pricing Infrastructure Missing**
- **Current:** No concept of pre-defined city-pair routes with fixed fares
- **Required:** 
  - Corridor configuration table (origin-destination pairs)
  - Fixed fare per corridor per vehicle category
  - Corridor eligibility checks (can ONE_WAY serve this route?)
  - Fallback logic when corridor not configured

**2. Pure KM-Based Pricing Mode Missing**
- **Current:** Pricing always anchored to day-rate; KM is secondary (extra charges only)
- **Required:**
  - Primary pricing based on estimated route distance × per-km rate
  - No day-rate base (or day-rate becomes KM-derived)
  - Multi-stop route distance calculation
  - KM range estimation with confidence levels

**3. Minimum Daily Billable KM Not Modeled**
- **Current:** 300km/day "included" allowance; customer only pays extra above this
- **Required:**
  - **Minimum billable KM per day** concept (e.g., "You're charged for minimum 250km/day even if you drive 150km")
  - Distinct from "included km" (prepaid envelope vs minimum charge floor)
  - Final billing logic: `MAX(actual_km, minimum_billable_km) × rate`

**4. Empty Return Costing Not Implemented**
- **Current:** One-way surcharge is flat 30% of base fare
- **Required:**
  - Calculate empty return distance (destination → origin)
  - Add empty return km to billable distance OR apply separate empty return charge
  - Transparency: Show "Includes empty return (X km)" on quote

**5. Route KM vs Billable KM Distinction Missing**
- **Current:** No architectural separation; estimated km used for both route planning and billing basis
- **Required:**
  - **Route KM:** Actual driving distance (Google Maps estimate)
  - **Billable KM:** Charged distance (may include empty return, minimum floors, rounding)
  - Separate fields in quote/bill; UX must explain variance

---

## Part 2: Customer-Facing UX Recommendations

### What Should Be Shown on Vehicle Cards?

Vehicle cards appear in search results / quote listings. Goal: **Balance transparency with simplicity; avoid cognitive overload while preventing sticker shock at checkout.**

#### Recommendation by Trip Type

**ONE WAY TRANSFER (Corridor Pricing)**

**✅ Show:**
- **Fixed fare** (e.g., "₹4,500")
- **Route label** (e.g., "Delhi → Jaipur")
- **Distance reference** (e.g., "~280 km")
- **Inclusions** (e.g., "Fuel, driver, empty return included")

**❌ Hide:**
- Per-km breakdown (not relevant for corridor pricing)
- Included km allowance (confusing when fare is fixed)
- Extra km rates (only relevant if customer deviates from corridor)

**Example Card:**
```
┌─────────────────────────────────────┐
│ Sedan (2020 Model)                  │
│                                      │
│ ₹4,500                               │
│ Delhi → Jaipur (~280 km)            │
│                                      │
│ ✓ Fuel & driver included            │
│ ✓ Empty return covered              │
│ ✓ Tolls extra (paid at actuals)     │
│                                      │
│ [Book Now]                           │
└─────────────────────────────────────┘
```

---

**MULTI-CITY TOUR (KM-Based Pricing)**

**✅ Show:**
- **Estimated total fare** (e.g., "₹12,500")
- **Route distance** (e.g., "~750 km across 3 cities")
- **Per-km rate** (e.g., "₹15/km base")
- **Minimum billable km/day** (e.g., "Min 250 km/day charged")
- **Days count** (e.g., "3-day tour")

**❌ Hide:**
- Day-rate (not primary pricing dimension for multi-city)
- Corridor-specific fare (not applicable)

**Example Card:**
```
┌─────────────────────────────────────┐
│ Innova Crysta (2021 Model)          │
│                                      │
│ ₹12,500 estimated                    │
│ 3-day tour • ~750 km                 │
│                                      │
│ @ ₹15/km • Min 250 km/day            │
│                                      │
│ ✓ Fuel & driver included            │
│ ✓ Final fare based on actual km     │
│ ✓ Tolls extra (paid at actuals)     │
│                                      │
│ [Book Now]                           │
└─────────────────────────────────────┘
```

---

**ROUND TRIP TOUR (Day-Rate + Included KM)**

**✅ Show:**
- **Total fare** (e.g., "₹9,000")
- **Day count** (e.g., "3 days")
- **Included km** (e.g., "900 km included (300 km/day)")
- **Extra km rate** (e.g., "+ ₹12/km beyond")

**❌ Hide:**
- Per-day rate breakdown (customer cares about total, not daily split)
- Empty return charges (not applicable for round trip)

**Example Card:**
```
┌─────────────────────────────────────┐
│ Sedan (2019 Model)                  │
│                                      │
│ ₹9,000                               │
│ 3 days • 900 km included             │
│                                      │
│ ✓ 300 km/day included                │
│ ✓ Extra km @ ₹12/km                  │
│ ✓ Tolls extra (paid at actuals)     │
│                                      │
│ [Book Now]                           │
└─────────────────────────────────────┘
```

---

### Fare Terminology Recommendations

**Goal:** Use consistent, customer-friendly language that aligns with Indian outstation cab market norms while maintaining transparency.

| Concept | ❌ Avoid | ✅ Recommended | Rationale |
|---------|----------|----------------|-----------|
| **Base fare** | "Day rate", "Per diem" | **"Base fare"** or **"Package fare"** | "Day rate" is supplier jargon; "package" implies bundled value |
| **Included distance** | "Included kilometers", "Free km" | **"X km included"** | Simple, direct; avoids implying km are "free" (prepaid) |
| **Extra distance charges** | "Excess km", "Overage" | **"Extra km @ ₹X/km"** | Clear marginal pricing; "excess" has negative connotation |
| **Empty return** | "Deadhead", "Repositioning fee" | **"Empty return included"** or **"Return journey covered"** | Positive framing; customer understands vehicle must return |
| **Minimum billable km** | "Minimum km", "Floor km" | **"Min X km/day charged"** | Direct policy statement; sets expectation upfront |
| **Route distance** | "Estimated km", "Approx distance" | **"~X km (Google Maps)"** | Transparency about source; tilde (~) indicates estimate |
| **Billable distance** | "Chargeable km", "Billing km" | **"X km charged"** or **"Final km: X"** | Clear billing terminology at final bill stage |
| **Corridor fare** | "Fixed fare", "Route fare" | **"₹X for [City A → City B]"** | Clarity that price is route-specific |
| **Actual distance** | "GPS km", "Odometer reading" | **"Actual km driven: X"** | Plain language; avoid technical jargon on customer UI |

---

### When Should KM Be Shown?

**Guideline:** Show KM information when it **directly affects price or sets customer expectations**. Omit when it creates confusion or isn't actionable.

| Stage | Trip Type | Show KM? | Details to Display |
|-------|-----------|----------|-------------------|
| **Vehicle Card (Search Results)** | One Way Transfer | 🟡 **Optional** | Route distance as context only (e.g., "~280 km"); not pricing basis |
| | Multi-City Tour | ✅ **Yes** | Total route km + per-km rate + min daily billable km |
| | Round Trip Tour | ✅ **Yes** | Included km + extra km rate |
| **Quote Breakdown** | One Way Transfer | 🟡 **Optional** | Show route km + empty return km if helping justify corridor fare |
| | Multi-City Tour | ✅ **Yes** | Route estimate + billable km logic + per-km rate |
| | Round Trip Tour | ✅ **Yes** | Included km + estimated extra km (if any) |
| **Booking Confirmation** | All Types | ✅ **Yes** | Summary of km expectations for customer planning |
| **Trip Execution** | All Types | ✅ **Yes** (supplier/driver view) | Actual km tracking for billing reconciliation |
| **Final Bill** | One Way Transfer | 🟡 **Optional** | Show only if customer deviated from corridor (e.g., detour stops) |
| | Multi-City Tour | ✅ **Yes** | Actual km driven + billable km + per-km rate |
| | Round Trip Tour | ✅ **Yes** | Included km + actual extra km + charges |

---

### How Should Billable KM vs Route KM Be Explained?

**Challenge:** Customers expect "distance traveled = distance charged." When these differ (empty return, minimum billable km, rounding), transparency is critical to avoid disputes.

#### Explanation Strategies by Context

**1. Quote Stage (Preventive Transparency)**

**Strategy:** Disclose the billing logic **before** booking to set expectations.

**ONE WAY TRANSFER:**
```
Route distance: ~280 km (Delhi → Jaipur)
Empty return: ~280 km (vehicle returns to Delhi)
─────────────────────────────────────────
Total billable: 560 km (included in ₹4,500)
```

**Explanation copy (collapsible/tooltip):**
> "For one-way trips, the vehicle must return to its home city empty. 
> The corridor fare of ₹4,500 includes both your journey (280 km) 
> and the empty return (280 km)."

**MULTI-CITY TOUR:**
```
Estimated route: ~750 km (3 cities over 3 days)
Minimum billable: 750 km (250 km/day × 3 days)
─────────────────────────────────────────
Charged at: ₹15/km = ₹11,250 base fare
```

**Explanation copy:**
> "You're charged for actual km driven or 250 km/day, whichever is higher. 
> This ensures fair pricing for shorter daily journeys while covering vehicle costs."

**ROUND TRIP TOUR:**
```
Trip duration: 3 days
Included: 900 km (300 km/day)
Estimated route: ~850 km
─────────────────────────────────────────
Estimated extra km: 0 km
Total fare: ₹9,000 (base package)
```

**Explanation copy:**
> "Your package includes 900 km (300 km/day). If you drive more, 
> extra km are charged at ₹12/km. Tolls and parking are extra."

---

**2. Final Bill Stage (Reconciliation Transparency)**

**Strategy:** Line-item breakdown showing route km, billing adjustments, and final charged km.

**Example Final Bill (Multi-City Tour):**
```
┌─────────────────────────────────────────────┐
│ Trip Summary                                 │
├─────────────────────────────────────────────┤
│ Route driven (GPS):        720 km           │
│ Minimum billable (3 days): 750 km           │
│ Charged km:                750 km ◄───┐     │
│                                        │     │
│ Base fare @ ₹15/km:        ₹11,250    │     │
│ Tolls (actuals):           ₹1,200     │     │
│ Parking:                   ₹150       │     │
├─────────────────────────────────────────────┤
│ Total:                     ₹12,600    │     │
└─────────────────────────────────────────────┘
                                         │
                                         │
                Why 750 km and not 720 km?
                                         │
      Your package guarantees minimum    │
      250 km/day billing. You drove 720  │
      km over 3 days (avg 240 km/day),   │
      so minimum billable applies.       └──────
```

**Explanation copy:**
> "**Why am I charged for 750 km when I drove 720 km?**  
> Your multi-city package includes a minimum billable distance of 250 km/day 
> (750 km for 3 days). Since your actual route was 720 km, the minimum applies. 
> This ensures fair vehicle utilization pricing."

---

**3. Dispute Prevention (Proactive Communication)**

**At Booking Confirmation (Email/SMS/App):**
```
✓ Booking confirmed: TAMB-12345

Your fare: ₹12,500 (estimated)
Route: Delhi → Agra → Jaipur → Delhi

📍 Billing basis:
   • Actual km driven OR 250 km/day minimum
   • Tolls & parking at actuals
   • Final bill after trip completion

Questions? View billing policy: [link]
```

**During Trip (Driver App Prompt):**
```
Day 1 of 3 completed
Km driven today: 180 km
Minimum billable today: 250 km

⚠️ Reminder: Customer is charged for 250 km 
   minimum per day. Actual: 180 km.
```

---

### How Should Empty Return Charges Be Represented?

**Challenge:** "Empty return" is supplier-side economics, not customer-facing language. Goal: Reframe as value-included.

#### Recommended Approaches

**1. Positive Framing: "Included" Language**

**✅ Recommended:**
- "Empty return included in corridor fare"
- "Return journey covered"
- "Full round-trip cost included"

**❌ Avoid:**
- "Empty return charge: ₹2,000"
- "Deadhead fee"
- "Repositioning cost"

**Rationale:** Customers understand vehicles must return; framing as "included" feels like value, not a surcharge.

---

**2. Visual Breakdown (Optional Transparency)**

**For cost-conscious customers or competitive differentiation:**

```
Corridor Fare Breakdown (Delhi → Jaipur)
──────────────────────────────────────
Your journey (280 km)       ₹2,250
Empty return (280 km)       ₹2,250
────────────────────────────────────── 
Total corridor fare         ₹4,500
```

**When to show:**
- On "Fare Details" expandable section (optional click)
- When customer questions why one-way costs more than half of round-trip
- In competitive comparison ("Other platforms charge return separately")

**When NOT to show:**
- Primary vehicle card (cognitive load)
- Checkout page (creates hesitation)

---

**3. Comparative Messaging (Conversion Optimization)**

**For ONE WAY TRANSFER:**

**Option A: Implicit Inclusion**
```
₹4,500 for Delhi → Jaipur
✓ Fuel, driver, and return included
```

**Option B: Explicit Comparison**
```
₹4,500 for Delhi → Jaipur
Instead of ₹2,250 one way + ₹2,250 return separately
✓ Transparent corridor pricing
```

**Option C: Value Proposition**
```
₹4,500 for Delhi → Jaipur
✓ No hidden charges
✓ Vehicle return cost included
✓ Tolls extra (pay actual only)
```

**Recommendation:** **Option A** for primary display; Option C for competitive markets.

---

### What Information Prevents Customer Confusion While Maximizing Conversion?

**Balance:** Transparency builds trust (reduces post-booking disputes) but complexity kills conversion (analysis paralysis).

#### Conversion-Optimized Information Hierarchy

**TIER 1: Above the Fold (Vehicle Card) — MUST SHOW**
- **Total estimated fare** (hero number)
- **Trip type label** (One Way / Multi-City / Round Trip)
- **Route summary** (city names, distance if relevant)
- **Key inclusions** (fuel, driver, empty return for one-way)

**TIER 2: Expandable Details — SHOW ON DEMAND**
- Per-km rates (for KM-based pricing)
- Minimum billable km logic
- Included km breakdown (for round trip)
- Extra km charges
- Toll/parking policy
- Empty return explanation (for one-way)

**TIER 3: Quote Page — DETAILED BREAKDOWN**
- Line-item pricing
- Route km vs billable km explanation
- Billing policy summary
- Fare lock-in confirmation

**TIER 4: Post-Booking — EXPECTATION SETTING**
- Booking confirmation email with billing basis
- Trip SMS with km tracking link (if implemented)
- Driver app prompts for km milestones

---

#### Specific Anti-Confusion Tactics

**1. Avoid Premature Precision**

**❌ Bad (Vehicle Card):**
```
Base fare: ₹9,000
Included km: 900 km (300 km/day × 3 days)
Extra km rate: ₹12/km
Estimated extra km: 0-50 km
Toll estimate: ₹800-1,200
Parking estimate: ₹100-300
─────────────────────────────────────
Total: ₹9,900 - ₹10,500
```
**Problem:** Too many ranges and estimates create uncertainty.

**✅ Good (Vehicle Card):**
```
₹9,000 for 3 days
✓ 900 km included
✓ Extra km @ ₹12/km
✓ Tolls extra (actuals)

View detailed quote →
```
**Benefit:** Simple hero number; complexity deferred to quote page.

---

**2. Use Anchoring Pricing**

**For Multi-City (Variable KM):**

**❌ Bad:**
```
Price depends on actual km driven
@ ₹15/km
```
**Problem:** No price anchor; creates uncertainty.

**✅ Good:**
```
₹12,500 estimated
for ~750 km route @ ₹15/km

Final fare based on actual km
Min 250 km/day guaranteed billing
```
**Benefit:** Clear estimate sets expectation; variable component disclosed.

---

**3. Normalize "Actuals" Language Early**

**Strategy:** Condition customers to expect "actuals" for tolls/parking from first touchpoint.

**Vehicle Card Footer (All Trip Types):**
```
✓ Fuel & driver included
⚠ Tolls & parking at actuals
```

**Quote Page Expansion:**
```
What does "at actuals" mean?
You pay the exact toll and parking amounts 
your trip incurs (receipts provided). 
No markup or estimates.
```

**Benefit:** Reduces final bill shock; "actuals" becomes expected norm.

---

**4. Pre-Empt "Why Is This More Expensive?" Questions**

**For ONE WAY TRANSFER (Corridor Pricing):**

**Show Comparison (Optional):**
```
Why corridor pricing?

One-way trips require the vehicle to return 
empty to its home city. Our corridor fares 
include both your journey and the return, 
so there are no surprise charges.

Alternative: Round trip may be cheaper 
if you're returning to [Origin City]
[See Round Trip Options →]
```

**Benefit:** Proactive education; positions corridor pricing as fairness, not markup.

---

## Part 3: Pricing Engine Architectural Recommendations

### Required Changes to Support New Business Rules

**1. Introduce Pricing Mode Dimension**

**Current:** Single uniform pricing model (day-rate + included km)

**Required:** Pricing mode selector based on trip type

```typescript
enum PricingMode {
  CORRIDOR_FIXED,      // ONE_WAY: Fixed fare per city-pair
  KM_BASED,            // MULTI_CITY: Per-km rate with min billable
  DAY_RATE_INCLUSIVE,  // ROUND_TRIP: Day-rate + included km
}
```

**Mapping:**
- `ProductType.ONE_WAY` → `PricingMode.CORRIDOR_FIXED`
- `ProductType.MULTI_CITY` → `PricingMode.KM_BASED`
- `ProductType.ROUND_TRIP` → `PricingMode.DAY_RATE_INCLUSIVE`

---

**2. Add Corridor Configuration Entity**

**Schema Concept:**
```prisma
model Corridor {
  id                String   @id @default(uuid())
  originCity        String
  destinationCity   String
  routeDistanceKm   Int      // Google Maps baseline
  emptyReturnKm     Int      // Typically same as route distance
  category          VehicleCategory
  fixedFare         Decimal  @db.Decimal(10, 2)
  isActive          Boolean  @default(true)
  effectiveFrom     DateTime
  effectiveUntil    DateTime?
  
  @@unique([originCity, destinationCity, category, effectiveFrom])
  @@index([originCity, destinationCity, isActive])
}
```

**Quote Service Logic:**
```typescript
// For ONE_WAY trips
const corridor = await corridorRepository.findActiveByRoute(
  sourceCity,
  destinationCity,
  category
);

if (corridor) {
  // Use fixed corridor fare
  return {
    pricingMode: PricingMode.CORRIDOR_FIXED,
    totalFare: corridor.fixedFare,
    routeKm: corridor.routeDistanceKm,
    billableKm: corridor.routeDistanceKm + corridor.emptyReturnKm,
    lineItems: [
      { type: "CORRIDOR_FARE", description: `${sourceCity} → ${destinationCity}`, amount: corridor.fixedFare },
      { type: "EMPTY_RETURN", description: "Return journey included", amount: 0 }, // Shown as included
    ],
  };
} else {
  // Fallback to round-trip or error
  throw new ValidationError("One-way not available for this route");
}
```

---

**3. Implement Minimum Daily Billable KM Logic**

**Schema Addition (PricingSnapshot):**
```prisma
model BookingPricingSnapshot {
  // ...existing fields...
  minDailyBillableKm Int?  // NEW: Minimum km per day that will be charged
  pricingMode        String // NEW: "CORRIDOR_FIXED" | "KM_BASED" | "DAY_RATE_INCLUSIVE"
}
```

**Quote Service Logic (MULTI_CITY):**
```typescript
// For MULTI_CITY trips
const tripDays = calculateTripDays(tripStartDate, tripEndDate);
const minDailyBillableKm = 250; // Configuration-driven
const minTotalBillableKm = minDailyBillableKm * tripDays;

const estimatedRouteKm = calculateMultiCityRouteDistance(destinations);
const billableKm = Math.max(estimatedRouteKm, minTotalBillableKm);

const perKmRate = getPerKmRate(category, ageBucket);
const baseFare = new Prisma.Decimal(billableKm).times(perKmRate);

return {
  pricingMode: PricingMode.KM_BASED,
  routeKm: estimatedRouteKm,
  minBillableKm: minTotalBillableKm,
  billableKm: billableKm,
  perKmRate: perKmRate,
  baseFare: baseFare,
  lineItems: [
    { type: "KM_BASE", description: `${billableKm} km @ ₹${perKmRate}/km`, amount: baseFare },
    { type: "MIN_KM_NOTE", description: `Minimum ${minDailyBillableKm} km/day charged`, amount: 0 },
  ],
};
```

---

**4. Separate Route KM from Billable KM Fields**

**Current Schema (BookingItinerary):**
```prisma
model BookingItinerary {
  estimatedDistance Int?  // Ambiguous: route or billable?
}
```

**Required Schema:**
```prisma
model BookingItinerary {
  routeDistanceKm      Int?   // Google Maps estimated route km
  billableDistanceKm   Int?   // Charged km (may include empty return, min floors)
  emptyReturnKm        Int?   // For ONE_WAY: deadhead distance
  billingNotes         String? // Explanation of billable vs route variance
}
```

**Final Bill Logic:**
```typescript
// At trip completion
const actualKmDriven = tripExecution.finalKm;
const minBillableKm = pricingSnapshot.minDailyBillableKm * tripDays;
const billableKm = Math.max(actualKmDriven, minBillableKm);

const varianceNote = actualKmDriven < minBillableKm
  ? `Minimum ${minBillableKm} km charged (actual: ${actualKmDriven} km)`
  : `Actual km driven: ${actualKmDriven} km`;

await finalBillRepository.create({
  bookingId,
  routeKm: actualKmDriven,
  billableKm: billableKm,
  billingNotes: varianceNote,
  // ...line items...
});
```

---

**5. Update Quote Service Interface**

**Current Interface:**
```typescript
interface PricingResult {
  basePrice: Prisma.Decimal;
  extraKmCharge: Prisma.Decimal;
  estimatedTotal: Prisma.Decimal;
  includedKmPerDay: number;
  lineItems: QuoteLineItem[];
}
```

**Required Interface:**
```typescript
interface PricingResult {
  pricingMode: PricingMode;  // NEW
  
  // Common fields
  estimatedTotal: Prisma.Decimal;
  lineItems: QuoteLineItem[];
  
  // Mode-specific fields (nullable)
  corridorFare?: Prisma.Decimal;          // CORRIDOR_FIXED only
  routeKm?: number;                       // All modes
  billableKm?: number;                    // All modes
  emptyReturnKm?: number;                 // CORRIDOR_FIXED only
  
  perKmRate?: Prisma.Decimal;             // KM_BASED only
  minDailyBillableKm?: number;            // KM_BASED only
  
  basePrice?: Prisma.Decimal;             // DAY_RATE_INCLUSIVE only
  includedKmPerDay?: number;              // DAY_RATE_INCLUSIVE only
  extraKmCharge?: Prisma.Decimal;         // DAY_RATE_INCLUSIVE only
  
  snapshotData: Record<string, unknown>;
}
```

---

## Part 4: UX Copy Templates

### Vehicle Card Copy by Trip Type

**ONE WAY TRANSFER**
```
Sedan (2020 Model • Diesel)

₹4,500
Delhi → Jaipur (~280 km)

✓ Fuel & driver included
✓ Empty return covered
⚠ Tolls extra (actuals)

[View Details] [Book Now]

──────────────────────────
Why this price? (expandable)
──────────────────────────
This corridor fare includes both 
your journey (280 km) and the 
vehicle's return to Delhi (280 km).

Cheaper than separate charges!
```

---

**MULTI-CITY TOUR**
```
Innova Crysta (2021 Model • Diesel)

₹12,500 estimated
3 days • ~750 km route

@ ₹15/km • Min 250 km/day

✓ Fuel & driver included
✓ Final fare = actual km driven
⚠ Tolls extra (actuals)

[View Route] [Book Now]

──────────────────────────
How billing works (expandable)
──────────────────────────
You're charged for actual km 
driven or 250 km/day (whichever 
is higher). Final bill after trip.

Perfect for flexible itineraries!
```

---

**ROUND TRIP TOUR**
```
Sedan (2019 Model • Diesel)

₹9,000
3 days • 900 km included

✓ 300 km/day included
✓ Extra km @ ₹12/km
⚠ Tolls extra (actuals)

[View Details] [Book Now]

──────────────────────────
What's included (expandable)
──────────────────────────
Your package covers 900 km total
(300 km/day × 3 days). Drive less? 
No refund. Drive more? Pay ₹12/km 
for extra distance only.

Best for predictable routes!
```

---

### Quote Breakdown Page Templates

**ONE WAY TRANSFER**
```
Fare Breakdown

Corridor Fare (Delhi → Jaipur)  ₹4,500
────────────────────────────────
  • Your journey: 280 km
  • Empty return: 280 km included
  • Fuel & driver included

Tolls (estimated)*               ₹800
Parking (if any)*                ₹0
────────────────────────────────
Estimated Total                  ₹5,300

* Paid at actuals (exact amount)

[Lock This Fare & Book]

──────────────────────────────
💡 Good to know
──────────────────────────────
• Corridor fare is fixed—no surprises
• Tolls/parking charged at exact actuals
• Empty return already included in fare
• Cancel >24h before trip for full refund
```

---

**MULTI-CITY TOUR**
```
Fare Breakdown

Base Fare (~750 km route)        ₹11,250
────────────────────────────────
  • Route: Delhi → Agra → Jaipur → Delhi
  • Estimated: 750 km over 3 days
  • Rate: ₹15/km
  • Minimum: 250 km/day charged

Tolls (estimated)*               ₹1,200
Parking (estimated)*             ₹150
────────────────────────────────
Estimated Total                  ₹12,600

* Final bill based on actuals

[Confirm Booking]

──────────────────────────────
💡 Billing Details
──────────────────────────────
Your final fare = actual km driven 
(or 250 km/day minimum) × ₹15/km

Example scenarios:
• Drive 800 km over 3 days → Pay for 800 km
• Drive 600 km over 3 days → Pay for 750 km (min)

View full billing policy →
```

---

**ROUND TRIP TOUR**
```
Fare Breakdown

Package Fare (3 days)            ₹9,000
────────────────────────────────
  • 3 days × ₹3,000/day
  • 900 km included (300 km/day)
  • Fuel & driver included

Extra KM (if any)                ₹0
────────────────────────────────
  • Estimated route: 850 km
  • 900 km included ✓
  • No extra km expected

Tolls (estimated)*               ₹1,000
Parking (estimated)*             ₹100
────────────────────────────────
Estimated Total                  ₹10,100

* Paid at actuals (exact amount)

[Proceed to Payment]

──────────────────────────────
💡 Package Inclusions
──────────────────────────────
• 900 km included in package
• Extra km charged @ ₹12/km
• Example: If you drive 950 km, 
  extra 50 km × ₹12 = ₹600 added
• Tolls & parking always at actuals
```

---

### Final Bill Reconciliation Template

**MULTI-CITY TOUR (With Minimum Billable KM Applied)**
```
════════════════════════════════
FINAL BILL
Booking: TAMB-12345
Trip: Delhi → Agra → Jaipur → Delhi
Dates: May 10-12, 2026 (3 days)
════════════════════════════════

DISTANCE SUMMARY
────────────────────────────────
Route driven (GPS):        720 km
Minimum billable (3 days): 750 km
Charged distance:          750 km ◄─┐
                                     │
BASE FARE                            │
────────────────────────────────────│
750 km @ ₹15/km            ₹11,250  │
                                     │
ACTUALS                              │
────────────────────────────────────│
Tolls (receipts attached)  ₹1,150   │
Parking (receipts attached) ₹120    │
                                     │
────────────────────────────────────│
TOTAL DUE                  ₹12,520  │
Advance paid               ₹5,000   │
────────────────────────────────────│
Balance due                ₹7,520   │
════════════════════════════════════│
                                     │
[Pay Balance]    [Raise Dispute]    │
                                     │
──────────────────────────────────  │
❓ Why 750 km when I drove 720 km?  │
──────────────────────────────────  │
Your multi-city package includes    │
a minimum billable distance of      │
250 km/day (750 km for 3 days).     │
                                     │
Actual distance: 720 km              │
Minimum billable: 750 km ◄───────────┘
Charged: 750 km (higher of the two)

This ensures fair vehicle 
utilization pricing for flexible 
multi-city tours.

[View Billing Policy]
```

---

## Part 5: Conversion Optimization Tactics

### Tactic 1: Pricing Anchors

**Strategy:** Show "value received" to justify prices

**ONE WAY TRANSFER:**
```
₹4,500 for Delhi → Jaipur

💰 What you'd pay separately:
   Your journey:    ₹2,500
   Empty return:    ₹2,500
   ─────────────────────────
   Total if separate: ₹5,000
   
   You save: ₹500 with corridor pricing!
```

---

### Tactic 2: Dynamic Comparison

**Strategy:** Show relative value vs alternatives

**MULTI-CITY:**
```
₹12,500 for 3-day tour (750 km)

vs. Self-drive:
   Rental:        ₹3,000
   Fuel:          ₹6,000
   Tolls:         ₹1,200
   Driver (if hired): ₹1,500
   ─────────────────────────
   Total:         ₹11,700
   
   + You drive + Fuel management hassle
   
   Our all-inclusive package: ₹12,500
   ✓ Professional driver
   ✓ No fuel worries
   ✓ Relax and enjoy
```

---

### Tactic 3: Social Proof

**Strategy:** Reduce uncertainty with usage stats

**Vehicle Card Badge:**
```
🔥 Booked 47 times this month
   on Delhi → Jaipur route

⭐ 4.8/5 average rating
   "Transparent billing" - 89% reviews
```

---

### Tactic 4: Risk Reversal

**Strategy:** Guarantee fairness

**All Trip Types (Badge on Card):**
```
✓ Fare Locked at Booking
✓ No Hidden Charges
✓ Toll Receipts Provided
✓ Cancel >24h = Full Refund
```

---

### Tactic 5: Urgency + Scarcity (When Applicable)

**Strategy:** Motivate immediate booking

**ONE WAY (High-Demand Corridor):**
```
⚠️ Only 2 vehicles left for May 15
   
₹4,500 • Delhi → Jaipur
Corridor fare locked until Jun 1

[Book Now] [Save for Later]
```

---

## Part 6: Critical Gaps Summary Table

| Gap Category | Current State | Required State | Implementation Complexity | UX Impact |
|--------------|---------------|----------------|---------------------------|-----------|
| **Corridor Pricing** | No infrastructure | Corridor config table, fixed-fare logic | 🔴 HIGH (new entity, quote logic) | 🔴 CRITICAL (ONE_WAY trips broken without it) |
| **KM-Based Pricing** | Day-rate primary | Per-km primary, no day anchor | 🔴 HIGH (quote service rewrite) | 🔴 CRITICAL (MULTI_CITY pricing wrong) |
| **Min Billable KM** | Only "included km" concept | Min floor distinct from included | 🟡 MEDIUM (billing logic + snapshot fields) | 🟡 HIGH (customer confusion if not disclosed) |
| **Empty Return Costing** | Flat 30% surcharge | Distance-based or corridor-embedded | 🟡 MEDIUM (calculation + UX messaging) | 🟢 MEDIUM (can absorb into corridor fare) |
| **Route vs Billable KM** | No distinction | Separate fields + variance explanation | 🟡 MEDIUM (schema + final bill UI) | 🔴 CRITICAL (disputes if not explained) |
| **Pricing Mode Enum** | Uniform model | Mode selector by trip type | 🟢 LOW (enum + conditional logic) | 🟢 LOW (internal architecture) |
| **UX Copy Templates** | Generic | Trip-type-specific messaging | 🟢 LOW (content work) | 🟡 HIGH (conversion impact) |

---

## Part 7: Recommended Implementation Sequence

### Phase 1: Critical Foundation (Blocks MVP Launch)

**Priority: P0 — MUST HAVE**

1. **Add `PricingMode` enum** to architecture
2. **Create `Corridor` configuration entity** (schema + repository)
3. **Implement corridor pricing logic** in quote service
4. **Separate route KM from billable KM** in schema
5. **Add minimum daily billable KM logic** for MULTI_CITY
6. **Update `PricingResult` interface** to support all modes

**Estimated Effort:** 2-3 weeks (backend + schema + testing)

---

### Phase 2: UX Transparency Layer (Reduces Disputes)

**Priority: P1 — SHOULD HAVE**

1. **Design vehicle card templates** per trip type
2. **Implement quote breakdown page** with expandable explanations
3. **Create final bill reconciliation UI** with variance explanations
4. **Add "Why this price?" tooltips** on vehicle cards
5. **Write customer-facing copy** for all billing scenarios

**Estimated Effort:** 1-2 weeks (frontend + content + design review)

---

### Phase 3: Conversion Optimization (Revenue Impact)

**Priority: P2 — NICE TO HAVE**

1. **Add pricing anchors** ("What you'd pay separately" comparisons)
2. **Implement social proof** badges (booking counts, ratings)
3. **Add risk reversal** messaging (fare lock, no hidden charges)
4. **A/B test** corridor fare breakdowns (included vs itemized)

**Estimated Effort:** 1 week (frontend + analytics instrumentation)

---

## Part 8: Open Questions for Product/Ops

### Question 1: Corridor Configuration Scope

**Options:**
- **Option A:** Pre-define top 50 corridors only (Delhi-Jaipur, Mumbai-Pune, etc.)
- **Option B:** Allow dynamic corridor creation by admin for any city pair
- **Option C:** Hybrid: Top corridors fixed, others use fallback day-rate

**Recommendation:** **Option C** for MVP (balance coverage and ops overhead)

---

### Question 2: Minimum Billable KM — Global or City-Specific?

**Options:**
- **Option A:** Single global minimum (e.g., 250 km/day for all cities)
- **Option B:** City-specific minimums (metro: 200 km/day, tier-2: 300 km/day)
- **Option C:** Category-specific minimums (Sedan: 250, Tempo: 400)

**Recommendation:** **Option A** for MVP; promote to **Option B** post-launch based on supplier feedback

---

### Question 3: Empty Return — Always Billable or Corridor-Dependent?

**Options:**
- **Option A:** Always add empty return km to billable distance (transparent)
- **Option B:** Absorb into corridor fare (simpler UX, less transparency)
- **Option C:** Configurable per corridor (high-demand routes absorb, low-demand explicit)

**Recommendation:** **Option B** for MVP (simpler customer messaging)

---

### Question 4: Route KM Estimation — Google Maps or Internal Algorithm?

**Options:**
- **Option A:** Always use Google Maps API for route estimation
- **Option B:** Use internal city-pair lookup table (faster, cheaper, less accurate)
- **Option C:** Hybrid: Lookup table for known corridors, Google Maps for multi-city

**Recommendation:** **Option C** (balance cost and accuracy)

---

### Question 5: Final Bill Variance Threshold — When to Flag?

**Options:**
- **Option A:** Always show variance explanation (max transparency)
- **Option B:** Only show if variance > 10% of estimate
- **Option C:** Only show if variance > ₹500 absolute

**Recommendation:** **Option A** for trust-building; **Option B** for UX simplicity post-MVP

---

## Part 9: Risk Assessment

### Risk 1: Customer Confusion — Minimum Billable KM

**Likelihood:** HIGH  
**Impact:** HIGH (disputes, refund requests, poor reviews)

**Mitigation:**
- Pre-disclose minimum billable km on vehicle card
- Add tooltip explaining "Why minimum?"
- Show worked examples on quote page
- Proactive SMS/email explaining billing basis at booking confirmation

---

### Risk 2: Conversion Drop — Pricing Complexity

**Likelihood:** MEDIUM  
**Impact:** HIGH (revenue loss)

**Mitigation:**
- A/B test detailed vs simplified vehicle cards
- Default to "hero number + expand for details" pattern
- Monitor quote-to-booking conversion by trip type
- Iterate UX based on drop-off analytics

---

### Risk 3: Operational Overhead — Corridor Maintenance

**Likelihood:** MEDIUM  
**Impact:** MEDIUM (admin workload, stale fares)

**Mitigation:**
- Build admin UI for corridor CRUD operations
- Implement fare expiry warnings (auto-deactivate after 30 days)
- Bulk import via CSV for initial seeding
- Monitor booking failures due to missing corridors

---

### Risk 4: Supplier Resistance — KM-Based Payouts

**Likelihood:** LOW  
**Impact:** MEDIUM (supplier churn if payout logic unclear)

**Mitigation:**
- Mirror customer billing logic for supplier payout basis
- Provide supplier-facing "Earnings Breakdown" matching customer bill
- Document payout policy in supplier onboarding
- Run pilot with 5-10 suppliers before full rollout

---

## Part 10: Success Metrics

### Customer-Facing Metrics

| Metric | Target | Measurement |
|--------|--------|-------------|
| **Quote-to-booking conversion** | >15% | By trip type (expect CORRIDOR highest, MULTI_CITY lowest initially) |
| **Post-booking cancellation rate** | <5% | Flag if >10% cancels after seeing fare breakdown |
| **Final bill dispute rate** | <2% | Track "Why this charge?" support tickets per trip type |
| **Customer satisfaction (billing transparency)** | >4.5/5 | Post-trip survey question: "Billing was clear and fair" |

### Operational Metrics

| Metric | Target | Measurement |
|--------|--------|-------------|
| **Corridor coverage** | >80% of ONE_WAY bookings | Track booking failures due to missing corridor config |
| **Admin corridor updates** | <30 min/corridor | Time to create/update corridor fare (admin efficiency) |
| **Support ticket volume (pricing)** | <3% of bookings | Track tickets tagged "billing question" or "fare confusion" |

---

## Document Metadata

| Field | Value |
|-------|-------|
| **Review Date** | 2026-05-31 |
| **Reviewer** | AI Agent (Claude Sonnet 4.5) |
| **Scope** | Pricing UX, terminology, customer communication, architecture gaps |
| **Status** | **Architecture review complete; implementation pending** |
| **Blockers** | Product decisions required (corridor scope, min billable km policy, empty return handling) |
| **Estimated Implementation** | 3-4 weeks (backend), 1-2 weeks (UX), 1 week (optimization) |

---

## Revision Log

| Date | Change |
|------|--------|
| 2026-05-31 | **Initial review:** Analyzed pricing engine vs new business rules (corridor pricing, KM-based, min billable km, empty return, route vs billable distinction). Provided UX recommendations for vehicle cards, fare terminology, KM disclosure strategies, final bill reconciliation, and conversion optimization tactics. Identified critical architectural gaps and implementation roadmap. |
