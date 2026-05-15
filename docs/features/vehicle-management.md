# Tamaiyyo — vehicle management (inventory & compatibility)

**Maturity:** FOUNDATION  
**Purpose:** Foundational **vehicle inventory** and **compatibility** architecture: how suppliers expose **capacity** to the marketplace, how **physical vehicles** map to **commercial categories** and **age buckets** used in pricing and booking, and how **assignment** respects those rules—without prescribing storage schemas, APIs, or dispatch algorithms.

**Related docs:** [`docs/features/pricing-engine.md`](./pricing-engine.md) (canonical **vehicle categories** and **age buckets** for rate cards), [`docs/features/booking-lifecycle.md`](./booking-lifecycle.md) (supplier/driver assignment groups), **[`docs/features/supplier-operations.md`](./supplier-operations.md)** (onboarding, routing, acceptance orchestration), **[`docs/features/billing-settlement.md`](./billing-settlement.md)** (trip financial inputs tied to odometer/toll actuals), **[`docs/architecture/domain-models/vehicle-domain-model.md`](../architecture/domain-models/vehicle-domain-model.md)** (vehicle entity architecture, booking-time assignment), [`docs/features/auth-rbac.md`](./auth-rbac.md) (admin/supplier philosophy), [`docs/architecture.md`](../architecture.md), [`docs/project/current-state.md`](../project/current-state.md).

**Non-goals (this document):** database schemas, REST/GraphQL contracts, dispatch optimization algorithms, permit/legal compliance checklists, OEM model-year databases.

---

## How to read this spec

| Label | Meaning |
| --- | --- |
| **Agreed** | Inventory or compatibility rule **adopted here** for Tamaiyyo’s marketplace architecture. |
| **Unresolved mechanics** | Requires explicit product/ops decision (or a later addendum) before implementation or customer promise. |
| **Exploratory** | Optional later-phase idea; **not** mandatory until promoted. |

---

## 1. Vehicle-management philosophy

**Agreed**

- **Truth in inventory:** A booking may only be fulfilled by a vehicle that is **eligible** under platform rules for the **sold** commercial category and **age bucket** (and any future dimensions such as fuel type—see `pricing-engine.md`).
- **Supplier accountability:** The **supplier** owns the accuracy of fleet records they expose; the platform provides **verification hooks** and **enforcement** at assignment time—exact enforcement matrix **Unresolved mechanics**.
- **Separation of concerns:** **Inventory** (what exists and is available) is distinct from **dispatch** (which vehicle is chosen for which booking)—this document defines **compatibility and readiness**, not dispatch algorithms.
- **Scalability:** Model supports **single-vehicle** and **multi-vehicle** suppliers without different commercial “laws”; only operational workflows differ.

**Unresolved mechanics**

- Whether **inactive** vehicles (maintenance) are hidden vs visible with a **blocked** assignment flag.

**Exploratory**

- **Leased** or **third-party-owned** vehicles on a supplier’s roster with split liability.

---

## 2. Inventory concepts

**Agreed**

- **Vehicle record:** The atomic unit of inventory is a **registered vehicle** under a supplier (or future org entity): identifiers, mapped **category**, **age bucket**, operational status—**no permanent driver binding** on the vehicle (`vehicle-domain-model.md` §8–9); **storage shape** is **Unresolved mechanics**.
- **Single-vehicle supplier:** Supplier whose effective fleet size for the marketplace is **one** primary vehicle record; assignment and availability workflows are **conceptually simple** but must still pass **compatibility** checks.
- **Fleet supplier:** Supplier with **multiple** concurrent vehicle records; assignment implies choosing **one** eligible vehicle (+ driver) per booking without violating category/age rules.
- **Inventory ownership:** Inventory records are **owned by the supplier organization** in a product sense; the **platform** indexes them for matching, pricing compatibility, and policy enforcement. **Legal title** of the asset is **out of scope** here.

**Unresolved mechanics**

- **Pooling** or **shared inventory** across supplier branches under one legal entity.
- **Platform-supplied** vehicles (rental) vs supplier-owned—if ever introduced.

**Exploratory**

- **Marketplace-wide** vehicle sharing between suppliers (not default).

---

## 3. Vehicle categories (aligned with pricing)

**Agreed**

- Canonical **commercial categories** match **`docs/features/pricing-engine.md` §3** so quotes, bookings, and fulfillment use one vocabulary:
  - **Sedan**
  - **Ertiga**
  - **Kia Carens**
  - **Innova Crysta**
  - **Tempo Traveller** — **placeholder** (same constraints as pricing doc: not sold as finalized until spec + rate cards promoted).

**Unresolved mechanics**

- **Sub-trims** within a category (e.g. variant names) for customer display vs pricing.

**Exploratory**

- Additional categories when pricing-engine adds them.

---

## 4. Vehicle age-bucket concepts (aligned with pricing)

**Agreed**

- Age buckets match **`docs/features/pricing-engine.md` §4** for consistency between **onboarding**, **pricing**, and **assignment**:
  - **0–3 years**
  - **3–7 years**
  - **7–12 years**

**Unresolved mechanics**

- Source of truth for age (**registration year** vs **manufacturing year** vs admin override) and **bucket migration** when a vehicle ages across a boundary mid-contract.

**Exploratory**

- Dynamic re-bucketing on **annual** cron vs **per-trip** evaluation.

---

## 5. Vehicle compatibility philosophy

**Agreed**

- **Booking category compatibility:** A vehicle may fulfill a booking **only if** its mapped **commercial category** is **the same as** or **explicitly allowed as a substitute** for the category sold on the booking—default posture is **strict match** until a formal **substitution matrix** is **Agreed**.
- **Age-bucket compatibility:** The vehicle’s **current** age bucket must satisfy the **minimum quality** implied by the booking’s priced bucket (typically **same bucket or newer**—i.e. younger vehicle allowed for older-bucket sale is **Unresolved mechanics**; “older vehicle than sold” is **not** allowed by default philosophy).
- **Assignment restrictions:** Hard restrictions include **inactive/unverified** vehicles, **category mismatch**, and **incompatible fuel/permit** dimensions once those are active in `pricing-engine.md`—specific rule engine ordering **Unresolved mechanics**.

**Unresolved mechanics**

- Approved **upgrade** paths (e.g. sell Sedan, fulfill with Innova Crysta) and **price adjustment** ownership (customer consent vs supplier absorbs vs platform).

**Exploratory**

- **Downgrade** with refund delta automation.

---

## 6. Onboarding concepts

**Agreed**

- **Registration-year verification:** Supplier provides **registration document year** (or equivalent); used to derive or validate **age bucket** for pricing and compatibility. **Trust model** (self-attested vs verified) is **Unresolved mechanics** beyond “platform may require evidence.”
- **Admin verification:** Admins may **approve**, **reject**, or **flag** vehicle records (and category mappings) per RBAC—audit philosophy aligns with `auth-rbac.md`; **permission names** **Unresolved mechanics**.
- **Category mapping:** Each physical vehicle maps to **exactly one** commercial **category** for the marketplace; ambiguous models require a **deterministic mapping table** or **admin decision**—table ownership **Unresolved mechanics**.

**Unresolved mechanics**

- **Document upload** requirements, **re-verification** cadence, **appeals** when supplier disputes admin mapping.

**Exploratory**

- **OCR** or partner **RTO** integrations for automated year extraction.

---

## 7. Assignment concepts

**Agreed**

- **Fleet assignment workflows:** For fleet suppliers, **assignment** is the business act of binding a **specific vehicle record** (and operational driver) to a booking—may be manual, rule-assisted, or future optimized; **no dispatch algorithm** is specified here.
- **Self-driver workflows:** For **owner-operator** or single-vehicle contexts, the **supplier** and **driver** may be the same person; inventory and driver binding may **collapse** in UX while remaining **separable** in data for scale—**Unresolved mechanics** for identity modeling (see `booking-lifecycle.md`).

**Unresolved mechanics**

- **Reassignment** after acceptance (vehicle swap) and compatibility re-check.
- Whether **pre-assignment** of vehicle before supplier accepts booking is allowed.

**Exploratory**

- **Future availability systems:** calendar-based **capacity**, **geo-fenced** availability, **predictive** readiness—implementation and algorithms **out of scope** for this foundation.

---

## 8. Operational edge-case categories

**Agreed** — categories; **resolution playbooks** mostly **Unresolved mechanics**.

| Category | Description |
| --- | --- |
| **Stale inventory** | Vehicle sold/scrapped but still listed; odometer fraud suspicion. |
| **Bucket drift** | Registration year implies new bucket mid-booking lifecycle. |
| **Category dispute** | Supplier maps vehicle to category A; admin or pricing disagrees. |
| **Double assignment** | Same vehicle record linked to overlapping bookings (time conflict). |
| **Verification lag** | Booking accepted while vehicle still **pending** admin verification. |
| **Substitution pressure** | No eligible vehicle in fleet for sold category at pickup time. |
| **Permit / compliance** | Vehicle lacks required permits for route class—policy **Unresolved mechanics**. |

**Exploratory**

- **Hot standby** vehicles for VIP tiers.

---

## 9. Future extensibility considerations

**Agreed**

- New **categories** and **buckets** remain **additive** with pricing-engine as source of expanded enums.
- **Fuel type**, **seating**, **luggage**, and **EV-specific** attributes attach to vehicle records as optional dimensions when pricing-engine recognizes them—no redesign of “one mapped category” minimum.

**Exploratory**

- **Telematics**-fed odometer and live **health scores** for assignment ranking (still not dispatch-mandatory in this doc).

---

## 10. Relationship to booking and pricing

**Agreed**

- **Booking creation** uses **commercial category + bucket** from `pricing-engine` / customer selection; **driver assignment** (`booking-lifecycle.md` §3) must consume **resolved** vehicle compatibility from this domain.
- **Final billing** category mismatch scenarios are **operational incidents** governed by `booking-lifecycle.md` edge cases and this document’s **compatibility** rules once substitution policy exists.

**Unresolved mechanics**

- **Quote lock** vs **fulfillment vehicle** drift handling (see also `pricing-engine.md` edge cases).

---

## Revision log

| Date | Change |
| --- | --- |
| 2026-05-15 | **FOUNDATION:** vehicle inventory philosophy, single/fleet supplier, ownership, categories, age buckets, compatibility, onboarding, assignment concepts, edge cases, extensibility. |
| 2026-05-16 | Related: **`supplier-operations.md`** for supplier-side onboarding and routing orchestration. |
| 2026-05-17 | Related: **`billing-settlement.md`** for trip financial inputs tied to inventory. |
| 2026-05-18 | Related: **`vehicle-domain-model.md`**; inventory text clarifies booking-time driver pairing only. |

When substitution matrices, verification SLAs, and RBAC for vehicle admin are fixed, add dated rows and consider raising **Maturity** toward `MVP` for covered scope.
