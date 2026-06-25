---
name: Cashfree Payment Links — Reference
description: >
  Deep reference for Cashfree Payment Links. Full request/response schema, every optional field
  (link_meta, link_notify, link_notes, order_splits, enable_invoice, upi_intent, payment_methods),
  per-language SDK code (Node.js, Python, Java, Go, PHP, raw REST), PAYMENT_LINK_EVENT webhook
  payload, idempotency via x-idempotency-key, rate limits, and troubleshooting for partial
  payments, reminders, and QR handling. Read after the Payment Links SKILL.md.
---

# Cashfree Payment Links — Reference

> Read `../SKILL.md` first for the lifecycle, status values, and webhook pattern. This file is the schema + code source of truth.

---

## 1. Endpoint Map

| Method | Path | Purpose | SDK method |
|---|---|---|---|
| POST | `/pg/links` | Create a new link | `PGCreateLink` |
| GET  | `/pg/links/{link_id}` | Fetch link state | `PGFetchLink` |
| POST | `/pg/links/{link_id}/cancel` | Cancel an active link | `PGCancelLink` |
| GET  | `/pg/links/{link_id}/orders` | List underlying PG orders | `PGLinkFetchOrders` |

Rate limits are shared with the general PG endpoint bucket — ~30–60/min per account for reads, ~100/min for writes. Respect `x-ratelimit-retry` on `429`.

---

## 2. Create Link — Full Schema

```
POST /pg/links
```

```jsonc
{
    "link_id": "invoice_4402_2026",                     // optional; 50 chars, [a-zA-Z0-9_-]
    "link_amount": 5000.00,                              // required; rupees, decimal
    "link_currency": "INR",                              // required; default INR
    "link_purpose": "Invoice 4402 - consulting retainer",// required; max 500 chars
    "customer_details": {                                // required
        "customer_phone":  "9999999999",                 // required; 10-digit IN
        "customer_email":  "client@acme.com",            // optional
        "customer_name":   "Acme Corp",                  // optional
        "customer_bank_account_number": "",              // optional; for bank-transfer prefill
        "customer_bank_ifsc": "",                        // optional
        "customer_bank_code": null                       // optional; enum of IFSC codes
    },
    "link_partial_payments": true,                       // optional; default false
    "link_minimum_partial_amount": 1000.00,              // optional; < link_amount
    "link_expiry_time": "2026-04-30T23:59:59+05:30",    // optional; default 30 days
    "link_auto_reminders": true,                         // optional; default false
    "link_notify": {                                     // optional
        "send_sms":   true,                              // production only
        "send_email": true
    },
    "link_meta": {                                       // optional
        "return_url":       "https://app.ex.com/thanks/{link_id}",  // max 250 chars
        "notify_url":       "https://app.ex.com/webhook",            // HTTPS required
        "upi_intent":       "true",                                  // string "true"/"false"
        "payment_methods":  "cc,dc,upi,nb"                           // comma-list: cc,dc,ccc,ppc,nb,upi,paypal,app
    },
    "link_notes": {                                      // optional; max 5 key/value pairs
        "invoice_id": "4402",
        "project":    "retainer"
    },
    "order_splits": [                                    // optional; Easy-Split accounts only
        { "vendor_id": "vendor_01", "amount": 4500.00 }
    ],
    "enable_invoice": false                              // optional; invoice generation toggle
}
```

### Field notes

- **`link_id`** — if omitted, Cashfree generates one. Prefer merchant-generated for idempotency and easy cross-referencing with your invoice system. Use pattern `invoice_{invoice_id}_{version}`.
- **`link_amount`** — rupees with up to 2 decimal places. Max typically 1,000,000. Reject zero/negative at your own layer.
- **`link_partial_payments` + `link_minimum_partial_amount`** — if partials are enabled and no minimum is set, Cashfree defaults to ₹1. Set a sensible minimum (e.g. 10% of `link_amount`) to avoid spam payments.
- **`link_expiry_time`** — ISO-8601 with timezone. Cashfree defaults to 30 days if you omit this. Past times rejected with 400.
- **`link_notify.send_sms`** — SMS only fires in **production**. Sandbox will emit the webhook / mark the link `PAID` but no SMS is delivered.
- **`link_meta.upi_intent`** — string `"true"` opens a UPI intent on mobile browsers as the default tab; `"false"` shows the full payment-method selector.
- **`link_meta.payment_methods`** — comma-separated short codes: `cc` (credit card), `dc` (debit card), `ccc` (credit card EMI), `ppc` (paylater), `nb` (netbanking), `upi`, `paypal`, `app` (wallet).

---

## 3. Response Schema (LinkEntity)

```jsonc
{
    "cf_link_id": 55566677,
    "link_id": "invoice_4402_2026",
    "link_url": "https://payments.cashfree.com/links/abcXYZ123",
    "link_qrcode": "iVBORw0KGgoAAAANS...",       // base64-encoded PNG
    "link_status": "ACTIVE",                     // ACTIVE | PAID | PARTIALLY_PAID | EXPIRED | CANCELLED
    "link_currency": "INR",
    "link_amount": 5000.00,
    "link_amount_paid": 0.00,
    "link_partial_payments": true,
    "link_minimum_partial_amount": 1000.00,
    "link_purpose": "Invoice 4402 ...",
    "link_expiry_time": "2026-04-30T23:59:59+05:30",
    "link_created_at": "2026-04-19T10:00:00+05:30",
    "link_auto_reminders": true,
    "customer_details": { ... },
    "link_meta": { ... },
    "link_notify": { "send_sms": true, "send_email": true },
    "link_notes": { "invoice_id": "4402", "project": "retainer" },
    "order_splits": []
}
```

To render the QR in a browser:

```html
<img src="data:image/png;base64,{{link_qrcode}}" alt="Scan to pay" />
```

---

## 4. PAYMENT_LINK_EVENT Webhook

Fires on every `link_status` transition. Envelope same as all Cashfree webhooks (signature = `Base64(HMAC-SHA256(x-webhook-timestamp + rawBody, CASHFREE_SECRET_KEY))`).

```json
{
    "data": {
        "cf_link_id": 55566677,
        "link_id": "invoice_4402_2026",
        "link_status": "PARTIALLY_PAID",
        "link_currency": "INR",
        "link_amount": "5000.00",
        "link_amount_paid": "1000.00",
        "link_partial_payments": true,
        "link_minimum_partial_amount": "1000.00",
        "link_purpose": "Invoice 4402 ...",
        "link_created_at": "2026-04-19T10:00:00+05:30",
        "link_expiry_time": "2026-04-30T23:59:59+05:30",
        "link_url": "https://payments.cashfree.com/links/abcXYZ123",
        "link_notes": { "invoice_id": "4402" },
        "link_auto_reminders": true,
        "customer_details": { "customer_phone": "9999999999", "customer_email": "client@acme.com", "customer_name": "Acme Corp" },
        "link_meta": { "notify_url": "https://app.example.com/webhook" },
        "link_notify": { "send_sms": true, "send_email": true },
        "order": {
            "order_id": "CFPay_U1mgll3c0e9g_ehdcjjbtckf",
            "order_amount": "1000.00",
            "order_expiry_time": "2026-04-20T08:34:50+05:30",
            "order_hash": "Gb2gC7z0tILhGbZUIeds",
            "transaction_id": 1021206,
            "transaction_status": "SUCCESS"
        }
    },
    "type": "PAYMENT_LINK_EVENT",
    "version": 1,
    "event_time": "2026-04-20T08:30:00+05:30"
}
```

> **Payload shape — read carefully.** The link fields are **flat under `data`**; there is **no `data.link` wrapper**. `data.order` is the order that triggered the event and is **`null` for `CANCELLED` / `EXPIRED`** transitions; it carries **`transaction_id` / `transaction_status`** (not `cf_payment_id` / `payment_status`). Amounts arrive as **strings** in this webhook — compare numerically, don't `===` against a number. The envelope carries `type`, `version`, and `event_time`.

Dedupe on `(cf_link_id, link_status, link_amount_paid)` — at-least-once delivery means each transition may arrive multiple times. For v2025-01-01+ use the `x-idempotency-key` header if your storage layer supports it.

Each underlying payment also fires the standard `PAYMENT_SUCCESS_WEBHOOK` / `PAYMENT_FAILED_WEBHOOK` with the `order.order_id` shown above. If you listen to both, keyed dedupe is doubly important.

---

## 5. Per-Language SDK Usage

### Node.js

```javascript
import { Cashfree, CFEnvironment } from "cashfree-pg";
const cashfree = new Cashfree(CFEnvironment.SANDBOX, process.env.CASHFREE_APP_ID, process.env.CASHFREE_SECRET_KEY);

// Create
const created = await cashfree.PGCreateLink({
    link_id: `invoice_${invoiceId}_v1`,
    link_amount: 5000.0,
    link_currency: "INR",
    link_purpose: `Invoice ${invoiceId}`,
    customer_details: { customer_phone: customer.phone },
    link_expiry_time: expiry.toISOString(),
    link_auto_reminders: true,
    link_notify: { send_sms: true, send_email: true },
    link_meta: {
        return_url: `https://app.example.com/invoice/${invoiceId}/thanks`,
        notify_url: "https://app.example.com/webhook",
    },
});

// Fetch
const current = await cashfree.PGFetchLink(linkId);

// Cancel
await cashfree.PGCancelLink(linkId);

// Underlying orders — HEADER list only (no cf_payment_id). Default status is PAID;
// pass "ALL" to enumerate every order. Signature:
//   PGLinkFetchOrders(link_id, x_request_id?, x_idempotency_key?, status?)
const orders = await cashfree.PGLinkFetchOrders(linkId, undefined, undefined, "ALL");
// For payment id / instrument / charge details, re-fetch each order:
//   const payments = await cashfree.PGOrderFetchPayments(order.order_id);
```

### Python (v6+)

```python
from cashfree_pg.api_client import Cashfree
from cashfree_pg.models.create_link_request import CreateLinkRequest
from cashfree_pg.models.link_customer_details_entity import LinkCustomerDetailsEntity
from cashfree_pg.models.link_meta_entity import LinkMetaEntity

cashfree = Cashfree(
    XEnvironment=Cashfree.SANDBOX,
    XClientId=os.environ["CASHFREE_APP_ID"],
    XClientSecret=os.environ["CASHFREE_SECRET_KEY"],
)

req = CreateLinkRequest(
    link_id=f"invoice_{invoice_id}_v1",
    link_amount=5000.0,
    link_currency="INR",
    link_purpose=f"Invoice {invoice_id}",
    customer_details=LinkCustomerDetailsEntity(customer_phone=phone),
    link_auto_reminders=True,
    link_notify={"send_sms": True, "send_email": True},
    link_meta=LinkMetaEntity(
        return_url=f"https://app.example.com/invoice/{invoice_id}/thanks",
        notify_url="https://app.example.com/webhook",
    ),
)
created = cashfree.PGCreateLink(req, None, None)
fetched = cashfree.PGFetchLink(link_id, None, None)
cashfree.PGCancelLink(link_id, None, None)
```

### Java

```java
var req = new CreateLinkRequest()
    .linkId("invoice_" + invoiceId + "_v1")
    .linkAmount(5000.0)
    .linkCurrency("INR")
    .linkPurpose("Invoice " + invoiceId)
    .customerDetails(new LinkCustomerDetailsEntity().customerPhone(phone))
    .linkAutoReminders(true);

Cashfree cashfree = new Cashfree(Cashfree.SANDBOX, "<app_id>", "<secret_key>", null, null, null);
var created = cashfree.PGCreateLink(req, null, null, null);
var fetched = cashfree.PGFetchLink(linkId, null, null, null);
cashfree.PGCancelLink(linkId, null, null, null);
```

### Go (v6+)

```go
phone := customer.Phone
req := cashfreepg.CreateLinkRequest{
    LinkId:        stringPtr("invoice_" + invoiceId + "_v1"),
    LinkAmount:    5000.0,
    LinkCurrency:  "INR",
    LinkPurpose:   "Invoice " + invoiceId,
    CustomerDetails: cashfreepg.LinkCustomerDetailsEntity{CustomerPhone: phone},
}
created, _, err := cashfree.PGCreateLink(&req, nil, nil, nil)
fetched, _, err := cashfree.PGFetchLink(linkId, nil, nil, nil)
_, _, err = cashfree.PGCancelLink(linkId, nil, nil, nil)
```

### Raw REST (any language)

```bash
# Create
curl -X POST "https://api.cashfree.com/pg/links" \
    -H "x-client-id: $CASHFREE_APP_ID" \
    -H "x-client-secret: $CASHFREE_SECRET_KEY" \
    -H "x-api-version: 2025-01-01" \
    -H "Content-Type: application/json" \
    -H "x-idempotency-key: link:invoice_4402:v1" \
    -d '{
        "link_id": "invoice_4402_v1",
        "link_amount": 5000.00,
        "link_currency": "INR",
        "link_purpose": "Invoice 4402",
        "customer_details": { "customer_phone": "9999999999" }
    }'

# Fetch
curl "https://api.cashfree.com/pg/links/invoice_4402_v1" \
    -H "x-client-id: $CASHFREE_APP_ID" \
    -H "x-client-secret: $CASHFREE_SECRET_KEY" \
    -H "x-api-version: 2025-01-01"

# Cancel
curl -X POST "https://api.cashfree.com/pg/links/invoice_4402_v1/cancel" \
    -H "x-client-id: $CASHFREE_APP_ID" \
    -H "x-client-secret: $CASHFREE_SECRET_KEY" \
    -H "x-api-version: 2025-01-01"

# List underlying orders — default status=PAID; pass ?status=ALL for reconciliation.
# Returns order HEADERS (no cf_payment_id); re-fetch /pg/orders/{order_id}/payments for payment details.
curl "https://api.cashfree.com/pg/links/invoice_4402_v1/orders?status=ALL" \
    -H "x-client-id: $CASHFREE_APP_ID" \
    -H "x-client-secret: $CASHFREE_SECRET_KEY" \
    -H "x-api-version: 2025-01-01"
```

---

## 6. Error Codes

| HTTP | `code` | Meaning | Fix |
|---|---|---|---|
| 400 | `link_amount_invalid` | ≤ 0 or > 1,000,000 | Clamp / contact Cashfree for higher limits |
| 400 | `link_currency_invalid` | Unsupported currency | Use `INR` unless cross-border is enabled |
| 400 | `link_purpose_missing` | Required field omitted | Provide a short merchant-visible purpose |
| 400 | `customer_phone_missing` | `customer_details.customer_phone` omitted | Always provide |
| 400 | `link_minimum_partial_amount_invalid` | ≥ `link_amount` or < ₹1 | Set 10% of link_amount as a safe default |
| 409 | `link_already_exists` | `link_id` re-used | Fresh unique id or fetch the existing |
| 422 | `idempotency_error` | `x-idempotency-key` mismatch with existing | Use a fresh key or send original body |
| 404 | `link_not_found` | Wrong `link_id` | Check path; sandbox/prod are separate namespaces |
| 409 | `link_cannot_be_cancelled` | Already PAID/EXPIRED/CANCELLED | Cancellation only works in ACTIVE/PARTIALLY_PAID |
| 429 | — | Rate limit | Respect `x-ratelimit-retry` |

---

## 7. Refunding a Link Payment

The link itself isn't a refundable object — refund the underlying order:

1. `GET /pg/links/{link_id}/orders?status=ALL` → find the `order_id`(s) with `order_status: "PAID"`. (This list has **no `cf_payment_id`** — if you need the payment id, re-fetch with `GET /pg/orders/{order_id}/payments`.)
2. `POST /pg/orders/{order_id}/refunds` with your merchant-generated `refund_id`.
3. Listen for `REFUND_STATUS_WEBHOOK` per `pg/refunds/SKILL.md`.

For partial-payment links, each installment is a separate refundable order.

---

## 8. Idempotency Notes

- `link_id` is a natural idempotency key — Cashfree returns `409 link_already_exists` on collision, which is safer than silently duplicating.
- Use `x-idempotency-key` on create for the network-timeout case. Derive deterministically: `link:invoice_{invoice_id}:v1`.
- See `pg/apis/references/REFERENCE.md` §4 for full `x-idempotency-key` semantics.

---

## 9. Troubleshooting

| Issue | Cause | Resolution |
|---|---|---|
| Customer says they paid but `link_status` is still `ACTIVE` | Payment still processing (UPI collect in-flight) | Poll `GET /pg/links/{link_id}` every 5s up to 2 min; fall back to webhook |
| Link expired before customer opened the SMS | Short expiry + SMS delay | Use ≥ 3-day expiry for SMS-distribution flows |
| SMS not arriving in sandbox | Disabled in sandbox | Test in production with tiny amount + disposable phone |
| QR code scans but browser shows 404 | Old link QR cached, link was cancelled | Regenerate; don't persist QR images long-term in your UI |
| `link_amount_paid` mismatches your DB after replay | Webhook deduped on `link_status` alone, not `link_amount_paid` | Dedupe on `(cf_link_id, link_status, link_amount_paid)` |
| `PAYMENT_LINK_EVENT` fires but not `PAYMENT_SUCCESS_WEBHOOK` | Merchant subscribed to link event only | Subscribe both; each serves different consumers (invoicing vs. fulfillment) |
| Auto-reminder fires after payment | Reminder scheduled before payment arrived (race) | Benign; Cashfree's reminder job double-checks at send time |

---

## 10. See Also

- `pg/refunds/SKILL.md` — refund a link payment via its underlying `order_id`.
- `pg/webhooks/SKILL.md` — signature verification for `PAYMENT_LINK_EVENT`.
- `pg/apis/references/REFERENCE.md` §4 — `x-idempotency-key` on create.
- `settlements-and-reconciliation/SKILL.md` — link payments appear in settlement recon like any other order.
- `common-mistakes/SKILL.md` — general webhook + signature gotchas.
