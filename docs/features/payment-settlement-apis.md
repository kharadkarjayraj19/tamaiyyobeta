# Tamayo — Payment & Settlement APIs (MVP implementation)

**Maturity:** MVP  
**Purpose:** Operational specification for payment recording, refund processing, and supplier settlement APIs—MVP-ready for manual operations before gateway integration.

**Related docs:** [`docs/features/billing-settlement.md`](./billing-settlement.md) (financial workflow philosophy), [`docs/architecture/domain-models/billing-domain-model.md`](../architecture/domain-models/billing-domain-model.md) (financial entity architecture), [`docs/features/booking-lifecycle.md`](./booking-lifecycle.md) (booking states), [`docs/architecture/backend-architecture.md`](../architecture/backend-architecture.md) (backend structure).

**Non-goals (this document):** Razorpay integration, webhook processing, GST automation, automatic bank payouts, wallet systems.

---

## 1. Payment operations

### 1.1. Record payment

**POST** `/api/v1/payments`

**Purpose:** Record a payment (advance, partial, or full).

**MVP Note:** Manual payment entry. Production will use Razorpay webhooks.

**Request Body:**

```json
{
  "bookingId": "uuid",
  "amount": "5000.00",
  "mode": "ONLINE_CARD",
  "gatewayOrderId": "order_xyz123",
  "finalBillId": "uuid"
}
```

**Response:**

```json
{
  "success": true,
  "data": {
    "payment": {
      "id": "uuid",
      "bookingId": "uuid",
      "amount": "5000.00",
      "mode": "ONLINE_CARD",
      "status": "INITIATED",
      "gatewayOrderId": "order_xyz123",
      "createdAt": "2026-05-20T12:00:00Z"
    },
    "booking": {
      "id": "uuid",
      "bookingRef": "TM-ABCD1234",
      "status": "REQUESTED"
    }
  }
}
```

**Validation:**
- `bookingId`: Required UUID
- `amount`: Required decimal string, max ₹5,00,000
- `mode`: Required, one of `ONLINE_CARD`, `ONLINE_UPI`, `CASH`
- `gatewayOrderId`: Optional string
- `finalBillId`: Optional UUID

**Business Rules:**
- Customer must own booking
- Booking cannot be CANCELLED
- Amount must be positive
- Creates payment in INITIATED status
- Emits `PAYMENT_RECORDED` domain event

**Auth:** Requires `x-mock-customer-id` header (MVP)

---

### 1.2. Get booking payments

**GET** `/api/v1/payments/booking/[id]`

**Purpose:** Get all payments and outstanding balance for a booking.

**Response:**

```json
{
  "success": true,
  "data": {
    "payments": [
      {
        "id": "uuid",
        "bookingId": "uuid",
        "amount": "5000.00",
        "mode": "ONLINE_CARD",
        "status": "CAPTURED",
        "gatewayOrderId": "order_xyz123",
        "gatewayPaymentId": "pay_abc456",
        "createdAt": "2026-05-20T12:00:00Z"
      }
    ],
    "summary": {
      "finalBillAmount": "12500.00",
      "totalPaid": "5000.00",
      "outstandingBalance": "7500.00"
    }
  }
}
```

**Business Rules:**
- Returns all payments for booking
- Calculates outstanding balance: `finalBillAmount - totalPaid`
- Only CAPTURED payments count toward totalPaid

---

## 2. Refund operations

### 2.1. Create refund

**POST** `/api/v1/refunds`

**Purpose:** Create a refund with 24h cancellation policy validation.

**REFUND POLICY:**
- **>24h before trip start:** Full refund allowed
- **<24h before trip start:** No automatic full refund (admin override required)
- **Admin override:** Requires explicit reason

**Request Body:**

```json
{
  "bookingId": "uuid",
  "paymentId": "uuid",
  "amount": "5000.00",
  "reason": "Customer cancellation",
  "initiatedBy": "CUSTOMER"
}
```

**Response:**

```json
{
  "success": true,
  "data": {
    "refund": {
      "id": "uuid",
      "bookingId": "uuid",
      "paymentId": "uuid",
      "amount": "5000.00",
      "reason": "Customer cancellation",
      "initiatedBy": "CUSTOMER",
      "status": "INITIATED",
      "createdAt": "2026-05-20T12:00:00Z"
    },
    "booking": {
      "id": "uuid",
      "bookingRef": "TM-ABCD1234",
      "status": "CANCELLED"
    }
  }
}
```

**Validation:**
- `bookingId`: Required UUID
- `paymentId`: Required UUID
- `amount`: Required decimal string, max ₹5,00,000
- `reason`: Optional string (required for admin-initiated)
- `initiatedBy`: Required, one of `CUSTOMER`, `ADMIN`, `SYSTEM`

**Business Rules:**
- Payment must belong to booking
- Payment must be CAPTURED
- Refund amount cannot exceed `paymentAmount - totalRefunded`
- **24h policy enforced for customer-initiated refunds**
- Admin-initiated refunds require reason
- Creates refund in INITIATED status
- Emits `REFUND_CREATED` domain event

**Auth:** 
- Customer refunds: Requires `x-mock-customer-id` header
- Admin refunds: Requires `x-mock-admin-id` header

**Error Responses:**
- 403 Forbidden: "Cancellation within 24 hours of trip start. Full refund not available."

---

### 2.2. Get booking refunds

**GET** `/api/v1/refunds/booking/[id]`

**Purpose:** Get all refunds and refund eligibility for a booking.

**Response:**

```json
{
  "success": true,
  "data": {
    "refunds": [
      {
        "id": "uuid",
        "bookingId": "uuid",
        "paymentId": "uuid",
        "amount": "5000.00",
        "reason": "Customer cancellation",
        "initiatedBy": "CUSTOMER",
        "status": "SUCCEEDED",
        "gatewayRefundId": "rfnd_xyz789",
        "createdAt": "2026-05-20T12:00:00Z"
      }
    ],
    "eligibility": {
      "eligible": false,
      "hoursUntilTrip": 12,
      "reason": "Less than 24 hours until trip start. Contact support."
    }
  }
}
```

**Business Rules:**
- Returns all refunds for booking
- Checks refund eligibility based on trip start time
- Eligibility reasons:
  - Booking already cancelled
  - Booking already closed
  - Trip has already started
  - Less than 24h until trip start

---

## 3. Settlement operations

### 3.1. List eligible earnings

**GET** `/api/v1/settlements/eligible`

**Purpose:** List supplier earnings eligible for payout (status = ELIGIBLE, not yet batched).

**Query Params:**
- `supplierId`: Optional UUID
- `limit`: Optional int (default 20, max 100)

**Response:**

```json
{
  "success": true,
  "data": {
    "earnings": [
      {
        "id": "uuid",
        "bookingId": "uuid",
        "supplierId": "uuid",
        "grossAmount": "10000.00",
        "commissionAmount": "950.00",
        "netAmount": "9050.00",
        "status": "ELIGIBLE",
        "createdAt": "2026-05-20T12:00:00Z"
      }
    ],
    "count": 1
  }
}
```

**Business Rules:**
- Only returns earnings with status = ELIGIBLE
- Only returns earnings not yet attached to a batch (payoutBatchId = null)
- Pagination enforced (max 100 records)

---

### 3.2. Mark earnings as eligible

**POST** `/api/v1/settlements/mark-eligible`

**Purpose:** Mark supplier earnings as eligible for payout.  
**Transitions:** EARNED → ELIGIBLE

**Request Body:**

```json
{
  "bookingIds": ["uuid1", "uuid2"]
}
```

**Response:**

```json
{
  "success": true,
  "data": {
    "updated": 2,
    "earnings": [
      {
        "id": "uuid",
        "bookingId": "uuid1",
        "supplierId": "uuid",
        "netAmount": "9050.00",
        "status": "ELIGIBLE"
      }
    ]
  }
}
```

**Validation:**
- `bookingIds`: Required array of UUIDs (min 1, max 100)

**Business Rules:**
- Booking must be CLOSED
- Earning must be in EARNED status
- Final bill must exist
- Emits `SETTLEMENT_ELIGIBLE` domain event per earning

**Auth:** Requires `x-mock-admin-id` header (Admin only)

---

### 3.3. Create payout batch

**POST** `/api/v1/settlements/batches`

**Purpose:** Group eligible earnings into a payout batch.  
**Transitions:** ELIGIBLE → BATCHED

**Request Body:**

```json
{
  "supplierId": "uuid",
  "cycleStartDate": "2026-05-01T00:00:00Z",
  "cycleEndDate": "2026-05-07T23:59:59Z",
  "bookingIds": ["uuid1", "uuid2", "uuid3"]
}
```

**Response:**

```json
{
  "success": true,
  "data": {
    "batch": {
      "id": "uuid",
      "batchRef": "PB-1716220800000-123",
      "supplierId": "uuid",
      "cycleStartDate": "2026-05-01T00:00:00Z",
      "cycleEndDate": "2026-05-07T23:59:59Z",
      "totalEarnings": "30000.00",
      "totalDeductions": "2850.00",
      "netPayout": "27150.00",
      "status": "PENDING",
      "createdAt": "2026-05-20T12:00:00Z"
    },
    "earningsCount": 3
  }
}
```

**Validation:**
- `supplierId`: Optional UUID
- `cycleStartDate`: Required ISO date string
- `cycleEndDate`: Required ISO date string (must be after cycleStartDate)
- `bookingIds`: Required array of UUIDs (min 1, max 1000)

**Business Rules:**
- All earnings must be in ELIGIBLE status
- All earnings must not already be in a batch
- All earnings must be for the same supplier
- Batch reference auto-generated: `PB-{timestamp}-{random}`
- Creates batch in PENDING status
- Updates all earnings to BATCHED status
- Emits `PAYOUT_BATCH_CREATED` domain event

**Auth:** Requires `x-mock-admin-id` header (Admin only)

---

### 3.4. List payout batches

**GET** `/api/v1/settlements/batches`

**Purpose:** List payout batches with filters.

**Query Params:**
- `supplierId`: Optional UUID
- `status`: Optional enum (`DRAFT`, `PENDING`, `PAID`, `CANCELLED`)
- `fromDate`: Optional ISO date string
- `toDate`: Optional ISO date string
- `offset`: Optional int (default 0)
- `limit`: Optional int (default 20, max 100)

**Response:**

```json
{
  "success": true,
  "data": {
    "batches": [
      {
        "id": "uuid",
        "batchRef": "PB-1716220800000-123",
        "supplierId": "uuid",
        "cycleStartDate": "2026-05-01T00:00:00Z",
        "cycleEndDate": "2026-05-07T23:59:59Z",
        "totalEarnings": "30000.00",
        "totalDeductions": "2850.00",
        "netPayout": "27150.00",
        "status": "PENDING",
        "paidAt": null,
        "createdAt": "2026-05-20T12:00:00Z"
      }
    ],
    "total": 1,
    "offset": 0,
    "limit": 20
  }
}
```

---

### 3.5. Get supplier earnings history

**GET** `/api/v1/settlements/supplier/[id]`

**Purpose:** Get earnings history for a supplier.

**Query Params:**
- `status`: Optional enum (`EARNED`, `ELIGIBLE`, `BATCHED`, `PAID`, `HELD`)
- `payoutBatchId`: Optional UUID
- `offset`: Optional int (default 0)
- `limit`: Optional int (default 20, max 100)

**Response:**

```json
{
  "success": true,
  "data": {
    "supplierId": "uuid",
    "earnings": [
      {
        "id": "uuid",
        "bookingId": "uuid",
        "finalBillId": "uuid",
        "grossAmount": "10000.00",
        "commissionAmount": "950.00",
        "netAmount": "9050.00",
        "status": "PAID",
        "payoutBatchId": "uuid",
        "createdAt": "2026-05-20T12:00:00Z"
      }
    ],
    "offset": 0,
    "limit": 20
  }
}
```

---

## 4. Domain events

### Payment events
- `PAYMENT_RECORDED` — Payment initiated (CUSTOMER actor)
- `PAYMENT_COMPLETED` — Payment captured (SYSTEM actor)
- `PAYMENT_STATUS_UPDATED` — Payment status changed (SYSTEM actor)

### Refund events
- `REFUND_CREATED` — Refund initiated (CUSTOMER or ADMIN actor)
- `REFUND_STATUS_UPDATED` — Refund status changed (SYSTEM actor)

### Settlement events
- `SETTLEMENT_ELIGIBLE` — Earning marked eligible (ADMIN actor)
- `PAYOUT_BATCH_CREATED` — Payout batch created (ADMIN actor)

---

## 5. Settlement lifecycle states

| Status | Description |
| --- | --- |
| **EARNED** | Final bill generated, supplier earning created |
| **ELIGIBLE** | Cleared for payout (no disputes/holds) |
| **BATCHED** | Included in a payout batch |
| **PAID** | Batch executed, funds transferred |
| **HELD** | Blocked with reason code (dispute, fraud, KYC) |

---

## 6. Architecture compliance

**Repositories:**
- `payment-repository.ts` — Payment CRUD, total paid calculation
- `refund-repository.ts` — Refund CRUD, total refunded calculation
- `supplier-earning-repository.ts` — Earning CRUD, eligible earnings, batch attachment
- `payout-batch-repository.ts` — Batch CRUD, list/count with filters

**Services:**
- `payment-service.ts` — Payment recording, outstanding balance calculation
- `refund-service.ts` — Refund creation with 24h policy, eligibility checks
- `settlement-service.ts` — Mark eligible, create batches, list operations

**Validation:**
- `payment-schemas.ts` — Payment DTOs, amount limits (max ₹5L)
- `refund-schemas.ts` — Refund DTOs, actor types
- `settlement-schemas.ts` — Settlement DTOs, pagination limits (max 100)

**Error handling:**
- Operational errors: ValidationError, NotFoundError, ForbiddenError
- HTTP status: 400 (validation), 404 (not found), 403 (forbidden), 401 (unauthorized)

**Transaction discipline:**
- All financial operations wrapped in `withTransaction`
- Payment + domain event commit together
- Refund + payment status update commit together
- Settlement eligibility + domain events commit together
- Batch creation + earnings update commit together

---

## 7. MVP placeholders

### Gateway integration (Not implemented yet)
- **Payment capture**: Manual status update via admin API
- **Refund processing**: Manual status update via admin API
- **Webhook handling**: Not implemented
- **Gateway reconciliation**: Not implemented

**Production TODO:**
- Integrate Razorpay payment gateway
- Implement webhook handlers for payment/refund status updates
- Implement automatic payment capture on AUTHORIZED payments
- Add gateway reconciliation reports

### Bank payout (Not implemented yet)
- **Payout execution**: Manual status update after bank transfer
- **Automatic bank transfers**: Not implemented
- **Payout reconciliation**: Not implemented

**Production TODO:**
- Integrate bank payout API (NEFT/IMPS/UPI)
- Implement automatic batch execution
- Add payout reconciliation and failure handling

---

## 8. Future enhancements

### Near-term
- Payment status update API (admin)
- Refund status update API (admin)
- Batch status update API (admin)
- Partial payment support (multiple payments before trip)
- Split payments across instruments

### Long-term
- Wallet system for customer credits
- Advance to suppliers against receivables
- Dynamic holds based on supplier risk score
- Instant payout tier for trusted suppliers
- GST invoice generation
- e-Invoice integration

---

## Revision log

| Date | Change |
| --- | --- |
| 2026-05-20 | **MVP:** Payment recording, refund with 24h policy, settlement eligibility, payout batch creation APIs. Repositories, services, validation, domain events. MVP placeholders for gateway/bank integration documented. |
