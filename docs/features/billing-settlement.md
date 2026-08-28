# Tamayo — billing & settlement (financial workflow architecture)

**Maturity:** FOUNDATION  
**Purpose:** Foundational **billing, settlement, payout, and financial workflow** architecture for Tamayo: how money **moves** relative to trips, who **confirms** operational inputs, how **final bills** are produced, and how **suppliers** are paid—**startup-friendly**, **configuration-friendly**, and **server-truth** aligned. Does **not** define legal relationships, tax filings, or payment-processor contracts.

**Related docs:** [`docs/features/booking-lifecycle.md`](./booking-lifecycle.md) (final bill **composition** philosophy, cancellation/refund posture), **[`docs/architecture/domain-models/billing-domain-model.md`](../architecture/domain-models/billing-domain-model.md)** (financial **entities**: quote, bill, payment, settlement, refund), **[`docs/architecture/domain-models/booking-domain-model.md`](../architecture/domain-models/booking-domain-model.md)** (booking linkage, estimated vs actual kms), [`docs/features/pricing-engine.md`](./pricing-engine.md) (quoted dimensions, rate configuration), [`docs/features/supplier-operations.md`](./supplier-operations.md) (supplier billing inputs, payout cadence posture, disputes escalation), [`docs/features/vehicle-management.md`](./vehicle-management.md) (fulfillment compatibility affecting billing outcomes), [`docs/features/auth-rbac.md`](./auth-rbac.md) (admin authority, audit), [`docs/architecture.md`](../architecture.md), [`docs/project/current-state.md`](../project/current-state.md).

**Non-goals (this document):** database schemas; REST/GraphQL; payment-gateway field mappings; statutory tax positions; accounting ledger schemas; interest on held funds.

---

## How to read this spec

| Label | Meaning |
| --- | --- |
| **Agreed** | Financial or billing rule **adopted here** at architecture level. |
| **Unresolved mechanics** | Requires product/finance/legal/partner decision (or a later addendum) before implementation or promise. |
| **Exploratory** | Optional later-phase idea; **not** mandatory until promoted. |

---

## 1. Billing & settlement philosophy

**Agreed**

- **Quote vs final:** **Pricing** produces a **quote** or authorization baseline (`pricing-engine.md`); **billing** produces the **final** monetary obligation after **trip facts** (km, tolls, parking, extensions used) are captured—aligned with `booking-lifecycle.md` §7.
- **Configuration over code:** Rates, commission structures (when defined), payout cadence parameters, and hold rules are **data-driven** and **admin-tunable**—not hardcoded application constants.
- **Separation of duties:** **Operational entry** (supplier/driver), **customer acknowledgement** where required, **platform calculation**, and **admin exception** paths are **distinct** responsibilities with audit expectations (`auth-rbac.md`).
- **No silent financial moves:** Charges, credits, holds, and releases affecting customers or suppliers should be **explainable** from trip + config + policy state.

**Unresolved mechanics**

- **Merchant of record** per charge type (platform vs supplier vs split); **invoice issuer** naming.

**Exploratory**

- **Multi-currency** display for inbound tourists.

---

## 2. Payment concepts

**Agreed**

- **Full payment:** Customer obligation for the **priced itinerary** (per quote/policy) is satisfied **up front** or per published schedule—exact timing vs trip start **Unresolved mechanics**.
- **Partial payment:** Customer may pay or authorize **a portion** before trip with **balance** due by a defined milestone (e.g. post-trip finalization)—**eligibility**, **amounts**, and **failure handling** **Unresolved mechanics**.
- **Online payment:** Card/UPI/netbanking (or other rails) handled via **integrators**—this document defines **lifecycle hooks** only, not vendor choice.
- **Cash settlement:** Some markets may allow **cash** components (e.g. balance paid in cash, or supplier-collected cash reconciled to platform)—**risk allocation**, **reconciliation**, and **prohibition list by city** **Unresolved mechanics**; architecture must allow **labeling** a trip’s settlement mode without assuming cash is always allowed.

**Unresolved mechanics**

- **Pre-auth vs capture** split for variable final bills; **split payments** across instruments.

**Exploratory**

- **BNPL** or EMI for large outstation totals.

---

## 3. Platform financial flow philosophy

**Agreed**

- **Customer payment collection:** Platform (or designated payment entity) **collects** or **secures authorization** for customer obligations per published payment modes (§2).
- **Tamayo-held funds:** Architecture assumes a **pooling posture** where customer funds for active and recently completed trips may be **held** by the platform (or regulated partner) **until settlement events** clear—**legal characterization** (escrow, nodal, etc.) is **Unresolved mechanics** and requires **professional review** (§13).
- **Supplier payout lifecycle:** **Eligible** trip economics (after commission/fees and holds) move to **payout batches** on **configurable cycles** with **admin controls**—detailed state machine **Unresolved mechanics**; high-level stages: **earned → eligible → batched → paid / held**.

**Exploratory**

- **Instant** supplier draw for trusted tiers.

---

## 4. Final billing workflow

**Agreed**

- **Driver / supplier trip entry:** Operational facts (end odometer readings, time boundaries, toll/parking lines) are **entered** by supplier-mediated processes per `supplier-operations.md` §11—**verification depth** **Unresolved mechanics**.
- **Customer confirmation:** Where policy requires, customer **acknowledges** key trip facts or disputes them within a **window**—window length and **default-if-silent** behavior **Unresolved mechanics**.
- **Bill generation:** System composes **final line items** from `booking-lifecycle.md` §7 components + configured **commission/fees** (§9) and produces a **customer- and supplier-visible** financial artifact—artifact naming (invoice vs receipt) **Unresolved mechanics**.
- **Manual support closure fallback:** If automation cannot close a trip financially (dispute, missing inputs, chargeback), a **support/admin** path may **freeze**, **adjust**, or **write off** per RBAC—always **audited**.

**Unresolved mechanics**

- Whether **bill generation** blocks payout eligibility until customer confirmation completes.

**Exploratory**

- **Automated** low-value dispute resolution under thresholds.

---

## 5. Km-confirmation philosophy

**Agreed**

- **Billable km** depends on **measured** distance vs **included** entitlement (`booking-lifecycle.md`, `pricing-engine.md`); therefore **km confirmation** is a **first-class** billing gate when variable km applies.
- **Trust model:** Prefer **multiple corroborating signals** (odometer, GPS trace, supplier attestation) over a single unverifiable number—weighting **Unresolved mechanics**.
- **Disputes** elevate to §11 categories without blocking entire platform; **hold strategy** on disputed portions **Unresolved mechanics**.

**Exploratory**

- **Photo odometer** + CV-assisted read (policy-gated).

---

## 6. Toll / parking entry philosophy

**Agreed**

- **Bundled operational charge** (toll, parking, driver food, halting) is the MVP default; it is computed by backend and shown as a **single total line item** to customers.
- **Pass-through actuals** may return in later phases; if introduced, it must be **explicitly configured and disclosed**, not silent.

**Unresolved mechanics**

- **FASTag** aggregation vs line-item entry; **currency** for cross-border tolls (if ever).

**Exploratory**

- **Estimated toll** pre-authorization products.

---

## 7. Settlement eligibility philosophy

**Agreed**

- **Completed trips:** A trip reaches a **completed** operational state (`booking-lifecycle.md`) before it can become **financially eligible** for finalization—**substates** between complete and eligible **Unresolved mechanics**.
- **Fully settled trips:** A trip is **fully settled** when **customer charges/credits** are reconciled **and** **supplier payout impact** is computed (paid or intentionally held with reason)—exact boolean rules **Unresolved mechanics**.

**Unresolved mechanics**

- Trips **completed** but with **open disputes** on partial amounts—whether partial supplier eligibility is allowed.

**Exploratory**

- **Progressive** partial payouts for multi-day contracts.

---

## 8. Payout concepts

**Agreed**

- **Configurable payout cycles:** Same philosophy as `supplier-operations.md` §10—batch windows are **parameters**, not code constants.
- **Admin payout controls:** Admins may **pause**, **reschedule**, or **adjust holds** for risk—RBAC + audit per `auth-rbac.md`.
- **Payout hold concepts:** Holds attach for **disputes**, **fraud review**, **KYC gaps**, or **chargeback exposure**—hold **reason codes** catalog **Unresolved mechanics**.

**Exploratory**

- **Dynamic holds** based on supplier risk score.

---

## 9. Commission philosophy

**Agreed**

- **Per-km commission:** Platform may take a **variable** component tied to **billed distance** (all billable km) via **configuration**—**rates and stacking with flat fees** **Unresolved mechanics**; not asserted as the only commission model.
- **Platform fee concepts:** Additional **flat**, **percentage-of-trip**, or **category-based** platform fees may coexist as **separate configuration line items** for transparency—mutual exclusivity rules **Unresolved mechanics**.

**Unresolved mechanics**

- Whether commission is **inclusive** in customer price vs **additive** on top of supplier rack.

**Exploratory**

- **Caps** and **floors** on platform take by city.

---

## 10. Refund philosophy

**Agreed**

- **Full refund eligibility:** Defined by **cancellation policy windows** and **fault attribution** (`booking-lifecycle.md` §8)—numeric tables **Unresolved mechanics**; architecture supports **full**, **partial**, and **fee-only** outcomes.
- **Supplier cancellation posture:** Supplier-initiated cancellations after commitment should align with **customer restitution bias** and **penalty/hold** concepts (`supplier-operations.md` §6)—exact fee schedule **Unresolved mechanics**.
- **Manual refund authority:** Admins may issue **goodwill or corrective refunds** under RBAC with **mandatory audit**; never silent.

**Unresolved mechanics**

- Refund to **original instrument** vs **wallet** vs **manual NEFT** for cash-heavy cases.

**Exploratory**

- **Automated** partial refunds for verified service failures below a threshold.

---

## 11. Dispute categories

**Agreed**

- **Km mismatch:** Disagreement on distance used for billable km or extension eligibility—ties to §5.
- **Settlement disputes:** Supplier disagrees with **payout line** for a batch (missing trip, wrong commission application).
- **Billing disputes:** Customer disagrees with **final bill composition** (toll validity, category mismatch pricing effect).

**Unresolved mechanics**

- **SLA** to resolve each category; **escalation** to legal.

**Exploratory**

- **Neutral third-party** adjudication for high-value cases.

---

## 12. Invoice & report visibility concepts

**Agreed**

- **Customer invoices** (or tax-compliant equivalents) expose **what was charged** and **why** at line-item granularity allowed by policy—template fields **Unresolved mechanics**.
- **Supplier settlement reports** show **earnings**, **deductions**, and **net payout** per batch—aligned with `supplier-operations.md` §12.
- **Privacy boundaries after trip completion:** Post-trip, **PII minimization** continues; reports should avoid leaking **unrelated** customer history—field rules **Unresolved mechanics** (`auth-rbac.md`).

**Exploratory**

- **Downloadable** GL export for supplier accountants.

---

## 13. Taxation & compliance philosophy

**Agreed**

- **No hard legal assumptions:** This architecture **does not** specify GST/VAT rates, HSN/SAC choices, place of supply, or TCS/TDS outcomes.
- **Professional review required:** **Final tax treatment**, **invoice compliance**, and **withholding** require **qualified tax and legal advisors** in each operating jurisdiction before customer-facing rollout.
- **Configurable presentation:** Product should be able to **label** tax lines and **attach** advisor-approved copy without embedding static legal text in code.

**Unresolved mechanics**

- **Invoice issuer** identity for statutory purposes (platform vs supplier).

**Exploratory**

- **e-Invoice** integration where mandated.

---

## 14. Operational edge-case categories

**Agreed** — categories; playbooks **Unresolved mechanics**.

| Category | Description |
| --- | --- |
| **Capture failure** | Final amount exceeds authorization; card declines at capture. |
| **Partial dispute hold** | Customer disputes only toll lines; remainder eligible or not. |
| **Duplicate charge** | Double capture or system retry error. |
| **Negative balance** | Credits exceed charges after adjustments. |
| **Payout in flight** | Chargeback arrives after supplier paid. |
| **FX / rounding** | Rounding disagreements on line items (if multi-decimal internals). |
| **Cash reconciliation gap** | Supplier-reported cash does not match customer statement. |

**Exploratory**

- **Insurance** claim sub-ledger attached to trip.

---

## 15. Future extensibility considerations

**Agreed**

- Additive **fee components**, **hold reasons**, and **payment modes** should extend configuration without rewriting core **trip → eligibility → batch** narrative.
- **Commission models** should be **pluggable** at configuration level (per-km, flat, hybrid) within the transparency rules in §1.

**Exploratory**

- **Marketplace financing** (advance to suppliers against receivables).

---

## Document boundaries

**Agreed**

- **`billing-settlement.md`** owns **money movement architecture** and **financial lifecycle** around trips; **`booking-lifecycle.md`** owns **trip lifecycle** and high-level **bill composition**; **`pricing-engine.md`** owns **rate dimensions**; **`supplier-operations.md`** owns **supplier workflow** around inputs and ops escalation—implementations must keep boundaries coherent.

---

## Revision log

| Date | Change |
| --- | --- |
| 2026-05-17 | **FOUNDATION:** billing/settlement philosophy, payment modes, platform fund flow, final billing workflow, km/toll confirmation, eligibility, payout, commission, refund, disputes, visibility, tax caution, edge cases, extensibility. |
| 2026-05-18 | Related: **`billing-domain-model.md`** (entity architecture); default **24h** refund window documented there as **Planned**—ratify here when product confirms. |
| 2026-05-18 | Entity doc expanded: variance, gateway refs, **7-day payout cycle** default, notification hooks—align §8 payout when ratified. |
| 2026-07-11 | **Updated:** Billable km replaces extra-km framing; operational bundle line item replaces pass-through toll/parking at MVP. |

When merchant-of-record, capture rules, and commission matrices are fixed, add dated rows and consider raising **Maturity** toward `MVP` for covered scope.
