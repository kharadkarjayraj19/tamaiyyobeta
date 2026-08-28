# Tamayo — Booking Architecture Review: UI Trip Types

**Date:** 2026-05-31  
**Status:** Architecture Review  
**Purpose:** Evaluate current booking architecture compatibility with proposed UI model (One Way / Multi-City / Round Trip)

---

## Executive Summary

**Current State:**
- Schema supports `ONE_WAY` and `ROUND_TRIP` product types only
- Multiple destinations already fully supported via JSON array in `BookingItinerary`
- Pricing distinguishes between ONE_WAY (30% surcharge) and ROUND_TRIP

**Proposed UI Model:**
1. **One Way Transfer** — Single pickup to single destination, no return
2. **Multi-City Tour** — Multiple destination stops (may or may not return to origin)
3. **Round Trip Tour** — Outstation trip with return to origin

**Assessment:** **Minor service changes + schema enum addition required**

---

## Review Findings

### 1. Can existing schema support all three trip types?

**Answer:** **Partially — enum addition required**

**Current Schema (`prisma/schema.prisma`):**

```prisma
enum ProductType {
  ONE_WAY
  ROUND_TRIP
}

model Booking {
  productType      ProductType
  // ...
}
```

**Gap:**
- No explicit `MULTI_CITY` enum value
- Current binary choice cannot distinguish multi-city trips from simple one-way/round-trip

**Required Change:**
```prisma
enum ProductType {
  ONE_WAY        // A -> B (no return)
  MULTI_CITY     // A -> B -> C -> ... (may or may not return)
  ROUND_TRIP     // A -> B -> A (explicit return to origin)
}
```

**Migration Required:** ✅ Yes (enum addition)

---

### 2. Can existing BookingItinerary support multiple destinations?

**Answer:** **YES — Already fully supported**

**Current Schema:**

```prisma
model BookingItinerary {
  id                String   @id @default(uuid())
  bookingId         String   @unique
  pickupLocation    String
  pickupGeo         Json?    // { lat, lng }
  destinations      Json     // [{ location, geo? }] — ARRAY of destinations
  routeDistanceKm   Int?
  returnDistanceKm  Int?
  createdAt         DateTime @default(now())

  booking Booking @relation(fields: [bookingId], references: [id], onDelete: Restrict)
}
```

**Validation (`booking-schemas.ts`):**
```typescript
destinations: z.array(DestinationStopSchema).min(1).max(10)
```

**Conclusion:** ✅ No change needed — architecture already supports 1-10 destinations

---

### 3. Does pricing architecture require changes?

**Answer:** **Minor service changes required**

**Current Pricing Logic (`quote-service.ts`):**

```typescript
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
```

**Gap:**
- No pricing logic for `MULTI_CITY` trips
- Need to define: Does multi-city get charged as ONE_WAY, ROUND_TRIP, or its own logic?

**Required Changes:**

**Option A: Business Rule Required**
- **If MULTI_CITY returns to origin:** Price as `ROUND_TRIP` (no surcharge)
- **If MULTI_CITY does NOT return to origin:** Price as `ONE_WAY` (30% surcharge)

**Option B: New Pricing Model**
- **MULTI_CITY:** Gets its own surcharge calculation (e.g., based on number of stops, total distance)

**Recommendation:** **Option A** (simpler for MVP) — determine at quote time based on itinerary:
```typescript
// Pseudo-logic
const returnsToOrigin = lastDestination.location === pickupLocation;
const effectivePricingType = productType === "MULTI_CITY" 
  ? (returnsToOrigin ? "ROUND_TRIP" : "ONE_WAY")
  : productType;
```

**Migration Required:** ❌ No schema change, service logic only

---

### 4. Does quote generation require changes?

**Answer:** **Minor service changes required**

**Current Quote Service (`quote-service.ts`):**
- Method: `calculatePricing(input: PricingInput): PricingResult`
- Input includes `productType: ProductType`
- Logic only handles `ONE_WAY` and `ROUND_TRIP`

**Required Changes:**

1. **Accept new enum value:** Add `MULTI_CITY` to `ProductType` import
2. **Pricing logic:** Implement pricing strategy (see §3 above)
3. **Validation:** Update type guards/switches to handle all three cases

**Example Service Update:**
```typescript
// quote-service.ts
calculatePricing(input: PricingInput): PricingResult {
  // ...existing base calculation...

  // Determine effective pricing strategy
  let effectivePricingType = input.productType;
  if (input.productType === "MULTI_CITY") {
    // Business rule: Check if returns to origin
    const returnsToOrigin = this.checkIfReturnsToOrigin(input);
    effectivePricingType = returnsToOrigin ? "ROUND_TRIP" : "ONE_WAY";
  }

  // Apply surcharge based on effective type
  if (effectivePricingType === "ONE_WAY") {
    oneWaySurcharge = basePrice.times(0.3);
    // ...
  }
}
```

**Migration Required:** ❌ No schema change, service logic only

---

### 5. Does booking validation require changes?

**Answer:** **Minor schema changes required**

**Current Validation (`booking-schemas.ts`):**
```typescript
productType: z.enum([ProductType.ONE_WAY, ProductType.ROUND_TRIP])
```

**Required Change:**
```typescript
productType: z.enum([
  ProductType.ONE_WAY, 
  ProductType.MULTI_CITY,
  ProductType.ROUND_TRIP
])
```

**Additional Validation (Optional but Recommended):**
```typescript
// Cross-field validation: MULTI_CITY must have 2+ destinations
.refine(
  (data) => {
    if (data.productType === ProductType.MULTI_CITY) {
      return data.destinations.length >= 2;
    }
    return true;
  },
  { message: "Multi-city trips must have at least 2 destinations" }
)
```

**Migration Required:** ❌ No schema change, validation logic only

---

### 6. Are new enums needed?

**Answer:** **YES — ProductType enum addition required**

**Required Migration:**
```prisma
// prisma/schema.prisma
enum ProductType {
  ONE_WAY
  MULTI_CITY     // NEW
  ROUND_TRIP
}
```

**Migration Script:**
```sql
-- Add new enum value to ProductType
ALTER TYPE "ProductType" ADD VALUE 'MULTI_CITY';
```

**Impact:**
- **Backward compatible:** Existing bookings (ONE_WAY, ROUND_TRIP) remain valid
- **No data migration required:** No existing records need updating

**Migration Required:** ✅ Yes (enum addition)

---

### 7. Are database migrations required?

**Answer:** **YES — Single enum migration required**

**Migration Scope:**
1. Add `MULTI_CITY` to `ProductType` enum
2. No table structure changes
3. No data migrations
4. No index changes

**Migration Risk:** **LOW** (additive-only change)

---

### 8. Is this a UI-only change?

**Answer:** **NO — Backend changes required**

**Change Scope:**

| Layer | Change Type | Effort |
|-------|-------------|--------|
| **Prisma Schema** | Enum addition | ✅ 1 migration |
| **Service Layer** | Pricing logic for MULTI_CITY | 🟡 Minor (1-2 hours) |
| **Validation Layer** | Update Zod schemas | 🟢 Trivial (15 min) |
| **API Layer** | No changes (already accepts productType) | ✅ No change |
| **Repository Layer** | No changes (already handles any ProductType) | ✅ No change |
| **Documentation** | Update feature docs with MULTI_CITY rules | 🟢 Trivial (30 min) |

**Total Effort Estimate:** **2-3 hours backend work** (excluding testing)

---

## 9. Change Classification Summary

### ✅ No Change Needed
- **Multiple destination support** — Already implemented via JSON array
- **Booking creation APIs** — Already accept multiple destinations
- **Repository layer** — Type-agnostic, no changes
- **API handlers** — Accept productType as enum, no logic changes

### 🟡 Minor Service Changes
- **Quote service pricing logic** — Add MULTI_CITY handling (2 hours)
- **Booking service validation** — Optional cross-field checks (30 min)
- **Zod validation schemas** — Add MULTI_CITY to enum (15 min)

### 🔴 Schema Changes
- **ProductType enum** — Add MULTI_CITY value (1 migration)

---

## Implementation Roadmap

### Phase 1: Schema Migration (30 minutes)
1. Update `prisma/schema.prisma`:
   ```prisma
   enum ProductType {
     ONE_WAY
     MULTI_CITY
     ROUND_TRIP
   }
   ```
2. Generate migration: `npx prisma migrate dev --name add_multi_city_product_type`
3. Apply migration to development database

### Phase 2: Service Layer Updates (2 hours)
1. **Update `quote-service.ts`:**
   - Add business rule: Determine if MULTI_CITY returns to origin
   - Apply ONE_WAY or ROUND_TRIP pricing logic accordingly
   - Add `MULTI_CITY` to line item descriptions

2. **Update `booking-service.ts`:**
   - Import new `ProductType.MULTI_CITY` enum value
   - Optional: Add validation for MULTI_CITY destination count (≥2)

### Phase 3: Validation Layer Updates (15 minutes)
1. **Update `booking-schemas.ts`:**
   ```typescript
   productType: z.enum([
     ProductType.ONE_WAY,
     ProductType.MULTI_CITY,
     ProductType.ROUND_TRIP
   ])
   ```
2. Optional: Add cross-field validation for MULTI_CITY destination count

### Phase 4: Documentation Updates (30 minutes)
1. Update `docs/features/booking-lifecycle.md`:
   - Add MULTI_CITY trip type definition
   - Document pricing behavior (returns-to-origin vs not)
2. Update `docs/features/pricing-engine.md`:
   - Add MULTI_CITY pricing philosophy
   - Document surcharge rules
3. Update `docs/architecture/domain-models/booking-domain-model.md`:
   - Add MULTI_CITY to product type vocabulary
4. Update API documentation (if exists)

### Phase 5: Testing (2-3 hours)
1. **Unit tests:**
   - Quote service with MULTI_CITY (returns to origin)
   - Quote service with MULTI_CITY (does NOT return to origin)
2. **Integration tests:**
   - Booking creation with MULTI_CITY + 2 destinations
   - Booking creation with MULTI_CITY + 5 destinations
3. **API tests:**
   - POST `/api/v1/bookings/quote` with MULTI_CITY
   - POST `/api/v1/bookings` with MULTI_CITY

---

## Business Rules to Resolve (BLOCKER)

Before implementation, **product/ops must decide:**

### Question 1: MULTI_CITY Pricing Strategy

**Option A: Returns-to-Origin Based** (Recommended for MVP)
- **IF** last destination == pickup location: Price as ROUND_TRIP (no surcharge)
- **ELSE**: Price as ONE_WAY (30% surcharge)

**Option B: Distance-Based**
- Calculate total route distance across all stops
- Apply tiered surcharge based on total km

**Option C: Stop-Count Based**
- Base price + (N-1) * stop_surcharge for N destinations

**Recommendation:** **Option A** for MVP (simple, aligns with existing ONE_WAY/ROUND_TRIP logic)

### Question 2: Minimum Destination Count for MULTI_CITY

**Options:**
- **≥2 destinations** (allows A -> B as multi-city)
- **≥3 destinations** (requires A -> B -> C minimum)

**Recommendation:** **≥2 destinations** for flexibility (A -> B -> C qualifies, A -> B -> A qualifies)

### Question 3: MULTI_CITY Day Calculation

**Options:**
- **Same as ROUND_TRIP** (tripEndDate - tripStartDate)
- **Automatic from route** (estimate N days from total distance / 300km per day)
- **Customer-specified** (manual day count input)

**Recommendation:** **Same as ROUND_TRIP** (reuse existing logic)

---

## Risks and Mitigations

### Risk 1: Enum Migration Locking
**Risk:** Enum alteration may lock `Booking` table during migration  
**Mitigation:** Run migration during low-traffic window; modern PostgreSQL handles enum additions without table rewrite  
**Severity:** LOW

### Risk 2: Pricing Ambiguity
**Risk:** Unclear pricing for edge cases (e.g., A -> B -> C -> A with 3 stops)  
**Mitigation:** Document explicit business rules BEFORE implementation; add integration tests for all scenarios  
**Severity:** MEDIUM (blocks implementation until resolved)

### Risk 3: UI/Backend Type Mismatch
**Risk:** Frontend sends "Multi-City Tour" string instead of `MULTI_CITY` enum  
**Mitigation:** Ensure frontend uses exact Prisma enum values; add API-level validation  
**Severity:** LOW (caught by Zod validation)

---

## Architectural Alignment

### Preserves Existing Patterns ✅
- Repository boundaries unchanged
- Transaction discipline maintained
- Immutable snapshots preserved
- Domain events compatible
- Soft-delete philosophy unaffected

### Documentation Governance ✅
- Requires updates to:
  - `docs/features/booking-lifecycle.md`
  - `docs/features/pricing-engine.md`
  - `docs/architecture/domain-models/booking-domain-model.md`
- Maintains **Maturity: FOUNDATION** status

### MVP Philosophy ✅
- Minimal schema changes (additive only)
- Reuses existing pricing logic where possible
- No new infrastructure required
- Incremental feature addition

---

## Final Recommendation

### Verdict: **Minor Backend Changes Required** (2-3 hours + testing)

### Change Classification:
- **Schema:** 1 enum migration (30 min)
- **Service:** Minor pricing logic updates (2 hours)
- **Validation:** Trivial Zod schema updates (15 min)
- **Documentation:** Standard governance updates (30 min)

### Blockers:
1. **Business rule decision required:** MULTI_CITY pricing strategy (see §10)
2. **Product clarification needed:** Minimum destination count for MULTI_CITY

### Implementation Sequence:
1. Resolve business rules (product/ops decision)
2. Schema migration
3. Service layer updates
4. Validation updates
5. Documentation updates
6. Testing

### Risk Level: **LOW**
- All changes are additive
- Existing bookings unaffected
- Backward compatible
- Fits within existing architecture patterns

---

## Appendix A: Current Schema Support Analysis

### Booking Model ✅
```prisma
model Booking {
  productType      ProductType       // ✅ Already supports enum
  sourceCity       String            // ✅ Single source supported
  destinationCity  String?           // ✅ Optional (for multi-destination)
  // ...
}
```

### BookingItinerary Model ✅
```prisma
model BookingItinerary {
  pickupLocation    String            // ✅ Single pickup
  destinations      Json              // ✅ ARRAY of destinations (already supports multiple)
  routeDistanceKm Int?              // ✅ Can store total route distance
  // ...
}
```

### Validation Support ✅
```typescript
// Current validation already accepts 1-10 destinations
destinations: z.array(DestinationStopSchema).min(1).max(10)
```

---

## Appendix B: Comparative Analysis

### One Way Transfer
- **Current Support:** ✅ Fully supported (`ProductType.ONE_WAY`)
- **Destinations:** 1 (single destination)
- **Pricing:** Base + 30% surcharge
- **Change Required:** ❌ None

### Multi-City Tour
- **Current Support:** ⚠️ Partial (data model ready, enum missing)
- **Destinations:** 2+ (already supported via JSON array)
- **Pricing:** ❓ Business rule required
- **Change Required:** ✅ Enum + pricing logic

### Round Trip Tour
- **Current Support:** ✅ Fully supported (`ProductType.ROUND_TRIP`)
- **Destinations:** 1+ (already supports multiple stops on round trip)
- **Pricing:** Base (no surcharge)
- **Change Required:** ❌ None

---

## Document Metadata

| Field | Value |
|-------|-------|
| **Review Date** | 2026-05-31 |
| **Reviewer** | AI Agent (Claude Sonnet 4.5) |
| **Scope** | Schema, Service, Validation, API compatibility |
| **Verdict** | **Minor backend changes required** |
| **Estimated Effort** | 2-3 hours (excluding testing) |
| **Risk Level** | LOW (additive changes only) |
| **Business Blocker** | MULTI_CITY pricing strategy decision required |

---

## Revision Log

| Date | Change |
|------|--------|
| 2026-05-31 | **Initial review:** Assessed current booking architecture against One Way / Multi-City / Round Trip UI model. Identified enum addition + minor service changes required. |
