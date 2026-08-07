# Tamaiyyo Backend Implementation Summary

**Date:** 2026-05-18  
**Updated:** 2026-07-11  
**Maturity:** MVP  
**Purpose:** Comprehensive summary of implemented backend APIs and workflows.

---

## Overview

This document summarizes the complete backend implementation for Tamaiyyo, covering:

1. **Supplier & Vehicle Onboarding** — Draft, submission, admin verification
2. **Booking Lifecycle** — Quote generation, creation, assignment, fulfillment
3. **Trip Completion & Billing** — Execution submission, km confirmation, final billing, operational closure

All implementations follow the established **layered architecture** (repositories → services → handlers), preserve **transactional integrity**, emit **domain events** for audit trails, and use **MVP placeholder** values where appropriate.

---

## 1. Supplier & Vehicle Onboarding APIs

### Endpoints

- **POST** `/api/v1/suppliers/onboarding/draft` — Save supplier onboarding draft
- **POST** `/api/v1/suppliers/onboarding/submit` — Submit supplier for verification
- **GET** `/api/v1/suppliers/[id]` — Get supplier details
- **GET** `/api/v1/suppliers` — List suppliers with filters (status, search)
- **POST** `/api/v1/vehicles` — Create vehicle
- **GET** `/api/v1/vehicles` — List vehicles with filters (supplierId, status, category)
- **GET** `/api/v1/vehicles/[id]` — Get vehicle details
- **PATCH** `/api/v1/vehicles/[id]` — Update vehicle
- **DELETE** `/api/v1/vehicles/[id]` — Soft-delete vehicle
- **POST** `/api/v1/admin/suppliers/[id]/verify` — Admin approve/reject supplier
- **POST** `/api/v1/admin/vehicles/[id]/verify` — Admin approve/reject vehicle

### Key Features

- **Draft workflow**: Suppliers can save incomplete onboarding data
- **Status transitions**: `DRAFT` → `PENDING_VERIFICATION` → `VERIFIED` / `REJECTED`
- **Soft-delete**: Vehicles can be soft-deleted (operational cleanup)
- **Age bucket calculation**: Automatic classification based on vehicle age

**Documentation:** `docs/features/supplier-vehicle-onboarding-apis.md`

---

## 2. Booking Lifecycle APIs

### Endpoints

**Customer Booking:**
- **POST** `/api/v1/bookings/quote` — Generate quote (no booking created)
- **POST** `/api/v1/bookings` — Create booking with quote
- **GET** `/api/v1/bookings` — List bookings with filters
- **GET** `/api/v1/bookings/[id]` — Get booking details
- **GET** `/api/v1/bookings/ref/[ref]` — Get booking by reference

**Supplier Assignment:**
- **GET** `/api/v1/supplier/bookings/available` — Get supplier booking queue
- **POST** `/api/v1/supplier/bookings/[id]/accept` — Supplier accepts booking
- **POST** `/api/v1/supplier/bookings/[id]/reject` — Supplier rejects booking
- **POST** `/api/v1/bookings/[id]/assign` — Assign vehicle/driver to booking

**Admin Actions:**
- **POST** `/api/v1/admin/bookings/[id]/reassign` — Admin reassigns booking to different supplier
- **POST** `/api/v1/admin/one-way-corridors` — Admin creates one-way corridor fare

### Key Features

**Quote Generation:**
- MVP placeholder pricing: per-km rates by category (₹12-25/km)
- Minimum included km/day: 300 km
- Billable km = max(actual, included)
- One-way corridor pricing (admin-configured fixed fares)
- Operational bundle added as a single total line item

**Transactional Booking Creation:**
- Atomically creates: Booking + Itinerary + Pricing Snapshot + Quote + Domain Events
- Multi-destination support
- Round-trip vs one-way detection

**Assignment Workflow:**
- Supplier queue filtering by city/category/date
- Ownership validation (supplier must own vehicle/driver)
- Vehicle compatibility checks (category, status)
- Assignment history tracking (current + historical)
- Admin override capability

**Lifecycle Transitions:**
```
REQUESTED → ACCEPTED → READY_FOR_TRIP
```

**Domain Events:**
- `BOOKING_CREATED`, `QUOTE_GENERATED`
- `BOOKING_ACCEPTED`, `BOOKING_REJECTED`
- `ASSIGNMENT_CREATED`, `ASSIGNMENT_CHANGED`, `BOOKING_REASSIGNED`

**Documentation:**
- `docs/features/booking-quote-creation-apis.md`
- `docs/features/supplier-assignment-fulfillment-apis.md`

---

## 3. Trip Completion & Billing APIs

### Endpoints

- **POST** `/api/v1/bookings/[id]/complete` — Supplier/driver submits trip execution
- **POST** `/api/v1/bookings/[id]/confirm-km` — Customer confirms km (optional)
- **POST** `/api/v1/bookings/[id]/generate-bill` — Generate final bill
- **POST** `/api/v1/bookings/[id]/close` — Operational closure
- **GET** `/api/v1/billing/bookings/[id]` — Retrieve final bill

### Key Features

**Trip Execution Submission:**
- Actual km, odometer readings
- Toll line items (description, amount, receipt URL) captured for ops audit
- Parking line items captured for ops audit
- Transitions: `IN_PROGRESS` → `COMPLETED`

**Customer Km Confirmation (Auto-Resolution):**
- **Small mismatch (≤ 20km):**
  - Auto-resolves in favor of customer
  - Updates `TripExecution.actualKm` to customer's confirmed km
  - Uses confirmed km for final bill calculation
  - Emits `CUSTOMER_CONFIRMED` with `autoResolved: true`
- **Major mismatch (> 20km):**
  - Throws `ValidationError`
  - Emits `KM_MISMATCH_DETECTED` with `requiresManualResolution: true`
  - Blocks bill generation until support resolves

**Final Bill Generation:**
- **Line items:**
  - Base fare: `billable km × per-km rate`
  - Operational bundle: single total line item (toll/parking/driver food/halting)
  - Billable km = max(actual, included)
  - One-way corridor fare (if applicable)
- **Commission calculation (MVP):**
  - Flat platform fee: ₹500
  - Per-km commission: ₹2/km
- **Immutable snapshots:**
  - `FinalBill`: Customer-visible bill with line items
  - `CommissionSnapshot`: Platform commission calculation
  - `SupplierEarning`: Net earning = subtotal - commission
- **Transactional:** All financial records + booking status + events commit together
- **Transitions:** `COMPLETED` → `BILLING_IN_PROGRESS`

**Operational Closure:**
- Manual closure for MVP (admin action)
- In production: Automated via payment gateway webhook
- Validates final bill exists
- Transitions: `BILLING_IN_PROGRESS` → `CLOSED`
- Emits `BOOKING_CLOSED` event

**Lifecycle Flow:**
```
IN_PROGRESS → COMPLETED → BILLING_IN_PROGRESS → CLOSED
```

**Domain Events:**
- `TRIP_COMPLETED` — Trip execution submitted
- `CUSTOMER_CONFIRMED` — Customer confirms km (with auto-resolution details)
- `KM_MISMATCH_DETECTED` — Major mismatch requires support
- `FINAL_BILL_GENERATED` — Final bill created
- `BOOKING_CLOSED` — Operational closure

**Documentation:** `docs/features/trip-completion-billing-apis.md`

---

## Architecture Compliance

### Layered Architecture

**Repositories** (`src/lib/repositories/`):
- Prisma-only data access
- Domain type mapping (ORM-agnostic)
- Transaction support via optional `tx` parameter
- No business logic

**Services** (`src/lib/services/`):
- Business logic orchestration
- Transaction ownership via `withTransaction`
- Domain event emission
- Validation and authorization

**Handlers** (`src/app/api/v1/`):
- HTTP concerns only
- DTO validation using Zod
- Mock identity headers (Better Auth integration pending)
- Operational error mapping to HTTP status codes

### Data Integrity

- **Transactional operations:** All multi-entity operations use `prisma.$transaction`
- **Immutable snapshots:** Pricing, billing, and commission records are append-only
- **Audit trail:** All state changes emit domain events
- **Soft-deletes:** Operational entities (vehicles, drivers) support soft-delete

### Validation

- **Zod schemas:** Type-safe DTO validation at API boundary
- **Business rules:** Service-layer validation (ownership, status, compatibility)
- **Operational errors:** Custom error classes (`ValidationError`, `NotFoundError`, `ConflictError`)

---

## MVP Placeholders & Future Work

### MVP Placeholders

1. **Pricing:**
   - Hardcoded per-km rates (₹12-25/km by category)
   - Minimum included km/day (300 km)
   - Operational bundle computed in backend (rate hidden in UI)
   - One-way corridor fare configured by admin
   - **Future:** Database-driven pricing config with versioning

2. **Commission:**
   - Hardcoded flat fee (₹500)
   - Hardcoded per-km rate (₹2/km)
   - **Future:** Configurable commission rules by category/city/supplier-tier

3. **Authentication:**
   - Mock identity headers (`x-mock-customer-id`, `x-mock-supplier-id`, `x-mock-admin-id`)
   - **Future:** Better Auth integration with database-backed user accounts

4. **Km Mismatch Resolution:**
   - 20km threshold for auto-resolution
   - No support admin UI workflow yet
   - **Future:** Support dashboard for manual dispute resolution, evidence upload

5. **Operational Closure:**
   - Manual admin action to close bookings
   - **Future:** Automated via payment gateway webhook

### Not Implemented (Out of Scope)

- Payment gateway integration (Razorpay, Stripe)
- Payout batch creation and processing
- GST/tax calculation and invoicing
- Live trip tracking (GPS)
- Automated supplier routing algorithms
- Real-time availability/inventory management
- Wallet systems
- BNPL/EMI payment options

---

## Database Schema Highlights

**21 Models, 13 Enums:**

**Core Entities:**
- `CustomerAccount`, `SupplierAccount`, `AdminAccount`
- `Vehicle`, `Driver`
- `Booking`, `BookingItinerary`, `BookingPricingSnapshot`
- `AssignmentHistory`
- `TripExecution`
- `Quote`, `FinalBill`, `CommissionSnapshot`
- `SupplierEarning`, `Payment`, `Refund`, `PayoutBatch`
- `Upload`, `DomainEvent`, `SupportNote`

**Design Principles:**
- **UUIDs:** Internal stable identities
- **Human-readable refs:** Public non-sequential references (bookingRef)
- **Soft-delete:** `deletedAt` for operational entities
- **Immutable history:** Pricing, billing, commission snapshots never change
- **Append-only events:** Generic event model for audit timeline

**Schema File:** `prisma/schema.prisma`

---

## Testing Flow (End-to-End)

### Complete Booking Journey

1. **Supplier onboards:**
   - POST `/suppliers/onboarding/draft` → `DRAFT`
   - POST `/suppliers/onboarding/submit` → `PENDING_VERIFICATION`
   - POST `/admin/suppliers/[id]/verify` (approve) → `VERIFIED`

2. **Supplier adds vehicle:**
   - POST `/vehicles` → `PENDING_VERIFICATION`
   - POST `/admin/vehicles/[id]/verify` (approve) → `VERIFIED`

3. **Customer creates booking:**
   - POST `/bookings/quote` (preview pricing)
   - POST `/bookings` → `REQUESTED`

4. **Supplier accepts & assigns:**
   - GET `/supplier/bookings/available` (queue)
   - POST `/supplier/bookings/[id]/accept` → `ACCEPTED`
   - POST `/bookings/[id]/assign` (vehicle + driver) → `READY_FOR_TRIP`

5. **Trip execution:**
   - (Manual: trip starts) → `IN_PROGRESS`
   - POST `/bookings/[id]/complete` (actual km, tolls, parking) → `COMPLETED`

6. **Customer confirmation (optional):**
   - POST `/bookings/[id]/confirm-km`
   - Small mismatch: Auto-resolves, uses customer km
   - Major mismatch: Returns error, requires support

7. **Billing:**
   - POST `/bookings/[id]/generate-bill` → `BILLING_IN_PROGRESS`
   - GET `/billing/bookings/[id]` (view final bill)

8. **Operational closure:**
   - POST `/bookings/[id]/close` → `CLOSED`

---

## Revision History

| Date | Change |
| --- | --- |
| 2026-05-18 | Initial implementation summary created after completing supplier onboarding, booking lifecycle, and billing APIs |
| 2026-05-18 | Refined km mismatch handling to auto-resolve small differences in favor of customer |
| 2026-05-18 | Added operational closure endpoint (`POST /bookings/[id]/close`) for CLOSED state transition |
