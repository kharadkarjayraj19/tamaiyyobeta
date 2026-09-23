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
| 2026-09-15 | Mobile-first reserve redesign: `/customer/reserve` now uses a sticky bottom reserve CTA, compact "trip at a glance" chips, and collapsible detail sections to improve scan speed and reduce scroll fatigue on phones. |
| 2026-09-15 | Reserve visual refresh: switched to a quote-style MMT-inspired vehicle card with image-led fare summary and persistent part-pay/full-pay rail to align with familiar mobile travel booking patterns. |
| 2026-09-18 | Reserve page style alignment pass: `/customer/reserve` now mirrors booking-quote green-gradient visual language, uses a stronger mobile-visible sticky payment CTA (`Proceed to payment`), removes redundant `pickup-drop & stop` and `Free cancellation up to 6 hours` row copy, and keeps the route/inclusion detail flow intact. |
| 2026-09-18 | Reserve inclusions/exclusions refinement: inclusions now display the greater of route-km and included-km when both are available, and inclusion/exclusion rows were restyled with modern chips/cards and slightly reduced typography for denser mobile readability. |
| 2026-09-18 | Reserve density follow-up: compacted inclusion/exclusion block by removing extra chips/card wrappers, reducing paddings/gaps, and dropping list text to `12px` for a tighter mobile footprint while preserving readability. |
| 2026-09-18 | Route overview alignment + styling pass: converted route rows to a fixed-column timeline layout so start/end text aligns consistently, and added compact modern visual effects (subtle gradient surface, timeline connector, and icon chips) without increasing section height. |
| 2026-09-23 | Reserve card surface correction pass: replaced the prior light gradient treatment and aligned vehicle summary + route overview cards to the same dark emerald premium surface language as the top estimated-total card (including contrast-safe text/icon updates). |
| 2026-09-23 | Reserve card rollback follow-up: reverted vehicle summary card back to the lighter surface style while keeping route overview styling as-is, and removed the `Cab operator will be assigned after booking confirmation.` helper row per UX feedback. |
| 2026-09-23 | Reserve vehicle meta consistency tweak: converted fuel label from highlighted badge style to the same inline icon+text pattern used by route, passengers, and days in the vehicle summary row. |
| 2026-09-23 | Reserve desktop layout enhancement: placed vehicle summary and route overview cards side-by-side at `md+` breakpoints using a two-column grid while keeping stacked mobile order unchanged. |
| 2026-09-23 | Reserve desktop layout correction: changed `md+` side-by-side pairing to vehicle summary + inclusions/exclusions (light-theme parity), and moved route overview back to a full-width row below. |
| 2026-09-23 | Reserve route experiment: replaced static route overview block with a client-side animated itinerary map card that maps start, intermediate stops, and end destination onto a curved route with moving car indicator. |
| 2026-09-23 | Reserve route visual replication pass: upgraded animated route card to closely mirror provided reference styling (dark emerald canvas, topographic overlays, Fraunces-style headline scale, dotted route, destination day cards, glowing path markers, and branded moving vehicle treatment). |
| 2026-09-23 | Reserve route copy/scale tweak: reduced animated map lane height by ~25% and updated experimental card copy to `Travel boleto, Tamayo!!` title plus footer label `Travelling with Tamayo` per latest review feedback. |
| 2026-09-23 | Reserve route wrapper density tweak: reduced top/bottom padding on the animated route card content wrapper (`relative z-10 ...`) to lower overall card height without altering map geometry or horizontal spacing. |
| 2026-09-23 | Reserve route height regression fix: restored reduced route-lane height values after a later style pass had unintentionally reset them to larger dimensions (`h-[250px] md:h-[270px]`). |
| 2026-09-23 | Reserve route compactness follow-up: reduced route-lane height by an additional ~25% (`h-[188px] md:h-[202px]` -> `h-[141px] md:h-[152px]`) per latest density feedback. |
| 2026-09-23 | Reserve route title glow refinement: applied layered luminous text-shadow styling to `Travel boleto, Tamayo!!` so the heading visually matches the bright-glow treatment seen in the design reference. |
| 2026-09-23 | Reserve route header parity pass: replaced custom title glow with the exact typography/effect model from shared reference (`Fraunces` clamp sizing, `-0.055em` letter spacing, eyebrow line treatment, and muted date scale) for closer visual fidelity. |
| 2026-09-23 | Reserve route glow visibility fix: reintroduced an explicit two-layer title glow (blurred behind-text + foreground luminous shadow) while preserving the reference typography metrics so heading glow remains visible in the compressed-height card. |
| 2026-09-23 | Reserve route glow intensity trim: reduced title glow opacity/blur and outer shadow radius so the heading keeps a premium luminous effect without appearing over-bright. |
| 2026-09-23 | Reserve route title color correction: restored headline foreground to clean white (with subtle white glow underlay) to match earlier visual tone preference. |
| 2026-09-23 | Reserve route mobile simplification pass: hid eyebrow/title/date header content on mobile, tightened card paddings, and reduced stop-card text density (name-only with compact capsules) so the route animation remains readable on small screens while desktop retains full detail. |
| 2026-09-23 | Reserve route mobile density micro-pass: reduced moving vehicle dimensions and mobile waypoint/footer typography to improve visual balance and avoid overpowering the compact animation canvas. |
| 2026-09-23 | Reserve route readability bugfix: reduced mobile car scale further, truncated mobile stop names to 9 chars + ellipsis, dropped mobile stop-name font by another ~25%, and forced first stop card to render below marker on mobile when needed to prevent clipping. |
| 2026-09-18 | Reserve vehicle-summary hierarchy pass: reduced on-card `₹499` visual dominance and replaced Lucide metadata glyphs with the same Tamayo 3D icon family used in booking-quote (`fuel`, `route`, `passengers`, `duration`) for cross-page visual consistency. |
| 2026-09-18 | Reserve CTA visibility pass: removed on-card `₹499 / Reserve now` block entirely and constrained sticky `Proceed to payment` rail to mobile (`md:hidden`) with higher layering; added mirrored desktop CTA panel (`md:flex`) so payment action remains visible across breakpoints. |
| 2026-09-19 | Customer-page date-time UX parity pass: reused booking-quote’s compact pickup-time editor pattern on `/customer` via a single mobile-first overlay (pickup date + hour/minute/AM-PM steppers + return-day stepper for tour modes) so end-date inputs no longer occupy separate inline fields. |
| 2026-09-19 | Customer picker behavior polish: date-time overlay now locks page scroll while open (modal behavior), renders as centered dialog instead of dropdown-like sheet, and supports wheel/trackpad scroll interactions on date/time/day controls for DriveU-style quick adjustments. |
| 2026-09-19 | Customer picker UX correction: converted date-time picker from modal to floating dropdown anchored below the field, added 3-row wheel-illusion columns (date/hour/minute/AM-PM), and kept wheel/trackpad adjustments plus click-outside close behavior. |
| 2026-09-19 | Customer picker visual alignment pass: tuned floating picker layout to match reference pattern more closely (single centered header, colon lane between hour/minute, faded previous/next rows, highlighted selection rails, and return day `-/+` controls). |
| 2026-09-19 | Customer picker interaction fix: wheel gestures inside picker now no longer scroll the background page, typography was reduced for denser mobile readability, and Return date + `-/+` day controls are always visible in the floating picker. |
| 2026-09-19 | Customer picker typography pass: reduced Date/Time wheel typography by ~30% (selected and adjacent rows) and reduced trigger summary size to improve compact mobile readability. |
| 2026-09-19 | Customer picker scroll-root-cause fix: added native non-passive `wheel`/`touchmove` guards at window-capture level to prevent browser scroll chaining only when gestures originate inside the floating picker, while preserving normal page scroll outside. |
| 2026-09-19 | Customer picker defaults + pacing pass: defaulted initial selection to today with pickup time after 1 hour, slowed wheel step sensitivity using per-column throttled delta accumulation, increased post-selection on-screen summary text, switched summary copy to explicit range format (`Start ... to End ...`), and set default end time to `11:00 PM`. |
| 2026-09-19 | Customer summary typography + format pass: set selected date/time summary line to `text-sm font-medium text-foreground` (14px intent) and updated range display to compact chip-like format (`24 Sept, Thu - 25 Sept, Fri, 09:00`) per provided reference. |
| 2026-09-19 | Customer summary micro-tuning: reduced on-screen date-time summary text by ~15% (`text-sm` to `text-xs`) while preserving `font-medium` and color semantics for better mobile fit. |
| 2026-09-19 | Picker smooth-scroll architecture update: replaced manual wheel-step mutation with scroll-snap columns (`h-36`, `snap-y mandatory`, centered `h-12` items) for date/hour/minute/AM-PM, giving slower natural kinetic scroll and reliable in-column snapping while preserving outside-page scroll. |
| 2026-09-19 | Picker bugfix follow-up: removed past dates from selectable date lane (today onward only), normalized overlay open state to today when stale/past values exist, and pinned the green center highlight as a fixed overlay so it no longer scrolls with lane content. |
| 2026-09-19 | Picker stability hotfix: stopped idle auto-scroll by limiting programmatic scroll-position sync to overlay-open initialization and ignoring onScroll state updates during that one-time sync pass. |
| 2026-09-19 | Picker typography follow-up: increased date/hour/minute/AM-PM lane font sizes by ~15% and scaled the center `:` lane accordingly for better readability while preserving the compact 3-row wheel layout. |
| 2026-09-19 | CTA style consistency pass: switched `/customer` picker `Select` and primary `See prices` actions to shared `Button` with `tamayoGradient` variant so they inherit the same reusable gradient/glass treatment as the rest of booking CTAs. |
| 2026-09-19 | Customer-page cleanup pass: removed redundant hero header copy (`Ride`, `Pune, IN / Change city`), reduced pickup/dropoff input typography and one-way info block density (~20%), and updated closed date-time summary to show 12-hour AM/PM format for clearer mobile readability. |
| 2026-09-19 | Picker adaptive placement pass: floating date-time dropdown now chooses above or below trigger based on available viewport space, with clamped viewport-safe top positioning to avoid off-screen overflow near page edges. |
| 2026-09-19 | Picker scroll-follow performance fix: replaced per-scroll React state updates with requestAnimationFrame-throttled imperative style updates for open picker positioning, reducing anchor lag while the background page scrolls. |
| 2026-09-19 | Picker anchor-correction pass: switched placement math to anchor-first positioning (relative to trigger top/bottom) with adaptive max-height shrinking, and moved scroll listener to document capture so dropdown remains attached to the date field while nested containers scroll. |
| 2026-09-19 | Customer hero micro-spacing and label pass: tightened vertical spacing between `Request a ride` and `Schedule my tour`, updated pickup selector labels to `Pickup & Drop Date and Time`, and aligned top-right auth chip styling with the hero’s emerald pill treatment. |
| 2026-09-19 | Date-summary clarity pass: removed weekday tokens from the closed pickup/drop summary line and kept compact date + 12-hour AM/PM time only to reduce visual clutter (`19 Sept - 19 Sept, 11:00 AM`). |
| 2026-09-19 | Date-summary correctness fix: corrected closed summary ordering to render both start and end timestamps (`start date, start time - end date, end time`) and kept end-time fallback at `11:00 PM` when no explicit end-time token is present. |
| 2026-09-19 | Wheel looping fix: converted hour/minute/AM-PM picker lanes to repeated cyclic option bands with center-band recentering so scroll wraps naturally (`45 -> 00`, `12 -> 01`) instead of hard-stopping at lane ends. |
| 2026-09-19 | Trip-duration CTA context: added dynamic helper text above `See prices` for tour flows to confirm selected booking span (`You are reserving cab for N day(s).`) based on current start/end date selection. |
| 2026-09-19 | Trip-duration visibility fix: removed tour-mode-only guard for the helper line so it appears whenever a true multi-day range is selected (`selectedTripDays > 1`), regardless of ride-mode toggle state. |
| 2026-09-19 | Date helper cleanup: removed non-tour helper copy (`Pickup time stays in future for today...`) from the pickup selector area to reduce clutter; only tour-specific return-day helper remains. |
