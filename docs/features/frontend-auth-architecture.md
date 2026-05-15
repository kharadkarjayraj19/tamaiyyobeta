# Tamaiyyo — frontend authentication integration architecture

**Maturity:** FOUNDATION  
**Purpose:** Describe how the **Next.js App Router frontend** integrates with **Better Auth** for unified login, session handling, and **role-aware** dashboards. **Foundation code** lives under `src/lib/auth/**` (see “Repository implementation”); full login UX, OTP/Google, and persistence are phased in later.

**Related docs:** `docs/features/auth-rbac.md` (platform auth/RBAC philosophy), **`docs/architecture/domain-models/identity-domain-model.md`** (phone-first identity, account types, session linkage), `docs/features/app-shell.md` (shell & nav extension points), `docs/features/design-system.md` (loading/error/trust UX), `docs/architecture.md`, **`docs/architecture/backend-architecture.md`** (persistence, API, and auth integration at MVP), `docs/frontend-guidelines.md`, `.cursorrules`.

**Non-goals (this milestone):** full sign-in UI, OTP/Google flows, database-backed user tables, booking/pricing logic, or legal/compliance claims.

---

## 1. Frontend auth philosophy

- **Thin presentation, thick server checks:** the browser renders auth UI and reflects session state, but **every sensitive read and mutation** is validated with Better Auth / server session on the **server** (see `docs/features/auth-rbac.md` §5–6).
- **Unified entry:** one Tamaiyyo sign-in experience drives all roles; the frontend does not fork unrelated login UIs per role unless product explicitly requires it later.
- **Progressive enhancement:** prefer rendering **public** shells immediately and **upgrading** to authenticated chrome once session is known—avoid long blank screens except where security demands a hard block.
- **Documentation-first:** when Better Auth configuration choices are made (cookie names, session shape exposure, OAuth providers), record them here or in a short ADR and bump **Maturity**.

---

## 2. Better Auth integration philosophy

- **Stay close to upstream patterns:** use Better Auth’s documented Next.js App Router integration paths (route handlers / server utilities) rather than inventing parallel token pipelines—reduces security drift and upgrade pain.
- **Single integration seam:** isolate Better Auth–specific imports and types behind a small **app-level module** (conceptual “auth adapter” layer) so UI components depend on **stable app types** (`Session`, `User`, `entitlements`) rather than library internals.
- **Cookies as the default web transport:** assume **HTTP-only session cookies** for browser sessions unless a future API-client requirement forces an additional pattern; document exceptions if they arise.
- **Avoid leaking server secrets to the client:** client bundles must only see **non-sensitive** projections (display name, avatar URL policy, role flags explicitly intended for UI).

---

## 3. Session lifecycle strategy

- **Establishment:** successful login establishes a Better Auth session; the frontend transitions from unauthenticated → authenticated routes per redirect rules (§10).
- **Use:** each request to protected server code should resolve the **current session** (or explicit “none”)—no implicit globals in UI.
- **Refresh / continuation:** rely on Better Auth’s session validity and renewal semantics; the frontend should tolerate **brief** revalidation windows without flashing privileged UI (§12, §17).
- **Termination:** logout clears the Better Auth session per library behavior; the frontend must reset **client-side projections** (if any) and navigate to a **public** safe route.

---

## 4. App Router auth integration strategy

- **Route handlers as the auth HTTP surface:** Better Auth’s API belongs in **Next route handlers** (or the framework-supported equivalent), not duplicated in ad-hoc REST routes—one authoritative HTTP layer for sign-in, sign-out, callbacks, and session probes.
- **Layouts own “where auth applies”:** **public** route segments use minimal layout; **authenticated** route trees (`/customer`, `/supplier`, `/admin`, and future app areas) use layouts that **assume** session resolution occurs (or suspend/fallback—§17).
- **Server Components first:** prefer reading session and entitlements in **Server Components** / layout `async` functions and passing **serializable** props to client islands (nav, interactive shell).
- **Server Actions:** when mutations are introduced, validate session + RBAC **inside** each action—never trust client-only guards.

---

## 5. Middleware architecture

- **Narrow responsibility:** Next.js `middleware` performs **fast** checks—typically cookie/session presence, coarse redirects, and static allow/deny for path **classes**—not full RBAC evaluation (aligns with `docs/features/auth-rbac.md` §10).
- **Matcher discipline:** scope middleware to paths that benefit from edge checks; exclude static assets and Better Auth internal paths per Better Auth guidance to avoid redirect loops.
- **Cooperation, not duplication:** middleware outcomes should **align** with layout/server checks, but **not replace** them—defense in depth without two divergent sources of truth.
- **Failure mode:** on uncertain session at the edge, prefer **conservative redirects** (e.g. to login) only when product confirms that behavior for those paths; otherwise defer to origin resolution with neutral loading (§17).

---

## 6. Protected route strategy

- **Path classes:**
  - **Public:** marketing root, legal pages, auth pages, health checks, OAuth/magic-link callbacks as required by Better Auth.
  - **Authenticated:** role dashboard trees and any future in-app routes requiring identity.
- **Double gating:** combine **middleware** (optional coarse gate) with **layout or page-level server checks** (authoritative) for protected trees.
- **Deep links:** a bookmark to `/admin/...` must run the same checks as navigation from within the app—no “only protected when entered via menu” shortcuts.

---

## 7. Role-aware rendering strategy

- **Derive role context server-side:** layouts under `/customer`, `/supplier`, `/admin` already encode **spatial** role; **authorization** must confirm the session may enter that tree (see `docs/features/auth-rbac.md` §4, §6).
- **Composition over branching:** keep `RoleDashboardShell` role prop aligned with **route prefix**, but **gate** rendering of the shell (or swap to forbidden UX) if the session lacks access—implementation detail TBD without inventing workflows.
- **Multi-role users:** if one identity may access multiple trees, define a single **source of truth** list of allowed route families for that session and render role switchers / entry points from that list—do not scatter role logic across pages.

---

## 8. Navigation filtering strategy

- **Single entitlement projection:** build the sidebar/drawer item list by **merging** static route metadata (`src/config/navigation.ts` per `docs/features/app-shell.md`) with a **server-produced** “visible links” structure derived from RBAC.
- **No duplicate matrices:** the same permission inputs should feed **nav visibility** and **page access**; if they diverge, treat it as a bug class.
- **Client nav components:** `NavLink` / `Sidebar` remain presentational; they receive **already-filtered** items from a parent that resolved permissions on the server (or from a carefully bounded client cache—§15–16).

---

## 9. Authenticated app shell behavior

- **Shell after auth:** `RoleDashboardShell` remains a **presentation** shell; authenticated behavior means **wrapping or feeding** it from an auth-aware layout layer that guarantees session validity for that route tree (see `docs/features/auth-rbac.md` §14).
- **Chrome slots:** user menu, sign-out, and account entry live in **`TopNavbar` trailing** (per `docs/features/app-shell.md` §79)—implemented as small feature components, not embedded auth logic inside `components/shared/ui` primitives.
- **Trust UX:** loading and error transitions follow `docs/features/design-system.md` (skeleton-first, honest errors, no fake guarantees).

---

## 10. Login redirect strategy

- **Return URL:** preserve intended destinations with an **allowlisted** approach (same site, known path prefixes) to mitigate open redirects—exact allowlist rules TBD with product/security.
- **Post-login landing:** default destination after login should follow the **unified** policy in `docs/features/auth-rbac.md` §2 (last role, permitted highest, or explicit picker—**product decision**).
- **Already authenticated:** visits to `/login` while signed in should redirect to an appropriate app home without loops.

---

## 11. Unauthorized / forbidden UX behavior

- **401-like (unauthenticated):** redirect or interstitial to **unified login** with optional return URL (§10); messaging stays neutral and factual (`docs/features/design-system.md`).
- **403-like (authenticated, not permitted):** render a **forbidden** view within the closest sensible layout (or dedicated route), without exposing privileged layout chrome or sensitive nav items.
- **Consistency:** align copy and layout with `docs/features/auth-rbac.md` §15; never rely solely on browser alerts.

---

## 12. Session refresh philosophy

- **Prefer implicit refresh:** rely on Better Auth’s documented session refresh / validation when users interact or on a conservative interval—avoid bespoke timers unless a measured need appears.
- **Visible re-auth:** when step-up or re-login is required (future flows), block only the affected action with clear recovery—not the entire app unless necessary.
- **Client cache TTL:** if a small client-side session projection is introduced, keep **short TTLs** and reconcile on navigation to prevent stale privilege display.

---

## 13. Public vs protected route philosophy

- **Explicit inventory:** maintain a living list of **public** vs **protected** prefixes when implementation begins; review on every major route addition (aligns with `docs/features/auth-rbac.md` §6).
- **Marketing freedom:** `/` and related public marketing routes stay fast and cache-friendly; avoid importing heavy auth client bundles into those entry points unnecessarily.
- **API routes:** any custom API used by the app should mirror the same **session resolution** strategy as RSC layouts—no shadow authentication stacks.

---

## 14. Future Flutter / mobile compatibility considerations

- **Conceptual parity:** mobile clients should target the **same identity and entitlements model**, even if Better Auth is not the in-app SDK—session issuance may differ (tokens vs cookies), but **permission names and checks** should stay aligned with `docs/features/auth-rbac.md` §12.
- **Deep links:** mobile deep links into role surfaces require the same **authorization** story as web deep links.
- **Logout / revocation:** design web flows so that global revocation policies can extend to mobile without contradictory UX.

---

## 15. Server vs client auth boundaries

- **Server is authoritative:** session resolution, RBAC checks, and data access run on the server (RSC, route handlers, server actions, backend APIs).
- **Client is indicative:** client hooks or context (if used) only mirror server state for UX; they must **revalidate** on navigation and after mutations.
- **Secrets:** never expose Better Auth secret keys, token signing keys, or database credentials to the client bundle—server-only modules per `docs/architecture.md` env patterns.

---

## 16. Auth state hydration philosophy

- **Avoid flash of wrong role:** first paint on protected routes should prefer **neutral skeleton** or **static shell** until session is known, then commit to authenticated or redirect—per `docs/features/auth-rbac.md` §7 and design-system loading guidance.
- **Minimize client-only initial role:** where possible, pass **serialized** session snapshot from server into client islands to reduce hydration mismatch.
- **No double sources:** if both server and client expose session, define **one** invalidation story on logout and permission change.

---

## 17. Loading states during auth resolution

- **Use existing primitives:** leverage `loading.tsx` and shared skeleton patterns (`docs/features/app-shell.md`) for route transitions during session checks.
- **Deterministic fallbacks:** define whether protected layouts show **shell chrome** during resolution or a **minimal spinner**—pick one default per role tree and document when implementation lands.
- **Avoid content peek:** do not render privileged tables or identifiers until authorization completes.

---

## 18. Edge cases

- **Race:** user logs out in one tab while another tab navigates—define expected behavior (hard navigation vs toast + redirect).
- **Stale client cache:** permission change server-side while client holds old projection—prefer server revalidation on navigation; consider explicit “refresh permissions” only if product demands.
- **OAuth callback failures:** user abandons flow mid-way—return to login with **actionable** error state, not a dead end.
- **Clock skew / expiry edge:** session expires mid-interaction—save draft flows at feature level when product defines them; auth layer should surface **re-auth** consistently.
- **Middleware vs RSC disagreement:** treat as defect; tests should cover representative paths for each role tree.

---

## 19. Future extensibility

- **Additional OAuth / SSO:** Better Auth plugins and provider configuration should extend the adapter layer without rewriting shells.
- **Step-up MFA / risk signals:** reserve hooks in the adapter for future policies without entangling feature pages.
- **B2B supplier staff accounts:** may require **tenant context** in session projections—model as additive fields once product defines (`docs/features/auth-rbac.md` §19–20).
- **Admin impersonation (if ever):** extremely sensitive; if introduced, must be explicit in `docs/features/auth-rbac.md` and mirrored here with UI labeling requirements—**default off**.

---

## 20. Open implementation questions

Answer and date these as decisions land; do **not** implement guesses.

1. **Better Auth database adapter:** which backing store and pooling strategy for production vs local dev?
2. **Session cookie attributes:** `SameSite`, `Secure`, subdomain scope for future staging/production hosts?
3. **Email vs OAuth priority:** which primary factors for v1 login surface?
4. **Session payload shape exposed to RSC:** which user fields and entitlement structures are serialized to layouts?
5. **Middleware strictness:** hard-redirect unauthenticated users at edge for all `/customer|/supplier|/admin` or only subset?
6. **Client session hook:** will the app use Better Auth’s client helpers, or stay RSC-first with minimal client state?
7. **CSRF strategy:** how do Server Actions and Better Auth interact for cross-site request protections in the chosen deployment?
8. **Rate limiting & abuse:** handled at edge, origin, or both—for login and session endpoints?
9. **Testing strategy:** how to integration-test protected layouts without flaking on real IdP (fixtures, test doubles)?
10. **Observability:** which auth events are logged client vs server, and what PII must never appear in logs?

---

## Repository implementation (foundation)

This section maps the **current repo** wiring (Better Auth ≥1.6, Next.js App Router). Update it when files move or behavior changes.

| Concern | Location |
| --- | --- |
| Better Auth server instance | `src/lib/auth/instance.ts` (server-only; **stateless** cookie cache, `emailAndPassword` off until flows ship) |
| Session read (RSC / Server Actions) | `src/lib/auth/session.ts` — `getSession()` via `auth.api.getSession` + `react` `cache` |
| Protected layout gate | `src/lib/auth/require-session.ts` + `src/features/auth/role-dashboard-with-auth.tsx` |
| HTTP handler | `src/app/api/auth/[...all]/route.ts` — `toNextJsHandler(auth)` |
| React client (Client Components only) | `src/lib/auth/client.ts` — `createAuthClient` from `better-auth/react` |
| Public vs role paths | `src/lib/auth/guards.ts` — `ROLE_PATH_PREFIXES`, `LOGIN_PATH`, `buildLoginRedirect` |
| Server env | `src/config/env/auth.ts` — `BETTER_AUTH_SECRET` / `BETTER_AUTH_URL` (see `.env.example`) |
| Edge middleware (optimistic) | `src/middleware.ts` — checks cookie **name prefix** `better-auth.session_token` (Edge-safe; **not** cryptographic validation) |
| Client session bridge | `src/features/auth/session-bridge-provider.tsx` — minimal context for future navbar UI |
| Placeholder routes | `src/app/login/page.tsx`, `src/app/forbidden/page.tsx` |

**Production:** set a high-entropy `BETTER_AUTH_SECRET` (≥32 chars). The codebase falls back to a **dev-only** placeholder when unset so `next build` can run in CI; **never ship** with the placeholder secret.

**Middleware toggle:** `AUTH_MIDDLEWARE_ENABLED=false` disables optimistic redirects (local UX only).

**Future Google / OTP:** extend `instance.ts` with `socialProviders` / official plugins; keep the adapter file as the single seam.

---

## Revision log

| Date | Change |
| --- | --- |
| 2026-05-13 | Initial DRAFT: frontend + Better Auth integration architecture (no code, no backend schema). |
| 2026-05-14 | **FOUNDATION:** repo wiring — `instance`, `session`, API route, Edge middleware (cookie prefix), `RoleDashboardWithAuth`, `SessionBridgeProvider`, `/login` + `/forbidden` placeholders. |

As RBAC and providers land, extend the “Repository implementation” table and §20; move **Maturity** toward `MVP` when login flows are production-ready.
