# Tamayo — booking domain model (order & trip execution architecture)

**Maturity:** FOUNDATION  
**Purpose:** Foundational **booking and trip execution** entity architecture—the **central operational object** for Tamayo: commercial order, itinerary, assignments, execution milestones, payment/billing linkage, cancellation, and audit—without schemas, APIs, or dispatch algorithms.

**Related docs:** [`docs/features/booking-lifecycle.md`](../../features/booking-lifecycle.md) (lifecycle groups & philosophy), [`docs/features/pricing-engine.md`](../../features/pricing-engine.md) (quote dimensions), [`docs/features/supplier-operations.md`](../../features/supplier-operations.md) (routing, acceptance), [`docs/features/billing-settlement.md`](../../features/billing-settlement.md) (payments, final bill workflow), **[`docs/architecture/domain-models/billing-domain-model.md`](./billing-domain-model.md)** (quote, bill, payment, settlement entities), [`docs/architecture/domain-models/identity-domain-model.md`](./identity-domain-model.md) (actors), [`docs/architecture/domain-models/vehicle-domain-model.md`](./vehicle-domain-model.md) (booking-time vehicle+driver assignment), [`docs/architecture/backend-architecture.md`](../backend-architecture.md) (`booking` module).

**Non-goals (this document):** Prisma models; SQL DDL; OpenAPI; penalty/refund numeric tables; map routing algorithms.

---

## How to read this spec

| Label | Meaning |
| --- | --- |
| **Implemented** | Present in repo or binding decision **today**. |
| **Planned** | Agreed entity architecture for MVP; not persisted yet. |
| **Exploratory** | Optional later; not mandatory until promoted. |

---

## 1. Booking-domain philosophy

**Planned**

- **Booking is the hub:** One **booking** ties **customer demand**, **commercial terms**, **supplier fulfillment**, **trip execution facts**, and **financial records**—aligned with `booking-lifecycle.md` §1.
- **Server-authoritative state:** Operational and money-affecting transitions are validated on the **server**; UI is a projection.
- **Audit by default:** Assignment changes, state transitions, cancellations, and admin overrides append to an **operational timeline** (§12).
- **MVP-friendly:** Prefer a **simple persistence shape** that can still express the **logical** booking vs trip split (§2).

**Implemented**

- Lifecycle and actor **philosophy** documented in `booking-lifecycle.md`; **no** booking entities in application data yet.

**Exploratory**

- Multi-leg bookings (split itineraries) as separate booking children.

---

## 2. Conceptual separation: booking vs trip execution

**Planned**

| Layer | Owns (conceptual) | MVP implementation note |
| --- | --- | --- |
| **Booking (commercial / order)** | Customer, itinerary, **pricing snapshot**, extensions sold, payment posture, cancellation, link to **final bill** | May be the **root aggregate** at MVP |
| **Trip execution (operational)** | Supplier accountability window, **assignments**, start/complete milestones, **actual kms**, toll/parking lines, on-trip extensions usage | May be a **child** of booking or **embedded** in the same aggregate at MVP—**one booking : one trip execution** for standard outstation MVP |

**Planned — rules**

- **One contiguous outstation contract** per booking at MVP (`booking-lifecycle.md` partial-fulfillment question defaults to **single trip** until product says otherwise).
- **Trip execution** references the **booking id** always; never orphan execution without commercial context.

**Unresolved mechanics**

- Whether **trip execution** gets its own public id for supplier/driver comms vs internal sub-id only.

**Exploratory**

- Booking **header** with multiple **trip legs** (each leg own execution sub-record).

---

## 3. Booking lifecycle ownership concepts

**Planned — transition ownership** (aligns with `booking-lifecycle.md` §5)

| Concern | Primary owner |
| --- | --- |
| Create / amend itinerary (pre-start) | **Customer** (or **admin** on behalf) |
| Supplier routing / accept / reject | **Supplier** (+ **admin** reroute) |
| Vehicle + driver assignment | **Supplier** |
| Execution milestones (start, complete) | **Supplier** / driver-mediated |
| Cancellation request | **Customer**, **supplier**, or **admin** per policy |
| Financial closure / manual bill | **System** with **admin** fallback (`billing-settlement.md`) |

**Unresolved mechanics**

- Time-based auto-transitions (e.g. expire unanswered routing offers).

**Exploratory**

- System auto-assign supplier when toggle enabled (`supplier-operations.md` §4).

---

## 4. Pricing snapshot philosophy

**Planned**

- At **booking creation** (or at defined commit point—**Unresolved mechanics**), persist a **pricing snapshot** immutable for dispute resolution:
  - **Quoted** commercial **category** and **age bucket** (customer-facing selection)
  - **Included** kms/days/hours and **extension SKUs** purchased
  - **Billable kms** and **per-km rate** used for the quote
  - **Operational bundle** amount (toll/parking/driver food/halting) shown as a single line item
  - **Rate configuration reference** (version id or effective timestamp)—not live config at billing time
  - **Product type** flag with one-way corridor context where applicable
- **Historical pricing integrity:** Later admin edits to city rate cards do **not** rewrite snapshot; **final bill** uses snapshot + **actuals** (`pricing-engine.md`, `vehicle-domain-model.md` §13).
- **Fulfillment snapshot** (vehicle category/bucket at assign) may **supplement** but not replace **sold** snapshot unless substitution policy applies—**Unresolved mechanics**.

**Implemented**

- Philosophy in feature docs; **no** snapshot storage yet.

**Exploratory**

- Customer-visible “price breakdown” blob stored as JSON snapshot.

---

## 5. Itinerary concepts

**Planned**

- **Source:** Pickup origin (city/location text + normalized geo when available)—**normalization** **Unresolved mechanics**.
- **Destinations:** One or more destination stops for outstation intent; MVP likely **primary destination** + optional notes—**multi-stop** **Exploratory**.
- **Route kms:** Planning distance for quote (Google Maps estimate) stored separately from **billable kms** and **final actual kms** (§10).
- **Return kms:** Optional return distance to origin used for **usable km** display in tours where the last stop is not the origin.
- **Trip dates:** Start date (and return date for round-trip); **calendar vs rolling 24h** day boundaries **Unresolved mechanics** (align `pricing-engine.md` / `booking-lifecycle.md`).

**Unresolved mechanics**

- Pickup time vs date-only products.

**Exploratory**

- Corridor templates (e.g. city A ↔ city B packages).

---

## 6. Assignment concepts

**Planned**

- **Supplier assignment:** Booking links to exactly **one accountable supplier account** at a time after acceptance (`supplier-operations.md` one-supplier-at-a-time routing).
- **Vehicle assignment** and **driver assignment:** At fulfillment, supplier assigns **one vehicle id** + **one driver id** per booking/trip—**no permanent vehicle–driver link** (`vehicle-domain-model.md` §8–9).
- **Reassignment support:** Before trip **start**, supplier (or **admin**) may replace supplier, vehicle, and/or driver per policy; each change is a **new assignment record** in history (§12)—not an in-place silent overwrite.
- **Assignment history preservation:** All prior assignment rows remain queryable for audit and disputes.

**Unresolved mechanics**

- Whether **supplier** can change after accept without admin; concurrent **on-trip** vehicle swap (breakdown).

**Exploratory**

- Platform-suggested vehicle/driver pairs (non-binding).

---

## 7. Booking operational states

**Planned — booking-level states** (map to `booking-lifecycle.md` groups; names illustrative)

| State / phase | Group alignment |
| --- | --- |
| **Draft / intent** | Creation (optional—may skip at MVP) |
| **Requested / awaiting supplier** | Creation → supplier assignment |
| **Supplier assigned (pending accept)** | Supplier assignment |
| **Accepted (awaiting vehicle/driver)** | Supplier assignment → driver assignment |
| **Ready for trip** | Driver assignment complete |
| **In progress** | Trip execution |
| **Completed (ops)** | Trip execution closed; billing may still be open |
| **Billing in progress** | Billing & settlement |
| **Closed** | Financially settled or written off |
| **Cancelled** | Cancellation terminal |

**Planned — trip execution substates** (may live inside **in progress**)

- **Started**, **ended** (operational); actuals capture may trail **ended**.

**Unresolved mechanics**

- Combined vs separate state machines in code; **billing in progress** vs **completed** customer-visible labels.

**Exploratory**

- **Paused** execution (safety hold).

---

## 8. Payment relationship concepts

**Planned**

- Booking links to **zero or more payment records** supporting **partial** and **full** settlement (`billing-settlement.md` §2):
  - **Full payment** — obligation met per policy timing
  - **Partial payment** — deposit + balance due milestone
  - **Online** vs **cash** settlement mode flags on booking or payment
- **Multiple payment support:** Architecture allows **several payment attempts/allocations** per booking (retry, split instruments)—allocation rules **Unresolved mechanics**.
- **Billing linkage:** Booking holds reference to **final bill** (or bill id) once generated; payments reconcile against bill totals.

**Implemented**

- None.

**Exploratory**

- Wallet balance applied before card capture.

---

## 9. Cancellation concepts

**Planned**

- **Cancellation state:** Terminal **cancelled** with sub-outcomes for refund bucket (full / partial / fee retained)—numeric rules **Unresolved mechanics** (`booking-lifecycle.md` §8).
- **Cancellation ownership:** Record **who** cancelled (**customer**, **supplier**, **admin**, **system**) and **when** relative to trip start and supplier readiness.
- **Cancellation reason tracking:** Structured **reason code** + optional free text for ops—not required for customer convenience cancels at MVP beyond code list **Unresolved mechanics**.

**Unresolved mechanics**

- Difference between **void** (never started) vs **cancel** (after commit).

**Exploratory**

- Auto-cancel on payment failure with customer notification.

---

## 10. Billing relationship concepts

**Planned**

- **Estimated kms** live on **itinerary / quote** (§5); used for pricing expectation only.
- **Final kms** (and time boundaries) live on **trip execution actuals**—feeds **billable km** per snapshot entitlements (`billing-settlement.md` §5).
- **Final billing linkage:** Booking → **final bill** entity (line items: package, billable km, extensions used, operational bundle, fees)—settlement and payout reference the same bill id.

**Unresolved mechanics**

- Single bill vs revised bill versions; credit notes.

**Exploratory**

- Provisional bill before customer confirmation.

---

## 11. Support / admin operational concepts

**Planned**

- **Support notes:** Internal-only notes attached to booking (author, timestamp, body)—not customer chat replacement at MVP.
- **Admin override authority:** Admins may force state transitions, reassign supplier/vehicle/driver, adjust bills, or cancel—**always audited** (`supplier-operations.md` §8, `billing-settlement.md` manual closure).

**Implemented**

- Philosophy only.

**Exploratory**

- Linked **case** entity for disputes (`billing-settlement.md` §11).

---

## 12. Audit / timeline philosophy

**Planned**

- **Operational event log** (or equivalent) per booking captures at minimum:
  - **State changes** (from → to, actor)
  - **Assignment changes** (supplier / vehicle / driver ids)
  - **Cancellation** and **admin override** markers
  - Key **payment** and **bill** linkage events
- **Reassignment history** is **append-only**; current assignment is derived from latest valid row or denormalized pointer + history.
- Correlation with **Sentry** errors and **PostHog** product events is **orthogonal**—business audit remains in domain store (`backend-architecture.md` §9).

**Unresolved mechanics**

- Retention period; PII in note bodies.

**Exploratory**

- Customer-visible timeline of non-sensitive milestones.

---

## 13. Historical integrity philosophy

**Planned**

- **Booking id** is stable for life of record; **cancelled** and **closed** bookings remain readable to entitled roles.
- **Snapshots** (§4) and **assignment history** (§6) are never mutated in place—corrections add new rows/events.
- **Supplier / vehicle / driver** records may be suspended or removed; booking retains **ids + snapshot** for what was promised and delivered (`identity-domain-model.md`, `vehicle-domain-model.md`).

**Exploratory**

- Anonymize customer PII on closed bookings after retention period.

---

## 14. Future extensibility considerations

**Planned**

- Additive states and event types without renumbering core **closed** / **cancelled** terminals.
- **Extension SKUs** and new payment modes attach via snapshot + line items, not ad-hoc columns only.

**Exploratory**

- **Corporate** booking with cost center; **B2B** approval workflow before supplier routing.

---

## Entity relationship sketch (conceptual)

```text
Customer account
  └──< Booking (commercial root, pricing snapshot, itinerary, status)
        ├──< Trip execution (ops: milestones, actual kms, toll/parking lines)
        ├──< Assignment history[] (supplier, vehicle, driver, effective at)
        ├──< Payment record(s)
        ├──< Final bill (optional until generated)
        ├──< Cancellation record (optional terminal)
        └──< Operational timeline / support notes (admin)
```

---

## Document boundaries

**Planned**

- **`booking-domain-model.md`** owns **booking + trip execution entities** and their relationships.
- **`vehicle-domain-model.md`** owns vehicle/driver **inventory**; **`billing-settlement.md`** owns money **workflow** detail; **`booking-lifecycle.md`** owns **cross-actor operational rules**.

---

## Revision log

| Date | Change |
| --- | --- |
| 2026-05-18 | **FOUNDATION:** booking vs trip execution, snapshots, itinerary, assignments, states, payments, cancellation, billing link, audit, integrity. |
| 2026-07-11 | **Updated:** Route/return km in itinerary; pricing snapshot captures billable km, per-km rate, and operational bundle; one-way corridor context added. |

When schema design starts, reconcile state names with `booking-lifecycle.md` and add MVP implementation note (single aggregate vs split tables).
