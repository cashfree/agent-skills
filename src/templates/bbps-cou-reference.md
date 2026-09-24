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
      "init_channel": "INT",             // BNKBRNCH | MOB | MOBB | INT | INTB | ATM | KIOSK | AGT | BSC
      "ip": "192.168.1.1",
      "mac": "01:23:45:67:89:AB",
      // Other sub-fields (pass what is applicable to your channel):
      "app": "MerchantApp",             // required for MOB/MOBB
      "imei": "123456789012345",        // required for MOB/MOBB
      "os": "Android",                  // required for MOB/MOBB
      "mobile": "9999999999",           // required for AGT/BSC/BNKBRNCH
      "geo_code": "28.7041,77.1025",   // required for AGT/BSC/BNKBRNCH
      "postal_code": "110001",          // required for AGT/BSC/BNKBRNCH
      "terminal_id": "TERM001",         // required for ATM/KIOSK/AGT/BSC
      "ifsc": "HDFC0001234"             // required for BNKBRNCH
    }
    // init_channel values — what each channel means and which sub-fields are required:
    //
    // INT      Internet (Pre-login)
    //          Payment on a website/web portal without logging in to any bank or BBPOU account.
    //          Example: guest checkout on a website — enter consumer number, pay by card/UPI.
    //          Required: ip, mac
    //
    // INTB     Internet Banking (Post-login)
    //          Bill Pay section accessed after logging in to the AI's website.
    //          Example: log in to AI's website → Bill Pay section → pay biller.
    //          Required: ip, mac
    //
    // MOB      Mobile (Pre-login)
    //          Payment on a mobile app or mobile website without logging in (guest/pre-login).
    //          Example: quick-pay on a PA's mobile app, no sign-in required.
    //          Required: ip, imei, os, app
    //
    // MOBB     Mobile Banking (Post-login)
    //          Payment after logging in to the customer's own bank's mobile banking app.
    //          Example: log in to Axis Mobile/YONO → Bill Pay module → pay biller.
    //          Required: ip, imei, os, app
    //
    // ATM      ATM
    //          Payment at a bank's ATM machine via the "Bill Payment" option using a debit card.
    //          Example: SBI ATM → insert card → Bill Payments → pay electricity bill.
    //          Required: terminal_id
    //
    // BNKBRNCH Bank Branch
    //          Customer visits a physical bank branch; a teller processes the payment over the counter.
    //          Example: customer hands cash to teller at Axis Bank branch; teller keys it in.
    //          Required: ifsc, mobile, geo_code, postal_code
    //
    // AGT      Agent
    //          Assisted, human-operated offline outlet (retail store, CSP) where an operator
    //          collects payment and keys it in on the customer's behalf. Not bank staff.
    //          Example: local kirana shop running a Cashfree bill-pay app; shopkeeper collects cash.
    //          Required: terminal_id, mobile, geo_code, postal_code
    //
    // KIOSK    Kiosk
    //          Unattended self-service physical terminal where the customer completes the
    //          transaction independently with no operator.
    //          Example: self-service touchscreen kiosk in a mall — customer inserts cash/card.
    //          Required: terminal_id
    //
    // BSC      Business Correspondent
    //          RBI-regulated Banking Correspondent formally appointed by a bank to deliver
    //          banking/bill-payment services, typically using Aadhaar/biometric devices.
    //          Example: Spice Money / CSC BC agent — transacts on the sponsor bank's behalf.
    //          Required: terminal_id, mobile, geo_code, postal_code
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
    "amount": "1200.00",                  // rupees (decimal)
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
  "order_amount": 1200.00,       // required — bill amount in INR (use biller_response.amount directly)
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
      "amount": "1200.00",                     // rupees — echo exactly as received from fetch response
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
        "amount": "1200.00",                   // required — rupees; must match bill amount for "Exact" billers
        "cust_conv_fee": "10.00",              // required — customer convenience fee (CCF1) in rupees; "0.00" if none
        "cou_cust_conv_fee": "15.00",          // required — COU convenience fee (CCF2) in rupees; "0.00" if none
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

### Status Poll Response — full outer envelope (200 OK)

Poll on the top-level `message` field, not `data.*`:

| `message` | Meaning |
|---|---|
| `"Payment is still being processed"` | Continue polling |
| `"Payment successful"` | Terminal — payment complete |
| `"Payment failed"` | Terminal — payment failed |

```jsonc
{
  "status": "OK",                               // always "OK"
  "message": "Payment successful",             // THIS is the field to poll on
  "data": {
    "bill_payment_response": {                  // no data.status, no data.response wrapper
      "head": { "bill_fetch_ref_id": "REF20241201001" },
      "reason": {
        "approval_ref_num": "APPR123456",       // empty string on failure or while processing
        "response_code": "000",                 // "000" = success; "PENDING" = processing; empty on failure
        "response_reason": "Successful",
        "compliance_resp_cd": null,             // failure code from biller (see Section 14)
        "compliance_reason": null               // human-readable failure reason; on payment failures
                                                // often formatted as "ERR_CODE : description"
      },
      "txn": { "transaction_ref_id": "TXN20241201001" },
      "bill_details": { ... },                  // populated on SUCCESS; null while processing or on failure
      "biller_response": {                      // populated on SUCCESS; null while processing or on failure
        "customer_name": "John Doe",
        "amount": "1200.00",                    // rupees
        "cust_conv_fee": "0.00",               // convenience fee in rupees
        "due_date": "2024-12-31",
        "bill_number": "BILL2024001",
        "bill_period": "NOV-2024"
      },
      "additional_info": { ... }                // populated when biller returns it; null otherwise
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

Path parameter `{agentId}` = **Agent Institution ID** (`bbpsAgentInstituteId`), for example `AI15`. This is the parent institution identifier — **not** the channel-level `agent_id` used in bill fetch and bill payment requests (which looks like `OU01XXXXINT001123456`).

**Funding models:** The balance can be positive or negative:
- **Prefunding model** — wallet is funded in advance. Payments debit from it. Balance never goes below zero.
- **Shortfall (postfunding) model** — Cashfree provides a credit line. Payments draw against it. A **negative balance** is expected and represents the amount drawn that must be repaid.

**Response (200 OK):**
```jsonc
{
  "balance": 5000.00    // Current available balance in INR. Can be negative on the shortfall model.
}
```

**Error examples (400):**
```jsonc
// No active wallet
{ "message": "No active wallet found for agentInstitutionId: AI15", "code": "wallet_not_found", "type": "invalid_request_error" }
```

---

### Get Wallet Ledger

**Request:** `POST /agent/{agentId}/wallet/ledger?page=0&size=20`

`{agentId}` = Agent Institution ID (`bbpsAgentInstituteId`, e.g. `AI15`) — same as wallet balance.

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
      "event": "BILL_PAYMENT_DEBIT",       // Ledger event type:
                                           //   BILL_PAYMENT_FREEZE   — amount held when payment is initiated
                                           //   BILL_PAYMENT_UNFREEZE — hold released on completion/timeout/failure
                                           //   BILL_PAYMENT_DEBIT    — actual debit on successful payment
                                           //   WALLET_SEED           — wallet top-up credit
      "event_id": "CH0162455XTQK9MIPNYZ", // transaction_ref_id from Bill Payment API — use to correlate entries
      "sale_type": "DEBIT",               // CREDIT = wallet top-up; DEBIT = bill payment
      "amount": 250.00,                    // Transaction amount in INR
      "closing_balance": 4750.00,         // Wallet balance after this transaction in INR (can be negative on shortfall model)
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
| Bill payment response | `message` = `"Payment is still being processed"` | `message` = `"Payment successful"` | `message` = `"Payment failed"` |
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

---

## 14. Compliance Error Codes

When a bill fetch, validation, or payment request fails at the biller or network level, the response contains:
- `compliance_resp_cd` — machine-readable code
- `compliance_reason` — human-readable reason (on payment failures, often formatted as `"ERR_CODE : description"`)

**Retry categories:**
- `NON_RETRIABLE` — the same input will fail again. Correct customer details or inform the customer.
- `RETRIABLE` — temporary biller or network issue. Retry after a short delay.
- `CONDITIONAL` — inspect the inner error codes in `compliance_reason` before deciding whether to retry.

### Bill fetch error codes (`BFR` prefix — from Bill Fetch Response API)

| `compliance_resp_cd` | Reason | Category |
|---|---|---|
| `BFR001` | Incorrect or invalid customer account | `NON_RETRIABLE` |
| `BFR002` | Invalid combination of customer parameters | `NON_RETRIABLE` |
| `BFR003` | No bill data available | `NON_RETRIABLE` |
| `BFR004` | Payment received for the billing period, no bill due | `NON_RETRIABLE` |
| `BFR005` | Customer account is blocked or closed | `NON_RETRIABLE` |
| `BFR006` | Customer account is not activated | `NON_RETRIABLE` |
| `BFR007` | Bill due date has expired, bill details not available | `NON_RETRIABLE` |
| `BFR008` | Unable to get bill details from biller | `RETRIABLE` |
| `BFR009` | Scheduled downtime by biller, try again later | `RETRIABLE` |
| `BFR010` | Unscheduled downtime by biller, try again later | `RETRIABLE` |
| `BFR011` | Incomplete details in biller system, update customer profile | `NON_RETRIABLE` |
| `BFR012` | ePayment not enabled for the dealer | `NON_RETRIABLE` |
| `BFR013` | Maximum refill count reached | `NON_RETRIABLE` |
| `BFR014` | Consumer has reported loss of cylinder | `NON_RETRIABLE` |
| `BFR015` | Cannot take booking, consumer KYC not submitted | `NON_RETRIABLE` |
| `BFR016` | One prior booking is pending against this consumer | `NON_RETRIABLE` |
| `BFR017` | Price not yet set for nature or package code. Retry later. | `RETRIABLE` |
| `BFR018` | Day-end not done, try after some time | `RETRIABLE` |
| `BFR019` | Consumer number and distributor not matching | `NON_RETRIABLE` |
| `BFR020` | LPG ID not found | `NON_RETRIABLE` |
| `BFR021` | Vehicle registration number invalid or does not exist | `NON_RETRIABLE` |
| `BFR022` | FASTag inactive or blocked, recharge not allowed | `NON_RETRIABLE` |
| `BFR023` | FASTag exempted, recharge not allowed | `NON_RETRIABLE` |

### Bill validation error codes (`BVR` prefix — from Bill Fetch Response API, VALIDATE_AND_PAY flow)

| `compliance_resp_cd` | Reason | Category |
|---|---|---|
| `BVR001` | Incorrect or invalid customer account | `NON_RETRIABLE` |
| `BVR002` | Invalid combination of customer parameters | `NON_RETRIABLE` |
| `BVR003` | Customer account is blocked or closed | `NON_RETRIABLE` |
| `BVR004` | Customer account is not activated | `NON_RETRIABLE` |
| `BVR005` | Invalid amount | `NON_RETRIABLE` |
| `BVR006` | Customer account deactivated, pay to activate | `NON_RETRIABLE` |
| `BVR007` | Incomplete details in biller system, update profile | `NON_RETRIABLE` |
| `BVR008` | Customer account valid but no bill due | `NON_RETRIABLE` |
| `BVR009` | Technical exception from biller | `RETRIABLE` |

### Payment posting error codes (`BPR` prefix — from Bill Payment Response API)

| `compliance_resp_cd` | Reason | Category |
|---|---|---|
| `BPR001` | Incorrect or invalid customer account | `NON_RETRIABLE` |
| `BPR002` | Invalid combination of customer parameters | `NON_RETRIABLE` |
| `BPR003` | Customer account is blocked or closed | `NON_RETRIABLE` |
| `BPR004` | Customer account is not activated | `NON_RETRIABLE` |
| `BPR005` | Payment cannot be accepted at this time | `RETRIABLE` |
| `BPR006` | Payment request has been exceeded for the day. Retry the next day. | `NON_RETRIABLE` |
| `BPR007` | Repeat payment request | `NON_RETRIABLE` |
| `BPR008` | Due date expired, re-fetch to get current outstanding | `RETRIABLE` |
| `BPR009` | Scheduled downtime by biller, try again later | `RETRIABLE` |
| `BPR010` | Unscheduled downtime by biller, try again later | `RETRIABLE` |
| `BPR011` | Payment amount different from current outstanding | `RETRIABLE` |
| `BPR012` | FASTag top-up failed, try again later | `RETRIABLE` |

### Infrastructure error codes (`BOU`/`COU` prefix)

These indicate transport or switch-level failures between operating units, not a biller decision.

| `compliance_resp_cd` | Reason | Category |
|---|---|---|
| `BOU001` | Send failed to BOU | `RETRIABLE` |
| `BOU002` | Inner error codes from BOU negative acknowledgement | `CONDITIONAL` |
| `BOU003` | Timeout at BOU | `RETRIABLE` |
| `BOU004` | BOU reversal retry failure | `NON_RETRIABLE` |
| `BOU005` | BOU reversal response timeout | `NON_RETRIABLE` |
| `BOU006` | Connect timeout at BOU | `RETRIABLE` |
| `BOU007` | Read timeout at BOU | `RETRIABLE` |
| `BOU008` | Unable to connect to BOU | `RETRIABLE` |
| `BOU009` | Pending transaction timeout at BOU | `RETRIABLE` |
| `COU001` | Send failed to COU | `RETRIABLE` |
| `COU002` | Inner error codes from COU negative acknowledgement | `CONDITIONAL` |
| `COU003` | COU reversal retry failure | `NON_RETRIABLE` |
| `COU006` | Connect timeout at COU | `RETRIABLE` |
| `COU007` | Read timeout at COU | `RETRIABLE` |
| `COU008` | Unable to connect to COU | `RETRIABLE` |