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

All requests require these headers on every call:

```http
x-client-id: <your-client-id>
x-client-secret: <your-client-secret>
x-api-version: 2025-01-01
```

Credentials are issued per Agent Institution and are available in the [Merchant Dashboard](https://merchant.cashfree.com/verificationsuite/developers/api-keys) for both sandbox and production environments.

### Sandbox agent IDs and device block values

Use these pre-configured agent IDs and device block values when testing in the sandbox environment. Only three initiating channels are supported.

| Initiating channel | Channel code | Sandbox agent ID |
|---|---|---|
| Internet Banking (Post-login) | `INTB` | `CH01CH02INB516193127` |
| Mobile Banking (Post-login) | `MOBB` | `CH01CH02MBBPAL001085` |

**INTB device block (bill fetch `agent_device_info` / bill payment `agent.device.tag`):**
```
init_channel / INITIATING_CHANNEL: INTB
ip / IP:  124.170.23.24
mac / MAC: 01-23-45-67-89-ab
```

**MOBB device block:**
```
init_channel / INITIATING_CHANNEL: MOBB
ip / IP:   124.170.23.24
imei / IMEI: 123456789012345
os / OS:   IOS
app / APP:  AGENTAPP
```

> Note: for bill fetch, pass these as named fields under `agent_device_info`. For bill payment, pass them as name-value pairs in the `agent.device.tag` array.

### Sandbox auto bill simulator (Loan Repayment)

Use biller `SWAR00027NAT2J` (category: Loan Repayment) to test without real customer data. Pass `CF_AUTO_GENERATE` as the value for any `input_params` entry — the system auto-generates a bill and returns a `ref_id` you can poll immediately.

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
                                               (skip for DIRECT_PAY billers — go straight to step 5a)
4. POST /v1/billers/response/bill-fetch     → poll with ref_id until terminal message

[PG payment layer — happens before bill payment]
5a. POST /pg/orders (Cashfree PG)           → create order with bbps block (bill_fetch_ref_id, biller_id, agent_id)
5b. Customer completes payment via Cashfree PG (Checkout / SDK)

6. POST /v1/billers/request/bill-payment    → 202 ACCEPTED, transaction_ref_id returned
7. POST /v1/billers/response/bill-payment   → poll with bill_fetch_ref_id + transaction_ref_id

[Optional — for disputes]
8. POST /v1/billers/request/ticket          → 202 ACCEPTED, ref_id returned
9. POST /v1/billers/response/ticket-status  → poll with ref_id until resolved
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

**How `VALIDATE_AND_PAY` differs from `FETCH_AND_PAY`:**

`VALIDATE_AND_PAY` billers require identity validation before payment but do not return bill details. The flow still calls the bill fetch and poll endpoints, but the response is different:

| | `FETCH_AND_PAY` | `VALIDATE_AND_PAY` |
|---|---|---|
| Call bill fetch? | Yes | Yes |
| Poll response includes `bill_details` | Yes | No |
| Poll response includes `biller_response` | Yes | No |
| Poll response includes `additional_info` | Yes | Yes |
| What to echo in payment `bill_details`? | Echo `customer_params` from fetch response | Use the original `input_params` from your fetch request |
| What to echo in payment `biller_response`? | Echo full `biller_response` from fetch | Omit or send empty — no bill data returned |

For `VALIDATE_AND_PAY`, the bill fetch poll response (`message` = `"Bill details fetched successfully"`) only contains:
```json
{
  "bill_fetch_response": { "ref_id": "...", "approval_ref_num": "...", "response_code": "000" },
  "additional_info": { "tag": [...] }
}
```
No `bill_details` or `biller_response` will be present. Proceed to bill payment using the customer's original input params and omit `biller_response` from the payment request.

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
  "data": [
    "Broadband Postpaid", "Cable TV", "Clubs and Associations", "Credit Card",
    "DTH", "Donation", "Education", "Electricity", "Fastag", "Gas",
    "Hospital", "Hospital and Pathology", "Insurance", "LPG Gas",
    "Landline Postpaid", "Loan Repayment", "Mobile Postpaid",
    "Municipal Services", "Municipal Taxes", "Recurring Deposit",
    "Rental", "Subscription", "Water"
  ]
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
    "biller_id": ["UPCL123"],
    "biller_category_name": ["Electricity"]
  }
}
```

Response includes `biller_customer_params`, `biller_payment_modes`, `fetch_requirement`, `payment_amount_exactness`, `biller_response_type`, and `selection_type`. Store `biller_response_type` and `selection_type` — they determine whether to use `x-api-version: 2026-10-01` for LIST billers.

> **Tip:** Cache the biller categories and biller info responses — this data changes infrequently. Avoid calling these on every user request.

> **Note:** `payment_amount_exactness: RANGE` means the biller accepts any amount within a min/max range (returned in `biller_responses[].min_amount` / `max_amount` in the fetch response). `biller_response_type: LIST` means the biller can return multiple bills in a single fetch — use `x-api-version: 2026-10-01` for these billers.

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
        { "param_name": "Consumer Number", "param_value": "12345678" }
      ]
    },
    "agent_device_info": {
      "init_channel": "INTB",  // Supported: MOBB | INTB | AGT
      "ip": "192.168.1.1",
      "mac": "01:23:45:67:89:AB"
      // Required fields by init_channel:
      // INTB → ip, mac
      // MOBB → ip, imei, os, app
      // AGT  → terminal_id, mobile, geo_code, postal_code
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
      "amount": "1200.00",
      "due_date": "2024-12-31",
      "bill_number": "BILL2024001",
      "bill_period": "NOV-2024"
    }
  }
}
```

> Amount is in **rupees** — `"1200.00"` = ₹1200.00.

> **LIST billers (x-api-version: 2026-10-01):** For billers with `biller_response_type: LIST`, use `x-api-version: 2026-10-01` header. The response returns `biller_responses` (array) instead of `biller_response` (single object). Each entry has `bill_number`, `amount`, `label`, `min_amount`, `max_amount`, and optionally `tag[]` with selectable payment options (e.g. Part Payment, Foreclosure). Use `selection_type` from Biller Info to determine how many bills the customer can select. Do NOT pass `biller_response` in the payment request for LIST billers.

---

### Step 5a — Create Cashfree PG Order

Before initiating the BBPS bill payment, create a Cashfree PG order with a `bbps` block. The `bbps` block links the PG order to the bill fetch and is required for BBPS payments.

```http
POST /pg/orders
x-client-id: <your-client-id>
x-client-secret: <your-client-secret>
x-api-version: 2025-01-01
Content-Type: application/json

{
  "order_amount": 1200.00,             // bill amount in INR (use biller_response.amount directly)
  "order_currency": "INR",
  "customer_details": {
    "customer_id": "CUST001",
    "customer_phone": "9999999999"
  },
  "bbps": {
    "bill_fetch_ref_id": "REF20241201001",   // ref_id from bill fetch
    "biller_id": "UPCL123",
    "agent_id": "AGENT001"
  }
}
```

> All three fields in the `bbps` block — `bill_fetch_ref_id`, `biller_id`, and `agent_id` — are required.

---

### Step 5b — Customer Completes Payment via Cashfree PG

Use the PG order response (payment session) to render the Cashfree Checkout or invoke the SDK so the customer can complete the payment. Once the customer pays successfully through PG, proceed to Step 6.

---

### Step 6 — Initiate Bill Payment

Use `ref_id` from Step 3 as `bill_fetch_ref_id`. Echo back `biller_response` and `bill_details` exactly as received from Step 4.

```http
POST /v1/billers/request/bill-payment
Content-Type: application/json

{
  "bill_payment_request": {
    "head": {
      "bill_fetch_ref_id": "REF20241201001",   // required — ref_id from bill fetch
      "pg_reference_id": "PG_ORDER_001",        // required when skip_pg_transaction is false or omitted
      "skip_pg_transaction": false              // optional for prefunding; mandatory for postfunding Agent Institutions
                                             // set true when no PG transaction was performed and the full amount comes from the shortfall wallet
    },
    "customer": {
      "mobile": "9999999999",
      "tag": [{ "name": "EMAIL", "value": "customer@example.com" }]  // optional — EMAIL | AADHAAR | PAN
    },
    "agent": {
      "id": "AGENT001",
      "device": {
        "tag": [
          { "name": "INITIATING_CHANNEL", "value": "INTB" },  // Supported: MOBB | INTB | AGT
          { "name": "IP", "value": "192.168.1.1" }
        ]
      }
    },
    "bill_details": {
      "biller": { "id": "UPCL123" },           // required — biller ID
      "customer_params": {
        "tag": [{ "name": "Consumer Number", "value": "12345678" }]
      }
    },
    "biller_response": { ... },                 // echo back from bill fetch status
    "additional_info": { "tag": [] },           // echo back from bill fetch status
    "payment_method": {
      "quick_pay": "No",                        // required — "Yes" if paying without prior fetch
      "split_pay": "No",                        // required
      "off_us_pay": "No",                       // required
      "payment_mode": "UPI"                     // must match biller_payment_modes
    },
    "amount": {
      "amt": {
        "amount": "1200.00",                    // rupees — must match bill amount for Exact billers
        "cust_conv_fee": "10.00",               // customer convenience fee (CCF1) in rupees
        "cou_cust_conv_fee": "15.00",           // COU convenience fee (CCF2) in rupees
        "currency": "356"                       // numeric INR code
      },
      // tag: required when biller returns payment options in biller_responses[].tag (e.g. Part Payment, Foreclosure)
      // echo the chosen option back with value set to the amount the customer chose
      // "tag": [{ "name": "Part Payment", "value": "100.00", "min_amount": "50.00", "max_amount": "150.00" }],
      // amount_break_up: required for LIST type billers (x-api-version: 2026-10-01)
      // "amount_break_up": { "bill_amt": [{ "bill_number": "BILL001", "amount": "600.00" }] }
    },
    // payment_breakdown: optional for prefunding; mandatory for postfunding Agent Institutions
    // "payment_breakdown": { "shortfall_amount": "200.00" },
    "payment_information": {
      "tag": [{ "name": "VPA", "value": "customer@upi" }]  // required — instrument details by payment mode
    }
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

Poll at increasing intervals: 5s → 15s → 30s → 1 min → 3 min. Stop when `message` is `"Payment successful"` or `"Payment failed"`. Continue polling while `message` is `"Payment is still being processed"`. If still processing after your retry limit, treat as timeout and raise a support ticket.

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
  "status": "OK",
  "message": "Payment successful",
  "data": {
    "bill_payment_response": {
      "head": { "bill_fetch_ref_id": "REF20241201001" },
      "reason": {
        "approval_ref_num": "APPR123456",
        "response_code": "000",
        "response_reason": "Successful"
      },
      "txn": { "transaction_ref_id": "TXN20241201001" },
      "bill_details": { "customer_params": { "tag": [{ "name": "Consumer Number", "value": "12345678" }] } },
      "biller_response": { "customer_name": "John Doe", "amount": "1200.00", "cust_conv_fee": "0.00" }
    }
  }
}
```

---

### Step 7 (Optional) — Raise Support Ticket

Use when a transaction needs follow-up or the customer disputes a completed payment. The `disposition` field must use a predefined code (D11–D32) — see `references/REFERENCE.md` for the full disposition code table.

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

Poll at increasing intervals: 5s → 15s → 30s → 1 min → 3 min. Stop when `message` is `"Ticket details fetched successfully"` or `"Ticket request failed"`. If still processing after your retry limit, contact Cashfree support with the `ref_id`.

```http
POST /v1/billers/response/ticket-status
Content-Type: application/json

{ "ref_id": "TKT_REF_001" }
```

Response (HTTP 200):
```json
{
  "status": "OK",
  "message": "Ticket details fetched successfully",
  "data": {
    "ref_id": "TKT_REF_001",
    "ticket_id": "TKT001",
    "ticket_status": "ASSIGNED",
    "ticket_type": "DISPUTE",
    "assigned": "BILLER",
    "response_code": "000",
    "response_reason": "SUCCESS",
    "description": "Payment deducted but biller not updated"
  }
}
```

---

### Wallet — Balance and Ledger

Use `GET /agent/{agentId}/wallet/balance` to check available balance (in INR; can be negative on the shortfall/postfunding model). Use `POST /agent/{agentId}/wallet/ledger` for paginated reconciliation history. Note: `{agentId}` here is the Agent Institution ID (e.g. `AI15`), not the channel-level `agent_id` used in bill fetch/payment. Full schemas in `references/REFERENCE.md`.

---

## 6. Key Rules

- **Always poll** — bill fetch and bill payment are async. A `202 ACCEPTED` response is not final.
- **Use exponential backoff when polling** — 5s → 15s → 30s → 1 min → 3 min intervals.
- **Check flow before calling bill fetch** — for `DIRECT_PAY` billers (both `fetch_requirement` and `support_bill_validation` = `NOT_SUPPORTED`), skip bill fetch entirely and go directly to bill payment. Calling bill fetch for these billers returns a validation error.
- **Echo back biller data** — the bill payment request must include `biller_response`, `bill_details`, and `additional_info` exactly as received from the fetch status response. Exception: do NOT pass `biller_response` for LIST type billers (`biller_response_type: LIST`) — use `amount_break_up` in `amount` instead.
- **`payment_information` is required** — pass payment instrument details as `tag[]` with the appropriate fields for the payment mode (e.g. `VPA` for UPI, `CardNum`+`AuthCode` for card, `IFSC`+`AccountNo` for bank transfer).
- **`payment_method` requires three flags** — always include `quick_pay`, `split_pay`, and `off_us_pay` (typically all `"No"`).
- **`amount.amt.currency` is the numeric INR code** — use `"356"`, not `"INR"`.
- **`bill_details.biller.id` is required** — include the biller ID in the payment request alongside the customer params.
- **Amount is in rupees** — use decimal notation: `"1200.00"`, not paise. This applies to all amount fields in bill fetch response, bill payment request, and bill payment response.
- **`bill_fetch_ref_id` links fetch to payment** — the `ref_id` from bill fetch becomes `bill_fetch_ref_id` in bill payment and all subsequent calls.
- **Poll bill payment on `message`, not `data.status`** — terminal conditions are `message = "Payment successful"` or `"Payment failed"`. There is no `data.status` field in the payment response.
- **Ticket is post-payment** — `txn_reference_id` in the ticket raise must reference a real completed transaction.
- **Disposition must use a code** — use D11–D32 codes in the `disposition` field; free-text values like `COMPLAINT` are not accepted.
- **All APIs rate limited** — 100 requests per 60 seconds. Exceeding returns HTTP 429.
- **Wallet `agentId` is the institution ID** — the `{agentId}` path parameter in wallet APIs is the Agent Institution ID (e.g. `AI15`), not the channel-level `agent_id` used in bill fetch and payment requests.

---

## 7. Webhooks

Cashfree sends webhook events for async status updates when an async operation reaches a terminal state. Configure your endpoint in the Merchant Dashboard under **Settings > Webhooks**.

> **Important:** Webhooks are delivered **in addition to** the polling APIs, not instead of them. Always implement polling as a fallback — webhooks can be delayed or retried.

---

### Step 1 — Verify the signature

Every webhook request carries two headers:

| Header | Description |
|---|---|
| `X-Webhook-Signature` | Hex-encoded HMAC-SHA256 signature of the signed payload. |
| `X-Webhook-Timestamp` | Unix timestamp in milliseconds when the webhook was sent. |

**Signature algorithm:**
```
signedPayload     = X-Webhook-Timestamp + "." + rawBody
expectedSignature = HexEncode(HMAC-SHA256(signedPayload, secretKey))
```

> **Critical:** Always compute the signature from the **raw request body string**. Parsing and re-serialising JSON changes whitespace and will break verification.

```javascript Node.js
const crypto = require("crypto");

function verifyWebhook(req) {
  const rawBody = req.rawBody; // must be the raw string, not parsed JSON
  const timestamp = req.headers["x-webhook-timestamp"];
  const receivedSignature = req.headers["x-webhook-signature"];

  const signedPayload = timestamp + "." + rawBody;
  const expectedSignature = crypto
    .createHmac("sha256", process.env.CASHFREE_SECRET_KEY)
    .update(signedPayload)
    .digest("hex");

  const expected = Buffer.from(expectedSignature, "utf8");
  const received = Buffer.from(receivedSignature || "", "utf8");

  // timingSafeEqual throws if lengths differ — check first
  if (expected.length !== received.length || !crypto.timingSafeEqual(expected, received)) {
    throw new Error("Signature mismatch. Reject this request.");
  }

  return JSON.parse(rawBody);
}
```

```python Python
import hashlib
import hmac

def verify_webhook(request):
    raw_body = request.data.decode("utf-8")  # Flask; use request.body for Django
    timestamp = request.headers["X-Webhook-Timestamp"]
    received_signature = request.headers["X-Webhook-Signature"]

    signed_payload = timestamp + "." + raw_body
    expected_signature = hmac.new(
        b"<secret-key>",
        signed_payload.encode("utf-8"),
        digestmod=hashlib.sha256,
    ).hexdigest()

    return hmac.compare_digest(expected_signature, received_signature)
```

```java Java
// Requires Java 17+
import jakarta.servlet.http.HttpServletRequest;
import javax.crypto.Mac;
import javax.crypto.spec.SecretKeySpec;
import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.util.HexFormat;

public boolean verifyWebhook(HttpServletRequest request) throws Exception {
    String rawBody = new String(request.getInputStream().readAllBytes(), StandardCharsets.UTF_8);
    String timestamp = request.getHeader("X-Webhook-Timestamp");
    String receivedSignature = request.getHeader("X-Webhook-Signature");

    String signedPayload = timestamp + "." + rawBody;
    Mac mac = Mac.getInstance("HmacSHA256");
    mac.init(new SecretKeySpec("<secret-key>".getBytes(StandardCharsets.UTF_8), "HmacSHA256"));
    String expectedSignature = HexFormat.of()
        .formatHex(mac.doFinal(signedPayload.getBytes(StandardCharsets.UTF_8)));

    if (receivedSignature == null) return false;
    return MessageDigest.isEqual(
        expectedSignature.getBytes(StandardCharsets.UTF_8),
        receivedSignature.getBytes(StandardCharsets.UTF_8));
}
```

---

### Step 2 — Handle retries safely

Cashfree retries delivery if your endpoint does not respond with HTTP `2xx` within the timeout window.

1. **Respond immediately** — return HTTP `200` as soon as you receive the request, before any downstream processing.
2. **Deduplicate by `webhook_id`** — every event carries a unique `webhook_id`. Store processed IDs and skip processing if you have already handled a given ID.
3. **Reject invalid signatures** — drop any request where signature verification fails.

---

### Step 3 — Handle events

Every COU webhook payload is a flat JSON object (not nested under a `data` key). All events share these common fields:

| Field | Type | Description |
|---|---|---|
| `webhook_id` | string | Unique delivery identifier — use for deduplication. |
| `version` | string | Payload version. Current value is `"1.0"`. |
| `event` | string | Event type — see table below. |
| `status` | string | `"SUCCESS"` or `"FAILURE"`. Absent on `BILLER_MDM_UPDATED`. |
| `agent_id` | string | Agent Institution ID that initiated the request. |

**Event types:**

| Event | Trigger |
|---|---|
| `BILL_FETCH_STATUS` | Bill fetch request reaches a terminal state (success or failure) |
| `BILL_VALIDATION_STATUS` | Bill validation request reaches a terminal state (success or failure) |
| `BILL_PAYMENT_STATUS` | Bill payment reaches a terminal state (success or failure) |
| `BILLER_MDM_UPDATED` | One or more biller MDM records have been updated |

---

#### BILL_FETCH_STATUS

Sent when a `FETCH_AND_PAY` flow bill fetch completes. Use `bill_fetch_ref_id` to correlate with your original request. On success, `bill_details` and `biller_response` are present.

```jsonc
// Success
{
  "webhook_id": "BILL_FETCH_1398",
  "version": "1.0",
  "event": "BILL_FETCH_STATUS",
  "status": "SUCCESS",
  "agent_id": "CH01CH02INB516193127",
  "bill_fetch_ref_id": "188417f3fd70452697bb632446862811942",
  "approval_ref_num": "SWAR_REF_TEST_6702",
  "response_code": "000",
  "response_reason": "Successful",
  "bill_details": {
    "customer_params": {
      "tag": [
        { "name": "Loan Account Number", "value": "LN0098766702" },
        { "name": "Mobile Number", "value": "7428776702" }
      ]
    }
  },
  "biller_response": {
    "customer_name": "Rahul Kumar",
    "amount": "250.00",
    "due_date": "2026-07-31",
    "bill_date": "2026-07-20",
    "bill_number": "SWAR_REF_TEST_6702",
    "bill_period": "MONTHLY"
  }
}

// Failure
{
  "webhook_id": "BILL_FETCH_1397",
  "version": "1.0",
  "event": "BILL_FETCH_STATUS",
  "status": "FAILURE",
  "agent_id": "CH01CH02INB516193127",
  "bill_fetch_ref_id": "06b867dc716240b1b9bcbb243bb62811939",
  "response_code": "200",
  "response_reason": "Failure",
  "compliance_resp_cd": "BFR004",
  "compliance_reason": "Payment received for the billing period, no bill due"
}
```

---

#### BILL_VALIDATION_STATUS

Sent when a `VALIDATE_AND_PAY` flow validation completes. Uses `ref_id` (not `bill_fetch_ref_id`) to correlate. On success, `additional_info` may be present; `bill_details` and `biller_response` are not returned for validation flow.

```jsonc
// Success
{
  "webhook_id": "BILL_VALIDATION_2001",
  "version": "1.0",
  "event": "BILL_VALIDATION_STATUS",
  "status": "SUCCESS",
  "agent_id": "CH01CH02INB516193127",
  "ref_id": "BV20240501GHI789",
  "approval_ref_num": "AB234567",
  "response_code": "000",
  "response_reason": "Successful",
  "additional_info": {
    "tag": [{ "name": "PlanName", "value": "Prepaid 499" }]
  }
}

// Failure
{
  "webhook_id": "BILL_VALIDATION_2002",
  "version": "1.0",
  "event": "BILL_VALIDATION_STATUS",
  "status": "FAILURE",
  "agent_id": "CH01CH02INB516193127",
  "ref_id": "BV20240501JKL012",
  "response_code": "200",
  "response_reason": "Incorrect or invalid customer account",
  "compliance_resp_cd": "BFR001",
  "compliance_reason": "Incorrect or invalid customer account"
}
```

---

#### BILL_PAYMENT_STATUS

Sent when a bill payment completes. Use both `bill_fetch_ref_id` and `transaction_ref_id` to correlate. `bill_fetch_ref_id` is `null` for DIRECT_PAY billers.

```jsonc
// Success
{
  "webhook_id": "BILL_PAYMENT_1320",
  "version": "1.0",
  "event": "BILL_PAYMENT_STATUS",
  "status": "SUCCESS",
  "agent_id": "CH01CH02INB516193127",
  "bill_fetch_ref_id": "188417f3fd70452697bb632446862811942",
  "transaction_ref_id": "CH016281FSNF02XE07D3",
  "approval_ref_num": "DAD1BC4E15D14D96AA80204EE2FF25AB",
  "response_code": "000",
  "response_reason": "Successful",
  "bill_details": {
    "customer_params": {
      "tag": [
        { "name": "Loan Account Number", "value": "LN0098766702" },
        { "name": "Mobile Number", "value": "7428776702" }
      ]
    }
  },
  "biller_response": {
    "customer_name": "Rahul Kumar",
    "amount": "250.00",
    "customer_convenience_fee": "0.00",
    "due_date": "2026-07-31",
    "bill_date": "2026-07-20",
    "bill_number": "SWAR_REF_TEST_6702",
    "bill_period": "MONTHLY"
  }
}

// Failure
{
  "webhook_id": "BILL_PAYMENT_3002",
  "version": "1.0",
  "event": "BILL_PAYMENT_STATUS",
  "status": "FAILURE",
  "agent_id": "CH01CH02INB516193127",
  "bill_fetch_ref_id": "188417f3fd70452697bb632446862811942",
  "transaction_ref_id": "CH0162455XTQK9MIPNYZ",
  "response_code": "200",
  "response_reason": "Invalid combination of customer parameters",
  "compliance_resp_cd": "BPR002",
  "compliance_reason": "Invalid combination of customer parameters"
}
```

---

#### BILLER_MDM_UPDATED

Sent when one or more biller MDM records change. Use this to refresh your local biller cache instead of polling the Billers Info API. Contains a `billers[]` array with full biller objects including `biller_response_type` (`SINGLE` | `LIST`) and `selection_type` (`SINGLE` | `MULTIPLE` | `ALL`).

```jsonc
{
  "webhook_id": "MDM_UPDATE_4001",
  "version": "1.0",
  "event": "BILLER_MDM_UPDATED",
  "billers": [
    {
      "biller_id": "VODA00000MUM03",
      "biller_name": "Vodafone Mumbai",
      "biller_category_name": "Mobile Postpaid",
      "fetch_requirement": "MANDATORY",
      "payment_amount_exactness": "EXACT",
      "biller_response_type": "SINGLE",
      "selection_type": "SINGLE",
      "support_bill_validation": "N",
      "status": "ACTIVE"
      // ... full biller MDM fields — see references/REFERENCE.md Section 15
    }
  ]
}
```

---

**Key notes:**
- `response_code` in webhook payloads is always `"200"` (HTTP level). Check `compliance_resp_cd` for biller-level failures — see `references/REFERENCE.md` Section 14 for the full error code table and retry categories.
- Fields not returned by the biller (e.g. `compliance_resp_cd` on success) are omitted from the payload, not present as `null`.
- See `references/REFERENCE.md` Section 15 for full field-level schemas of every event type.