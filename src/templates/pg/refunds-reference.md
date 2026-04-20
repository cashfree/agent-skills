---
name: Cashfree Refunds — Reference
description: >
  Deep reference for Cashfree Payment Gateway refunds. Full request/response schema, INSTANT
  eligibility table, per-language SDK code (Node.js, Python, Java, Go, PHP, .NET, raw REST),
  refund_splits for Easy-Split merchants, ARN semantics, how refunds appear in settlement
  recon (DEBIT events), webhook payload reproduction, and a comprehensive troubleshooting
  table. Read after the Refunds SKILL.md.
---

# Cashfree Refunds — Reference

> Read `../SKILL.md` first for the refund lifecycle, status values, and webhook flow. This file is the schema + per-language code source of truth.

---

## 1. Endpoint Map

| Method | Path | SDK method | Rate limit (prod) |
|---|---|---|---|
| POST | `/pg/orders/{order_id}/refunds` | `PGOrderCreateRefund` | 100 / min (account) |
| GET  | `/pg/orders/{order_id}/refunds/{refund_id}` | `PGOrderFetchRefund` | 30 / min (account) |
| GET  | `/pg/orders/{order_id}/refunds` | `PGOrderFetchRefunds` | 30 / min (account) |

Sandbox limits: 30 / min create, 60 / min fetch.

Headers identical across all three: `x-client-id`, `x-client-secret`, `x-api-version: 2025-01-01`, `Content-Type: application/json`.

---

## 2. Create Refund — Full Request Schema

```
POST /pg/orders/{order_id}/refunds
```

```json
{
    "refund_id": "refund_order42_001",
    "refund_amount": 50.00,
    "refund_note": "Customer requested partial refund",
    "refund_speed": "STANDARD",
    "refund_splits": [
        { "vendor_id": "vendor_01", "amount": 40.00 },
        { "vendor_id": "vendor_02", "amount": 10.00 }
    ]
}
```

| Field | Type | Required | Notes |
|---|---|---|---|
| `refund_id` | string (40 max, `^[a-zA-Z0-9_-]+$`) | Yes | Unique per order. Used as Cashfree's idempotency key — reusing returns the existing refund |
| `refund_amount` | number | Yes | Rupees, decimal, max 2 dp. Must be ≤ (paid − sum_of_prior_refunds) |
| `refund_note` | string (100 max) | No | Shown in Dashboard and recon |
| `refund_speed` | enum | No | `STANDARD` (default) or `INSTANT` |
| `refund_splits` | array | No | Easy-Split only. `[{ vendor_id, amount }]` or `[{ vendor_id, percentage }]`. Omit to inherit the order's split |

### Refund idempotency

The server uses `refund_id` as a natural idempotency key. A re-POST with the same body returns **200** with the existing refund — no duplicate. A re-POST with the same `refund_id` but **different** body returns **400** `refund_id_already_exists`.

For safe retries on network timeouts:

```javascript
const refundId = `refund_${orderId}_${attempt}`;  // deterministic per attempt
try {
    return await cashfree.PGOrderCreateRefund(orderId, { refund_id: refundId, refund_amount: amount });
} catch (e) {
    if (e?.response?.status === 400 && e.response.data?.code === "refund_id_already_exists") {
        // Existing refund — fetch current state
        return await cashfree.PGOrderFetchRefund(orderId, refundId);
    }
    throw e;
}
```

You can also send the request with an `x-idempotency-key` header (opaque UUID) for an additional layer — see `pg/apis/references/REFERENCE.md` §5 (Idempotency).

---

## 3. Refund Response — Full Schema

| Field | Type | Notes |
|---|---|---|
| `cf_refund_id` | integer | Cashfree's internal id. Stable forever; use as a primary key alongside your `refund_id` |
| `refund_id` | string | What you sent |
| `order_id` | string | — |
| `cf_payment_id` | integer | The payment being refunded |
| `refund_amount` | number | — |
| `refund_currency` | string | `INR` |
| `refund_status` | enum | `PENDING` \| `SUCCESS` \| `CANCELLED` \| `ONHOLD` \| `FAILED` |
| `status_description` | string | Populated on non-`SUCCESS`; explains why |
| `refund_note` | string | — |
| `refund_arn` | string \| null | Acquirer's reference; populated at `SUCCESS` |
| `refund_type` | enum | `MERCHANT_INITIATED`, `CUSTOMER_INITIATED` (rare), `AUTO_INITIATED` |
| `created_at` | ISO-8601 | — |
| `processed_at` | ISO-8601 \| null | Set when terminal status reached |
| `requested_speed` | enum | What you asked for |
| `processed_speed` | enum | What actually ran — may differ if fell back |
| `service_charge` | number | Refund processing fee (INSTANT only, else 0) |
| `service_tax` | number | 18% GST on `service_charge` |
| `refund_splits` | array | `[{ merchantVendorId, amount, percentage }]` |
| `entity` | string | `"Refund"` |

---

## 4. INSTANT Refund Eligibility

Cashfree auto-detects eligibility and falls back to STANDARD if INSTANT is not available. No API call to check eligibility — you request INSTANT and read `processed_speed` in the webhook.

| Payment mode | INSTANT eligible? |
|---|---|
| UPI (all channels) | ✅ Yes (most VPAs) |
| Visa / Mastercard / RuPay debit | ✅ Usually |
| Visa / Mastercard credit | ⚠️ Issuer-dependent; many do not support |
| Amex | ❌ Standard only |
| Netbanking | ❌ Standard only |
| Wallet | ⚠️ Wallet-dependent |
| EMI (card) | ❌ Standard only |
| Cardless EMI / Paylater | ❌ Not eligible; typically refunded as loan cancellation by the lender |
| Bank Transfer | ❌ Not eligible |
| International card | ❌ Not eligible |

INSTANT fees are disclosed in the merchant rate card under "Instant Refund Fee" and are deducted at settlement time (visible in settlement recon as `service_charge` on the `REFUND` event row).

---

## 5. REFUND_STATUS_WEBHOOK Payload

Full sample (see `pg/webhooks/references/REFERENCE.md` for the canonical version):

```json
{
    "data": {
        "refund": {
            "cf_refund_id": 11325632,
            "cf_payment_id": 789727431,
            "refund_id": "refund_sampleorder0413",
            "order_id": "sampleorder0413",
            "refund_amount": 2.00,
            "refund_currency": "INR",
            "entity": "Refund",
            "refund_type": "MERCHANT_INITIATED",
            "refund_arn": "205907014017",
            "refund_status": "SUCCESS",
            "status_description": "Refund processed successfully",
            "created_at": "2026-04-18T12:54:25+05:30",
            "processed_at": "2026-04-18T13:04:27+05:30",
            "refund_note": "Test",
            "refund_splits": [
                { "merchantVendorId": "vendor_01", "amount": 1, "percentage": null }
            ],
            "requested_speed": "STANDARD",
            "processed_speed": "STANDARD",
            "service_charge": 0.00,
            "service_tax": 0.00
        }
    },
    "event_time": "2026-04-18T13:04:28+05:30",
    "type": "REFUND_STATUS_WEBHOOK"
}
```

Signature verification: `HMAC-SHA256(x-webhook-timestamp + rawBody, CASHFREE_SECRET_KEY)` → base64, compared to `x-webhook-signature`. Identical to every other Cashfree webhook.

Transitions to expect per refund:

| Flow | Webhook sequence |
|---|---|
| Happy path STANDARD | `PENDING` → `SUCCESS` |
| Happy path INSTANT | May skip `PENDING` — `SUCCESS` arrives within minutes |
| Ineligible instrument | `PENDING` with `processed_speed: "STANDARD"` → `SUCCESS` |
| Risk hold | `PENDING` → `ONHOLD` → `SUCCESS` (after review) \| `CANCELLED` |
| Bank rejection | `PENDING` → `FAILED` with `status_description` |
| Dual-webhook retry | `SUCCESS` (ingested) → `SUCCESS` (re-delivery; must dedupe) |

---

## 6. How Refunds Show Up in Settlement Recon

Refunds are a **DEBIT** from your settlement (money going back out to the customer). They appear in `POST /pg/settlement/recon` as events with:

- `event_details.event_type: "REFUND"`
- `event_details.sale_type: "DEBIT"`
- `event_details.event_amount` = the refund amount
- `event_details.event_service_charge` / `event_service_tax` = instant-refund fees where applicable
- `refund_details.refund_id`, `refund_details.refund_arn`, `refund_details.refund_processed_at` populated

A refund hits the settlement of the cycle when the refund **processed** (not when the original payment settled). Cross-cycle refunds typically appear as a negative `adjustment` on the current cycle.

If the original payment hadn't settled yet, refunding it usually reduces the gross of that cycle rather than appearing as a DEBIT — Cashfree nets the refund against the payment before settlement.

`REFUND_REVERSAL` events exist for rare cases where a refund was reversed (e.g., bank returned it). These appear as a CREDIT in the next cycle. See `settlements-and-reconciliation/references/REFERENCE.md` §2 for the full event_type enumeration.

---

## 7. Per-Language SDK Usage

All examples assume the SDK has been initialized per `pg/backend-sdks/SKILL.md` §3.

### Node.js

```javascript
import { Cashfree, CFEnvironment } from "cashfree-pg";
const cashfree = new Cashfree(CFEnvironment.SANDBOX, process.env.CASHFREE_APP_ID, process.env.CASHFREE_SECRET_KEY);

// Create
const created = await cashfree.PGOrderCreateRefund(orderId, {
    refund_id: `refund_${orderId}_${Date.now()}`,
    refund_amount: 50.0,
    refund_note: "Customer requested",
    refund_speed: "STANDARD",
});

// Fetch one
const current = await cashfree.PGOrderFetchRefund(orderId, refundId);

// List all on an order
const all = await cashfree.PGOrderFetchRefunds(orderId);
```

### Python

```python
from cashfree_pg.api_client import Cashfree
from cashfree_pg.models.create_refund_request import CreateRefundRequest

Cashfree.XClientId = os.environ["CASHFREE_APP_ID"]
Cashfree.XClientSecret = os.environ["CASHFREE_SECRET_KEY"]
Cashfree.XEnvironment = Cashfree.XSandbox

req = CreateRefundRequest(
    refund_id=f"refund_{order_id}_{int(time.time())}",
    refund_amount=50.0,
    refund_note="Customer requested",
    refund_speed="STANDARD",
)
created = Cashfree().PGOrderCreateRefund("2025-01-01", order_id, req)
current = Cashfree().PGOrderFetchRefund("2025-01-01", order_id, refund_id)
all_refunds = Cashfree().PGOrderFetchRefunds("2025-01-01", order_id)
```

### Java

```java
CreateRefundRequest req = new CreateRefundRequest()
    .refundId("refund_" + orderId + "_" + System.currentTimeMillis())
    .refundAmount(50.0)
    .refundNote("Customer requested")
    .refundSpeed("STANDARD");

var created = new Cashfree().PGOrderCreateRefund("2025-01-01", orderId, req, null, null, null);
var current = new Cashfree().PGOrderFetchRefund("2025-01-01", orderId, refundId, null, null, null);
var all     = new Cashfree().PGOrderFetchRefunds("2025-01-01", orderId, null, null, null);
```

### Go

```go
version := "2025-01-01"
note := "Customer requested"
speed := "STANDARD"
req := cashfree.CreateRefundRequest{
    RefundId:     fmt.Sprintf("refund_%s_%d", orderId, time.Now().Unix()),
    RefundAmount: 50.0,
    RefundNote:   &note,
    RefundSpeed:  &speed,
}
created, _, err := cashfree.PGOrderCreateRefund(&version, &orderId, &req, nil, nil, nil)
```

### PHP

```php
Cashfree::$XClientId      = $_ENV["CASHFREE_APP_ID"];
Cashfree::$XClientSecret  = $_ENV["CASHFREE_SECRET_KEY"];
Cashfree::$XEnvironment   = Cashfree::$XSandbox;

$req = new CreateRefundRequest();
$req->setRefundId("refund_{$orderId}_" . time());
$req->setRefundAmount(50.0);
$req->setRefundNote("Customer requested");
$req->setRefundSpeed("STANDARD");

$created = (new Cashfree())->PGOrderCreateRefund("2025-01-01", $orderId, $req);
```

### .NET

```csharp
// TLS 1.2 at startup — see pg/backend-sdks/references/REFERENCE.md
ServicePointManager.SecurityProtocol |= SecurityProtocolType.Tls12;

Cashfree.XClientId     = Environment.GetEnvironmentVariable("CASHFREE_APP_ID");
Cashfree.XClientSecret = Environment.GetEnvironmentVariable("CASHFREE_SECRET_KEY");
Cashfree.XEnvironment  = Cashfree.SANDBOX;

var req = new CreateRefundRequest(
    refundId:     $"refund_{orderId}_{DateTimeOffset.UtcNow.ToUnixTimeSeconds()}",
    refundAmount: 50.0,
    refundNote:   "Customer requested",
    refundSpeed:  "STANDARD");
var created = new Cashfree().PGOrderCreateRefund("2025-01-01", orderId, req);
```

### Raw REST (Ruby / any language)

```bash
curl -X POST "https://api.cashfree.com/pg/orders/$ORDER_ID/refunds" \
    -H "x-client-id: $CASHFREE_APP_ID" \
    -H "x-client-secret: $CASHFREE_SECRET_KEY" \
    -H "x-api-version: 2025-01-01" \
    -H "Content-Type: application/json" \
    -d '{
        "refund_id": "refund_001",
        "refund_amount": 50.00,
        "refund_note": "Customer requested",
        "refund_speed": "STANDARD"
    }'
```

---

## 8. Error Codes (Refund-specific)

| HTTP | `code` | Meaning | Fix |
|---|---|---|---|
| 400 | `refund_amount_invalid` | Amount ≤ 0, > 2 dp, or > remaining refundable | Validate client-side; fetch order first |
| 400 | `refund_id_already_exists` | `refund_id` re-used with a different body | Generate a fresh unique id, or re-GET the existing refund |
| 400 | `refund_note_invalid` | > 100 chars | Truncate / sanitize |
| 400 | `refund_speed_invalid` | Not `STANDARD` / `INSTANT` | Use one of the two |
| 404 | `order_not_found` | Wrong `order_id` | Check path |
| 404 | `refund_not_found` | Wrong `refund_id` on fetch | Confirm merchant-provided id, not `cf_refund_id` |
| 409 | `refund_not_allowed` | Order not `PAID`, > 6 months old, or already fully refunded | Check preconditions in SKILL.md §2 |
| 429 | — | Rate limit | Respect `x-ratelimit-retry` |
| 401 | `authentication_error` | Bad keys or wrong environment | See `getting-started/SKILL.md` |

---

## 9. Troubleshooting

### "Webhook fired with `refund_status: SUCCESS` but customer says they haven't received the money"

- For STANDARD refunds to cards, the issuer takes up to 7 working days to credit. `SUCCESS` means Cashfree has **processed** (not that the money has **appeared on the customer's statement**).
- Customer can quote the `refund_arn` to their issuer to trace.
- For UPI INSTANT refunds, the credit is immediate; if missing, ask the customer to check all linked bank accounts on the UPI app.

### "We refunded ₹100 but our settlement only dropped by ₹82"

- Refund fees (for INSTANT) are debited as separate recon rows, not rolled into the refund event. Look for an `OTHER_ADJUSTMENT` event on the same `cf_settlement_id` with negative `event_amount`.
- PG fees on the **original payment** are not refunded. Cashfree retains them; your net cost per refunded payment = original PG fee + refund fee.

### "Refund webhook fires multiple times with different statuses"

- Intended: `PENDING` → `SUCCESS` is normal. Always store the latest by `cf_refund_id` and gate side-effects on the terminal status.
- If the same status repeats: at-least-once retry. Dedupe on `(refund_id, refund_status, processed_at)` or use the webhook's `x-idempotency-key`.

### "GET refund returns stale status"

- Cashfree's read replica lags the write side by seconds. If you're polling, back off to ≥3s intervals; prefer the webhook.

### "Refund webhook arrives without a matching create response"

- Happens if the create call timed out on your side but succeeded on Cashfree's. The webhook is the source of truth. Fetch by `refund_id` to reconcile.

### "The Dashboard shows the refund succeeded but our DB still has it as PENDING"

- Your webhook endpoint returned non-200, or the IP is not whitelisted for production. Check Dashboard → Developers → Webhooks → Logs; use Batch Resend once handler is fixed. Whitelist IPs from `pg/webhooks/SKILL.md`.

---

## 10. See Also

- `pg/webhooks/SKILL.md` — signature verification & idempotency for `REFUND_STATUS_WEBHOOK`.
- `pg/webhooks/references/REFERENCE.md` §REFUND_STATUS_WEBHOOK — canonical payload.
- `pg/apis/references/REFERENCE.md` §5 — `x-idempotency-key` header on the create request.
- `pg/backend-sdks/references/REFERENCE.md` §5 — `PGAuthorizeOrder` VOID (refund-adjacent).
- `settlements-and-reconciliation/SKILL.md` — how refunds flow through settlement cycles.
- `common-mistakes/SKILL.md` — general webhook / signature gotchas.
