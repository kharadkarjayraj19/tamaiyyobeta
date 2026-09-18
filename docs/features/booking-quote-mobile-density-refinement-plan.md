# Tamayo — booking quote mobile density refinement plan

**Maturity:** DRAFT  
**Purpose:** Reduce visual weight on mobile quote page, remove redundant controls/text, and align included-km display with requested route-km behavior.

## Requested changes covered

- Remove `Modify` button from quote top controls.
- Replace heavy mobile top control grid with a compact summary-first interaction pattern so users focus on cab cards.
- Remove top heading block (`See prices` + description) to reclaim vertical space.
- Display greater included km when calculated route distance exceeds the fixed `300 km/day` baseline.

## Scope

- `src/features/pricing/ui/quote-workbench.tsx`
- `src/app/(customer)/customer/booking-quote/page.tsx`
- `docs/project/current-state.md`

## Execution checklist

- [x] Remove `Modify` button and keep only `Search`.
- [x] Create compact mobile top summary strip (lightweight route + date/time + quick actions).
- [x] Keep richer detailed topbar only for `md+` screens.
- [x] Remove quote page heading/description block above workbench.
- [x] Implement included-km display override rule:
  - if computed route km > `includedKmPerDay` (300 baseline), show route km as included km display value.
- [x] Validate lints and production build.
- [x] Update project state docs.

## Non-goals

- No pricing formula change in backend calculations.
- No booking or auth flow change.

## Revision log

| Date | Change |
| --- | --- |
| 2026-09-18 | Initial plan created for post-feedback mobile density and included-km display refinement. |
| 2026-09-18 | Executed: removed `Modify`, added compact mobile summary controls, removed heading block, and updated included-km display behavior with verification (`ReadLints`, `npm run build`). |
| 2026-09-18 | Refinement pass: hid trust strip on mobile, reduced compact-topbar height/typography, moved date-time value into Date & time control, and converted trip type to inline themed dropdown (no trip-type dialog). |
| 2026-09-18 | Visual cleanup: removed nested inner bordered wrapper from each quote item card to eliminate “card-inside-card” appearance and keep a single primary surface. |
| 2026-09-18 | Gap fix: removed mobile-only spacer above the advisory row by hiding the verified-fare row wrapper on mobile while preserving verified fare on desktop. |
| 2026-09-18 | Card stack spacing tweak: set quote-card vertical stack spacing to `0` on mobile (`space-y-0`) while preserving desktop spacing (`md:space-y-4`). |
| 2026-09-18 | Mobile helper-text density pass: hid “Assured new vehicle / Economy age vehicle selected” and “All-inclusive selected / Self-pay selected” lines on mobile while preserving them on desktop. |
| 2026-09-18 | Vehicle card visual emphasis: increased quote-card vehicle thumbnail size by ~15% to improve recognition without changing pricing/content hierarchy. |
