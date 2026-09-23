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
- **Phone OTP endpoints (standby)**: OTP request/verify/logout APIs remain available for later production verification rollout, but `/login` no longer presents OTP as the primary sign-in path.
- **OTP auth hardening**: OTP request has `30s` resend cooldown and max `3` verify attempts; server events emit PostHog funnel telemetry for OTP request/verify success and failures.
- **OTP session stability (Vercel)**: phone-session fallback now uses a signed stateless `tamayo.session_token` payload, avoiding in-memory session loss across serverless instances during reserve flow.
- **Google login + required phone capture (MVP)**: `/login` now uses Google as the single entry; first-time Google users must complete `/login/complete-profile` with a phone number before customer session is issued (phone accepted directly for now; OTP verification deferred).
- **Quote/reserve navigation hardening**: OTP callback auto-reserve now consumes one-time `autoReserve` state and preserves a `quoteReturnUrl` so browser back and “Back to quotes” keep booking context without looping.
- **Reserve mobile spacing + overflow fix**: reserve view now uses compact safe-area bottom padding and wrapping inclusion/exclusion rows to prevent extra horizontal scroll and oversized bottom whitespace.
- **Reserve mobile-first UX refresh**: review-booking page now prioritizes mobile scanning with sticky bottom CTA, compact trip chips, route timeline cards, and collapsible inclusion/exclusion sections.
- **Reserve card redesign (MMT-inspired)**: review-booking now uses a quote-style vehicle card with image-first fare summary and persistent bottom payment rail (`Part pay` / `Full pay`) to mirror familiar travel-booking UX on phones.
- **Quote topbar interaction overhaul (MMT-inspired):** `/customer/booking-quote` top strip now uses wrap-safe clickable controls for trip type, from, stops, to, pickup date/time with edit overlays; intermediate stops are represented between from/to as a dedicated stop control to avoid desktop overflow and improve discoverability.
- **Quote mobile density refinement:** quote page now removes redundant top heading copy, uses a compact mobile top strip focused on route/date-time/search, and drops the `Modify` button so cab cards get priority on small screens.
- **Included-km UI refinement:** quote cards now display route-based included-km when computed route distance exceeds the baseline `300 km/day` threshold used for per-day inclusion context.
- **Customer navbar branding refinement:** customer top bar now uses an image wordmark (without role breadcrumb) to reduce mobile header noise, while supplier/admin retain role-context topbar text.
- **Customer quote spacing refinement:** `/customer/booking-quote` now uses tighter top padding under the navbar plus a slightly smaller customer wordmark to keep route controls and quote cards higher in the first viewport.
- **Customer quote back-navigation pattern:** mobile quote flow now uses a top-left back arrow instead of hamburger drawer trigger, with browser-back behavior and `/customer` fallback for clearer task-focused navigation.
- **Quote card surface cleanup:** `/customer/booking-quote` vehicle results now use a single card container without nested inner card borders to reduce visual clutter on mobile.
- **Quote advisory spacing fix:** removed mobile-only empty space above fuel advisory by hiding the verified-fare row wrapper on small screens while keeping verified cue on desktop.
- **Quote card stack spacing fix:** mobile quote cards now use zero vertical stack spacing at the outer card level to remove remaining perceived top gaps, while desktop spacing remains unchanged.
- **Quote helper-text density fix:** mobile quote cards now hide redundant selection helper sentences under Vehicle age and Toll/Parking/Food cards; desktop retains these helper lines.
- **Quote date-time compactness upgrade:** mobile pickup date/time editor now includes a return-day stepper for tour trips, auto-deriving `tripEndDate` from selected day count to avoid separate end-date UI clutter.
- **Customer date-time UX parity:** `/customer` route planner now uses the same compact date-time overlay pattern as quote flow (pickup date + time steppers + return-day stepper for tour modes), reducing inline date-field footprint on mobile.
- **Customer picker wheel interaction:** customer date-time selector supports wheel/trackpad gesture adjustments for date, hour, minute, AM/PM, and trip days in the floating picker.
- **Customer picker scroll isolation:** wheel/trackpad gestures inside floating picker are now isolated from page scroll; outside picker, normal page scroll remains active.
- **Customer picker return controls visibility:** Return date and `-/+ day` controls are always shown in floating picker for consistent interaction expectations.
- **Customer floating picker pattern:** `/customer` date-time selector now uses a floating dropdown (not modal) anchored below the field, with wheel-illusion rows for date/hour/minute/AM-PM and wheel/trackpad increments.
- **Reserve-to-quote visual alignment:** `/customer/reserve` now follows the booking-quote green-gradient style language, removes redundant microcopy rows, and uses a stronger sticky mobile payment CTA treatment.
- **Reusable CTA style tokenization:** shared `Button` primitive now includes a reusable `tamayoGradient` variant for consistent green conversion buttons across customer booking surfaces.
- **Reserve inclusion-km clarity update:** reserve inclusions now show the maximum of route distance and included distance (when both are present) to align customer-facing km visibility with quote behavior.
- **Reserve inclusion/exclusion UI polish:** inclusion and exclusion rows now use denser modern card/chip styling with slightly smaller typography for improved mobile scanability.
- **Shared gradient-button glass effect:** `tamayoGradient` buttons now apply a consistent glassmorphism finish (soft translucency, blur, elevated shadow) across customer conversion CTAs.
- **Top-navbar sign-out control:** shell top bar now includes a direct sign-out action (door/arrow icon) that clears `tamayo.session_token` via `/api/v1/auth/logout` and redirects to `/login`.
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
| 2026-09-06 | **Implemented:** customer route tree no longer enforces upfront layout auth gate; auth is now progressively enforced at reserve/payment actions. |
| 2026-09-09 | **Implemented (stability):** replaced in-memory phone session persistence with signed stateless `tamayo.session_token` payload to prevent OTP-login/session loss on Vercel serverless routing. |
| 2026-09-09 | **Implemented (stability):** booking quote ↔ reserve navigation now consumes one-shot `autoReserve`, preserves quote return context, and prevents browser-back reserve loops after OTP continuation. |
| 2026-09-09 | **Implemented (UI stability):** reserve page route overview now excludes duplicated end-city stops and fixes mobile overflow/bottom-spacing regressions. |
| 2026-09-09 | **Implemented (MVP):** Google OAuth login flow added with mandatory phone completion before session issuance, preserving callback-based reserve/quote continuation. |
| 2026-09-08 | **Implemented:** `/customer/reserve` upgraded to a review-booking surface with trip context, inclusion/exclusion messaging, and pre-payment summary while payment-gateway integration remains pending. |
| 2026-09-15 | **Implemented (mobile-first UX):** `/customer/reserve` redesigned for dense mobile readability using sticky reserve CTA, compact key-fact cards, streamlined route timeline, and progressive disclosure (`details`) for inclusions/exclusions. |
| 2026-09-15 | **Implemented (UX refresh):** `/customer/reserve` restyled to an image-led MMT-like quote card with tighter typography hierarchy and persistent payment rail while preserving existing booking data contracts. |
| 2026-09-14 | **Implemented (product flow):** `/login` switched to Google-only sign-in UX; phone number capture remains mandatory post-Google while OTP verification is intentionally deferred to a later rollout phase. |
| 2026-09-18 | **Implemented (quote UX):** `/customer/booking-quote` topbar fields are now directly editable (trip type, source, destination, stops, pickup date/time), stops are shown between from/to, and desktop overflow risk at 100% zoom was reduced with wrap-safe layout behavior. |
| 2026-09-18 | **Implemented (quote compactness):** removed top heading copy and `Modify` button from `/customer/booking-quote`; mobile now shows a shorter summary-first top strip while keeping detailed controls for `md+` screens. |
| 2026-09-18 | **Implemented (quote display logic):** included-km card value now prefers computed route-km when route-km exceeds the `300 km/day` baseline threshold, reducing confusion for longer routes. |
| 2026-09-18 | **Implemented (quote mobile polish):** mobile quote UI now hides trust-strip tiles, uses a denser topbar scale, shows selected date/time inside the Date & time control, and switches trip-type editing from modal to inline dropdown for faster changes. |
| 2026-09-18 | **Implemented (customer shell UX):** customer top navbar now renders an image wordmark logo and hides `/ Customer` breadcrumb text to keep booking surfaces compact on mobile. |
| 2026-09-18 | **Implemented (customer quote density):** top gap below navbar was reduced for `/customer/booking-quote`, and customer wordmark height in navbar was reduced for better mobile content prioritization. |
| 2026-09-18 | **Implemented (customer quote navigation):** replaced mobile hamburger icon with back-arrow behavior on `/customer/booking-quote` to reduce navigation clutter and keep focus on booking completion. |
| 2026-09-18 | **Implemented (customer quote header polish):** back-arrow button styling was softened (lighter ghost treatment) to avoid heavy boxed appearance touching the header divider line. |
| 2026-09-18 | **Implemented (customer quote header micro-polish):** removed visible back-arrow border box and nudged icon placement toward top-left for cleaner visual balance in compact mobile navbar. |
| 2026-09-18 | **Implemented (quote card UI cleanup):** removed nested inner bordered wrapper in quote result cards so each vehicle renders on a single primary surface (no card-inside-card effect). |
| 2026-09-18 | **Implemented (quote card spacing):** removed mobile-only gap above fuel advisory content by hiding the verified-fare row container on mobile and retaining desktop-only verified rendering. |
| 2026-09-18 | **Implemented (quote card stack spacing):** set mobile outer card stack spacing to `space-y-0` for `/customer/booking-quote` while retaining `md:space-y-4` on desktop. |
| 2026-09-18 | **Implemented (quote card helper text):** hid redundant mobile helper lines for age and operational-option selections, while retaining those explanatory lines for desktop. |
| 2026-09-19 | **Implemented (quote date-time picker upgrade):** replaced basic pickup editor with a compact mobile-friendly picker that combines pickup date, time steppers, and return-day increment/decrement controls for round-trip/multi-city flows; `tripEndDate` is now derived from selected trip days in the same interaction. |
| 2026-09-19 | **Implemented (customer date-time picker reuse):** `/customer` page now reuses the compact picker pattern for pickup date/time and trip-duration selection, replacing separate start/end date-time field blocks with a single space-efficient overlay workflow. |
| 2026-09-19 | **Implemented (customer picker interaction hardening):** `/customer` date-time picker now behaves as a true modal (background scroll locked, centered overlay) and adds wheel/trackpad increment behavior for date, time, and trip-day controls. |
| 2026-09-19 | **Implemented (customer picker interaction correction):** changed `/customer` date-time selector from centered modal to floating dropdown anchored to the trigger and added 3-row wheel-illusion columns for date/hour/minute/AM-PM while keeping wheel and outside-click interactions. |
| 2026-09-19 | **Implemented (customer picker visual refinement):** aligned floating picker UI closer to reference with centered uppercase header, explicit colon lane, faded adjacent rows, highlighted middle selection rails, and inline return day stepper (`- / +`). |
| 2026-09-19 | **Implemented (customer picker usability fix):** prevented background scroll during in-picker wheel interactions, reduced picker typography scale for tighter mobile density, and made Return date plus day-stepper controls always visible. |
| 2026-09-19 | **Implemented (customer picker typography reduction):** reduced Date/Time wheel text sizing by roughly 30% (selected + adjacent rows) and shrank trigger summary text for a cleaner mobile footprint. |
| 2026-09-19 | **Implemented (customer picker scroll-chaining hardening):** added native capture-level non-passive `wheel`/`touchmove` prevention for events originating inside the floating picker to stop residual page scrolling during in-picker gestures. |
| 2026-09-19 | **Implemented (customer picker defaults + readability):** initialized picker to today with pickup time after 1 hour, slowed wheel step rate with throttled accumulated deltas, increased post-selection summary font on the form, switched summary to explicit start/end range format, and defaulted end time to `11:00 PM`. |
| 2026-09-19 | **Implemented (customer summary format alignment):** set on-form date-time summary text to `text-sm font-medium text-foreground` and switched to compact reference-style range rendering (`DD Mon, ddd - DD Mon, ddd, HH:mm`). |
| 2026-09-19 | **Implemented (customer summary font micro-reduction):** reduced on-form date-time summary text by about 15% (`text-sm` -> `text-xs`) to improve space utilization on mobile while retaining medium weight and foreground color. |
| 2026-09-19 | **Implemented (customer picker scroll-snap rebuild):** moved date-time lanes to CSS scroll-snap columns (date/hour/minute/AM-PM) with centered snap rows and touch momentum, replacing manual high-frequency wheel-step mutation to deliver smoother, slower in-picker scrolling without background-page drag. |
| 2026-09-19 | **Implemented (customer picker bugfix pass):** constrained date lane to today-and-future values only, normalized draft date to today when opening with stale past values, and converted moving selected-row borders into a fixed center green strip overlay that stays stationary while lists scroll. |
| 2026-09-19 | **Implemented (customer picker idle-scroll fix):** removed continuous scroll resync loop by scoping programmatic lane alignment to initial overlay open and guarding `onScroll` during that sync frame, eliminating self-scrolling behavior when user is idle. |
| 2026-09-19 | **Implemented (customer picker readability tune):** increased in-picker lane typography (date/hour/minute/AM-PM) and center separator scale by about 15% to improve legibility without changing picker density. |
| 2026-09-19 | **Implemented (customer CTA variant alignment):** replaced `/customer` date-picker `Select` and hero `See prices` actions with shared `Button` + `tamayoGradient` variant to keep gradient/glass CTA styling consistent and reusable. |
| 2026-09-19 | **Implemented (global gradient CTA darkening):** updated shared `tamayoGradient` button variant to a deeper emerald tone and stronger contrast so all existing gradient CTAs automatically render slightly darker across screens. |
| 2026-09-19 | **Implemented (gradient style correction):** retuned shared `tamayoGradient` to a dark emerald blend with subtle inner highlight and softer border to align closer with provided visual reference while preserving global reuse behavior. |
| 2026-09-19 | **Implemented (gradient rollback):** restored shared `tamayoGradient` to the prior visual token after feedback, bringing back the previous CTA appearance across all pages using the variant. |
| 2026-09-19 | **Implemented (original gradient restore):** rolled back shared `tamayoGradient` to its original pre-darkening baseline so all CTA buttons return to the earlier emerald-to-green visual treatment. |
| 2026-09-19 | **Implemented (customer page focused cleanup):** removed redundant `/customer` hero header copy (`Ride` and `Pune, IN` row), reduced pickup/dropoff and one-way advisory typography density, switched top-navbar auth action to explicit `Sign in`/`Sign out` text with green styling, and updated pickup date-time summary label to display 12-hour AM/PM time. |
| 2026-09-19 | **Implemented (customer picker adaptive placement):** date-time floating dropdown now auto-positions above or below its trigger depending on available viewport space, with viewport-clamped top coordinates to reduce off-screen rendering on smaller mobile viewports. |
| 2026-09-19 | **Implemented (customer picker scroll-follow performance):** eliminated visible picker catch-up lag during page scroll by moving floating-position updates from scroll-driven component re-renders to requestAnimationFrame-throttled direct style updates. |
| 2026-09-19 | **Implemented (customer picker anchor behavior correction):** replaced clamp-first position logic with trigger-anchored top/bottom placement plus adaptive max-height sizing, and switched to document-capture scroll tracking so picker stays attached to the date control during nested scrolling. |
| 2026-09-19 | **Implemented (customer overview chrome compacting):** removed the navbar divider line under logo on `/customer` and changed overview page container spacing to exact zero-gap edge-to-edge classes (`mx-auto w-full max-w-none px-0 py-0 sm:px-0 lg:px-0`). |
| 2026-09-19 | **Implemented (customer hero naming/spacing tune):** reduced gap between hero title and `Schedule my tour` pill, matched navbar auth chip styling to the same soft emerald pill treatment, and renamed date picker labels to `Pickup & Drop Date and Time` for clearer user intent. |
| 2026-09-19 | **Implemented (customer date-summary simplification):** removed weekday abbreviations from the closed pickup/drop summary text, leaving compact date + AM/PM time only to improve readability on mobile. |
| 2026-09-19 | **Implemented (customer date-summary ordering fix):** fixed closed summary format to include both start and end times in correct order (`start date, start time - end date, end time`) with end-time default preserved at `11:00 PM`. |
| 2026-09-19 | **Implemented (customer picker wheel wrap fix):** updated hour/minute/AM-PM lanes to cyclic repeated-scroll behavior with automatic center-band recentering so values loop continuously (e.g., minutes `45 -> 00`, hours `12 -> 01`) like a true wheel picker. |
| 2026-09-19 | **Implemented (customer trip-duration confirmation copy):** added dynamic `You are reserving cab for N day(s)` text above `See prices` for tour modes, driven by selected start/end dates to reduce ambiguity before quote generation. |
| 2026-09-19 | **Implemented (customer trip-duration helper visibility fix):** helper copy is now shown for any selected multi-day range (`>1 day`) instead of being restricted by ride-mode guard, so users always see duration confirmation when applicable. |
| 2026-09-19 | **Implemented (customer date-helper declutter):** removed non-tour pickup-time advisory line from the customer date selector section so only relevant tour-mode helper messaging is shown. |
| 2026-09-18 | **Implemented (reserve UX polish):** refreshed `/customer/reserve` with booking-quote-aligned green-gradient styling, removed low-value `pickup-drop & stop` + free-cancellation row text, and made the sticky CTA more visible on mobile with `Proceed to payment` copy. |
| 2026-09-18 | **Implemented (shared UI primitive):** added reusable `tamayoGradient` variant to `components/ui/button` and applied it to key customer booking CTAs to avoid repeated per-page gradient classes. |
| 2026-09-18 | **Implemented (reserve inclusion logic):** `/customer/reserve` inclusion line now displays the greater value between route distance and included distance when both are available, with fallback to package text when km data is unavailable. |
| 2026-09-18 | **Implemented (reserve detail-card polish):** Inclusions/Exclusions section now uses chip-style headers, softer elevated rows, and slightly reduced text size to improve modern feel and mobile readability. |
| 2026-09-18 | **Implemented (reserve detail-card density follow-up):** compacted Inclusions/Exclusions by removing extra decorative wrappers/chips and reducing text/padding/gaps for a less space-consuming mobile layout. |
| 2026-09-18 | **Implemented (reserve route overview polish):** route overview now uses a fixed-column timeline row structure to align start/end labels and values consistently, with compact modern styling cues (subtle gradient, connector line, icon chips). |
| 2026-09-23 | **Implemented (reserve card effect parity correction):** vehicle summary and route overview cards on `/customer/reserve` were corrected from light-gradient styling to the same dark emerald premium surface as the top estimated-total card, with text/icon contrast tuned for readability. |
| 2026-09-23 | **Implemented (reserve vehicle-card style rollback):** reverted the vehicle summary (`Sedan - Dzire or Aura`) card from dark premium surface back to lighter style and removed the `Cab operator will be assigned after booking confirmation.` helper row per review feedback. |
| 2026-09-23 | **Implemented (reserve vehicle-meta alignment):** changed fuel display in vehicle summary from amber badge chip to inline icon-text metadata so all four meta items share a consistent visual pattern. |
| 2026-09-23 | **Implemented (reserve desktop card grid):** switched vehicle summary and route overview cards to a responsive two-column layout on `md+` screens while preserving stacked order on mobile. |
| 2026-09-23 | **Implemented (reserve desktop card pairing fix):** updated `md+` two-column pairing to vehicle summary + inclusions/exclusions (matching light-surface treatment) and restored route overview as a full-width card below. |
| 2026-09-23 | **Implemented (reserve animated route experiment):** replaced static route overview with a client-rendered animated route map card that visualizes start, intermediate stops, and destination along a stylized itinerary path with moving vehicle marker. |
| 2026-09-23 | **Implemented (reserve animated route visual parity pass):** refined the experimental map card to closely match provided reference aesthetics (emerald topographic background, typography hierarchy, labeled day stop capsules, dotted luminous route, and branded moving car visual). |
| 2026-09-23 | **Implemented (reserve animated route compact/copy pass):** reduced animated route visual lane height by roughly 25% and updated experiment copy to `Travel boleto, Tamayo!!` with footer text `Travelling with Tamayo`. |
| 2026-09-23 | **Implemented (reserve animated wrapper height tweak):** reduced vertical padding on the route animation outer content wrapper (`relative z-10 ...`) to decrease total card height while preserving route animation proportions. |
| 2026-09-23 | **Implemented (reserve animated route height regression fix):** reapplied reduced route-lane height after later visual replication changes had reset lane size to larger values, ensuring compact card height is now effective again. |
| 2026-09-23 | **Implemented (reserve animated route extra compact pass):** reduced route-lane height by another 25% from compact baseline (`188/202` to `141/152`) for higher information density. |
| 2026-09-23 | **Implemented (reserve animated title glow pass):** added layered glow shadows and tuned heading color for `Travel boleto, Tamayo!!` to better match luminous hero-title styling from the supplied reference artwork. |
| 2026-09-23 | **Implemented (reserve animated heading reference-effect sync):** switched route-card header styling to the same typography/effect primitives from supplied code reference (eyebrow line system + Fraunces clamp headline metrics + muted date line), replacing prior custom glow treatment. |
| 2026-09-23 | **Implemented (reserve animated title glow visibility fix):** added a stronger two-layer glow composition (blurred underlay text plus foreground luminous shadow) so title glow remains perceptible after reference-typography sync and compact-height adjustments. |
| 2026-09-23 | **Implemented (reserve animated title glow softening):** dialed down title glow intensity (reduced underlay opacity/blur and shorter outer glow radius) for a subtler finish. |
| 2026-09-23 | **Implemented (reserve animated title color revert):** changed route-card headline color back to white and tuned underlay glow to white for consistency with prior approved tone. |
| 2026-09-23 | **Implemented (reserve animated mobile declutter pass):** removed route-card header copy on mobile and compressed waypoint capsule content/spacing for better small-screen readability while preserving full-detail header treatment on desktop. |
| 2026-09-23 | **Implemented (reserve animated mobile scale trim):** reduced mobile car size and lowered mobile waypoint/footer text scale inside route animation to improve proportion after compact-height adjustments. |
| 2026-09-23 | **Implemented (reserve animated mobile waypoint fix):** reduced car size again, enforced 9-char ellipsis for mobile stop names, reduced mobile stop-name text by ~25%, and repositioned the first mobile stop capsule below route marker to avoid clipped start-name visibility. |
| 2026-09-18 | **Implemented (reserve vehicle-summary consistency):** lowered `₹499` emphasis inside reserve card and switched fuel/km/passenger/duration metadata icons to the same Tamayo 3D icon family used on quote cards for a continuous visual language. |
| 2026-09-18 | **Implemented (reserve CTA visibility hardening):** removed the in-card `₹499 / Reserve now` block and split payment CTA rendering by breakpoint (`mobile sticky` + `desktop inline`) so `Proceed to payment` remains visible in both mobile inspect and desktop layouts. |
| 2026-09-18 | **Implemented (shared gradient CTA style update):** enhanced reusable `tamayoGradient` button variant with glass effect styling so all gradient CTAs inherit the same modern look without per-page overrides. |
| 2026-09-19 | **Implemented (shell auth control):** added a top-navbar Sign out action (`LogOut` door/arrow icon) wired to `/api/v1/auth/logout` with loading state and `/login` redirect for explicit session exit from role dashboards. |
