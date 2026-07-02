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

## 2. Required Headers

All BBPS COU API calls require these three headers:

```http
x-client-id: <your-client-id>
x-client-secret: <your-client-secret>
x-api-version: 2025-01-01
```

---

## 3. Standard Response Envelope

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

## 4. Get Biller Categories

**Request:** No body.

**Response `data`:** `string[]` — array of category label strings.

---

## 5. Get Biller Info — Full Schema

### Request

```jsonc
{
  "biller_fetch_request": {                    // optional — omit to fetch all billers
    "biller_id": ["UPCL123"],                  // optional — array, max 100 entries
    "biller_category_name": ["Electricity"]    // optional — array, max 50 entries; union with biller_id if both provided
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
    "fetch_requirement": "MANDATORY",                  // MANDATORY | OPTIONAL | NOT_SUPPORTED
    "payment_amount_exactness": "Exact",               // Exact | Exact and above | Exact and below
    "support_bill_validation": "MANDATORY",            // MANDATORY | OPTIONAL | NOT_SUPPORTED
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
        "support_pending_status": "Yes"          // Yes | No
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
    "biller_ownership": "PSU",                 // Government | PSU | Private
    "status": "ACTIVE",
    "plan_mdm_requirement": "NOT_SUPPORTED",   // MANDATORY | OPTIONAL | NOT_SUPPORTED
    "biller_description": null,                // optional descriptive text
    "biller_additional_info": [],              // additional info params in fetch/validation response
    "biller_additional_info_payment": [],      // additional info params in payment response
    "plan_additional_info": [],                // additional info params in Plan MDM
    "interchange_fee_conf": [],                // interchange fee configuration details
    "interchange_fee": []                      // interchange fee details (fee codes, direction, ranges)
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

## 6. Bill Fetch — Full Schema

### Request

```jsonc
{
  "bill_fetch_request": {
    "agent_id": "AGENT001",              // required
    "biller_id": "UPCL123",             // required
    "customer_info": {                    // mandatory for FETCH_AND_PAY
      "customer_mobile": "9999999999",   // required for FETCH_AND_PAY
      "customer_email": "c@ex.com",      // optional
      "aadhaar": "655675523712",         // optional
      "pan": "ABCDE1234F"               // optional
    },
    "input_params": {
      "input": [
        { "param_name": "Consumer Number", "param_value": "12345678" }
        // param_name must match param_name from biller_customer_params
      ]
    },
    "agent_device_info": {               // mandatory for FETCH_AND_PAY; optional for VALIDATE_AND_PAY
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

## 7. Cashfree PG — Create Order (`bbps` block)

Before calling the Bill Payment API, create a Cashfree PG order with the `bbps` block. This links the PG payment to the bill fetch.

**Endpoint:** `POST /pg/orders`
**Base URL:** `https://sandbox.cashfree.com` / `https://api.cashfree.com`

**Required headers:**
```http
x-client-id: <your-client-id>
x-client-secret: <your-client-secret>
x-api-version: 2025-01-01
```

### `bbps` block schema

```jsonc
{
  "order_amount": 1500.00,       // required — bill amount in INR (convert from paise: amount / 100)
  "order_currency": "INR",       // required
  "customer_details": { ... },   // required — standard PG customer object
  "bbps": {
    "bill_fetch_ref_id": "REF20241201001",   // required — ref_id from bill fetch
    "biller_id": "UPCL123",                  // required — biller ID
    "agent_id": "AGENT001"                   // required — Agent Institution ID
  }
}
```

All three fields inside the `bbps` block are required. Omitting any one returns a validation error.

---

## 8. Bill Payment — Full Schema

### Request

```jsonc
{
  "bill_payment_request": {
    "head": {
      "bill_fetch_ref_id": "REF20241201001",   // required — ref_id from bill fetch
      "pg_reference_id": "PG_ORDER_001"         // required — Agent Institution's internal order ID
    },
    "customer": {
      "mobile": "9999999999",                  // required
      "tag": [                                 // optional — additional customer identifiers
        { "name": "EMAIL", "value": "c@example.com" }  // EMAIL | AADHAAR | PAN
      ]
    },
    "agent": {
      "id": "AGENT001",                        // required — Agent Institution ID
      "device": {                              // required
        "tag": [                               // at least one tag required
          { "name": "INITIATING_CHANNEL", "value": "INT" },
          { "name": "IP", "value": "192.168.1.1" }
          // Supported: INITIATING_CHANNEL, IP, MOBILE, GEOCODE, POSTAL_CODE,
          //            TERMINAL_ID, IMEI, IFSC, MAC, OS, APP
        ]
      }
    },
    "bill_details": {                          // required
      "biller": {
        "id": "UPCL123"                        // required — biller ID from Fetch Billers Info
      },
      "customer_params": {                     // required — customer identifiers for the bill
        "tag": [{ "name": "Consumer Number", "value": "12345678" }]
      }
    },
    "biller_response": {                       // echo back from bill fetch status (mandatory for Electricity, DTH, Gas etc.)
      "customer_name": "John Doe",
      "amount": "150000",
      "due_date": "2024-12-31",
      "bill_date": "2024-11-01",
      "bill_number": "BILL2024001",
      "bill_period": "NOV-2024"
    },
    "additional_info": {                       // echo back from bill fetch status
      "tag": []
    },
    "payment_method": {
      "quick_pay": "No",                       // required — "Yes" if paying without prior fetch
      "split_pay": "No",                       // required
      "off_us_pay": "No",                      // required
      "payment_mode": "UPI"                    // required — must match biller_payment_modes
      // Supported: UPI, Internet Banking, Debit Card, Credit Card, IMPS, Cash, Wallet, NEFT, AEPS, Bharat QR
    },
    "amount": {
      "amt": {
        "amount": "150000",                    // required — paise; must match bill amount for "Exact" billers
        "cust_conv_fee": "0",                  // required — customer convenience fee (CCF1) in paise
        "cou_cust_conv_fee": "0",              // required — COU convenience fee (CCF2) in paise
        "currency": "356"                      // required — numeric INR code (not "INR")
      }
    },
    "payment_information": {                   // required — payment instrument details for the selected mode
      "tag": [                                 // at least one tag required
        { "name": "VPA", "value": "account@upi" }
        // Required tags by payment mode:
        // UPI: VPA
        // Card: CardNum, AuthCode
        // Bank transfer: IFSC, AccountNo
        // Wallet: WalletName, MobileNo
        // AEPS: Aadhaar, IIN
      ]
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
  "status": "SUCCESS",                          // PROCESSING | SUCCESS | FAILED — poll until not "PROCESSING"
  "response": {
    "bill_payment_response": {
      "head": { "bill_fetch_ref_id": "REF20241201001" },
      "reason": {
        "approval_ref_num": "APPR123456",       // null on failure or while processing
        "response_code": "000",                 // "000" = success; "PENDING" = processing; other = failure
        "response_reason": "Approved",
        "compliance_resp_cd": null,             // present only on failure
        "compliance_reason": null               // present only on failure
      },
      "txn": { "transaction_ref_id": "TXN20241201001" },
      "bill_details": { ... },                  // present only on SUCCESS
      "biller_response": { ... },               // present only on SUCCESS; includes cust_conv_fee
      "additional_info": { ... }                // present only on SUCCESS
    }
  }
}
```

---

## 9. Ticket Raise — Full Schema

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

## 10. Ticket Status — Full Schema

### Request

```jsonc
{ "ref_id": "TKT_REF_001" }
```

### Response `data` (200 OK)

```jsonc
{
  "ref_id": "TKT_REF_001",
  "ticket_id": "TKT001",
  "ticket_status": "ASSIGNED",      // ASSIGNED | RESOLVED | REJECTED | REFUNDED
  "ticket_type": "DISPUTE",         // DISPUTE | COMPLAINT
  "assigned": "AGENT001",
  "response_code": "000",
  "response_reason": "Ticket created successfully",
  "description": "Payment deducted but biller not updated"
}
```

---

## 11. Agent Institution Wallet — Full Schema

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

## 12. Polling Strategy

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
| Bill payment response | `data.status` = `"PROCESSING"` | `data.status` = `"SUCCESS"` | `data.status` = `"FAILED"` |
| Ticket status | `message` = `"Ticket request is still being processed"` | `message` = `"Ticket details fetched successfully"` | `message` = `"Ticket request failed"` |

If still processing after retry limit: raise a support ticket (bill fetch/payment) or contact Cashfree support with `ref_id` (ticket).

---

## 13. Common Errors

Error responses use `{message, code, type}` — no `status` or `data` fields.

| HTTP Status | `type` | `code` example | Cause |
|---|---|---|---|
| 400 | `invalid_request_error` | `bill_fetch_request.agent_id_missing` | Missing required field or validation failure |
| 401 | `authentication_error` | `request_failed` | Invalid or missing auth headers |
| 429 | `rate_limit_error` | `request_failed` | Exceeded 100 requests per 60 seconds |
| 500 | `api_error` | `internal_error` | Downstream NBBL error or internal error |

For 400 errors, the `message` field describes which specific field failed validation (e.g. `"bill_fetch_request.agent_id : is missing in the request"`).