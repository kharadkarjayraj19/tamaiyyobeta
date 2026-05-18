# Tamaiyyo — Service Layer

**Purpose:** Service modules own **business logic** and **workflow orchestration**—coordinate repositories, validate business rules, manage transactions.

**Architecture:** Per `docs/architecture/api-architecture.md`:

- **Services** orchestrate repositories and own domain workflows
- **Services** validate business rules (beyond DTO shape validation)
- **Services** manage transaction boundaries via `prisma.$transaction`
- **Route handlers** call services, never repositories directly

---

## Service structure

| Folder | Owns | Coordinates |
| --- | --- | --- |
| **`booking/`** | Booking workflows, lifecycle transitions | BookingRepository, ItineraryRepository, SnapshotRepository, EventRepository |
| **`billing/`** | Billing, payment, settlement workflows | QuoteRepository, FinalBillRepository, PaymentRepository, EarningRepository |
| **`supplier/`** | Supplier operations, assignment | SupplierRepository, VehicleRepository, DriverRepository, AssignmentRepository |
| **`customer/`** | Customer operations | CustomerRepository, BookingRepository |
| **`admin/`** | Admin operations, overrides | Cross-cutting repositories with RBAC checks |

---

## Service patterns

### 1. Basic structure

```typescript
import prisma from "@/lib/db/prisma";
import { withTransaction } from "@/lib/db/transactions";
import { repository1, repository2 } from "@/lib/repositories/...";
import { ValidationError, ConflictError } from "@/lib/errors";

// Service-level DTO (may be richer than repository DTOs)
export interface ServiceRequest {
  // ...
}

export class EntityService {
  /**
   * Business operation with orchestration.
   */
  async performOperation(request: ServiceRequest): Promise<Result> {
    // 1. Validate business rules
    this.validateBusinessRules(request);

    // 2. Orchestrate within transaction
    return withTransaction(prisma, async (tx) => {
      const entity1 = await repository1.create(data1, tx);
      const entity2 = await repository2.create(data2, tx);
      await eventRepo.append(event, tx);
      return entity1;
    });
  }

  /**
   * Business rule validation (beyond DTO shape).
   */
  private validateBusinessRules(request: ServiceRequest): void {
    if (/* rule violation */) {
      throw new ValidationError("Business rule violated");
    }
  }
}

export const entityService = new EntityService();
```

### 2. Transaction orchestration

Services own transaction boundaries:

```typescript
import { withTransaction } from "@/lib/db/transactions";

async createBookingWithSnapshot(
  request: CreateBookingRequest
): Promise<BookingDomain> {
  // Validate business rules first (outside transaction)
  this.validateTripDates(request.startDate, request.endDate);

  // Orchestrate repositories within transaction
  return withTransaction(prisma, async (tx) => {
    // Generate refs, check conflicts, etc.
    const bookingRef = await this.generateBookingRef(tx);

    // Create booking
    const booking = await bookingRepo.create(
      { ...request, bookingRef },
      tx
    );

    // Create related entities atomically
    await itineraryRepo.create(booking.id, itinerary, tx);
    await snapshotRepo.create(booking.id, snapshot, tx);
    await eventRepo.append(
      { type: "booking.created", entityId: booking.id },
      tx
    );

    return booking;
  });
}
```

### 3. Business rule validation

Services validate beyond DTO shape:

```typescript
/**
 * Validate trip dates (business rule).
 */
private validateTripDates(startDate: Date, endDate?: Date): void {
  const now = new Date();

  if (startDate < now) {
    throw new ValidationError(
      "Trip start date must be in the future or today"
    );
  }

  if (endDate && endDate <= startDate) {
    throw new ValidationError(
      "Trip end date must be after start date"
    );
  }
}

/**
 * Validate supplier can accept booking (business rule).
 */
private async validateSupplierCanAccept(
  supplierId: string,
  bookingId: string
): Promise<void> {
  const supplier = await supplierRepo.findById(supplierId);

  if (supplier.status !== "ACTIVE") {
    throw new ConflictError(
      "Supplier cannot accept bookings (not active)"
    );
  }

  // Check vehicle availability, capacity, etc.
}
```

### 4. Authorization checks

Services enforce ownership/RBAC:

```typescript
/**
 * Get booking with authorization check.
 */
async getBookingForCustomer(
  bookingId: string,
  customerId: string
): Promise<BookingDomain> {
  const booking = await bookingRepo.findById(bookingId);

  // Verify ownership
  if (booking.customerId !== customerId) {
    throw new ForbiddenError(
      "You do not have access to this booking"
    );
  }

  return booking;
}
```

### 5. Lifecycle transitions

Services own state machine logic:

```typescript
/**
 * Cancel booking (lifecycle transition).
 */
async cancelBooking(
  bookingId: string,
  cancelledBy: ActorType,
  reason?: string
): Promise<BookingDomain> {
  return withTransaction(prisma, async (tx) => {
    const booking = await bookingRepo.findById(bookingId, tx);

    // Business rule: cannot cancel if already in-progress
    if (booking.status === "IN_PROGRESS") {
      throw new ConflictError(
        "Cannot cancel booking that is in progress"
      );
    }

    // Update status
    const updated = await bookingRepo.update(
      bookingId,
      {
        status: "CANCELLED",
        cancelledBy,
        cancelledAt: new Date(),
        cancelledReason: reason,
      },
      tx
    );

    // Append event
    await eventRepo.append(
      {
        type: "booking.cancelled",
        entityId: bookingId,
        actorType: cancelledBy,
        payload: { reason },
      },
      tx
    );

    // TODO: Trigger refund workflow if applicable

    return updated;
  });
}
```

---

## Service conventions

### ✅ DO

- Orchestrate multiple repositories within transactions
- Validate business rules (not just DTO shape)
- Enforce authorization/ownership checks
- Manage transaction boundaries via `withTransaction()`
- Return domain types (ORM-agnostic)
- Throw operational errors (`ValidationError`, `ConflictError`, etc.)
- Document business rules in method comments

### ❌ DON'T

- **Don't** expose Prisma types or clients to route handlers
- **Don't** nest transactions (Prisma limitation)
- **Don't** implement data access logic (repositories own queries)
- **Don't** handle HTTP concerns (status codes, headers — handlers own)
- **Don't** catch operational errors silently (let handlers translate)

---

## Service vs Repository boundaries

| Concern | Repository | Service |
| --- | --- | --- |
| **Prisma queries** | ✅ Yes | ❌ No |
| **Transaction orchestration** | ❌ No | ✅ Yes |
| **Business rules** | ❌ No | ✅ Yes |
| **Lifecycle transitions** | ❌ No | ✅ Yes |
| **Authorization** | ❌ No | ✅ Yes |
| **Domain types** | ✅ Map from Prisma | ✅ Use domain types |
| **Operational errors** | ✅ Throw | ✅ Throw |

---

## Example implementations

**Foundation examples:**

- `booking/booking-service.ts` — Booking creation orchestration (foundation only)

**Patterns demonstrated:**

- Transaction orchestration (`withTransaction`)
- Business rule validation (trip dates)
- Booking ref generation (placeholder)
- Domain type usage (ORM-agnostic)

**Not yet implemented (planned):**

- Full booking creation with itinerary, pricing snapshot, quote
- Supplier assignment workflow
- Vehicle+driver assignment
- Billing generation
- Payment capture orchestration
- Payout batching
- Cancellation with refund workflow

---

## Status

**Implemented:**

- Service foundation structure
- BookingService (orchestration example)
- Transaction patterns
- Business rule validation patterns

**Planned:**

- Remaining services as API routes are built:
  - SupplierService (onboarding, assignment)
  - VehicleService (inventory management)
  - BillingService (quote, final bill, variance)
  - PaymentService (capture, refund)
  - SettlementService (payout batching)
  - CustomerService (profile, trip list)
  - AdminService (overrides, verification)

---

## Related documentation

- [`docs/architecture/api-architecture.md`](../../docs/architecture/api-architecture.md) — Handler → Service → Repository layering
- [`docs/features/booking-lifecycle.md`](../../docs/features/booking-lifecycle.md) — Booking workflow specification
- [`docs/features/billing-settlement.md`](../../docs/features/billing-settlement.md) — Financial workflow specification
- [`docs/features/supplier-operations.md`](../../docs/features/supplier-operations.md) — Supplier workflow specification
- [`src/lib/repositories/README.md`](../repositories/README.md) — Repository patterns
