---
name: Cashfree BBPS COU — Reference
description: >
  Deep reference for Cashfree BBPS COU bill payment integration. Full request/response schemas
  for all 8 endpoints, field-level constraints, AgentDeviceInfo fields, BillerInfoResponse structure,
  BillPaymentRequestBody nested fields, error response format, polling strategy, fetch_requirement
  values, and ticket lifecycle. Read after bbps-cou SKILL.md.
---

# Cashfree BBPS COU — Reference

> Read `../SKILL.md` first for the end-to-end flow and happy path examples. This file is the schema source of truth.

---

## 1. Endpoint Map

| Method | Path | HTTP Status | Notes |
|---|---|---|---|
| GET  | `/v1/billers/categories` | 200 | No request body |
| POST | `/v1/billers/info` | 200 | Filter by biller_id, category |
| POST | `/v1/billers/request/bill-fetch` | **202** | Async — returns ref_id; skip for DIRECT_PAY billers |
| POST | `/v1/billers/response/bill-fetch` | 200 | Poll with ref_id |
| POST | `/v1/billers/request/bill-payment` | **202** | Async — returns transaction_ref_id |
| POST | `/v1/billers/response/bill-payment` | 200 | Poll with bill_fetch_ref_id + transaction_ref_id |
| POST | `/v1/billers/request/ticket` | **202** | Async — returns ref_id |
| POST | `/v1/billers/response/ticket-status` | 200 | Poll with ref_id |
| GET  | `/agent/{agentId}/wallet/balance` | 200 | Returns current balance in INR |
| POST | `/agent/{agentId}/wallet/ledger` | 200 | Paginated ledger; all body fields optional |

---

## 2. Standard Response Envelope

Success responses are wrapped in:

```jsonc
{
  "status": "OK",          // string — see status values per endpoint below
  "message": "...",        // human-readable description
  "data": { ... }          // payload
}
```

Error response (4xx / 5xx) — uses `message`, `code`, and `type` fields (no `status` or `data`):
```jsonc
// 400 Bad Request
{
  "message": "bill_fetch_request.agent_id : is missing in the request.",
  "code": "bill_fetch_request.agent_id_missing",
  "type": "invalid_request_error"
}

// 401 Unauthorized
{
  "message": "authentication Failed",
  "code": "request_failed",
  "type": "authentication_error"
}

// 429 Rate Limit
{
  "message": "Too many requests from IP. Check headers",
  "code": "request_failed",
  "type": "rate_limit_error"
}

// 500 Internal Server Error
{
  "message": "internal Server Error",
  "code": "internal_error",
  "type": "api_error"
}
```

---

## 3. Get Biller Categories

**Request:** No body.

**Response `data`:** `string[]` — array of category label strings.

---

## 4. Get Biller Info — Full Schema

### Request

```jsonc
{
  "biller_fetch_request": {        // optional — omit to fetch all billers
    "biller_id": "UPCL123",        // optional filter
    "category": "Electricity"      // optional filter
  }
}
```

### Response `data` — array of `BillerInfoResponse`

```jsonc
[
  {
    "biller_id": "UPCL123",
    "biller_alias_name": "UPCL",
    "biller_name": "Uttarakhand Power Corporation Ltd",
    "biller_category_name": "Electricity",
    "biller_mode": "ONLINE",
    "biller_accepts_adhoc": false,
    "biller_coverage": "NA",
    "fetch_requirement": "MANDATORY",         // MANDATORY | OPTIONAL | NOT_SUPPORTED
    "payment_amount_exactness": "EXACT",      // EXACT | EXACT_UP | EXACT_DOWN | ANY
    "support_bill_validation": "true",
    "biller_effctv_from": "2023-01-01",
    "biller_effctv_to": "9999-12-31",
    "biller_customer_params": [
      {
        "param_name": "Consumer Number",
        "data_type": "NUMERIC",
        "optional": false,
        "min_length": 8,
        "max_length": 12,
        "regex": "^[0-9]{8,12}$",
        "visibility": true
      }
    ],
    "biller_payment_modes": [
      {
        "payment_mode": "Internet Banking",
        "min_limit": 100,
        "max_limit": 500000,
        "support_pending_status": "true"
      }
    ],
    "biller_payment_channels": [
      {
        "payment_channel": "INT",
        "min_limit": 100,
        "max_limit": 500000,
        "support_pending_status": "true"
      }
    ],
    "biller_response_params": {
      "amount_options": [
        { "amount_breakup_set": ["TotalAmount", "Arrears"] }
      ]
    },
    "support_pending_status": "true",
    "support_deemed": "false",
    "biller_time_out": "60000",
    "biller_ownership": "B",
    "status": "ACTIVE",
    "plan_mdm_requirement": "NOT_SUPPORTED"
  }
]
```

**Flow determination (priority order using `fetch_requirement` + `support_bill_validation`):**

| Priority | `fetch_requirement` | `support_bill_validation` | Flow |
|---|---|---|---|
| 1 | `MANDATORY` | Any | `FETCH_AND_PAY` |
| 2 | `NOT_SUPPORTED` | `MANDATORY` or `OPTIONAL` | `VALIDATE_AND_PAY` |
| 3 | `NOT_SUPPORTED` | `NOT_SUPPORTED` | `DIRECT_PAY` |
| 4 | `OPTIONAL` | `MANDATORY` | `VALIDATE_AND_PAY` |
| 5 | `OPTIONAL` | Any other | `FETCH_AND_PAY` |

For `DIRECT_PAY` billers, the Bill Fetch Request API will return a validation error — skip to Bill Payment directly.

---

## 5. Bill Fetch — Full Schema

### Request

```jsonc
{
  "bill_fetch_request": {
    "agent_id": "AGENT001",              // required
    "biller_id": "UPCL123",             // required
    "customer_info": {
      "customer_mobile": "9999999999",   // optional
      "customer_email": "c@ex.com",      // optional
      "aadhaar": "655675523712",         // optional
      "pan": "ABCDE1234F"               // optional
    },
    "input_params": {
      "input": [
        { "name": "Consumer Number", "value": "12345678" }
        // name must match param_name from biller_customer_params
      ]
    },
    "agent_device_info": {               // optional but recommended
      "app": "MerchantApp",
      "imei": "123456789012345",
      "init_channel": "INT",             // INT | MOB | KIOSK | BNKBRNCH | BKMNG | INTBBNK | CORPBBNK
      "ip": "192.168.1.1",
      "os": "Android",
      "mobile": "9999999999",
      "geo_code": "28.7041,77.1025",
      "postal_code": "110001",
      "terminal_id": "TERM001",
      "ifsc": "HDFC0001234",
      "mac": "01:23:45:67:89:AB"
    }
  }
}
```

### Response `data` (202 ACCEPTED)

```jsonc
{
  "ref_id": "REF20241201001",   // store this — used in poll and payment
  "status": "PROCESSING",
  "flow": "FETCH_AND_PAY"       // FETCH_AND_PAY | VALIDATE_AND_PAY | DIRECT_PAY
}
```

### Status Poll Response `data` (200 OK)

```jsonc
{
  "bill_fetch_response": {
    "ref_id": "REF20241201001",
    "approval_ref_num": "NBBL_APPR_001",
    "response_code": "000",               // "000" = success; see NBBL error codes
    "response_reason": "Success",
    "compliance_resp_cd": "",
    "compliance_reason": ""
  },
  "bill_details": {
    "customer_params": {
      "tag": [{ "name": "Consumer Number", "value": "12345678" }]
    }
  },
  "biller_response": {
    "customer_name": "John Doe",
    "amount": "150000",                   // paise
    "cust_conv_fee": "0",
    "due_date": "2024-12-31",
    "bill_date": "2024-11-01",
    "bill_number": "BILL2024001",
    "bill_period": "NOV-2024",
    "tag": [{ "name": "Additional Field", "value": "value" }]
  },
  "additional_info": {
    "tag": [{ "name": "key", "value": "val" }]
  }
}
```

**Polling:** Continue polling while `message` is `"Request is still being processed"`. Terminal messages: `"Bill details fetched successfully"` (success) or `"Bill request failed"` (failure). Poll at increasing intervals: 5s → 15s → 30s → 1 min → 3 min. If still processing after retry limit, treat as timeout and raise a support ticket.

---

## 6. Bill Payment — Full Schema

### Request

```jsonc
{
  "bill_payment_request": {
    "head": {
      "bill_fetch_ref_id": "REF20241201001",   // required — ref_id from bill fetch
      "pg_reference_id": "PG_ORDER_001"         // optional — your internal order ID
    },
    "customer": {
      "mobile": "9999999999",
      "email": "c@example.com",
      "pan": "ABCDE1234F",
      "aadhaar": "655675523712"
    },
    "agent": {
      "id": "AGENT001",
      "channel": "INT"
    },
    "bill_details": {                            // echo back from bill fetch status
      "customer_params": {
        "tag": [{ "name": "Consumer Number", "value": "12345678" }]
      }
    },
    "biller_response": {                         // echo back from bill fetch status
      "customer_name": "John Doe",
      "amount": "150000",
      "due_date": "2024-12-31",
      "bill_number": "BILL2024001",
      "bill_period": "NOV-2024",
      "tag": []
    },
    "additional_info": {
      "tag": []
    },
    "payment_method": {
      "payment_mode": "Internet Banking"         // must match biller_payment_modes
    },
    "amount": {
      "amount": "150000",                        // paise — must match bill amount for EXACT billers
      "currency": "INR"
    },
    "payment_information": {
      "payment_ref_id": "PAY_REF_001",
      "payment_date_time": "2024-12-01T10:30:00+05:30",
      "init_channel": "INT"
    }
  }
}
```

### Response `data` (202 ACCEPTED)

```jsonc
{
  "bill_fetch_ref_id": "REF20241201001",
  "transaction_ref_id": "TXN20241201001",   // store this — used in status poll
  "status": "PROCESSING"
}
```

### Status Poll Request

```jsonc
{
  "bill_fetch_ref_id": "REF20241201001",       // required
  "transaction_ref_id": "TXN20241201001"       // required
}
```

### Status Poll Response `data` (200 OK)

```jsonc
{
  "status": "success",
  "bill_payment_response": {
    "head": { "bill_fetch_ref_id": "REF20241201001" },
    "reason": {
      "approval_ref_num": "NBBL_PAY_001",
      "response_code": "000",
      "response_reason": "Transaction Approved",
      "compliance_resp_cd": "",
      "compliance_reason": ""
    },
    "txn": { "transaction_ref_id": "TXN20241201001" },
    "bill_details": { ... },
    "biller_response": { ... },
    "additional_info": { ... }
  }
}
```

---

## 7. Ticket Raise — Full Schema

**Disposition codes** (required; use code string, not free-text):

| Code | Description | Type |
|---|---|---|
| `D11` | Transaction successful, amount debited but service not received | Dispute |
| `D12` | Transaction successful, amount debited but service disconnected/stopped | Dispute |
| `D13` | Transaction successful, amount debited but LPSC charges added in next bill | Dispute |
| `D21` | Erroneously paid in wrong account | Dispute |
| `D22` | Duplicate payment | Dispute |
| `D23` | Erroneously paid the wrong amount | Dispute |
| `D31` | Payment info not received from biller / delay in receiving | Complaint |
| `D32` | Bill paid but amount not adjusted or still showing due | Complaint |

### Request

```jsonc
{
  "ticket_raise_request": {
    "agent_id": "AGENT001",                  // required
    "txn_reference_id": "TXN20241201001",    // required — completed transaction ref
    "disposition": "D11",                    // required — use D11–D32 codes (see table above)
    "description": "Payment deducted but biller not updated",  // required
    "customer_mobile": "9999999999",         // required (PII)
    "customer_email_id": "c@example.com",    // optional (PII)
    "customer_name": "John Doe"              // optional
  }
}
```

### Response `data` (202 ACCEPTED)

```jsonc
{
  "ref_id": "TKT_REF_001",    // store for status poll
  "status": "PROCESSING"
}
```

---

## 8. Ticket Status — Full Schema

### Request

```jsonc
{ "ref_id": "TKT_REF_001" }
```

### Response `data` (200 OK)

```jsonc
{
  "ref_id": "TKT_REF_001",
  "ticket_id": "TKT001",
  "ticket_status": "OPEN",          // OPEN | IN_PROGRESS | RESOLVED | CLOSED
  "ticket_type": "COMPLAINT",
  "assigned": "AGENT001",
  "response_code": "000",
  "response_reason": "Ticket created successfully",
  "description": "Payment deducted but biller not updated"
}
```

---

## 9. Agent Institution Wallet — Full Schema

### Get Wallet Balance

**Request:** `GET /agent/{agentId}/wallet/balance`

Path parameter `agentId` = BBPS Agent ID (bbpsAgentId) of the Agent Institution.

**Response (200 OK):**
```jsonc
{
  "balance": 5000.00    // Current available balance in INR (not paise)
}
```

**Error examples (400):**
```jsonc
// No active wallet
{ "message": "No active wallet found for bbpsAgentId: OU01XXXXINT001123456", "code": "wallet_not_found", "type": "invalid_request_error" }

// Agent not found
{ "message": "Agent not found for bbpsAgentId: OU01XXXXINT001123456", "code": "agent_not_found", "type": "invalid_request_error" }
```

---

### Get Wallet Ledger

**Request:** `POST /agent/{agentId}/wallet/ledger?page=0&size=20`

Query params: `page` (zero-indexed, default 0), `size` (default 20).

```jsonc
{
  "start_date_time": "2025-01-01 00:00:00",   // optional — format: yyyy-MM-dd HH:mm:ss
  "end_date_time": "2025-01-31 23:59:59",     // optional
  "sale_type": "DEBIT",                        // optional — CREDIT | DEBIT
  "utr": "UTR123456789"                        // optional — filter by UTR
}
```

All body fields optional. Empty body returns all entries.

**Response (200 OK):**
```jsonc
{
  "content": [
    {
      "id": 1001,                          // Unique ledger entry ID
      "wallet_id": 42,                     // Internal wallet ID
      "sale_type": "DEBIT",               // CREDIT = top-up; DEBIT = bill payment
      "amount": 250.00,                    // Transaction amount in INR
      "closing_balance": 4750.00,         // Wallet balance after this transaction in INR
      "utr": "UTR123456789",              // Unique Transaction Reference number
      "added_on": "2025-01-15 10:30:00",
      "updated_on": "2025-01-15 10:30:05"
    }
  ],
  "size": 20,       // Entries per page
  "page": 0,        // Current page (zero-indexed)
  "last": true      // true = no more pages
}
```

---

## 10. Polling Strategy

All async endpoints use exponential backoff:

| Attempt | Wait before this poll |
|---|---|
| 1 | 5 seconds |
| 2 | 15 seconds |
| 3 | 30 seconds |
| 4 | 1 minute |
| 5+ | 3 minutes |

**Terminal conditions per endpoint:**

| Endpoint | Continue polling while... | Terminal success | Terminal failure |
|---|---|---|---|
| Bill fetch response | `message` = `"Request is still being processed"` | `message` = `"Bill details fetched successfully"` | `message` = `"Bill request failed"` |
| Bill payment response | `data.status` = `"processing"` | `data.status` = `"success"` | `data.status` = `"failed"` |
| Ticket status | `message` = `"Request is still being processed"` | `message` = `"Ticket status fetched successfully"` | — |

If still processing after retry limit: raise a support ticket (bill fetch/payment) or contact Cashfree support with `ref_id` (ticket).

---

## 11. Common Errors

Error responses use `{message, code, type}` — no `status` or `data` fields.

| HTTP Status | `type` | `code` example | Cause |
|---|---|---|---|
| 400 | `invalid_request_error` | `bill_fetch_request.agent_id_missing` | Missing required field or validation failure |
| 401 | `authentication_error` | `request_failed` | Invalid or missing auth headers |
| 429 | `rate_limit_error` | `request_failed` | Exceeded 100 requests per 60 seconds |
| 500 | `api_error` | `internal_error` | Downstream NBBL error or internal error |

For 400 errors, the `message` field describes which specific field failed validation (e.g. `"bill_fetch_request.agent_id : is missing in the request"`).