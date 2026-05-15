# Tamaiyyo — development phases

**Purpose:** Phase-style view of repository evolution for onboarding. Phases overlap in practice; tags indicate **stability of the outcome in repo**, not calendar dates.

**Legend:** **Implemented** · **Planned** · **Exploratory** — same meanings as [roadmap.md](./roadmap.md).

---

## Phase A — Web platform foundation

| Outcome | Tag |
| --- | --- |
| Next.js App Router, strict TypeScript, Tailwind, shadcn/ui conventions | **Implemented** |
| `src/config` env split (client vs server, no mixed barrel) | **Implemented** |
| Global layout and marketing-style root entry | **Implemented** |

**Reference:** `docs/architecture.md`, `docs/frontend-guidelines.md`

---

## Phase B — Multi-role shell and UX foundation

| Outcome | Tag |
| --- | --- |
| Role route groups and URL prefixes `/customer`, `/supplier`, `/admin` | **Implemented** |
| Shared `RoleDashboardShell` (nav, sidebar, mobile sheet, page framing, skeletons) | **Implemented** |
| Config-driven navigation (`src/config/navigation.ts`) | **Implemented** |
| Placeholder dashboard pages per role (no real marketplace data) | **Implemented** |
| Design tokens and patterns for cross-role UI | **Implemented** |

**Reference:** `docs/features/app-shell.md`, `docs/features/design-system.md`

---

## Phase C — Authentication foundation (web)

| Outcome | Tag |
| --- | --- |
| Better Auth server instance, `api/auth/*` route handler, server `getSession` / `requireSession` | **Implemented** |
| Stateless session cookie cache (no primary DB adapter yet) | **Implemented** |
| Role layouts wrapped with session requirement + minimal client session bridge | **Implemented** |
| Edge middleware: optimistic session cookie presence on role paths (`AUTH_MIDDLEWARE_ENABLED`) | **Implemented** |
| Full sign-in/sign-up UX, OAuth/OTP/password flows | **Planned** |
| Database-backed users and session persistence | **Planned** |
| Fine-grained RBAC (which identity may enter which role tree) | **Planned** |

**Reference:** `docs/features/frontend-auth-architecture.md` (implementation table), `docs/features/auth-rbac.md` (philosophy and open questions)

---

## Phase D — Marketplace domain and operations

| Outcome | Tag |
| --- | --- |
| Feature specs for booking, supplier ops, admin, etc. | **Planned** (per product) |
| End-to-end customer/supplier/admin journeys in product sense | **Planned** |
| API clients, persistence, background work as needed | **Planned** / **Exploratory** |

**Reference:** Future `docs/features/*.md` files (not yet present for core marketplace domains)

---

## Phase E — Production hardening (when scope exists)

| Outcome | Tag |
| --- | --- |
| Observability, feature flags, deployment-specific notes | **Exploratory** |
| Systematic automated testing | **Exploratory** (convention TBD; see `docs/frontend-guidelines.md`) |

**Reference:** `docs/architecture.md` (previously listed as not included; revisit when requirements are known)

---

## Revision log

| Date | Change |
| --- | --- |
| 2026-05-14 | Initial phased view aligned with current repository. |
