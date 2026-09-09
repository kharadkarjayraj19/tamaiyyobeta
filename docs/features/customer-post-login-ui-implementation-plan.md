# Tamayo — Customer post-login UI implementation plan

**Maturity:** DRAFT  
**Purpose:** Step-by-step implementation plan for the customer post-login screen based on `TamayoUIMockupPostCustomerLogin.png`, with strict chunking so agents can execute without hallucinating scope, APIs, or behavior.

**Mockup reference:** `TamayoUIMockupPostCustomerLogin.png` (repo root)

**Related docs:** `docs/features/design-system.md`, `docs/features/app-shell.md`, `docs/features/pricing-engine.md`, `docs/features/booking-lifecycle.md`, `docs/frontend-guidelines.md`, `docs/project/current-state.md`

---

## 1) Scope and constraints

### In scope

- Customer dashboard UI after login for `/customer`.
- Hero block with primary CTA, ride-mode selection, and trust indicators.
- Action cards row (Outstation, Plan Itinerary, One Way, My Trips, Offers).
- Inspiration section with sample itinerary cards (Parth/Hyderabad and Yash/Maharashtra).
- Bottom trust stats strip.
- Responsive behavior for desktop and mobile.

### Out of scope (do not invent)

- New backend endpoints.
- New pricing/business logic beyond existing docs.
- Real itinerary content service (use static seed/content for now).
- Full auth/login product flow (currently foundation + local bypass).

---

## 2) Anti-hallucination execution rules (mandatory)

1. Do not create new API routes unless explicitly requested.
2. Reuse existing shell/layout primitives before creating new global components.
3. Keep content deterministic; use static local data for inspiration cards in first iteration.
4. Do not alter supplier/admin screens in this plan.
5. Do not change pricing semantics:
   - One-way -> corridor fare
   - Round-trip/multi-city -> tour pricing
   - Billable km messaging per existing docs
6. Use design tokens/classes (no hard-coded random palette values across components).
7. Finish each chunk completely before moving to the next.

---

## 3) Delivery strategy

Build in small chunks. After each chunk:

- run lint/typecheck on touched files,
- verify responsive behavior (desktop + mobile),
- verify no regressions in role shell.

---

## 4) Chunk-by-chunk implementation plan

## Chunk 0 — Baseline audit and token mapping

**Goal:** lock UI vocabulary and avoid redesign churn during coding.

**Tasks**

- Review current customer page: `src/app/(customer)/customer/page.tsx`.
- Map mockup sections to existing shared primitives:
  - `SectionHeader`, `DashboardCard`, `PageContainer`, etc.
- Define local constants for:
  - card labels,
  - trust badges,
  - sample itinerary metadata.

**Acceptance criteria**

- Section list and component map documented in code comments or local constants.
- No UI changes yet.

---

## Chunk 1 — Page skeleton replacement for customer overview

**Goal:** replace placeholder overview/table with mockup-aligned section structure.

**Primary file**

- `src/app/(customer)/customer/page.tsx`

**Tasks**

- Replace current placeholder "Overview" and empty table shell with:
  1. greeting row,
  2. hero container,
  3. quick action card row,
  4. inspiration section,
  5. trust stats strip.
- Keep semantic structure (`main`, heading hierarchy, button/link semantics).

**Acceptance criteria**

- `/customer` renders new high-level structure.
- No broken imports or runtime errors.

---

## Chunk 2 — Hero section + CTA hierarchy

**Goal:** implement top hero block matching mockup intent.

**Tasks**

- Build hero with:
  - heading,
  - short supporting text,
  - primary CTA (`See prices`),
  - ride-mode tabs (`One way`, `Multi city / Round trip`, `City tour`, `Airport only`),
  - right-side fleet sticker visual.
- Add trust points beside CTA row (easy cancellation, new cars guaranteed, best price + best drivers).
- Use tokenized gradients and contrast-safe text.

**Notes**

- Do not wire CTA to new backend; link to existing routes or placeholders.

**Acceptance criteria**

- Primary CTA visually dominant over secondary.
- Hero remains readable on smaller widths (no text overlap).

---

## Chunk 3 — Quick action cards row

**Goal:** implement the 5-card action strip below hero.

**Tasks**

- Create reusable local card renderer (inside customer page or small feature component):
  - icon,
  - title,
  - short description,
  - arrow affordance.
- Add "NEW" tag on Plan Itinerary card.
- Link each card only to known routes or safe placeholders:
  - Outstation Cabs -> `/customer/booking-quote`
  - Plan Itinerary -> `/customer/booking-quote` (temporary)
  - One Way Cabs -> `/customer/booking-quote` (temporary filter later)
  - My Trips -> `/customer` (placeholder until dedicated route)
  - Offers -> `/customer` (placeholder)

**Acceptance criteria**

- Row wraps gracefully on tablet/mobile.
- Cards have consistent height and spacing.

---

## Chunk 4 — Inspiration itinerary section

**Goal:** add educational social-proof cards from mockup.

**Tasks**

- Add section title/subtitle (e.g. "See how others planned their trips").
- Render 2 static cards from local constants:
  - Parth 3-day Hyderabad tour,
  - Yash 5-day Maharashtra tour.
- Include:
  - trip pill (`3 Days Trip`, `5 Days Trip`),
  - short destination chips,
  - duration + distance metadata,
  - "View itinerary idea" affordance.

**Backend alignment**

- Keep static for now; no itinerary API assumptions.

**Acceptance criteria**

- Section readable and visually distinct from quick actions.
- Cards degrade cleanly to stacked layout on mobile.

---

## Chunk 5 — Trust metrics strip

**Goal:** add bottom metrics row for confidence.

**Tasks**

- Add 4 compact metric cards:
  - Happy customers,
  - Rating,
  - Cities covered,
  - 24/7 support.
- Keep copy factual and non-legal.

**Acceptance criteria**

- Metrics align in one row on wide screens and stack on narrow screens.
- Typography hierarchy clear (value > label > helper text).

---

## Chunk 6 — Styling refinement and component extraction

**Goal:** reduce duplication and keep code maintainable.

**Tasks**

- Extract reusable UI blocks into `src/features/customer/ui/` if repetition appears:
  - Hero,
  - ActionCard,
  - ItineraryInspirationCard,
  - TrustMetricCard.
- Keep shared primitives untouched unless absolutely required.

**Acceptance criteria**

- Customer page stays readable (small orchestration file).
- No cross-role side effects.

---

## Chunk 7 — Pricing-language alignment pass

**Goal:** ensure customer-facing copy aligns with backend pricing model.

**Tasks**

- Add concise helper text in relevant blocks:
  - one-way corridor fare concept,
  - tour fare concept,
  - billable km explanation (where suitable).
- Add contextual tooltip copy for ride-mode clarity:
  - one-way limited to hotspot routes,
  - multi-city uses round-trip charging posture,
  - city tour package meaning and overage note.
- Keep language simple and non-technical.

**Acceptance criteria**

- No contradiction with `docs/features/pricing-engine.md`.
- No misleading promises.

---

## Chunk 8 — Responsive + accessibility QA pass

**Goal:** production-quality usability checks.

**Tasks**

- Validate at widths: ~390, ~768, ~1280+.
- Check:
  - heading order,
  - focus states,
  - keyboard traversal,
  - contrast on gradient areas,
  - tap targets.

**Acceptance criteria**

- No clipped text/overlap.
- Keyboard navigation works for all interactive elements.

---

## Chunk 9 — Optional backend-connected enhancements (separate PR)

**Goal:** connect static UI sections to real data after core UI lands.

**Candidate follow-ups**

- "My Trips" card -> real customer bookings count from existing booking APIs.
- Inspiration cards -> CMS/config or curated data source.
- Hero greeting -> real user name from session bridge.
- Hero ride form -> post-to-quote API directly from `/customer` (current flow navigates to quote workbench with query-param prefill).

**Rule**

- Do not include these in initial UI-delivery PR unless explicitly requested.

---

## 5) Implementation checklist for agent handoff

- [x] Chunk 0 complete
- [x] Chunk 1 complete
- [x] Chunk 2 complete
- [x] Chunk 3 complete
- [x] Chunk 4 complete
- [x] Chunk 5 complete
- [ ] Chunk 6 complete
- [x] Chunk 7 complete
- [x] Chunk 8 complete
- [x] Lint/typecheck pass on touched files
- [x] Visual QA against `TamayoUIMockupPostCustomerLogin.png`
- [x] Docs updated if scope changed
- [x] Multi-city stop builder supports up to 10 intermediate stops (`Stop 1..10`) between pickup and final dropoff

---

## 6) Suggested PR split

1. **PR-A:** Chunk 1-3 (structure + hero + quick actions)  
2. **PR-B:** Chunk 4-5 (inspiration + trust metrics)  
3. **PR-C:** Chunk 6-8 (refactor + copy alignment + accessibility polish)

This keeps reviews focused and lowers hallucination/regression risk.

---

## Revision log

| Date | Change |
| --- | --- |
| 2026-08-13 | Initial chunked implementation plan from customer post-login mockup (`TamayoUIMockupPostCustomerLogin.png`). |
| 2026-08-28 | Updated plan to match implemented customer hero interactions: ride-mode tabs, city-tour package presets, tooltips, query-prefill handoff, and multi-city stop-builder constraints. |
| 2026-08-29 | Implemented follow-up enhancement: pickup/drop/stop route inputs on `/customer` now use debounced Google Places suggestions through a server-side autocomplete proxy endpoint. |
| 2026-08-29 | Implemented schedule controls enhancement: one-way/airport pickup date now uses a working date picker and route flows use AM/PM 30-minute time dropdowns. |
| 2026-08-29 | Updated schedule controls with future-time guard: when selected date is today, past time slots are disabled and selected values auto-adjust to the next valid slot. |
| 2026-08-29 | Implemented post-CTA results enhancement: `/customer/booking-quote` now shows a modern fare-result card with total amount, included km context, and reserve (`₹499`) call-to-action aligned to customer flow. |
| 2026-08-29 | Implemented quote UX enrichment: interactive vehicle presets, age toggle (`0-3` / `4-7`), duration/included-km cards, fuel tags, and petrol/CNG queue advisory copy on the quote results surface. |
| 2026-09-04 | Implemented post-reserve handoff: reserve CTA now routes to `/customer/reserve` with booking reference, route snapshot, and reserve amount summary as the next-page placeholder until payment gateway integration lands. |
| 2026-09-08 | Implemented reserve-page upgrade: `/customer/reserve` now acts as a review-booking step with expanded trip details and explicit inclusions/exclusions before payment handoff. |
| 2026-09-08 | UI refinement: review page now shows route timeline with start/end/stop markers and icon-based inclusion/exclusion cards aligned to Tamayo's green theme. |
| 2026-09-09 | Updated reserve review UX to a focused customer flow (no sidebar/top-navbar chrome), with compact inline trip metrics and resilient age/fuel/per-km copy fallbacks. |
