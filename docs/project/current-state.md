# Tamayo — current state (onboarding)

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
- **Operational UI slices**: customer **Quote Builder** (`/customer/booking-quote`) and admin **One-way Corridors** manager (`/admin/one-way-corridors`) wired to booking quote and corridor APIs for local verification.
- **Prisma CLI config (v7)**: added root `prisma.config.ts` for datasource/migration configuration (schema path, migrations path, seed path, datasource URL).
- **PostHog foundation wiring**: client pageview capture in root app layout plus server capture helpers for booking quote/booking-create API hooks.
- **Distance estimation seam**: booking quote/create now resolve route distance server-side via Google Maps Directions API when configured, with fallback to provided estimate.
- **Places suggestion wiring (customer)**: `/api/v1/maps/autocomplete` now proxies Google Places Autocomplete (India-scoped), and customer pickup/drop/stop fields on `/customer` show debounced location suggestions.
- **Maps key strategy**: backend now supports split credentials (`GOOGLE_MAPS_DIRECTIONS_API_KEY` and `GOOGLE_MAPS_PLACES_API_KEY`) with backward-compatible fallback to `GOOGLE_MAPS_API_KEY`.
- **Launch-hub dispatch distance rule**: distance estimation for quote/create now evaluates all launch hubs (`Mumbai`, `Pune`, `Chhatrapati Sambhajinagar`/`Aurangabad`, `Nashik`) as closed loops and selects the lowest total (`hub -> pickup -> stops -> final drop -> same hub`), including dispatch overhead in route km.
- **Route-distance return visibility**: quote UI now shows return-km context inline in estimated route distance for intercity routes when return distance is available (e.g., "including return X kms").
- **Local auth bypass toggle**: development-only `DEV_AUTH_BYPASS=true` enables deterministic mock sessions for protected role trees until full login flow is wired.
- **Phone OTP login (MVP)**: `/login` now supports phone OTP request/verify flow with callback redirect; server session fallback uses `tamayo.session_token` for protected role routes, with logout endpoint at `/api/v1/auth/logout`.
- **OTP auth hardening**: OTP request has `30s` resend cooldown and max `3` verify attempts; server events emit PostHog funnel telemetry for OTP request/verify success and failures.
- **OTP session stability (Vercel)**: phone-session fallback now uses a signed stateless `tamayo.session_token` payload, avoiding in-memory session loss across serverless instances during reserve flow.
- **Post-reserve customer review step**: after `Reserve by paying ₹499`, customer now lands on `/customer/reserve` to review booking details, fare summary, and clear inclusions/exclusions before payment-gateway handoff (still pending).
- **Customer home UI (interactive)**: `/customer` now runs as a full-width hero-first experience with ride-mode tabs (`One way`, `Multi city / Round trip`, `City tour`, `Airport only`), contextual fare guidance tooltips, and multi-city route input that supports up to 10 intermediate stops between pickup and final dropoff.
- **Quote handoff prefill**: customer hero selections now pass route context into `/customer/booking-quote` through query params so quote workbench defaults reflect selected ride mode, route sequence, and city-tour package presets.
- **Domain events**: BOOKING_CREATED, QUOTE_GENERATED, BOOKING_ACCEPTED, BOOKING_REJECTED, ASSIGNMENT_CREATED, ASSIGNMENT_CHANGED, BOOKING_REASSIGNED, TRIP_COMPLETED, CUSTOMER_CONFIRMED, KM_MISMATCH_DETECTED, FINAL_BILL_GENERATED, PAYMENT_RECORDED, PAYMENT_COMPLETED, REFUND_CREATED, SETTLEMENT_ELIGIBLE, PAYOUT_BATCH_CREATED.
- **Financial operations**: Payment recording (advance/partial/full), refund with 24h cancellation policy, supplier earning eligibility tracking, payout batch creation.
- **MVP placeholders**: pricing rates (₹12-25/km by category, min 300 km/day, bundled ops charge computed in backend), commission (₹500 flat + ₹2/km), mocked identity (Better Auth pending), manual payment gateway integration, manual payout execution.

**Planned**

- Razorpay payment gateway integration with webhooks, automatic bank payouts, GST invoice generation, live tracking, automated routing algorithms.
- Better Auth with database-backed user accounts and actual authentication flows.
- Pricing/corridor migration regeneration and apply verification on local PostgreSQL, with a clean local reset runbook for Prisma 7 workflows.
- Dev-to-prod hardening and rollout checklist for auth, config, data, observability, security, and go-live gates (see `docs/project/dev-to-prod-shift-plan.md`).

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
| 2026-08-07 | **Implemented:** UI wiring for pricing verification — customer quote builder flow and admin corridor management screen added to role dashboards for local testing of updated pricing logic. |
| 2026-08-11 | **Implemented:** Prisma 7 migration config added at `prisma.config.ts` (datasource + migrations + seed paths) so CLI commands use explicit config outside `schema.prisma`. |
| 2026-08-11 | **Planned:** Run `prisma migrate reset` (local dev only) and regenerate/apply the pricing-corridor migration on a clean local database; migration execution is paused pending explicit destructive-action consent. |
| 2026-08-11 | **Implemented:** PostHog wiring foundation added (client pageview instrumentation + server booking quote/create event hooks) with env scaffolding for host/project key configuration. |
| 2026-08-11 | **Implemented:** Server-side distance estimation seam wired into booking quote/create using Google Maps Directions API when key is present, with fallback to provided estimated km. |
| 2026-08-12 | **Implemented (local-only):** `DEV_AUTH_BYPASS` development switch added for deterministic role mock sessions while login flows remain in foundation state. |
| 2026-08-28 | **Implemented:** `/customer` redesigned as hero-first booking surface; customer sidebar hidden on this route; ride-mode tabs now include contextual tooltips and interactive state. |
| 2026-08-28 | **Implemented:** Multi-city flow supports pickup + final dropoff with up to 10 intermediate stops (`Stop 1..10`) and query-param handoff into quote workbench for prefilled route context. |
| 2026-08-28 | **Planned:** Added explicit dev-to-prod transition checklist document at `docs/project/dev-to-prod-shift-plan.md`. |
| 2026-08-29 | **Implemented:** Google Places suggestion flow added for customer route inputs via `/api/v1/maps/autocomplete` and reusable location autocomplete input on `/customer` (pickup, stops, dropoff). |
| 2026-08-29 | **Implemented:** Google Maps integration now supports separate server keys for Directions and Places, while preserving single-key fallback for local compatibility. |
| 2026-08-29 | **Implemented:** `/customer` booking schedule controls now support working date selection for one-way/airport and AM/PM 30-minute time dropdowns for one-way, round-trip, and city-tour flows. |
| 2026-08-29 | **Implemented:** `/customer/booking-quote` now renders a modern post-`See prices` fare card UI with total amount, included km messaging, and reserve CTA (`₹499`) while preserving transparent line-item details. |
| 2026-08-29 | **Implemented:** one-way quote failure handling now returns a user-facing validation message when corridor lookup is unavailable, replacing generic internal-error output in customer UI. |
| 2026-08-29 | **Implemented:** `/customer/booking-quote` now supports interactive vehicle selection presets, age-band toggle, booking duration display, fuel tags with CNG wait advisory, and derived return-km display for tour-style flows. |
| 2026-08-29 | **Implemented:** quote results now render as a multi-card list (one card per vehicle option) with top-level route summary + modify action; pricing comparison is shown directly below without a separate selection panel. |
| 2026-09-04 | **Implemented:** launch-hub selection in distance estimation now uses the lowest closed-loop km (`hub -> pickup -> stops -> final drop -> same hub`) across launch hubs, aligning route-km pricing with practical fleet dispatch and return behavior. |
| 2026-09-04 | **Implemented:** quote route-distance line now includes return-km text for intercity routes when computed (`including return X kms`) to make round-trip dispatch impact explicit. |
| 2026-09-04 | **Implemented (MVP):** phone OTP login enabled via `/api/v1/auth/otp/request` and `/api/v1/auth/otp/verify`, with cookie-backed `tamayo.session_token` session fallback for protected layouts and `/api/v1/auth/logout` support. |
| 2026-09-04 | **Implemented (MVP):** OTP auth now supports MSG91 provider integration, 30-second resend cooldown, max 3 verify attempts, and PostHog funnel events for OTP lifecycle. |
| 2026-09-04 | **Implemented:** reserve CTA now navigates to `/customer/reserve` as the next customer step with booking + fare context while Razorpay/payment capture remains planned. |
| 2026-09-09 | **Implemented (stability):** replaced in-memory phone session persistence with signed stateless `tamayo.session_token` payload to prevent OTP-login/session loss on Vercel serverless routing. |
| 2026-09-08 | **Implemented:** `/customer/reserve` upgraded to a review-booking surface with trip context, inclusion/exclusion messaging, and pre-payment summary while payment-gateway integration remains pending. |
