# Tamayo — Frontend design system specification

**Maturity:** FOUNDATION  
**Stack:** Next.js App Router, TypeScript, Tailwind CSS, shadcn/ui  
**Audience:** Designers, frontend engineers, and AI agents implementing UI

**Scope:** Cross-cutting UI specification; no product-specific business flows assumed.

This document defines **how** Tamayo’s web interface should look, feel, and scale. It intentionally avoids concrete business features (pricing engines, trip models, etc.); those belong in per-feature specs under `docs/features/` once defined.

---

## 1. Design philosophy

- **Clarity over decoration:** Every visual choice should reduce cognitive load for people booking travel or operating a business on the platform.
- **Premium without excess:** A modern marketplace should feel polished—crisp typography, generous whitespace, restrained color—not busy or gimmicky.
- **Role-aware, not role-chaotic:** Customer, supplier, and admin surfaces share one **visual language** (tokens, components, motion) while allowing **density and navigation** to differ by role.
- **System over screens:** Prefer tokens, primitives, and documented patterns so new screens do not reinvent basics.
- **Startup-friendly:** Start with a small set of tokens and components; extend the system when repetition or new requirements justify it—document additions here or in linked notes.

---

## 2. UX philosophy

- **Responsive-first, mobile-first:** Design and validate layouts from the smallest practical viewport upward; enhance for larger screens rather than shrinking desktop-only designs.
- **Progressive disclosure:** Show what is needed for the current task; defer advanced or rare actions behind clear entry points (menus, secondary pages, “more” patterns).
- **Predictable patterns:** Similar tasks (e.g. search, filters, confirmations) should behave consistently across roles where the mental model overlaps.
- **Forgiving flows:** Prefer recoverable actions, clear confirmations for destructive work, and obvious ways to go back or cancel—exact copy and flows are defined in feature docs when products exist.
- **Speed perception:** Use skeletons, optimistic UI where safe, and lightweight motion so the product feels responsive even when the network is not.

---

## 3. Trust-oriented UI principles

- **Honesty in UI:** Do not imply guarantees the platform has not documented (e.g. “instant” without a defined SLA). Use neutral, factual language until product/legal copy exists.
- **Stability and consistency:** Misaligned spacing, random fonts, or inconsistent buttons erode trust; the design system exists partly to prevent that.
- **Visibility of system status:** Users should always understand where they are (navigation, page titles), what is happening (loading, saving), and what went wrong (errors with next steps when known).
- **Security-conscious patterns:** Mask sensitive inputs by default; avoid echoing secrets; follow accessibility without sacrificing safe defaults for authentication UIs (detailed in feature specs later).
- **Human tone, professional register:** Warm but not casual to the point of ambiguity—especially for money and travel decisions.

---

## 4. Responsive strategy

- **Breakpoints:** Align with Tailwind defaults unless a documented override is needed; name custom breakpoints in this doc when introduced.
- **Content-first reflow:** Prioritize readable line lengths, tappable targets, and scrollable regions over cramming desktop tables onto small screens.
- **Touch targets:** Interactive controls should meet or exceed common minimum touch sizes on mobile; secondary compact targets are allowed on desktop with care.
- **Adaptive components:** Tables may become cards or stacked rows; filters may collapse into sheets or drawers; document the chosen pattern per surface in feature docs when implemented.
- **Testing expectation:** Critical paths should be manually checked at least at one narrow mobile width, one tablet width, and one desktop width before release.

---

## 5. Layout philosophy

- **Predictable page frames:** Role layouts share a common structure idea: **orientation region** (where am I?) → **primary work area** → **supporting panels** optional on large screens.
- **Max content width:** Long-form reading and marketing-style content use a bounded max width; dashboards may use full width with internal grids.
- **Grid over arbitrary pixels:** Prefer CSS grid/flex and spacing tokens over one-off positioning.
- **Sticky context:** Headers or sub-navigation may stick on scroll when it helps users retain context; avoid sticky clutter that hides primary actions.
- **Role shells:** Customer experiences may emphasize simplicity; supplier and admin areas may allow higher information density—still using the same spacing and type scales.

---

## 6. Color system

- **Semantic first:** Map UI to semantic roles (`background`, `foreground`, `primary`, `muted`, `destructive`, `border`, etc.) via CSS variables (shadcn-compatible), not raw hex in components.
- **Contrast:** Meet **WCAG AA** as the default target for text and essential UI; strive for AAA where cheap (large headings, critical warnings).
- **Brand accents:** Introduce brand primary/secondary as token aliases when brand guidelines exist; until then, neutral-first palettes reduce rework.
- **State colors:** Success, warning, and info tones should be distinct from destructive actions; define tokens when those states appear in product specs.
- **Dark mode:** Treat light and dark as first-class themes once enabled; same semantic tokens, adjusted values—no hard-coded light-only colors in shared components.

---

## 7. Typography system

- **Scale:** Use a constrained type scale (e.g. step-based `text-*` utilities mapped to design intent: display, title, body, caption, overline). Document numeric rem/px equivalents when the team locks them.
- **Weights:** Limited set (e.g. regular, medium, semibold); reserve the heaviest weight for rare emphasis.
- **Font stacks:** One sans family for UI (current stack: Geist / system per app setup); monospace for code, IDs, or technical readouts in admin contexts.
- **Line height & tracking:** Body copy prioritizes readability; dense dashboards may use slightly tighter line height **only** within table or metric components—not globally without review.
- **Numbers & data:** Tabular figures for aligned numeric columns when supported; document in table standards (section 16).

---

## 8. Spacing system

- **Token-based rhythm:** Prefer Tailwind spacing scale (`4`, `6`, `8`, `12`, `16`, …) over arbitrary values; custom spacing gets a token name if reused.
- **Vertical rhythm:** Section gaps and card padding follow multiples of a base unit so pages feel even.
- **Density modes:** “Comfortable” vs “compact” density may be introduced later for admin tables; default to comfortable until product asks otherwise.
- **Touch vs pointer:** Mobile layouts use larger gaps and padding around tappable clusters; desktop may tighten slightly without crowding click targets.

---

## 9. Elevation / shadow system

- **Restrained depth:** Shadows signal layering (dropdown over page, modal over app)—not decoration for every card.
- **Levels:** Define a small number of elevation levels (e.g. flat, raised, overlay, modal) mapped to shadow tokens; avoid one-off `shadow-xl` unless documented.
- **Borders vs shadows:** Prefer subtle borders for separation in dense UIs; use shadow for floating layers.
- **Dark mode:** Shadows may be softer or replaced by border/glow patterns—tune when dark theme ships.

---

## 10. Border radius system

- **Family of radii:** Align with shadcn `--radius` and derived `sm` / `md` / `lg` patterns for cards, inputs, and buttons.
- **Consistency:** Do not mix arbitrarily sharp and round corners on the same surface without intent (e.g. sharp media inside rounded cards is acceptable).
- **Pills vs rounds:** Full pills for chips/tags; standard radius for inputs and buttons unless a component spec says otherwise.

---

## 11. Motion / animation philosophy

- **Purposeful:** Motion guides attention (reveal, feedback), not distracts; respect `prefers-reduced-motion`.
- **Short durations:** Micro-interactions stay brief; page transitions stay subtle unless marketing explicitly needs more.
- **Easing:** Default to standard ease curves; document any custom curves if introduced.
- **Loading:** Prefer opacity/transform animations over layout thrash; avoid animating properties that trigger expensive reflows without need.

---

## 12. Icon usage standards

- **Library:** Lucide (aligned with shadcn) as default; do not mix multiple icon families without a documented exception.
- **Sizing:** Icons pair with text sizes (e.g. inline with buttons, list rows); use consistent `size` steps.
- **Meaning:** Icons reinforce labels, especially on mobile; icon-only controls need accessible names.
- **Density:** Admin dashboards may use smaller inline icons; customer flows may use slightly larger touch-friendly icons.

---

## 13. Component hierarchy

1. **Tokens** — color, type, spacing, radius, shadow (CSS variables + Tailwind theme).
2. **Primitives (shadcn `ui`)** — Button, Input, Dialog, Sheet, etc.: unopinionated building blocks.
3. **Shared composites (`components/shared`)** — App-wide patterns that are not domain-specific (e.g. page header shell, empty state frame).
4. **Feature assemblies (`src/features/...`)** — Domain-specific UI wired to product rules per feature documentation.
5. **Routes (`src/app/...`)** — Compose the above; minimal bespoke layout per page.

Lower layers must not import higher layers. Document exceptions if a primitive ever needs a feature-specific variant (prefer composition instead).

---

## 14. UI primitive standards

- **Buttons:** Clear hierarchy (primary, secondary, outline, ghost, destructive); one primary action per logical view when possible.
- **Links:** Visually distinct from buttons except when using button-styled links for accessibility—then semantics must still be correct.
- **Inputs:** Always associate labels; show inline help and errors in a consistent position; avoid placeholder-only labels.
- **Dialogs & sheets:** Use for focused tasks or mobile navigation; modals block background—use sparingly for non-blocking information prefer inline or toast patterns (when toast system is defined).
- **Badges & tags:** For status and categorization; color must not be the only differentiator.

---

## 15. Form design standards

- **Single column by default** on mobile; multi-column only when fields are short and related, and it does not harm mobile.
- **Grouping:** Fieldsets or visual groups for related inputs; section titles for long forms.
- **Validation:** On submit and on blur for expensive checks as defined per feature; error text is specific and actionable.
- **Disabled vs read-only:** Use intentionally; disabled submit during loading should show progress state.
- **Internationalization-ready:** Avoid hard-coded concatenation that breaks word order in other languages when i18n arrives.

---

## 16. Table design standards

- **Progressive complexity:** Start with simple sortable lists; add filtering, column visibility, and bulk actions only when product specs require them.
- **Zebra / dividers:** Use subtle row separation; avoid heavy grid unless data density demands it (admin).
- **Sticky headers:** Encouraged for long tables on desktop; consider sticky first column for wide datasets when spec’d.
- **Responsive:** On small screens, default to stacked row cards or horizontal scroll with clear scroll affordance—choose per feature and document.
- **Empty table:** Use empty state philosophy (section 20), not a blank white box.

---

## 17. Dashboard design standards

- **Scannable hierarchy:** Key metrics at top or top-left (per locale); secondary detail below or in side panels on wide screens.
- **Density with air:** More rows per screen than consumer flows, but still use spacing tokens—cramped dashboards hide errors and reduce trust.
- **Consistent widget chrome:** Cards share padding, title style, and action placement (e.g. kebab top-right).
- **Tables + charts:** When charts are introduced, use a single chart style library decision (document in architecture when chosen); do not mix chart aesthetics ad hoc.
- **Role clarity:** Supplier vs admin dashboards may differ in data shown; visual language remains shared.

---

## 18. Mobile navigation philosophy

- **Primary navigation:** Bottom nav or hamburger-to-sheet depending on information architecture per role—decide per product IA doc; default pattern is “clear entry, shallow depth for core tasks.”
- **Back behavior:** Respect platform expectations (browser back, in-app back for stacked views).
- **Avoid deep hamburger-only trees** for tasks users repeat daily; surface primary journeys within one or two taps once IA exists.
- **Safe areas:** Respect notches and home indicators; do not place critical actions flush against unsafe edges.

---

## 19. Accessibility standards

- **WCAG 2.2 AA** as the baseline for new work where applicable.
- **Keyboard:** All interactive controls reachable and operable without a mouse; visible focus rings (not removed for aesthetics).
- **Screen readers:** Semantic landmarks (`main`, `nav`), headings in order, `aria-*` only when semantics are insufficient.
- **Color:** Never rely on color alone for status; pair with text, icon, or pattern.
- **Motion:** Honor `prefers-reduced-motion` for non-essential animation.
- **Forms:** Labels, descriptions, and `aria-invalid` / `aria-describedby` for errors as implemented by primitives and composites.

---

## 20. Empty, loading, and error state philosophy

- **Loading:** Prefer skeletons that mirror final layout over generic spinners for content-heavy views; use spinners for short indeterminate actions.
- **Empty:** Explain **what** is missing, **why** it might be empty, and **what to do next** (action button or link)—copy comes from product/feature docs when flows exist.
- **Errors:** Human-readable message, optional error code for support in admin/supplier tools, clear retry or contact path when applicable.
- **Permission denied:** Distinct from “not found” where security matters; avoid leaking existence of resources when product/security spec requires it.

---

## 21. shadcn/ui usage strategy

- **Default to shadcn primitives** for interactive controls and overlays to stay accessible and consistent.
- **Customize via tokens** (theme variables) before forking component source; fork only when a primitive cannot compose to the needed pattern.
- **Add components with CLI** when possible to stay upgrade-aligned.
- **Version discipline:** Record significant shadcn or Radix upgrades in `docs/architecture.md` with migration notes if behavior shifts.

---

## 22. Tailwind usage conventions

- **Utility-first in components**; extract patterns only when duplication is stable (shared component or `@apply` in rare token-only layers—prefer components over deep `@apply` chains).
- **Group related classes** logically (layout → spacing → typography → color → state) for readability; Prettier plugin handles ordering.
- **Arbitrary values** (`[37px]`) are exceptions—require a comment or promotion to a token.
- **Responsive variants:** Mobile-first (`sm:`, `md:`) additions; avoid desktop-first `max-*` unless necessary for overrides.

---

## 23. Reusable component philosophy

- **Rule of three:** Third time the same UI pattern appears, extract to `shared` or `features` per domain relevance.
- **Props over variants:** Prefer explicit props for behavior; use `cva` variants for visual variants aligned with design tokens.
- **No prop explosion:** Split large components or use composition slots when APIs become unwieldy.
- **Documentation:** Non-trivial shared components get a short usage note in this doc or in a colocated comment block in `docs/features/` when tied to a product feature.

---

## 24. AI-agent UI development rules

- **Cross-role discipline:** Before changing primitives, shared components, tokens, layouts, navigation, or route architecture, follow **`.cursorrules` → “Cross-role UI & platform changes”** (ripple analysis across customer / supplier / admin; document major UI shifts in this file or `docs/architecture.md`).
- **Read before build:** Read this file and relevant `docs/features/<feature>.md` before implementing or changing UI for a feature; honor each doc’s **Maturity** level when judging how aggressively to change code.
- **No silent product invention:** If copy, states, or flows are unspecified, ask the user or add a draft feature doc—do not invent booking rules, SLAs, or compliance text.
- **Token discipline:** Use semantic Tailwind classes tied to design tokens, not raw palette values, unless defining tokens in `globals.css`.
- **Accessibility non-negotiable:** Do not strip focus rings, `alt` text, or labels for visual convenience.
- **Scope control:** Prefer small PR-sized UI changes; when touching primitives, verify ripple effects across roles.
- **Update this spec** when introducing a **new global** visual convention (e.g. new elevation level, chart style) so agents and humans stay aligned.

---

## 25. Future Flutter design consistency strategy

- **Single source of behavioral truth:** Product rules and flows remain in `docs/features/*.md`; Flutter and web should implement the **same** rules, not divergent interpretations.
- **Token export path (future):** When mobile work begins, define whether design tokens are exported (JSON/style dictionary), manually mirrored, or managed via a design tool pipeline—record the decision in `docs/architecture.md`.
- **Naming parity:** Semantic names (`primary`, `surface`, `danger`) should match across web and Flutter even if implementation differs.
- **Component parity:** Aim for equivalent **component capabilities** (button variants, form field states) rather than pixel-perfect identity across platforms.
- **Review gate:** UI changes that affect cross-platform semantics require updating both this document’s relevant sections **and** the mobile design spec when it exists.

---

## Revision log

| Date | Change |
| --- | --- |
| (Initial) | Foundation design system specification created. |
| — | Added cross-link to cross-role change discipline; header uses formal **Maturity** (`FOUNDATION`). |
| 2026-05-13 | Web app shell implemented per **docs/features/app-shell.md** (nav, layouts, table/card wrappers). |

When you materially change tokens, patterns, or philosophy, add a row here and link any superseded sections from `docs/architecture.md` if needed.
