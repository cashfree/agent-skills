---
name: Cashfree BBPS COU — Bill Payments (Bharat Bill Payment System)
description: >
  Use when integrating with Cashfree's BBPS COU (CentralOU) service to fetch and pay bills across
  billers like electricity, water, gas, broadband, insurance, DTH, etc. Triggers: BBPS, bill payment,
  bill fetch, biller, bill-fetch, bill-payment, bbps/cou, BillFetch, BillPayment, ticket raise,
  complaint, agent_id, biller_id, ref_id, bill_fetch_ref_id, transaction_ref_id, ACCEPTED, PROCESSING,
  biller categories, biller info, customer_params, bill_details, biller_response, NBBL, NPCI, COU,
  utility bill, recurring bill, complaint ticket.
---

# Cashfree BBPS COU — Bill Payments

> **References available:** This SKILL.md covers the end-to-end bill payment flow and the happy path for all endpoints. For full request/response schemas, field-level constraints, error codes, and the complaint/ticket lifecycle — read `references/REFERENCE.md` in this directory.

---

## 1. Scope & Boundaries

### When to use this skill

- The merchant (acting as an **Agent Institution**) needs to facilitate bill payments on behalf of customers across BBPS-registered billers — electricity boards, gas companies, broadband ISPs, insurance providers, DTH operators, etc.
- The merchant wants to **fetch bills**, **pay bills**, and optionally **raise support tickets** via the Cashfree BBPS COU platform.
- The merchant needs to **look up biller metadata** (categories, biller-specific input params, payment modes, amount limits).

### When NOT to use this skill

- If the use case is collecting payments *into* the merchant's account (not paying bills on behalf of customers) — use `auto-collect/SKILL.md` or `pg/SKILL.md`.
- If the merchant is paying vendors/beneficiaries — use `payouts/SKILL.md`.

### Mental model

BBPS COU operates as an **async two-phase protocol**:
1. **Initiate** — Submit a request (bill fetch or bill payment). Receive a `ref_id` / `transaction_ref_id` immediately with HTTP 202 and status `ACCEPTED`.
2. **Poll** — Call the corresponding status endpoint with that ID until the status changes from `PROCESSING` to a terminal state (`SUCCESS`, `FAILED`, etc.).

This is not a synchronous API — you must poll the status endpoint.

---

## 2. Environments & Auth

| Environment | Base URL |
|---|---|
| Sandbox | `https://sandbox.cashfree.com/bbps/cou` |
| Production | `https://api.cashfree.com/bbps/cou` |

All requests go through the Cashfree API Gateway and require standard Cashfree auth headers.

---

## 3. Endpoint Overview

| Purpose | Method | Path |
|---|---|---|
| Get biller categories | GET | `/v1/billers/categories` |
| Get biller info | POST | `/v1/billers/info` |
| Initiate bill fetch | POST | `/v1/billers/request/bill-fetch` |
| Get bill fetch status | POST | `/v1/billers/response/bill-fetch` |
| Initiate bill payment | POST | `/v1/billers/request/bill-payment` |
| Get bill payment status | POST | `/v1/billers/response/bill-payment` |
| Raise support ticket | POST | `/v1/billers/request/ticket` |
| Get ticket status | POST | `/v1/billers/response/ticket-status` |
| Get agent institution wallet balance | GET | `/agent/{agentId}/wallet/balance` |
| Get agent institution wallet ledger | POST | `/agent/{agentId}/wallet/ledger` |

---

## 4. End-to-End Flow

```
1. GET  /v1/billers/categories              → list of category labels (optional discovery)
2. POST /v1/billers/info                    → biller details, input params, payment modes, flow config
3. POST /v1/billers/request/bill-fetch      → 202 ACCEPTED, ref_id + flow returned
                                               (skip for DIRECT_PAY billers — go straight to step 5)
4. POST /v1/billers/response/bill-fetch     → poll with ref_id until terminal message
5. POST /v1/billers/request/bill-payment    → 202 ACCEPTED, transaction_ref_id returned
6. POST /v1/billers/response/bill-payment   → poll with bill_fetch_ref_id + transaction_ref_id

[Optional — for disputes]
7. POST /v1/billers/request/ticket          → 202 ACCEPTED, ref_id returned
8. POST /v1/billers/response/ticket-status  → poll with ref_id until resolved
```

**Flow is determined by biller config (priority order):**

| Priority | `fetch_requirement` | `support_bill_validation` | Flow |
|---|---|---|---|
| 1 | `MANDATORY` | Any | `FETCH_AND_PAY` |
| 2 | `NOT_SUPPORTED` | `MANDATORY` or `OPTIONAL` | `VALIDATE_AND_PAY` |
| 3 | `NOT_SUPPORTED` | `NOT_SUPPORTED` | `DIRECT_PAY` |
| 4 | `OPTIONAL` | `MANDATORY` | `VALIDATE_AND_PAY` |
| 5 | `OPTIONAL` | Any other | `FETCH_AND_PAY` |

For `DIRECT_PAY` billers (e.g. donation billers), skip bill fetch entirely and go directly to bill payment.

---

## 5. Step-by-Step: Happy Path

### Step 1 — Get Biller Categories (optional discovery)

```http
GET /v1/billers/categories
```

Response:
```json
{
  "status": "OK",
  "message": "Biller categories fetched successfully",
  "data": ["Electricity", "Gas", "Water", "Broadband", "Insurance", "DTH", "FASTag"]
}
```

---

### Step 2 — Get Biller Info

Use this to discover the `biller_id`, the customer input fields required (e.g. account number, consumer number), supported payment modes, and whether bill fetch is mandatory before payment (`fetch_requirement`).

```http
POST /v1/billers/info
Content-Type: application/json

{
  "biller_fetch_request": {
    "biller_id": "UPCL123",
    "category": "Electricity"
  }
}
```

Response includes `biller_customer_params`, `biller_payment_modes`, `fetch_requirement`, and `payment_amount_exactness`.

---

### Step 3 — Initiate Bill Fetch

> **Note:** Skip this step for `DIRECT_PAY` billers (where both `fetch_requirement` and `support_bill_validation` are `NOT_SUPPORTED`). Calling this API for a DIRECT_PAY biller will return a validation error. Go directly to Step 5.

```http
POST /v1/billers/request/bill-fetch
Content-Type: application/json

{
  "bill_fetch_request": {
    "agent_id": "AGENT001",
    "biller_id": "UPCL123",
    "customer_info": {
      "customer_mobile": "9999999999",
      "customer_email": "customer@example.com"
    },
    "input_params": {
      "input": [
        { "name": "Consumer Number", "value": "12345678" }
      ]
    },
    "agent_device_info": {
      "init_channel": "INT",
      "ip": "192.168.1.1",
      "mac": "01:23:45:67:89:AB"
    }
  }
}
```

Response (HTTP 202):
```json
{
  "status": "ACCEPTED",
  "message": "Bill fetch request accepted for processing",
  "data": {
    "ref_id": "REF20241201001",
    "status": "PROCESSING",
    "flow": "FETCH_AND_PAY"
  }
}
```

Store `ref_id` — needed for status polling and as `bill_fetch_ref_id` in payment. Store `flow` — it determines which fields to expect in the poll response (`FETCH_AND_PAY` | `VALIDATE_AND_PAY` | `DIRECT_PAY`).

---

### Step 4 — Poll Bill Fetch Status

Poll at increasing intervals: 5s → 15s → 30s → 1 min → 3 min. Stop when `message` is `"Bill details fetched successfully"` or `"Bill request failed"`. If still processing after your retry limit, treat as timeout and raise a support ticket.

```http
POST /v1/billers/response/bill-fetch
Content-Type: application/json

{ "ref_id": "REF20241201001" }
```

Success response (HTTP 200):
```json
{
  "status": "OK",
  "message": "Bill details fetched successfully",
  "data": {
    "bill_fetch_response": {
      "ref_id": "REF20241201001",
      "approval_ref_num": "NBBL_APPR_001",
      "response_code": "000",
      "response_reason": "Success"
    },
    "bill_details": {
      "customer_params": {
        "tag": [{ "name": "Consumer Number", "value": "12345678" }]
      }
    },
    "biller_response": {
      "customer_name": "John Doe",
      "amount": "150000",
      "due_date": "2024-12-31",
      "bill_number": "BILL2024001",
      "bill_period": "NOV-2024"
    }
  }
}
```

> Amount is in **paise** — `"150000"` = ₹1500.00.

---

### Step 5 — Initiate Bill Payment

Use `ref_id` from Step 3 as `bill_fetch_ref_id`. Echo back `biller_response` and `bill_details` exactly as received from Step 4.

```http
POST /v1/billers/request/bill-payment
Content-Type: application/json

{
  "bill_payment_request": {
    "head": {
      "bill_fetch_ref_id": "REF20241201001",
      "pg_reference_id": "PG_ORDER_001"
    },
    "customer": { "mobile": "9999999999" },
    "agent": { "id": "AGENT001", "channel": "INT" },
    "bill_details": { ... },
    "biller_response": { ... },
    "payment_method": { "payment_mode": "Internet Banking" },
    "amount": { "amount": "150000", "currency": "INR" }
  }
}
```

Response (HTTP 202):
```json
{
  "status": "ACCEPTED",
  "message": "Bill payment request accepted for processing",
  "data": {
    "bill_fetch_ref_id": "REF20241201001",
    "transaction_ref_id": "TXN20241201001",
    "status": "PROCESSING"
  }
}
```

---

### Step 6 — Poll Bill Payment Status

Poll at increasing intervals: 5s → 15s → 30s → 1 min → 3 min. Stop when `data.status` is `"success"` or `"failed"`. If still processing after your retry limit, treat as timeout and raise a support ticket.

```http
POST /v1/billers/response/bill-payment
Content-Type: application/json

{
  "bill_fetch_ref_id": "REF20241201001",
  "transaction_ref_id": "TXN20241201001"
}
```

Success response (HTTP 200):
```json
{
  "status": "success",
  "message": "Bill payment successful",
  "data": {
    "status": "success",
    "bill_payment_response": {
      "head": { "bill_fetch_ref_id": "REF20241201001" },
      "reason": {
        "approval_ref_num": "NBBL_PAY_001",
        "response_code": "000",
        "response_reason": "Transaction Approved"
      },
      "txn": { "transaction_ref_id": "TXN20241201001" },
      "biller_response": { "customer_name": "John Doe", "amount": "150000" }
    }
  }
}
```

---

### Step 7 (Optional) — Raise Support Ticket

Use when a transaction needs follow-up or the customer disputes a completed payment. The `disposition` field must use a predefined code:

| Code | Description | Type |
|---|---|---|
| `D11` | Transaction successful, amount debited but service not received | Dispute |
| `D12` | Transaction successful, amount debited but service disconnected/stopped | Dispute |
| `D13` | Transaction successful, amount debited but LPSC charges added in next bill | Dispute |
| `D21` | Erroneously paid in wrong account | Dispute |
| `D22` | Duplicate payment | Dispute |
| `D23` | Erroneously paid the wrong amount | Dispute |
| `D31` | Payment information not received from biller / delay in receiving | Complaint |
| `D32` | Bill paid but amount not adjusted or still showing due | Complaint |

```http
POST /v1/billers/request/ticket
Content-Type: application/json

{
  "ticket_raise_request": {
    "agent_id": "AGENT001",
    "txn_reference_id": "TXN20241201001",
    "disposition": "D11",
    "description": "Payment deducted but biller not updated",
    "customer_mobile": "9999999999",
    "customer_email_id": "customer@example.com",
    "customer_name": "John Doe"
  }
}
```

Response (HTTP 202):
```json
{
  "status": "ACCEPTED",
  "message": "Ticket raise request accepted",
  "data": {
    "ref_id": "TKT_REF_001",
    "status": "PROCESSING"
  }
}
```

---

### Step 8 (Optional) — Get Ticket Status

Poll at increasing intervals: 5s → 15s → 30s → 1 min → 3 min. Stop when `message` is `"Ticket status fetched successfully"`. If still processing after your retry limit, contact Cashfree support with the `ref_id`.

```http
POST /v1/billers/response/ticket-status
Content-Type: application/json

{ "ref_id": "TKT_REF_001" }
```

Response (HTTP 200):
```json
{
  "status": "SUCCESS",
  "message": "Ticket status retrieved",
  "data": {
    "ref_id": "TKT_REF_001",
    "ticket_id": "TKT001",
    "ticket_status": "OPEN",
    "ticket_type": "COMPLAINT",
    "assigned": "AGENT001",
    "response_code": "000",
    "response_reason": "Ticket created successfully",
    "description": "Payment deducted but biller not updated"
  }
}
```

---

### Wallet — Get Agent Institution Wallet Balance

Use to check the available balance before initiating payments.

```http
GET /agent/{agentId}/wallet/balance
```

Response (HTTP 200):
```json
{
  "balance": 5000.00
}
```

`balance` is in **INR** (not paise).

---

### Wallet — Get Agent Institution Wallet Ledger

Use for reconciliation — paginated list of credits (wallet top-ups) and debits (bill payments).

```http
POST /agent/{agentId}/wallet/ledger?page=0&size=20
Content-Type: application/json

{
  "start_date_time": "2025-01-01 00:00:00",
  "end_date_time": "2025-01-31 23:59:59",
  "sale_type": "DEBIT",
  "utr": "UTR123456789"
}
```

All body fields are optional. An empty body returns all entries.

Response (HTTP 200):
```json
{
  "content": [
    {
      "id": 1001,
      "wallet_id": 42,
      "sale_type": "DEBIT",
      "amount": 250.00,
      "closing_balance": 4750.00,
      "utr": "UTR123456789",
      "added_on": "2025-01-15 10:30:00",
      "updated_on": "2025-01-15 10:30:05"
    }
  ],
  "size": 20,
  "page": 0,
  "last": true
}
```

- `sale_type`: `CREDIT` = wallet top-up, `DEBIT` = bill payment
- `last: true` means no more pages
- Datetime format: `yyyy-MM-dd HH:mm:ss`

---

## 6. Key Rules

- **Always poll** — bill fetch and bill payment are async. A `202 ACCEPTED` response is not final.
- **Use exponential backoff when polling** — 5s → 15s → 30s → 1 min → 3 min intervals.
- **Check flow before calling bill fetch** — for `DIRECT_PAY` billers (both `fetch_requirement` and `support_bill_validation` = `NOT_SUPPORTED`), skip bill fetch entirely and go directly to bill payment. Calling bill fetch for these billers returns a validation error.
- **Echo back biller data** — the bill payment request must include `biller_response` and `bill_details` exactly as received from the fetch status response.
- **Amount is in paise** — `"150000"` = ₹1500.00.
- **`bill_fetch_ref_id` links fetch to payment** — the `ref_id` from bill fetch becomes `bill_fetch_ref_id` in bill payment and all subsequent calls.
- **Ticket is post-payment** — `txn_reference_id` in the ticket raise must reference a real completed transaction.
- **Disposition must use a code** — use D11–D32 codes in the `disposition` field; free-text values like `COMPLAINT` are not accepted.
- **All APIs rate limited** — 100 requests per 60 seconds. Exceeding returns HTTP 429.