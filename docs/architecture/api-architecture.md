# Tamaiyyo — API architecture (executable contract philosophy)

**Maturity:** FOUNDATION  
**Purpose:** Define **executable API architecture** for Tamaiyyo: REST contract structure, route organization, auth enforcement, validation, responses, and how route handlers interact with domain modules—**without** OpenAPI files, handler implementations, or database schemas.

**Related docs:** [`docs/architecture/backend-architecture.md`](./backend-architecture.md) (modular monolith, stack), **[`docs/architecture/prisma-data-architecture.md`](./prisma-data-architecture.md)** (repositories, transactions), **[`docs/architecture/prisma-schema-planning.md`](./prisma-schema-planning.md)** (schema blueprint), [`docs/features/frontend-auth-architecture.md`](../features/frontend-auth-architecture.md) (Better Auth), [`docs/features/auth-rbac.md`](../features/auth-rbac.md) (RBAC, ownership), [`docs/architecture/domain-models/`](./domain-models/README.md) (entities), marketplace **`docs/features/*.md`**, [`docs/architecture.md`](../architecture.md).

**Non-goals (this document):** OpenAPI/JSON Schema artifacts; Prisma models; payment webhook payload specs; exact permission string catalogs.

---

## How to read this spec

| Label | Meaning |
| --- | --- |
| **Implemented** | Present in the repository today. |
| **Planned** | Agreed contract architecture for MVP; not fully built. |
| **Exploratory** | Optional later; not mandatory until promoted. |

---

## 1. API architecture philosophy

**Planned**

- **REST-first:** Resource-oriented HTTP with JSON bodies; predictable verbs and status codes.
- **Domain-oriented:** Routes and handlers align with **`src/features/<domain>/`** and **`docs/features/*.md`**—not ad-hoc “utils” endpoints.
- **Modular-monolith compatible:** One deployable Next.js app; APIs call **in-process services**—no network hop between domains at MVP.
- **Mobile-compatible:** Contracts are **versioned**, **stable**, and **documented** so a future mobile client can consume the same `/api/v1/*` surface as the web app—web may also use Server Actions for some mutations, but **domain rules live once** in shared services.

**Implemented**

- **Better Auth** HTTP surface at **`/api/auth/*`** only (`src/app/api/auth/[...all]/route.ts`).

**Exploratory**

- GraphQL or tRPC for a subset of reads.

---

## 2. Route organization philosophy

**Planned**

- **Domain-first paths** under **`/api/v1/`** (see §3), grouped by resource—not by React route folders:
  - Examples (illustrative): `/api/v1/bookings`, `/api/v1/suppliers/me/vehicles`, `/api/v1/admin/suppliers/{id}/verify`
- **Shared backend, role enforcement:** Same handlers and services serve customer, supplier, and admin **where the resource is shared**; **authorization** differs by session account type and entitlements—not duplicate APIs per role unless response shape truly diverges.
- **Auth isolation:** **`/api/auth/*`** remains **outside** `/api/v1/` for Better Auth callbacks and session endpoints.

**Unresolved mechanics**

- Prefix for **webhooks** (e.g. `/api/webhooks/payments`) vs versioned domain API.

**Exploratory**

- BFF-style `/api/v1/customer/*` mirrors if mobile needs narrower payloads.

---

## 3. Versioning philosophy

**Planned**

- **Structure:** All domain REST lives under **`/api/v1/`**—breaking contract changes require **`v2`**, not silent behavior drift.
- **Future evolution:** Additive fields and optional query params are allowed in **v1**; removing or retyping fields requires a new major version or explicit deprecation window—policy **Unresolved mechanics**.
- **Internal-only at MVP:** **Planned** consumers are this repo’s web UI and future mobile; no public partner API until explicitly opened (`backend-architecture.md` §7).

**Implemented**

- No `/api/v1/` domain routes yet.

**Exploratory**

- Date-based versioning headers in addition to path.

---

## 4. Authentication & authorization philosophy

**Implemented**

- **Better Auth integration:** Session via cookies on **`/api/auth/*`**; server `getSession()` for RSC and future handlers (`frontend-auth-architecture.md`).

**Planned**

- **Server-authoritative enforcement:** Every mutating and sensitive **read** handler resolves session, **account type** (customer / supplier / admin), and **entitlements** before calling services—never trust client-only guards.
- **Ownership enforcement:**
  - **Customer** — access only own bookings, bills, payments.
  - **Supplier** — access only own fleet, drivers, assigned/offered bookings, own settlement views.
  - **Admin** — cross-tenant reads/writes per RBAC; highest scrutiny on financial overrides.
- **Admin override posture:** Admin endpoints explicitly named (e.g. under `/api/v1/admin/`) or flagged via permission; overrides **emit audit events** (`billing-domain-model.md` §9–10, `supplier-operations.md` §8).
- **401 vs 403:** Unauthenticated → **401**; authenticated but not permitted → **403** (`auth-rbac.md` §6).

**Unresolved mechanics**

- Bearer tokens for mobile vs cookie sessions; API keys for partners.

**Exploratory**

- Step-up auth header for high-risk admin financial actions.

---

## 5. Validation philosophy

**Planned**

- **Server-side business validation mandatory:** All rules from **`docs/features/*.md`** and **domain models** enforced in **validators** / services—invalid transitions return **4xx** with operational error codes (§6).
- **Frontend validation for UX only:** Client checks (required fields, formats) improve UX but **never** replace server validation.
- **Input parsing:** Use shared schemas (e.g. Zod) at handler boundary; map to domain commands—exact library **Unresolved mechanics**.

**Exploratory**

- Dry-run endpoints (“validate only”) for complex booking forms.

---

## 6. Standardized response philosophy

**Planned**

- **Success envelope** (conceptual):
  - `data` — resource or collection payload
  - `meta` — pagination, optional warnings
- **Error envelope** (conceptual):
  - `error.code` — **stable machine-readable** operational code (e.g. `BOOKING_NOT_ASSIGNABLE`, `SUPPLIER_PENDING_VERIFICATION`)
  - `error.message` — human-readable, safe for UI
  - `error.details` — optional field-level issues (validation)
- **HTTP status:** Align with REST norms (400 validation, 401/403 auth, 404 missing or not visible, 409 state conflict, 422 semantic rule violation—exact mapping **Unresolved mechanics**).

**Implemented**

- No domain API envelope yet.

**Exploratory**

- Problem+json (`application/problem+json`) profile.

---

## 7. Pagination, filtering & sorting philosophy

**Planned**

- **Pagination:** Cursor-based preferred for large lists (bookings feed); offset acceptable for small admin tables at MVP—default page size caps **Unresolved mechanics**.
- **Sorting:** Explicit `sort` param whitelist per resource (e.g. `createdAt`, `tripStartDate`).
- **Operational filters:** Whitelist filters only (e.g. `status`, `dateFrom`, `dateTo`, `supplierId` for admin)—reject unknown filters rather than ignore silently.

**Exploratory**

- Full-text search on bookings for admin.

---

## 8. Upload / API interaction philosophy

**Planned**

- **Uploads** use **presigned object storage** URLs issued by API; client uploads **direct to storage**; API records **metadata** (key, mime, uploader, linked entity)—aligns with `backend-architecture.md` §6.
- **Separate from JSON CRUD:** `POST /api/v1/.../uploads/presign` (illustrative) returns short-lived URL; `POST .../attachments` links file to vehicle/supplier/booking.
- **Size/type limits** and virus scan **Unresolved mechanics**.

**Exploratory**

- Multipart upload through origin for tiny files only.

---

## 9. Audit / event relationship philosophy

**Planned**

- **Internal audit events:** Mutations append **domain/financial audit** records (`booking-domain-model.md` §12, `billing-domain-model.md` §9)—**not** returned in full to customers by default.
- **Customer-facing timeline:** Subset of events exposed via dedicated read models (e.g. “booking status updates”)—curated, non-sensitive—**field allowlist** **Unresolved mechanics**.
- **API handlers** call services that **write audit + emit in-process hooks** (notifications, analytics)—handlers do not write audit ad hoc.

**Exploratory**

- Customer downloadable trip receipt including financial summary only.

---

## 10. Notification / API integration philosophy

**Planned**

- APIs **do not** send SMS/email directly; they enqueue or call **`notifications`** module with **event type + entity ids** (`billing-domain-model.md` §12).
- **Idempotent triggers:** Same business event should not double-notify without explicit retry policy—**Unresolved mechanics**.

**Implemented**

- None.

**Exploratory**

- Webhook outbox for supplier TMS.

---

## 11. Analytics / event hook philosophy

**Planned**

- Handlers/services emit **product analytics hooks** (e.g. PostHog) with **non-PII** properties where possible—orthogonal to financial audit.
- **Server-side only** for authoritative business events; client analytics complements, does not replace.

**Implemented**

- PostHog not wired.

**Exploratory**

- Unified event bus for analytics + audit (still in-process at MVP).

---

## 12. Backend module interaction philosophy

**Planned — request path**

```text
Route Handler (app/api/v1/.../route.ts)
  → parse session + parse input
  → Validator (feature/*/validators or shared)
  → Service (feature/*/services) — business rules, transactions
  → Repository (feature/*/repositories) — Prisma access
  → map to response DTO
```

**Planned — rules**

- **Handlers stay thin:** No business rules buried only in route files.
- **Services** orchestrate cross-module calls via **public service APIs**, not repository reach-across.
- **Repositories** are the only layer that talks to Prisma (when adopted).
- **Server Actions** (if used) call the **same services** as REST handlers—no duplicated rules.

**Implemented**

- Pattern documented; **auth** partially follows (lib + route handler).

**Exploratory**

- Command bus between modules.

---

## 13. Future extensibility considerations

**Planned**

- **Mobile reuse:** Stable `/api/v1/` + error codes + pagination contracts documented before mobile repo starts.
- **Extraction readiness:** Services behind interfaces so a domain can move to a worker with **HTTP adapter** later.
- **Microservice compatibility:** Avoid leaking Next-specific types into service cores; use plain TypeScript domain types.

**Exploratory**

- Public partner API with OAuth scopes separate from user sessions.

---

## 14. Operational / admin API philosophy

**Planned**

- **Admin namespace:** `/api/v1/admin/*` for verification, overrides, pricing config, payout batch controls, support notes—**strictest RBAC** and **audit** on every mutation.
- **Dangerous operations** (manual refund, reassignment, bill adjustment) require explicit endpoints—not generic “update booking” with hidden side effects.
- **Support read** endpoints may aggregate booking + bill + timeline for ops—PII minimization per `auth-rbac.md`.

**Unresolved mechanics**

- Dual-control (two-person approval) for selected admin mutations.

**Exploratory**

- Read-only support API token with scoped access.

---

## Illustrative route map (non-exhaustive)

| Area | Illustrative prefix | Primary actor |
| --- | --- | --- |
| Auth | `/api/auth/*` | All |
| Customer bookings | `/api/v1/bookings` | Customer |
| Supplier fleet | `/api/v1/suppliers/me/vehicles`, `.../drivers` | Supplier |
| Supplier bookings | `/api/v1/suppliers/me/bookings` | Supplier |
| Admin | `/api/v1/admin/*` | Admin |
| Pricing (admin) | `/api/v1/admin/pricing/*` | Admin |

Exact paths are **Planned**; behavior authority remains **`docs/features/*.md`**.

---

## Document boundaries

**Planned**

- **`api-architecture.md`** owns **HTTP contract philosophy** and handler layering.
- **`backend-architecture.md`** owns stack, deployment, modules list.
- **Domain models** own entities; **feature docs** own business rules.

---

## Revision log

| Date | Change |
| --- | --- |
| 2026-05-18 | **FOUNDATION:** REST philosophy, `/api/v1/`, auth/RBAC, validation, responses, pagination, uploads, audit/notifications/analytics hooks, handler layering, admin APIs. |

When first `/api/v1/` handlers ship, add implementation notes and optional OpenAPI generation decision.
