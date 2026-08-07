# Tamaiyyo — pricing engine (architecture & philosophy)

**Maturity:** FOUNDATION  
**Purpose:** Foundational **pricing engine architecture** and **pricing philosophy** for Tamaiyyo’s outstation marketplace: how quotes and final charges are **derived** from **configuration** (not hardcoded app logic), which **dimensions** participate, and how this ties to **booking & billing** (`docs/features/booking-lifecycle.md`). Audience: product, ops, engineering, AI agents.

**Related docs:** `docs/features/booking-lifecycle.md` (extensions, billable km, operational bundle), [`docs/features/vehicle-management.md`](./vehicle-management.md) (fleet inventory, category/age mapping for fulfillment), [`docs/features/supplier-operations.md`](./supplier-operations.md) (supplier billing inputs, payout cadence posture), **[`docs/features/billing-settlement.md`](./billing-settlement.md)** (capture, settlement, commission, refunds), `docs/architecture.md`, `docs/features/auth-rbac.md` (admin change audit philosophy), `docs/project/current-state.md`.

**Non-goals (this document):** rupee formulas, rate tables as committed data, SQL/NoSQL schemas, REST/GraphQL contracts, payment capture timing detail, tax/legal copy.

---

## How to read this spec

| Label | Meaning |
| --- | --- |
| **Agreed** | Rule or structural choice **adopted here** for Tamaiyyo’s pricing approach. |
| **Unresolved mechanics** | Needs an explicit product/ops decision or a future addendum before implementation or customer promise. |
| **Exploratory** | Optional idea; **not** mandatory without promotion to **Agreed**. |

**Launch configuration examples:** Any **numeric** example in this document (e.g. **300 km/day**) is an **operational launch configuration example**—stored in **admin-managed configuration**, versioned, and **changeable**; it is **not** asserted as a permanent platform constant in code.

---

## 1. Pricing philosophy

**Agreed**

- **Transparent pricing:** Customers see **which dimensions** applied (city, vehicle category, age bucket, fuel, trip type, days, included km, extensions, operational bundle) and **why** the total changed—without exposing internal supplier economics unless product later defines that.
- **Predictable pricing:** Same inputs (configuration version + trip inputs) yield the **same quoted outcome** until configuration or policy intentionally changes; surprise charges are limited to **metered** components already disclosed (billable km, operational bundle)—aligned with `booking-lifecycle.md` §7.
- **Configuration-driven pricing:** All customer-visible **rate inputs** (base packages, per-km slabs, extension SKUs, eligibility flags, surge/night **when enabled**) are sourced from **data the platform controls** (admin tooling + optional automation), not embedded as immutable literals in application code.
- **City-aware pricing:** Outstation markets differ by **origin/primary city** (and possibly corridor); the engine must **key** primary rates by **city** (or defined zone) so ops can tune markets independently.
- **Trip-type alignment:** **Round Trip** and **Multi-City** share the **same pricing mode** (tour pricing). **One Way** uses **corridor pricing** (fixed route fare for hotspot drops).

**Unresolved mechanics**

- Whether quotes use **origin-only** city vs **destination-aware** pricing zones.
- **Configuration versioning** at quote time vs at trip completion time (drift handling).

**Exploratory**

- Customer-facing **“why this price”** ML explanations; dynamic competitor-linked pricing.

---

## 2. Pricing dimensions

Dimensions are **inputs** to a quote or final reconciliation. The engine composes them; not every booking uses every dimension.

**Agreed** — dimensions the architecture must support:

| Dimension | Role in pricing |
| --- | --- |
| **City** | Primary geographic key for base tables and eligibility (see §1 city-aware). |
| **Vehicle category** | Canonical **commercial vehicle class** (see §3); maps to capacity, comfort tier, and default included package where applicable. |
| **Vehicle age bucket** | Depreciation / quality adjustment layer on top of category (see §4). |
| **Fuel type** | Cost and availability signal (e.g. petrol / diesel / CNG / EV)—**policy weight** is configuration-driven. |
| **One-way eligibility** | Whether a **one-way** product is offered for the city/category/trip pattern; may **block** or **price** differently from round trip. |
| **Round-trip fallback** | When one-way is ineligible or customer selects round trip, pricing uses the **round-trip** product rules and included packages. |
| **Included kms/day** | Bundled distance entitlement per day that defines the **minimum billable distance**—see §5. |
| **Per-km pricing** | Rate applied to **billable km** (max of actual vs included km). |
| **Extension packages** | Adds **included** time/km envelopes per `booking-lifecycle.md` §6—priced per §7 here. |
| **Surge / night charges** | Optional multipliers or flat adders for **time-of-day** or **demand**—**off by default** at foundation; admin may enable per §8. |
| **Operational bundle** | Bundled operational charge (toll, parking, driver food, halting) computed in backend and shown as a **single total** line item; rate is not shown to customers. |

**Unresolved mechanics**

- **EV** charging or range-based rules for long outstation legs.
- Interaction between **surge** and **supplier payout** (who absorbs).

**Exploratory**

- **Occupancy-based** pricing (seats sold); **seasonal** matrices beyond surge.

---

## 3. Vehicle pricing configuration structure (agreed categories)

**Agreed**

- The platform maintains a **closed set** of **vehicle categories** for pricing and customer selection. Initial **agreed** categories:
  - **Sedan**
  - **Ertiga**
  - **Kia Carens**
  - **Innova Crysta**
  - **Tempo Traveller** — **placeholder category only**: present in configuration schema and admin UI **stub** until seating norms, permits, and rate cards are defined; **must not** be sold as a finalized product without promoting this spec + config.

**Unresolved mechanics**

- Mapping **supplier fleet vehicles** to exactly one category (rules for ambiguous models).
- **Luggage** or **carrier** surcharges as separate dimensions vs bundled in category.

**Exploratory**

- **Luxury sedan**, **coach**, **EV-only** fleet programs.

---

## 4. Age-bucket pricing concepts

**Agreed**

- **Vehicle age** affects perceived quality and maintenance risk; pricing uses **discrete buckets** attached to the **assigned or quoted** vehicle class:
  - **0–3 years**
  - **3–7 years**
  - **7–12 years**

**Unresolved mechanics**

- Whether age is **self-reported by supplier** with audit vs **platform-verified** (registration year).
- Pricing behavior **above 12 years** (blocklist, cap, or admin exception only).

**Exploratory**

- **Odometer-based** wear adjustments in addition to age.

---

## 5. Included-distance philosophy

**Agreed**

- **Baseline anchor:** **300 km per day** is the **default included-distance anchor** for packaged outstation products in initial launch configuration—expressed as **configuration**, not a hardcoded constant in code paths.
- **Multi-day accumulation:** For an **N-day** itinerary, included distance for the **package** is conceptually **N × (per-day included km)** **before** extensions—subject to **day definition** (calendar day vs 24h rolling window) which remains **Unresolved mechanics** and must match `booking-lifecycle.md` once unified.
- **Billable km rule:** **Billable km** equals **max(actual km, included km)** for the booking. If the customer drives fewer km than the included total, they still pay the included total; if they drive more, they pay the higher km.
- **Route distance source:** Estimated route distance is sourced from **Google Maps API**; return distance may be shown to compute usable km for tours.

**Unresolved mechanics**

- Whether partial days (pickup afternoon) use **prorated** included km or **full-day** buckets.
- **Garage-to-garage** vs **customer-point-to-point** distance rules for counting.

**Exploratory**

- **Unlimited km** premium packages for certain categories/cities.

---

## 6. One-way vs round-trip pricing philosophy

**Agreed**

- **One-way** is a **distinct commercial product** where **eligible**: pricing uses **corridor pricing** (admin-configured fixed fare for hotspot routes) rather than a percentage surcharge.
- **Round-trip and multi-city** share the same **tour pricing** model (included km/day, billable km = max(actual, included)).
- **Round-trip fallback:** When one-way is **ineligible** for the selected city/category/route pattern, the customer journey falls back to **tour pricing** and included-km rules **transparently** (clear messaging that product is round trip).
- **Eligibility** is a **first-class output** of the pricing engine (boolean + reason code for ops), not an ad-hoc UI check.

**Unresolved mechanics**

- Whether **forced round-trip** uses symmetric days out/in or customer-chosen return window only.
- **Asymmetric** origin/destination cities for one-way.

**Exploratory**

- **Multi-stop** one-way chains priced as a single configuration object.

---

## 7. Extension pricing concepts

Aligned with **`docs/features/booking-lifecycle.md` §6** (included envelopes); this section owns **pricing architecture** for those SKUs.

**Agreed**

| Extension SKU | Included envelope (commercial, same as booking spec) | Pricing posture |
| --- | --- | --- |
| **8 hr / 80 km** | Adds up to **8 hours** and **80 km** of **included** usage to the extension-eligible portion of the itinerary | Priced as a **named configuration SKU** (amounts in admin config, not code constants). |
| **1 day / 300 km** | Adds **one day** of included usage and up to **300 km** for that extension window | Same: **configuration SKU**; clocking aligned with booking spec once **Unresolved** there is closed. |

**Unresolved mechanics**

- Flat fee vs **derived from** base category rate card; stacking; mid-trip purchase; proration.

**Exploratory**

- Bundled **“comfort stop”** time packs without km.

---

## 8. Admin pricing-management philosophy

**Agreed**

- **Admin-configurable pricing:** Admins (with appropriate RBAC—see `auth-rbac.md`) manage the **rate configuration** that feeds the engine; changes are **auditable** (who/when/what version)—detailed audit event list **Unresolved mechanics**.
- **City-wise configuration:** Rate cards and eligibility matrices are **scoped** by city (or zone) so ops can tune markets without redeploying code.
- **One-way corridors:** Admins maintain **corridor fare** rows for hotspot one-way transfers (source → destination + vehicle category + fixed fare).
- **Future surge / night configuration:** Architecture reserves **optional** dimensions (§2) with **defaults off**; enabling surge/night requires **explicit** admin policy + config rows and customer disclosure rules.

**Unresolved mechanics**

- **Staging vs production** promotion workflow for config; rollback; **A/B** or canary pricing tests.
- Whether suppliers may propose **discounts** within platform bounds.

**Exploratory**

- **Self-serve** supplier rate suggestions with admin approval queue.

---

## 9. Pricing edge-case categories

**Agreed** — categories; **playbooks** largely **Unresolved mechanics**.

| Category | Description |
| --- | --- |
| **Config drift** | Quote used version **V1**; trip completes under **V2**; which version governs final bill components. |
| **Category mismatch** | Customer booked **Sedan**; supplier assigns vehicle that maps to another category or age bucket. |
| **Ineligible one-way** | Customer must switch to round trip or change city/category. |
| **Extension stacking limits** | Too many extensions vs policy caps. |
| **Measurement ambiguity** | Extra km disputes (odometer vs GPS)—pricing outcome depends on adjudication policy, not the engine alone. |
| **Zero or negative totals** | Rounding, coupons, or overrides—requires explicit guardrails. |
| **Surge cap breach** | Regulatory or brand cap on maximum multiplier. |

**Exploratory**

- **Cross-border** toll currency conversion beyond a single domestic market assumption.

---

## 10. Future extensibility considerations

**Agreed**

- New **vehicle categories**, **age buckets**, **extension SKUs**, and **dimensions** should be **additive** in configuration schema (avoid breaking existing quotes’ interpretability).
- Engine should support **multiple active configuration versions** for reproducibility (exact storage pattern **Unresolved mechanics**).

**Exploratory**

- **Corporate** contracted rate overlays; **partner API** export of rate cards; **ML** demand forecasting driving surge.

---

## 11. Relationship to booking & billing

**Agreed**

- **Quote-time:** pricing engine produces **transparent line items** and **eligibility** used at `booking-lifecycle` **Booking creation**.
- **Final bill-time:** same dimensional philosophy; **toll/parking** remain **actuals** per `booking-lifecycle.md` §7 unless product adds estimated toll products later.

**Unresolved mechanics**

- Who is **merchant of record** for tax display on line items (`booking-lifecycle.md` already defers commission/GST).

---

## 12. UX & technical notes (non-binding)

**Agreed (UX intent)**

- Customer sees **package + included km + extension SKUs** before pay/hold; **billable km** logic shown as a **variable** component explanation, not a hidden footnote.
- Operational bundle is displayed as a **single total line item** (no per-km rate shown in UI).

**Technical notes**

- No **APIs**, **formulas**, or **schemas** in this document; implementation should read **typed configuration** from a dedicated persistence layer in a later spec.

---

## Revision log

| Date | Change |
| --- | --- |
| 2026-05-14 | **FOUNDATION:** pricing philosophy, dimensions, vehicle categories, age buckets, included km baseline & accumulation, one-way/RT, extension SKUs, admin governance, edge cases, extensibility. |
| 2026-05-15 | Related: cross-link **`vehicle-management.md`** for inventory and fulfillment alignment. |
| 2026-05-16 | Related: **`supplier-operations.md`** for supplier settlement and billing-input orchestration. |
| 2026-05-17 | Related: **`billing-settlement.md`** for financial lifecycle beyond rate dimensions. |
| 2026-07-11 | **Updated:** Round-trip and multi-city share tour pricing; one-way uses corridor pricing; billable km = max(actual, included); operational bundle added as a single line item; Google Maps route distance as input. |

When rate-card RBAC, version drift rules, and surge policies are fixed, add dated rows and consider raising **Maturity** toward `MVP` for covered scope.
