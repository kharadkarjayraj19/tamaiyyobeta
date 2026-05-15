# Domain models

**Purpose:** Foundational **entity and relationship** architecture for Tamaiyyo implementation—complements **`docs/features/*.md`** (behavior) and **`docs/architecture/backend-architecture.md`** (stack/modules). These documents describe **what exists** in the domain, not SQL or REST contracts.

| Document | Scope |
| --- | --- |
| **[identity-domain-model.md](./identity-domain-model.md)** | Identities, accounts (customer/supplier/admin), auth linkage, verification, supplier rosters |
| **[vehicle-domain-model.md](./vehicle-domain-model.md)** | Vehicle records, lifecycle states, booking-time vehicle+driver assignment (no permanent vehicle–driver link) |

Add new domain model docs here when a bounded context needs a durable entity blueprint before schema design.
