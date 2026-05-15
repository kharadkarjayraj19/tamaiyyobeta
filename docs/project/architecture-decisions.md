# Tamaiyyo — architecture decisions (project memory)

**Purpose:** Short, durable record of **structural** choices for AI onboarding and reviews. **Behavioral and business rules** belong in `docs/features/*.md`. Deep auth philosophy: `docs/features/auth-rbac.md`; Better Auth wiring: `docs/features/frontend-auth-architecture.md`; MVP backend blueprint: `docs/architecture/backend-architecture.md`.

**Legend:** **Implemented** (in repo) · **Planned** (direction agreed; may be partial) · **Exploratory** (not committed)

---

## Platform and delivery

| ID | Decision | Tag |
| --- | --- | --- |
| ADR-P01 | **Web-first** marketplace UI in this repository; mobile apps out of scope for the current repo phase (`docs/architecture.md`). | **Implemented** |
| ADR-P02 | **Next.js App Router** as the application framework; default to **Server Components**, client islands only when needed (`.cursorrules`, `docs/frontend-guidelines.md`). | **Implemented** |
| ADR-P03 | **TypeScript strict**; Tailwind + **shadcn-compatible tokens**; avoid raw palette literals outside token definitions. | **Implemented** |

---

## Codebase structure

| ID | Decision | Tag |
| --- | --- | --- |
| ADR-S01 | **Layering:** `components/ui` (primitives) → `components/shared` (role-agnostic composites) → `features/*` (domain) → `app` (routing and page composition). | **Implemented** |
| ADR-S02 | **Role URLs** via route groups: `(customer)/customer`, etc., yielding prefixes `/customer`, `/supplier`, `/admin`. | **Implemented** |
| ADR-S03 | **Configuration** centralized in `src/config`; env via `src/config/env/client.ts` and `src/config/env/server.ts` — **no** barrel that mixes client and server env. | **Implemented** |
| ADR-S04 | Cross-role shell and nav: **one** dashboard shell implementation parameterized by role (`docs/features/app-shell.md`). | **Implemented** |

---

## Authentication and security (engineering seam)

| ID | Decision | Tag |
| --- | --- | --- |
| ADR-A01 | **Better Auth** as the web session integration library; server-only instance in `src/lib/auth/instance.ts`; HTTP surface under `api/auth/*`. | **Implemented** |
| ADR-A02 | **Stateless session** (signed cookie cache) for the foundation milestone; **no** primary database adapter until persistence requirements are defined. | **Implemented** |
| ADR-A03 | **Defense in depth:** Edge `middleware` performs **optimistic** cookie presence checks only; **authoritative** session check via `getSession` / `requireSession` in server layouts. | **Implemented** |
| ADR-A04 | **RBAC and entitlements** enforced per product model on the server; UI reflects permissions but does not replace server checks — **philosophy documented**; granular enforcement **not** implemented in app logic yet. | **Planned** (see `docs/features/auth-rbac.md`) |
| ADR-A05 | Cookie attributes, CSRF strategy, rate limiting, and production IdP details | **Exploratory** (listed as open questions in `docs/features/frontend-auth-architecture.md` §20) |

---

## Documentation

| ID | Decision | Tag |
| --- | --- | --- |
| ADR-D01 | **Feature docs** under `docs/features/` own business rules, workflows, RBAC, and lifecycle states; each declares **Maturity** (`.cursorrules`). | **Implemented** |
| ADR-D02 | **Project memory** under `docs/project/` owns **`current-state.md`** (onboarding), roadmap, phases, ADR index, and future initiatives—not duplicate feature specs. | **Implemented** |

---

## Backend (MVP blueprint)

| ID | Decision | Tag |
| --- | --- | --- |
| ADR-B01 | **Modular monolith** in this repo; domain modules under `src/features/*` aligned with `docs/features/*.md` | **Planned** (`docs/architecture/backend-architecture.md`) |
| ADR-B02 | **PostgreSQL** + **Prisma** as data layer | **Planned** |
| ADR-B03 | **REST** internal APIs via Next.js Route Handlers; Better Auth at `api/auth/*` | **Planned** (auth handler **Implemented**) |
| ADR-B04 | Deploy **Vercel** + **Supabase PostgreSQL** initially; portable Postgres for future **AWS/RDS** | **Planned** |
| ADR-B05 | **Synchronous-first** MVP; queues for payout/notifications later | **Planned** |
| ADR-B06 | Observability: **Sentry**, **PostHog**, **admin audit logs** for critical actions | **Planned** |
| ADR-I01 | **Separate identities** for customer vs supplier (not one login with role toggle); unified login UI may resolve multiple accounts per phone | **Planned** (`docs/architecture/domain-models/identity-domain-model.md`) |
| ADR-I02 | **Phone-first** auth; Better Auth; **OTP** direction for sign-in | **Planned** |
| ADR-V01 | **Vehicle** and **driver** are supplier-owned **separate** entities; **booking-time** assignment only (no permanent vehicle–driver link) | **Planned** (`docs/architecture/domain-models/vehicle-domain-model.md`) |

---

## Dependency / tooling notes

| ID | Decision | Tag |
| --- | --- | --- |
| ADR-T01 | `package.json` **overrides** for `postcss` minimum version per security advisory; document rationale in `docs/architecture.md`. | **Implemented** |

---

## Revision log

| Date | Change |
| --- | --- |
| 2026-05-14 | Initial architecture-decisions index for `docs/project/`. |
| 2026-05-14 | ADR-D02: explicit `current-state.md` in project memory scope. |
| 2026-05-18 | ADR-B01–B06: backend MVP blueprint (`docs/architecture/backend-architecture.md`). |
| 2026-05-18 | ADR-I01–I02: identity domain model (`docs/architecture/domain-models/identity-domain-model.md`). |
| 2026-05-18 | ADR-V01: vehicle domain model; identity doc alignment. |
