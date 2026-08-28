# Tamayo — Supplier assignment and booking fulfillment APIs

**Maturity:** MVP  
**Purpose:** Operational REST API implementation for supplier booking assignment, acceptance/rejection, vehicle/driver assignment, and admin reassignment workflows. Implements booking fulfillment lifecycle for Tamayo marketplace.

**Related docs:** [`docs/features/supplier-operations.md`](./supplier-operations.md) (supplier workflows), [`docs/features/booking-lifecycle.md`](./booking-lifecycle.md) (lifecycle states), [`docs/features/vehicle-management.md`](./vehicle-management.md) (vehicle compatibility), [`docs/architecture/domain-models/booking-domain-model.md`](../architecture/domain-models/booking-domain-model.md) (assignment history), [`docs/architecture/backend-foundation.md`](../architecture/backend-foundation.md) (architecture patterns).

---

## How to read this spec

| Label | Meaning |
| --- | --- |
| **Implemented** | API routes, services, repositories, and validation schemas are implemented and type-checked. |
| **Unresolved mechanics** | Requires explicit product/ops decision or Better Auth integration before full production readiness. |

---

## 1. Booking lifecycle transitions

**Implemented**

The assignment APIs implement the following booking status transitions:

| From | To | Trigger | Actor |
| --- | --- | --- | --- |
| **REQUESTED** | **ACCEPTED** | Supplier accepts booking | SUPPLIER |
| **REQUESTED** | **CANCELLED** | Supplier rejects booking | SUPPLIER |
| **ACCEPTED** | **READY_FOR_TRIP** | Supplier assigns vehicle/driver | SUPPLIER |
| **ACCEPTED** | **ACCEPTED** | Admin reassigns to different supplier | ADMIN |

**Business rules:**
- Only **REQUESTED** bookings can be accepted/rejected by suppliers
- Only **ACCEPTED** bookings can have vehicle/driver assigned
- **CANCELLED** bookings cannot be reassigned
- **COMPLETED** bookings cannot be reassigned

---

## 2. Supplier booking queue API

**Implemented**

### 2.1. Get available bookings

**Endpoint:** `GET /api/v1/supplier/bookings/available`

**Purpose:** Retrieve bookings available for supplier to view (both unassigned and already assigned to them).

**Query parameters:**
- `status` (optional): Filter by BookingStatus
  - When `status=REQUESTED`: Returns unassigned bookings (supplierId = null)
  - When other status or no status: Returns bookings assigned to supplier
- `tripStartDateFrom` (optional): Filter by trip start date (from)
- `tripStartDateTo` (optional): Filter by trip start date (to)
- `offset` (optional, default 0): Pagination offset
- `limit` (optional, default 20, max 100): Pagination limit

**Response:**
```json
{
  "success": true,
  "data": [
    {
      "id": "booking-uuid",
      "bookingRef": "TM-A3B7C9D2",
      "customerId": "customer-uuid",
      "supplierId": null,
      "status": "REQUESTED",
      "productType": "ROUND_TRIP",
      "tripStartDate": "2026-06-01T09:00:00.000Z",
      "tripEndDate": "2026-06-02T18:00:00.000Z",
      "estimatedKm": 400,
      "sourceCity": "Bangalore",
      "destinationCity": "Mysore",
      ...
    }
  ],
  "pagination": {
    "total": 15,
    "offset": 0,
    "limit": 20
  }
}
```

---

## 3. Supplier booking acceptance/rejection APIs

**Implemented**

### 3.1. Accept booking

**Endpoint:** `POST /api/v1/supplier/bookings/[id]/accept`

**Purpose:** Supplier accepts a booking assignment.

**Request body:**
```json
{
  "notes": "Optional acceptance notes"
}
```

**Business rules:**
- Booking must be in **REQUESTED** status
- Booking must not be already assigned to another supplier
- Creates **AssignmentHistory** record with supplier only (vehicle/driver assigned later)
- Updates booking status to **ACCEPTED**
- Records **BOOKING_ACCEPTED** domain event

**Response:**
```json
{
  "success": true,
  "data": {
    "id": "booking-uuid",
    "bookingRef": "TM-A3B7C9D2",
    "supplierId": "supplier-uuid",
    "status": "ACCEPTED",
    ...
  },
  "message": "Booking accepted successfully"
}
```

---

### 3.2. Reject booking

**Endpoint:** `POST /api/v1/supplier/bookings/[id]/reject`

**Purpose:** Supplier rejects a booking assignment.

**Request body:**
```json
{
  "reason": "Not available for this date (min 10 chars)"
}
```

**Validation:** Reason must be 10-500 characters.

**Business rules:**
- Booking must be in **REQUESTED** status
- Booking must not be already assigned to another supplier
- Updates booking status to **CANCELLED**
- Records cancellation reason and actor (SUPPLIER)
- Records **BOOKING_REJECTED** domain event

**Response:**
```json
{
  "success": true,
  "data": {
    "id": "booking-uuid",
    "bookingRef": "TM-A3B7C9D2",
    "status": "CANCELLED",
    "cancelledBy": "SUPPLIER",
    "cancelledReason": "Not available for this date",
    ...
  },
  "message": "Booking rejected successfully"
}
```

---

## 4. Vehicle and driver assignment API

**Implemented**

### 4.1. Assign vehicle and driver

**Endpoint:** `POST /api/v1/bookings/[id]/assign`

**Purpose:** Supplier assigns vehicle and driver to accepted booking.

**Request body:**
```json
{
  "vehicleId": "vehicle-uuid",
  "driverId": "driver-uuid"
}
```

**Business rules:**
- Booking must be in **ACCEPTED** status
- Booking must be assigned to requesting supplier (supplierId match)
- **Vehicle ownership validation**: Vehicle must belong to supplier
- **Driver ownership validation**: Driver must belong to supplier
- **Vehicle status validation**: Vehicle must be ACTIVE (not PENDING_VERIFICATION, INACTIVE, SUSPENDED, REMOVED)
- **Driver status validation**: Driver must be ACTIVE
- **Vehicle compatibility validation**: Vehicle category must match booking's pricing snapshot category
- **Soft-delete validation**: Vehicle and driver must not be soft-deleted (deletedAt = null)

**Assignment history:**
- If current assignment exists, marks it as replaced (replacedAt timestamp)
- Creates new assignment history record with vehicle and driver
- Records **ASSIGNMENT_CREATED** or **ASSIGNMENT_CHANGED** domain event

**Status transition:**
- Updates booking status to **READY_FOR_TRIP**

**Response:**
```json
{
  "success": true,
  "data": {
    "id": "booking-uuid",
    "bookingRef": "TM-A3B7C9D2",
    "status": "READY_FOR_TRIP",
    ...
  },
  "message": "Vehicle and driver assigned successfully"
}
```

**Error responses:**
- `400 ValidationError`: Status not ACCEPTED, vehicle/driver not active, category mismatch
- `403 ForbiddenError`: Supplier doesn't own booking, vehicle, or driver
- `404 NotFoundError`: Booking, vehicle, or driver not found

---

## 5. Admin reassignment API

**Implemented**

### 5.1. Reassign booking

**Endpoint:** `POST /api/v1/admin/bookings/[id]/reassign`

**Purpose:** Admin reassigns booking from one supplier to another.

**Request body:**
```json
{
  "supplierId": "new-supplier-uuid",
  "reason": "Original supplier unavailable (min 10 chars)"
}
```

**Validation:** Reason must be 10-500 characters.

**Business rules:**
- Cannot reassign **COMPLETED** or **CANCELLED** bookings
- Marks current assignment as replaced (replacedAt timestamp)
- Creates new assignment with new supplier (vehicle/driver cleared)
- Resets booking status to **ACCEPTED** (new supplier needs to assign vehicle/driver)
- Records **BOOKING_REASSIGNED** domain event with from/to supplier info

**Response:**
```json
{
  "success": true,
  "data": {
    "id": "booking-uuid",
    "bookingRef": "TM-A3B7C9D2",
    "supplierId": "new-supplier-uuid",
    "status": "ACCEPTED",
    ...
  },
  "message": "Booking reassigned successfully"
}
```

---

## 6. Architecture alignment

**Implemented**

### 6.1. Repositories (data access)

- **`AssignmentHistoryRepository`** (`src/lib/repositories/booking/assignment-history-repository.ts`)
  - Find current assignment by booking ID
  - Find all assignments (full history)
  - Create assignment record
  - Mark assignment as replaced (replacedAt timestamp)
  - Supports supplier-only assignments (vehicle/driver nullable)

- **`DriverRepository`** (`src/lib/repositories/vehicle/driver-repository.ts`)
  - CRUD operations for drivers
  - List with filters (supplier, status)
  - Soft-delete awareness

- **`BookingRepository`** (updated)
  - `updateStatusAndSupplier()` — Update status and supplier assignment atomically
  - `cancel()` — Cancel booking with actor and reason
  - Existing methods: create, update, list, count, findById, findByRef

### 6.2. Services (business logic)

- **`AssignmentService`** (`src/lib/services/assignment/assignment-service.ts`)
  - `getSupplierBookingQueue()` — List available bookings for supplier
  - `acceptBooking()` — Supplier accepts booking (REQUESTED → ACCEPTED)
  - `rejectBooking()` — Supplier rejects booking (REQUESTED → CANCELLED)
  - `assignVehicleDriver()` — Assign vehicle/driver (ACCEPTED → READY_FOR_TRIP)
  - `adminReassignBooking()` — Admin reassigns to different supplier
  - Validation methods: ownership, status, compatibility

### 6.3. Validation (DTOs)

- **`assignment-schemas.ts`**:
  - `AcceptBookingSchema` — Booking acceptance DTO
  - `RejectBookingSchema` — Booking rejection DTO (with reason validation)
  - `AssignVehicleDriverSchema` — Vehicle/driver assignment DTO
  - `AdminReassignBookingSchema` — Admin reassignment DTO
  - `SupplierBookingQueueFiltersSchema` — Queue filters

### 6.4. Transactional integrity

All assignment operations execute within `withTransaction`:
1. **Booking status update**
2. **Assignment history creation/update**
3. **Domain event append**

Ensures atomicity: either all succeed or all roll back.

### 6.5. Domain events

- **`BOOKING_ACCEPTED`** — Supplier accepts booking (payload: bookingRef, notes)
- **`BOOKING_REJECTED`** — Supplier rejects booking (payload: bookingRef, reason)
- **`ASSIGNMENT_CREATED`** — First vehicle/driver assignment (payload: bookingRef, vehicleId, driverId, vehicleCategory, driverName)
- **`ASSIGNMENT_CHANGED`** — Vehicle/driver reassignment (payload: same as ASSIGNMENT_CREATED)
- **`BOOKING_REASSIGNED`** — Admin reassigns to different supplier (payload: bookingRef, fromSupplierId, toSupplierId, reason)

All events stored with:
- `actorType` (CUSTOMER/SUPPLIER/ADMIN/SYSTEM)
- `actorId` (UUID or system identifier)
- `occurredAt` timestamp

---

## 7. Validation rules

**Implemented**

### 7.1. Ownership validation

- **Vehicle ownership**: `vehicle.supplierId === requestingSupplierId`
- **Driver ownership**: `driver.supplierId === requestingSupplierId`
- **Booking ownership**: `booking.supplierId === requestingSupplierId` (for assignment)

### 7.2. Status validation

- **Vehicle status**: Must be `ACTIVE` (not PENDING_VERIFICATION, INACTIVE, SUSPENDED, REMOVED)
- **Driver status**: Must be `ACTIVE` (not PENDING_VERIFICATION, INACTIVE)
- **Soft-delete**: `deletedAt` must be `null` for both vehicle and driver

### 7.3. Compatibility validation

- **Category match**: `vehicle.category === bookingPricingSnapshot.category`
  - Ensures vehicle matches the category customer paid for
  - Example: Cannot assign ERTIGA if customer booked SEDAN

### 7.4. Booking status transitions

- **Accept**: `REQUESTED` → `ACCEPTED`
- **Reject**: `REQUESTED` → `CANCELLED`
- **Assign**: `ACCEPTED` → `READY_FOR_TRIP`
- **Reassign**: Any non-terminal status → `ACCEPTED` (with new supplier)

---

## 8. Assignment history tracking

**Implemented**

`AssignmentHistory` table tracks all assignments for audit trail:

| Field | Purpose |
| --- | --- |
| `bookingId` | Linked booking |
| `supplierId` | Assigned supplier |
| `vehicleId` | Assigned vehicle (nullable) |
| `driverId` | Assigned driver (nullable) |
| `assignedAt` | Assignment timestamp |
| `replacedAt` | Replacement timestamp (null = current) |
| `assignedBy` | Actor type (SUPPLIER/ADMIN) |

**Current assignment**: `replacedAt IS NULL`  
**Assignment history**: All records ordered by `assignedAt`

**Workflow:**
1. Supplier accepts → Create assignment (supplier only, no vehicle/driver)
2. Supplier assigns vehicle/driver → Mark previous as replaced, create new assignment
3. Admin reassigns → Mark previous as replaced, create new assignment (supplier only)

---

## 9. Unresolved mechanics

**Unresolved mechanics**

- **Better Auth integration**: APIs currently use mock headers (`x-mock-supplier-id`, `x-mock-admin-id`)
- **Automated routing**: No automated supplier routing algorithm; manual assignment for MVP
- **Timeout handling**: No automatic timeout for REQUESTED bookings
- **Concurrent acceptance**: No lock mechanism to prevent double-acceptance (database constraints handle this)
- **Notification system**: No supplier notifications for new booking availability
- **Assignment conflicts**: No vehicle double-booking prevention (vehicle status ON_TRIP not yet used)

---

## 10. Future enhancements

**Exploratory**

- **Automated routing**: Algorithm to suggest best supplier based on location, availability, vehicle fleet
- **Booking timeout**: Auto-cancel REQUESTED bookings after X hours
- **Supplier notifications**: Push/SMS/email for new booking availability
- **Vehicle availability calendar**: Real-time vehicle booking calendar
- **Assignment approval**: Admin approval required before vehicle/driver assignment
- **Multi-supplier broadcast**: Route booking to multiple suppliers (first-accept-wins)

---

## Revision log

| Date | Change |
| --- | --- |
| 2026-05-18 | **Implemented:** Supplier assignment and booking fulfillment APIs with repositories, services, validation, and domain events. |
