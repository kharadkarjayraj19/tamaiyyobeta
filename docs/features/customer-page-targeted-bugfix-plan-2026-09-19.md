# Tamayo — Customer page targeted bugfix plan (2026-09-19)

**Maturity:** DRAFT  
**Scope:** Focused UI/UX fixes on `/customer` requested in-session.  
**Primary files:** `src/app/(customer)/customer/page.tsx`, `src/components/shared/layout/top-navbar.tsx`

---

## Requested changes (locked scope)

1. Remove unnecessary top copy below logo on customer page:
   - Remove `Ride` title row.
   - Remove `Pune, IN Change city` line.
2. Sign-in/sign-out control clarity:
   - Show text with icon (not icon-only on mobile).
   - Use green-theme styling.
3. Reduce pickup/dropoff location input text size by about 20%.
4. Reduce one-way info block typography/density by about 20%.
5. Update pickup date-time summary text to include AM/PM.

---

## Implementation sequence (one-by-one)

### Step 1 — Header copy reduction on `/customer`

- Remove hero sub-header fragments that are currently low-value for booking intent (`Ride`, `Pune, IN Change city`).
- Keep `Request a ride` headline and booking controls intact.

### Step 2 — Navbar auth action clarity + theme

- Update top-right auth action to always show text next to icon on mobile and desktop.
- Add simple session-aware label:
  - Signed in: `Sign out`
  - Signed out: `Sign in`
- Apply green-themed button treatment consistent with Tamayo tokens.
- Behavior:
  - Signed in -> existing logout flow.
  - Signed out -> navigate to `/login?callbackUrl=/customer`.

### Step 3 — Location typography reduction

- Reduce `Pickup location` / `Dropoff location` input text classes by roughly 20% from current baseline.
- Apply to both filled and placeholder visual states through shared field helper in `/customer`.

### Step 4 — One-way info reduction

- Reduce one-way info section scale (label, icon size, tooltip body text, and container density) by around 20%.
- Keep meaning/copy unchanged.

### Step 5 — AM/PM in date-time summary

- Update compact date-time summary formatter to show 12-hour time with AM/PM.
- Ensure this is reflected in the closed trigger text (outside picker).

---

## Validation checklist

- `/customer` mobile: no `Ride` row and no `Pune, IN Change city`.
- Auth action always shows readable text with icon.
- Pickup/dropoff text appears visually smaller (~20%).
- One-way info card appears denser and smaller while still legible.
- Date-time summary includes AM/PM.
- Lint clean for touched files.

---

## Documentation synchronization

After implementation, update:

- `docs/features/customer-post-login-ui-implementation-plan.md` revision log.
- `docs/features/app-shell.md` revision log (for navbar auth-action presentation change).
- `docs/project/current-state.md` revision log.
