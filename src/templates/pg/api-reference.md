---
name: Cashfree Payment Gateway - S2S REST API Reference
description: >
  Reference material for the S2S REST API skill. Read this when you need:
  payment method objects (Card, UPI, Netbanking, Wallet, EMI, Paylater, Bank Transfer),
  advanced workflows (Native OTP, UPI Collect, Refunds, Pre-Authorization),
  rate limits, error codes, or common integration pitfalls.
  Always read apis/SKILL.md first for the core flow.
---

# Cashfree Payment Gateway — S2S REST API Reference

> This document is in `references/` — file name `REFERENCE.md`. Read `../SKILL.md` first for the core integration flow.

---

## 1. Rate Limits

### Production

| API | Limit/min | Type |
|---|---|---|
| Create Order | 200 | Account |
| Get Order | 400 | Account |
| Pay Order | 100 | IP |
| Get Payments | 100 | Account |
| Get Payment by ID | 130 | Account |
| Get Settlements | 30 | Account |
| Initiate Refund | 100 | Account |
| Get Refund | 30 | Account |

### Sandbox

| API | Limit/min | Type |
|---|---|---|
| Create Order | 30 | Account |
| Get Order | 60 | Account |
| Pay Order | 30 | IP |
| Get Payments | 30 | Account |
| Get Settlements | 20 | Account |
| Initiate Refund | 30 | Account |
| Get Refund | 60 | Account |

**Rate Limit Response Headers:**

| Header | Description |
|---|---|
| `x-ratelimit-limit` | Max calls per minute |
| `x-ratelimit-remaining` | Remaining calls in the current minute |
| `x-ratelimit-retry` | Seconds to wait when rate limited |
| `x-ratelimit-type` | `app_id` or `ip` |

Rate limits can be increased via Merchant Dashboard > Payment Gateway > Developers > Rate Limits.

---

## 2. Payment Method Reference

The `payment_method` object for `POST /orders/sessions`. All examples include only the `payment_method` field.

### Card (Plain — requires PCI DSS)

```json
"payment_method": {
    "card": {
        "channel": "link",
        "card_number": "4111111111111111",
        "card_holder_name": "John Doe",
        "card_expiry_mm": "06",
        "card_expiry_yy": "25",
        "card_cvv": "900"
    }
}
```

| Field | Required | Notes |
|---|---|---|
| `channel` | Yes | `"link"` for redirect, `"post"` for Native OTP |
| `card_number` | Yes* | Full card number |
| `card_holder_name` | No | Name on card |
| `card_expiry_mm` | Yes* | 2-digit month |
| `card_expiry_yy` | Yes* | 2-digit year |
| `card_cvv` | Yes* | Min 3 chars; optional for saved card |
| `instrument_id` | No | Saved card Token Vault ID — use instead of card details |
| `emi_tenure` | No | Required for EMI payments |
| `card_bank_name` | No | Required for EMI: `hdfc`, `icici`, `kotak`, `rbl`, `bob`, `axis`, `standard chartered`, `au`, `yes`, `sbi`, `fed`, `hsbc`, `citi`, `amex`, `onecard`, `idfc` |

*Required for plain card; not needed when using `instrument_id`.

### Card (Saved — Token Vault)

```json
"payment_method": {
    "card": { "channel": "link", "instrument_id": "54deabb4-ba45-4a60-9e6a-9c016fe7ab10" }
}
```

### Card (International — Address Required)

```json
"payment_method": {
    "card": {
        "channel": "link",
        "card_number": "4111111111111111",
        "card_holder_name": "John Doe",
        "card_expiry_mm": "06",
        "card_expiry_yy": "25",
        "card_cvv": "900",
        "address_line_one": "123 Main St",
        "city": "Minnehaha",
        "zip_code": "57109",
        "country": "United States",
        "country_code": "US",
        "state": "South Dakota",
        "state_code": "SD"
    }
}
```

### UPI

| Channel | Use Case | Required Fields |
|---|---|---|
| `"collect"` | Send collect request to customer's UPI app | `upi_id` (VPA) |
| `"link"` | Generate UPI intent deep link (mobile) | None beyond `channel` |
| `"qrcode"` | Generate UPI QR code | None beyond `channel` |

```json
// UPI Collect
"payment_method": { "upi": { "channel": "collect", "upi_id": "customer@upi", "upi_expiry_minutes": 10 } }

// UPI Intent
"payment_method": { "upi": { "channel": "link" } }

// UPI QR Code
"payment_method": { "upi": { "channel": "qrcode" } }
```

| Field | Required | Notes |
|---|---|---|
| `channel` | Yes | `"collect"`, `"link"`, `"qrcode"` |
| `upi_id` | Yes (collect only) | Customer's UPI VPA |
| `upi_expiry_minutes` | No | Min: 5, Max: 15, Default: 5 |
| `authorize_only` | No | For one-time UPI mandate. Only with `collect` channel |

### Netbanking

```json
"payment_method": {
    "netbanking": { "channel": "link", "netbanking_bank_code": 3021 }
}
```

- `channel` is always `"link"`.
- Use `netbanking_bank_code` (4-digit int) **or** `netbanking_bank_name` (5-char string, e.g., `"TESTR"`). One required.
- Response has `action: "link"` → redirect to `data.url`.

### Wallet / App

```json
"payment_method": {
    "app": { "provider": "phonepe", "channel": "link", "phone": "8474090589" }
}
```

| Field | Required | Notes |
|---|---|---|
| `channel` | Yes | Typically `"link"` |
| `provider` | Yes | `gpay`, `phonepe`, `ola`, `paytm`, `amazon`, `airtel`, `freecharge`, `mobikwik`, `jio` |
| `phone` | Yes | Customer phone number |

### Card EMI

```json
"payment_method": {
    "emi": {
        "channel": "link",
        "card_number": "4748461111111111",
        "card_expiry_mm": "12",
        "card_expiry_yy": "24",
        "card_cvv": "123",
        "card_bank_name": "ICICI",
        "emi_tenure": 3
    }
}
```

All fields required. Supported banks: `hdfc`, `kotak`, `icici`, `rbl`, `bob`, `standard chartered`, `axis`, `au`, `yes`, `sbi`, `fed`, `hsbc`, `citi`, `amex`.

### Cardless EMI

```json
"payment_method": {
    "cardless_emi": { "channel": "link", "provider": "kotak", "phone": "7768913241", "emi_tenure": 3 }
}
```

| Field | Required | Notes |
|---|---|---|
| `channel` | Yes | Always `"link"` |
| `provider` | Yes | `flexmoney`, `zestmoney`, `hdfc`, `icici`, `cashe`, `idfc`, `kotak`, `snapmint`, `bharatx` |
| `phone` | Yes | Customer phone number |
| `emi_tenure` | Conditional | Required for `hdfc`, `icici`, `cashe`, `idfc`, `kotak` |

### Paylater

```json
"payment_method": {
    "paylater": { "channel": "link", "provider": "lazypay", "phone": "7789112345" }
}
```

`provider` options: `kotak`, `flexipay`, `zestmoney`, `lazypay`, `olapostpaid`, `simpl`, `freechargepaylater`

### Bank Transfer

```json
"payment_method": {
    "banktransfer": { "channel": "link" }
}
```

Response returns virtual account details (`account_number`, `ifsc`, `virtual_vpa`). Display to customer. Poll for status.

---

## 3. Advanced Workflows

### Workflow B: Card Payment with Native OTP (Headless/Zero-Redirect)

Eliminates redirects by collecting OTP on your own UI.

**Prerequisites:** Native OTP enabled for account, PCI DSS compliance flag enabled.

1. **Create Order** — same as SKILL.md Step 1.

2. **Call Order Pay API with `channel: "post"`:**

```json
{
    "payment_session_id": "session_xxx",
    "payment_method": {
        "card": { "channel": "post", "card_number": "4111111111111111", "card_expiry_mm": "03", "card_expiry_yy": "25", "card_cvv": "326", "card_holder_name": "John Doe" }
    }
}
```

> Set a **10-second max timeout** — response time depends on bank ACS load.

3. **Handle response:**
   - `action: "post"` + `channel: "post"` → Native OTP supported. Render OTP UI. Submit to `data.url`. Provide `data.redirect_to_bank` fallback.
   - `action: "link"` + `channel: "post"` → Native OTP NOT supported. Redirect to `data.url`.

4. **Submit OTP:**

```
POST /orders/pay/authenticate/{cf_payment_id}
Headers: x-api-version: 2025-01-01, Content-Type: application/json
```

```json
{ "action": "SUBMIT_OTP", "otp": "123456" }
// To resend:
{ "action": "RESEND_OTP" }
```

OTP rules: Resend allowed twice, enabled after 30 seconds each. 5-minute session timeout. Always show `redirect_to_bank` fallback.

5. **Verify payment** — same as SKILL.md Step 3.

---

### Workflow C: UPI Collect Payment (Async/Polling)

1. **Create Order** — same as SKILL.md Step 1.

2. **Call Order Pay:**
```json
{
    "payment_session_id": "session_xxx",
    "payment_method": { "upi": { "channel": "collect", "upi_id": "customer@upi", "upi_expiry_minutes": 10 } }
}
```

3. **Response has `action: "custom"`** → poll for status.

4. **Poll every 3–5 seconds:**
```
GET /orders/{order_id}/payments
```
Continue until terminal status: `SUCCESS`, `FAILED`, or `USER_DROPPED`.

5. **Verify final status** — same as SKILL.md Step 3.

---

### Workflow D: Refund a Payment

```
POST /orders/{order_id}/refunds
Headers: x-client-id, x-client-secret, x-api-version: 2025-01-01, Content-Type: application/json
```

```json
{ "refund_amount": 50.00, "refund_id": "refund_001", "refund_note": "Customer requested refund" }
```

Check status: `GET /orders/{order_id}/refunds/{refund_id}`

Listen for `REFUND_STATUS_WEBHOOK` for async updates.

---

### Workflow E: Pre-Authorization (Hold & Capture)

**Prerequisite:** Pre-auth enabled for account.

1. Create Order and Pay (Workflow A). Payment is authorized (held).

2. **Capture:**
```
POST /orders/{order_id}/authorization
```
```json
{ "action": "CAPTURE", "amount": 100.00 }
```

3. **Or void:**
```json
{ "action": "VOID" }
```

Authorization status values: `SUCCESS`, `PENDING`

---

## 4. API Idempotency — `x-idempotency-key`

**What it is:** An optional request header you send on any **write** API call (Create Order, Create Refund, Authorization, Terminate Order, etc.) that lets you safely retry the call after a network timeout without creating duplicates.

**Why you need it:** Every production retry (HTTP 5xx, DNS failure, socket timeout) risks creating a second order/refund/capture for the same user action. Without an idempotency key, the safe retry window is small and error-prone.

### How Cashfree handles the header

| Scenario | Cashfree behaviour |
|---|---|
| First request with key `k` | Processes normally. Response includes `x-idempotency-key: k`. |
| Retry with the **same key and same body** within 24h | Returns the **original response** verbatim. Response includes `x-idempotency-replayed: true`. No side effects run twice. |
| Retry with the **same key but different body** | Returns `422` with `type: "idempotency_error"`. Either reuse the original body or mint a fresh key. |
| Retry after 24h | Treated as a fresh request — no replay. |

Keys are scoped per endpoint + per credential set (sandbox vs production are separate namespaces).

### Key format recommendations

- Opaque UUIDv4 or ULID — 32–64 chars, URL-safe characters only.
- **Derive deterministically from the business operation**, not randomly per attempt. Example: `order:<order_id>:v1` or `refund:<refund_id>:v1`. If your retry logic uses the same key, Cashfree deduplicates even across process restarts.
- If you use a random UUID generated at request time, store it in durable state (DB / KV store) before issuing the HTTP call so that retries can reuse it.

### Example — safe retry for Create Order

```javascript
// Node.js
const idempotencyKey = `order:${orderId}:v1`;      // deterministic from business key

async function createOrderWithRetry(payload) {
    for (let attempt = 1; attempt <= 3; attempt++) {
        try {
            const res = await fetch("https://api.cashfree.com/pg/orders", {
                method: "POST",
                headers: {
                    "x-client-id": APP_ID,
                    "x-client-secret": SECRET_KEY,
                    "x-api-version": "2025-01-01",
                    "x-idempotency-key": idempotencyKey,
                    "Content-Type": "application/json",
                },
                body: JSON.stringify(payload),
            });
            if (res.ok || (res.status >= 400 && res.status < 500)) return res;
            // 5xx — backoff and retry with the same key
            await sleep(500 * 2 ** attempt);
        } catch (_networkErr) {
            await sleep(500 * 2 ** attempt);
        }
    }
    throw new Error("create order failed after retries");
}
```

### Which endpoints support it

The header is accepted on **all** write endpoints in the PG API. The most important places to use it:

| Endpoint | Why it matters |
|---|---|
| `POST /pg/orders` | Without it, a retry on network timeout can create a duplicate order + extra `payment_session_id` |
| `POST /pg/orders/sessions` (Order Pay S2S) | Retry can double-debit the customer |
| `POST /pg/orders/{order_id}/refunds` | `refund_id` already dedupes; the header is an extra safety net — and doesn't cost anything |
| `POST /pg/orders/{order_id}/authorization` | Duplicate `CAPTURE` requests without the header can cause `409` |
| `POST /pg/disputes/{dispute_id}/contest` | Duplicate evidence submission rejected; idempotency prevents retries from logging extra events |
| `PATCH /pg/orders/{order_id}` (Terminate) | Rare, but retrying a terminate is safer with the header |

### Distinction from the webhook `x-idempotency-key`

Note the overlap in naming:

| Header | Direction | Meaning |
|---|---|---|
| `x-idempotency-key` **on your request** | Client → Cashfree | Safe-retry tag for your write call |
| `x-idempotency-key` **on a webhook** | Cashfree → you | Dedupe tag for webhook deliveries |

They are unrelated beyond the shared name. Both are cheap — use both.

### Common mistakes

| Mistake | Consequence | Fix |
|---|---|---|
| Using a random UUID per retry attempt | Cashfree treats each as a new request; duplicates | Derive key from the business operation and persist before the first call |
| Reusing a key with a different body | `422 idempotency_error` | Either mint a new key or send the original body |
| Relying only on `x-idempotency-key` with no network-level retry cap | Infinite retries can still cause issues on Cashfree side | Cap retries (3 attempts with backoff is standard) |
| Mixing sandbox and production keys in the same namespace | Test requests don't replay in prod | Scope keys by environment in your storage |

---

## 5. Error Codes & Common Mistakes

### Error response format

```json
{
    "message": "descriptive error message",
    "code": "error_code",
    "type": "invalid_request_error | authentication_error | api_error"
}
```

### Common error codes

| Code | HTTP | Meaning |
|---|---|---|
| `channel_missing` | 400 | `channel` field is required |
| `phone_invalid` | 400 | Phone must be valid 10-digit Indian number |
| `card_number_invalid` | 400 | Invalid card number |
| `card_cvv_missing` | 400 | CVV required for plain card |
| `card_bank_name_missing` | 400 | Bank name required for EMI |
| `emi_tenure_missing` | 400 | EMI tenure required |
| `netbanking_bank_code_invalid` | 400 | Invalid bank code |
| `payment_method_invalid` | 400 | Unrecognized payment method |
| `order_amount_invalid` | 400 | Amount below minimum (`1.00`) or above your MID's configured per-transaction limit (no fixed `1,000,000` cap) |
| `orderpay_not_found` | 404 | Order is no longer active |
| `request_failed` | 400 | Payment mode not configured for account |
| `request_invalid` | 400 | Indian cards cannot be used for non-INR transactions |
| `bank_processing_failure` | 502 | Transaction failed at banking partner |
| `version_missing` | 400 | API version header missing or invalid |

### Payment-failure `error_details` (declined/failed payments)

When a **payment** fails (as opposed to a request being rejected), the order/payment object and the webhook carry an `error_details` object. **Branch on the codes/enums below — never on `error_description`, which is human-facing text that gets reworded across API & SDK versions** (see `common-mistakes/SKILL.md` §C4).

```json
"error_details": {
  "error_code": "issuer_declined",
  "error_description": "The card issuer declined the transaction",
  "error_reason": "bank_declined",
  "error_source": "bank"
}
```

| Field | Branch on it? | What it carries |
|---|---|---|
| `error_code` | ✅ Precise machine code | e.g. `issuer_declined`, `instrument_id_expired`, `cryptogram_expired`, `tokenization_service_unavailable`, `bank_processing_failure` |
| `error_reason` | ✅ Category bucket | e.g. `bank_declined`, `insufficient_funds`, `invalid_card`, `auth_failed`, `transaction_timeout` |
| `error_source` | ✅ Origin (decides retryability) | `bank` · `cashfree` · `user` · `gateway` |
| `error_description` | ❌ Display/log only | Free text — **do not** string-match or branch on it |

**How to use it:**
- `error_source === "user"` (e.g. wrong OTP, cancelled) → safe to let the user retry.
- `error_reason === "insufficient_funds"` → prompt a smaller amount / different instrument.
- `error_code === "instrument_id_expired"` → token rotated, re-collect the card.
- `error_source === "bank"` / `"gateway"` with a generic reason → transient; offer retry or an alternate method.

The full, authoritative decline-code list is large and maintained by Cashfree — **do not hardcode an exhaustive list from memory**; treat the codes above as the stable shape and look up specifics at the official reference: https://www.cashfree.com/docs/api-reference/payments/errors

### Common mistakes

| Mistake | Consequence | Fix |
|---|---|---|
| Sending `x-client-id`/`x-client-secret` to Order Pay API | Ignored; unnecessary | Only send `x-api-version` + `Content-Type` to `POST /orders/sessions` |
| Not storing `payment_session_id` after Create Order | Cannot proceed to Order Pay | Always persist `payment_session_id` |
| Using parsed JSON body for webhook verification | Signature mismatch | Use raw request body string exactly as received |
| Not handling all `action` types | Payment flow breaks | Implement handlers for `link`, `post`, `custom`, `form` |
| Setting UPI expiry outside 5–15 minutes | API error | Keep `upi_expiry_minutes` between 5 and 15 |
| Plain card payments without PCI DSS flag | API rejects request | Request PCI DSS enablement via Support Form |
| Indian cards used for non-INR transactions | Rejected with `request_invalid` | Indian cards are INR only |
| No 10-second timeout for Native OTP | Request hangs | Set 10-second HTTP client timeout |
| Polling too fast for UPI collect | Rate limit hit | Poll every 3–5 seconds |
| No `redirect_to_bank` fallback for Native OTP | User stuck if OTP fails | Always show `data.redirect_to_bank` fallback |
