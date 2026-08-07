# Tamaiyyo — Booking quote and creation APIs

**Maturity:** MVP  
**Purpose:** Operational REST API implementation for booking quote generation and booking creation with full transactional integrity. Implements the first customer-facing booking workflows for Tamaiyyo marketplace.

**Related docs:** [`docs/features/booking-lifecycle.md`](./booking-lifecycle.md) (lifecycle philosophy), [`docs/features/pricing-engine.md`](./pricing-engine.md) (pricing dimensions), [`docs/architecture/domain-models/booking-domain-model.md`](../architecture/domain-models/booking-domain-model.md) (booking entity architecture), [`docs/architecture/backend-foundation.md`](../architecture/backend-foundation.md) (repository/service patterns), [`docs/architecture/api-architecture.md`](../architecture/api-architecture.md) (REST philosophy).

---

## How to read this spec

| Label | Meaning |
| --- | --- |
| **Implemented** | API routes, services, repositories, and validation schemas are implemented and type-checked. |
| **MVP Placeholder** | Temporary implementation using placeholder logic (e.g., pricing rates) until real configuration is available. |
| **Unresolved mechanics** | Requires explicit product/ops decision or real configuration before full production readiness. |

---

## 1. Booking quote API

**Implemented**

### 1.1. Generate quote

**Endpoint:** `POST /api/v1/bookings/quote`

**Purpose:** Generate a price quote for a trip without creating a booking. Customer can review pricing before committing.

**Request body:**
```json
{
  "sourceCity": "Bangalore",
  "destinationCity": "Mysore",
  "pickupLocation": "Indiranagar, Bangalore",
  "destinations": [
    { "location": "Mysore Palace", "geo": { "lat": 12.3051, "lng": 76.6551 } },
    { "location": "Brindavan Gardens" }
  ],
  "tripStartDate": "2026-06-01T09:00:00Z",
  "tripEndDate": "2026-06-02T18:00:00Z",
  "category": "SEDAN",
  "ageBucket": "ZERO_TO_THREE",
  "productType": "ROUND_TRIP",
  "estimatedKm": 400,
  "returnDistanceKm": 120
}
```

**Validation:** Zod schema `BookingQuoteRequestSchema`.
- `category` enum: `SEDAN`, `ERTIGA`, `KIA_CARENS`, `INNOVA_CRYSTA`, `TEMPO_TRAVELLER`
- `ageBucket` enum: `ZERO_TO_THREE`, `THREE_TO_SEVEN`, `SEVEN_TO_TWELVE`
- `productType` enum: `ONE_WAY`, `MULTI_CITY`, `ROUND_TRIP`
- `destinations` array: min 1, max 10

**Business rules (MVP):**
- Trip start date must be in future
- Minimum included km per day: **300 km/day**
- Billable km = **max(estimated km, included km total)**
- Round-trip and multi-city share the same tour pricing logic
- One-way uses **corridor pricing** (admin-configured fixed fare)
- Operational bundle (toll, parking, driver food, halting) added as a **single total line item**

**Response:**
```json
{
  "success": true,
  "data": {
    "estimatedTotal": "9000.00",
    "includedKmPerDay": 300,
    "includedDays": 2,
    "totalIncludedKm": 600,
    "billableKm": 600,
    "perKmRate": "12.00",
    "operationalBundleAmount": "1800.00",
    "routeDistanceKm": 400,
    "returnDistanceKm": 120,
    "usableDistanceKm": 480,
    "lineItems": [
      {
        "lineType": "BASE_DISTANCE",
        "description": "600 km @ ₹12.00/km",
        "amount": "7200.00"
      },
      {
        "lineType": "OPERATIONAL_BUNDLE",
        "description": "Toll, parking, driver food & halting (bundled)",
        "amount": "1800.00"
      }
    ]
  }
}
```

**MVP Placeholder Pricing:**
- **Per-km rates by category:**
  - `SEDAN`: ₹12/km
  - `ERTIGA`: ₹14/km
  - `KIA_CARENS`: ₹15/km
  - `INNOVA_CRYSTA`: ₹18/km
  - `TEMPO_TRAVELLER`: ₹25/km
- **Minimum included km:** 300 km/day
- **Operational bundle:** computed in backend, shown as a single total line item
- **One-way pricing:** fixed corridor fare configured by admin

---

## 1.2. Admin one-way corridor API (pricing dependency)

**Endpoint:** `POST /api/v1/admin/one-way-corridors`

**Purpose:** Admin-configured fixed fares for hotspot one-way transfers. Required for ONE_WAY quotes.

**Request body:**
```json
{
  "sourceCity": "Nashik",
  "destinationCity": "Aurangabad",
  "vehicleCategory": "INNOVA_CRYSTA",
  "fareAmount": "6500.00",
  "routeDistanceKm": 180,
  "returnDistanceKm": 180,
  "isActive": true
}
```

**Notes:**
- ONE_WAY quotes fail if no active corridor exists for the route + category.
- Corridor fare is treated as fixed base fare; operational bundle is added separately.

## 2. Booking creation API

**Implemented**

### 2.1. Create booking

**Endpoint:** `POST /api/v1/bookings`

**Purpose:** Create a confirmed booking with full transactional integrity.

**Request body:**
```json
{
  "sourceCity": "Bangalore",
  "destinationCity": "Mysore",
  "pickupLocation": "Indiranagar, Bangalore",
  "destinations": [
    { "location": "Mysore Palace", "geo": { "lat": 12.3051, "lng": 76.6551 } },
    { "location": "Brindavan Gardens" }
  ],
  "tripStartDate": "2026-06-01T09:00:00Z",
  "tripEndDate": "2026-06-02T18:00:00Z",
  "category": "SEDAN",
  "ageBucket": "ZERO_TO_THREE",
  "productType": "ROUND_TRIP",
  "estimatedKm": 400,
  "returnDistanceKm": 120
}
```

**Validation:** Zod schema `CreateBookingSchema` (same as quote request).

**Business rules:**
- Trip start date must be in future
- At least one destination required
- Pricing calculated using same logic as quote
- Booking reference generated (format: `TM-XXXXXXXX`, non-sequential alphanumeric)

**Transactional integrity:**
Creates all related entities atomically within a single transaction:
1. **Booking** (core entity with REQUESTED status)
2. **BookingItinerary** (pickup + destinations)
3. **BookingPricingSnapshot** (immutable pricing at booking time)
4. **Quote** (line items + estimated total)
5. **DomainEvent** (`BOOKING_CREATED`, `QUOTE_GENERATED`)

**Response:**
```json
{
  "success": true,
  "data": {
    "booking": {
      "id": "uuid",
      "bookingRef": "TM-A3B7C9D2",
      "customerId": "customer-uuid",
      "supplierId": null,
      "status": "REQUESTED",
      "productType": "ROUND_TRIP",
      "tripStartDate": "2026-06-01T09:00:00.000Z",
      "tripEndDate": "2026-06-02T18:00:00.000Z",
      "estimatedKm": 400,
      "sourceCity": "Bangalore",
      "destinationCity": "Mysore",
      "cancelledBy": null,
      "cancelledAt": null,
      "cancelledReason": null,
      "createdAt": "2026-05-18T...",
      "updatedAt": "2026-05-18T..."
    },
    "quote": {
      "id": "quote-uuid",
      "bookingId": "booking-uuid",
      "estimatedTotal": "9000.00",
      "lineItems": [
        {
          "lineType": "BASE_DISTANCE",
          "description": "600 km @ ₹12.00/km",
          "amount": "7200.00"
        },
        {
          "lineType": "OPERATIONAL_BUNDLE",
          "description": "Toll, parking, driver food & halting (bundled)",
          "amount": "1800.00"
        }
      ],
      "issuedAt": "2026-05-18T...",
      "createdAt": "2026-05-18T..."
    }
  },
  "message": "Booking created successfully"
}
```

**Created entities (not returned in response):**
- `BookingItinerary` with pickup location and destinations array
- `BookingPricingSnapshot` with category, age bucket, included km/days, base price, snapshot data
- `DomainEvent` entries for `BOOKING_CREATED` and `QUOTE_GENERATED`

---

## 3. Booking retrieval APIs

**Implemented**

### 3.1. Get booking by ID

**Endpoint:** `GET /api/v1/bookings/[id]`

**Purpose:** Retrieve booking details by internal UUID.

**Response:** Booking domain object.

**Error:** `404 Not Found` if booking doesn't exist.

---

### 3.2. Get booking by reference

**Endpoint:** `GET /api/v1/bookings/ref/[ref]`

**Purpose:** Retrieve booking details by public booking reference (e.g., `TM-A3B7C9D2`).

**Response:** Booking domain object.

**Error:** `404 Not Found` if booking doesn't exist.

---

### 3.3. List bookings

**Endpoint:** `GET /api/v1/bookings`

**Purpose:** List bookings with filters and pagination.

**Query parameters:**
- `customerId` (optional): Filter by customer UUID
- `supplierId` (optional): Filter by supplier UUID
- `status` (optional): Filter by BookingStatus enum
- `tripStartDateFrom` (optional): Filter by trip start date (from)
- `tripStartDateTo` (optional): Filter by trip start date (to)
- `offset` (optional, default 0): Pagination offset
- `limit` (optional, default 20, max 100): Pagination limit

**Response:**
```json
{
  "success": true,
  "data": [
    { ... booking objects ... }
  ],
  "pagination": {
    "total": 42,
    "offset": 0,
    "limit": 20
  }
}
```

---

## 4. Architecture alignment

**Implemented**

### 4.1. Repositories (data access)

- **`BookingRepository`** — Booking CRUD, list/count with filters
- **`BookingItineraryRepository`** — Create itinerary linked to booking
- **`BookingPricingSnapshotRepository`** — Create immutable pricing snapshot
- **`QuoteRepository`** — Create quote linked to booking
- **`DomainEventRepository`** — Append events to audit log

### 4.2. Services (business logic)

- **`BookingService`**:
  - `generateQuote()` — Calculate pricing without creating booking
  - `createBooking()` — Atomic creation of booking + itinerary + snapshot + quote + events
  - `getBookingById()` / `getBookingByRef()` — Retrieval methods
  - `listBookings()` — Filtered pagination

- **`QuoteService`**:
  - `calculatePricing()` — MVP pricing logic with placeholder rates
  - Calculates: included km, trip days, billable km, per-km base price, operational bundle
  - Returns: line items, snapshot data

### 4.3. Validation (DTOs)

- **`booking-schemas.ts`**:
  - `BookingQuoteRequestSchema` — Quote generation DTO
  - `CreateBookingSchema` — Booking creation DTO
  - `BookingListFiltersSchema` — List filters DTO
  - `DestinationStopSchema` — Destination stop DTO (location + optional geo)

### 4.4. Domain events

- **`BOOKING_CREATED`** — Emitted when booking is created (actor: CUSTOMER)
- **`QUOTE_GENERATED`** — Emitted when quote is calculated (actor: SYSTEM/PRICING_ENGINE)

Events stored in `DomainEvent` table with:
- `eventType`, `entityType`, `entityId`
- `actorType` (CUSTOMER/SUPPLIER/ADMIN/SYSTEM)
- `actorId` (UUID or system identifier)
- `payload` (JSON event details)
- `occurredAt` timestamp

---

## 5. MVP Placeholder Pricing

**MVP Placeholder**

The current implementation uses **hardcoded placeholder rates** in `QuoteService`. Real implementation requires:

1. **Admin-managed pricing configuration** stored in database (per pricing-engine.md)
2. **City-aware pricing** (origin city keys into rate tables)
3. **Versioned configuration** (quote snapshots reference config version)
4. **Extension packages** (8hr/80km, 1day/300km add-ons)
5. **Surge/night charges** (optional multipliers)

**Current placeholder logic:**
- Per-km rates by category (₹12 - ₹25/km)
- Included km: 300 km/day (minimum billable distance)
- Billable km = max(actual, included)
- Operational bundle computed in backend (shown as total line item)
- One-way corridor fare (admin-configured fixed price)

**Snapshot data includes:**
- `configVersion: "MVP_PLACEHOLDER_V1"` (to identify placeholder pricing)
- `includedKmPerDay`, `minimumKmPerDay`, `perKmRate`, `billableKm`, `operationalBundleRate`
- `category`, `ageBucket`, `productType`, `sourceCity`

---

## 6. Unresolved mechanics

**Unresolved mechanics**

- **Better Auth integration:** APIs currently use mock customer header (`x-mock-customer-id`). Replace with Better Auth session extraction.
- **Real pricing configuration:** Admin tooling to manage city/category/age bucket rates, extension packages.
- **Payment integration:** Quote → Booking → Payment capture workflow (Razorpay/Stripe).
- **Supplier routing:** Booking created in `REQUESTED` status; supplier assignment TBD.
- **Quote expiry:** Quotes generated via `POST /bookings/quote` are not persisted; no expiry tracking yet.
- **Geocoding:** Pickup/destination geo coordinates optional; real geocoding integration TBD.
- **Distance calculation:** Google Maps API is the source of route distance; current implementation accepts `estimatedKm` from client until maps integration lands server-side.

---

## 7. Future enhancements

**Exploratory**

- **Pre-booking quotes:** Persist quotes without booking for multi-step customer journey
- **Quote expiry:** Time-bound quotes (e.g., 24-hour validity)
- **Dynamic pricing:** Surge pricing based on demand, time-of-day
- **Extension packages:** Add-on SKUs (8hr/80km, 1day/300km, extra night stay)
- **Multi-leg itineraries:** Support complex multi-city routes
- **Toll/parking estimates:** Pre-trip estimates based on historical data
- **Instant confirmation:** Auto-assign supplier based on availability

---

## Revision log

| Date | Change |
| --- | --- |
| 2026-05-18 | **Implemented:** Booking quote and creation APIs with repositories, services, MVP placeholder pricing, transactional integrity, and domain events. |
| 2026-07-11 | **Updated:** Per-km tour pricing (min 300 km/day), operational bundle line item, one-way corridor pricing, return distance support, and admin corridor API documented. |
