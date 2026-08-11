# Tamaiyyo — backend architecture (MVP implementation blueprint)

**Maturity:** FOUNDATION  
**Purpose:** Define the **MVP backend implementation architecture** for Tamaiyyo: how server-side logic, data, APIs, auth, and operations are structured in this repository—**startup-friendly**, **modular**, and **extractable later** without premature microservices.

**Related docs:** [`docs/architecture.md`](../architecture.md) (global repo layout), **[`docs/architecture/api-architecture.md`](./api-architecture.md)** (REST routes, responses, handler layering), **[`docs/architecture/prisma-data-architecture.md`](./prisma-data-architecture.md)** (Postgres, Prisma, snapshots, audit persistence), **[`docs/architecture/prisma-schema-planning.md`](./prisma-schema-planning.md)** (schema planning blueprint), [`docs/features/frontend-auth-architecture.md`](../features/frontend-auth-architecture.md) (current Better Auth wiring), [`docs/features/auth-rbac.md`](../features/auth-rbac.md) (RBAC philosophy), **[`docs/architecture/domain-models/`](./domain-models/README.md)** (entity blueprints), marketplace domain specs under `docs/features/`, [`docs/project/current-state.md`](../project/current-state.md).

**Non-goals (this document):** Prisma schema contents (see **`prisma-data-architecture.md`**, **`prisma-schema-planning.md`**); OpenAPI specs; Kubernetes or multi-region infra; payment-processor integration detail; exact RBAC permission matrices.

---

## How to read this spec

| Label | Meaning |
| --- | --- |
| **Implemented** | Present in the repository today (may be partial vs full MVP target). |
| **Planned** | Agreed MVP direction; not fully built yet. |
| **Exploratory** | Optional later phase; do not treat as committed. |

---

## 1. Backend architecture philosophy

**Planned**

- **Modular monolith:** One deployable application (this Next.js repo) with **clear domain modules** and **explicit boundaries**—shared runtime, shared database, **no** separate services at MVP.
- **Startup-friendly:** Prefer **boring, well-supported** tools (PostgreSQL, Prisma, route handlers) over custom frameworks; optimize for **time-to-learning** and **operational simplicity**.
- **Scalable extraction later:** Modules are shaped so a future team can **extract** a hot domain (e.g. billing jobs, notifications) into a worker or service **without** rewriting business rules—**extraction is not MVP work**.
- **Operational simplicity first:** Fewer moving parts at launch (no mandatory message bus, no K8s); add complexity only when product or load demands it.

**Implemented**

- Monolith **host** exists: Next.js App Router with server-side entry points (`app/api/*`, Server Components, Server Actions as adopted).

**Exploratory**

- Splitting **read models** (reporting DB) from OLTP before scale requires it.

---

## 2. Backend stack direction

| Layer | Choice | Status |
| --- | --- | --- |
| **Application runtime** | Next.js **Route Handlers** + Server Actions / RSC data loading where appropriate | **Implemented** (handlers for auth); domain REST **Planned** |
| **Language** | TypeScript (strict), shared types with frontend | **Implemented** |
| **Database** | **PostgreSQL** as system of record | **Planned** |
| **ORM** | **Prisma** | **Planned** |
| **Authentication** | **Better Auth** (session integration; persistence adapter **Planned**) | **Implemented** (stateless foundation); **Planned** (DB-backed users/sessions) |
| **HTTP APIs** | **REST** (JSON), **`/api/v1/`** per [`api-architecture.md`](./api-architecture.md) | **Planned** (internal-only at MVP; auth at `/api/auth/*` **Implemented**) |

**Planned — integration notes**

- Better Auth remains the **auth HTTP seam** at `api/auth/*`; domain REST lives under a separate prefix (e.g. `api/v1/*`) to avoid colliding with auth callbacks—exact prefix **Unresolved mechanics**.
- Prisma Client is **server-only**; never imported from Client Components (`docs/architecture.md` env boundaries).

**Exploratory**

- GraphQL or tRPC for mobile/partner APIs.

---

## 3. Domain-module boundaries

Domain logic lives primarily under **`src/features/<domain>/`** (and supporting **`src/lib/`** for cross-cutting infrastructure), aligned with **`docs/features/*.md`** behavior specs.

| Module | Owns (conceptual) | Feature spec (behavior) | Status |
| --- | --- | --- | --- |
| **auth** | Sessions, identity linkage, entitlement resolution hooks | `auth-rbac.md`, `frontend-auth-architecture.md`, [`domain-models/identity-domain-model.md`](./domain-models/identity-domain-model.md) | **Implemented** (session foundation); **Planned** (RBAC + DB) |
| **customer** | Customer profile, booking intent surfaces, post-trip customer actions | `booking-lifecycle.md` (customer actor) | **Planned** |
| **booking** | Booking lifecycle state, transitions, assignment orchestration | `booking-lifecycle.md`, [`domain-models/booking-domain-model.md`](./domain-models/booking-domain-model.md) | **Planned** |
| **pricing** | Quote inputs, rate-card resolution, eligibility flags | `pricing-engine.md` | **Planned** |
| **vehicle** | Supplier vehicle records, category/age mapping, compatibility checks | `vehicle-management.md`, [`domain-models/vehicle-domain-model.md`](./domain-models/vehicle-domain-model.md) | **Planned** |
| **supplier** | Onboarding status, routing/acceptance, ops workflows | `supplier-operations.md` | **Planned** |
| **billing** | Final bill composition, settlement eligibility, payout batches | `billing-settlement.md`, [`domain-models/billing-domain-model.md`](./domain-models/billing-domain-model.md) | **Planned** |
| **admin** | Overrides, config CRUD, operational interventions, audit triggers | `auth-rbac.md`, domain specs (admin actor) | **Planned** |
| **notifications** | Email/SMS/push dispatch (templates, delivery status) | Cross-cutting; per-feature triggers **Planned** | **Planned** |
| **analytics** | Product/event capture, operational metrics export | PostHog integration (§9) | **Planned** (lightweight MVP) |
| **support** | Dispute/case linkage to booking + billing state | `supplier-operations.md` §13, `billing-settlement.md` §11 | **Planned** |

**Agreed boundary rules**

- **Modules do not call each other’s internals** across boundaries—use **explicit application services** or **domain events** (in-process at MVP) at module edges.
- **UI in `app/`** composes modules; **business rules** stay in `features/*`, not buried only in route files.
- **Cross-cutting** concerns (DB client, logging, clock, id generation) live in **`src/lib/`**, not duplicated per module.

**Exploratory**

- Dedicated **`packages/`** workspace for shared types if the repo splits frontend/backend later.

---

## 4. Database philosophy

**Planned**

- **PostgreSQL** is the **source of truth** for durable marketplace state (bookings, config, suppliers, vehicles, financial records).
- **Prisma** is the **ORM abstraction** for schema evolution, migrations, and type-safe queries—avoid raw SQL except for proven performance paths.
- **Future optimization flexibility:** indexes, read replicas, partitioning, and archival are **operational choices** applied to PostgreSQL without changing the modular monolith shape first.

**Implemented**

- **`prisma/schema.prisma`** — PostgreSQL + Prisma schema foundation with 21 models for marketplace MVP.
- **`prisma.config.ts`** — Prisma 7 CLI configuration for schema path, migration path, seed path, and datasource URL resolution.
- **`src/lib/db/prisma.ts`** — Prisma Client singleton with PostgreSQL adapter (Prisma 7.x).
- **`src/lib/db/types.ts`** — PrismaTransactionClient type for repository transaction support.
- **`src/lib/db/transactions.ts`** — Transaction helper utilities (`withTransaction`, `withTransactionTimeout`).
- **`prisma/migrations/20260518_init/`** — Initial database migration SQL.
- **`prisma/seed.ts`** — Seed foundation (placeholders for admin, pricing, city data).
- **Repository foundation** at `src/lib/repositories/`:
  - `identity/customer-repository.ts` — CustomerAccount CRUD
  - `identity/supplier-repository.ts` — SupplierAccount CRUD, filters, verification
  - `booking/booking-repository.ts` — Booking queries with filters, status updates, cancellation
  - `booking/booking-itinerary-repository.ts` — BookingItinerary (one-to-one with Booking)
  - `booking/booking-pricing-snapshot-repository.ts` — Immutable pricing snapshots
  - `booking/quote-repository.ts` — Quote generation and storage
  - `booking/assignment-history-repository.ts` — Assignment tracking (supplier/vehicle/driver)
  - `booking/trip-execution-repository.ts` — Trip execution (actual km, tolls, parking)
  - `billing/final-bill-repository.ts` — Immutable final bills
  - `billing/commission-snapshot-repository.ts` — Immutable commission snapshots
  - `billing/supplier-earning-repository.ts` — Supplier earnings and payout tracking
  - `billing/payment-repository.ts` — Payment records (placeholder)
  - `vehicle/vehicle-repository.ts` — Vehicle inventory, soft-delete, age bucket calculation
  - `vehicle/driver-repository.ts` — Driver CRUD, filters, soft-delete
  - `upload/upload-repository.ts` — Upload metadata (placeholder)
  - `event/domain-event-repository.ts` — Append-only event log for audit
  - Conventions documented in `repositories/README.md`
- **Service foundation** at `src/lib/services/`:
  - `booking/booking-service.ts` — Booking orchestration (quote gen, creation, listing)
  - `booking/quote-service.ts` — Pricing calculations (MVP placeholder rates)
  - `assignment/assignment-service.ts` — Supplier assignment, acceptance/rejection, vehicle/driver assignment, admin reassignment
  - `billing/billing-service.ts` — Trip completion, final billing, settlement (MVP commission rates)
  - `supplier/supplier-service.ts` — Supplier onboarding, verification, status transitions
  - `vehicle/vehicle-service.ts` — Vehicle inventory, verification, status transitions
  - Conventions documented in `services/README.md`
- **Validation foundation** at `src/lib/validation/`:
  - Zod helpers (`validateDto`, `safeValidateDto`)
  - Common schemas (UUID, phone, email, pagination)
  - `schemas/supplier-schemas.ts` — Supplier onboarding DTOs
  - `schemas/vehicle-schemas.ts` — Vehicle creation/update DTOs
- **Error system** at `src/lib/errors/`:
  - `ValidationError`, `NotFoundError`, `ConflictError`, `ForbiddenError`, `UnauthorizedError`
- **Backend types** at `src/types/backend.ts` (pagination, results)
- **REST API routes** at `src/app/api/v1/`:
  - `/suppliers/onboarding/draft` — POST supplier draft
  - `/suppliers/onboarding/submit` — POST supplier submission
  - `/suppliers/[id]` — GET supplier details
  - `/suppliers` — GET supplier list with filters
  - `/vehicles` — POST create vehicle, GET vehicle list
  - `/vehicles/[id]` — GET/PATCH/DELETE vehicle
  - `/admin/suppliers/[id]/verify` — POST approve/reject supplier
  - `/admin/vehicles/[id]/verify` — POST approve/reject vehicle
  - `/bookings/quote` — POST generate quote (no booking created)
  - `/bookings` — POST create booking, GET list bookings
  - `/bookings/[id]` — GET booking details
  - `/bookings/ref/[ref]` — GET booking by bookingRef
  - `/bookings/[id]/complete` — POST supplier/driver submits trip execution
  - `/bookings/[id]/confirm-km` — POST customer confirms km (optional, auto-resolves ≤20km mismatch)
  - `/bookings/[id]/generate-bill` — POST generate final bill (admin/system)
  - `/bookings/[id]/close` — POST operational closure (BILLING_IN_PROGRESS → CLOSED)
  - `/billing/bookings/[id]` — GET final bill by booking ID
  - `/supplier/bookings/available` — GET supplier booking queue
  - `/supplier/bookings/[id]/accept` — POST supplier accept booking
  - `/supplier/bookings/[id]/reject` — POST supplier reject booking
  - `/bookings/[id]/assign` — POST assign vehicle/driver to booking
  - `/admin/bookings/[id]/reassign` — POST admin reassign booking to different supplier

**Unresolved mechanics**

- Local migration reset runbook for Prisma 7 environments where baseline state causes `P3005` on `migrate dev`; destructive reset (`migrate reset`) must be explicitly operator-approved and never run against production databases.
- **Multi-tenant** row scoping (`supplier_id`) patterns—see **`prisma-data-architecture.md`** for soft-delete, UUID/refs, snapshots, audit defaults.

**Exploratory**

- **Event outbox** table for reliable async delivery without a separate broker at small scale.

---

## 5. Deployment philosophy

**Planned**

- **Vercel** hosts the Next.js application initially (serverless/edge functions per route, aligned with current stack).
- **Supabase PostgreSQL** (or equivalent managed Postgres) provides the **initial** database—low ops overhead for MVP.
- **Future AWS / RDS migration capability:** connection strings and migration tooling should remain **portable** (standard Postgres + Prisma); no Supabase-specific SQL required in application code—**migration runbook** **Exploratory** until needed.

**Implemented**

- Application is structured for **Vercel-style** Next deployment; no production infra-as-code in repo yet.

**Exploratory**

- **Self-hosted** Next on ECS/EC2 if Vercel limits or cost profile changes.

---

## 6. Storage philosophy

**Planned**

- **Managed object storage** for user/supplier uploads (vehicle documents, toll receipts, profile assets)—startup-friendly (**S3-compatible** API; provider may be Supabase Storage, R3, or S3 depending on ops choice).
- **Metadata in PostgreSQL** (object key, MIME, uploader, retention class); **bytes in object store**.
- **Operational simplicity:** presigned uploads where possible; virus scanning and lifecycle policies **Unresolved mechanics**.

**Exploratory**

- CDN in front of public marketing assets only.

---

## 7. API philosophy

**Planned**

- **REST-first:** Resource-oriented JSON endpoints; predictable verbs and status codes; errors carry **machine-readable codes** + human messages.
- **Internal APIs only initially:** Consumed by this Next.js app (RSC, client fetch, Server Actions calling shared services)—**no** public partner API at MVP.
- **Future external API capability:** Reserve **`/api/v1/`** (or equivalent) namespace and **auth model** (API keys / OAuth) without implementing partner docs yet.

**Implemented**

- Better Auth HTTP surface at **`/api/auth/*`** only.

**Unresolved mechanics**

- Pagination, filtering, and idempotency-key standards for write endpoints.

**Exploratory**

- **Webhooks** for supplier TMS integrations.

---

## 8. Authentication & authorization integration

**Implemented**

- **Better Auth** server instance (`src/lib/auth/instance.ts`); **`getSession` / `requireSession`** for server paths; Edge **middleware** optimistic cookie check; **`api/auth/[...all]`** handler.
- **Session presence** gates role dashboard trees; **fine-grained RBAC** not enforced in domain code yet.

**Planned**

- **Prisma adapter** (or Better Auth–supported persistence) for users, sessions, and linked accounts when login product ships.
- **Entitlements** loaded server-side per `auth-rbac.md` and checked in **every** route handler / Server Action touching domain mutations.
- **Layered model preserved:** middleware (coarse) → handler/action (authoritative permission + data scope).

**Unresolved mechanics**

- Mapping **product roles** (customer/supplier/admin) to **permission sets**; multi-role identities; supplier **tenant context** in session.

**Exploratory**

- **Step-up** auth for admin financial actions.

---

## 9. Observability philosophy

**Planned**

- **Sentry:** Error and performance monitoring for server and client; release tagging; PII scrubbing in configuration.
- **PostHog:** Product analytics and funnels (role-aware, consent-gated where required)—not a substitute for financial audit logs.
- **Audit logging for critical admin actions:** Append-only record of **who / what / when** for overrides, pricing config changes, payout holds, manual refunds—storage format **Unresolved mechanics**; philosophy aligns with `auth-rbac.md` and `billing-settlement.md`.

**Implemented**

- None of the above wired in repo yet.

**Exploratory**

- OpenTelemetry traces across future extracted services.

---

## 10. Asynchronous processing philosophy

**Planned**

- **Synchronous-first MVP:** Booking acceptance, quote generation, and bill finalization run in the **request path** where latency is acceptable; keep UX honest (loading states per design-system).
- **Future queue/event extraction points** (design hooks, not MVP build):
  - Payout batch generation
  - Notification delivery retries
  - Analytics enrichment
  - Report exports

**Exploratory**

- Managed queue (SQS, Inngest, Trigger.dev, etc.) when synchronous paths fail SLOs or need retries.

---

## 11. Scalability philosophy

**Planned**

- **Modular extraction readiness:** Each domain module (§3) should be movable to a worker with **clear inputs/outputs** (commands + domain events).
- **Avoid premature microservices:** Stay monolith until **measured** pain (team size, deploy coupling, resource isolation).
- **Likely future scaling domains** (candidates for extraction, not commitments):
  - **billing** (batch settlement, payment webhooks)
  - **notifications** (high fan-out)
  - **analytics** (heavy reads)
  - **pricing** (CPU-heavy quote batches at scale)

**Exploratory**

- Read replica for reporting; **CQRS** only if reporting load dominates.

---

## 12. Operational / admin architecture philosophy

**Planned**

- **Admin** capabilities are **first-class domain** (`features/admin`), not ad-hoc scripts: config (pricing, payout cycles), supplier verification, booking intervention, dispute resolution—aligned with feature specs.
- **Server-enforced** admin routes under `/admin` with **strictest RBAC** and **audit** on mutations.
- **Support** workflows link **cases** to booking + billing entities (`support` module); avoid orphan tooling outside the data model.

**Implemented**

- **Admin UI shell** placeholder only; no operational backend.

**Unresolved mechanics**

- **Dual-control** (two-person approval) for high-risk financial actions.

---

## 13. Future extensibility considerations

**Agreed**

- New domains add **`src/features/<name>/`** + **`docs/features/<name>.md`** before substantial code; update this document’s module table when a new bounded context appears.
- **Configuration-driven** pricing and payout rules stay in **PostgreSQL**, not env vars, per `pricing-engine.md` and `billing-settlement.md`.

**Exploratory**

- **Mobile app** BFF or public API gateway in front of the same domain services.
- **Multi-region** active-active (unlikely at MVP).

---

## Conceptual request flow (MVP)

```text
Browser / RSC
    → Next.js Route Handler or Server Action
        → auth: session + entitlements (Better Auth + RBAC)
        → domain module service (features/*)
            → Prisma → PostgreSQL
        → optional: object storage (presigned)
    ← JSON or RSC payload
```

---

## Revision log

| Date | Change |
| --- | --- |
| 2026-05-18 | **FOUNDATION:** MVP backend blueprint—modular monolith, stack, domain modules, data/deploy/storage/API, auth, observability, async, scale, admin ops. |
| 2026-08-11 | **Implemented/Planned sync:** Added Prisma 7 config seam (`prisma.config.ts`) to implemented backend data layer and documented local migration reset mechanics/safety requirements under unresolved mechanics. |

When PostgreSQL/Prisma land in repo, add a dated row and update **`docs/project/current-state.md`** and **`docs/project/architecture-decisions.md`**.
