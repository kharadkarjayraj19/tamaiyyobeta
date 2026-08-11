# Tamaiyyo — application shell & dashboard UI foundation

**Maturity:** FOUNDATION  
**Purpose:** Document the **cross-role application shell** (navigation chrome, layout primitives, table/card wrappers, loading/empty patterns) so implementation stays aligned with `docs/features/design-system.md` and `.cursorrules`.

This is **not** a product feature spec: no authentication, booking, pricing, or backend contracts.

---

## Summary

The web app uses a single **role-aware dashboard shell** (`RoleDashboardShell`) composed of:

- Skip link → sticky **top navbar** → **desktop sidebar** + **scrollable main** (with `PageContainer`).
- **Mobile:** the same primary nav renders in a **left `Sheet` drawer** (Radix Dialog) toggled from the navbar menu button.
- **Navigation data** lives in `src/config/navigation.ts` (serializable items + `AppRole`). Icons are mapped client-side in `nav-icon.tsx` so config stays free of React components.

Customer, supplier, and admin route layouts each render the same shell with a different `role` prop—**one implementation, three surfaces**, reducing drift.

---

## Token & styling decisions

- **Semantic tokens first:** Existing shadcn HSL variables remain the base. **Shell-specific** variables were added in `src/app/globals.css`:
  - `--sidebar-background`, `--sidebar-foreground`, `--sidebar-border`, `--sidebar-width`
  - `--elevated` for slightly lifted surfaces (e.g. sticky navbar backdrop)
- **Tailwind mapping:** `tailwind.config.ts` exposes `sidebar`, `elevated`, `maxWidth.content` (`80rem`), and `width.sidebar` (`var(--sidebar-width)`).
- **Layout class strings** that would otherwise be copy-pasted are centralized in `src/config/ui.ts` (`uiLayout`)—not a second theme system, just **DRY layout utilities**.

---

## Component map (where things live)

| Piece | Path | Notes |
| --- | --- | --- |
| App shell wrapper | `components/shared/layout/app-shell.tsx` | Full-height column, `bg-background`. |
| Dashboard grid | `components/shared/layout/dashboard-layout.tsx` | Top bar + sidebar column (`lg+`) + main region. |
| Role wiring (client) | `components/shared/layout/role-dashboard-shell.tsx` | Sheet + pathname-aware nav + `PageContainer`. |
| Top navbar | `components/shared/layout/top-navbar.tsx` | Menu (mobile), home link, role label; `trailing` slot. |
| Sidebar list | `components/shared/layout/sidebar.tsx` | `aria-label` includes role; uses `NavLink`. |
| Nav link | `components/shared/layout/nav-link.tsx` | `aria-current="page"`; nested routes: `startsWith(\`${href}/\`)`. |
| Page container | `components/shared/layout/page-container.tsx` | `default` vs `wide` (`max-w-none`) max width. |
| Section header | `components/shared/layout/section-header.tsx` | Title, description, optional actions + separator. |
| Skip link | `components/shared/layout/skip-to-content.tsx` | Targets `#main-content` (`MAIN_CONTENT_ID`). |
| Dashboard card | `components/shared/dashboard/dashboard-card.tsx` | Thin wrapper over shadcn `Card`. |
| Table shell | `components/shared/data-display/data-table-shell.tsx` | Toolbar / table / footer slots; horizontal scroll. |
| Empty state | `components/shared/feedback/empty-state.tsx` | Neutral copy only; feature docs own product voice. |
| Page skeleton | `components/shared/feedback/page-skeleton.tsx` | Route-level `loading.tsx` default. |
| Nav config | `src/config/navigation.ts` | Extend per role as routes are added. |

**shadcn primitives added:** `card`, `sheet`, `skeleton`, `separator` under `components/ui/`.

---

## Responsive & accessibility behavior

- **Desktop (`lg` and up):** sidebar visible; menu button hidden.
- **Below `lg`:** sidebar hidden; **Sheet** shows the same nav links; closing on navigation click avoids stale overlay state.
- **Active route:** `NavLink` compares `usePathname()` with exact match or prefix-with-slash for nested routes.
- **Keyboard:** Skip link is first focusable; main uses `tabIndex={-1}` so skip target can receive focus; Radix `Sheet` manages focus trap while open.
- **Motion:** Skeleton uses `motion-reduce:animate-none`; Sheet overlay/content respect `motion-reduce` where Tailwind animate utilities apply.

---

## Boundaries (intentionally)

- **No full auth UI** (sign-in forms, OTP, OAuth buttons) in this milestone — placeholders live at `/login` and `/forbidden`; Better Auth HTTP surface is at `/api/auth/*`.
- **No data fetching** in shell components — pages/layouts own data when introduced.
- **No business rules** in `components/shared/**` — only presentation and layout composition.
- **Navigation labels** are neutral placeholders until product/i18n owns copy.
- **Session bridge:** `SessionBridgeProvider` supplies minimal client context from server layouts (`src/features/auth/role-dashboard-with-auth.tsx`); keep shell chrome free of secrets.

---

## Extension points

1. **More nav items:** append to `navigationByRole` with new `href`s; add icon keys to `NavIconKey` + `nav-icon.tsx` map.
2. **Role-specific density:** pass `className` into `PageContainer` / `DashboardCard` from route-level wrappers—not by branching inside primitives.
3. **Toolbar actions:** supply `DataTableShell` `toolbar` slot from page-level code or small feature components under `src/features/*`.
4. **Authentication:** `TopNavbar` `trailing` slot + `useSessionBridge()` from `src/features/auth/session-bridge-provider.tsx` (see `docs/features/frontend-auth-architecture.md`).

---

## Flutter / cross-platform note

Behavioral and token-level parity for future Flutter work should follow `docs/features/design-system.md` §25. This shell document is **web-only implementation detail**; semantic names here (`sidebar`, `elevated`) should stay stable when mobile clients appear.

---

## Revision log

| Date | Change |
| --- | --- |
| 2026-05-13 | Initial shell: tokens, layouts, nav, cards, table shell, skeletons, empty states, role layouts wired. |
| 2026-05-14 | Linked Better Auth foundation: `RoleDashboardWithAuth` wraps shell with `SessionBridgeProvider`; `/login` placeholder. |
| 2026-08-07 | Navigation expanded with role-specific operational entries (`/customer/booking-quote`, `/admin/one-way-corridors`) to support pricing flow verification. |
