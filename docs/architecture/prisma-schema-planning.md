# Tamaiyyo — Prisma schema planning (implementation blueprint)

**Maturity:** FOUNDATION  
**Purpose:** Implementation-grade **Prisma schema planning blueprint** for Tamaiyyo—defines the **concrete model groups**, **field strategies**, **relationship patterns**, and **transaction boundaries** before generating `schema.prisma`—**without** writing the schema file itself.

**Related docs:** **[`docs/architecture/prisma-data-architecture.md`](./prisma-data-architecture.md)** (foundational persistence philosophy), **[`docs/architecture/backend-architecture.md`](./backend-architecture.md)** (modules, stack), **[`docs/architecture/api-architecture.md`](./api-architecture.md)** (handler → repository), **[`docs/architecture/domain-models/`](./domain-models/README.md)** (entity blueprints: identity, vehicle, booking, billing), [`docs/features/booking-lifecycle.md`](../features/booking-lifecycle.md), [`docs/features/billing-settlement.md`](../features/billing-settlement.md), [`docs/features/supplier-operations.md`](../features/supplier-operations.md), [`docs/features/pricing-engine.md`](../features/pricing-engine.md).

**Non-goals (this document):** Actual `schema.prisma` file; SQL migrations; Prisma client generation; connection strings; seed scripts.

---

## How to read this spec

| Label | Meaning |
| --- | --- |
| **Implemented** | Present in repository today. |
| **Planned** | Agreed schema planning for MVP; not in `schema.prisma` yet. |
| **Unresolved mechanics** | Needs explicit decision before schema generation. |
| **Exploratory** | Optional later; not mandatory until promoted. |

---

## 1. Schema planning philosophy

**Planned**

- **Operational clarity first:** Model names, field names, and relationship naming reflect **domain vocabulary** (`booking`, `supplier`, `vehicle`, `finalBill`)—not generic ORM patterns (`entity`, `object`, `data`).
- **Financial integrity first:** Quote snapshots, bill lines, payment records, and settlement rows are **immutable** or **append-only** by model design—no `updatedAt` on immutable financial facts where inappropriate.
- **Normalized where operationally valuable:** Separate tables for operational entities with **high query/filter needs** (vehicles, drivers, bookings); **JSON columns acceptable** for low-query snapshot details or flexible event payloads.
- **Avoid premature over-normalization:** **Assignment history** may start as separate table or JSON array on booking depending on query patterns—choose based on **MVP operational dashboards**, not speculative analytics.

**Unresolved mechanics**

- Whether to use Prisma **enums** (schema-level) vs **string columns** with runtime validation for lifecycle states.

**Exploratory**

- Prisma **views** for derived aggregates (supplier earnings summaries).

---

## 2. Primary model groups (conceptual tables)

**Planned** — model groups to implement in `schema.prisma`:

### 2.1 Identity & auth module

| Model | Purpose | Key fields (illustrative) |
| --- | --- | --- |
| **Identity** | Auth subject (Better Auth user linkage) | `id` (UUID), `phone`, `email`, `betterAuthUserId`, `verifiedAt`, `createdAt` |
| **CustomerAccount** | Customer marketplace profile | `id`, `identityId`, `status` (active/suspended/…), `createdAt`, `updatedAt` |
| **SupplierAccount** | Supplier marketplace profile | `id`, `identityId`, `businessName`, `status` (pending/active/suspended/rejected), `verificationApprovedAt`, `verificationApprovedBy`, `payoutBankDetails` (JSON), `createdAt`, `updatedAt` |
| **AdminAccount** | Internal operator profile | `id`, `identityId`, `role` (admin-all at MVP), `createdAt` |

**Relationship:** `Identity` 1:0..1 → `CustomerAccount`; `Identity` 1:0..1 → `SupplierAccount`; `Identity` 1:0..1 → `AdminAccount`.

**Unresolved mechanics:** Whether Better Auth tables live in same schema or separate; coordination with Better Auth Prisma adapter migrations.

---

### 2.2 Vehicle module

| Model | Purpose | Key fields (illustrative) |
| --- | --- | --- |
| **Vehicle** | Supplier-owned vehicle inventory | `id`, `supplierId`, `registrationNumber` (unique among non-deleted), `category` (enum), `ageYears`, `ageBucket` (enum: 0-3/3-7/7-12), `fuelType`, `status` (enum: pending/active/inactive/on-trip/suspended/removed), `deletedAt`, `createdAt`, `updatedAt` |
| **Driver** | Supplier-scoped driver roster | `id`, `supplierId`, `name`, `phone`, `licenseNumber`, `status` (enum: pending/active/inactive/suspended/removed), `deletedAt`, `createdAt`, `updatedAt` |

**Relationship:** `SupplierAccount` 1 → N `Vehicle`; `SupplierAccount` 1 → N `Driver`. **No FK** between `Vehicle` and `Driver` (booking-time pairing only).

**Unresolved mechanics:** Computed `ageBucket` vs stored; vehicle `ageYears` derived from `registrationYear` or separate field.

---

### 2.3 Booking module

| Model | Purpose | Key fields (illustrative) |
| --- | --- | --- |
| **Booking** | Central commercial booking aggregate | `id`, `bookingRef` (unique, non-sequential), `customerId`, `supplierId` (nullable until assigned), `status` (enum: requested/assigned/accepted/ready/in-progress/completed/cancelled/closed), `tripStartDate`, `tripEndDate`, `estimatedKm`, `sourceCity`, `destinationCity`, `productType` (enum: one-way/multi-city/round-trip), `cancelledBy`, `cancelledAt`, `createdAt`, `updatedAt` |
| **BookingItinerary** | Trip itinerary details | `id`, `bookingId`, `pickupLocation`, `pickupGeo` (JSON or separate lat/lng), `destinations` (JSON array or normalized rows—**Unresolved**), `routeDistanceKm`, `returnDistanceKm`, `createdAt` |
| **BookingPricingSnapshot** | Immutable pricing at booking time | `id`, `bookingId`, `category`, `ageBucket`, `includedKmPerDay`, `minimumKmPerDay`, `includedDays`, `totalIncludedKm`, `billableKm`, `perKmRate`, `basePrice`, `operationalBundleAmount`, `pricingConfigVersionId`, `snapshotData` (JSON for full detail), `createdAt` |
| **OneWayCorridor** | Admin-configured one-way corridor pricing | `id`, `sourceCity`, `destinationCity`, `vehicleCategory`, `fareAmount`, `routeDistanceKm`, `returnDistanceKm`, `isActive`, `createdAt`, `updatedAt` |
| **AssignmentHistory** | Vehicle+driver assignment timeline | `id`, `bookingId`, `supplierId`, `vehicleId`, `driverId`, `assignedAt`, `replacedAt` (nullable; null = current assignment), `assignedBy` (admin/supplier/system), `createdAt` |
| **TripExecution** | Operational execution facts | `id`, `bookingId`, `startedAt`, `completedAt`, `actualKm`, `actualStartOdometer`, `actualEndOdometer`, `tollLines` (JSON or normalized—**Unresolved**), `parkingLines` (JSON), `extensionsUsed` (JSON), `createdAt`, `updatedAt` |

**Relationship:** `CustomerAccount` 1 → N `Booking`; `SupplierAccount` 1 → N `Booking` (nullable); `Booking` 1 → 0..1 `BookingItinerary`; `Booking` 1 → 0..1 `BookingPricingSnapshot`; `Booking` 1 → N `AssignmentHistory`; `Booking` 1 → 0..1 `TripExecution`.

**Unresolved mechanics:** Whether `TripExecution` is embedded in `Booking` at MVP or separate table; whether itinerary destinations are JSON array or separate `Destination` rows; whether toll/parking lines are JSON or normalized `TollLine` / `ParkingLine` tables.

---

### 2.4 Billing module

| Model | Purpose | Key fields (illustrative) |
| --- | --- | --- |
| **Quote** | Estimated quote at booking time | `id`, `bookingId`, `estimatedTotal`, `lineItems` (JSON), `issuedAt`, `createdAt` |
| **FinalBill** | Authoritative post-trip bill | `id`, `bookingId`, `quoteId` (nullable), `subtotal`, `platformFee`, `totalAmount`, `varianceFromQuote`, `lineItems` (JSON or normalized—**Unresolved**), `issuedAt`, `createdAt` |
| **BillLineItem** (optional normalized) | Line item breakdown | `id`, `finalBillId`, `lineType` (enum: base-package/extra-km/extension/toll/parking/fee), `description`, `quantity`, `rate`, `amount`, `createdAt` |
| **Payment** | Customer payment records | `id`, `bookingId`, `finalBillId` (nullable until bill issued), `amount`, `mode` (enum: online-card/online-upi/cash), `status` (enum: initiated/authorized/captured/failed/refunded), `gatewayOrderId`, `gatewayPaymentId`, `gatewayRefundId`, `createdAt`, `updatedAt` |
| **Refund** | Refund records | `id`, `bookingId`, `paymentId`, `amount`, `reason`, `initiatedBy` (customer/admin/system), `status` (enum: initiated/succeeded/failed), `gatewayRefundId`, `createdAt`, `updatedAt` |
| **SupplierEarning** | Supplier earning per booking | `id`, `bookingId`, `supplierId`, `finalBillId`, `grossAmount`, `commissionAmount`, `netAmount`, `status` (enum: earned/eligible/batched/paid/held), `payoutBatchId` (nullable until batched), `createdAt`, `updatedAt` |
| **PayoutBatch** | Settlement batch | `id`, `batchRef`, `supplierId` (nullable for multi-supplier batches), `cycleStartDate`, `cycleEndDate`, `totalEarnings`, `totalDeductions`, `netPayout`, `status` (enum: draft/pending/paid/cancelled), `paidAt`, `createdAt`, `updatedAt` |
| **CommissionSnapshot** | Commission rules + calculated amounts | `id`, `finalBillId`, `ruleVersionId`, `perKmRate`, `platformFeeFlat`, `calculatedCommission`, `snapshotData` (JSON), `createdAt` |

**Relationship:** `Booking` 1 → 0..1 `Quote`; `Booking` 1 → 0..1 `FinalBill`; `FinalBill` 1 → N `BillLineItem` (if normalized); `Booking` 1 → N `Payment`; `Booking` 1 → N `Refund`; `Booking` 1 → 0..1 `SupplierEarning`; `SupplierEarning` N → 1 `PayoutBatch` (nullable FK until batched); `FinalBill` 1 → 0..1 `CommissionSnapshot`.

**Unresolved mechanics:** Bill line items as JSON vs normalized table; commission snapshot normalization depth; whether `SupplierEarning` is per-booking or aggregated into batch directly.

---

### 2.5 Cross-cutting models

| Model | Purpose | Key fields (illustrative) |
| --- | --- | --- |
| **Upload** | File metadata | `id`, `storageKey`, `mimeType`, `sizeBytes`, `uploadedBy` (UUID → identity), `entityType`, `entityId`, `deletedAt`, `archivedAt`, `createdAt` |
| **DomainEvent** | Append-only audit stream | `id`, `entityType`, `entityId`, `eventType`, `actorType`, `actorId`, `payload` (JSON), `occurredAt`, `recordedAt`, `createdAt` |
| **SupportNote** | Internal notes | `id`, `entityType`, `entityId`, `authorId` (admin), `body`, `createdAt` |

**Relationship:** Polymorphic links via `entityType` + `entityId` (no FK constraints at MVP—query by indexed pair).

**Unresolved mechanics:** Whether `DomainEvent` is partitioned by month; whether `eventType` is enum or string; `occurredAt` vs `recordedAt` business time handling.

---

### 2.6 Admin / config models (deferred to later spec)

| Model | Purpose | Status |
| --- | --- | --- |
| **PricingConfigVersion** | Versioned rate config | **Planned** — detail in future pricing-config schema addendum |
| **PlatformConfig** | Global toggles (payout cycle, refund windows) | **Planned** |

---

## 3. Relationship planning philosophy

**Planned**

- **Stable historical links:** FKs on `Booking`, `FinalBill`, `SupplierEarning`, `AssignmentHistory` **preserve UUIDs** even if related entity is soft-deleted or suspended—no `onDelete: Cascade` on financial paths.
- **No destructive cascades:** Use `onDelete: Restrict` or `onDelete: SetNull` where product allows orphan prevention (e.g. draft rows before commitment).
- **Append-only operational history:** `AssignmentHistory` rows are never deleted; `replacedAt` marks superseded assignments.

**Unresolved mechanics**

- Prisma `onDelete` behavior for `Vehicle` → historical `AssignmentHistory` (prefer `Restrict` or `NoAction`).

**Exploratory**

- Prisma **relation mode** (`foreignKeys` vs `prisma`) for Edge-compatible Postgres.

---

## 4. Booking modeling philosophy

**Planned**

- **Separate itinerary rows:** `BookingItinerary` is a **separate model** linked 1:1 to `Booking`—allows itinerary evolution (amendments) without cluttering `Booking` table with geo columns.
- **Assignment history table:** `AssignmentHistory` is **normalized table** for query needs (admin dashboards, supplier history)—not JSON array on `Booking`.
- **Quote snapshot preservation:** `BookingPricingSnapshot` is **immutable** (no `updatedAt`)—captures sold category, bucket, included km, config version id.
- **Final bill linkage:** `Booking` → `FinalBill` via `finalBillId` (nullable until bill issued); `FinalBill` references `bookingId` + optional `quoteId`.

**Unresolved mechanics**

- Whether `Booking.finalBillId` FK or query via `FinalBill.bookingId` only.

**Exploratory**

- Multi-leg bookings as separate `BookingLeg` children.

---

## 5. Financial modeling philosophy

**Planned**

- **Separate payments:** `Payment` is **normalized table** (not JSON on `Booking`)—supports multiple payment attempts, partial payments, status tracking, gateway refs.
- **Payout batches:** `PayoutBatch` is **aggregate header**; `SupplierEarning` rows have nullable `payoutBatchId` FK until batched.
- **Immutable financial snapshots:** `Quote`, `FinalBill`, `CommissionSnapshot` have **no `updatedAt`** or updates-in-place—corrections via adjustment rows (**Exploratory**) or compensating events.

**Unresolved mechanics**

- Bill line items as JSON on `FinalBill` vs separate `BillLineItem` table—**decision criteria:** if admin needs to query/filter by line type (e.g. "all tolls > X"), normalize; if only display, JSON acceptable.

**Exploratory**

- `BillAdjustment` model for post-issuance credits/debits.

---

## 6. Soft-delete planning philosophy

**Planned**

- **Models with `deletedAt`:** `Vehicle`, `Driver`, `Upload` (operational entities).
- **Models without `deletedAt`:** `Booking`, `Quote`, `FinalBill`, `Payment`, `Refund`, `SupplierEarning`, `PayoutBatch`, `DomainEvent`, `AssignmentHistory`—use **status enums** for terminal states (cancelled, closed, failed).
- **Query default:** Repositories filter `deletedAt IS NULL` for active ops; admin/history queries include soft-deleted with explicit flag.

**Unresolved mechanics**

- Prisma middleware vs manual filter in repositories for `deletedAt`—prefer **explicit repository logic** for clarity.

**Exploratory**

- Global Prisma extension for soft-delete filtering.

---

## 7. Enum planning philosophy

**Planned**

- **Strict operational enums** in Prisma schema for:
  - `VehicleStatus` (pending, active, inactive, on-trip, suspended, removed)
  - `VehicleCategory` (Sedan, Ertiga, KiaCarens, InnovaCrysta, TempoTraveller)
  - `AgeBucket` (ZeroToThree, ThreeToSeven, SevenToTwelve)
  - `BookingStatus` (requested, assigned, accepted, ready, in-progress, completed, cancelled, closed)
  - `PaymentStatus` (initiated, authorized, captured, failed, refunded)
  - `PaymentMode` (online-card, online-upi, cash)
  - `SupplierAccountStatus` (pending, active, suspended, rejected)
  - `PayoutBatchStatus` (draft, pending, paid, cancelled)
  - `SupplierEarningStatus` (earned, eligible, batched, paid, held)
- **Flexible event types:** `DomainEvent.eventType` as **String** (runtime validation)—allows product to add event types without schema migration blocking.

**Unresolved mechanics**

- Prisma enum naming convention (PascalCase vs SCREAMING_SNAKE_CASE); map to TS union types in domain layer.

**Exploratory**

- State machine validation tables.

---

## 8. Indexing planning philosophy

**Planned** — indexes to create with schema:

| Table | Index | Purpose |
| --- | --- | --- |
| `Booking` | `@@unique([bookingRef])` | Public ref lookup |
| `Booking` | `@@index([customerId, status, tripStartDate])` | Customer trip list |
| `Booking` | `@@index([supplierId, status, tripStartDate])` | Supplier ops dashboard |
| `Booking` | `@@index([status, tripStartDate])` | Admin all-bookings list |
| `Vehicle` | `@@unique([registrationNumber])` where `deletedAt IS NULL` (partial—**Unresolved**) | Prevent duplicate active vehicles |
| `Vehicle` | `@@index([supplierId, status])` | Supplier fleet list |
| `Payment` | `@@index([bookingId, status])` | Payment reconciliation |
| `SupplierEarning` | `@@index([supplierId, status, createdAt])` | Supplier earnings list, payout eligibility |
| `PayoutBatch` | `@@index([supplierId, cycleStartDate])` | Supplier batch history |
| `DomainEvent` | `@@index([entityType, entityId, recordedAt])` | Entity audit timeline |
| `AssignmentHistory` | `@@index([bookingId, assignedAt])` | Booking assignment timeline |

**Unresolved mechanics**

- Prisma partial unique index syntax for `deletedAt IS NULL`—may need raw SQL in migration or enforce uniqueness in application layer.

**Exploratory**

- GIN index on `DomainEvent.payload` for admin search.

---

## 9. Transaction-boundary philosophy

**Planned** — services orchestrate transactions; repositories participate:

| Operation | Transaction scope | Models touched |
| --- | --- | --- |
| **Booking creation** | Single transaction | `Booking`, `BookingItinerary`, `BookingPricingSnapshot`, `Quote`, `DomainEvent` |
| **Supplier assignment** | Single transaction | `Booking` (update status), `AssignmentHistory` (insert), `Vehicle` (update status to on-trip), `DomainEvent` |
| **Billing generation** | Single transaction | `FinalBill`, `BillLineItem` (if normalized), `CommissionSnapshot`, `SupplierEarning`, `DomainEvent` |
| **Settlement batching** | Single transaction per batch | `PayoutBatch`, `SupplierEarning` (update status + `payoutBatchId`), `DomainEvent` |
| **Payment capture** | Single transaction | `Payment` (update status), `Booking` (may update payment-related flag), `DomainEvent` |

**Planned — Prisma transaction usage:**

```typescript
// Service layer pseudo-code
await prisma.$transaction(async (tx) => {
  const booking = await bookingRepository.create(tx, data);
  await snapshotRepository.create(tx, snapshotData);
  await eventRepository.append(tx, event);
});
```

**Unresolved mechanics**

- Transaction timeout tuning; retry strategy for serialization failures; nested transaction limits.

**Exploratory**

- Outbox pattern for async notification—separate `NotificationOutbox` table written in same transaction.

---

## 10. Upload / attachment modeling philosophy

**Planned**

- **Metadata in Postgres:** `Upload` table with `storageKey`, `entityType`, `entityId` polymorphic link.
- **Historical preservation:** Linked uploads remain after booking **closed**; soft-delete for mistaken uploads before link; `archivedAt` for retention policy—file deletion in bucket is **policy job**, DB row retained.

**Unresolved mechanics**

- Virus scan status column; separate `UploadEntity` junction table vs polymorphic fields.

**Exploratory**

- Pre-signed upload URL generation tracked in `Upload` (created before file arrives).

---

## 11. Audit / event modeling philosophy

**Planned**

- **Append-only generic events:** `DomainEvent` table with:
  - Polymorphic `entityType` + `entityId`
  - Flexible `eventType` (String)
  - Actor tracking: `actorType` (customer/supplier/admin/system) + `actorId` (UUID)
  - `payload` (JSON) with event-specific detail
  - `occurredAt` (business time) + `recordedAt` (insert time)
- **No updates or deletes** on `DomainEvent` rows at MVP.

**Unresolved mechanics**

- Whether `occurredAt` is separate column or inside `payload`; partitioning strategy.

**Exploratory**

- Separate `FinancialEvent` table for money-specific audit with stronger schema; `OperationalEvent` vs `FinancialEvent` split.

---

## 12. Repository / service interaction philosophy

**Planned**

- **Repository layer:** Owns Prisma client, maps Prisma models ↔ domain types (plain TypeScript objects or domain classes).
- **Service layer:** Calls repositories, orchestrates transactions via `prisma.$transaction`, owns business rules.
- **Transaction passing:** Repositories accept optional `tx` parameter (Prisma transaction client) for participation:

```typescript
// Repository pseudo-interface
interface BookingRepository {
  create(data: CreateBookingData, tx?: PrismaTransactionClient): Promise<Booking>;
  findById(id: string, tx?: PrismaTransactionClient): Promise<Booking | null>;
  update(id: string, data: UpdateBookingData, tx?: PrismaTransactionClient): Promise<Booking>;
}
```

**Unresolved mechanics**

- Whether repositories return Prisma models directly or map to domain types—prefer **domain types** for ORM-agnostic services.

**Exploratory**

- Repository interfaces for test doubles; in-memory repository for unit tests.

---

## 13. Unresolved mechanics (explicit decision points)

**Before schema generation, resolve:**

1. **UUID version:** v4 (random) vs v7 (time-sortable)—impact on index performance and debugging.
2. **Snapshot normalization depth:** Bill line items, toll/parking lines, itinerary destinations—JSON vs normalized tables based on **query patterns** in MVP dashboards.
3. **Better Auth schema coordination:** Same `schema.prisma` with namespaced tables vs separate schema + manual joins.
4. **Event payload structure:** Loosely typed JSON vs strict Prisma JSON type with validation; whether `occurredAt` is top-level column.
5. **Partial unique indexes:** Prisma support for `WHERE deletedAt IS NULL` in unique constraints—may need raw SQL migration.
6. **Enum migration pain:** Prisma enum adds require schema migration—consider `String` + check constraint for frequently-changing enums (e.g. `DomainEvent.eventType`).
7. **Booking.finalBillId FK:** Nullable FK on `Booking` vs query-only via `FinalBill.bookingId`.
8. **Assignment history granularity:** One row per assignment event vs separate rows for vehicle/driver/supplier changes.

---

## 14. Implemented / Planned / Exploratory summary

**Implemented**

- **`prisma/schema.prisma`** — 21 models across identity, vehicle, booking, billing, and cross-cutting concerns; PostgreSQL provider, UUID ids, enums for lifecycle states, indexes for operational queries.

**Planned**

- All model groups in §2 (identity, vehicle, booking, billing, cross-cutting).
- Relationship patterns in §3 (stable FKs, no destructive cascades).
- Soft-delete on operational entities (§6).
- Strict enums for lifecycle states (§7).
- Indexes for operational queries (§8).
- Transaction boundaries per operation (§9).
- Append-only `DomainEvent` audit (§11).

**Exploratory**

- Prisma views for aggregates.
- State machine validation tables.
- GIN indexes on JSON payload.
- Outbox table for async notifications.
- Separate `FinancialEvent` / `OperationalEvent` tables.
- Bill adjustment model.
- Multi-leg bookings.

---

## 15. Migration strategy concepts

**Planned**

- Use **Prisma Migrate** for schema evolution—declarative migrations from `schema.prisma` diff.
- **Baseline migration** when schema is first introduced (empty DB → full schema).
- **Idempotent migrations** for production—test in staging; avoid data-destructive ops without backups.

**Unresolved mechanics**

- Development vs production migration workflow; rollback strategy; migration versioning in CI/CD.

**Exploratory**

- Custom SQL migrations for complex data transforms; shadow database for dev.

---

## 16. Better Auth integration planning

**Planned**

- Better Auth uses its own Prisma adapter; coordinate table names to avoid collisions.
- **Identity model** in Tamaiyyo schema references `betterAuthUserId` (String FK to Better Auth `user` table).
- Better Auth tables: `user`, `session`, `account`, `verification`—may live in same schema or separate namespace.

**Unresolved mechanics**

- Single `schema.prisma` with all tables vs separate Prisma clients; session table ownership.

**Exploratory**

- Unified Prisma client with Better Auth + Tamaiyyo models; Better Auth table prefix (`ba_user`, `ba_session`).

---

## 17. Future schema extensibility considerations

**Planned**

- Additive models (new tables) do not break existing relationships.
- Additive fields (nullable columns) for gradual rollout.
- Additive enum values require schema migration—plan enum evolution carefully (§7).

**Exploratory**

- JSON schema versioning in `payload` fields.
- Column-level encryption for PII (Prisma middleware + DB extensions).

---

## Revision log

| Date | Change |
| --- | --- |
| 2026-05-18 | **FOUNDATION:** Schema planning blueprint—model groups (identity, vehicle, booking, billing, cross-cutting), relationships, soft-delete, enums, indexes, transactions, upload/event modeling, repository boundaries, unresolved mechanics, extensibility. |
| 2026-05-18 | **Implemented:** `prisma/schema.prisma` generated—21 models, 13 enums, core indexes, append-only events, immutable snapshots, soft-delete on operational entities only. |
