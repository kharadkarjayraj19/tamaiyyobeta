# Tamayo — dev to prod shift plan

**Purpose:** Practical transition checklist to move Tamayo from local/dev workflows to production-safe operation without silent behavior drift.

**Scope:** Web app (`/customer`, `/supplier`, `/admin`), backend APIs, auth, pricing/booking flows, data, and observability.

**Related docs:** `docs/project/current-state.md`, `docs/project/local-dev-setup.md`, `docs/features/frontend-auth-architecture.md`, `docs/features/pricing-engine.md`, `docs/architecture/backend-architecture.md`

---

## 1) Current baseline (what is true today)

- Local development supports seeded data, Docker Postgres, and `DEV_AUTH_BYPASS`.
- Booking/pricing foundations are implemented, including one-way corridor and tour pricing modes.
- Customer home UI is interactive, but production controls (auth hardening, e2e quality gates, rollout playbook) are not fully closed.

---

## 2) Promotion principles

- Remove local-only bypass paths before production traffic.
- Treat configuration as deployable artifacts (env + pricing config + migration history).
- Promote in small stages with rollback gates.
- Do not ship undocumented behavior differences between environments.

---

## 3) Workstreams and exit criteria

## A. Authentication and access hardening

- Disable `DEV_AUTH_BYPASS` in production and staging.
- Complete real login flow (session persistence, role resolution, logout UX).
- Enforce role/path authorization server-side (not only UI navigation).

**Exit criteria**

- Production env refuses startup if bypass flag is enabled.
- Unauthorized role-path access returns deterministic 403/redirect behavior.

---

## B. Environment and secrets management

- Finalize env contract (`DATABASE_URL`, `SHADOW_DATABASE_URL`, Better Auth, PostHog, Google Maps, payment gateway keys).
- Move secrets to deployment secret manager; no runtime reliance on local `.env`.
- Add startup validation for required production variables.

**Exit criteria**

- Environment validation fails fast for missing required keys.
- Rotating one secret does not require code changes.

---

## C. Database and migration safety

- Reconcile Prisma migration history on clean staging DB.
- Validate seed strategy separation: dev seed only; no seed dependency in prod.
- Add backup + rollback runbook for schema changes.

**Exit criteria**

- `migrate deploy` succeeds on fresh staging and release-candidate snapshots.
- Restore drill from backup tested at least once.

---

## D. Pricing and booking correctness

- Move remaining hardcoded pricing placeholders to admin-managed config tables.
- Add tests for: one-way corridor eligibility, multi-city round-trip billable km, city-tour package rules.
- Verify quote-to-booking consistency under the same config version.

**Exit criteria**

- Contract tests cover quote/create/final-bill critical paths.
- Pricing output matches documented rules in `docs/features/pricing-engine.md`.

---

## E. Observability and incident readiness

- Finalize PostHog event taxonomy for customer funnel and booking states.
- Add API error-rate and latency dashboards (route-level).
- Define alert thresholds and on-call triage playbook.

**Exit criteria**

- Key journeys observable: landing -> quote -> booking -> assignment -> bill.
- High-severity API failures trigger actionable alerts.

---

## F. Release and rollback process

- Introduce staged rollout (dev -> staging -> production).
- Define release checklist with smoke tests for role routes and booking APIs.
- Document rollback actions (app deploy rollback + DB mitigation strategy).

**Exit criteria**

- Every release has pass/fail signoff against checklist.
- Team can execute rollback within agreed recovery window.

---

## 4) Suggested execution order

1. Auth hardening + bypass guardrails.
2. Env/secrets validation and staging parity.
3. Migration hygiene + backup rehearsal.
4. Pricing correctness tests and API contract coverage.
5. Observability completion and alerting.
6. Controlled production rollout.

---

## 5) Pre-go-live checklist

- [ ] `DEV_AUTH_BYPASS` off in prod/staging and guarded at startup.
- [ ] Real auth login/logout and role resolution validated.
- [ ] Required env validation enforced in CI/release.
- [ ] Staging migrations and rollback drill completed.
- [ ] Pricing config externalized; no critical hardcoded commercial values.
- [ ] Booking/quote/billing tests green in CI.
- [ ] Monitoring + alerts active for booking funnel and API health.
- [ ] Production rollout + rollback checklist approved.

---

## Revision log

| Date | Change |
| --- | --- |
| 2026-08-28 | Initial dev-to-prod shift plan added with phased workstreams and release gates. |
