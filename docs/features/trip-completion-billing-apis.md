# Tamaiyyo — Trip Completion, Final Billing, and Settlement Foundation APIs

**Maturity:** MVP  
**Purpose:** RESTful APIs for trip completion, final bill generation, and settlement foundation. Handles trip execution submission (supplier/driver submits actuals), customer km confirmation (optional), final bill calculation, and supplier earning tracking.

**Related docs:** [`docs/features/booking-lifecycle.md`](./booking-lifecycle.md), [`docs/features/billing-settlement.md`](./billing-settlement.md), [`docs/features/pricing-engine.md`](./pricing-engine.md), [`docs/architecture/domain-models/booking-domain-model.md`](../architecture/domain-models/booking-domain-model.md), [`docs/architecture/domain-models/billing-domain-model.md`](../architecture/domain-models/billing-domain-model.md), [`docs/architecture/backend-architecture.md`](../architecture/backend-architecture.md), [`docs/architecture/backend-foundation.md`](../architecture/backend-foundation.md).

---

## 1. Overview

This document specifies the **trip completion and final billing APIs** for Tamaiyyo. These APIs handle:

1. **Trip execution submission**: Supplier/driver submits actual km, odometer readings, tolls, and parking after trip completion.
2. **Customer km confirmation**: Optional workflow step where customer confirms or disputes km readings.
3. **Final bill generation**: System calculates the final bill including base fare, extra km charges, tolls, parking, and platform fee.
4. **Supplier earnings**: System calculates supplier earnings after deducting platform commission.
5. **Billing retrieval**: Retrieve final bill details for customer and supplier visibility.

**Key principles:**

- **Immutable financial snapshots**: Final bills, commission snapshots, and supplier earnings are immutable once created.
- **Transactional integrity**: Trip execution, final bill, earnings, commission, and domain events commit together atomically.
- **Audit trail**: All financial operations emit domain events for timeline reconstruction.
- **MVP placeholder pricing**: Hardcoded commission rates (₹500 flat + ₹2/km) for MVP; production will use configurable pricing engine.
- **Customer-driver km mismatch**: Handled via support workflow when difference exceeds threshold (20km for MVP).

---

## 2. API Endpoints

### 2.1. Submit Trip Execution

**POST** `/api/v1/bookings/[id]/complete`

**Purpose:** Supplier/driver submits trip actuals after completing the trip. Transitions booking from `IN_PROGRESS` → `COMPLETED`.

**Request Body:**

```json
{
  "actualKm": 450,
  "actualStartOdometer": 12000,
  "actualEndOdometer": 12450,
  "tollLines": [
    {
      "description": "Highway toll - NH48",
      "amount": "150.00",
      "receiptUrl": "https://uploads.tamaiyyo.in/..."
    }
  ],
  "parkingLines": [
    {
      "description": "Hotel parking - Day 1",
      "amount": "50.00"
    }
  ],
  "notes": "Trip completed successfully"
}
```

**Response:**

```json
{
  "success": true,
  "data": {
    "bookingId": "uuid",
    "status": "COMPLETED",
    "actualKm": 450
  }
}
```

**Validation:**

- `actualKm`: Required, must be at least 1.
- `tollLines`, `parkingLines`: Optional arrays.
- Booking must be in `IN_PROGRESS` state.

**Business Rules:**

- Creates `TripExecution` record with actuals.
- Updates booking status to `COMPLETED`.
- Emits `TRIP_COMPLETED` domain event.

---

### 2.2. Customer Confirms Km

**POST** `/api/v1/bookings/[id]/confirm-km`

**Purpose:** Customer confirms km readings after trip completion (optional workflow step).

**Request Body:**

```json
{
  "confirmedKm": 450,
  "notes": "Km reading matches"
}
```

**Response:**

```json
{
  "success": true,
  "data": {
    "bookingId": "uuid",
    "supplierKm": 455,
    "confirmedKm": 450,
    "resolvedKm": 450,
    "autoResolved": true,
    "status": "COMPLETED"
  }
}
```

**Validation:**

- `confirmedKm`: Required, must be at least 1.
- Booking must be in `COMPLETED` state.

**Business Rules:**

- **Small mismatch (≤ 20km):** Auto-resolves in favor of customer. Updates `TripExecution.actualKm` to customer's confirmed km for billing. Emits `CUSTOMER_CONFIRMED` event with `autoResolved: true`.
- **Major mismatch (> 20km):** Throws `ValidationError` and emits `KM_MISMATCH_DETECTED` event with `requiresManualResolution: true` for support escalation.
- **No mismatch:** Emits `CUSTOMER_CONFIRMED` event with `autoResolved: false`.

---

### 2.3. Generate Final Bill

**POST** `/api/v1/bookings/[id]/generate-bill`

**Purpose:** Generate final bill after trip completion (or customer confirmation). Transitions booking from `COMPLETED` → `BILLING_IN_PROGRESS`.

**Request Body:** None

**Response:**

```json
{
  "success": true,
  "data": {
    "bookingId": "uuid",
    "finalBillId": "uuid",
    "totalAmount": "12500.00",
    "subtotal": "12000.00",
    "platformFee": "500.00",
    "supplierEarning": "11000.00",
    "varianceFromQuote": "200.00",
    "status": "BILLING_IN_PROGRESS"
  }
}
```

**Validation:**

- Booking must be in `COMPLETED` state.
- `TripExecution` and `BookingPricingSnapshot` must exist.

**Business Rules:**

1. **Calculate bill line items:**
   - Base fare: `category + age bucket rate × trip days`
   - Extra km: `(actual km - included km) × extra km rate`
   - Tolls: Pass-through from trip execution
   - Parking: Pass-through from trip execution
   - One-way surcharge: From pricing snapshot (if applicable)

2. **Calculate platform commission (MVP):**
   - Flat fee: ₹500
   - Per-km commission: ₹2/km

3. **Create immutable records:**
   - `FinalBill`: Customer-visible bill with line items
   - `CommissionSnapshot`: Platform commission calculation snapshot
   - `SupplierEarning`: Supplier's net earning (subtotal - commission)

4. **Update booking status** to `BILLING_IN_PROGRESS`.

5. **Emit domain event:** `FINAL_BILL_GENERATED`.

---

### 2.4. Close Booking (Operational Closure)

**POST** `/api/v1/bookings/[id]/close`

**Purpose:** Close booking after billing is complete. Transitions booking from `BILLING_IN_PROGRESS` → `CLOSED`.

**Note:** This is MVP operational closure. In production, this would be triggered automatically by payment gateway confirmation.

**Request Body:**

```json
{
  "notes": "Payment confirmed, closing booking"
}
```

**Response:**

```json
{
  "success": true,
  "data": {
    "bookingId": "uuid",
    "status": "CLOSED",
    "finalBillId": "uuid"
  }
}
```

**Validation:**

- Booking must be in `BILLING_IN_PROGRESS` state.
- Final bill must exist.

**Business Rules:**

- Updates booking status to `CLOSED`.
- Emits `BOOKING_CLOSED` domain event.
- In production, this endpoint would be triggered by payment webhook/callback.

---

### 2.5. Get Final Bill

**GET** `/api/v1/billing/bookings/[id]`

**Purpose:** Retrieve final bill by booking ID.

**Response:**

```json
{
  "success": true,
  "data": {
    "id": "uuid",
    "bookingId": "uuid",
    "quoteId": "uuid",
    "subtotal": "12000.00",
    "platformFee": "500.00",
    "totalAmount": "12500.00",
    "varianceFromQuote": "200.00",
    "lineItems": [
      {
        "lineType": "BASE_FARE",
        "description": "SEDAN (AGE_0_3Y) - 3 day(s)",
        "quantity": 3,
        "rate": "3500.00",
        "amount": "10500.00"
      },
      {
        "lineType": "EXTRA_KM",
        "description": "Extra km (50 km)",
        "quantity": 50,
        "rate": "10.00",
        "amount": "500.00"
      },
      {
        "lineType": "TOLL",
        "description": "Highway toll - NH48",
        "amount": "150.00"
      }
    ],
    "issuedAt": "2026-05-18T10:00:00Z",
    "createdAt": "2026-05-18T10:00:00Z"
  }
}
```

**Validation:**

- Booking must have a final bill.

---

## 3. Data Models

### 3.1. TripExecution

Stores actual trip details submitted by supplier/driver.

**Fields:**

- `id`: UUID
- `bookingId`: UUID (unique, one-to-one with Booking)
- `startedAt`: DateTime (nullable)
- `completedAt`: DateTime (nullable)
- `actualKm`: Int
- `actualStartOdometer`: Int (optional)
- `actualEndOdometer`: Int (optional)
- `tollLines`: JSON array `[{ description, amount, receiptUrl? }]`
- `parkingLines`: JSON array `[{ description, amount, receiptUrl? }]`
- `extensionsUsed`: JSON (reserved for future)
- `createdAt`, `updatedAt`: DateTime

### 3.2. FinalBill

Immutable final bill record.

**Fields:**

- `id`: UUID
- `bookingId`: UUID (unique)
- `quoteId`: UUID (optional)
- `subtotal`: Decimal(10,2)
- `platformFee`: Decimal(10,2)
- `totalAmount`: Decimal(10,2)
- `varianceFromQuote`: Decimal(10,2) (optional)
- `lineItems`: JSON array `[{ lineType, description, quantity?, rate?, amount }]`
- `issuedAt`, `createdAt`: DateTime

### 3.3. CommissionSnapshot

Immutable commission calculation snapshot.

**Fields:**

- `id`: UUID
- `finalBillId`: UUID (unique, one-to-one)
- `ruleVersionId`: String (optional, for future versioned commission config)
- `perKmRate`: Decimal(10,2) (MVP: ₹2)
- `platformFeeFlat`: Decimal(10,2) (MVP: ₹500)
- `calculatedCommission`: Decimal(10,2)
- `snapshotData`: JSON (full commission rule detail)
- `createdAt`: DateTime

### 3.4. SupplierEarning

Supplier payout record.

**Fields:**

- `id`: UUID
- `bookingId`: UUID (unique)
- `supplierId`: UUID
- `finalBillId`: UUID (unique)
- `grossAmount`: Decimal(10,2) (bill subtotal)
- `commissionAmount`: Decimal(10,2)
- `netAmount`: Decimal(10,2) (gross - commission)
- `status`: Enum (`EARNED`, `ELIGIBLE`, `BATCHED`, `PAID`)
- `payoutBatchId`: UUID (nullable)
- `createdAt`, `updatedAt`: DateTime

---

## 4. Lifecycle Transitions

### 4.1. Trip Completion Flow

```
READY_FOR_TRIP → IN_PROGRESS (trip starts, not implemented yet)
IN_PROGRESS → COMPLETED (supplier submits trip execution)
COMPLETED → COMPLETED (customer confirms km, optional, auto-resolves small mismatches)
COMPLETED → BILLING_IN_PROGRESS (final bill generated)
BILLING_IN_PROGRESS → CLOSED (operational closure - MVP manual, production automated via payment webhook)
```

### 4.2. Supplier Earning Flow

```
EARNED (created with final bill)
→ ELIGIBLE (after any holds clear, not implemented yet)
→ BATCHED (added to payout batch, not implemented yet)
→ PAID (payout completed, not implemented yet)
```

---

## 5. Domain Events

| Event Type | Actor | Payload | Description |
| --- | --- | --- | --- |
| `TRIP_COMPLETED` | SUPPLIER | `{ actualKm, notes? }` | Supplier submits trip execution |
| `CUSTOMER_CONFIRMED` | CUSTOMER | `{ supplierKm, confirmedKm, difference, autoResolved, resolvedKm, notes? }` | Customer confirms km (may auto-resolve small mismatches) |
| `KM_MISMATCH_DETECTED` | CUSTOMER | `{ supplierKm, customerKm, difference, requiresManualResolution: true, notes? }` | Major km mismatch requires manual support resolution |
| `FINAL_BILL_GENERATED` | SYSTEM | `{ finalBillId, totalAmount, supplierEarning, varianceFromQuote? }` | Final bill created |
| `BOOKING_CLOSED` | SYSTEM | `{ finalBillId, notes? }` | Booking operationally closed |

---

## 6. Architecture Alignment

### 6.1. Layered Architecture

- **API Handlers** (`src/app/api/v1/bookings/[id]/complete/route.ts`, etc.):
  - HTTP concerns only
  - DTO validation using Zod
  - Mock identity headers (`x-mock-supplier-id`, `x-mock-customer-id`, `x-mock-admin-id`)
  
- **Services** (`src/lib/services/billing/billing-service.ts`):
  - Business logic orchestration
  - Transaction ownership via `withTransaction`
  - Domain event emission
  
- **Repositories** (`src/lib/repositories/billing/*`, `src/lib/repositories/booking/trip-execution-repository.ts`):
  - Prisma-only data access
  - Domain type mapping
  - No business logic

### 6.2. Validation Schemas

- `SubmitTripExecutionSchema`: Trip execution DTO
- `CustomerConfirmKmSchema`: Customer km confirmation DTO
- `GetFinalBillSchema`: Bill retrieval DTO

All schemas in `src/lib/validation/schemas/billing-schemas.ts`.

### 6.3. Error Handling

- `ValidationError`: Business rule violations (e.g., invalid state, km mismatch)
- `NotFoundError`: Booking or bill not found
- Operational errors return 4xx with error type and message

### 6.4. Transactional Integrity

All financial operations use `prisma.$transaction` to ensure:

- Trip execution + booking status + domain events commit together
- Final bill + commission snapshot + supplier earning + booking status + domain events commit together

---

## 7. Unresolved Mechanics

### 7.1. Km Mismatch Resolution

**Implemented (MVP):**

- **Small mismatch (≤ 20km):** Auto-resolves in favor of customer. Trip execution record is updated with customer's confirmed km, which is then used for final bill generation.
- **Major mismatch (> 20km):** Throws `ValidationError`, emits `KM_MISMATCH_DETECTED` event, and requires manual support resolution.

**Unresolved:**

- Support admin UI workflow to manually resolve major disputes
- Admin override capability to adjust final bill after dispute resolution
- Evidence-based resolution (GPS logs, photos, FASTag records)
- Customer vs supplier evidence weighting for automated resolution

### 7.2. Commission Configuration

**MVP:** Hardcoded flat fee (₹500) + per-km rate (₹2).

**Unresolved:**

- Database-driven commission config
- Category/city/supplier-tier-specific rates
- Time-based commission changes (versioning)

### 7.3. Payment & Payout

**Implemented (MVP):**

- Manual operational closure (`POST /bookings/[id]/close`) to transition to `CLOSED` state

**Not implemented:**

- Payment gateway integration (Razorpay, Stripe, etc.)
- Automated payment webhook → `CLOSED` transition
- Customer payment confirmation flow
- Payout batch creation and processing
- Holds and escrow logic
- Failed payment retry mechanisms

### 7.4. GST & Tax

**Not implemented:**

- GST calculation and display
- Tax invoice generation
- Supplier vs platform GST responsibility

---

## 8. Future Enhancements

### 8.1. Automated Bill Generation

Trigger final bill generation automatically after trip completion (or customer confirmation timeout).

### 8.2. Partial Refunds

Support partial refunds for mid-trip disruptions or km disputes.

### 8.3. Configurable Commission Rules

Admin UI to configure commission rates by category, city, supplier tier, and date range.

### 8.4. Payout Scheduling

Automated payout batch creation on configurable cycles (weekly, bi-weekly, monthly).

### 8.5. Supplier Earnings Dashboard

Supplier-facing dashboard to view earnings, pending payouts, and payment history.

---

## 9. Testing Notes

### 9.1. Manual Testing Flow

1. **Create booking** → `REQUESTED` state
2. **Supplier accepts** → `ACCEPTED` state
3. **Assign vehicle/driver** → `READY_FOR_TRIP` state
4. **Start trip** (not implemented) → `IN_PROGRESS` state
5. **Complete trip** (POST `/bookings/[id]/complete`) → `COMPLETED` state
6. **(Optional) Customer confirms km** (POST `/bookings/[id]/confirm-km`)
   - Small mismatch: Auto-resolves, uses customer's km for billing
   - Major mismatch: Returns error, requires support intervention
7. **Generate bill** (POST `/bookings/[id]/generate-bill`) → `BILLING_IN_PROGRESS` state
8. **Retrieve bill** (GET `/billing/bookings/[id]`)
9. **Close booking** (POST `/bookings/[id]/close`) → `CLOSED` state

### 9.2. Km Mismatch Scenarios

**Scenario A: Small Mismatch (Auto-Resolved)**

1. Supplier submits: `actualKm: 450`
2. Customer confirms: `confirmedKm: 445` (difference: 5km ≤ threshold)
3. System auto-resolves: Updates trip execution to `actualKm: 445`
4. API returns success with `autoResolved: true`, `resolvedKm: 445`
5. Check domain events: `CUSTOMER_CONFIRMED` event with auto-resolution details
6. Final bill generation uses `445km` for charges

**Scenario B: Major Mismatch (Manual Resolution Required)**

1. Supplier submits: `actualKm: 450`
2. Customer confirms: `confirmedKm: 480` (difference: 30km > threshold)
3. API returns `ValidationError` with message about manual support resolution
4. Check domain events: `KM_MISMATCH_DETECTED` event with `requiresManualResolution: true`
5. Final bill generation is blocked until support resolves the dispute

---

## 10. Revision History

| Date | Change | Author |
| --- | --- | --- |
| 2026-05-18 | Initial documentation for MVP billing APIs | Agent |
