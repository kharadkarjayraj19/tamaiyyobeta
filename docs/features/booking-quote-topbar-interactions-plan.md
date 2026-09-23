# Tamayo — booking quote topbar interaction fix plan

**Maturity:** DRAFT  
**Purpose:** Fix desktop overflow and implement fully interactive booking-quote topbar behavior (trip type, from, stops, to, pickup date, pickup time) aligned to provided MMT-style references.

## Screenshot clarity mapping

- **Screenshot A/B:** top control strip should remain usable at normal desktop zoom (`100%`) without horizontal page scroll.
- **Screenshot C:** clicking `From` / `To` should open an editable search-style panel.
- **Screenshot D:** clicking `Stops` should open a modal where intermediate stops can be managed between `From` and `To`.

## Scope

- File in scope: `src/features/pricing/ui/quote-workbench.tsx`
- Docs in scope:
  - `docs/features/booking-quote-topbar-interactions-plan.md` (this file)
  - `docs/project/current-state.md`

## Plan (execute in order)

- [x] **Topbar layout resilience:** replaced rigid desktop grid with wrap-safe interactive controls to prevent overflow at desktop 100%.
- [x] **Stop placement correctness:** rendered stop count control *between* `From` and `To`; count now reflects only intermediate stops.
- [x] **Trip type interaction:** added clickable trip-type selector and form state update.
- [x] **From/To interaction:** added editable search-style overlays for source and destination fields.
- [x] **Stops modal interaction:** added modal for viewing/editing stop list in route order (`From -> Stops -> To`) with add/remove actions.
- [x] **Pickup date/time interaction:** date/time tokens are now clickable and editable via overlay.
- [x] **Quote refresh behavior:** quote refresh intent now triggers after topbar edits.
- [x] **Validation:** lints clean for touched file; production build passes.
- [x] **Documentation sync:** appended implemented notes to `docs/project/current-state.md`.

## Non-goals for this pass

- No backend/API contract changes.
- No pricing rule changes.
- No supplier/admin surface changes.

## Revision log

| Date | Change |
| --- | --- |
| 2026-09-18 | Initial plan created from user-provided desktop and interaction screenshots; implementation to follow immediately in same change set. |
| 2026-09-18 | Executed plan: interactive topbar editors added, intermediate-stop placement corrected, desktop overflow reduced, and verification completed (`ReadLints` + `npm run build`). |
| 2026-09-19 | Mobile date-time UX upgrade: pickup editor now uses a compact single-sheet flow with integrated return-day stepper for tour trips, generating `tripEndDate` automatically from selected duration so end-date controls do not consume separate topbar space. |
