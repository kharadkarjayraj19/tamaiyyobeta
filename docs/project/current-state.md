# Tamaiyyo — current state (onboarding)

**Purpose:** **Primary onboarding context** for humans and AI agents: where the repo is now, what to read next, and how project vs feature vs global docs relate. For sequencing and tags in depth, see [roadmap.md](./roadmap.md) and [development-phases.md](./development-phases.md).

---

## Read next (typical order)

1. **This file** — snapshot and doc map.
2. **`docs/architecture.md`** — global structure, routing, env patterns; **`docs/architecture/backend-architecture.md`**, **`api-architecture.md`**, **`prisma-data-architecture.md`**, **`prisma-schema-planning.md`**; **`docs/architecture/domain-models/`** for entity models (e.g. identity).
3. **`docs/features/*.md`** relevant to the task — behavior and cross-cutting UI/auth/shell specs.
4. **`docs/frontend-guidelines.md`** — when touching UI or App Router conventions.
5. **`docs/project/roadmap.md`**, **`architecture-decisions.md`**, **`future-initiatives.md`** — when changing phase, direction, or recorded ADR-style decisions.

---

## Documentation map (do not confuse layers)

| Location | Owns |
| --- | --- |
| **`docs/project/current-state.md` (this file)** | Onboarding snapshot; what is **Implemented** / **Planned** / **Exploratory** at a glance. |
| **`docs/project/*` (other files)** | Project memory: roadmap, phases, ADR index, initiatives—not per-feature behavior. |
| **`docs/features/*.md`** | **Source of truth for feature behavior** (rules, workflows, RBAC as specified, states); each has **Maturity**. |
| **`docs/architecture.md`** | **Global** repo conventions and cross-cutting technical decisions not owned by one feature doc. |
| **`docs/architecture/backend-architecture.md`** | MVP **backend** stack, domain modules, deployment, and data/API philosophy (**Planned** implementation). |

---

## Status snapshot (see [roadmap.md](./roadmap.md) for definitions)

**Implemented**

- Next.js App Router, TypeScript strict, Tailwind + shadcn-style tokens; `src/config` env split (no client/server barrel).
- Role route groups → `/customer`, `/supplier`, `/admin`; shared dashboard shell and placeholder pages.
- Better Auth foundation: API route, stateless session cache, `getSession` / `requireSession`, role layouts via `RoleDashboardWithAuth`, optimistic Edge middleware, `/login` and `/forbidden` placeholders.

**Planned**

- **Marketplace behavior** implementation aligned to feature specs—**[`docs/features/booking-lifecycle.md`](../features/booking-lifecycle.md)**, **[`docs/features/pricing-engine.md`](../features/pricing-engine.md)**, **[`docs/features/vehicle-management.md`](../features/vehicle-management.md)**, **[`docs/features/supplier-operations.md`](../features/supplier-operations.md)**, **[`docs/features/billing-settlement.md`](../features/billing-settlement.md)** (all **FOUNDATION**); code for marketplace domains not yet present.
- Additional per-domain **`docs/features/*.md`** (narrower tax/payment-rail addenda) as product defines them.
- Full login product (factors, persistence, RBAC beyond session presence) once specified.

**Implemented (backend foundation)**

- **Prisma schema** (`prisma/schema.prisma`): 21 models, PostgreSQL, UUID ids, soft-delete, immutable snapshots, domain events.
- **Repositories**: domain-scoped data access (identity, booking, billing, payment, refund, settlement, vehicle, event).
- **Services**: business logic orchestration (BookingService, QuoteService, AssignmentService, BillingService, PaymentService, RefundService, SettlementService, SupplierService, VehicleService).
- **REST APIs**: supplier/vehicle onboarding, booking (quote, create, accept, reject, assign, reassign, complete, confirm-km, generate-bill, close), billing (final bill retrieval), payment (record, list), refund (create with 24h policy, list), settlement (mark eligible, create batch, list batches, supplier history).
- **Domain events**: BOOKING_CREATED, QUOTE_GENERATED, BOOKING_ACCEPTED, BOOKING_REJECTED, ASSIGNMENT_CREATED, ASSIGNMENT_CHANGED, BOOKING_REASSIGNED, TRIP_COMPLETED, CUSTOMER_CONFIRMED, KM_MISMATCH_DETECTED, FINAL_BILL_GENERATED, PAYMENT_RECORDED, PAYMENT_COMPLETED, REFUND_CREATED, SETTLEMENT_ELIGIBLE, PAYOUT_BATCH_CREATED.
- **Financial operations**: Payment recording (advance/partial/full), refund with 24h cancellation policy, supplier earning eligibility tracking, payout batch creation.
- **MVP placeholders**: pricing rates (₹12-25/km by category, min 300 km/day, bundled ops charge computed in backend), commission (₹500 flat + ₹2/km), mocked identity (Better Auth pending), manual payment gateway integration, manual payout execution.

**Planned**

- Razorpay payment gateway integration with webhooks, automatic bank payouts, GST invoice generation, live tracking, automated routing algorithms.
- Better Auth with database-backed user accounts and actual authentication flows.

**Exploratory**

- AWS/RDS migration, async queues, external partner APIs, systematic tests—see [future-initiatives.md](./future-initiatives.md) and open questions in `docs/features/auth-rbac.md` / `docs/features/frontend-auth-architecture.md`.

---

## Revision log

| Date | Change |
| --- | --- |
| 2026-05-14 | Added as primary onboarding doc per documentation governance. |
| 2026-05-14 | **Planned:** reference `docs/features/booking-lifecycle.md` (FOUNDATION). |
| 2026-05-14 | **Planned:** reference `docs/features/pricing-engine.md` (FOUNDATION). |
| 2026-05-15 | **Planned:** reference `docs/features/vehicle-management.md` (FOUNDATION). |
| 2026-05-16 | **Planned:** reference `docs/features/supplier-operations.md` (FOUNDATION); **Planned** bullet clarified for later addenda. |
| 2026-05-17 | **Planned:** reference `docs/features/billing-settlement.md` (FOUNDATION); **Planned** bullet narrowed to tax/payment-rail addenda. |
| 2026-05-18 | **Planned:** `docs/architecture/backend-architecture.md` (MVP backend blueprint); Exploratory backend bullet split out. |
| 2026-05-18 | **Planned:** `docs/architecture/domain-models/identity-domain-model.md` (FOUNDATION). |
| 2026-05-18 | **Planned:** `docs/architecture/domain-models/vehicle-domain-model.md` (FOUNDATION); identity doc corrected (no permanent vehicle–driver link). |
| 2026-05-18 | **Planned:** `docs/architecture/domain-models/booking-domain-model.md` (FOUNDATION). |
| 2026-05-18 | **Planned:** `docs/architecture/domain-models/billing-domain-model.md` (FOUNDATION). |
| 2026-05-18 | **Planned:** `docs/architecture/api-architecture.md` (FOUNDATION). |
| 2026-05-18 | **Planned:** `docs/architecture/prisma-data-architecture.md` (FOUNDATION). |
| 2026-05-18 | **Planned:** `docs/architecture/prisma-schema-planning.md` (FOUNDATION). |
| 2026-05-18 | **Implemented:** `prisma/schema.prisma` — 21 models, PostgreSQL, UUID ids, enums, soft-delete, immutable snapshots. |
| 2026-05-18 | **Implemented:** Prisma foundation — client generation, singleton pattern, initial migration, seed structure, repository folders. |
| 2026-05-18 | **Implemented:** Backend foundation — repositories (CustomerAccount, Booking), services (BookingService), validation (Zod), errors, transactions. |
| 2026-05-18 | **Implemented:** Supplier and vehicle onboarding APIs — repositories (SupplierAccount, Vehicle, Upload), services (SupplierService, VehicleService), validation schemas (supplier/vehicle DTOs), REST API routes (`/api/v1/suppliers/*`, `/api/v1/vehicles/*`, `/api/v1/admin/*/verify`). Documented in `docs/features/supplier-vehicle-onboarding-apis.md` (MVP). |
| 2026-05-18 | **Implemented:** Booking quote and creation APIs — repositories (BookingItinerary, BookingPricingSnapshot, Quote, DomainEvent), services (BookingService with QuoteService), MVP placeholder pricing (300km/day, category/age bucket rates), transactional booking creation (booking+itinerary+snapshot+quote+events), REST API routes (`/api/v1/bookings/*`). Domain events: BOOKING_CREATED, QUOTE_GENERATED. |
| 2026-05-18 | **Implemented:** Supplier assignment and booking fulfillment APIs — repositories (AssignmentHistory, Driver), services (AssignmentService), booking lifecycle transitions (REQUESTED→ACCEPTED→READY_FOR_TRIP), validation (ownership, status, compatibility), REST API routes (`/api/v1/supplier/bookings/*`, `/api/v1/bookings/*/assign`, `/api/v1/admin/bookings/*/reassign`). Domain events: BOOKING_ACCEPTED, BOOKING_REJECTED, ASSIGNMENT_CREATED, ASSIGNMENT_CHANGED, BOOKING_REASSIGNED. |
| 2026-05-18 | **Implemented:** Trip completion, final billing, and operational closure APIs — repositories (TripExecution with updateActualKm, FinalBill, CommissionSnapshot, SupplierEarning, Payment), services (BillingService with MVP commission rates: ₹500 flat + ₹2/km), transactional final billing (execution+bill+earnings+commission+events), lifecycle transitions (IN_PROGRESS→COMPLETED→BILLING_IN_PROGRESS→CLOSED), customer km confirmation with auto-resolution (≤20km difference auto-resolves in favor of customer, >20km requires manual support), REST API routes (`/api/v1/bookings/*/complete`, `/api/v1/bookings/*/confirm-km`, `/api/v1/bookings/*/generate-bill`, `/api/v1/bookings/*/close`, `/api/v1/billing/bookings/*`). Domain events: TRIP_COMPLETED, CUSTOMER_CONFIRMED, KM_MISMATCH_DETECTED, FINAL_BILL_GENERATED, BOOKING_CLOSED. |
| 2026-05-18 | **Hardened:** Backend correctness fixes post-architecture-review — idempotency guards (final bill, booking closure, trip execution), customer ownership validation (km confirmation), financial type safety (toll/parking amount limits, odometer validation, line item count limits), BookingDomain drift cleanup (removed phantom fields), pagination limits (max 100 records server-enforced), lifecycle guards (trip date validation, duplicate prevention), MVP placeholder documentation (commission, pricing, booking ref generation). See `docs/architecture/CORRECTNESS_FIXES_2026-05-18.md` for details. |
| 2026-05-20 | **Implemented:** Payment and settlement operations APIs — repositories (Payment with updateStatus/getTotalPaid, Refund with SUCCEEDED status support, SupplierEarning with findEligible/attachToBatch, PayoutBatch), services (PaymentService with outstanding balance calculation, RefundService with 24h policy enforcement, SettlementService with batch operations), REST API routes (`/api/v1/payments/*`, `/api/v1/refunds/*`, `/api/v1/settlements/*`). Payment modes: ONLINE_CARD, ONLINE_UPI, CASH. Refund policy: >24h full refund, <24h no automatic refund. Settlement lifecycle: EARNED→ELIGIBLE→BATCHED→PAID. Domain events: PAYMENT_RECORDED, PAYMENT_COMPLETED, REFUND_CREATED, SETTLEMENT_ELIGIBLE, PAYOUT_BATCH_CREATED. MVP placeholders: manual gateway integration, manual payout execution. |
| 2026-05-31 | **Architecture Review:** Booking UI model compatibility assessment — reviewed current booking architecture (schema, itinerary, pricing, validation, APIs) against proposed UI trip types (One Way Transfer, Multi-City Tour, Round Trip Tour). Verdict: **Minor backend changes required** (enum addition + pricing logic). Current schema already supports multiple destinations via JSON array. See `docs/architecture/BOOKING_UI_MODEL_REVIEW_2026-05-31.md` for detailed findings and implementation roadmap. Business blocker: MULTI_CITY pricing strategy decision required before implementation. |
| 2026-05-31 | **Pricing & UX Architecture Review:** Deep analysis of pricing engine vs new business rules (corridor pricing for one-way, KM-based for multi-city, minimum billable KM, empty return costing, route vs billable KM distinction). Verdict: **CRITICAL ARCHITECTURAL GAPS** — current uniform day-rate model incompatible with three distinct pricing modes required. Provided comprehensive UX recommendations: vehicle card designs, fare terminology, KM disclosure strategies, billable-vs-route explanations, empty return messaging, conversion optimization tactics. See `docs/architecture/PRICING_UX_REVIEW_2026-05-31.md` for detailed gap analysis, UX templates, and 3-4 week implementation roadmap. Blockers: corridor configuration scope, minimum billable km policy, empty return handling strategy. |
| 2026-07-11 | **Implemented:** Pricing model updated to per-km tour pricing (round trip + multi-city) with **min 300 km/day**, billable km = max(actual, included), operational bundle added as single line item; added one-way corridor admin API for fixed corridor fares. Pricing snapshot now captures billable km, per-km rate, and bundled ops amount; itinerary stores route and return distance. |
