# Feature documentation

Each **major feature or module** gets its own markdown file in this directory (for example [`booking-lifecycle.md`](./booking-lifecycle.md), [`pricing-engine.md`](./pricing-engine.md), [`vehicle-management.md`](./vehicle-management.md), [`supplier-operations.md`](./supplier-operations.md), [`billing-settlement.md`](./billing-settlement.md)). These files are the **source of truth** for behavior before and during implementation.

## Maturity (required)

Near the top of every feature doc, set **one** of (UPPERCASE):

`DRAFT` · `FOUNDATION` · `MVP` · `STABLE` · `SCALING`

**Preferred:** `**Maturity:** MVP`  
**Alternate:** `**Status:** MVP` (same five values—use for consistency with older docs only if needed)

Definitions and AI expectations live in **`.cursorrules`** under “Feature maturity levels”.

Cross-cutting specifications that span many features (for example **[design-system.md](./design-system.md)**, **[app-shell.md](./app-shell.md)**, **[auth-rbac.md](./auth-rbac.md)**, or **[frontend-auth-architecture.md](./frontend-auth-architecture.md)**) also live here and should declare **Maturity** like any other spec. Domain marketplace specs (for example **[booking-lifecycle.md](./booking-lifecycle.md)**, **[pricing-engine.md](./pricing-engine.md)**, **[vehicle-management.md](./vehicle-management.md)**, **[supplier-operations.md](./supplier-operations.md)**, **[billing-settlement.md](./billing-settlement.md)**) live here too.

See `.cursorrules` (Documentation-first & feature memory) and `docs/architecture.md` for how feature docs interact with global architecture.

**Project memory:** `docs/project/` — read [project/current-state.md](../project/current-state.md) first, then [project/roadmap.md](../project/roadmap.md) and related files as needed.

When you add a new feature doc, use the sections listed in `.cursorrules` under “Feature doc contents”.
