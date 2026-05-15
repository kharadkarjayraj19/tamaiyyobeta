# Tamaiyyo — supplier operations (marketplace workflow architecture)

**Maturity:** FOUNDATION  
**Purpose:** Foundational **supplier operational workflow** architecture: onboarding, routing to suppliers, acceptance, assignment coordination, accountability, availability, payout/settlement posture, billing inputs, visibility, and support—**startup-friendly** and **server-truth aligned**, without dispatch algorithms, persistence schemas, or API contracts.

**Related docs:** [`docs/features/booking-lifecycle.md`](./booking-lifecycle.md) (lifecycle groups, cancellation/billing philosophy), [`docs/features/vehicle-management.md`](./vehicle-management.md) (inventory, compatibility, vehicle/driver assignment concepts), [`docs/features/pricing-engine.md`](./pricing-engine.md) (categories, rate configuration), **[`docs/features/billing-settlement.md`](./billing-settlement.md)** (payout lifecycle, commission architecture, refunds/settlement detail), [`docs/features/auth-rbac.md`](./auth-rbac.md) (admin authority, audit posture), [`docs/architecture.md`](../architecture.md), [`docs/project/current-state.md`](../project/current-state.md).

**Non-goals (this document):** database schemas; REST/GraphQL; dispatch/scoring **algorithms**; exact penalty tables or statutory compliance checklists; **payment-rail integration and ledger schemas** (see **`billing-settlement.md`** boundaries).

---

## How to read this spec

| Label | Meaning |
| --- | --- |
| **Agreed** | Supplier-ops rule or structure **adopted here** for Tamaiyyo’s marketplace architecture. |
| **Unresolved mechanics** | Needs explicit product/legal/ops decision (or a later addendum) before implementation or promise. |
| **Exploratory** | Optional later-phase idea; **not** mandatory until promoted. |

---

## 1. Supplier-operations philosophy

**Agreed**

- **Trust but verify:** Suppliers join through **documented onboarding** with **admin gate** at foundation; fleet and billing inputs remain **verifiable** over time (`vehicle-management.md`, `booking-lifecycle.md` §7).
- **Operational realism:** Early stage favors **manual routing** and **human acceptance** over opaque automation; scale adds **toggles** and tooling, not undefined black-box dispatch.
- **Single accountability chain:** For a given booking, **one supplier** holds operational responsibility at a time after acceptance (until handoff or cancellation)—see §4.
- **Aligned vocabulary:** Owner-driver vs fleet models map to **`vehicle-management.md`** single-vehicle vs fleet inventory; pricing categories remain per **`pricing-engine.md`**.

**Unresolved mechanics**

- **Multi-branch** supplier orgs (dispatchers in different cities).

**Exploratory**

- **Franchise** or white-label partner programs.

---

## 2. Supplier onboarding concepts

**Agreed**

- **Manual admin approval:** New supplier accounts (or orgs) require **admin approval** before they may receive **routed bookings** or appear as **active** in marketplace operations—exact RBAC matrix **Unresolved mechanics**.
- **Pending verification state:** Suppliers (and optionally individual vehicles) can sit in a **pending** posture while documents are reviewed; **pending** suppliers do not receive new routed bookings unless policy explicitly allows an exception—**exceptions** **Unresolved mechanics**.
- **Required documents (categories, not a legal checklist):** Onboarding collects **categories** of evidence the platform needs to operate safely and to pay partners: **identity/authorization for signatories**, **business existence** (where applicable), **payout banking**, and **per-vehicle registration** inputs aligned with **`vehicle-management.md` §6**—specific **field lists** and **regulatory labels** are **Unresolved mechanics** (product + legal).

**Unresolved mechanics**

- **Re-verification** cadence; **offboarding** and data retention handoff.

**Exploratory**

- **Risk-scored** fast-track onboarding for known partners.

---

## 3. Supplier operational models

**Agreed**

- **Owner-driver supplier:** Maps to **single-vehicle** (or effectively single-active-vehicle) inventory per `vehicle-management.md`; supplier often **collapses** with primary driver operationally; assignment UX may simplify but **compatibility rules** still apply.
- **Fleet supplier:** Maps to **multi-vehicle** inventory; dispatcher/owner may assign vehicle + driver per booking; **internal roles** **Unresolved mechanics** (see `booking-lifecycle.md` §2).

**Exploratory**

- **Hybrid** fleet + owner-driver on one org with separated P&L.

---

## 4. Booking routing concepts

**Agreed**

- **Manual routing:** At foundation, **operations/admin or supplier-facing workflow** determines **which supplier** is offered or attached to a booking opportunity—**no automated dispatch algorithm** is specified here.
- **Future auto-routing toggle:** Architecture reserves a **configuration flag** (per market or global) to enable **assisted or automatic** supplier selection later; behavior remains **policy-driven** and **auditable** when enabled—**algorithm** and **success metrics** **Exploratory**.
- **One-supplier-at-a-time routing:** A booking **opportunity** (request awaiting supplier) is routed to **at most one supplier** at a time for acceptance; if declined or timed out, it may advance to the **next** supplier per ops rules—**concurrent multi-supplier auction** is **Exploratory**, not default.

**Unresolved mechanics**

- **Timeout** values and **ordering** of supplier lists (manual priority vs geography).

**Exploratory**

- **Broadcast** to limited pool with first-accept-wins (still not multi-parallel acceptance without explicit future spec).

---

## 5. Booking acceptance / rejection philosophy

**Agreed**

- **Acceptance** means the supplier **commits** to fulfill under the sold commercial terms (category, package, extensions as priced) subject to **vehicle/driver assignment** completing before trip start (`booking-lifecycle.md` §3).
- **Rejection** is a **valid** supplier outcome: must be **reason-coded** for ops (capacity, category mismatch, route risk, etc.)—code list **Unresolved mechanics**; customer impact (re-route vs cancel) follows **`booking-lifecycle.md`** edge-case posture.
- **No silent acceptance:** System transitions require explicit supplier action or **documented** admin override (`auth-rbac.md` audit philosophy).

**Unresolved mechanics**

- **Partial accept** (e.g. different vehicle category with customer consent flow).

**Exploratory**

- **Auto-decline** rules when inventory clearly ineligible.

---

## 6. Supplier accountability philosophy

**Agreed**

- **Cancellation penalties:** Supplier-initiated or supplier-fault cancellations after commitment may incur **contractual or platform policy penalties** (fees, strikes, payout holds)—**numeric schedules and jurisdiction-specific rules** are **Unresolved mechanics**; philosophy aligns with customer restitution bias in `booking-lifecycle.md` §8.
- **Suspension concepts:** Platform may **suspend** routing, acceptance, or payouts for **trust/safety/fraud** reasons—**criteria, duration, appeal** **Unresolved mechanics**; must be **admin-governed** and **auditable**.

**Exploratory**

- **Performance scoring** affecting routing priority (not dispatch math in this doc).

---

## 7. Assignment workflows

**Agreed**

- **Vehicle assignment** and **driver assignment** concepts and compatibility are defined in **`vehicle-management.md`** §7 and **`booking-lifecycle.md` §3**; supplier operations **orchestrates** who performs them (supplier staff vs owner-driver) and **deadlines**.
- **Assignment deadlines:** The platform defines **time windows** by policy within which vehicle+driver must be bound before trip start—**exact durations** **Unresolved mechanics**; missed deadlines trigger **reassignment or escalation** categories (§14).
- **Reassignment windows:** **Before trip start**, reassignment of vehicle and/or driver is allowed **within policy** and compatibility rules; **after start**, changes are **exception paths** (breakdown, safety)—**narrowing/ widening** of windows **Unresolved mechanics**.

**Exploratory**

- **Suggested** vehicle/driver pairs (UI assist only, no mandatory optimizer here).

---

## 8. Admin operational authority concepts

**Agreed**

- **Override authority:** Admins may override **supplier blockers** (e.g. force-accept routing, force-cancel) **only** under RBAC with **mandatory audit** (align `auth-rbac.md` high-impact admin posture).
- **Reassignment authority:** Admins may re-point a booking to a **different supplier** or **approved substitute** in **exception** scenarios—customer notification and billing adjustment ownership **Unresolved mechanics**.
- **Operational intervention:** Holds, manual completion, dispute-driven credits—**catalog of interventions** and **dual-control** needs **Unresolved mechanics**.

**Exploratory**

- **Read-only** support impersonation with session labeling (see `auth-rbac.md` impersonation exploratory posture).

---

## 9. Supplier availability concepts

**Agreed**

- Suppliers declare **availability signals** the platform can use for routing gating (e.g. **accepting new trips**, **city/zone**, **date ranges**)—**shape and granularity** **Unresolved mechanics**.
- Availability is **not** a substitute for **per-booking acceptance** at foundation unless a future policy explicitly merges them.

**Exploratory**

- **Calendar integration** and **predictive** capacity from history (no algorithms in this doc).

---

## 10. Supplier payout philosophy

**Agreed**

- **Configurable settlement cycles:** Supplier cashflow uses **configurable** settlement periods (e.g. weekly/biweekly) as **admin-controlled parameters**, not hardcoded constants—exact calendars **Unresolved mechanics**.
- **Admin-controlled payout schedules:** Admins can adjust **batch timing**, **holds**, and **minimum payout thresholds** within policy—**who may edit** and **approval workflow** **Unresolved mechanics**; aligns with `booking-lifecycle.md` platform vs supplier line-item split (still unresolved there).

**Exploratory**

- **Instant** or **daily** payout for trusted tiers.

---

## 11. Supplier billing interaction concepts

**Agreed**

- **Customer / driver km confirmation:** Trip distance for **extra km** may require **supplier-reported** odometer/GPS milestones and optional **customer acknowledgement**—who must confirm and dispute timing **Unresolved mechanics** (`booking-lifecycle.md` measurement disputes).
- **Toll / parking entry:** Suppliers (or drivers via supplier) enter **actuals** with **evidence** per `booking-lifecycle.md` §7; platform rules define **validation** depth **Unresolved mechanics**.
- **Mismatch / dispute handling categories:** At minimum: **reading dispute**, **missing receipt**, **route deviation**, **extension disagreement**, **wrong category fulfillment**—playbooks **Unresolved mechanics** (link to §14).

**Exploratory**

- **OCR** for toll receipts.

---

## 12. Supplier visibility philosophy

**Agreed**

- Suppliers should see **their** operational universe: **bookings** assigned or offered, **earnings** summaries tied to completed trips, **invoices** or statements as the product defines them, and **settlement reports** per payout batch—**exact report fields** **Unresolved mechanics**.
- **Sensitive customer PII** is **minimized** to what fulfillment requires—field-level rules **Unresolved mechanics** (`auth-rbac.md` PII posture).

**Exploratory**

- **Benchmarking** against anonymized market aggregates.

---

## 13. Support / dispute operational concepts

**Agreed**

- **Tiered response:** Supplier-initiated and customer-initiated issues flow through **support** with **escalation** to ops/admin when money or safety is involved.
- **Disputes** bind together **booking state**, **billing inputs** (§11), and **policy**—single **case** object in implementation is **Unresolved mechanics** but architecturally desirable.

**Unresolved mechanics**

- **SLA** for first response; **after-hours** coverage.

**Exploratory**

- **In-app** mediation chat with audit export.

---

## 14. Operational edge-case categories

**Agreed** — categories; **resolution playbooks** mostly **Unresolved mechanics**.

| Category | Description |
| --- | --- |
| **Routing deadlock** | No supplier accepts within required ops window. |
| **Post-accept inventory loss** | Vehicle wrecked or suspended between accept and start. |
| **Driver no-show** | Assigned driver unavailable at pickup. |
| **Late assignment** | Missed §7 deadlines. |
| **Billing input lag** | Trip complete but tolls/kms not entered in time for settlement batch. |
| **Payout hold conflicts** | Dispute open while settlement batch due. |
| **Admin override backlash** | Supplier contests forced reassignment. |

**Exploratory**

- **Automated** goodwill credits below a threshold.

---

## 15. Future extensibility and cross-reference boundaries

**Agreed — extensibility**

- Additive **routing modes**, **onboarding document types**, and **intervention types** should not break the **one-supplier-at-a-time** default narrative unless explicitly versioned.
- **RBAC** for every new supplier/admin action should map to `auth-rbac.md` patterns when implemented.

**Exploratory**

- **API** for large fleet TMS sync; **multi-market** supplier home bases.

**Agreed — document boundaries**

- This spec **owns** supplier-side **operational workflow architecture**; **`booking-lifecycle.md`** owns **end-to-end booking state groups**; **`vehicle-management.md`** owns **inventory and compatibility**; **`pricing-engine.md`** owns **rate dimensions**; **`billing-settlement.md`** owns **financial lifecycle** (capture, settlement, payout, commission/refund architecture)—implementations must not contradict these splits.

---

## Revision log

| Date | Change |
| --- | --- |
| 2026-05-16 | **FOUNDATION:** supplier ops philosophy, onboarding, models, routing, acceptance, accountability, assignment orchestration, admin authority, availability, payout, billing inputs, visibility, support, edge cases, extensibility. |
| 2026-05-17 | Related **`billing-settlement.md`**; non-goals and document boundaries updated for financial scope. |

When RBAC matrices, routing timeouts, and penalty schedules are fixed, add dated rows and consider raising **Maturity** toward `MVP` for covered scope.
