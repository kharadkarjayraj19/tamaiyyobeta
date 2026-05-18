# Domain models

**Purpose:** Foundational **entity and relationship** architecture for Tamaiyyo implementation—complements **`docs/features/*.md`** (behavior) and **`docs/architecture/backend-architecture.md`** (stack/modules). These documents describe **what exists** in the domain, not SQL or REST contracts.

| Document | Scope |
| --- | --- |
| **[identity-domain-model.md](./identity-domain-model.md)** | Identities, accounts (customer/supplier/admin), auth linkage, verification, supplier rosters |
| **[vehicle-domain-model.md](./vehicle-domain-model.md)** | Vehicle records, lifecycle states, booking-time vehicle+driver assignment (no permanent vehicle–driver link) |
| **[booking-domain-model.md](./booking-domain-model.md)** | Booking (commercial), trip execution (ops), assignments, snapshots, payments, audit timeline |
| **[billing-domain-model.md](./billing-domain-model.md)** | Quote, final bill, payments, settlement, commission, refunds, financial audit |

Persistence mapping (tables, indexes, Prisma boundaries): **[`../prisma-data-architecture.md`](../prisma-data-architecture.md)** (philosophy), **[`../prisma-schema-planning.md`](../prisma-schema-planning.md)** (concrete model groups).

Add new domain model docs here when a bounded context needs a durable entity blueprint before schema design.
