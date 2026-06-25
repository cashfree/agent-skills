---
name: Cashfree Payment Gateway - S2S REST API Integration
description: >
  Use when integrating Cashfree Payments with an app using direct REST API calls (no SDK).
  Triggers: integrate Cashfree Payments, integrate Cashfree with my app, add Cashfree Payments,
  accept payments, add checkout, collect money, create payment order, get payment status,
  Cashfree REST API, S2S API, cURL payments, Postman Cashfree, HTTP payment API, raw API integration,
  server-side payment, create order API, payment session ID, fetch order status, refund API.
  Use for any backend language not covered by the official SDKs (Ruby, PHP, Rust, etc.)
  or when the developer wants direct HTTP calls over a library.
---

# Cashfree Payment Gateway – Server-to-Server (S2S) REST API Integration

> **References available:** This SKILL.md covers the core integration flow. For payment method objects (Card, UPI, Netbanking, Wallet, EMI, Paylater), advanced workflows (Native OTP, UPI Collect, Refunds, Pre-Authorization), rate limits, and error codes — read `references/REFERENCE.md` in this directory.

---

## 1. Scope & Boundaries

### When to use this skill

- The developer wants to integrate Cashfree Payment Gateway using **direct HTTP/REST API calls** from their backend — no Cashfree frontend SDK, no Cashfree Checkout JS, no Drop-in UI.
- The developer is working in a language without an official Cashfree SDK (Ruby, Rust, Elixir, etc.), or explicitly prefers raw HTTP calls (cURL, Postman, `fetch`, `axios`, `http.client`, etc.).
- The integration is **server-to-server (S2S)**: the merchant's backend orchestrates the entire payment lifecycle.

### When NOT to use this skill

- If the developer wants to use **Cashfree Checkout JS**, **Drop-in**, or **Components** — use the Checkout integration skill instead.
- If the developer is using an **official Cashfree SDK** (Node.js, Python, Java, Go, PHP, .NET) — use the Backend SDK skill instead.
- If the question is about **Payouts**, **Subscriptions/Recurring**, **Token Vault standalone**, **Verification Suite**, or **Secure ID** — those are separate products.

---

## 2. Structural Overview

### Core Objects

| Object | Description |
|---|---|
| **Order** | Top-level entity. Has `order_id`, `order_amount`, `order_currency`, `customer_details`. Created via `POST /orders`. Returns `payment_session_id`. |
| **Payment Session** | Short-lived token (`payment_session_id`) required to initiate payment via the Order Pay API. |
| **Payment** | A payment attempt against an order. Identified by `cf_payment_id`. An order can have multiple attempts. |
| **Refund** | A reversal of a successful payment. Identified by `refund_id`. |
| **Webhook** | Asynchronous server-to-server notification from Cashfree when a payment event occurs. |

### API Environments

| Environment | Base URL |
|---|---|
| Sandbox | `https://sandbox.cashfree.com/pg` |
| Production | `https://api.cashfree.com/pg` |

### Authentication

Every API call (except Order Pay) requires these headers:

```
x-client-id: <Your App ID>
x-client-secret: <Your Secret Key>
x-api-version: 2025-01-01
Content-Type: application/json
```

Credentials from [Merchant Dashboard](https://merchant.cashfree.com/auth/login/pg/developers/api-keys?env=prod). The **Order Pay API** (`POST /orders/sessions`) does NOT require `x-client-id`/`x-client-secret` — it authenticates via `payment_session_id`.

### Primary API Endpoints

| Step | Endpoint | Purpose |
|---|---|---|
| Create Order | `POST /orders` | Create a payment order, get `payment_session_id` |
| Pay Order | `POST /orders/sessions` | Submit payment details for a specific method |
| Authenticate (OTP) | `POST /orders/pay/authenticate/{cf_payment_id}` | Submit or resend OTP (Native OTP flow) |
| Get Order | `GET /orders/{order_id}` | Check order status |
| Get Payments | `GET /orders/{order_id}/payments` | List all payment attempts for an order |
| Get Payment by ID | `GET /orders/{order_id}/payments/{cf_payment_id}` | Get a specific payment attempt |
| Create Refund | `POST /orders/{order_id}/refunds` | Initiate a refund |
| Get Refund | `GET /orders/{order_id}/refunds/{refund_id}` | Check refund status |
| Authorize/Capture | `POST /orders/{order_id}/authorization` | Capture or void a pre-authorized payment |

> For rate limits per endpoint, see `references/REFERENCE.md` Section 1.

---

## 3. Core Workflow: Create Order → Pay → Verify

This is the standard integration flow for most payment methods (Card, Netbanking, Wallet, EMI, Paylater).

**Prerequisites:**
- S2S flag enabled on your Cashfree account.
- API credentials from Merchant Dashboard.
- A webhook endpoint configured in Dashboard > Developers > Webhooks.
- Domain whitelisted in Merchant Dashboard.

### Step 1: Create Order

```
POST /orders
Headers: x-client-id, x-client-secret, x-api-version: 2025-01-01, Content-Type: application/json
```

```json
{
    "order_id": "unique_order_id",
    "order_amount": 100.00,
    "order_currency": "INR",
    "customer_details": {
        "customer_id": "customer_123",
        "customer_phone": "9999999999",
        "customer_email": "customer@example.com",
        "customer_name": "John Doe"
    },
    "order_meta": {
        "return_url": "https://yoursite.com/return",
        "notify_url": "https://yoursite.com/webhook",
        "payment_methods": "cc,dc,upi,nb"
    },
    "order_expiry_time": "2025-07-02T10:20:12+05:30",
    "order_note": "Optional order note"
}
```

**Required:** `order_amount`, `order_currency`, `customer_details.customer_id`, `customer_details.customer_phone`

**On `return_url`:** Cashfree appends `?order_id=ORDER_ID` to whatever URL you supply — keep it a static path (`https://yoursite.com/return`) and read `order_id` from the query string on your handler. If you need Cashfree's server-side `{order_id}` substitution token, leave it as a literal string (`"https://yoursite.com/return/{order_id}"`) — **but** if you're building the URL inside a Python f-string, escape it as `{{order_id}}`, or (better) skip the token entirely. Localhost URLs and route placeholders that Flask/Express try to match against the literal string `{order_id}` are a common production-breaking bug.

**Response — extract and store `payment_session_id`:**

```json
{
    "cf_order_id": "2149460581",
    "order_id": "order_123",
    "order_status": "ACTIVE",
    "payment_session_id": "session_xxx..."
}
```

### Step 2: Call Order Pay API

```
POST /orders/sessions
Headers: x-api-version: 2025-01-01, Content-Type: application/json
```

```json
{
    "payment_session_id": "<from Step 1>",
    "payment_method": {
        "<method_key>": { }
    }
}
```

> For the `payment_method` object structure for Card, UPI, Netbanking, Wallet, EMI, Paylater, and Bank Transfer — see `references/REFERENCE.md` Section 2.

**Response — `PayOrderEntity`:**

```json
{
    "action": "link | post | custom | form",
    "cf_payment_id": "string",
    "data": {
        "url": "redirect URL or OTP/form submission URL",
        "payload": { },
        "content_type": "application/x-www-form-urlencoded",
        "method": "POST",
        "redirect_to_bank": "fallback bank redirect URL (Native OTP only)"
    }
}
```

**Decision rules for `action`:**

- **`"link"`** → Redirect the customer to `data.url`.
- **`"post"`** → Native OTP flow. Render OTP input UI, POST OTP to `data.url`. See `REFERENCE.md` Workflow B.
- **`"form"`** → `data.payload` is an **object of key/value pairs**. Build a form with those as fields and submit (using `data.method` / `data.content_type`) to `data.url`.
- **`"custom"`** → Poll `GET /orders/{order_id}/payments` every 3–5 seconds (UPI collect, bank transfer).

### Step 3: Verify Payment (MANDATORY)

**Always verify from your backend before fulfilling orders. Never rely solely on frontend callbacks.**

```
GET /orders/{order_id}
Headers: x-client-id, x-client-secret, x-api-version: 2025-01-01
```

| Status | Meaning |
|---|---|
| `PAID` | Payment completed — safe to fulfill |
| `ACTIVE` | Still awaiting payment |
| `EXPIRED` | Expired with no successful payment |

For payment-level status: `GET /orders/{order_id}/payments/{cf_payment_id}`

Payment status values: `SUCCESS`, `FAILED`, `PENDING`, `NOT_ATTEMPTED`, `USER_DROPPED`, `VOID`, `CANCELLED`

### Step 4: Process Webhooks

Cashfree sends async notifications to your `notify_url`.

**Webhook events:** `PAYMENT_SUCCESS_WEBHOOK`, `PAYMENT_FAILED_WEBHOOK`, `PAYMENT_USER_DROPPED_WEBHOOK`, `REFUND_STATUS_WEBHOOK`, and the settlement events `SETTLEMENT_INITIATED`, `SETTLEMENT_SUCCESS`, `SETTLEMENT_FAILED`, `SETTLEMENT_REVERSED`

**Signature verification (REQUIRED — never skip):**

1. Extract `x-webhook-timestamp` from headers.
2. Concatenate: `timestamp + rawBody` (raw body, NOT parsed JSON).
3. Generate HMAC-SHA256 using your `x-client-secret`.
4. Base64-encode. Compare with `x-webhook-signature` header.

```javascript
// Node.js
const crypto = require("crypto");
function verifyWebhookSignature(timestamp, rawBody, signature, secretKey) {
    const computed = crypto.createHmac("sha256", secretKey).update(timestamp + rawBody).digest("base64");
    return computed === signature;
}
```

```python
# Python
import base64, hashlib, hmac
def verify_webhook_signature(timestamp, raw_body, signature, secret_key):
    message = (timestamp + raw_body).encode('utf-8')
    computed = base64.b64encode(hmac.new(secret_key.encode('utf-8'), message, digestmod=hashlib.sha256).digest()).decode('utf-8')
    return computed == signature
```

```go
// Go
func VerifySignature(signature, timestamp, rawBody, secretKey string) bool {
    h := hmac.New(sha256.New, []byte(secretKey))
    h.Write([]byte(timestamp + rawBody))
    return base64.StdEncoding.EncodeToString(h.Sum(nil)) == signature
}
```

**Requirements:** Return HTTP 200. Implement idempotency. Process async for long-running work.

---

## 4. Security Constraints — Never Violate

- **Never expose `x-client-secret` in frontend/client-side code.**
- **Never fulfill an order based solely on frontend callbacks or return_url parameters.** Always verify via `GET /orders/{order_id}`.
- **Never process a webhook without verifying its signature.**
- **Always use the raw request body for webhook verification**, not parsed JSON.

---

## 5. Testing

- Sandbox: `https://sandbox.cashfree.com/pg`
- Test card: `4111111111111111` (Visa)
- Test UPI VPA: `testsuccess@gocash`
- Verify webhook delivery in Dashboard > Developers > Webhooks.

---

## 6. Useful Links

- [API Reference — Order Pay](https://www.cashfree.com/docs/api-reference/payments/latest/payments/pay)
- [Cashfree Dev Studio](https://www.cashfree.com/devstudio)
- [GitHub SDKs](https://github.com/cashfree/)
- [Webhook Signature Verification](https://www.cashfree.com/docs/payments/online/webhooks/signature-verification)
