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
| POST | `/v1/billers/request/bill-fetch` | **202** | Async — returns ref_id |
| POST | `/v1/billers/response/bill-fetch` | 200 | Poll with ref_id |
| POST | `/v1/billers/request/bill-payment` | **202** | Async — returns transaction_ref_id |
| POST | `/v1/billers/response/bill-payment` | 200 | Poll with bill_fetch_ref_id + transaction_ref_id |
| POST | `/v1/billers/request/ticket` | **202** | Async — returns ref_id |
| POST | `/v1/billers/response/ticket-status` | 200 | Poll with ref_id |

---

## 2. Standard Response Envelope

Every response is wrapped in:

```jsonc
{
  "status": "OK",          // string — see status values per endpoint below
  "message": "...",        // human-readable description
  "data": { ... }          // payload — null on error
}
```

Error response (4xx / 5xx):
```json
{
  "status": "FAILURE",
  "message": "internal server error",
  "data": null
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

**`fetch_requirement` values:**
- `MANDATORY` — must complete bill fetch before payment
- `OPTIONAL` — bill fetch recommended but payment can proceed without it
- `NOT_SUPPORTED` — biller supports direct payment only; skip to bill payment

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
  "flow": "OFFLINE"             // OFFLINE | ONLINE
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

**Polling:** When still processing, `bill_fetch_response` will have `response_reason: "Processing"` and `bill_details` / `biller_response` will be absent.

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

### Request

```jsonc
{
  "ticket_raise_request": {
    "agent_id": "AGENT001",                  // required
    "txn_reference_id": "TXN20241201001",    // required — completed transaction ref
    "disposition": "COMPLAINT",              // required — COMPLAINT | QUERY | SERVICE_REQUEST
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

## 9. Polling Strategy

Both async endpoints (bill fetch, bill payment, ticket) follow the same polling pattern:

| Condition | Action |
|---|---|
| `response_reason` = `"Processing"` | Wait and retry |
| `response_code` = `"000"` | Terminal success |
| Any other `response_code` | Terminal failure — surface to user |

Recommended poll interval: **2–5 seconds**. NBBL timeout per request is **20 seconds** — expect most responses within this window.

---

## 10. Common Errors

| HTTP Status | `status` field | Cause |
|---|---|---|
| 400 | `BAD_REQUEST` | Missing required field or validation failure |
| 404 | `NOT_FOUND` | `ref_id` / `transaction_ref_id` does not exist |
| 500 | `FAILURE` | Downstream NBBL error or internal error |

For 400 errors, the `message` field describes which field failed validation.