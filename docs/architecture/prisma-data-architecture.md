# Tamaiyyo — Prisma & data architecture (persistence blueprint)

**Maturity:** FOUNDATION  
**Purpose:** Foundational **PostgreSQL + Prisma** persistence architecture: identities, references, soft-delete, timestamps, snapshots, relationships, audit events, indexing, uploads, and repository boundaries—**without** Prisma schema files, migrations, or infrastructure beyond what `backend-architecture.md` already defers.

**Related docs:** [`docs/architecture/backend-architecture.md`](./backend-architecture.md) (stack, modules), [`docs/architecture/api-architecture.md`](./api-architecture.md) (handler → repository layering), **[`docs/architecture/prisma-schema-planning.md`](./prisma-schema-planning.md)** (schema planning blueprint—reads this doc), [`docs/architecture/domain-models/`](./domain-models/README.md) (entity semantics), [`docs/features/booking-lifecycle.md`](../features/booking-lifecycle.md), [`docs/features/billing-settlement.md`](../features/billing-settlement.md), [`docs/features/supplier-operations.md`](../features/supplier-operations.md).

**Non-goals (this document):** `schema.prisma` contents (see **`prisma-schema-planning.md`**); SQL migrations; connection pool tuning; read-replica topology; Redis implementation.

---

## How to read this spec

| Label | Meaning |
| --- | --- |
| **Implemented** | Present in the repository today. |
| **Planned** | Agreed persistence architecture for MVP; not in repo yet. |
| **Exploratory** | Optional later; not mandatory until promoted. |

---

## 1. Data architecture philosophy

**Planned**

- **PostgreSQL as source of truth:** All durable marketplace, financial, and audit state lives in **one OLTP Postgres** database at MVP (managed host per `backend-architecture.md` §5).
- **Prisma as thin persistence layer:** Prisma provides **schema**, **migrations**, and **type-safe queries**—not business rules. **Validators and services** own invariants (`api-architecture.md` §5, §12).
- **Business logic outside ORM:** No lifecycle transitions, pricing math, or refund policy in Prisma middleware alone—repositories return/save data; **services** decide.
- **Modular monolith:** Single database, **logical** boundaries via table ownership per domain module—no per-service DB at MVP.

**Implemented**

- **`prisma/schema.prisma`** — PostgreSQL provider, 21 models, UUID primary keys, soft-delete on operational entities, immutable financial snapshots.

**Exploratory**

- Read replica or OLAP export for analytics.

---

## 2. UUID and reference philosophy

**Planned**

- **UUID internal identities:** Primary keys are **UUID** (v4 or v7—**Unresolved mechanics**) for `id` columns on core entities—stable, non-guessable, safe for distributed creation.
- **Public human-readable references:** Customer-facing and support-facing **reference codes** separate from `id`:
  - **Non-sequential booking references** (e.g. alphanumeric `bookingRef`)—generated with collision check; **not** exposed as primary key.
  - Optional refs for bills, payout batches—**Unresolved mechanics**.
- **APIs and UI** may show **ref**; internal joins use **UUID**.

**Unresolved mechanics**

- Ref format (length, charset, prefix); whether refs are ever reassigned (default: **never**).

**Exploratory**

- ULID for time-sortable internal ids instead of UUIDv7.

---

## 3. Soft-delete philosophy

**Planned**

| Class | Soft delete? | Rationale |
| --- | --- | --- |
| **Operational entities** (vehicles, drivers, supplier profile fields, draft configs) | **Yes** — `deletedAt` (nullable timestamp) | Hide from active ops; retain FK history |
| **Bookings, quotes, bills, payments, refunds, payout batches, audit events** | **No hard delete** at MVP | **Preserve** for legal/ops/financial integrity; use **status** (cancelled, removed) not row deletion |
| **Financial / audit rows** | **Never physically deleted** | Append-only or status-terminal; soft-delete only if needed for mistaken draft rows **before** issuance—**Unresolved mechanics** |

**Planned — query rule**

- Default queries filter `deletedAt IS NULL` on soft-deleted tables; **admin/history** queries may include deleted with explicit flag.

**Exploratory**

- Tombstone retention job after N years for non-financial entities only.

---

## 4. Timestamp philosophy

**Planned**

- **Standard columns** on mutable entities:
  - `createdAt` — server default at insert
  - `updatedAt` — auto-updated on change
- **Future `createdBy` / `updatedBy`:** Schema reserves optional **actor id** (UUID → identity/admin account) on sensitive tables—nullable at MVP until audit actor wiring is uniform—**Planned** extensibility, not required day one.
- **Event time vs processing time:** Audit events store **`occurredAt`** (business time) and **`recordedAt`** (insert time) when they differ—**Unresolved mechanics**.

**Exploratory**

- Row-level effective dating for pricing config.

---

## 5. Snapshot persistence philosophy

**Planned**

- **Immutable snapshot rows or JSON documents** persisted at defined lifecycle points—**never updated in place** after seal:
  - **Booking pricing snapshot** — at quote commit / booking creation (`booking-domain-model.md` §4, `pricing-engine.md`)
  - **Billing snapshots** — quote totals, final bill line breakdown, **variance** fields (`billing-domain-model.md` §4)
  - **Commission snapshots** — rule version ids **and calculated amounts** (`billing-domain-model.md` §7)
- **Storage shape:** Prefer **normalized snapshot header + line items** where reporting needs joins; **JSON blob** acceptable for MVP subsets if query patterns stay simple—exact split **Unresolved mechanics**.
- **Historical integrity:** Snapshots reference **pricing config version id** and sold commercial terms—not live config rows.

**Implemented**

- Domain semantics only; no tables yet.

**Exploratory**

- Content-addressed snapshot hash for tamper-evidence.

---

## 6. Relationship philosophy

**Planned**

- **Stable historical references:** Foreign keys store **UUID** of related entity at time of link; historical rows **keep** FK even if related entity is **soft-deleted**, **suspended**, or **removed** from active ops.
- **Booking-centric graph:** Booking → customer account, supplier account (when assigned), assignment history (vehicle id, driver id), quote, payments, final bill, refunds, financial events.
- **No CASCADE delete** on financial or booking history paths—**restrict** or **set null** only where product explicitly allows orphan prevention at draft stage.
- **Removed entities still historically linked:** Vehicle `removed` state does not break past booking assignment rows (`vehicle-domain-model.md` §12).

**Unresolved mechanics**

- Whether assignment history is normalized table vs JSON array on booking.

**Exploratory**

- Temporal tables (system-versioned rows) for config.

---

## 7. Event / audit persistence philosophy

**Planned**

- **Generic append-only event model** (conceptual table family):
  - `id` (UUID)
  - `entityType` + `entityId` — polymorphic target (booking, bill, payout batch, …)
  - `eventType` — string or controlled vocabulary (flexible—§8)
  - `actorType` + `actorId` — customer / supplier / admin / system
  - `payload` — **JSON** with event-specific details (minimal PII)
  - `occurredAt` / `recordedAt`
- **No updates or deletes** on audit rows at MVP (corrections = compensating event).
- Aligns with `billing-domain-model.md` §9 and `api-architecture.md` §9.

**Exploratory**

- Partition events by month; separate financial vs ops event tables if volume demands.

---

## 8. Enum / state philosophy

**Planned**

- **Strict operational enums** in Prisma/schema for **lifecycle states** with small closed sets:
  - Booking status, vehicle status, supplier account status, payment status, payout batch status, etc.
  - Schema changes required to add enum value—intentional friction.
- **Flexible event types:** `eventType` on audit stream remains **string** (or extensible enum with frequent additions)—product can add types without blocking deploys if validation is server-side allowlist per release.
- **PostgreSQL enum vs text:** Prisma enum for core states; **Unresolved mechanics** for migration pain vs `text` + check constraint.

**Exploratory**

- State machine tables driving valid transitions.

---

## 9. Indexing / search philosophy

**Planned**

- **Minimum index plan** (conceptual—create with schema):
  - **`bookingRef`** — unique where not null
  - **`supplierId`** — bookings, vehicles, drivers, earnings lists
  - **`status`** — filtered list endpoints (often composite with date)
  - **Date columns** — `tripStartDate`, `createdAt` for operational dashboards and payout eligibility windows
- **Composite indexes** for common queries (e.g. `(supplierId, status, tripStartDate)`)—tune from access patterns, not speculative over-indexing.
- **Customer account id** on bookings for “my trips” lists.

**Unresolved mechanics**

- Partial indexes for `deletedAt IS NULL`; GIN on JSON payload for admin search.

**Exploratory**

- Full-text search extension for support consoles.

---

## 10. Upload persistence philosophy

**Planned**

- **Metadata in Postgres:** `Upload` or `Attachment` entity: UUID `id`, storage **object key**, MIME, size, uploader actor, linked `entityType`/`entityId`, `createdAt`, soft-delete optional for mistaken uploads **before** link.
- **Files external:** Bytes in object store only (`backend-architecture.md` §6).
- **Historical upload preservation:** Linked attachments remain after trip **closed**; deletion of file in bucket is **policy-driven** (retention job)—DB row retained for audit with `archivedAt` **Unresolved mechanics**.

**Exploratory**

- Virus scan status column on upload metadata.

---

## 11. Prisma / repository / service boundaries

**Planned**

| Layer | May use Prisma? | Responsibility |
| --- | --- | --- |
| **Route handler** | **No** | HTTP, session, DTO mapping |
| **Service** | **No** | Business rules, transactions orchestration |
| **Repository** | **Yes** | Prisma queries, mapping to domain types |
| **Prisma schema** | — | Tables, relations, indexes, migrations |

**Planned — transactions**

- **Service** opens transaction boundary (`prisma.$transaction`); repositories participate with shared client—avoid nested transaction sprawl.

**Planned — Better Auth**

- Auth tables via Better Auth **adapter** migrations—coordinate schema ownership with `identity` module—**Unresolved mechanics**.

**Implemented**

- Boundary described in `api-architecture.md`; not coded for domain data.

**Exploratory**

- Repository interfaces for test doubles without Prisma.

---

## 12. Future extensibility considerations

**Planned**

- **Analytics:** Event stream + snapshot tables suitable for **ETL** or read-model projection later—no separate warehouse at MVP.
- **Extraction readiness:** Repository modules per domain so a service could swap Postgres for HTTP client to extracted microservice—domain types stay ORM-agnostic.
- **Redis later if required:** **Exploratory** for session cache, rate limits, idempotency keys—not MVP; **do not** assume Redis exists in core schema.

**Exploratory**

- Outbox table (`backend-architecture.md`) for async notifications/payout jobs.
- Column-level encryption for sensitive fields.

---

## Logical schema ownership (by domain module)

**Planned** — table families owned by repository modules (names illustrative):

| Module | Primary table families |
| --- | --- |
| **auth / identity** | identities, customer/supplier/admin accounts (Better Auth tables coordinated) |
| **vehicle** | vehicles, drivers |
| **booking** | bookings, trip execution, assignments, itinerary, pricing snapshots |
| **billing** | quotes, bills, bill lines, payments, refunds, earnings, payout batches, commission snapshots |
| **admin** | pricing config versions, audit-friendly config change log |
| **support** | notes, dispute cases (when introduced) |
| **cross-cutting** | domain_events, uploads |

---

## Revision log

| Date | Change |
| --- | --- |
| 2026-05-18 | **FOUNDATION:** Postgres/Prisma philosophy, UUID+refs, soft-delete, timestamps, snapshots, relationships, audit events, enums, indexing, uploads, repository boundaries, extensibility. |
| 2026-05-18 | **Implemented:** `prisma/schema.prisma` with 21 models implementing this architecture. |

Schema implementation aligns with domain models; see `prisma/schema.prisma` for actual table definitions.
