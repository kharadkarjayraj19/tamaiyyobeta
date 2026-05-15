# Tamaiyyo — current state (onboarding)

**Purpose:** **Primary onboarding context** for humans and AI agents: where the repo is now, what to read next, and how project vs feature vs global docs relate. For sequencing and tags in depth, see [roadmap.md](./roadmap.md) and [development-phases.md](./development-phases.md).

---

## Read next (typical order)

1. **This file** — snapshot and doc map.
2. **`docs/architecture.md`** — global structure, routing, env patterns; **`docs/architecture/backend-architecture.md`** for MVP backend blueprint; **`docs/architecture/domain-models/`** for entity models (e.g. identity).
3. **`docs/features/*.md`** relevant to the task — behavior and cross-cutting UI/auth/shell specs.
4. **`docs/frontend-guidelines.md`** — when touching UI or App Router conventions.
5. **`docs/project/roadmap.md`**, **`architecture-decisions.md`**, **`future-initiatives.md`** — when changing phase, direction, or recorded ADR-style decisions.

---

## Documentation map (do not confuse layers)

| Location | Owns |
| --- | --- |
| **`docs/project/current-state.md` (this file)** | Onboarding snapshot; what is **Implemented** / **Planned** / **Exploratory** at a glance. |
| **`docs/project/*` (other files)** | Project memory: roadmap, phases, ADR index, initiatives—not per-feature behavior. |
| **`docs/features/*.md`** | **Source of truth for feature behavior** (rules, workflows, RBAC as specified, states); each has **Maturity**. |
| **`docs/architecture.md`** | **Global** repo conventions and cross-cutting technical decisions not owned by one feature doc. |
| **`docs/architecture/backend-architecture.md`** | MVP **backend** stack, domain modules, deployment, and data/API philosophy (**Planned** implementation). |

---

## Status snapshot (see [roadmap.md](./roadmap.md) for definitions)

**Implemented**

- Next.js App Router, TypeScript strict, Tailwind + shadcn-style tokens; `src/config` env split (no client/server barrel).
- Role route groups → `/customer`, `/supplier`, `/admin`; shared dashboard shell and placeholder pages.
- Better Auth foundation: API route, stateless session cache, `getSession` / `requireSession`, role layouts via `RoleDashboardWithAuth`, optimistic Edge middleware, `/login` and `/forbidden` placeholders.

**Planned**

- **Marketplace behavior** implementation aligned to feature specs—**[`docs/features/booking-lifecycle.md`](../features/booking-lifecycle.md)**, **[`docs/features/pricing-engine.md`](../features/pricing-engine.md)**, **[`docs/features/vehicle-management.md`](../features/vehicle-management.md)**, **[`docs/features/supplier-operations.md`](../features/supplier-operations.md)**, **[`docs/features/billing-settlement.md`](../features/billing-settlement.md)** (all **FOUNDATION**); code for marketplace domains not yet present.
- Additional per-domain **`docs/features/*.md`** (narrower tax/payment-rail addenda) as product defines them.
- Full login product (factors, persistence, RBAC beyond session presence) once specified.

**Planned (backend blueprint documented)**

- MVP backend per **[`docs/architecture/backend-architecture.md`](../architecture/backend-architecture.md)**: modular monolith, PostgreSQL + Prisma, REST (internal), Vercel + managed Postgres initially, Better Auth with DB persistence, Sentry/PostHog/audit logging—**not implemented in code yet**.

**Exploratory**

- AWS/RDS migration, async queues, external partner APIs, systematic tests—see [future-initiatives.md](./future-initiatives.md) and open questions in `docs/features/auth-rbac.md` / `docs/features/frontend-auth-architecture.md`.

---

## Revision log

| Date | Change |
| --- | --- |
| 2026-05-14 | Added as primary onboarding doc per documentation governance. |
| 2026-05-14 | **Planned:** reference `docs/features/booking-lifecycle.md` (FOUNDATION). |
| 2026-05-14 | **Planned:** reference `docs/features/pricing-engine.md` (FOUNDATION). |
| 2026-05-15 | **Planned:** reference `docs/features/vehicle-management.md` (FOUNDATION). |
| 2026-05-16 | **Planned:** reference `docs/features/supplier-operations.md` (FOUNDATION); **Planned** bullet clarified for later addenda. |
| 2026-05-17 | **Planned:** reference `docs/features/billing-settlement.md` (FOUNDATION); **Planned** bullet narrowed to tax/payment-rail addenda. |
| 2026-05-18 | **Planned:** `docs/architecture/backend-architecture.md` (MVP backend blueprint); Exploratory backend bullet split out. |
| 2026-05-18 | **Planned:** `docs/architecture/domain-models/identity-domain-model.md` (FOUNDATION). |
| 2026-05-18 | **Planned:** `docs/architecture/domain-models/vehicle-domain-model.md` (FOUNDATION); identity doc corrected (no permanent vehicle–driver link). |
