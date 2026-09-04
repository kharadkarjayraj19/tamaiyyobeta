# Tamayo — maps provider migration (Google -> Mappls ready)

**Maturity:** DRAFT  
**Purpose:** Define a low-risk migration path so Tamayo can keep Google Maps now and move to Mappls later without rewriting pricing or booking logic.

**Related docs:** `docs/features/pricing-engine.md`, `docs/project/current-state.md`, `docs/architecture.md`, `docs/project/dev-to-prod-shift-plan.md`

---

## 1) Current implementation baseline

Tamayo currently resolves route distance server-side through Google Directions and falls back to caller-provided estimated distance when unavailable.

- Current seam: `src/lib/services/pricing/distance-estimation-service.ts`
- Current secret source: `src/config/env/server.ts` (`GOOGLE_MAPS_API_KEY`)
- Current docs references:
  - `docs/features/pricing-engine.md`
  - `docs/project/current-state.md`
  - `docs/project/local-dev-setup.md`

This migration plan preserves the existing fallback and quote behavior while introducing provider abstraction.

---

## 2) Migration objective

Create a provider-neutral maps layer so business logic stays stable when provider changes.

**Target outcome**

- `booking-service` and `quote-service` consume only normalized `routeDistanceKm`.
- Provider switch is env-driven (`google` or `mappls`) without editing pricing code.
- Fallback (`estimatedKm`) remains available for resilience.

---

## 3) Scope and non-goals

### In scope

- Introduce internal maps contracts for search/resolve/route-distance.
- Move Google-specific request/response handling into a dedicated adapter.
- Add Mappls adapter behind feature flag/env switch.
- Add telemetry for provider, latency, fallback, and error categories.

### Out of scope

- Full UI redesign for search.
- Immediate deprecation of Google provider.
- Rewriting pricing formulas or billing lifecycle logic.

---

## 4) Provider-neutral architecture

### 4.1 Internal contracts (new)

Define internal contracts in `src/lib/services/maps/*`:

- `PlaceSearchProvider`
  - `search(query, options) -> PlaceSuggestion[]`
  - `resolve(placeRef) -> ResolvedPlace`
- `RouteDistanceProvider`
  - `getDistance(input) -> RouteDistanceResult`

Normalized shapes:

- `PlaceSuggestion`: `id`, `label`, `city`, `state`, `country`, optional `lat/lng`
- `ResolvedPlace`: `id`, `formattedAddress`, `lat`, `lng`, `provider`
- `RouteDistanceInput`: pickup + ordered stops + final destination
- `RouteDistanceResult`: `routeDistanceKm`, optional `durationMinutes`, `meta`

### 4.2 Provider selection

- Add env selector: `MAPS_PROVIDER=google|mappls`
- Default: `google` until Mappls parity validates in production-like traffic
- Factory returns concrete providers from env

---

## 5) Implementation plan by phase

## Phase A — extract abstraction without behavior change

1. Add provider-neutral types and contracts under `src/lib/services/maps/`.
2. Move current Google routing call into `google-route-provider`.
3. Update `distance-estimation-service` to call only internal route contract.
4. Keep existing fallback behavior exactly unchanged.

**Exit criteria**

- Existing quote/create flows return same `routeDistanceKm` values for baseline test routes.
- No API contract changes for frontend consumers.

## Phase B — add Mappls route provider

1. Add `mappls-route-provider` with provider-specific auth and endpoint handling.
2. Map provider response into normalized `RouteDistanceResult`.
3. Add timeout/retry/error mapping consistent with Google provider.

**Exit criteria**

- Mappls can return distance for single-leg and multi-stop itineraries.
- Failures trigger safe fallback without blocking quote creation.

## Phase C — add place search and place resolve provider layer

1. Add provider-neutral search and resolve contracts.
2. Add Google and Mappls adapters for place suggestions and resolution.
3. Cache resolved place lookups by normalized query + provider.
4. Keep India-focused constraints and ambiguity-safe parsing.

**Exit criteria**

- Pickup/drop selection resolves to stable place refs and coordinates.
- Ambiguous place names are disambiguated before route pricing.

## Phase D — observability and controlled rollout

1. Add provider tags in analytics/events:
   - `mapsProvider`
   - `mapsLatencyMs`
   - `mapsFallbackUsed`
   - `mapsFailureCategory`
2. Run shadow comparison for a fixed sample of routes.
3. Roll out by percentage or keep dual-provider fallback policy.

**Exit criteria**

- Error and fallback rates are within agreed threshold.
- Quote correctness does not regress for golden test routes.

---

## 6) Environment and secret management

Add/update server env entries (exact names may be finalized at implementation time):

- `MAPS_PROVIDER=google`
- `GOOGLE_MAPS_API_KEY=...`
- `MAPPLS_CLIENT_ID=...`
- `MAPPLS_CLIENT_SECRET=...`
- `MAPS_TIMEOUT_MS=...`
- `MAPS_RETRY_COUNT=...`

**Guardrails**

- Never expose provider secrets in client bundles.
- Maintain separate dev/prod credentials.
- Restrict API keys and enforce quota/budget alerts.

---

## 7) Invariants that must remain unchanged

Regardless of provider, these pricing behaviors are unchanged:

- Distance used for fare must be road-route based.
- Tour billable rule remains `max(actualKm, includedKm)`.
- Operational bundle remains a single customer-visible lump-sum line item.
- One-way corridor and round-trip/multi-city pricing modes remain as documented.

---

## 8) Verification strategy

### Unit tests

- Provider response parsing and normalization
- Timeout/retry behavior
- Error-to-fallback path
- Ordered stops and empty-stop handling

### Integration tests

- Quote generation with:
  - one-way corridor routes
  - round-trip routes
  - multi-stop routes

### Golden-route comparison pack

Maintain fixed real-world route fixtures (metro, tier-2, peri-urban, village adjacency) and compare:

- distance variance
- error rate
- latency p50/p95
- fallback frequency

---

## 9) Risks and mitigations

- **Response shape drift across providers** -> strict adapter boundary + contract tests.
- **Distance variance impacts fare trust** -> golden-route validation before traffic shift.
- **Cost unpredictability** -> provider-wise usage telemetry and budget guardrails.
- **Ambiguous locality names** -> mandatory resolve/disambiguation before pricing call.

---

## 10) Rollout recommendation

1. Keep Google as source of truth for current production path.
2. Merge abstraction extraction first (no behavior change).
3. Add Mappls behind env switch.
4. Run side-by-side benchmark for at least 2 weeks.
5. Decide final mode:
   - full Mappls
   - Google primary + Mappls fallback
   - region-specific provider routing

---

## 11) Acceptance checklist

- [ ] No provider URL parsing remains inside pricing business logic.
- [ ] `distance-estimation-service` depends only on internal provider contracts.
- [ ] Provider switch works through env without code edits.
- [ ] Quote API response contract remains stable for UI.
- [ ] Docs updated when implementation starts (`current-state`, `pricing-engine`, `dev-to-prod-shift-plan`).
- [ ] Provider telemetry visible for release gating.

---

## 12) Effort estimate (single engineer)

- Abstraction extraction: 1 to 2 days
- Mappls route provider + tests: 2 to 4 days
- Place search/resolve provider layer + cache: 2 to 4 days
- Rollout, benchmark, and doc sync: 2 to 3 days

**Estimated total:** 1.5 to 3 weeks (iterative, low-risk path).

---

## Revision log

| Date | Change |
| --- | --- |
| 2026-08-29 | Added migration blueprint for future Google-to-Mappls provider portability with contract-first rollout plan. |
