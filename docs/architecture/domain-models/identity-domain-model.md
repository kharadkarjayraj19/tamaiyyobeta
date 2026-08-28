# Tamayo — identity domain model (entity architecture)

**Maturity:** FOUNDATION  
**Purpose:** Foundational **identity and account entity** architecture: who exists on the platform, how **customer**, **supplier**, and **admin/support** actors relate to **authentication**, **verification**, **vehicles**, and **historical data**—without database schemas, APIs, or permission matrices.

**Related docs:** [`docs/features/auth-rbac.md`](../../features/auth-rbac.md) (auth/RBAC philosophy), [`docs/features/frontend-auth-architecture.md`](../../features/frontend-auth-architecture.md) (Better Auth wiring), [`docs/architecture/backend-architecture.md`](../backend-architecture.md) (`auth` module), [`docs/features/supplier-operations.md`](../../features/supplier-operations.md) (onboarding), [`docs/features/vehicle-management.md`](../../features/vehicle-management.md) (inventory), [`docs/project/current-state.md`](../../project/current-state.md).

**Non-goals (this document):** Prisma models; SQL DDL; OpenAPI; OTP vendor selection; statutory KYC language.

---

## How to read this spec

| Label | Meaning |
| --- | --- |
| **Implemented** | Present in the repository or binding platform decision **today**. |
| **Planned** | Agreed entity architecture for MVP; persistence and enforcement **not** fully built. |
| **Exploratory** | Optional later; not mandatory until promoted. |

---

## 1. Identity-domain philosophy

**Planned**

- **Identity is durable:** A platform **identity** (authenticated subject) outlives any single session, device, or UI role surface.
- **Accounts are typed:** Marketplace actors are modeled as **distinct account kinds** with different lifecycle rules—not one generic “user” blob with ad-hoc flags.
- **Authentication ≠ authorization:** Better Auth proves **who** is signed in; Tamayo domain logic decides **which account** and **what** they may do (`auth-rbac.md`).
- **Operational realism:** MVP favors **phone-first** sign-in, **manual supplier verification**, and a **single admin role** before fine-grained RBAC.

**Implemented**

- **Session gate** exists (Better Auth + role route layouts); **no** persisted identity/account entities in application data yet.

**Exploratory**

- **Delegated** supplier staff logins (dispatcher vs owner) as separate identities under an org.

---

## 2. Identity actor types

**Planned — core actors**

| Actor type | Entity focus | Primary surface |
| --- | --- | --- |
| **Customer** | Buyer identity; bookings and payments in customer context | `/customer` |
| **Supplier** | Partner org/person identity; fleet, acceptance, billing inputs | `/supplier` |
| **Admin / support** | Platform operator identity; verification, overrides, config | `/admin` (support may share admin posture at MVP) |

**Planned — conceptual entities (names illustrative)**

- **Identity** — authentication subject (e.g. phone number uniqueness, Better Auth user linkage).
- **Customer account** — marketplace profile bound to **one** customer identity.
- **Supplier account** — marketplace partner profile bound to **one** supplier identity.
- **Admin account** — internal operator profile bound to **one** admin identity.

**Unresolved mechanics**

- Whether **support** is a separate account type or a **label** on admin accounts at MVP.

**Exploratory**

- **Driver** as its own login identity (today: driver operational facts attach to **vehicle** / supplier mediation per `booking-lifecycle.md`).

---

## 3. Strict role-separation philosophy

**Planned**

- **Customer and supplier are separate identities:** A person who both books travel and operates fleet must hold **two distinct platform identities** (two authentication subjects / account records)—**not** one identity with a role toggle at login.
- **Rationale:** Clear audit trails, separate verification and payout posture, simpler RBAC, and alignment with `supplier-operations.md` onboarding gates.
- **Unified login UI** may still exist (`auth-rbac.md` §2): after authentication, the system resolves **which account type(s)** exist for that phone—if both exist, **post-login routing** must be explicit (**Unresolved mechanics**: picker vs deep links only).
- **Admin identities** are never merged with customer or supplier identities.

**Exploratory**

- **Linked person** metadata (same human, two identities) for support investigations—must not collapse into one login without explicit product/legal approval.

**Note:** Resolves open direction in `auth-rbac.md` §20 (“single identity across roles”) for **entity architecture**; update that doc when product ratifies.

---

## 4. Authentication philosophy

**Planned**

- **Phone-first identity:** Primary authenticator is **mobile number** (India market); email may be **secondary** contact—format/verification rules **Unresolved mechanics**.
- **Better Auth integration:** Authentication HTTP and session cookies remain at **`api/auth/*`** (`frontend-auth-architecture.md`); domain **accounts** reference Better Auth user id when persisted.
- **Future OTP direction:** Sign-in is expected to use **OTP to phone** (SMS/WhatsApp channel TBD)—architecture reserves plugin/hook points; **not Implemented** in repo today (`emailAndPassword` off in current instance).

**Implemented**

- Better Auth **stateless** session foundation; server `getSession` / `requireSession`; Edge cookie presence check.

**Exploratory**

- OAuth (Google) as supplemental factor per `frontend-auth-architecture.md` comments.

---

## 5. Account lifecycle concepts

**Planned — lifecycle states (apply per account kind where relevant)**

| State | Meaning |
| --- | --- |
| **Active** | May use permitted surfaces per verification + RBAC. |
| **Suspended** | Blocked from marketplace actions (policy/fraud/ops); identity may still authenticate for limited messaging **Unresolved mechanics**. |
| **Pending verification** | Awaiting admin or automated checks (especially **supplier**). |
| **Rejected** | Onboarding denied; should not receive routed supply/demand privileges. |

**Unresolved mechanics**

- Whether **customer** accounts require verification before first booking; **soft delete** vs **anonymize** on account closure.

**Exploratory**

- **Probation** state for new suppliers (limited booking volume).

---

## 6. Supplier verification philosophy

**Planned**

- **Supplier account** must reach **active** only after **manual admin approval** (`supplier-operations.md` §2)—verification is **account-level** plus **vehicle-level** where required.
- **Pending verification** blocks **routing/acceptance** by default.
- **Rejected** retains audit history but must not operate as an active supplier.

**Unresolved mechanics**

- Re-application after rejection; document expiry and re-verification cadence.

**Exploratory**

- Automated document checks before human review.

---

## 7. Supplier ownership concepts

**Planned**

- **Supplier owns vehicles and drivers:** Every **vehicle record** and every **driver record** belongs to exactly **one supplier account**—see **`vehicle-domain-model.md`** for vehicle inventory; driver roster detail **Unresolved mechanics** (employee record vs future driver login).
- **No permanent vehicle–driver link:** Vehicles and drivers are **not** permanently paired; for each booking the supplier assigns **one vehicle + one driver** at fulfillment time (`vehicle-domain-model.md` §8).
- **Fleet vs single-vehicle supplier:**
  - **Single-vehicle supplier** — typically one primary vehicle and a small driver roster (often one driver in practice).
  - **Fleet supplier** — many vehicles and many drivers; assignment picks a pair per booking.

**Unresolved mechanics**

- Owner-operator acting as driver on a trip without a separate driver record.

**Exploratory**

- Pool drivers and vehicles with booking-time pairing only (no standing assignments).

---

## 8. Admin / support access philosophy

**Planned**

- **Shared admin role initially:** MVP uses **one internal role bucket** (admin/support) with full operational access—**no** fine-grained permission matrix at launch.
- **Future RBAC extensibility:** Entity model should allow **multiple admin profiles** later (`auth-rbac.md` §5) without migrating customer/supplier identities.

**Implemented**

- `/admin` route shell exists; **no** admin account entity or RBAC enforcement in domain layer.

**Exploratory**

- **Read-only** support tier; regional scoped admins.

---

## 9. Historical integrity philosophy

**Planned**

- **Historical bookings remain linked** to the **customer account**, **supplier account**, and **vehicle/driver facts** that existed at trip time—account suspension or vehicle **inactive** does **not** rewrite past associations.
- **Snapshots:** Commercial terms and category/bucket at booking time should be recoverable for billing disputes (`pricing-engine.md` config drift)—storage mechanism **Unresolved mechanics**.

**Exploratory**

- Legal **anonymization** of customer PII while retaining aggregate booking facts.

---

## 10. Vehicle relationship concepts (summary)

**Planned**

- Vehicle inventory lifecycle, states, and booking-time assignment are defined in **`vehicle-domain-model.md`**—this identity doc only notes that **supplier accounts** own vehicle and driver rosters and that **historical bookings** retain assignment snapshots.

**Unresolved mechanics**

- Cross-reference driver entity fields when a dedicated driver domain model is added.

**Exploratory**

- None at identity layer.

---

## 11. Session / auth integration concepts

**Implemented**

- Browser **session** via Better Auth cookie; `RoleDashboardWithAuth` enforces **session presence** on role trees.

**Planned**

- Session carries **stable identity id** + resolved **account id(s)** for the authenticated subject—**not** embedded permission graphs in the cookie.
- **Route family access:** `/customer` requires authenticated identity with **active customer account**; `/supplier` requires **active supplier account**; `/admin` requires **admin account**—403 if wrong account type.
- **Better Auth DB adapter** links sessions to persisted users when OTP/login ships (`backend-architecture.md` §8).

**Unresolved mechanics**

- Session refresh when account moves from **pending** → **active** mid-session.

**Exploratory**

- Device binding and session revocation lists.

---

## 12. Auditability philosophy

**Planned**

- **Admin actions** that change identity, verification, suspension, vehicle approval, or impersonation-related views must append **audit records** (actor, target entity, action, timestamp)—field schema **Unresolved mechanics**; aligns with `backend-architecture.md` §9 and `billing-settlement.md` admin refunds posture.
- **Future impersonation considerations:** Default **off** (`auth-rbac.md`); if ever enabled, sessions must be **labeled** and **audited**—entity model must not conflate impersonator with subject identity.

**Implemented**

- Audit pipeline **not** built.

**Exploratory**

- Customer-visible log of admin changes affecting their account.

---

## 13. Privacy and visibility concepts

**Planned**

- **Customers** see their bookings, bills, and profile—not other customers’ data.
- **Suppliers** see assigned/offered bookings and **limited** customer contact fields needed for fulfillment—broader PII minimization **Unresolved mechanics** (`auth-rbac.md`, `billing-settlement.md` §12).
- **Admins** see cross-tenant data per policy; access should be **justified** and **audited** for high-sensitivity fields.
- **Post-trip:** visibility contracts tighten per feature specs; historical financial records remain for settlement integrity (§9).

**Exploratory**

- **Masking** phone numbers via proxy calling.

---

## 14. Future extensibility considerations

**Planned**

- Additive **account types** (e.g. corporate customer org) should not break **separate identity** rule without explicit product decision.
- **Entitlements** attach to **accounts**, not to raw phone numbers.

**Exploratory**

- **SSO** for enterprise customers; **API keys** for fleet TMS tied to supplier account, not personal identity.

---

## Entity relationship sketch (conceptual)

```text
Identity (auth subject, phone-first)
  ├──0..1── Customer account ──< bookings (historical link preserved)
  ├──0..1── Supplier account ──< vehicles
  │                      └──< drivers   (separate rosters; paired only per booking)
  └──0..1── Admin account

Booking ── assignment: one vehicle id + one driver id (see vehicle-domain-model.md)
```

---

## Revision log

| Date | Change |
| --- | --- |
| 2026-05-18 | **FOUNDATION:** identity domain philosophy, separate customer/supplier identities, lifecycle states, supplier/vehicle ownership, admin MVP role, session integration, audit/privacy, extensibility. |
| 2026-05-18 | **Correction:** supplier owns vehicles **and** drivers; no permanent vehicle–driver linkage (see `vehicle-domain-model.md`). |

When OTP persistence and RBAC land, add dated rows and cross-update `auth-rbac.md` §20 resolution.
