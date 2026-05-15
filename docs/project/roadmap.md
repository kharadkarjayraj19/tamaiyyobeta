# Tamaiyyo — project roadmap

**Purpose:** Durable, high-level sequencing for humans and AI agents. **Not** a substitute for per-feature specs in `docs/features/*.md` or for unfinalized product rules.

**Legend**

| Tag | Meaning |
| --- | --- |
| **Implemented** | Shipped in the repository today. |
| **Planned** | Agreed engineering direction; scope/timing depends on product decisions and feature docs. |
| **Exploratory** | Under discussion or optional; no build commitment until promoted to **Planned** or **Implemented**. |

---

## Current position (snapshot)

For the **primary onboarding snapshot** (read order and doc map), see **[current-state.md](./current-state.md)**. Summary below stays aligned with that file.

**Implemented:** Web foundation (Next.js App Router, TypeScript, Tailwind, shadcn-style tokens); role route groups (`/customer`, `/supplier`, `/admin`); cross-role dashboard shell and placeholder role pages; Better Auth wiring (stateless session cache, API route, server session read, optimistic Edge middleware, unified `/login` + `/forbidden` placeholders); `RoleDashboardWithAuth` + minimal session bridge for chrome extension points.

**Planned:** Per-domain feature documentation then implementation for marketplace journeys (booking, supplier operations, admin)—**only after** product rules are captured in `docs/features/*`, not invented in code.

**Exploratory:** Full login UX (OAuth / OTP / password per product), persistence-backed users/sessions, fine-grained RBAC, backend APIs, observability, automated testing strategy—see [future-initiatives.md](./future-initiatives.md) and open questions in `docs/features/auth-rbac.md` / `docs/features/frontend-auth-architecture.md`.

---

## Near term (engineering + documentation)

| Item | Tag | Notes |
| --- | --- | --- |
| Keep `docs/architecture.md` and `docs/project/*` aligned with repo reality | **Planned** | Ongoing; global arch describes structure, project docs describe phase and direction. |
| Add or extend `docs/features/<domain>.md` for each major marketplace module | **Planned** | Source of truth for workflows and rules when product defines them. |
| Resolve auth/RBAC open questions into dated decisions or explicit deferrals | **Planned** | See `docs/features/auth-rbac.md` §20; avoid silent assumptions in implementation. |

---

## Mid term (product-dependent)

| Item | Tag | Notes |
| --- | --- | --- |
| End-to-end login and session persistence appropriate to chosen IdP and data model | **Planned** | Better Auth remains the integration seam; details in `docs/features/frontend-auth-architecture.md`. |
| Server-side authorization aligned with entitlement model | **Planned** | Philosophy in `docs/features/auth-rbac.md`; permission strings and enforcement are product-owned. |
| Domain modules under `src/features/*` backed by APIs/data when backend exists | **Planned** | Modular growth; no prescribed microservice layout in this doc. |

---

## Longer horizon

| Item | Tag | Notes |
| --- | --- | --- |
| Operational marketplace systems (dispatch, payouts, support tooling, etc.) | **Exploratory** | Document per feature when scope is known; may span web and non-web systems. |
| Mobile or partner API parity with web entitlements | **Exploratory** | Conceptual alignment noted in auth feature docs; out of scope for current repo phase per `docs/architecture.md`. |

---

## Revision log

| Date | Change |
| --- | --- |
| 2026-05-14 | Initial project-memory roadmap (implemented / planned / exploratory). |
| 2026-05-14 | Current position defers onboarding detail to `current-state.md`; doc governance alignment. |
