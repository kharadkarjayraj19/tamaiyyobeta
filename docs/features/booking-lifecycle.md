# Tamaiyyo — booking lifecycle (marketplace operations)

**Maturity:** FOUNDATION  
**Purpose:** First **authoritative operational specification** for how an outstation cab **booking** moves from intent through assignment, execution, billing, and closure—including extensions, pass-through charges, and cancellation/refund **philosophy**. Audience: product, operations, engineering, and AI agents implementing marketplace behavior.

**Related docs:** `docs/architecture.md` (roles/routing), **`docs/architecture/domain-models/booking-domain-model.md`** (booking vs trip execution entities, snapshots, assignment history), `docs/features/auth-rbac.md` (identity/RBAC philosophy—**not** booking permissions until extended here), `docs/features/app-shell.md`, `docs/features/design-system.md`, **[`docs/features/pricing-engine.md`](./pricing-engine.md)** (quotes, dimensions, configuration—feeds booking creation), **[`docs/features/vehicle-management.md`](./vehicle-management.md)** (inventory, category/bucket compatibility for assignment), **[`docs/features/supplier-operations.md`](./supplier-operations.md)** (supplier routing, acceptance, onboarding ops), **[`docs/features/billing-settlement.md`](./billing-settlement.md)** (payment capture, settlement, payout architecture), `docs/project/current-state.md`.

**Non-goals (this document):** database schemas, API contracts, payment-gateway integration, legal/tax language, exact rupee formulas not stated below, pixel-level UX flows, or **granular supplier onboarding steps** (see **`supplier-operations.md`**); **detailed financial state machines** (see **`billing-settlement.md`**).

---

## How to read this spec

Throughout this file, rules and statements are labeled:

| Label | Meaning |
| --- | --- |
| **Agreed** | Operational rule or structure **adopted in this specification** for Tamaiyyo’s marketplace lifecycle. |
| **Planned but unresolved** | Direction is acknowledged; **specific mechanics, thresholds, or ownership** must be decided before implementation or customer-facing promise. |
| **Exploratory** | Optional later-phase idea; **do not implement** as mandatory behavior without promoting to **Agreed** or **Planned**. |

---

## 1. Lifecycle philosophy

**Agreed**

- A **booking** is the central commercial object: it ties **customer demand**, **supplier capacity**, **driver execution**, and **financial settlement** over time.
- Lifecycle is **sequential in intent** (creation → fulfillment responsibility → on-road execution → money movement → terminal states) but may allow **controlled parallelism** in implementation (e.g. pre-assign driver while supplier still confirming)—**orchestration details** are **Planned but unresolved**.
- **Server-authoritative state** for anything affecting money or duty of care: client UI reflects state; it does not own it (aligned with `docs/features/auth-rbac.md` server-first posture; booking state is domain-level, not auth-session).
- **Auditability:** transitions that change obligation, risk, or money should be attributable to an **actor** (human or system policy) and timestamped in implementation—exact event catalog **Planned but unresolved**.

**Planned but unresolved**

- Whether a single booking supports **partial fulfillment** (e.g. split legs) or is strictly **one contiguous trip contract**.
- **Idempotency** and retry semantics for external systems (payments, maps)—capture in a later technical addendum when integrations exist.

---

## 2. Involved actors

**Agreed**

| Actor | Role in the booking lifecycle |
| --- | --- |
| **Customer** | Creates and manages **their** booking intent (dates, route class, package selection, extensions where offered); receives trip and billing outcomes; initiates or requests cancellation per policy. |
| **Supplier** | Marketplace **partner** who accepts or declines assignment, supplies vehicle/driver capacity, and is accountable for **operational delivery** against the agreed booking contract. |
| **Driver** | Executes the **on-ground trip** (vehicle movement, customer contact on trip, odometer/time discipline). May be employed/contracted by the supplier; not assumed to be a separate Tamaiyyo **product role** in the web app on day one. |
| **Admin** | Platform operator for **exception handling**, policy enforcement, dispute support, and configuration that affects lifecycle rules—within RBAC yet to be mapped to this feature. |

**Planned but unresolved**

- Whether **driver** has a dedicated login, app surface, or only supplier-mediated communication.
- **Sub-actors** (supplier dispatcher vs owner vs driver lead) and delegation.

**Exploratory**

- Third-party **fleet integrators** or brokers as additional actor types.

---

## 3. Lifecycle state groups

State **groups** are stable buckets; **fine-grained states** inside each group (enum names, substates) are **Planned but unresolved** until an implementation pass defines them without contradicting this document.

**Agreed — group definitions**

1. **Booking creation** — Customer (or admin-on-behalf, if ever allowed) defines trip parameters and commits to a **booking request** or **confirmed booking** per product mode. Output: a record in a **pre-assignment** posture with clear **included** package terms (kms/days/hours as sold).
2. **Supplier assignment** — Marketplace matches the booking to a **supplier**; supplier **accepts** operational responsibility or rejects/reassigns per policy. Output: supplier is the accountable party for fulfillment unless platform re-routes.
3. **Driver assignment** — Supplier (or platform policy) binds a **driver** and vehicle to the booking. Output: trip is **executable** with identifiable driver/vehicle for ops and safety.
4. **Trip execution** — Vehicle is deployed; **start**, **in-progress**, and **completion** (including extensions and actuals capture) live here. Output: auditable trip facts for billing.
5. **Billing & settlement** — Reconciliation of **package**, **extra kms**, **extensions**, and **pass-through actuals** into charges/credits; allocation between customer, supplier, and platform **fee** model is **Planned but unresolved** at line-item level.
6. **Cancellation / refund** — Terminal paths when the trip does not complete as originally sold; governed by **philosophy** in §8, not by unstated numeric tables.

**Planned but unresolved**

- Explicit **substates** and which groups allow **backward** transitions (e.g. driver swap before start only).
- **No-show** classification (customer vs supplier vs driver) and default obligations.

---

## 4. High-level state transition concepts

**Agreed**

- Transitions are **triggered** by: **customer actions**, **supplier actions**, **driver/supplier-reported milestones** (subject to verification policy), **admin actions**, **time-based policies**, or **system guards** (e.g. payment authorization outcome).
- **Forward progress** is the default narrative; **rollback** of state (other than cancellation/refund paths) is exceptional and must be **admin- or policy-governed**, not silent.
- **Terminal states** include at minimum: **completed**, **cancelled** (with refund outcome bucket), and **aborted / voided** (platform-initiated, rare)—exact naming **Planned but unresolved**.

**Planned but unresolved**

- Whether **supplier assignment** can revert to **open pool** after acceptance under which conditions.
- **Concurrent** supplier and driver assignment workflows for high-throughput markets.

**Exploratory**

- **Machine-suggested** transitions (auto-assign) with human override.

---

## 5. Transition ownership concepts

**Agreed**

- Each **meaningful transition** has a conceptual **owner**: the actor or policy class that may **initiate** it and the actor that **confirms** it if confirmation is part of the rule.
- **Customer-owned:** creation request; payment authorization where applicable; customer-initiated cancellation within published windows.
- **Supplier-owned:** accept/decline assignment; assign/reassign driver before start; report operational exceptions tied to fleet.
- **Driver-owned (operational):** start/end trip signals tied to physical execution (mediated by supplier app/process if no driver login).
- **Admin-owned:** overrides, goodwill refunds, fraud holds, manual completion corrections—always **logged**.

**Planned but unresolved**

- Whether platform **auto-accepts** supplier on behalf after timeout.
- Split ownership when **customer** and **supplier** disagree on trip completion time.

---

## 6. Extension concepts

Extensions consume **additional time and/or distance** beyond the base package. Two **named extension packages** are part of Tamaiyyo’s **commercial vocabulary**:

**Agreed**

| Extension type | Included envelope (operational definition) |
| --- | --- |
| **8hr / 80 km extension** | Adds up to **8 hours** and **80 km** of included usage to the booking’s extension-eligible portion, subject to the same **actual vs included** reconciliation philosophy as the base package (§7). |
| **1 day / 300 km extension** | Adds **one calendar-day equivalent** of included usage and up to **300 km** of included distance for that extension window—exact clocking (calendar day vs rolling 24h) is **Planned but unresolved**. |

**Planned but unresolved**

- **Purchase timing:** only at booking vs also mid-trip; proration; stacking multiple extensions.
- **Pricing mechanics** for each extension (flat vs derived from base rate card).
- **Odometer/GPS** dispute handling and tolerance bands.

**Exploratory**

- Hourly extensions without km bundle; km-only top-ups.

---

## 7. Final billing philosophy

**Agreed**

- Final bill is composed from: **(a)** contracted **included** kms/days/hours (base + any **Agreed** extensions), **(b)** **extra kms** (usage above included distance, measured per policy), **(c)** **toll and parking actuals** (pass-through to customer based on **verified actuals**, not markup in this philosophy unless product later adopts a different policy).
- **Included kms/day** (and hour windows where relevant) define what the customer **pre-pays or holds authorization against**; **extra kms** are **variable** post-trip components tied to measured distance.
- **Toll/parking actuals** require **evidence discipline** (receipts, FASTag logs, or supplier attestation rules)—specific evidence rules **Planned but unresolved**.

**Planned but unresolved**

- Platform **commission**, GST presentation, rounding, and invoice issuer (platform vs supplier).
- Whether **extra kms** use a single global rate table, supplier-specific table, or dynamic surge.
- Currency, holds, captures, and failed payment retry—payment **feature** spec to follow.

**Exploratory**

- Subscription or wallet models; bundled insurance.

---

## 8. Cancellation / refund philosophy

**Agreed**

- Cancellations are **time- and actor-dependent**: **who** cancels and **when** relative to trip start and supplier readiness determines **fee vs full vs partial** refund buckets—numeric schedules are **Planned but unresolved**.
- **Customer convenience** cancellations should be **predictable** (published windows); **supplier/driver failure** should bias toward **customer restitution** unless customer caused the failure.
- **Pass-through actuals** already incurred (tolls paid, parking) may be **non-refundable** or partially refundable per policy—**Planned but unresolved**.
- Refunds should **trace** to original payment instrument where regulation and partners allow—implementation **Planned but unresolved**.

**Planned but unresolved**

- Force majeure, medical emergencies, and **admin discretionary** refunds.
- **Chargeback** interaction with booking state.

**Exploratory**

- Credits / coupons as alternative to cash refund.

---

## 9. Operational edge-case categories

**Agreed** — categories exist; **resolution playbooks** are mostly **Planned but unresolved**.

| Category | Description |
| --- | --- |
| **Assignment failure** | No supplier or no driver available by cutoff; customer communication and refund path. |
| **Mid-trip disruption** | Breakdown, accident, customer request to end early; partial billing and safety. |
| **Measurement disputes** | Odometer vs GPS vs customer claim on kms or extension eligibility. |
| **Payment failure** | Authorization decline after booking creation; hold vs cancel. |
| **Policy conflicts** | Terms version at booking vs at trip date; extension stacked incorrectly. |
| **No-show / wrong party** | Customer or driver not present at agreed pickup. |

**Exploratory**

- Multi-day **overnight** driver rest rules and billing implications.

---

## 10. Future extensibility considerations

**Agreed**

- Lifecycle groups should tolerate **new substates** and **additional extension SKUs** without renaming core groups.
- **Permission model** for booking actions should eventually align with `docs/features/auth-rbac.md` (named capabilities per role)—specific permission strings for booking are **Planned but unresolved**.

**Exploratory**

- Multi-city **legs**, **round-trip** packages with asymmetric days, **corporate** billing entities, **API** for partner TMS integration.

---

## 11. RBAC and technical notes (placeholder)

**Planned but unresolved**

- Mapping of booking transitions to **permissions** (`booking:*`, `supplier.trip:*`, `admin.booking:*`, etc.) and audit events.
- Which surfaces (customer/supplier/admin) expose which transitions.

**Technical notes (non-binding)**

- This spec intentionally avoids **APIs and schemas**; a future addendum may define idempotent commands per transition.

---

## UX flows (high level)

**Agreed**

- **Customer:** discover terms → configure trip and extensions → submit booking → receive assignment and trip updates → review final bill.
- **Supplier:** see eligible bookings → accept/decline → assign driver → monitor execution → confirm completion inputs for billing.
- **Driver:** execute trip per supplier process; milestone reporting as policy defines.
- **Admin:** intervene on exceptions per RBAC.

**Planned but unresolved**

- Exact screens, notifications, and offline behavior.

---

## Revision log

| Date | Change |
| --- | --- |
| 2026-05-14 | **FOUNDATION:** initial booking lifecycle operational spec (actors, state groups, transitions, ownership, extensions 8h/80km & 1d/300km, billing/cancel philosophy, edge-case categories, extensibility). |
| 2026-05-14 | Related: cross-link **`docs/features/pricing-engine.md`** for configuration-driven quotes and dimensions. |
| 2026-05-15 | Related: cross-link **`docs/features/vehicle-management.md`** for fleet inventory and assignment compatibility. |
| 2026-05-16 | Related: **`supplier-operations.md`**; non-goals defer granular onboarding there. |
| 2026-05-17 | Related: **`billing-settlement.md`**; non-goals defer detailed financial state machines. |
| 2026-05-18 | Related: **`docs/architecture/domain-models/booking-domain-model.md`** (entity architecture). |

When numeric policies, RBAC matrices, or payment integration land, add dated rows and consider raising **Maturity** toward `MVP` for covered scope.
