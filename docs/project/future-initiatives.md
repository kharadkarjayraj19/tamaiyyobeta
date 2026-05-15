# Tamaiyyo — future initiatives

**Purpose:** Capture **non-committed** directions and placeholders so agents do not confuse them with implemented behavior or finalized product rules. Promote items to `docs/features/*`, `docs/project/roadmap.md`, or `architecture-decisions.md` when they become **Planned** or **Implemented**.

**Legend:** **Exploratory** — may never ship as stated; **Planned** — intended once dependencies clear.

---

## Product and domain documentation

| Initiative | Tag | Notes |
| --- | --- | --- |
| Extend **`docs/features/booking-lifecycle.md`** (FOUNDATION) with MVP detail: payments, numeric cancel tables, RBAC matrix, supplier ops | **Planned** | Foundation operational spec 2026-05-14; align billing with **`pricing-engine.md`**, assignment inventory with **`vehicle-management.md`**, supplier workflows with **`supplier-operations.md`**, financial lifecycle with **`billing-settlement.md`**; implementation still absent. |
| Dedicated feature specs for admin workflows; extend **`pricing-engine.md`** / **`vehicle-management.md`** / **`supplier-operations.md`** / **`billing-settlement.md`** toward MVP (substitution matrix, verification SLA, routing timeouts, MoR, tax addendum) | **Exploratory** | Domain FOUNDATION specs 2026-05-14–17; deepen per product. |
| Operational marketplace documentation (dispatch, SLA copy, partner onboarding) | **Exploratory** | Product/legal owned; link from feature docs when created. |

---

## Identity, session, and RBAC

| Initiative | Tag | Notes |
| --- | --- | --- |
| Chosen login factors (OAuth, OTP, password) and IdP strategy | **Exploratory** | Open questions: `docs/features/auth-rbac.md` §20, `docs/features/frontend-auth-architecture.md` §20. |
| Entitlement model and enforcement on server for each role tree | **Exploratory** | Philosophy: `docs/features/auth-rbac.md`; no permission matrix checked in yet. |
| Post-login routing, callback URL allowlists, multi-role switching | **Exploratory** | Document decisions in feature docs when product defines them. |

---

## Data and backend

| Initiative | Tag | Notes |
| --- | --- | --- |
| Implement MVP backend per **`docs/architecture/backend-architecture.md`** (PostgreSQL, Prisma, domain modules, internal REST) | **Planned** | Blueprint added 2026-05-18; code not in repo yet. |
| Better Auth **database adapter** + application persistence | **Planned** | Direction in backend-architecture §4, §8; stateless auth **Implemented** today. |
| Async queues (payout batches, notification retries) | **Exploratory** | Synchronous-first MVP; extraction points in backend-architecture §10. |
| AWS/RDS migration, external partner APIs | **Exploratory** | Portable Postgres assumed; see backend-architecture §5, §7. |

---

## Quality, operations, and scale

| Initiative | Tag | Notes |
| --- | --- | --- |
| Automated testing layout and CI gates | **Exploratory** | `docs/frontend-guidelines.md` notes tests “to be introduced.” |
| Observability, feature flags, deployment runbooks | **Exploratory** | Explicitly deferred in `docs/architecture.md` until requirements known. |
| Mobile or additional clients consuming same entitlement concepts | **Exploratory** | Cross-client notes already in auth/design feature docs; not in repo scope today. |

---

## Revision log

| Date | Change |
| --- | --- |
| 2026-05-14 | Initial future-initiatives list (exploratory / planned distinction). |
| 2026-05-14 | Booking lifecycle foundation spec added; table split booking vs other domain docs. |
| 2026-05-14 | **`pricing-engine.md`** FOUNDATION; future-initiatives row updated. |
| 2026-05-16 | Domain specs: **`supplier-operations.md`** FOUNDATION; cross-links and future-initiatives row updated. |
| 2026-05-17 | **`billing-settlement.md`** FOUNDATION; planned row and exploratory row updated. |
| 2026-05-18 | **`docs/architecture/backend-architecture.md`** FOUNDATION; Data and backend table updated. |
