# Tamayo — Supplier and vehicle onboarding APIs

**Maturity:** MVP  
**Purpose:** Operational REST API implementation for supplier and vehicle onboarding, verification, and status management. Provides the first operational backend workflows for Tamayo marketplace.

**Related docs:** [`docs/features/supplier-operations.md`](./supplier-operations.md) (operational workflows), [`docs/features/vehicle-management.md`](./vehicle-management.md) (inventory rules), [`docs/architecture/backend-foundation.md`](../architecture/backend-foundation.md) (repository/service patterns), [`docs/architecture/api-architecture.md`](../architecture/api-architecture.md) (REST philosophy), [`docs/architecture/domain-models/identity-domain-model.md`](../architecture/domain-models/identity-domain-model.md) (supplier entity), [`docs/architecture/domain-models/vehicle-domain-model.md`](../architecture/domain-models/vehicle-domain-model.md) (vehicle entity).

---

## How to read this spec

| Label | Meaning |
| --- | --- |
| **Implemented** | API routes, services, repositories, and validation schemas are implemented and type-checked. |
| **Unresolved mechanics** | Requires explicit product/ops decision or Better Auth integration before full production readiness. |
| **Exploratory** | Optional future enhancement; not part of current implementation. |

---

## 1. Supplier onboarding APIs

**Implemented**

### 1.1. Draft supplier onboarding

**Endpoint:** `POST /api/v1/suppliers/onboarding/draft`

**Purpose:** Save partial supplier onboarding data (draft state). Allows suppliers to progressively fill onboarding information before final submission.

**Request body:**
```json
{
  "businessName": "Optional Cab Services",
  "phone": "+919876543210",
  "email": "contact@optionalcabs.com",
  "payoutBankDetails": {
    "accountNumber": "1234567890",
    "ifsc": "SBIN0001234",
    "accountHolderName": "Optional Cab Services",
    "bankName": "State Bank of India"
  }
}
```

**Validation:** Zod schema `SupplierOnboardingDraftSchema` (all fields optional).

**Business rules:**
- Creates new `SupplierAccount` with status `PENDING_VERIFICATION` if none exists for identity.
- Updates existing draft if supplier is still in `PENDING_VERIFICATION` status.
- Returns `403 Forbidden` if supplier already verified (cannot update draft).

**Response:**
```json
{
  "success": true,
  "data": {
    "id": "uuid",
    "identityId": "uuid",
    "businessName": "Optional Cab Services",
    "status": "PENDING_VERIFICATION",
    "verificationApprovedAt": null,
    "verificationApprovedBy": null,
    "payoutBankDetails": { ... },
    "createdAt": "2026-05-18T...",
    "updatedAt": "2026-05-18T..."
  }
}
```

---

### 1.2. Submit supplier onboarding

**Endpoint:** `POST /api/v1/suppliers/onboarding/submit`

**Purpose:** Submit complete supplier onboarding for admin verification. All required fields must be provided.

**Request body:**
```json
{
  "businessName": "Optional Cab Services",
  "phone": "+919876543210",
  "email": "contact@optionalcabs.com",
  "payoutBankDetails": {
    "accountNumber": "1234567890",
    "ifsc": "SBIN0001234",
    "accountHolderName": "Optional Cab Services",
    "bankName": "State Bank of India"
  }
}
```

**Validation:** Zod schema `SupplierOnboardingSubmissionSchema` (all fields required, IFSC regex validated).

**Business rules:**
- Creates or updates `SupplierAccount` with `PENDING_VERIFICATION` status.
- Validates IFSC format (11 characters: 4 letters + 0 + 6 alphanumeric).
- Returns `403 Forbidden` if supplier already verified.

**Response:**
```json
{
  "success": true,
  "data": { ... },
  "message": "Onboarding submitted successfully. Awaiting admin verification."
}
```

---

### 1.3. Get supplier details

**Endpoint:** `GET /api/v1/suppliers/[id]`

**Purpose:** Retrieve supplier account details by ID.

**Response:**
```json
{
  "success": true,
  "data": {
    "id": "uuid",
    "identityId": "uuid",
    "businessName": "Optional Cab Services",
    "status": "ACTIVE",
    "verificationApprovedAt": "2026-05-18T...",
    "verificationApprovedBy": "admin-uuid",
    "payoutBankDetails": { ... },
    "createdAt": "2026-05-18T...",
    "updatedAt": "2026-05-18T..."
  }
}
```

**Error:** `404 Not Found` if supplier doesn't exist.

---

### 1.4. List suppliers

**Endpoint:** `GET /api/v1/suppliers`

**Purpose:** List supplier accounts with filters and pagination.

**Query parameters:**
- `status` (optional): Filter by `SupplierAccountStatus` (`PENDING_VERIFICATION`, `ACTIVE`, `SUSPENDED`, `REJECTED`)
- `search` (optional): Search by business name (case-insensitive)
- `offset` (optional, default 0): Pagination offset
- `limit` (optional, default 20, max 100): Pagination limit

**Response:**
```json
{
  "success": true,
  "data": [
    { ... supplier objects ... }
  ],
  "pagination": {
    "total": 42,
    "offset": 0,
    "limit": 20
  }
}
```

---

## 2. Vehicle onboarding APIs

**Implemented**

### 2.1. Create vehicle

**Endpoint:** `POST /api/v1/vehicles`

**Purpose:** Create new vehicle for supplier inventory. Vehicle starts in `PENDING_VERIFICATION` status.

**Request body:**
```json
{
  "supplierId": "supplier-uuid",
  "registrationNumber": "KA01AB1234",
  "category": "SEDAN",
  "ageYears": 2,
  "fuelType": "DIESEL"
}
```

**Validation:** Zod schema `CreateVehicleSchema`.
- `registrationNumber` normalized to uppercase, regex validated
- `category` enum: `SEDAN`, `ERTIGA`, `KIA_CARENS`, `INNOVA_CRYSTA`, `TEMPO_TRAVELLER`
- `fuelType` enum: `PETROL`, `DIESEL`, `CNG`, `EV`
- `ageYears` optional non-negative integer

**Business rules:**
- Supplier must exist and be in `ACTIVE` or `PENDING_VERIFICATION` status.
- Registration number uniqueness enforced (active vehicles only).
- Age bucket calculated automatically from `ageYears` per pricing rules.
- Returns `409 Conflict` if registration number already exists.
- Returns `403 Forbidden` if supplier not eligible.

**Response:**
```json
{
  "success": true,
  "data": {
    "id": "uuid",
    "supplierId": "supplier-uuid",
    "registrationNumber": "KA01AB1234",
    "category": "SEDAN",
    "ageYears": 2,
    "ageBucket": "ZERO_TO_THREE",
    "fuelType": "DIESEL",
    "status": "PENDING_VERIFICATION",
    "deletedAt": null,
    "createdAt": "2026-05-18T...",
    "updatedAt": "2026-05-18T..."
  },
  "message": "Vehicle created successfully. Awaiting admin verification."
}
```

---

### 2.2. Get vehicle details

**Endpoint:** `GET /api/v1/vehicles/[id]`

**Purpose:** Retrieve vehicle details by ID.

**Response:** Vehicle domain object.

**Error:** `404 Not Found` if vehicle doesn't exist.

---

### 2.3. Update vehicle

**Endpoint:** `PATCH /api/v1/vehicles/[id]`

**Purpose:** Update vehicle details (supplier edit before verification).

**Request body:**
```json
{
  "registrationNumber": "KA01AB1234",
  "category": "ERTIGA",
  "ageYears": 3,
  "fuelType": "CNG"
}
```

**Business rules:**
- Only vehicles in `PENDING_VERIFICATION` can be updated.
- Age bucket recalculated if `ageYears` changed.
- Returns `403 Forbidden` if vehicle already verified/active.

---

### 2.4. Delete vehicle

**Endpoint:** `DELETE /api/v1/vehicles/[id]`

**Purpose:** Soft-delete vehicle (sets `deletedAt` timestamp and transitions to `REMOVED` status).

**Business rules:**
- Cannot delete vehicles with status `ON_TRIP`.
- Vehicle transitions to `REMOVED` status before soft-delete.

**Response:**
```json
{
  "success": true,
  "data": { ... vehicle with deletedAt set ... },
  "message": "Vehicle deleted successfully"
}
```

---

### 2.5. List vehicles

**Endpoint:** `GET /api/v1/vehicles`

**Purpose:** List vehicles with filters and pagination.

**Query parameters:**
- `supplierId` (optional): Filter by supplier
- `status` (optional): Filter by `VehicleStatus`
- `category` (optional): Filter by `VehicleCategory`
- `offset` (optional, default 0): Pagination offset
- `limit` (optional, default 20, max 100): Pagination limit

**Response:** Paginated list of vehicles (soft-deleted vehicles excluded by default).

---

## 3. Admin verification APIs

**Implemented**

### 3.1. Verify supplier

**Endpoint:** `POST /api/v1/admin/suppliers/[id]/verify`

**Purpose:** Admin approve or reject supplier onboarding.

**Request body:**
```json
{
  "action": "APPROVE",
  "reason": "Optional rejection reason"
}
```

**Validation:** Zod schema `AdminSupplierVerificationSchema`.
- `action` enum: `APPROVE`, `REJECT`

**Business rules:**
- Can only verify suppliers in `PENDING_VERIFICATION` status.
- `APPROVE` → transitions to `ACTIVE`, records `verificationApprovedAt` and `verificationApprovedBy`.
- `REJECT` → transitions to `REJECTED`.

**Response:**
```json
{
  "success": true,
  "data": { ... updated supplier ... },
  "message": "Supplier approved successfully"
}
```

---

### 3.2. Verify vehicle

**Endpoint:** `POST /api/v1/admin/vehicles/[id]/verify`

**Purpose:** Admin approve or reject vehicle with optional corrections.

**Request body:**
```json
{
  "action": "APPROVE",
  "reason": "Optional rejection reason",
  "correctedCategory": "ERTIGA",
  "correctedAgeYears": 3
}
```

**Validation:** Zod schema `AdminVehicleVerificationSchema`.

**Business rules:**
- Can only verify vehicles in `PENDING_VERIFICATION` status.
- Admin can correct category and/or age during approval.
- Age bucket recalculated if age corrected.
- `APPROVE` → transitions to `ACTIVE`.
- `REJECT` → transitions to `SUSPENDED` (cannot be activated without resubmission).

**Response:**
```json
{
  "success": true,
  "data": { ... updated vehicle ... },
  "message": "Vehicle approved successfully"
}
```

---

## 4. Architecture alignment

**Implemented**

### 4.1. Repositories (data access)
- **`SupplierAccountRepository`** (`src/lib/repositories/identity/supplier-repository.ts`)
  - CRUD operations, filters, pagination
  - Maps Prisma models to domain types
  - Soft-delete awareness (no explicit deletedAt for suppliers in schema, but status-based)
  
- **`VehicleRepository`** (`src/lib/repositories/vehicle/vehicle-repository.ts`)
  - CRUD operations, soft-delete, filters, pagination
  - Registration number uniqueness validation
  - Age bucket calculation logic
  
- **`UploadRepository`** (`src/lib/repositories/upload/upload-repository.ts`)
  - Placeholder for upload metadata (files stored externally)

### 4.2. Services (business logic)
- **`SupplierService`** (`src/lib/services/supplier/supplier-service.ts`)
  - Onboarding draft save, submission
  - Status transitions with validation
  - Admin verification orchestration
  
- **`VehicleService`** (`src/lib/services/vehicle/vehicle-service.ts`)
  - Vehicle creation, update, deletion
  - Status transitions with validation
  - Admin verification with corrections

### 4.3. Validation (DTOs)
- **`supplier-schemas.ts`** — Supplier onboarding, verification DTOs
- **`vehicle-schemas.ts`** — Vehicle creation, update, verification DTOs
- All schemas use Zod with `commonSchemas` (UUID, phone, email)

### 4.4. Error handling
- Operational errors: `ValidationError`, `NotFoundError`, `ConflictError`, `ForbiddenError`
- Route handlers map errors to HTTP status codes
- Consistent JSON response format: `{ success, data?, error?, message? }`

---

## 5. Unresolved mechanics

**Unresolved mechanics**

- **Better Auth integration:** APIs currently use mock identity headers (`x-mock-identity-id`, `x-mock-admin-id`) for authentication. Replace with Better Auth session extraction.
- **Upload workflow:** Upload linkage is placeholder. Need actual file upload endpoint and S3/object storage integration.
- **Admin RBAC:** No explicit admin role verification beyond mock header. Need Better Auth role checks.
- **Audit trail:** Domain events for verification actions not yet implemented (DomainEvent model exists in schema).
- **Rejection reasons:** Currently optional strings. Need structured reason taxonomy if product requires it.

---

## 6. Exploratory

**Exploratory**

- **Webhook notifications:** Notify suppliers of verification status changes via email/SMS.
- **Document upload UI:** Frontend for uploading vehicle photos, registration certificates during onboarding.
- **Bulk verification:** Admin bulk approve/reject interface for high-volume onboarding.
- **Verification SLA tracking:** Monitor time from submission to approval.

---

## Revision log

| Date | Change |
| --- | --- |
| 2026-05-18 | **Implemented:** Supplier and vehicle onboarding APIs with repositories, services, validation, and admin verification workflows. |
