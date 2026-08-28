# Tamayo — Repository Layer

**Purpose:** Repository modules own **Prisma queries** and map between Prisma models and domain types—**no business logic** in repositories.

**Architecture:** Per `docs/architecture/api-architecture.md` and `docs/architecture/prisma-data-architecture.md`:

- **Repositories** use Prisma Client to read/write data
- **Services** orchestrate repositories and own business rules
- **Route handlers** call services, never repositories directly

---

## Repository structure

| Folder | Owns | Prisma models |
| --- | --- | --- |
| **`identity/`** | Identity, customer, supplier, admin accounts | `Identity`, `CustomerAccount`, `SupplierAccount`, `AdminAccount` |
| **`vehicle/`** | Vehicle and driver inventory | `Vehicle`, `Driver` |
| **`booking/`** | Booking, itinerary, snapshots, assignments | `Booking`, `BookingItinerary`, `BookingPricingSnapshot`, `AssignmentHistory`, `TripExecution` |
| **`billing/`** | Quotes, bills, payments, refunds, earnings, payouts | `Quote`, `FinalBill`, `CommissionSnapshot`, `Payment`, `Refund`, `SupplierEarning`, `PayoutBatch` |
| **`upload/`** | File metadata | `Upload` |
| **`event/`** | Domain events, support notes | `DomainEvent`, `SupportNote` |

---

## Repository patterns

### 1. Basic structure

```typescript
import type { ModelName } from "@prisma/client";
import prisma from "@/lib/db/prisma";
import type { PrismaTransactionClient } from "@/lib/db/types";
import { NotFoundError } from "@/lib/errors";

// Domain type (ORM-agnostic)
export interface EntityDomain {
  id: string;
  // ... fields
}

// Repository class
export class EntityRepository {
  async findById(
    id: string,
    tx?: PrismaTransactionClient
  ): Promise<EntityDomain> {
    const client = tx ?? prisma;
    const entity = await client.modelName.findUnique({ where: { id } });
    if (!entity) throw new NotFoundError("Entity", id);
    return this.toDomain(entity);
  }

  async create(
    data: CreateEntityData,
    tx?: PrismaTransactionClient
  ): Promise<EntityDomain> {
    const client = tx ?? prisma;
    const entity = await client.modelName.create({ data });
    return this.toDomain(entity);
  }

  private toDomain(model: ModelName): EntityDomain {
    return { /* map fields */ };
  }
}

export const entityRepository = new EntityRepository();
```

### 2. Transaction support

Repositories accept optional `tx` parameter:

```typescript
// In repository
async create(data: CreateData, tx?: PrismaTransactionClient) {
  const client = tx ?? prisma; // Use transaction or root client
  return client.modelName.create({ data });
}

// In service (orchestration)
import { withTransaction } from "@/lib/db/transactions";

await withTransaction(prisma, async (tx) => {
  const booking = await bookingRepo.create(data, tx);
  await snapshotRepo.create(snapshotData, tx);
  await eventRepo.append(event, tx);
});
```

### 3. Domain type mapping

Repositories map **Prisma models** → **domain types** to keep services ORM-agnostic:

```typescript
private toDomain(prismaModel: PrismaModel): DomainType {
  return {
    id: prismaModel.id,
    field: prismaModel.field,
    // Explicit mapping — services never see Prisma types
  };
}
```

### 4. Error handling

```typescript
try {
  const entity = await client.modelName.update({ where: { id }, data });
  return this.toDomain(entity);
} catch (error) {
  // Translate Prisma errors to domain errors
  if (error && typeof error === "object" && "code" in error && error.code === "P2025") {
    throw new NotFoundError("Entity", id);
  }
  throw error;
}
```

### 5. Soft-delete filtering

For operational entities with `deletedAt`:

```typescript
async findActive(
  supplierId: string,
  tx?: PrismaTransactionClient
): Promise<VehicleDomain[]> {
  const client = tx ?? prisma;
  const vehicles = await client.vehicle.findMany({
    where: {
      supplierId,
      deletedAt: null, // Filter soft-deleted
    },
  });
  return vehicles.map(this.toDomain);
}

// Admin queries may include soft-deleted with explicit flag
async findAll(
  supplierId: string,
  includeDeleted: boolean = false,
  tx?: PrismaTransactionClient
): Promise<VehicleDomain[]> {
  const client = tx ?? prisma;
  const where: any = { supplierId };
  if (!includeDeleted) {
    where.deletedAt = null;
  }
  const vehicles = await client.vehicle.findMany({ where });
  return vehicles.map(this.toDomain);
}
```

---

## Repository conventions

### ✅ DO

- Accept optional `tx?: PrismaTransactionClient` parameter
- Map Prisma models to domain types via `toDomain()` method
- Throw `NotFoundError` when entity not found (for non-null returns)
- Return `null` for `findByIdOrNull()` style methods
- Use explicit method names (`findByCustomerId`, not generic `findBy`)
- Filter `deletedAt IS NULL` for soft-deleted entities in active queries

### ❌ DON'T

- **Don't** implement business logic (lifecycle transitions, pricing, refunds)
- **Don't** orchestrate multiple repositories (services own orchestration)
- **Don't** start transactions (services own transaction boundaries)
- **Don't** expose Prisma types to services (use domain types)
- **Don't** catch and swallow errors silently

---

## Example implementations

**Foundation examples:**

- `identity/customer-repository.ts` — CustomerAccount CRUD pattern
- `booking/booking-repository.ts` — Booking queries with filters, pagination

**Patterns demonstrated:**

- Transaction participation (`tx?: PrismaTransactionClient`)
- Domain type mapping (`toDomain()`)
- Error translation (Prisma → domain errors)
- List queries with filters
- Pagination support

---

## Status

**Implemented:**

- Repository foundation structure
- CustomerAccountRepository (example)
- BookingRepository (example)
- Transaction support patterns
- Error handling patterns

**Planned:**

- Remaining repositories as API routes are built:
  - SupplierAccountRepository
  - VehicleRepository
  - DriverRepository
  - BookingItineraryRepository
  - BookingPricingSnapshotRepository
  - AssignmentHistoryRepository
  - TripExecutionRepository
  - QuoteRepository
  - FinalBillRepository
  - PaymentRepository
  - RefundRepository
  - SupplierEarningRepository
  - PayoutBatchRepository
  - UploadRepository
  - DomainEventRepository
  - SupportNoteRepository

---

## Related documentation

- [`docs/architecture/prisma-data-architecture.md`](../../docs/architecture/prisma-data-architecture.md) — Persistence philosophy
- [`docs/architecture/prisma-schema-planning.md`](../../docs/architecture/prisma-schema-planning.md) — Schema blueprint
- [`docs/architecture/api-architecture.md`](../../docs/architecture/api-architecture.md) — Handler → Service → Repository layering
- [`src/lib/services/README.md`](../services/README.md) — Service layer patterns
