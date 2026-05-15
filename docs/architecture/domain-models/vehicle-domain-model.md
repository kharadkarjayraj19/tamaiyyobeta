# Tamaiyyo — vehicle domain model (inventory entity architecture)

**Maturity:** FOUNDATION  
**Purpose:** Foundational **vehicle inventory** entity architecture: how **vehicles** exist on the platform, how they relate to **suppliers** and **drivers**, and how **booking-time assignment** works—**without** permanent vehicle–driver linkage, database schemas, APIs, or dispatch algorithms.

**Related docs:** [`docs/features/vehicle-management.md`](../../features/vehicle-management.md) (compatibility & ops behavior), [`docs/features/pricing-engine.md`](../../features/pricing-engine.md) (categories, age buckets), [`docs/features/booking-lifecycle.md`](../../features/booking-lifecycle.md) (driver assignment group), [`docs/features/supplier-operations.md`](../../features/supplier-operations.md) (fulfillment workflows), [`docs/architecture/domain-models/identity-domain-model.md`](./identity-domain-model.md) (supplier account, separate drivers), [`docs/architecture/backend-architecture.md`](../backend-architecture.md) (`vehicle` module).

**Non-goals (this document):** Prisma models; SQL DDL; route optimization; permit/legal checklists.

---

## How to read this spec

| Label | Meaning |
| --- | --- |
| **Implemented** | Present in repo or binding decision **today**. |
| **Planned** | Agreed entity architecture for MVP; not persisted in application DB yet. |
| **Exploratory** | Optional later; not mandatory until promoted. |

---

## 1. Vehicle-domain philosophy

**Planned**

- **Inventory truth:** A **vehicle record** represents one **registered physical asset** on the platform, owned by a **supplier**, used for **compatibility** (category, age bucket) and **assignment** to trips.
- **Vehicles ≠ drivers:** Vehicles and drivers are **separate** supplier-scoped entities; pairing happens at **booking assignment**, not as a permanent link.
- **Operational realism:** States express **whether a vehicle may be offered** for new assignments and **whether it is committed** to an active trip—not a full telematics model at MVP.
- **Align with pricing:** Category and age bucket on the vehicle record must align with **`pricing-engine.md`** vocabulary.

**Implemented**

- Feature-level compatibility and assignment **philosophy** in `vehicle-management.md`; **no** vehicle entities in code/DB yet.

**Exploratory**

- Telematics-fed odometer as primary distance evidence.

---

## 2. Vehicle identity concepts

**Planned**

- **Registration-number uniqueness:** Each vehicle is keyed by **registration number** (or platform-normalized equivalent) with **global uniqueness** among **non-removed** records—prevents duplicate inventory for the same asset.
- **Historical preservation:** When a vehicle is **removed** or a supplier offboards, **past bookings** remain linked to the **vehicle record id** (and assignment snapshot)—records are not hard-deleted in ways that break audit or billing (`identity-domain-model.md` §9).

**Unresolved mechanics**

- Normalization rules (spaces, state codes); handling **re-registration** or number plate change.

**Exploratory**

- Secondary identifiers (chassis/VIN) for fraud detection.

---

## 3. Vehicle ownership concepts

**Planned**

- **Supplier-owned inventory:** Every vehicle record belongs to exactly **one supplier account**; the platform indexes vehicles for that supplier’s operations.
- **Fleet support:** A supplier may own **many** vehicle records; a **single-vehicle** supplier is the degenerate case (one primary vehicle in normal operation).
- **No cross-supplier sharing:** A vehicle record is not shared between suppliers (marketplace-wide pooling remains **Exploratory** per `vehicle-management.md`).

**Unresolved mechanics**

- Branch/franchise ownership under one legal supplier org.

**Exploratory**

- Platform-leased vehicles assigned to suppliers temporarily.

---

## 4. Vehicle category philosophy

**Planned**

- Each vehicle maps to exactly **one commercial category** from the closed set in **`pricing-engine.md` §3** (Sedan, Ertiga, Kia Carens, Innova Crysta, Tempo Traveller placeholder rules).
- Category drives **quote compatibility** and **fulfillment checks**; changes after bookings exist require **admin governance** if they affect in-flight trips (**Unresolved mechanics**).

**Exploratory**

- Sub-trim labels for display only.

---

## 5. Age-bucket derivation philosophy

**Planned**

- Age bucket is derived from **registration year** (or admin-verified equivalent) per **`pricing-engine.md` §4** buckets: **0–3**, **3–7**, **7–12 years**.
- Bucket is stored on the vehicle record and **re-evaluated** when policy defines (annual vs per-trip—**Unresolved mechanics** with `vehicle-management.md`).
- **Booking snapshot** should capture bucket at sale/assignment time for disputes (§13).

**Unresolved mechanics**

- Vehicles **above 12 years** (block vs exception-only).

**Exploratory**

- Manufacturing year vs registration year precedence.

---

## 6. Vehicle lifecycle states

**Planned — vehicle record states**

| State | Meaning |
| --- | --- |
| **Pending verification** | Submitted by supplier; not assignable until approved. |
| **Active** | Approved and eligible for assignment when readiness rules pass (§7). |
| **Inactive** | Temporarily not offered (maintenance, seasonal pause)—not assignable. |
| **On-trip** | Committed to an **in-progress** booking; not assignable to another concurrent trip. |
| **Suspended** | Platform or policy block (fraud, compliance)—not assignable. |
| **Removed** | Offboarded from active inventory; retained for **history** (§12). |

**Unresolved mechanics**

- Whether **pending** and **inactive** are distinct in UX for suppliers; auto-transition **active** → **inactive** on supplier suspension.

**Exploratory**

- **Retired** vs **removed** legal distinction.

---

## 7. Assignment-readiness philosophy

**Planned**

- A vehicle is **assignment-ready** only when **all** hold:
  - Vehicle state is **active** (not pending, inactive, on-trip, suspended, removed).
  - Owning **supplier account** is **active** (not pending verification / suspended / rejected).
  - Vehicle satisfies **compatibility** with the booking’s sold category/bucket (`vehicle-management.md` §5).
- Readiness is evaluated at **assignment time**; no dispatch scoring in this document.

**Unresolved mechanics**

- Grace period for **pending verification** vehicles on already-accepted bookings.

**Exploratory**

- Readiness includes driver availability in a combined check (still **separate** entities).

---

## 8. Booking-time assignment philosophy

**Planned**

- **Supplier assigns vehicle + driver during booking fulfillment:** For each booking, the supplier (or platform on their behalf) selects **one vehicle record** and **one driver record** to fulfill that trip—this is a **booking-level assignment**, not a property of the vehicle.
- **No permanent driver linkage to vehicle:** The platform does **not** model “this vehicle always has this driver.” Past and future trips may use different driver–vehicle pairs from the same supplier roster.
- **Concurrent trips:** A vehicle in **on-trip** cannot be assigned to another open trip; a driver similarly should not be double-booked (**Unresolved mechanics** for driver states in identity/supplier modules).
- Aligns with `booking-lifecycle.md` **driver assignment** group and `supplier-operations.md` §7.

**Implemented**

- Documented at workflow level in feature specs; **no** assignment persistence yet.

**Exploratory**

- Suggested vehicle–driver pairs in UI (advisory only).

---

## 9. Driver relationship concepts

**Planned**

- **Drivers as separate operational entities:** Drivers are **supplier-scoped** records (contact, license categories, status)—distinct from **vehicle records** and from **supplier login identity** unless product later gives drivers their own auth (`identity-domain-model.md`).
- **Booking-level assignment ownership:** The **assignment** entity (or booking sub-resource) owns the **vehicle id + driver id** pair for that trip; historical assignments remain immutable except via admin correction with audit.
- **Owner-operator:** A person may act as supplier user and be chosen as **driver** on a booking without creating a permanent vehicle↔driver edge.

**Unresolved mechanics**

- Driver lifecycle states (available, on-trip, inactive); license expiry enforcement.

**Exploratory**

- Driver mobile app login linked to driver record id.

---

## 10. Admin verification and override concepts

**Planned**

- **Verification:** Admins approve or reject vehicles in **pending verification**; may **suspend** or move to **removed** for policy violations—audited (`vehicle-management.md` §6).
- **Override:** Admins may correct category/bucket mapping or force state transitions in **exception** cases—never silent; aligns with `supplier-operations.md` §8.

**Implemented**

- Philosophy only; no admin vehicle tooling in repo.

**Exploratory**

- Bulk import with staged verification queue.

---

## 11. Operational availability concepts

**Planned**

- **Vehicle availability** for assignment is primarily expressed through **lifecycle state** (§6) and **assignment-readiness** (§7), not a separate calendar engine at MVP.
- Supplier-level **availability signals** (`supplier-operations.md` §9) may further gate whether new assignments are offered—**Unresolved mechanics** for interaction.

**Exploratory**

- Per-vehicle calendar blocks (maintenance windows).

---

## 12. Historical integrity philosophy

**Planned**

- **Removed** or **suspended** vehicles remain in the datastore for **booking history**, settlement, and disputes.
- **Registration number** uniqueness applies among active inventory; historical records may retain numbers even if a new record is created after re-onboarding—policy **Unresolved mechanics**.

**Exploratory**

- Archival cold storage for old vehicle records.

---

## 13. Booking / pricing snapshot relationship concepts

**Planned**

- When a vehicle is assigned to a booking, capture a **fulfillment snapshot** including at minimum: **vehicle id**, **commercial category**, **age bucket**, and reference to **pricing configuration version** where available—so final billing does not depend on later vehicle edits (`pricing-engine.md`, `billing-settlement.md`).
- **Extra km** and compatibility disputes compare **snapshot** vs **actuals**, not today’s vehicle category if it changed mid-trip.

**Unresolved mechanics**

- Whether snapshot is taken at **booking creation**, **supplier accept**, or **assignment** event.

**Exploratory**

- Immutable snapshot blob per trip leg.

---

## 14. Future extensibility considerations

**Planned**

- New **categories** and **states** are **additive**; **assignment** remains booking-scoped.
- **Fuel type**, **seating**, and permit flags attach to vehicle record when pricing-engine recognizes them.

**Exploratory**

- **Substitute vehicle** matrix at assignment time with customer consent flow.

---

## Entity relationship sketch (conceptual)

```text
Supplier account
  ├──< Vehicle records (lifecycle: pending … removed)
  └──< Driver records   (separate roster; NOT permanently tied to a vehicle)

Booking / trip
  └── Assignment (per booking): exactly one vehicle id + one driver id (snapshot at assign)

Vehicle record ──< historical assignment references (preserved)
Driver record  ──< historical assignment references (preserved)
```

---

## Revision log

| Date | Change |
| --- | --- |
| 2026-05-18 | **FOUNDATION:** vehicle entity architecture; booking-time vehicle+driver assignment; no permanent vehicle–driver linkage. |

When Prisma models are designed, derive from this doc and `vehicle-management.md`; update `identity-domain-model.md` if driver entity ownership details move.
