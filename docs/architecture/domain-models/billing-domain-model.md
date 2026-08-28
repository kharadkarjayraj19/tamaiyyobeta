# Tamayo — billing domain model (financial entity architecture)

**Maturity:** FOUNDATION  
**Purpose:** Foundational **billing, payment, settlement, refund, and financial** entity architecture for Tamayo: quotes, bills, payments, supplier earnings, commission, refunds, notifications hooks, and audit—aligned with bookings and **without** schemas, APIs, enterprise ledgers, or tax/legal prescriptions.

**Related docs:** [`docs/features/billing-settlement.md`](../../features/billing-settlement.md) (financial workflow philosophy), [`docs/features/pricing-engine.md`](../../features/pricing-engine.md) (rate dimensions), [`docs/architecture/domain-models/booking-domain-model.md`](./booking-domain-model.md) (booking link, pricing snapshot), [`docs/features/booking-lifecycle.md`](../../features/booking-lifecycle.md) (cancellation posture), [`docs/features/supplier-operations.md`](../../features/supplier-operations.md) (payout cadence, billing inputs), [`docs/architecture/backend-architecture.md`](../backend-architecture.md) (`billing` module).

**Non-goals (this document):** Prisma models; SQL DDL; payment-gateway integration specs; statutory GST/TDS rates; double-entry GL / ERP ledger systems.

---

## How to read this spec

| Label | Meaning |
| --- | --- |
| **Implemented** | Present in repo or binding decision **today**. |
| **Planned** | Agreed entity architecture for MVP; not persisted yet. |
| **Exploratory** | Optional later; not mandatory until promoted. |

---

## 1. Billing-domain philosophy

**Planned**

- **Money follows trips:** Financial records **anchor to booking**; no orphan charges without commercial context (`booking-domain-model.md`).
- **Quote ≠ final:** **Estimated quote** sets expectation and authorization; **final bill** reflects **actuals** and configured fees (`billing-settlement.md` §1).
- **Configuration-driven:** Rates, commission, payout cadence, and refund windows are **admin-tunable data**—not hardcoded application constants (`pricing-engine.md`).
- **Explainability:** Every amount traces to **snapshot**, **actual**, **adjustment**, or **refund** with audit.
- **MVP scope:** One **modular monolith** financial module—no separate accounting product at launch (`backend-architecture.md`).

**Implemented**

- Workflow philosophy in `billing-settlement.md`; **no** financial entities in application data yet.

**Exploratory**

- Multi-currency or multi-entity ledgers.

---

## 2. Conceptual separation: estimated quote vs final bill

**Planned**

| Artifact | Role | Mutability |
| --- | --- | --- |
| **Estimated quote** | Customer-facing **expected** total at booking time; may drive **authorization** | **Immutable** once issued; replaced only via explicit **amendment** event |
| **Final bill** | **Authoritative** post-trip obligation; line items from package, actuals, fees | **Immutable** once **issued**; fixes via **adjustment/credit** rows (§10), not in-place edits |

**Planned — linkage**

- Booking holds **quote reference** at creation and **final bill reference** after issuance.
- **Variance** between quote and final is **computed and displayed** (§4)—not hidden.

**Unresolved mechanics**

- Shared document numbering between quote and bill.

**Exploratory**

- Pro-forma bill before customer km sign-off.

---

## 3. Financial integrity philosophy

**Planned**

- **Immutable historical values:** Issued quotes, bill lines, **calculated** commission amounts, and refund rows are **never overwritten**—only voided or offset by new rows.
- **Booking-time financial snapshots:** Persist **pricing config version** and **sold commercial terms** from `booking-domain-model.md` §4 on financial records—disputes do not use live rate cards.
- **Append-only financial history:** Payments, refunds, settlement batch membership, holds, and admin adjustments **append**; balances are **derived** or carefully denormalized.

**Implemented**

- Philosophy only.

**Exploratory**

- Cryptographic audit chaining.

---

## 4. Bill concepts

**Planned**

- **Estimated totals:** On **quote**—base package, selected extensions, operational bundle total—not final collection authority.
- **Final totals:** On **final bill**—subtotal, fee lines, optional **tax presentation placeholders** (§13), **grand total**.
- **Additional charges visibility:** Line items for **billable km**, **operational bundle**, extensions consumed beyond prepaid—no opaque “misc” at MVP.
- **Variance visibility:** Store and show **estimate vs final** at total and (where useful) **line-category** level—e.g. `estimated_total`, `final_total`, `variance_amount` (conceptual fields); explain **why** (actual kms vs included kms, operational bundle)—wording **Unresolved mechanics**.

**Unresolved mechanics**

- Rounding policy; show variance only to customer, or also supplier.

**Exploratory**

- Itemized variance breakdown export.

---

## 5. Payment concepts

**Planned**

- **Partial / full:** Multiple **payment records** per booking allocating to quote and/or final bill.
- **Online / cash:** Each payment records **mode** for reconciliation—cash city rules **Unresolved mechanics**.
- **Multiple payments:** Deposits, balance collection, retries, split instruments—allocation order **Unresolved mechanics**.
- **Payment status / history:** Status transitions (e.g. initiated, authorized, captured, failed, refunded)—enum **Unresolved mechanics**; every transition **appends** to payment event history.
- **Gateway reference tracking:** Online payments store **external gateway ids** (payment intent, order id, UPI ref, etc.) for support and reconciliation—provider-agnostic field(s), not a specific vendor schema.

**Implemented**

- None.

**Exploratory**

- Stored-value wallet.

---

## 6. Settlement concepts

**Planned**

- **Supplier earning lifecycle** (per booking/bill—granularity **Unresolved mechanics**):
  1. **Earned** — trip completed + final bill issued (or policy-defined)
  2. **Eligible** — clears dispute/hold gates; candidate for payout batch
  3. **Batched** — attached to **payout batch**
  4. **Paid** or **Held** — released or blocked with **reason code**
- **7-day payout-cycle foundation:** **Launch configuration default** is a **weekly (7-day) settlement cycle**—batch closes on a configured weekday, pays eligible earnings in the next window—stored as **admin configuration**, not a code constant; other cadences allowed without architecture change.
- **Admin payout controls:** Pause/reschedule batch, per-supplier hold, minimum threshold (`supplier-operations.md` §10, `billing-settlement.md` §8).

**Unresolved mechanics**

- Gross vs net before commission; negative balance netting across bookings in one batch.

**Exploratory**

- Instant payout tier.

---

## 7. Commission concepts

**Planned**

- **Platform fee:** Configurable flat or percentage—visible per policy on customer bill and/or supplier settlement view.
- **Per-km commission:** Configurable on billed distance (all billable km)—from configuration.
- **Historical preservation of calculated values:** Persist **both** rule references (version ids) **and** computed **amounts** at settlement time—later config edits must not recompute past trips.

**Unresolved mechanics**

- Inclusive vs additive display to customer.

**Exploratory**

- Volume-tier commission schedules.

---

## 8. Refund concepts

**Planned — default cancellation window**

- **Full refund before 24h:** Cancellation **more than 24 hours before** scheduled trip start → **eligible for full refund** of collected **online** payments (rail rules apply).
- **No refund within 24h:** Cancellation **within 24 hours** of start → **no automatic full refund**; fee retained / partial / admin goodwill **Unresolved mechanics** except via explicit **refund** row.
- **Exceptions:** Supplier fault, admin override—explicit refund with reason; not silent.

**Planned — refund records**

- **Refund ownership:** Initiator (customer, admin, system), linked **payment(s)**, amount, reason code.
- **Refund history:** Append-only; multiple partial refunds until cap.

**Note:** Ratify in `billing-settlement.md` / `booking-lifecycle.md` when product confirms.

**Exploratory**

- Auto-approve small refunds.

---

## 9. Financial audit / timeline philosophy

**Planned**

- **Append-only operational financial history** per booking (and optionally per supplier batch)—single stream or typed sub-streams **Unresolved mechanics**.
- **Event categories** (minimum):
  - **Payment events** — authorized, captured, failed, allocated
  - **Settlement events** — earned, eligible, batched, paid, held, hold released
  - **Refund events** — initiated, succeeded, failed
  - **Bill events** — quote issued, final bill issued, adjustment posted
- **Admin financial actions** always emit events (override, manual adjustment, hold).
- Orthogonal to **PostHog** / **Sentry** (`backend-architecture.md` §9).

**Unresolved mechanics**

- Retention; correlation id across booking ops + financial streams.

**Exploratory**

- Regulator export bundles.

---

## 10. Support / admin operational concepts

**Planned**

- **Notes:** Internal financial notes on booking/bill/batch (author, time, body).
- **Manual adjustments:** Credit/debit lines with reason—new rows, never mutate issued bill.
- **Payout holds:** Block supplier earning or batch line with reason code until release event.
- **Override authority:** Admins may force refund, adjustment, hold release, or bill closure fallback—**RBAC + audit** (`auth-rbac.md`); dual-control **Exploratory**.

**Implemented**

- None.

**Exploratory**

- Adjustment amount thresholds requiring second approver.

---

## 11. Historical integrity philosophy

**Planned**

- **Historical bills preserved:** Issued quotes and final bills remain queryable for entitled roles after booking **closed** or **cancelled**.
- **Historical payment records preserved:** All payment and refund rows retained with gateway refs and status history.
- **Historical settlements preserved:** Earning rows and **payout batch** membership remain for supplier statements and disputes—even if supplier account **suspended**.
- **Chargeback** after payout → offset rows; recovery policy **Unresolved mechanics**.

**Exploratory**

- Cold archive after retention period.

---

## 12. Notification relationship concepts

**Planned**

- Financial entities **emit notification triggers** (handled by `notifications` module)—templates and channels **Unresolved mechanics**:
  - **Payment confirmation** — customer on successful capture; supplier when deposit policy applies
  - **Payout visibility** — supplier when batch **paid** or **held** (with reason summary)
  - **Billing events** — final bill issued, refund processed, payment failed (actionable)
- Notifications reference **booking id** + **financial artifact id**; do not duplicate financial truth in message body beyond summary amounts.

**Implemented**

- None.

**Exploratory**

- WhatsApp vs SMS channel policy per event type.

---

## 13. Future extensibility considerations

**Planned**

- Additive fee types, hold reasons, payment modes, and event types without breaking append-only history.

**Exploratory**

- **Payout statements** (PDF/CSV) per batch with opening/closing balance.
- **Financial dispute** case entity linking bill lines, evidence, resolution (`billing-settlement.md` §11).
- **GST / tax extensibility:** Bill model supports **optional tax line slots** (rate, component code, amount) populated from **advisor-approved config** later—**no** hardcoded statutory rates or filing logic in application core.

---

## Entity relationship sketch (conceptual)

```text
Booking
  ├── Quote (estimated, immutable)
  ├── Payment record(s) → gateway refs, status history
  ├── Final bill (immutable lines, variance vs quote)
  │     └── Commission snapshot (rules + calculated amounts)
  ├── Refund record(s) (append-only)
  ├── Financial event stream (payment | settlement | refund | bill)
  └── Supplier earning → Payout batch (7-day cycle config, eligible | batched | paid | held)
```

---

## Document boundaries

**Planned**

- **`billing-domain-model.md`** owns **financial entities** and relationships.
- **`billing-settlement.md`** owns **workflow philosophy**; **`pricing-engine.md`** owns rate dimensions; **`booking-domain-model.md`** owns booking linkage; **`notifications`** module owns delivery.

---

## Revision log

| Date | Change |
| --- | --- |
| 2026-05-18 | **FOUNDATION:** quote vs bill, integrity, payments, settlement, commission, 24h refund, audit, admin, extensibility. |
| 2026-05-18 | Expanded: variance visibility, gateway refs, **7-day payout cycle** default, typed financial events, notifications, historical preservation detail, GST extensibility hook. |
| 2026-07-11 | **Updated:** Billable km and operational bundle line items incorporated into bill concepts. |

When policies are ratified, sync `billing-settlement.md`, `supplier-operations.md` (payout §10), and `booking-lifecycle.md` §8.
