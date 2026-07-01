# Tamaiyyo web architecture

This document records **foundation-level** decisions for the Tamaiyyo web app. Update it whenever you change structural conventions.

## Product context

Tamaiyyo is an outstation cab booking marketplace for India. The web app serves multiple roles: **Customer**, **Supplier**, and **Admin**. Mobile apps are out of scope for this repository phase.

## Stack

- **Framework:** Next.js (App Router)
- **Language:** TypeScript (strict)
- **Styling:** Tailwind CSS + CSS variables (shadcn/ui–compatible tokens)
- **Components:** shadcn/ui conventions (`components/ui`, `cn()` helper, Radix primitives as needed)

## High-level layout

```text
src/
  app/                 # Routes, layouts, route groups, `api/auth/*`
  components/
    ui/                # Design-system primitives (shadcn)
    shared/            # Cross-role reusable UI (see docs/features/app-shell.md)
    shared/layout/     # App shell, navigation chrome, page framing
  config/              # App config, typed env accessors
  features/            # Domain modules (e.g. `features/auth` session bridge)
  hooks/               # Cross-cutting React hooks
  lib/                 # Cross-cutting utilities + `lib/auth` (Better Auth — see docs/features/frontend-auth-architecture.md)
  middleware.ts        # Edge optimistic session cookie check for role prefixes
  types/               # Shared TypeScript types
```

## Documentation split

- **`docs/architecture.md` (this file):** global structure, routing, environment patterns, and cross-repo technical decisions.
- **`docs/architecture/backend-architecture.md`:** MVP **backend** implementation blueprint (modular monolith, PostgreSQL/Prisma, REST, deployment, observability)—see **Implemented / Planned / Exploratory** labels inside.
- **`docs/architecture/api-architecture.md`:** executable **REST API** contract philosophy (`/api/v1/`, auth, validation, responses, handler layering)—not OpenAPI artifacts.
- **`docs/architecture/backend-foundation.md`:** Backend application foundation (repositories, services, validation, errors, transactions)—implementation patterns.
- **`docs/architecture/prisma-data-architecture.md`:** PostgreSQL + Prisma persistence blueprint (UUID, refs, snapshots, audit, indexing, repositories)—foundational philosophy.
- **`docs/architecture/prisma-schema-planning.md`:** Prisma schema planning (concrete model groups, fields, relationships, transactions)—implementation blueprint before `schema.prisma`.
- **`docs/architecture/CORRECTNESS_FIXES_2026-05-18.md`:** Production-readiness hardening post-architecture-review (idempotency, type safety, authorization, lifecycle guards)—correctness fixes documentation.
- **`docs/architecture/BOOKING_UI_MODEL_REVIEW_2026-05-31.md`:** Architecture review of booking implementation compatibility with proposed UI trip types (One Way Transfer, Multi-City Tour, Round Trip Tour)—schema support, pricing changes, implementation roadmap.
- **`docs/architecture/PRICING_UX_REVIEW_2026-05-31.md`:** Comprehensive pricing engine vs UX model review analyzing corridor pricing, KM-based pricing, minimum billable km, empty return costing, and route vs billable km distinction—includes vehicle card designs, fare terminology recommendations, KM disclosure strategies, final bill templates, conversion optimization tactics, and critical architectural gap analysis.
- **`docs/architecture/domain-models/*.md`:** foundational **entity** architecture (e.g. [identity-domain-model.md](./architecture/domain-models/identity-domain-model.md), [vehicle-domain-model.md](./architecture/domain-models/vehicle-domain-model.md), [booking-domain-model.md](./architecture/domain-models/booking-domain-model.md), [billing-domain-model.md](./architecture/domain-models/billing-domain-model.md))—not SQL or API contracts.
- **`docs/project/*.md`:** durable **project memory** for onboarding—**start with [project/current-state.md](./project/current-state.md)** (primary snapshot), then roadmap, development phases, architecture decision index, and future initiatives (**not** feature-level business rules).
- **`docs/features/*.md`:** one markdown file per major feature or module—source of truth for business rules, workflows, RBAC, lifecycle states, and feature-scoped technical decisions. Each file declares a **Maturity** (`DRAFT` → `SCALING`); see **`.cursorrules`** for definitions and AI behavior. Cross-cutting specs (e.g. **[features/design-system.md](./features/design-system.md)**, **[features/app-shell.md](./features/app-shell.md)**, **[features/auth-rbac.md](./features/auth-rbac.md)**, **[features/frontend-auth-architecture.md](./features/frontend-auth-architecture.md)**) and domain specs (e.g. **[features/booking-lifecycle.md](./features/booking-lifecycle.md)**, **[features/pricing-engine.md](./features/pricing-engine.md)**, **[features/vehicle-management.md](./features/vehicle-management.md)**, **[features/supplier-operations.md](./features/supplier-operations.md)**, **[features/billing-settlement.md](./features/billing-settlement.md)**) live here too. Workflow for authors and agents is defined in **`.cursorrules`**; see **`docs/features/README.md`** for where to add new specs.

## Routing and roles

Role surfaces use **route groups** so URLs stay clean while layouts can diverge per role:

| Group folder | URL prefix | Purpose |
| --- | --- | --- |
| `(customer)/customer` | `/customer` | Booking and customer account experiences |
| `(supplier)/supplier` | `/supplier` | Fleet / trip operations for partners |
| `(admin)/admin` | `/admin` | Internal administration |

Route groups (parentheses) do **not** appear in the URL. The first segment (`customer`, `supplier`, `admin`) is the public path prefix.

The app root (`/`) is reserved for marketing or global entry; it currently links into the three role placeholders.

## Environment configuration

- **Public variables:** `NEXT_PUBLIC_*`, read via `src/config/env/client.ts`.
- **Secrets / server-only:** read via `src/config/env/server.ts` (marked with `server-only`).

Do **not** create a barrel file that re-exports both client and server env helpers together; that risks pulling server-only modules into client bundles.

Details: [environment.md](./environment.md).

## Boundaries (intentionally simple)

- **`components/ui`:** presentational primitives only.
- **`components/shared`:** reusable composites that are still role-agnostic.
- **`features/*`:** role or domain-specific logic and UI assemblies as the product grows.
- **`app`:** routing, composition, and data loading at the page level—avoid burying business rules only in layouts without a feature module home.

## Dependency overrides

`package.json` defines an `overrides` field so every resolved `postcss` (including the copy nested under `next`) is at least **8.5.10**, addressing [GHSA-qx2v-qp2m-jg93](https://github.com/advisories/GHSA-qx2v-qp2m-jg93). Avoid `npm audit fix --force` for this class of report: npm may suggest a breaking downgrade of Next.js instead. Remove or relax the override once the installed `next` release pulls a patched PostCSS by default.

## What is not included or still incomplete

**Foundation in place:** Better Auth integration, session read/require for role layouts, optimistic Edge middleware, and placeholder `/login` / `/forbidden` routes—see **[features/frontend-auth-architecture.md](./features/frontend-auth-architecture.md)** and **`docs/project/development-phases.md`**.

**Still out of scope or incomplete (typical startup deferrals):**

- **Full authentication product:** sign-in UX, OAuth/OTP/password flows, persistence-backed users/sessions, and fine-grained RBAC beyond “has a session”
- **Domain persistence and REST APIs** (PostgreSQL, Prisma, marketplace modules)—direction in **[architecture/backend-architecture.md](./architecture/backend-architecture.md)**; not implemented in repo yet
- **Observability** (Sentry, PostHog, admin audit pipeline), **background jobs**, and production deployment wiring beyond local dev

Record major structural choices in **`docs/project/architecture-decisions.md`** and **`docs/architecture/backend-architecture.md`** (and short notes here or in feature docs when they affect the whole repo) as requirements become known.
