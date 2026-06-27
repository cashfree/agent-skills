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
- The merchant wants to **fetch bills**, **pay bills**, and optionally **raise complaint tickets** via the Cashfree BBPS COU platform.
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
| Raise complaint ticket | POST | `/v1/billers/request/ticket` |
| Get ticket status | POST | `/v1/billers/response/ticket-status` |

---

## 4. End-to-End Flow

```
1. GET  /v1/billers/categories              → list of category labels (optional discovery)
2. POST /v1/billers/info                    → biller details, input params, payment modes
3. POST /v1/billers/request/bill-fetch      → 202 ACCEPTED, ref_id returned
4. POST /v1/billers/response/bill-fetch     → poll with ref_id until SUCCESS/FAILED
5. POST /v1/billers/request/bill-payment    → 202 ACCEPTED, transaction_ref_id returned
6. POST /v1/billers/response/bill-payment   → poll with bill_fetch_ref_id + transaction_ref_id

[Optional — for disputes]
7. POST /v1/billers/request/ticket          → 202 ACCEPTED, ref_id for complaint
8. POST /v1/billers/response/ticket-status  → poll with ref_id until resolved
```

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
    "flow": "OFFLINE"
  }
}
```

Store `ref_id` — needed for status polling and as `bill_fetch_ref_id` in payment.

---

### Step 4 — Poll Bill Fetch Status

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

### Step 7 (Optional) — Raise Complaint Ticket

Use when a transaction needs follow-up or the customer disputes a completed payment.

```http
POST /v1/billers/request/ticket
Content-Type: application/json

{
  "ticket_raise_request": {
    "agent_id": "AGENT001",
    "txn_reference_id": "TXN20241201001",
    "disposition": "COMPLAINT",
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

## 6. Key Rules

- **Always poll** — bill fetch and bill payment are async. A `202 ACCEPTED` response is not final.
- **Echo back biller data** — the bill payment request must include `biller_response` and `bill_details` exactly as received from the fetch status response.
- **Amount is in paise** — `"150000"` = ₹1500.00.
- **Check `fetch_requirement`** — if `"MANDATORY"`, bill fetch must complete before payment. If `"NOT_SUPPORTED"`, go directly to payment (biller supports direct pay).
- **`bill_fetch_ref_id` links fetch to payment** — the `ref_id` from bill fetch becomes `bill_fetch_ref_id` in bill payment and all subsequent calls.
- **Ticket is post-payment** — `txn_reference_id` in the ticket raise must reference a real transaction.