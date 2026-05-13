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
  app/                 # Routes, layouts, and route groups (Next.js App Router)
  components/
    ui/                # Design-system primitives (shadcn)
    shared/            # Cross-role reusable UI (no domain rules)
  config/              # App config, typed env accessors
  features/            # Domain modules (co-locate hooks, server actions, subcomponents later)
  hooks/               # Cross-cutting React hooks
  lib/                 # Pure utilities (no React assumptions unless clearly UI helpers)
  types/               # Shared TypeScript types
```

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

## What is deliberately not included yet

- Authentication, authorization, and session handling
- API clients, database access, and background jobs
- Observability, feature flags, and deployment-specific wiring

Add these with explicit ADRs (short notes in this folder) when the requirements are known.
