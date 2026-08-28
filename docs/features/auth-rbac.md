# Tamayo — authentication & RBAC architecture specification

**Maturity:** DRAFT  
**Purpose:** Define a **documentation-first**, scalable approach to authentication, sessions, roles, and authorization for Tamayo’s multi-role web platform—without binding to a specific identity provider, token format, or legal/compliance regime.

**Related docs:** `docs/architecture.md` (routing, repo boundaries), **`docs/architecture/domain-models/identity-domain-model.md`** (separate customer/supplier **identities**, account lifecycles), `docs/features/app-shell.md` (role-aware shell & navigation extension points), `docs/features/design-system.md` (trust-oriented UX, error/empty patterns), **`docs/features/frontend-auth-architecture.md`** (Better Auth + Next.js wiring in this repo), `docs/frontend-guidelines.md`, `.cursorrules`.

**Non-goals in this document:** concrete API schemas, vendor selection, India-specific statutory language, or implementation code.

---

## 1. Authentication philosophy

- **Identity is a platform concern, not a page concern:** authentication flows (credential capture, MFA, OAuth redirects, magic links—whatever is chosen later) should live behind clear boundaries so role dashboards do not each re-implement sign-in.
- **Least surprise:** users should recognize a **single Tamayo sign-in** entry, regardless of which role experience they ultimately use.
- **Defense in depth (conceptual):** authentication verifies *who* someone is; authorization (RBAC) verifies *what* they may do. The system should never confuse the two.
- **Document before code:** when an auth provider or protocol is selected, record the decision in this file (or a linked ADR in `docs/`) and update **Maturity** when the design stabilizes.

---

## 2. Unified login philosophy

- **One front door:** a **unified login** surface (URL or flow family) is the default—users are not asked to remember separate “supplier login” vs “customer login” URLs unless a future product decision explicitly requires it.
- **Role is not a login field by default:** collecting “I am a supplier” at login time is brittle (users mis-select; accounts change). Prefer deriving **entitlements** from the authenticated identity server-side, then driving UI.
- **Post-login routing:** after successful authentication, route users to a **safe default** (e.g. last-used role, highest-privilege permitted surface, or an explicit role picker **only** if the product requires multi-role switching for the same identity). Exact rules belong here once product defines them.
- **Marketing vs app:** public marketing pages remain accessible without auth; **role dashboards** (`/customer`, `/supplier`, `/admin`) require appropriate session + authorization.

---

## 3. Session management philosophy

- **Server-first truth:** the canonical session (what the user is allowed to do) should be **verifiable on the server** for every sensitive action. Client-visible state is a projection, not the source of truth.
- **Short-lived credentials where possible:** prefer short-lived access artifacts plus renewal mechanisms over long-lived static secrets in the browser—exact mechanics depend on the chosen stack (cookies vs bearer tokens, rotation strategy, etc.).
- **Explicit logout:** users should be able to end a session deliberately; logout should clear application session state and coordinate with the identity layer as required by the chosen provider.
- **Cross-tab coherence (web):** define an expected behavior for multiple tabs (shared session, logout everywhere vs local-only) when implementation begins—do not leave it implicit.

---

## 4. Role architecture

Tamayo recognizes three **product roles** for the web platform:

| Role | Primary intent (product-level, not technical) |
| --- | --- |
| **Customer** | Book and manage outstation travel as a buyer. |
| **Supplier** | Operate partner-facing workflows (fleet/trips—**to be specified** in feature docs). |
| **Admin** | Operate platform administration (**to be specified** in feature docs). |

**Architecture principles:**

- **Roles vs entitlements:** a “role” in UX may map to one or more **entitlements** or **permission sets** internally; avoid hard-coding a 1:1 assumption until product confirms whether users can hold multiple concurrent hats.
- **Stable route families:** URL prefixes (`/customer`, `/supplier`, `/admin`) remain the **spatial** separation for dashboards; whether one identity may access more than one family is an **authorization** decision, not a routing trick alone.
- **Representation in data:** persist role/permission data in shapes that can be audited and updated without redeploying the frontend—exact schema TBD with backend.

---

## 5. RBAC philosophy

- **RBAC over ad-hoc flags:** prefer named permissions (e.g. `booking:read`, `supplier.fleet:write`) grouped into roles/profiles over scattered boolean props—**permission strings in this doc are illustrative only** until product defines them.
- **Deny by default:** if a permission is not granted, the action is not available; UI should not expose irreversible controls that the server would reject.
- **Server enforcement:** every mutation and sensitive read must be **authorized on the server**; UI hiding is optimization, not security.
- **Admin is high-impact:** administrative capabilities should use the strictest permission checks and clearest audit trail (see §17)—specific events TBD.

---

## 6. Route protection strategy

- **Layered model (recommended pattern to implement later):**
  1. **Edge / middleware** — cheap checks: presence of session cookie, optional coarse redirects, CSRF-related patterns if applicable to the chosen stack.
  2. **Server Components / route handlers** — authoritative checks for role/permission before rendering sensitive data or accepting mutations.
  3. **Client** — reflect permissions for UX only; never as sole enforcement.

- **Public vs protected route lists:** maintain an explicit inventory of **public paths** (marketing, health, auth callbacks) vs **authenticated paths** when implementation starts; avoid accidental protection gaps when adding routes.

- **Forbidden vs unauthenticated:** distinguish **not signed in** (401-like UX: sign-in) from **signed in but not allowed** (403-like UX: forbidden)—see §15.

---

## 7. Layout rendering strategy

- **Authenticated layout composition:** role layouts (`RoleDashboardShell` and successors) should receive **only** what they need to render chrome (role context, permitted nav items, user display hints)—injected via server composition or secure client projections, not by embedding secrets in props.

- **No sensitive data in shared shell:** `components/shared/**` remains presentation-only per `docs/features/app-shell.md`; **auth state shaping** lives in app-level or `src/features/*` modules once built.

- **Loading and streaming:** while session is resolving, prefer **skeleton** or neutral placeholders consistent with `docs/features/design-system.md`; avoid flashing privileged content before authorization completes.

---

## 8. Navigation visibility rules

- **Build nav from entitlements:** navigation entries (today configured in `src/config/navigation.ts`) should eventually be **filtered or augmented** from the same permission model the server uses—not a second hard-coded matrix.

- **Hide vs disable:** for disallowed but soon-available actions, product may choose **disabled** with explanation vs **hidden**; default recommendation is **hide** navigational destinations the user can never access, and **disable** contextual actions that might become available (document per feature).

- **Deep links:** if a user hits a deep URL they lack permission for, respond with **forbidden UX** (§15) rather than redirecting silently to an unrelated role surface unless product specifies otherwise.

---

## 9. Permission model philosophy

- **Resource-oriented thinking:** permissions should align with domain resources (bookings, vehicles, users, payouts—**examples only**) once domain specs exist.

- **Scoping:** consider **tenant/supplier scope** for partner data vs **global** admin scope; this marketplace likely needs **data scope** in addition to binary role checks—confirm with product before implementing.

- **Versioning:** permission names may evolve; plan for **additive** changes (new permissions) over renaming/removing without silent behavior drift.

---

## 10. Middleware strategy

- **Purpose:** Next.js `middleware` (or equivalent edge logic) should handle **early, fast** decisions—typically cookie presence, coarse redirects, and security headers—not complex RBAC graphs.

- **Heavy logic elsewhere:** fine-grained authorization and data access belong **close to data** (server actions, route handlers, backend services)—middleware should not become a second application server.

- **Observability:** when auth middleware runs, log **minimal structured metadata** (correlation id, outcome class) suitable for debugging—avoid logging secrets or PII; retention policy TBD with infra.

---

## 11. JWT/session payload philosophy

- **Minimize claims in browser-visible tokens:** if JWTs or signed cookies are used, prefer **small, non-sensitive claims** (subject id, session id, expiry) and load entitlements server-side when needed.

- **Rotation & invalidation:** design for **logout**, **password reset**, **admin revocation**, and **compromise response** paths up front—even if initially manual—so payload size and TTL choices do not paint the platform into a corner.

- **No PII surplus:** national IDs, phone numbers, and payment artifacts should not ride in front-channel tokens unless a future threat model explicitly requires it (unlikely).

---

## 12. Future extensibility

- **Additional roles or sub-roles:** model permissions so new partner types or internal roles can be added without rewriting every layout.

- **Delegated access / agents:** if suppliers ever delegate to staff accounts, anticipate **impersonation or sub-user** patterns in the permission model (open question—§20).

- **API vs web parity:** any permission introduced for the web app should have a clear story for **mobile or partner APIs** when they arrive (same entitlement names where possible).

---

## 13. Supplier / admin / customer isolation boundaries

- **Data isolation:** supplier operational data must not leak into customer views; admin views may cross-cut for support—**exact policy is product + legal**, not assumed here.

- **URL isolation:** separate prefixes reduce accidental coupling; **authorization must still enforce** boundaries even if URLs are guessed.

- **Shared components:** cross-role UI primitives remain shared; **domain data** never crosses role boundaries without explicit permission checks.

- **Support / impersonation (optional future):** if admins can act on behalf of users, that is a **high-risk** capability requiring explicit specs (who may impersonate, audit requirements, session labeling)—not enabled by default in this architecture vision.

---

## 14. Authenticated app shell behavior

- **Shell assumes authenticated context only inside protected trees:** the existing `RoleDashboardShell` should eventually be wrapped or fed by an **auth-aware composition layer** that guarantees session validity before rendering role chrome—exact pattern (layout segment vs HOC vs server wrapper) to be decided at implementation time.

- **User affordances:** sign-out, account/settings entry points should appear in predictable chrome locations (e.g. `TopNavbar` `trailing` per `docs/features/app-shell.md` extension guidance)—copy and exact controls TBD.

- **Role switcher:** if one identity may access multiple role dashboards, provide an explicit, audited switcher; otherwise omit to reduce confusion.

---

## 15. Unauthorized / forbidden UX philosophy

- **Unauthenticated:** clear path to **unified login**; preserve return URL when safe to do so (open redirect risks must be mitigated when designed).

- **Forbidden:** calm, factual messaging per `docs/features/design-system.md` trust principles—no blameful tone; offer **next steps** (switch account, contact support, return home) as product defines.

- **Do not leak existence** of protected resources where product/security policy requires opacity—mirror that policy consistently in APIs and UI.

---

## 16. Session expiration philosophy

- **Soft expiry:** prefer refresh flows that are invisible to the user when safe; show non-blocking status when re-auth is needed soon (product copy TBD).

- **Hard expiry:** on failure, return user to **unified login** with context preserved where appropriate; ensure in-flight mutations fail gracefully with retry guidance.

- **Clock skew & offline:** web clients should tolerate minor skew; document behavior for **offline** or **sleep resume** when PWA or mobile wrappers appear.

---

## 17. Audit / security considerations

- **Audit-worthy events (illustrative, not exhaustive):** login success/failure, logout, permission denials on sensitive actions, admin mutations, supplier pricing or payout changes—**final list must come from product + risk review**.

- **Correlation:** use request/session correlation identifiers across services for investigations—format TBD with backend.

- **Security headers & CSRF:** follow framework and deployment guidance when stack is chosen; record decisions in `docs/architecture.md`.

- **This document does not define legal retention, DPIA, or statutory obligations**—engage appropriate advisors when the product handles regulated data.

---

## 18. Future mobile compatibility

- **Same identity, potentially different clients:** mobile apps should consume the **same entitlement model** and session lifecycle concepts, even if transport details differ.

- **Token storage:** native platforms have different secure storage constraints; plan for **refresh** and **revocation** parity with web.

- **Deep linking:** mobile deep links into role-specific screens must undergo the same **authorization checks** as web deep links.

---

## 19. Edge cases

- **User gains or loses a role while logged in:** require **session refresh** or forced re-auth depending on severity; avoid stale UI showing revoked capabilities.

- **Concurrent sessions:** multiple devices—decide whether logout is global or per device when auth stack is known.

- **Partial platform outages:** identity provider unavailable—define degraded UX (read-only vs hard block) with product.

- **Supplier staff accounts vs company root:** if multiple logins under one supplier org are introduced, clarify primary vs delegated identities.

- **Race on first login:** first-time supplier onboarding vs admin approval queues—coordinate UX with relevant feature specs once written.

---

## 20. Open architecture questions

Record answers here as the team decides them; until then, **do not implement assumptions**.

1. **Identity provider:** self-hosted vs managed IdP vs custom? Protocols (OIDC, SAML, password + MFA)?
2. **Single identity across roles:** may one user be both customer and supplier? If yes, how is that represented and switched?
3. **Invitation model:** how are supplier and admin accounts created and bound to organizations?
4. **Fine-grained admin:** super-admin vs scoped admin (region, vertical)—needed day one or later?
5. **Multi-tenancy:** is supplier data strictly partitioned by `supplier_id` at the DB layer, and how does the session carry active tenant context?
6. **Payouts & financial actions:** which permissions are required, and do they mandate step-up auth or re-confirmation?
7. **Public APIs:** will partners integrate server-to-server, and how do OAuth scopes map to internal permissions?
8. **Impersonation / support access:** allowed at all? If yes, under what audit and notification rules?
9. **Session fixation / CSRF:** chosen cookie strategy and mitigations for Next.js App Router patterns?
10. **Localization of auth errors:** central copy strategy for Hindi/English (or more) once i18n exists?

---

## Revision log

| Date | Change |
| --- | --- |
| 2026-05-13 | Initial DRAFT: philosophy and cross-cutting auth/RBAC architecture (no provider, no legal claims). |

When decisions in §20 are made, add dated rows and bump **Maturity** toward `FOUNDATION` or `MVP` as appropriate.
