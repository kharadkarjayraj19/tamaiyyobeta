# Tamayo — Backend Foundation (Application Layer)

**Maturity:** FOUNDATION  
**Purpose:** Established **repository**, **service**, **validation**, and **error handling** patterns for Tamayo backend application layer—ready for API implementation.

**Related docs:** [`backend-architecture.md`](./backend-architecture.md) (stack), [`api-architecture.md`](./api-architecture.md) (handler → service → repository), [`prisma-data-architecture.md`](./prisma-data-architecture.md) (persistence), [`prisma-schema-planning.md`](./prisma-schema-planning.md) (schema).

---

## Architecture layers

```
API Handler (Route)
    ↓ validates DTO (Zod)
    ↓ calls service
Service Layer
    ↓ validates business rules
    ↓ orchestrates repositories
    ↓ manages transactions
Repository Layer
    ↓ Prisma queries only
    ↓ maps to domain types
Prisma Client
    ↓
PostgreSQL
```

---

## 1. Error System

**Location:** `src/lib/errors/`

**Operational error classes:**

| Error | Code | Status | Usage |
| --- | --- | --- | --- |
| `ValidationError` | `VALIDATION_ERROR` | 400 | Invalid input data, business rule validation failures |
| `NotFoundError` | `NOT_FOUND` | 404 | Entity not found by ID/ref |
| `ConflictError` | `CONFLICT` | 409 | Business rule conflicts (booking already cancelled, vehicle on-trip) |
| `ForbiddenError` | `FORBIDDEN` | 403 | Authorization failed (wrong owner, role mismatch) |
| `UnauthorizedError` | `UNAUTHORIZED` | 401 | Authentication failed (no session, expired) |

**Pattern:**

```typescript
import { NotFoundError, ValidationError, ConflictError } from "@/lib/errors";

// In repositories
if (!entity) throw new NotFoundError("Booking", id);

// In services (business rules)
if (startDate < now) {
  throw new ValidationError("Trip start date must be in future");
}

if (booking.status === "CANCELLED") {
  throw new ConflictError("Booking is already cancelled");
}

// In API handlers (translate to HTTP)
try {
  const result = await service.doOperation(data);
  return Response.json(result, { status: 200 });
} catch (error) {
  if (isOperationalError(error)) {
    return Response.json(
      { error: error.message, code: error.code },
      { status: error.statusCode }
    );
  }
  // Log unexpected errors
  throw error;
}
```

---

## 2. Validation System

**Location:** `src/lib/validation/`

**Zod-based validation:**

```typescript
import { z } from "zod";
import { validateDto, commonSchemas } from "@/lib/validation";

// Define DTO schema
const CreateBookingSchema = z.object({
  customerId: commonSchemas.uuid,
  productType: z.enum(["ONE_WAY", "ROUND_TRIP"]),
  tripStartDate: z.coerce.date(),
  sourceCity: commonSchemas.nonEmptyString,
  estimatedKm: commonSchemas.positiveInt.optional(),
});

// In API handler
const data = validateDto(CreateBookingSchema, await request.json());
// Throws ValidationError if invalid

// Pass to service (shape-valid, but services validate business rules)
const booking = await bookingService.createBooking(data);
```

**Common schemas:**

- `uuid` — UUID string validation
- `phone` — India phone (+91 format)
- `email` — Email validation
- `nonEmptyString` — Trimmed non-empty string
- `positiveInt` / `nonNegativeInt` — Integer validation
- `decimalString` — Monetary value (e.g. "123.45")
- `paginationOffset` / `paginationLimit` — Pagination params

---

## 3. Repository Layer

**Location:** `src/lib/repositories/`

**Pattern:** Prisma queries only, map to domain types, accept optional transaction client.

**Structure:**

```typescript
import type { PrismaTransactionClient } from "@/lib/db/types";
import prisma from "@/lib/db/prisma";
import { NotFoundError } from "@/lib/errors";

// Domain type (ORM-agnostic)
export interface EntityDomain {
  id: string;
  // ... fields
}

export class EntityRepository {
  async findById(
    id: string,
    tx?: PrismaTransactionClient
  ): Promise<EntityDomain> {
    const client = tx ?? prisma;
    const entity = await client.entity.findUnique({ where: { id } });
    if (!entity) throw new NotFoundError("Entity", id);
    return this.toDomain(entity);
  }

  async create(
    data: CreateData,
    tx?: PrismaTransactionClient
  ): Promise<EntityDomain> {
    const client = tx ?? prisma;
    const entity = await client.entity.create({ data });
    return this.toDomain(entity);
  }

  private toDomain(prismaModel: PrismaModel): EntityDomain {
    // Explicit mapping — services never see Prisma types
    return { id: prismaModel.id, /* ... */ };
  }
}

export const entityRepository = new EntityRepository();
```

**Conventions:**

- ✅ Accept `tx?: PrismaTransactionClient` for transaction support
- ✅ Map Prisma models → domain types via `toDomain()`
- ✅ Throw `NotFoundError` when entity not found
- ✅ Filter `deletedAt IS NULL` for soft-deleted entities
- ❌ **Don't** implement business logic (services own workflows)
- ❌ **Don't** start transactions (services own boundaries)

**Example implementations:**

- `identity/customer-repository.ts` — CustomerAccount CRUD
- `booking/booking-repository.ts` — Booking queries with filters, pagination

---

## 4. Service Layer

**Location:** `src/lib/services/`

**Pattern:** Business logic orchestration, transaction management, domain workflow ownership.

**Structure:**

```typescript
import prisma from "@/lib/db/prisma";
import { withTransaction } from "@/lib/db/transactions";
import { ValidationError, ConflictError } from "@/lib/errors";

export class EntityService {
  async performOperation(request: ServiceRequest): Promise<Result> {
    // 1. Validate business rules
    this.validateBusinessRules(request);

    // 2. Orchestrate within transaction
    return withTransaction(prisma, async (tx) => {
      const entity1 = await repo1.create(data1, tx);
      const entity2 = await repo2.create(data2, tx);
      await eventRepo.append(event, tx);
      return entity1;
    });
  }

  private validateBusinessRules(request: ServiceRequest): void {
    if (/* rule violation */) {
      throw new ValidationError("Business rule violated");
    }
  }
}

export const entityService = new EntityService();
```

**Conventions:**

- ✅ Orchestrate multiple repositories within transactions
- ✅ Validate business rules (beyond DTO shape)
- ✅ Enforce authorization/ownership checks
- ✅ Return domain types (ORM-agnostic)
- ❌ **Don't** expose Prisma types to handlers
- ❌ **Don't** nest transactions (Prisma limitation)
- ❌ **Don't** implement data access (repositories own queries)

**Example implementations:**

- `booking/booking-service.ts` — Booking creation orchestration (foundation only)

---

## 5. Transaction Helpers

**Location:** `src/lib/db/transactions.ts`

**Usage:**

```typescript
import { withTransaction, withTransactionTimeout } from "@/lib/db/transactions";

// Standard transaction
await withTransaction(prisma, async (tx) => {
  const booking = await bookingRepo.create(data, tx);
  await snapshotRepo.create(booking.id, snapshot, tx);
  await eventRepo.append(event, tx);
  return booking;
});

// Transaction with custom timeout (default 5s → 10s)
await withTransactionTimeout(prisma, async (tx) => {
  // Long-running operation
}, 10000);
```

---

## 6. Backend Types

**Location:** `src/types/backend.ts`

**Common types:**

```typescript
// Pagination
interface PaginationParams {
  offset: number;
  limit: number;
}

interface PaginatedResult<T> {
  data: T[];
  total: number;
  offset: number;
  limit: number;
  hasMore: boolean;
}

// Date range filtering
interface DateRangeFilter {
  fromDate?: Date;
  toDate?: Date;
}

// API results
type Result<T> = SuccessResult<T> | ErrorResult;
```

---

## 7. Layer Boundaries

| Concern | Repository | Service | Handler |
| --- | --- | --- | --- |
| **Prisma queries** | ✅ | ❌ | ❌ |
| **Domain types** | ✅ Map from Prisma | ✅ Use | ❌ (DTOs only) |
| **Business rules** | ❌ | ✅ | ❌ |
| **Transactions** | Participate | ✅ Orchestrate | ❌ |
| **Authorization** | ❌ | ✅ | ✅ Extract session |
| **DTO validation** | ❌ | ❌ | ✅ Zod schemas |
| **HTTP concerns** | ❌ | ❌ | ✅ Status codes |
| **Operational errors** | ✅ Throw | ✅ Throw | ✅ Translate to HTTP |

---

## 8. Implementation Status

**Implemented (Foundation):**

- ✅ Error system (5 operational error classes)
- ✅ Validation system (Zod helpers + common schemas)
- ✅ Transaction helpers (`withTransaction`, `withTransactionTimeout`)
- ✅ Repository pattern (CustomerAccount, Booking examples)
- ✅ Service pattern (BookingService example)
- ✅ Backend types (pagination, results)
- ✅ Conventions documented (`repositories/README.md`, `services/README.md`)

**Planned (API Implementation Phase):**

- Remaining repositories as APIs are built:
  - SupplierAccountRepository
  - VehicleRepository, DriverRepository
  - BookingItineraryRepository, BookingPricingSnapshotRepository
  - AssignmentHistoryRepository, TripExecutionRepository
  - QuoteRepository, FinalBillRepository
  - PaymentRepository, RefundRepository
  - SupplierEarningRepository, PayoutBatchRepository
  - UploadRepository
  - DomainEventRepository, SupportNoteRepository
- Remaining services as workflows are implemented:
  - SupplierService (onboarding, assignment)
  - VehicleService (inventory management)
  - BillingService (quote, final bill, variance)
  - PaymentService (capture, refund)
  - SettlementService (payout batching)
  - CustomerService (profile, trip list)
  - AdminService (overrides, verification)

**Not Implemented Yet:**

- ❌ API route handlers (Next.js `/api/v1/` routes)
- ❌ Full booking workflows (pricing snapshots, itinerary, quote)
- ❌ Supplier assignment workflows
- ❌ Billing generation workflows
- ❌ Payment capture/refund workflows
- ❌ Payout batching workflows

---

## 9. Next Steps for API Development

When implementing API routes:

1. **Read feature specs:**
   - `docs/features/booking-lifecycle.md` — Booking workflows
   - `docs/features/billing-settlement.md` — Financial workflows
   - `docs/features/supplier-operations.md` — Supplier workflows

2. **Define DTO schemas** (Zod) for each endpoint

3. **Implement repositories** needed for the API

4. **Implement service methods** orchestrating repositories

5. **Create API handlers** at `src/app/api/v1/`:
   - Validate DTOs (Zod)
   - Extract session/auth context
   - Call service
   - Translate errors to HTTP responses

6. **Test with Prisma Studio** or seed data

---

## Related Documentation

- [`backend-architecture.md`](./backend-architecture.md) — Overall backend stack and modules
- [`api-architecture.md`](./api-architecture.md) — REST API conventions and handler patterns
- [`prisma-data-architecture.md`](./prisma-data-architecture.md) — Persistence philosophy
- [`prisma-schema-planning.md`](./prisma-schema-planning.md) — Schema implementation blueprint
- [`src/lib/repositories/README.md`](../../src/lib/repositories/README.md) — Repository patterns and conventions
- [`src/lib/services/README.md`](../../src/lib/services/README.md) — Service patterns and conventions

---

**Last updated:** 2026-05-18  
**Status:** Foundation complete; ready for API implementation.
